import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

type ImportUser = {
  name?: string;
  login?: string;
  password?: string;
  role?: string;
  division?: string;
  isActive?: boolean;
};

type ImportRequest = {
  users?: ImportUser[];
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-import-secret',
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function normalizeRole(value: unknown): string {
  const text = normalizeText(value);
  return text || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c';
}

function normalizeDivision(value: unknown): string {
  return normalizeText(value);
}

function normalizeLogin(value: unknown): string {
  return normalizeText(value);
}

function normalizeLookupKey(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function normalizeUsers(input: unknown): ImportUser[] {
  const list = Array.isArray(input) ? input : [];
  const byIdentity = new Map<string, ImportUser>();
  list.forEach((item) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const name = normalizeText(record.name);
    const login = normalizeLogin(record.login);
    const password = String(record.password ?? '');
    if (!name || !password) return;
    const identityKey = login ? `login:${normalizeLookupKey(login)}` : `name:${normalizeLookupKey(name)}`;
    byIdentity.set(identityKey, {
      name,
      login,
      password,
      role: normalizeRole(record.role),
      division: normalizeDivision(record.division),
      isActive: record.isActive === false ? false : true,
    });
  });
  return Array.from(byIdentity.values());
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  const importEnabled = normalizeText(Deno.env.get('AUTH_USERS_IMPORT_ENABLED'));
  if (importEnabled !== 'true') {
    return json({ ok: false, error: 'Import is disabled' }, { status: 403 });
  }

  const expectedSecret = normalizeText(Deno.env.get('AUTH_USERS_IMPORT_SECRET'));
  const receivedSecret = normalizeText(request.headers.get('x-import-secret'));
  if (!expectedSecret || expectedSecret !== receivedSecret) {
    return json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const supabaseUrl = normalizeText(Deno.env.get('SUPABASE_URL'));
  const serviceRoleKey = normalizeText(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Supabase environment is not configured' }, { status: 500 });
  }

  let payload: ImportRequest;
  try {
    payload = (await request.json()) as ImportRequest;
  } catch (_error) {
    return json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  const users = normalizeUsers(payload.users);
  if (!users.length) {
    return json({ ok: false, error: 'No valid users provided' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: existingRows, error: existingError } = await supabase
      .from('sf_users')
      .select('id, name, login');
    if (existingError) throw existingError;

    const existingByName = new Map<string, Array<{ id: number; name: string }>>();
    const existingByLogin = new Map<string, Array<{ id: number; name: string; login: string }>>();
    (Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
      const name = normalizeText((row as Record<string, unknown>).name);
      const login = normalizeLogin((row as Record<string, unknown>).login);
      const id = Number((row as Record<string, unknown>).id);
      if (!name || !Number.isFinite(id)) return;
      const nameKey = normalizeLookupKey(name);
      if (!existingByName.has(nameKey)) existingByName.set(nameKey, []);
      existingByName.get(nameKey)?.push({ id, name });
      if (login) {
        const loginKey = normalizeLookupKey(login);
        if (!existingByLogin.has(loginKey)) existingByLogin.set(loginKey, []);
        existingByLogin.get(loginKey)?.push({ id, name, login });
      }
    });

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    for (const user of users) {
      const name = normalizeText(user.name);
      const login = normalizeLogin(user.login);
      const password = String(user.password ?? '');
      const role = normalizeRole(user.role);
      const division = normalizeDivision(user.division);
      const isActive = user.isActive !== false;
      if (!name || !password) {
        skipped.push({ name: name || '(empty)', reason: 'missing_name_or_password' });
        continue;
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const matches = login
        ? (existingByLogin.get(normalizeLookupKey(login)) || [])
        : (existingByName.get(normalizeLookupKey(name)) || []);

      if (matches.length > 1) {
        skipped.push({ name, reason: login ? 'duplicate_existing_logins' : 'duplicate_existing_users' });
        continue;
      }

      if (matches.length === 1) {
        const { error } = await supabase
          .from('sf_users')
          .update({
            login,
            password_hash: passwordHash,
            role,
            division,
            is_active: isActive,
          })
          .eq('id', matches[0].id);
        if (error) throw error;
        updated.push(name);
        continue;
      }

      const { error } = await supabase
        .from('sf_users')
        .insert({
          name,
          login,
          password_hash: passwordHash,
          role,
          division,
          is_active: isActive,
        });
      if (error) throw error;
      created.push(name);
    }

    return json({
      ok: true,
      importedUsers: users.length,
      createdCount: created.length,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    return json({ ok: false, error: message }, { status: 500 });
  }
});

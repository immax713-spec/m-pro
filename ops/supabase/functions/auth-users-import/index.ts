import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

type ImportUser = {
  name?: string;
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

function normalizeUsers(input: unknown): ImportUser[] {
  const list = Array.isArray(input) ? input : [];
  const byName = new Map<string, ImportUser>();
  list.forEach((item) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const name = normalizeText(record.name);
    const password = String(record.password ?? '');
    if (!name || !password) return;
    byName.set(name, {
      name,
      password,
      role: normalizeRole(record.role),
      division: normalizeDivision(record.division),
      isActive: record.isActive === false ? false : true,
    });
  });
  return Array.from(byName.values());
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
      .select('id, name');
    if (existingError) throw existingError;

    const existingByName = new Map<string, Array<{ id: number; name: string }>>();
    (Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
      const name = normalizeText((row as Record<string, unknown>).name);
      const id = Number((row as Record<string, unknown>).id);
      if (!name || !Number.isFinite(id)) return;
      if (!existingByName.has(name)) existingByName.set(name, []);
      existingByName.get(name)?.push({ id, name });
    });

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];

    for (const user of users) {
      const name = normalizeText(user.name);
      const password = String(user.password ?? '');
      const role = normalizeRole(user.role);
      const division = normalizeDivision(user.division);
      const isActive = user.isActive !== false;
      if (!name || !password) {
        skipped.push({ name: name || '(empty)', reason: 'missing_name_or_password' });
        continue;
      }

      const passwordHash = bcrypt.hashSync(password, 10);
      const matches = existingByName.get(name) || [];

      if (matches.length > 1) {
        skipped.push({ name, reason: 'duplicate_existing_users' });
        continue;
      }

      if (matches.length === 1) {
        const { error } = await supabase
          .from('sf_users')
          .update({
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

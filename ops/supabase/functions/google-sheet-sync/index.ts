import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type SyncRequestPayload = {
  sessionToken?: string;
  spreadsheetId?: string;
  sheetName?: string;
  fieldIdRow?: number;
  blockRow?: number;
  labelRow?: number;
  rows?: unknown[][];
};

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeInteger(value: unknown, fallbackValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallbackValue;
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

function normalizeMatrix(rows: unknown): string[][] {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const width = sourceRows.reduce((maxWidth, row) => {
    return Math.max(maxWidth, Array.isArray(row) ? row.length : 0);
  }, 0);
  if (!sourceRows.length || !width) return [];
  return sourceRows.map((row) => {
    const cells = Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [];
    while (cells.length < width) cells.push('');
    return cells.slice(0, width);
  });
}

async function requireSession(
  supabase: ReturnType<typeof createClient>,
  sessionToken: string,
): Promise<{ name: string; role: string; division: string }> {
  const token = normalizeText(sessionToken);
  if (!token) throw new Error('Требуется авторизация');
  const { data, error } = await supabase.rpc('sf_get_session_user', {
    p_session_token: token,
  });
  if (error) throw error;
  const user = data && typeof data === 'object' && 'user' in data
    ? (data as Record<string, unknown>).user
    : data;
  if (!user || typeof user !== 'object') throw new Error('Сессия недействительна');
  return {
    name: normalizeText((user as Record<string, unknown>).name),
    role: normalizeText((user as Record<string, unknown>).role),
    division: normalizeText((user as Record<string, unknown>).division),
  };
}

function serializeUpstreamError(payload: unknown, fallbackMessage: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const direct = normalizeText(record.error || record.message);
    if (direct) return direct;
  }
  return normalizeText(fallbackMessage) || 'Не удалось обновить Google Sheet';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  const supabaseUrl = normalizeText(Deno.env.get('SUPABASE_URL'));
  const serviceRoleKey = normalizeText(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const googleSyncUrl = normalizeText(Deno.env.get('GOOGLE_SHEET_SYNC_WEB_APP_URL'));
  const googleSyncSecret = normalizeText(Deno.env.get('GOOGLE_SHEET_SYNC_SECRET'));

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Supabase environment is not configured' }, { status: 500 });
  }

  if (!googleSyncUrl || !googleSyncSecret) {
    return json({
      ok: false,
      error: 'Google sync is not configured. Set GOOGLE_SHEET_SYNC_WEB_APP_URL and GOOGLE_SHEET_SYNC_SECRET.',
    }, { status: 500 });
  }

  let payload: SyncRequestPayload;
  try {
    payload = (await request.json()) as SyncRequestPayload;
  } catch (_error) {
    return json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  const matrix = normalizeMatrix(payload.rows);
  if (!matrix.length || !matrix[0]?.length) {
    return json({ ok: false, error: 'Payload does not contain summary rows' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const user = await requireSession(supabase, normalizeText(payload.sessionToken));
    const sheetName = normalizeText(payload.sheetName) || 'Сводная';
    const upstreamBody = {
      secret: googleSyncSecret,
      spreadsheetId: normalizeText(payload.spreadsheetId),
      sheetName,
      fieldIdRow: normalizeInteger(payload.fieldIdRow, 1),
      blockRow: normalizeInteger(payload.blockRow, 2),
      labelRow: normalizeInteger(payload.labelRow, 3),
      rows: matrix,
      requestedAt: new Date().toISOString(),
      requestedBy: user,
    };

    const upstreamResponse = await fetch(googleSyncUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(upstreamBody),
    });

    const responseText = await upstreamResponse.text();
    let upstreamPayload: Record<string, unknown> | null = null;
    try {
      upstreamPayload = responseText ? JSON.parse(responseText) : null;
    } catch (_error) {
      upstreamPayload = null;
    }

    if (!upstreamResponse.ok) {
      return json({
        ok: false,
        error: serializeUpstreamError(
          upstreamPayload,
          `Google sync endpoint returned ${upstreamResponse.status}`,
        ),
        details: upstreamPayload || responseText,
      }, { status: 502 });
    }

    if (upstreamPayload && upstreamPayload.ok === false) {
      return json({
        ok: false,
        error: serializeUpstreamError(upstreamPayload, 'Google Sheet rejected the update'),
        details: upstreamPayload,
      }, { status: 502 });
    }

    return json({
      ok: true,
      sheetName,
      rowsSent: Math.max(0, matrix.length - 3),
      columnsSent: matrix[0]?.length || 0,
      requestedBy: user,
      upstream: upstreamPayload || { raw: responseText },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    const status = /авторизац|сессия/i.test(message) ? 401 : 500;
    return json({ ok: false, error: message }, { status });
  }
});

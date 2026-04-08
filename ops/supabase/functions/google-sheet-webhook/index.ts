import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

type RowMap = Record<string, string>;
type SnapshotPayload = {
  sourceKey?: string;
  fieldIdRow?: number;
  blockRow?: number;
  labelRow?: number;
  dataStartRow?: number;
  rows?: string[][];
};

type AuditEntry = {
  source_type: string;
  source_key: string;
  user_name: string;
  role: string;
  division: string;
  uin: string;
  field_id: string;
  field_label: string;
  old_value: string;
  new_value: string;
};

const TABLE_PREFIXES: Record<string, string> = {
  ro_: 'objects',
  sm_: 'sm',
  ppr_: 'ppr',
  suid_: 'suid',
  lb_: 'lb',
  mgz_: 'mgz',
  ksg_: 'ksg',
};

const SHEET_SYNC_SM_FIELDS = new Set(['sm_1_5', 'sm_1_10', 'sm_1_6', 'sm_1_7']);

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name || 'Error',
    };
  }
  if (error && typeof error === 'object') {
    return error;
  }
  return { message: String(error ?? 'Unknown error') };
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function isMissingUin(value: unknown): boolean {
  const text = normalizeText(value).toLowerCase();
  return !text || text === 'н/д' || text === 'n/a' || text === 'na' || text === 'рќ/р”';
}

function tableForField(fieldId: string): string {
  for (const [prefix, tableName] of Object.entries(TABLE_PREFIXES)) {
    if (fieldId.startsWith(prefix)) return tableName;
  }
  return '';
}

function isFieldAllowedFromSheet(fieldId: string): boolean {
  if (!fieldId) return false;
  if (fieldId === 'ro_1_3') return true;
  if (fieldId.startsWith('suid_')) return true;
  if (fieldId.startsWith('ksg_')) return true;
  if (SHEET_SYNC_SM_FIELDS.has(fieldId)) return true;
  return false;
}

function parsePayload(payload: SnapshotPayload) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const fieldIdRow = Math.max(1, Number(payload.fieldIdRow) || 1);
  const labelRow = Math.max(fieldIdRow, Number(payload.labelRow) || Math.min(fieldIdRow + 2, rows.length || 3));
  const dataStartRow = Math.max(fieldIdRow + 1, Number(payload.dataStartRow) || 4);

  if (rows.length < dataStartRow) {
    throw new Error('Payload does not contain enough rows.');
  }

  const fieldIds = rows[fieldIdRow - 1] || [];
  const labels = rows[Math.max(0, labelRow - 1)] || [];
  const parsedRows: RowMap[] = [];
  const ignoredColumns: Array<{ columnIndex: number; label: string; reason: string }> = [];
  const fieldLabels: Record<string, string> = {};

  fieldIds.forEach((rawFieldId, index) => {
    const fieldId = normalizeText(rawFieldId);
    const label = normalizeText(labels[index]);
    if (fieldId) {
      fieldLabels[fieldId] = label || fieldId;
      return;
    }
    if (!label) return;
    ignoredColumns.push({
      columnIndex: index + 1,
      label,
      reason: 'missing_field_id',
    });
  });

  for (let rowIndex = dataStartRow - 1; rowIndex < rows.length; rowIndex += 1) {
    const values = rows[rowIndex] || [];
    const rowMap: RowMap = {};
    fieldIds.forEach((rawFieldId, columnIndex) => {
      const fieldId = normalizeText(rawFieldId);
      if (!fieldId || fieldId === 'id_DB' || !isFieldAllowedFromSheet(fieldId)) return;
      rowMap[fieldId] = normalizeText(values[columnIndex]);
    });
    parsedRows.push(rowMap);
  }

  return { parsedRows, ignoredColumns, fieldLabels };
}

async function fetchObjectMap(
  supabase: ReturnType<typeof createClient>,
  uins: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let index = 0; index < uins.length; index += 500) {
    const batch = uins.slice(index, index + 500);
    if (!batch.length) continue;
    const { data, error } = await supabase
      .from('objects')
      .select('object_id, ro_1_3')
      .in('ro_1_3', batch);
    if (error) throw error;
    (data || []).forEach((row) => {
      const uin = normalizeText((row as Record<string, unknown>).ro_1_3);
      const objectId = Number((row as Record<string, unknown>).object_id || 0);
      if (uin && objectId > 1) out.set(uin, objectId);
    });
  }
  return out;
}

async function nextObjectId(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from('objects')
    .select('object_id')
    .order('object_id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Math.max(2, Number(data?.object_id || 1) + 1);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchScalarFieldValues(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  objectIds: number[],
  fieldIds: string[],
): Promise<Map<string, string>> {
  const values = new Map<string, string>();
  if (!objectIds.length || !fieldIds.length) return values;

  const selectColumns = ['object_id', ...fieldIds].join(',');
  for (const idBatch of chunkArray(objectIds, 400)) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectColumns)
      .in('object_id', idBatch);
    if (error) throw error;
    (data || []).forEach((row) => {
      const objectId = Number((row as Record<string, unknown>).object_id || 0);
      if (objectId <= 1) return;
      fieldIds.forEach((fieldId) => {
        values.set(`${objectId}:${fieldId}`, normalizeText((row as Record<string, unknown>)[fieldId]));
      });
    });
  }

  return values;
}

async function fetchKsgValues(
  supabase: ReturnType<typeof createClient>,
  objectIds: number[],
): Promise<Map<string, string>> {
  const values = new Map<string, string>();
  if (!objectIds.length) return values;

  for (const idBatch of chunkArray(objectIds, 400)) {
    const { data, error } = await supabase
      .from('ksg')
      .select('object_id, ksg_group, ksg_index, value')
      .in('object_id', idBatch);
    if (error) throw error;
    (data || []).forEach((row) => {
      const record = row as Record<string, unknown>;
      const objectId = Number(record.object_id || 0);
      const group = Number(record.ksg_group || 0);
      const index = Number(record.ksg_index || 0);
      if (objectId <= 1 || !Number.isFinite(group) || !Number.isFinite(index)) return;
      values.set(`${
        objectId
      }:ksg_${group}_${index}`, normalizeText(record.value));
    });
  }

  return values;
}

async function fetchCurrentValues(
  supabase: ReturnType<typeof createClient>,
  rows: Array<{ objectId: number; rowMap: RowMap }>,
): Promise<Map<string, string>> {
  const objectIds = Array.from(new Set(rows.map((row) => row.objectId).filter((objectId) => objectId > 1)));
  const fieldIdsByTable: Record<string, Set<string>> = {
    objects: new Set<string>(),
    sm: new Set<string>(),
    suid: new Set<string>(),
  };
  let needsKsg = false;

  rows.forEach(({ rowMap }) => {
    Object.keys(rowMap).forEach((fieldId) => {
      const tableName = tableForField(fieldId);
      if (!tableName || fieldId === 'ro_1_3') {
        fieldIdsByTable.objects.add('ro_1_3');
        return;
      }
      if (tableName === 'ksg') {
        needsKsg = true;
        return;
      }
      if (fieldIdsByTable[tableName]) {
        fieldIdsByTable[tableName].add(fieldId);
      }
    });
  });

  const currentValues = new Map<string, string>();
  for (const [tableName, fieldIds] of Object.entries(fieldIdsByTable)) {
    const tableValues = await fetchScalarFieldValues(supabase, tableName, objectIds, Array.from(fieldIds));
    tableValues.forEach((value, key) => currentValues.set(key, value));
  }
  if (needsKsg) {
    const ksgValues = await fetchKsgValues(supabase, objectIds);
    ksgValues.forEach((value, key) => currentValues.set(key, value));
  }

  return currentValues;
}

function buildAuditEntries(
  rows: Array<{ objectId: number; rowMap: RowMap }>,
  currentValues: Map<string, string>,
  fieldLabels: Record<string, string>,
  sourceKey: string,
): AuditEntry[] {
  const entries: AuditEntry[] = [];

  rows.forEach(({ objectId, rowMap }) => {
    const uin = normalizeText(rowMap.ro_1_3);
    Object.entries(rowMap).forEach(([fieldId, rawValue]) => {
      const tableName = tableForField(fieldId);
      const newValue = normalizeText(rawValue);
      if (tableName === 'ksg' && !newValue) return;
      const oldValue = normalizeText(currentValues.get(`${objectId}:${fieldId}`));
      if (oldValue === newValue) return;
      entries.push({
        source_type: 'google_sheet',
        source_key: sourceKey,
        user_name: 'Google Sheets',
        role: 'Webhook',
        division: '',
        uin,
        field_id: fieldId,
        field_label: normalizeText(fieldLabels[fieldId]) || fieldId,
        old_value: oldValue,
        new_value: newValue,
      });
    });
  });

  return entries;
}

function buildTablePayloads(rows: Array<{ objectId: number; rowMap: RowMap }>) {
  const objects = new Map<number, Record<string, string | number>>();
  const sm = new Map<number, Record<string, string | number>>();
  const ppr = new Map<number, Record<string, string | number>>();
  const suid = new Map<number, Record<string, string | number>>();
  const lb = new Map<number, Record<string, string | number>>();
  const mgz = new Map<number, Record<string, string | number>>();
  const ksg = new Map<string, { object_id: number; ksg_group: number; ksg_index: number; value: string }>();

  const tableMaps: Record<string, Map<number, Record<string, string | number>>> = {
    objects,
    sm,
    ppr,
    suid,
    lb,
    mgz,
  };

  rows.forEach(({ objectId, rowMap }) => {
    const objectRow = objects.get(objectId) || { object_id: objectId };
    objectRow.ro_1_3 = normalizeText(rowMap.ro_1_3);
    objects.set(objectId, objectRow);

    Object.entries(rowMap).forEach(([fieldId, value]) => {
      const tableName = tableForField(fieldId);
      if (!tableName) return;
      if (tableName === 'ksg') {
        const [, groupText, indexText] = fieldId.split('_');
        const group = Number(groupText);
        const index = Number(indexText);
        if (!Number.isFinite(group) || !Number.isFinite(index) || !value) return;
        ksg.set(`${objectId}:${group}:${index}`, {
          object_id: objectId,
          ksg_group: group,
          ksg_index: index,
          value: normalizeText(value),
        });
        return;
      }

      const target = tableMaps[tableName];
      if (!target) return;
      const payload = target.get(objectId) || { object_id: objectId };
      payload[fieldId] = normalizeText(value);
      target.set(objectId, payload);
    });
  });

  return {
    objects: Array.from(objects.values()),
    sm: Array.from(sm.values()),
    ppr: Array.from(ppr.values()),
    suid: Array.from(suid.values()),
    lb: Array.from(lb.values()),
    mgz: Array.from(mgz.values()),
    ksg: Array.from(ksg.values()),
  };
}

async function upsertTable(
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return;
  const chunkSize = tableName === 'objects' ? 200 : 300;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'object_id' });
    if (error) {
      throw {
        stage: 'upsert_table',
        tableName,
        chunkStart: index,
        chunkSize: chunk.length,
        error,
      };
    }
  }
}

async function upsertKsg(
  supabase: ReturnType<typeof createClient>,
  rows: Array<{ object_id: number; ksg_group: number; ksg_index: number; value: string }>,
) {
  if (!rows.length) return;
  const chunkSize = 500;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase
      .from('ksg')
      .upsert(chunk, { onConflict: 'object_id,ksg_group,ksg_index' });
    if (error) {
      throw {
        stage: 'upsert_ksg',
        tableName: 'ksg',
        chunkStart: index,
        chunkSize: chunk.length,
        error,
      };
    }
  }
}

async function insertAuditLogs(
  supabase: ReturnType<typeof createClient>,
  entries: AuditEntry[],
) {
  if (!entries.length) return;
  const chunkSize = 500;
  for (let index = 0; index < entries.length; index += chunkSize) {
    const chunk = entries.slice(index, index + chunkSize);
    const { error } = await supabase.from('sf_edit_logs').insert(chunk);
    if (!error) continue;

    const errorMessage = normalizeText((error as Record<string, unknown>)?.message);
    const canRetryWithoutSourceColumns =
      errorMessage.includes('source_type')
      || errorMessage.includes('source_key')
      || errorMessage.includes("schema cache");

    if (canRetryWithoutSourceColumns) {
      const fallbackChunk = chunk.map(({ source_type, source_key, ...rest }) => rest);
      const fallbackResult = await supabase.from('sf_edit_logs').insert(fallbackChunk);
      if (!fallbackResult.error) continue;
      throw {
        stage: 'insert_audit_logs',
        tableName: 'sf_edit_logs',
        chunkStart: index,
        chunkSize: chunk.length,
        error: fallbackResult.error,
      };
    }

    throw {
      stage: 'insert_audit_logs',
      tableName: 'sf_edit_logs',
      chunkStart: index,
      chunkSize: chunk.length,
      error,
    };
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const expectedSecret = normalizeText(Deno.env.get('GOOGLE_SHEET_WEBHOOK_SECRET'));
  const receivedSecret = normalizeText(request.headers.get('x-webhook-secret'));
  if (!expectedSecret || expectedSecret !== receivedSecret) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabaseUrl = normalizeText(Deno.env.get('SUPABASE_URL'));
  const serviceRoleKey = normalizeText(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase environment is not configured' }, { status: 500 });
  }

  try {
    const payload = (await request.json()) as SnapshotPayload;
    const { parsedRows, ignoredColumns, fieldLabels } = parsePayload(payload);

    const uins = Array.from(
      new Set(
        parsedRows
          .map((row) => normalizeText(row.ro_1_3))
          .filter((uin) => !!uin && uin !== 'Н/Д'),
      ),
    );

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const existingObjectMap = await fetchObjectMap(supabase, uins);
    let currentObjectId = await nextObjectId(supabase);
    const rowsToApply: Array<{ objectId: number; rowMap: RowMap }> = [];
    let skippedRows = 0;

    parsedRows.forEach((rowMap) => {
      const uin = normalizeText(rowMap.ro_1_3);
      if (!uin || uin === 'Н/Д') {
        skippedRows += 1;
        return;
      }
      if (!existingObjectMap.has(uin)) {
        existingObjectMap.set(uin, currentObjectId);
        currentObjectId += 1;
      }
      rowsToApply.push({
        objectId: existingObjectMap.get(uin) as number,
        rowMap,
      });
    });

    const auditEntries = await fetchCurrentValues(supabase, rowsToApply).then((currentValues) =>
      buildAuditEntries(rowsToApply, currentValues, fieldLabels, normalizeText(payload.sourceKey)),
    );

    const tablePayloads = buildTablePayloads(rowsToApply);

    await upsertTable(supabase, 'objects', tablePayloads.objects);
    await upsertTable(supabase, 'sm', tablePayloads.sm);
    await upsertTable(supabase, 'ppr', tablePayloads.ppr);
    await upsertTable(supabase, 'suid', tablePayloads.suid);
    await upsertTable(supabase, 'lb', tablePayloads.lb);
    await upsertTable(supabase, 'mgz', tablePayloads.mgz);
    await upsertKsg(supabase, tablePayloads.ksg);
    await insertAuditLogs(supabase, auditEntries);

    return json({
      ok: true,
      sourceKey: normalizeText(payload.sourceKey),
      parsedRows: parsedRows.length,
      appliedRows: rowsToApply.length,
      skippedRows,
      syncScope: {
        objects: ['ro_1_3'],
        sm: Array.from(SHEET_SYNC_SM_FIELDS),
        suid: ['suid_*'],
        ksg: ['ksg_*'],
      },
      ignoredColumns,
      auditLogEntries: auditEntries.length,
      tableCounts: Object.fromEntries(
        Object.entries(tablePayloads).map(([tableName, values]) => [tableName, values.length]),
      ),
    });
  } catch (error) {
    return json(
      {
        error: serializeError(error),
      },
      { status: 400 },
    );
  }
});

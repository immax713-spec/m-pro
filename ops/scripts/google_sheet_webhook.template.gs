const SUPABASE_WEBHOOK_CONFIG = {
  webhookUrl: 'https://lkflvchascdapzcbennf.supabase.co/functions/v1/google-sheet-webhook',
  sourceKey: 'svodnaya-main',
  sheetName: 'Сводная',
  fieldIdRow: 1,
  blockRow: 2,
  labelRow: 3,
  dataStartRow: 4,
};

const SCRIPT_PROPERTY_KEYS = {
  webhookSecret: 'GOOGLE_TO_DB_WEBHOOK_SECRET',
  sheetSyncSecret: 'DB_TO_GOOGLE_SYNC_SECRET',
};

function pushSheetSnapshotToSupabase() {
  const webhookSecret = requireScriptSecret_(SCRIPT_PROPERTY_KEYS.webhookSecret);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SUPABASE_WEBHOOK_CONFIG.sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + SUPABASE_WEBHOOK_CONFIG.sheetName);
  }

  const payload = {
    sourceKey: SUPABASE_WEBHOOK_CONFIG.sourceKey,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheetId: sheet.getSheetId(),
    sheetName: sheet.getName(),
    fieldIdRow: SUPABASE_WEBHOOK_CONFIG.fieldIdRow,
    blockRow: SUPABASE_WEBHOOK_CONFIG.blockRow,
    labelRow: SUPABASE_WEBHOOK_CONFIG.labelRow,
    dataStartRow: SUPABASE_WEBHOOK_CONFIG.dataStartRow,
    rows: sheet.getDataRange().getDisplayValues(),
    sentAt: new Date().toISOString(),
  };

  const response = UrlFetchApp.fetch(SUPABASE_WEBHOOK_CONFIG.webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-webhook-secret': webhookSecret,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  Logger.log(response.getContentText());
}

function installHourlySnapshotTrigger() {
  ScriptApp.newTrigger('pushSheetSnapshotToSupabase')
    .timeBased()
    .everyHours(1)
    .create();
}

function installOnEditSnapshotTrigger() {
  ScriptApp.newTrigger('pushSheetSnapshotToSupabase')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}

function doPost(e) {
  try {
    const payload = parseDbSyncPayload_(e);
    const sheetSyncSecret = requireScriptSecret_(SCRIPT_PROPERTY_KEYS.sheetSyncSecret);
    if (payload.secret !== sheetSyncSecret) {
      return jsonOutput_({ ok: false, error: 'Forbidden' });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = String(payload.sheetName || SUPABASE_WEBHOOK_CONFIG.sheetName || '').trim();
    if (!sheetName) throw new Error('Sheet name is required');

    const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
    const rows = normalizeMatrix_(payload.rows);
    if (!rows.length || !rows[0].length) {
      throw new Error('Payload does not contain rows');
    }

    ensureSheetGridSize_(sheet, rows.length, rows[0].length);

    const clearRows = Math.max(sheet.getLastRow(), rows.length);
    const clearColumns = Math.max(sheet.getLastColumn(), rows[0].length);
    if (clearRows > 0 && clearColumns > 0) {
      sheet.getRange(1, 1, clearRows, clearColumns).clearContent();
    }

    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(Math.max(0, Number(payload.labelRow || SUPABASE_WEBHOOK_CONFIG.labelRow || 3)));

    return jsonOutput_({
      ok: true,
      sheetName: sheet.getName(),
      writtenRows: Math.max(0, rows.length - 3),
      writtenColumns: rows[0].length,
      updatedAt: new Date().toISOString(),
      requestedBy: payload.requestedBy || null,
    });
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function parseDbSyncPayload_(e) {
  const raw = e && e.postData && typeof e.postData.contents === 'string'
    ? e.postData.contents
    : '{}';
  return JSON.parse(raw);
}

function normalizeMatrix_(rows) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const width = sourceRows.reduce((maxWidth, row) => {
    return Math.max(maxWidth, Array.isArray(row) ? row.length : 0);
  }, 0);
  if (!sourceRows.length || !width) return [];
  return sourceRows.map(row => {
    const cells = Array.isArray(row) ? row.map(cell => String(cell == null ? '' : cell)) : [];
    while (cells.length < width) cells.push('');
    return cells.slice(0, width);
  });
}

function ensureSheetGridSize_(sheet, rowCount, columnCount) {
  const maxRows = sheet.getMaxRows();
  if (maxRows < rowCount) {
    sheet.insertRowsAfter(maxRows, rowCount - maxRows);
  }
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < columnCount) {
    sheet.insertColumnsAfter(maxColumns, columnCount - maxColumns);
  }
}

function requireScriptSecret_(propertyKey) {
  const value = String(PropertiesService.getScriptProperties().getProperty(propertyKey) || '').trim();
  if (!value) {
    throw new Error('Script property is not configured: ' + propertyKey);
  }
  return value;
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

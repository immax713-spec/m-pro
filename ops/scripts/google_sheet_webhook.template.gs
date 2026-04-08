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

const GOOGLE_OWNED_SM_FIELD_IDS = new Set(['sm_1_5', 'sm_1_6', 'sm_1_7', 'sm_1_10']);

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
    rows: buildGoogleToDbSnapshotRows_(sheet.getDataRange().getDisplayValues()),
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

    const mergedRows = buildDbToGoogleMergedRows_({
      incomingRows: rows,
      existingRows: sheet.getDataRange().getDisplayValues(),
      fieldIdRow: Number(payload.fieldIdRow || SUPABASE_WEBHOOK_CONFIG.fieldIdRow || 1),
      blockRow: Number(payload.blockRow || SUPABASE_WEBHOOK_CONFIG.blockRow || 2),
      labelRow: Number(payload.labelRow || SUPABASE_WEBHOOK_CONFIG.labelRow || 3),
      dataStartRow: Number(payload.dataStartRow || SUPABASE_WEBHOOK_CONFIG.dataStartRow || 4),
    });

    ensureSheetGridSize_(sheet, mergedRows.length, mergedRows[0].length);

    const clearRows = Math.max(sheet.getLastRow(), mergedRows.length);
    const clearColumns = Math.max(sheet.getLastColumn(), mergedRows[0].length);
    if (clearRows > 0 && clearColumns > 0) {
      sheet.getRange(1, 1, clearRows, clearColumns).clearContent();
    }

    sheet.getRange(1, 1, mergedRows.length, mergedRows[0].length).setValues(mergedRows);
    sheet.setFrozenRows(Math.max(0, Number(payload.labelRow || SUPABASE_WEBHOOK_CONFIG.labelRow || 3)));

    return jsonOutput_({
      ok: true,
      sheetName: sheet.getName(),
      writtenRows: Math.max(0, mergedRows.length - 3),
      writtenColumns: mergedRows[0].length,
      preservedSyncColumns: [
        'id_DB',
        'sm_1_5',
        'sm_1_6',
        'sm_1_7',
        'sm_1_10',
        'suid_*',
        'ksg_*',
        '<blank field_id columns>',
      ],
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

function buildGoogleToDbSnapshotRows_(rows) {
  const matrix = normalizeMatrix_(rows);
  if (!matrix.length || !matrix[0].length) return matrix;
  const fieldIdRowIndex = Math.max(0, Number(SUPABASE_WEBHOOK_CONFIG.fieldIdRow || 1) - 1);
  const fieldIds = matrix[fieldIdRowIndex] || [];
  const allowedIndexes = fieldIds.reduce((out, rawFieldId, index) => {
    if (shouldSendFieldToDb_(rawFieldId)) out.push(index);
    return out;
  }, []);
  if (!allowedIndexes.length) return matrix;
  return matrix.map(row => allowedIndexes.map(index => String(row[index] == null ? '' : row[index])));
}

function shouldSendFieldToDb_(rawFieldId) {
  const fieldId = String(rawFieldId || '').trim();
  if (!fieldId) return false;
  if (fieldId === 'ro_1_3') return true;
  if (fieldId.startsWith('suid_')) return true;
  if (fieldId.startsWith('ksg_')) return true;
  return GOOGLE_OWNED_SM_FIELD_IDS.has(fieldId);
}

function buildDbToGoogleMergedRows_(options) {
  const incomingRows = normalizeMatrix_(options && options.incomingRows);
  const existingRows = normalizeMatrix_(options && options.existingRows);
  if (!incomingRows.length || !incomingRows[0].length) return incomingRows;
  if (!existingRows.length || !existingRows[0].length) return incomingRows;

  const fieldIdRow = Math.max(1, Number(options && options.fieldIdRow) || 1);
  const blockRow = Math.max(1, Number(options && options.blockRow) || 2);
  const labelRow = Math.max(1, Number(options && options.labelRow) || 3);
  const dataStartRow = Math.max(1, Number(options && options.dataStartRow) || 4);
  const headerRowCount = Math.max(fieldIdRow, blockRow, labelRow);

  const mergedRows = normalizeMatrix_(incomingRows);
  const incomingColumns = buildSheetColumnDescriptors_(mergedRows, fieldIdRow, labelRow);
  const existingColumns = buildSheetColumnDescriptors_(existingRows, fieldIdRow, labelRow);
  const protectedColumns = incomingColumns
    .map((column) => ({
      incomingIndex: column.index,
      existingIndex: findMatchingSheetColumnIndex_(column, existingColumns),
      preserve: shouldPreserveSheetColumnFromGoogle_(column),
    }))
    .filter((item) => item.preserve && item.existingIndex >= 0);

  if (!protectedColumns.length) return mergedRows;

  const incomingUinIndex = findSheetColumnIndexByFieldId_(incomingColumns, 'ro_1_3');
  const existingUinIndex = findSheetColumnIndexByFieldId_(existingColumns, 'ro_1_3');
  const existingRowsByUin = buildSheetRowsByUin_(existingRows, dataStartRow, existingUinIndex);

  for (let rowIndex = 0; rowIndex < Math.min(headerRowCount, mergedRows.length); rowIndex += 1) {
    protectedColumns.forEach(({ incomingIndex, existingIndex }) => {
      mergedRows[rowIndex][incomingIndex] = readMatrixCell_(existingRows, rowIndex, existingIndex);
    });
  }

  for (let rowIndex = dataStartRow - 1; rowIndex < mergedRows.length; rowIndex += 1) {
    const uin = incomingUinIndex >= 0 ? normalizeSheetCell_(mergedRows[rowIndex][incomingUinIndex]) : '';
    const sourceRow = uin && existingRowsByUin.has(uin) ? existingRowsByUin.get(uin) : null;
    protectedColumns.forEach(({ incomingIndex, existingIndex }) => {
      mergedRows[rowIndex][incomingIndex] = sourceRow
        ? String(sourceRow[existingIndex] == null ? '' : sourceRow[existingIndex])
        : '';
    });
  }

  return mergedRows;
}

function buildSheetColumnDescriptors_(rows, fieldIdRow, labelRow) {
  const matrix = normalizeMatrix_(rows);
  const fieldIds = matrix[Math.max(0, fieldIdRow - 1)] || [];
  const labels = matrix[Math.max(0, labelRow - 1)] || [];
  const width = Math.max(fieldIds.length, labels.length);
  const out = [];
  for (let index = 0; index < width; index += 1) {
    out.push({
      index,
      fieldId: normalizeSheetCell_(fieldIds[index]),
      label: normalizeSheetCell_(labels[index]),
    });
  }
  return out;
}

function shouldPreserveSheetColumnFromGoogle_(column) {
  const fieldId = normalizeSheetCell_(column && column.fieldId);
  if (!fieldId) return true;
  if (fieldId === 'id_DB') return true;
  if (fieldId.startsWith('suid_')) return true;
  if (fieldId.startsWith('ksg_')) return true;
  return GOOGLE_OWNED_SM_FIELD_IDS.has(fieldId);
}

function findMatchingSheetColumnIndex_(column, existingColumns) {
  const fieldId = normalizeSheetCell_(column && column.fieldId);
  const label = normalizeSheetCell_(column && column.label);
  const columns = Array.isArray(existingColumns) ? existingColumns : [];
  if (fieldId) {
    const byFieldId = columns.find((item) => normalizeSheetCell_(item && item.fieldId) === fieldId);
    if (byFieldId) return byFieldId.index;
  }
  if (label) {
    const byLabel = columns.find((item) => normalizeSheetCell_(item && item.label) === label);
    if (byLabel) return byLabel.index;
  }
  return -1;
}

function findSheetColumnIndexByFieldId_(columns, fieldId) {
  const wanted = normalizeSheetCell_(fieldId);
  const match = (Array.isArray(columns) ? columns : []).find((column) => normalizeSheetCell_(column && column.fieldId) === wanted);
  return match ? match.index : -1;
}

function buildSheetRowsByUin_(rows, dataStartRow, uinIndex) {
  const out = new Map();
  if (!Array.isArray(rows) || uinIndex < 0) return out;
  for (let rowIndex = Math.max(0, dataStartRow - 1); rowIndex < rows.length; rowIndex += 1) {
    const row = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
    const uin = normalizeSheetCell_(row[uinIndex]);
    if (!uin) continue;
    out.set(uin, row.slice());
  }
  return out;
}

function normalizeSheetCell_(value) {
  return String(value == null ? '' : value).trim();
}

function readMatrixCell_(rows, rowIndex, columnIndex) {
  const row = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
  return String(row[columnIndex] == null ? '' : row[columnIndex]);
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

const SVOD_MIN_CFG = {
  TARGET_SPREADSHEET_ID: '1VHWk91Us6Z_z0TqdaSgaoXr7B1W88iSFahJhVdLKBVw',
  TARGET_SHEET: 'Свод',
  REGISTRY_SHEET: 'Лист11',
  REGISTRY_NAME_COL: 1,   // A
  REGISTRY_STATUS_COL: 4, // D

  DATA_START_ROW_IN_SOURCE: 22,
  DATE_CANDIDATE_ROWS: [22, 21, 20, 23],
  PEOPLE_COUNT_ROW_IN_SOURCE: 20,
  ISSUE_LOOKUP_COL_IN_SOURCE: 3, // C

  FILL_MISSING: '-',
  HEADER_PREFIX: ['№ п/п', 'Чек-лист', 'Дата'],
  TARGET_HEADERS: [
    'Количество людей',
    'СТРОИТЕЛЬНАЯ ГОТОВНОСТЬ (% выполнения, факт)',
    'КОНСТРУКТИВ (% выполнения, факт)',
    'СТЕНЫ И ПЕРЕГОРОДКИ (% выполнения, факт)',
    'ФАСАД (% выполнения, факт)',
    'УТЕПЛИТЕЛЬ (% выполнения, факт)',
    'ФАСАДНАЯ СИСТЕМА (% выполнения, факт)',
    'ВНУТРЕННЯЯ ОТДЕЛКА (% выполнения, факт)',
    'ЧЕРНОВАЯ ОТДЕЛКА (% выполнения, факт)',
    'ЧИСТОВАЯ ОТДЕЛКА (% выполнения, факт)',
    'ВНУТРЕННИЕ СЕТИ (% выполнения, факт)',
    'ВЕНТИЛЯЦИЯ (% выполнения, факт)',
    'ЭЛЕКТРОСНАБЖЕНИЕ И СКС (% выполнения, факт)',
    'ЭЛЕКТРОСНАБЖЕНИЕ И СКС (% выполнения, факт)',
    'ВОДОСНАБЖЕНИЕ И ОТОПЛЕНИЕ ПОЭТАЖНО (ГОРИЗОНТ) (% выполнения, факт)',
    'ОБОРУДОВАНИЕ ПО ТХЗ (% выполнения, факт)',
    'СМОНТИРОВАНО (% выполнения, факт)',
    'НАРУЖНЫЕ СЕТИ (% выполнения, факт)',
    'Благоустройство прилегающей территории (% выполнения, факт)',
    'ТВЕРДОЕ ПОКРЫТИЕ (% выполнения, факт)',
    'ОЗЕЛЕНЕНИЕ (% выполнения, факт)',
    'МАФ (% выполнения, факт)',
  ],
  ISSUE_ANCHOR_HEADER: 'Текущее состояние объекта/Проблемные вопросы',
  ISSUE_EXTRA_HEADERS: [
    'Требуется выезд лаборатории',
    'Дата выявления',
    'Наименование замечаний',
    'Секция',
    'Этаж',
    'Ответственный',
    'Ссылка на замечания контроля качества',
    'Контактные данные',
  ],

  SOURCE_INDICES: [0, 1, 6, 9, 10, 11, 14, 15, 20, 25, 26, 34, 42, 50, 57, 58, 60, 83, 84, 85, 86],

  TRIGGER_TEXT_NORM: 'мониторинг завершен',
  ONEDIT_DEDUP_MS: 15000,
  ONEDIT_LOCK_WAIT_MS: 30000,
  PROCESS_DEDUP_MS: 45000,
};

const SVOD_MIN_VERSION = 'svod-clean-overwrite-2026-02-16-v6-add-hard-surface';

const SVOD_MIN_CACHE = {
  targetSpreadsheet: null,
  svodSheet: null,
  rowIndex: null,
  rowIndexLastRow: -1,
};

function svodMinResetCache_() {
  SVOD_MIN_CACHE.targetSpreadsheet = null;
  SVOD_MIN_CACHE.svodSheet = null;
  SVOD_MIN_CACHE.rowIndex = null;
  SVOD_MIN_CACHE.rowIndexLastRow = -1;
}

function svodMinGetTargetSpreadsheet_() {
  if (!SVOD_MIN_CACHE.targetSpreadsheet) {
    SVOD_MIN_CACHE.targetSpreadsheet = SpreadsheetApp.openById(SVOD_MIN_CFG.TARGET_SPREADSHEET_ID);
  }
  return SVOD_MIN_CACHE.targetSpreadsheet;
}

function svodMinGetSvodSheet_() {
  if (!SVOD_MIN_CACHE.svodSheet) {
    SVOD_MIN_CACHE.svodSheet = svodMinEnsureSvodSheetAndHeaders_(svodMinGetTargetSpreadsheet_());
  }
  return SVOD_MIN_CACHE.svodSheet;
}

function processRegistrySvodMin() {
  svodMinResetCache_();
  console.log(`SCRIPT VERSION: ${SVOD_MIN_VERSION}`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const registry = ss.getSheetByName(SVOD_MIN_CFG.REGISTRY_SHEET);
  if (!registry) throw new Error(`Лист "${SVOD_MIN_CFG.REGISTRY_SHEET}" не найден`);

  const lastRow = registry.getLastRow();
  if (lastRow < 2) return;

  const width = Math.max(SVOD_MIN_CFG.REGISTRY_NAME_COL, SVOD_MIN_CFG.REGISTRY_STATUS_COL);
  const rows = registry.getRange(2, 1, lastRow - 1, width).getDisplayValues();
  const nameCol = SVOD_MIN_CFG.REGISTRY_NAME_COL;
  const nameFormulaCol = registry.getRange(2, nameCol, lastRow - 1, 1).getFormulas();
  let processed = 0;
  let candidates = 0;
  let missingSheet = 0;
  let noBattle = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sheetName = svodMinExtractRegistrySheetName_(
      row[nameCol - 1],
      nameFormulaCol[i][0]
    );
    const status = svodMinNormCell_(row[SVOD_MIN_CFG.REGISTRY_STATUS_COL - 1]).replace(/ё/g, 'е');
    if (!sheetName) continue;
    if (status.indexOf(SVOD_MIN_CFG.TRIGGER_TEXT_NORM) === -1) continue;
    candidates++;

    const sh = ss.getSheetByName(sheetName);
    if (!sh) {
      console.log(`Skip: лист "${sheetName}" не найден`);
      missingSheet++;
      continue;
    }

    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const battleColIndex = headers.indexOf('настоящее боевой');
    if (battleColIndex === -1) {
      console.log(`Skip: ${sheetName} (нет колонки "настоящее боевой")`);
      noBattle++;
      continue;
    }

    svodMinProcessSheet_(sh, battleColIndex, headers);
    processed++;
  }

  console.log(
    `DONE: кандидатов=${candidates}, обработано=${processed}, ` +
    `неНайденЛист=${missingSheet}, безКолонки=${noBattle}`
  );
}

function processActiveSheetSvodMin() {
  svodMinResetCache_();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const battleColIndex = headers.indexOf('настоящее боевой');
  if (battleColIndex === -1) throw new Error(`На листе "${sh.getName()}" нет колонки "настоящее боевой"`);
  svodMinProcessSheet_(sh, battleColIndex, headers);
  console.log(`DONE ACTIVE: ${sh.getName()}`);
}

function onEditInstallableProcessRegistrySvodMin(e) {
  if (!e || !e.range) return;
  const range = e.range;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (range.getRow() !== 14) return;

  const editedSheet = range.getSheet();
  const editedValue = svodMinNormCell_((e && e.value) || range.getDisplayValue()).replace(/ё/g, 'е');
  if (editedValue !== SVOD_MIN_CFG.TRIGGER_TEXT_NORM) return;

  const headers = editedSheet.getRange(1, 1, 1, editedSheet.getLastColumn()).getValues()[0];
  const battleColIndex = headers.indexOf('настоящее боевой');
  if (battleColIndex === -1) return;
  if (range.getColumn() !== battleColIndex + 1) return;

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(SVOD_MIN_CFG.ONEDIT_LOCK_WAIT_MS || 30000)) return;

  try {
    const liveValue = svodMinNormCell_(range.getDisplayValue()).replace(/ё/g, 'е');
    if (liveValue !== SVOD_MIN_CFG.TRIGGER_TEXT_NORM) return;

    const props = PropertiesService.getScriptProperties();
    const dedupKey = 'svodMin:lastOnEdit';
    const now = Date.now();
    const signature = [
      editedSheet.getSheetId(),
      range.getA1Notation(),
      liveValue,
      String(e.oldValue || ''),
    ].join('|');
    const prevRaw = props.getProperty(dedupKey);
    if (prevRaw) {
      const parts = prevRaw.split('::');
      const prevSig = parts[0] || '';
      const prevTs = Number(parts[1] || 0);
      if (prevSig === signature && (now - prevTs) < (SVOD_MIN_CFG.ONEDIT_DEDUP_MS || 15000)) return;
    }
    props.setProperty(dedupKey, `${signature}::${now}`);

    svodMinResetCache_();
    svodMinProcessSheet_(editedSheet, battleColIndex, headers);
  } finally {
    lock.releaseLock();
  }
}

// Совместимость со старым installable trigger.
function onEditInstallableProcessRegistry(e) {
  return onEditInstallableProcessRegistrySvodMin(e);
}

function svodMinProcessSheet_(sheet, battleColIndex, headersOverride) {
  if (!sheet) return;

  const sheetName = sheet.getName();
  const headers = (headersOverride && headersOverride.length)
    ? headersOverride
    : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const prevColIndex = headers.indexOf('предыдущий');
  const currentColIndex = headers.indexOf('настоящее');
  if (prevColIndex === -1 || currentColIndex === -1 || battleColIndex === -1) {
    throw new Error(`Не найдены нужные столбцы на листе "${sheetName}"`);
  }

  if (svodMinShouldSkipRecentProcess_(sheet)) return;

  const battleColNumber = battleColIndex + 1;
  const dropdownCell = sheet.getRange(14, battleColNumber);

  try {
    const errorCol = battleColNumber + 1;
    const errorProbe = sheet.getRange(19, errorCol, 4, 1).getDisplayValues().flat();
    const errRows = [19, 20, 22];
    for (let i = 0; i < errRows.length; i++) {
      const row = errRows[i];
      const v = String(errorProbe[row - 19] || '');
      if (/ОШИБКА|ЗАПОЛНИ|!!!/.test(v)) {
        dropdownCell.setValue('ИСПРАВЬ ОШИБКИ');
        throw new Error(`Ошибка в строке ${row}: ${v.replace(/<[^>]+>/g, '')}`);
      }
    }

    const lastRow = sheet.getLastRow();
    const height = Math.max(1, lastRow - 14);
    const markerRange = sheet.getRange(15, battleColNumber, height, 1);
    const stopCell = markerRange.createTextFinder('стоп').matchEntireCell(true).findNext();
    const outputCell = markerRange.createTextFinder('Вывод').matchEntireCell(true).findNext();
    const stopRow = stopCell ? stopCell.getRow() : -1;
    const outputRow = outputCell ? outputCell.getRow() : -1;
    if (stopRow === -1) throw new Error('Не найден маркер "стоп"');

    svodMinCopyDataToSvod_(sheet, battleColIndex, outputRow, sheetName);

    const numRows = stopRow - 15;
    if (numRows > 0) {
      const srcValues = sheet.getRange(15, currentColIndex + 1, numRows, 2).getValues();
      sheet.getRange(15, prevColIndex + 1, numRows, 2).setValues(srcValues);
    }

    const fixedRows = [15, 16, 17, 18, 20].filter(r => r <= lastRow);
    if (fixedRows.length) {
      const colLetter = svodMinColumnToLetter_(battleColNumber);
      sheet.getRangeList(fixedRows.map(r => `${colLetter}${r}`)).setValue('');
    }
    if (19 <= lastRow) sheet.getRange(19, battleColNumber).setValue('Инспектор не выбран');
    if (22 <= lastRow) sheet.getRange(22, battleColNumber).setValue('Выбери дату');

    if (outputRow !== -1 && outputRow + 1 <= lastRow) {
      const clearCount = Math.min(9, lastRow - outputRow);
      if (clearCount > 0) sheet.getRange(outputRow + 1, battleColNumber, clearCount, 1).setValue('');
    }

    const statusRows = new Set([14, 15, 16, 18]);
    for (let row = Math.max(1, stopRow - 10); row <= stopRow - 2; row++) statusRows.add(row);
    const toggleRow = (outputRow !== -1 && outputRow + 10 <= lastRow) ? outputRow + 10 : -1;

    const rowsToCheckSet = new Set(Array.from(statusRows));
    if (toggleRow !== -1) rowsToCheckSet.add(toggleRow);
    const rowsToCheck = Array.from(rowsToCheckSet).filter(r => r <= lastRow).sort((a, b) => a - b);

    if (rowsToCheck.length) {
      const minRow = rowsToCheck[0];
      const maxRow = rowsToCheck[rowsToCheck.length - 1];
      const range = sheet.getRange(minRow, battleColNumber, maxRow - minRow + 1, 1);
      const block = range.getDisplayValues();
      let changed = false;

      for (let i = 0; i < rowsToCheck.length; i++) {
        const row = rowsToCheck[i];
        const idx = row - minRow;
        const cur = String(block[idx][0] || '').trim();
        let next = cur;
        if (statusRows.has(row) && cur === 'Мониторинг завершен') next = 'Мониторинг не начат';
        if (row === toggleRow && cur === 'ДА') next = 'НЕТ';
        if (next !== cur) {
          block[idx][0] = next;
          changed = true;
        }
      }

      if (changed) range.setValues(block);
    }
  } catch (e) {
    dropdownCell.setValue('ИСПРАВЬ ОШИБКИ');
    throw e;
  }
}

function svodMinCopyDataToSvod_(sourceSheet, battleColIndex, outputRow, checklistName) {
  const svodSheet = svodMinGetSvodSheet_();
  const preferredColNumber = battleColIndex + 1;
  const picked = svodMinSelectBestExportSourceData_(sourceSheet, preferredColNumber, outputRow);
  const dateValue = picked.dateValue;
  const peopleCountValue = picked.peopleCount;
  const selectedRawValues = picked.selectedValues;
  if (!selectedRawValues || !selectedRawValues.length) return;
  const issueRawValues = svodMinExtractIssueValues_(sourceSheet, picked.colNumber);

  const selectedValues = selectedRawValues.map(v => {
    const s = String(v || '').trim();
    return s === '' ? SVOD_MIN_CFG.FILL_MISSING : s;
  });
  const issueValues = issueRawValues.map(v => {
    const s = String(v || '').trim();
    return s === '' ? SVOD_MIN_CFG.FILL_MISSING : s;
  });

  const safeDateValue = dateValue || SVOD_MIN_CFG.FILL_MISSING;
  const safePeopleCountValue = String(peopleCountValue || '').trim() || SVOD_MIN_CFG.FILL_MISSING;
  const payload = [checklistName, safeDateValue, safePeopleCountValue]
    .concat(selectedValues)
    .concat([''])
    .concat(issueValues);

  svodMinEnsureRowIndex_(svodSheet);
  const key = svodMinMakeKey_(checklistName, safeDateValue);
  const existingRow = (SVOD_MIN_CACHE.rowIndex && SVOD_MIN_CACHE.rowIndex[key]) || 0;
  if (existingRow > 0) {
    svodSheet.getRange(existingRow, 2, 1, payload.length).setValues([payload]);
    return;
  }

  const insertRow = Math.max(2, svodSheet.getLastRow() + 1);
  const rowPayload = [insertRow - 1].concat(payload);
  svodSheet.getRange(insertRow, 1, 1, rowPayload.length).setValues([rowPayload]);
  if (!SVOD_MIN_CACHE.rowIndex) SVOD_MIN_CACHE.rowIndex = {};
  SVOD_MIN_CACHE.rowIndex[key] = insertRow;
  SVOD_MIN_CACHE.rowIndexLastRow = insertRow;
}

function svodMinEnsureSvodSheetAndHeaders_(spreadsheet) {
  let sh = spreadsheet.getSheetByName(SVOD_MIN_CFG.TARGET_SHEET);
  if (!sh) sh = spreadsheet.insertSheet(SVOD_MIN_CFG.TARGET_SHEET);

  const expectedHeaders = SVOD_MIN_CFG.HEADER_PREFIX
    .concat(SVOD_MIN_CFG.TARGET_HEADERS)
    .concat([SVOD_MIN_CFG.ISSUE_ANCHOR_HEADER])
    .concat(SVOD_MIN_CFG.ISSUE_EXTRA_HEADERS || []);
  const width = expectedHeaders.length;
  const current = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
  const lastColumn = sh.getLastColumn();

  let mustRewrite = false;
  for (let i = 0; i < width; i++) {
    if (String(current[i] || '').trim() !== expectedHeaders[i]) {
      mustRewrite = true;
      break;
    }
  }

  if (mustRewrite || lastColumn < width) {
    sh.getRange(1, 1, 1, width).setValues([expectedHeaders]);
  }
  if (sh.getFrozenRows() < 1) sh.setFrozenRows(1);

  return sh;
}

function svodMinSelectBestExportSourceData_(sheet, preferredColNumber, outputRow) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const currentColIndex = headers.indexOf('настоящее');
  const prevColIndex = headers.indexOf('предыдущий');
  const candidates = [];

  const addCandidate = col => {
    if (!col || col < 1) return;
    if (!candidates.includes(col)) candidates.push(col);
  };

  addCandidate(preferredColNumber);
  if (currentColIndex !== -1) addCandidate(currentColIndex + 1);
  if (prevColIndex !== -1) addCandidate(prevColIndex + 1);

  const endRow = outputRow > 0 ? outputRow - 1 : sheet.getLastRow();
  const maxSourceIdx = Math.max.apply(null, SVOD_MIN_CFG.SOURCE_INDICES);
  const bestDefault = {
    colNumber: candidates[0] || preferredColNumber,
    score: -1,
    dateValue: '',
    peopleCount: '',
    selectedValues: [],
  };
  if (!candidates.length) return bestDefault;

  const minDateRow = Math.min.apply(null, SVOD_MIN_CFG.DATE_CANDIDATE_ROWS);
  const maxDateRow = Math.max.apply(null, SVOD_MIN_CFG.DATE_CANDIDATE_ROWS);
  const minScanRow = Math.min(
    SVOD_MIN_CFG.DATA_START_ROW_IN_SOURCE,
    minDateRow,
    SVOD_MIN_CFG.PEOPLE_COUNT_ROW_IN_SOURCE
  );
  if (endRow < minScanRow) return bestDefault;

  const minCol = Math.min.apply(null, candidates);
  const maxCol = Math.max.apply(null, candidates);
  const scanWidth = maxCol - minCol + 1;
  // Для экспорта нам нужны только дата/кол-во людей и SOURCE_INDICES (не весь хвост до outputRow).
  const maxNeededDataRow = SVOD_MIN_CFG.DATA_START_ROW_IN_SOURCE + 1 + maxSourceIdx;
  const boundedDataEnd = Math.min(endRow, maxNeededDataRow);
  const scanEndRow = Math.max(maxDateRow, SVOD_MIN_CFG.PEOPLE_COUNT_ROW_IN_SOURCE, boundedDataEnd);
  const scanHeight = scanEndRow - minScanRow + 1;
  const displayBlock = sheet.getRange(minScanRow, minCol, scanHeight, scanWidth).getDisplayValues();
  const dateRawBlock = sheet.getRange(minDateRow, minCol, maxDateRow - minDateRow + 1, scanWidth).getValues();
  const fillMissingNorm = String(SVOD_MIN_CFG.FILL_MISSING).toLowerCase();

  let best = bestDefault;
  for (let c = 0; c < candidates.length; c++) {
    const colNumber = candidates[c];
    const colOffset = colNumber - minCol;

    const baseOffset = SVOD_MIN_CFG.DATA_START_ROW_IN_SOURCE - minScanRow;
    const baseCell = String(displayBlock[baseOffset][colOffset] || '').trim();
    const startRow = svodMinIsDateLike_(baseCell)
      ? SVOD_MIN_CFG.DATA_START_ROW_IN_SOURCE + 1
      : SVOD_MIN_CFG.DATA_START_ROW_IN_SOURCE;
    if (endRow < startRow) continue;

    const peopleCountOffset = SVOD_MIN_CFG.PEOPLE_COUNT_ROW_IN_SOURCE - minScanRow;
    const peopleCountValue = (peopleCountOffset >= 0 && peopleCountOffset < displayBlock.length)
      ? String(displayBlock[peopleCountOffset][colOffset] || '').trim()
      : '';

    let dateValue = '';
    for (let d = 0; d < SVOD_MIN_CFG.DATE_CANDIDATE_ROWS.length; d++) {
      const row = SVOD_MIN_CFG.DATE_CANDIDATE_ROWS[d];
      const raw = dateRawBlock[row - minDateRow][colOffset];
      const text = String(displayBlock[row - minScanRow][colOffset] || '').trim();
      if (raw instanceof Date) {
        dateValue = Utilities.formatDate(raw, Session.getScriptTimeZone(), 'dd.MM.yyyy');
        break;
      }
      if (svodMinIsDateLike_(text)) {
        dateValue = text;
        break;
      }
    }

    let score = 0;
    const startOffset = startRow - minScanRow;
    const selectedValues = new Array(SVOD_MIN_CFG.SOURCE_INDICES.length);
    for (let i = 0; i < SVOD_MIN_CFG.SOURCE_INDICES.length; i++) {
      const idx = SVOD_MIN_CFG.SOURCE_INDICES[i];
      const absoluteRow = startRow + idx;
      const rowOffset = absoluteRow - minScanRow;
      const raw = (absoluteRow <= endRow && rowOffset >= 0 && rowOffset < displayBlock.length)
        ? displayBlock[rowOffset][colOffset]
        : '';
      selectedValues[i] = raw;
      const s = String(raw || '').trim().toLowerCase();
      if (s && s !== fillMissingNorm && s !== 'выбери дату') score++;
    }

    if (score > best.score) {
      best = { colNumber, score, dateValue, peopleCount: peopleCountValue, selectedValues };
      if (score === SVOD_MIN_CFG.SOURCE_INDICES.length) break;
    }
  }

  return best;
}

function svodMinShouldSkipRecentProcess_(sheet) {
  const props = PropertiesService.getScriptProperties();
  const key = `svodMin:lastProcess:${sheet.getSheetId()}`;
  const now = Date.now();
  const prev = Number(props.getProperty(key) || 0);
  if (prev && (now - prev) < (SVOD_MIN_CFG.PROCESS_DEDUP_MS || 45000)) return true;
  props.setProperty(key, String(now));
  return false;
}

function svodMinEnsureRowIndex_(sheet) {
  const lastRow = sheet.getLastRow();
  if (SVOD_MIN_CACHE.rowIndex && SVOD_MIN_CACHE.rowIndexLastRow === lastRow) return;

  const index = {};
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 2, lastRow - 1, 2).getDisplayValues();
    for (let i = 0; i < values.length; i++) {
      const key = svodMinMakeKey_(values[i][0], values[i][1]);
      if (key !== '|' && !index[key]) index[key] = i + 2;
    }
  }
  SVOD_MIN_CACHE.rowIndex = index;
  SVOD_MIN_CACHE.rowIndexLastRow = lastRow;
}

function svodMinMakeKey_(checklistName, dateValue) {
  return `${svodMinNormCell_(checklistName)}|${svodMinNormCell_(dateValue)}`;
}

function svodMinIsDateLike_(s) {
  return /^\d{2}[./-]\d{2}[./-]\d{4}$/.test(String(s || '').trim());
}

function svodMinNormCell_(v) {
  return String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function svodMinColumnToLetter_(colNumber) {
  let col = Number(colNumber);
  let letter = '';
  while (col > 0) {
    const temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}

function svodMinExtractRegistrySheetName_(displayValue, formulaValue) {
  const text = String(displayValue || '').trim();
  if (text) return text;

  const formula = String(formulaValue || '').trim();
  if (!formula) return '';

  const quoted = formula.match(/"((?:[^"]|"")*)"/g);
  if (!quoted || !quoted.length) return '';
  const lastQuoted = quoted[quoted.length - 1] || '';
  return lastQuoted.replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"').trim();
}

function svodMinExtractIssueValues_(sheet, sourceColNumber) {
  const labels = SVOD_MIN_CFG.ISSUE_EXTRA_HEADERS || [];
  if (!labels.length) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return new Array(labels.length).fill('');

  const lookupCol = Number(SVOD_MIN_CFG.ISSUE_LOOKUP_COL_IN_SOURCE || 3);
  const colCValues = sheet.getRange(1, lookupCol, lastRow, 1).getDisplayValues().flat();

  let anchorRow = 0;
  const anchorText = String(SVOD_MIN_CFG.ISSUE_ANCHOR_HEADER || '').trim();
  if (anchorText) {
    const anchorCell = sheet
      .createTextFinder(anchorText)
      .matchCase(false)
      .useRegularExpression(false)
      .findNext();
    if (anchorCell) anchorRow = anchorCell.getRow();
  }

  const rowByLabel = {};
  const startIdx = anchorRow > 0 ? Math.max(0, anchorRow - 1) : 0;
  for (let i = startIdx; i < colCValues.length; i++) {
    const key = svodMinNormCell_(colCValues[i]).replace(/ё/g, 'е');
    if (!key) continue;
    if (!rowByLabel[key]) rowByLabel[key] = i + 1;
  }

  const rows = labels.map(label => {
    const key = svodMinNormCell_(label).replace(/ё/g, 'е');
    return rowByLabel[key] || 0;
  });
  const presentRows = rows.filter(r => r > 0);
  if (!presentRows.length) return new Array(labels.length).fill('');

  const minRow = Math.min.apply(null, presentRows);
  const maxRow = Math.max.apply(null, presentRows);
  const values = sheet.getRange(minRow, sourceColNumber, maxRow - minRow + 1, 1).getDisplayValues().flat();

  return rows.map(r => (r > 0 ? values[r - minRow] : ''));
}

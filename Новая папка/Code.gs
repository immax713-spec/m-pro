/**
 * M-PRO Google Apps Script
 * Единая загрузка данных
 */

const SPREADSHEET_ID = '1BEd6qWf8Y2wx1zKh_ysTLcpigPId5HWF52yINkHX_8E';

// Заголовки для динамического поиска колонок
const OBJECT_HEADERS = {
  ID: 'id',
  DATE: 'Date',
  ADDRESS: 'Adress',
  LATLON: 'LatLon',
  INSPECTOR: 'Inspector',
  LIST: 'List',
  ENTRY_TIME: 'Entry_time',
  EXIT_TIME: 'Exit_time',
  TIME_SPENT: 'Time_spent',
  GOOGLE_LINK: 'Google_link',
  YANDEX_LINK: 'Yandex_link',
  PHOTOS_LINK: 'Photos_link',
  READINESS: 'Readiness',
  NUMBER: 'Number',
  LABORATORY: 'Laboratory',
  LABORATORY_COMMENT: 'Laboratory_Comment'
};

const HEADERS = {
  INSPECTORS_HOMES: {
    INSPECTOR: 'Inspector',
    ADDRESS: 'Address',
    LAT: 'Lat',
    LON: 'Lon'
  },
  CUSTOM_INSPECTORS: {
    INSPECTOR: 'Inspector',
    COLOR: 'Color',
    ICON: 'Icon',
    STATUS: 'Status'
  },
  AUTHORIZATION: {
    NAME: 'Inspector',
    PASSWORD: 'Password',
    ROLE: 'Rights',
    DIVISION: 'Division'
  },
  MAP: OBJECT_HEADERS,
  LABORATORY: OBJECT_HEADERS,
  CONSTRUCTIONCONTROL: OBJECT_HEADERS,
  DMS: OBJECT_HEADERS
};

/**
 * Получить заголовки для указанного листа
 * @param {string} source - Название листа (Map, Laboratory, ConstructionControl, DMS)
 * @returns {Object} Объект с заголовками
 */
function getHeadersForSource_(source) {
  const sourceUpper = String(source || 'Map').toUpperCase();
  
  switch(sourceUpper) {
    case 'LABORATORY':
      return HEADERS.LABORATORY;
    case 'CONSTRUCTIONCONTROL':
      return HEADERS.CONSTRUCTIONCONTROL;
    case 'DMS':
      return HEADERS.DMS;
    case 'MAP':
    default:
      return HEADERS.MAP;
  }
}

/**
 * Получить индексы колонок по заголовкам (0-based)
 */
function getColumnIndices_(sheet, expectedHeaders) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const indices = {};
  
  for (const key in expectedHeaders) {
    const headerName = expectedHeaders[key];
    for (let i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim().toLowerCase() === headerName.toLowerCase()) {
        indices[key] = i;
        break;
      }
    }
    if (indices[key] === undefined) {
      Logger.log('⚠️ Заголовок не найден: ' + headerName);
    }
  }
  
  return indices;
}

function doGet(e) {
  const p = e.parameter;
  const action = String(p.action || '');
  const callback = p.callback;
  
  try {
    let result;
    
    switch(action) {
      case 'getData':
        result = getData_();
        break;
      case 'getMapPoints':
        result = getMapPoints_();
        break;
      case 'entry':
        result = entry_(p);
        break;
      case 'exit':
        result = exit_(p);
        break;
      case 'denyAccess':
        result = denyAccess_(p);
        break;
      case 'callLaboratory':
        result = callLaboratory_(p);
        break;
      case 'reassign':
        result = reassign_(p);
        break;
      case 'cancelEntry':
        result = cancelEntry_(p);
        break;
      case 'saveInspectorConfig':
        result = saveInspectorConfig_(p);
        break;
      case 'savePhotosLink':
        result = savePhotosLink_(p);
        break;
      case 'auth':
        result = authenticateUser_(p);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    
    return jsonp_(callback, result);
    
  } catch (error) {
    return jsonp_(callback, { success: false, error: error.toString() });
  }
}

/**
 * JSONP-ответ
 */
function jsonp_(callback, data) {
  const cb = callback || 'callback';
  const body = cb + '(' + JSON.stringify(data) + ')';
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * Получить все данные
 */
function getData_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Загрузить дома инспекторов (из листа InspectorsHomes)
  const homes = getInspectorsHomes_(ss);
  
  // Загрузить конфигурацию инспекторов (из листа CustomInspectors)
  const config = getInspectorsConfig_(ss);
  
  // Загрузить точки объектов (из трёх листов)
  const mapPoints = getMapPoints_();
  
  // Загрузить список инспекторов с подразделениями
  const inspectorsList = getInspectorsList_(ss);
  
  return {
    success: true,
    inspectorsHomes: homes,
    inspectorsConfig: config,
    inspectorsList: inspectorsList,
    points: mapPoints.points || [],
    timestamp: new Date().toISOString()
  };
}

/**
 * Получить список инспекторов из листа AuthorizationPage
 */
function getInspectorsList_(ss) {
  const sheet = ss.getSheetByName('AuthorizationPage');
  if (!sheet) return [];
  
  const indices = getColumnIndices_(sheet, HEADERS.AUTHORIZATION);
  const data = sheet.getDataRange().getValues();
  const inspectors = [];
  
  // Robust division index finding if not found by standard header
  let divisionIndex = indices.DIVISION;
  if (divisionIndex === undefined && data.length > 0) {
      const headerRow = data[0];
      for (let j = 0; j < headerRow.length; j++) {
          const h = String(headerRow[j]).trim().toLowerCase();
          if (['division', 'отдел', 'подразделение', 'department', 'дивизион'].includes(h)) {
              divisionIndex = j;
              break;
          }
      }
  }
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = indices.NAME !== undefined ? row[indices.NAME] : '';
    const division = divisionIndex !== undefined ? row[divisionIndex] : '';
    const role = indices.ROLE !== undefined ? row[indices.ROLE] : '';
    
    if (name) {
      inspectors.push({ name, division, role });
    }
  }
  return inspectors;
}

/**
 * Получить дома инспекторов из листа InspectorsHomes
 */
function getInspectorsHomes_(ss) {
  let sheet = ss.getSheetByName('InspectorsHomes');
  
  if (!sheet) {
    sheet = ss.insertSheet('InspectorsHomes');
    sheet.appendRow(['Inspector', 'Address', 'Lat', 'Lon']);
    return {};
  }
  
  const indices = getColumnIndices_(sheet, HEADERS.INSPECTORS_HOMES);
  const data = sheet.getDataRange().getValues();
  const homes = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const inspector = indices.INSPECTOR !== undefined ? row[indices.INSPECTOR] : '';
    const lat = indices.LAT !== undefined ? parseFloat(row[indices.LAT]) : NaN;
    const lon = indices.LON !== undefined ? parseFloat(row[indices.LON]) : NaN;
    
    if (inspector && Number.isFinite(lat) && Number.isFinite(lon)) {
      homes[inspector] = {
        inspector: inspector,
        address: indices.ADDRESS !== undefined ? row[indices.ADDRESS] : '',
        lat: lat,
        lon: lon
      };
    }
  }
  
  return homes;
}

/**
 * Получить конфигурацию инспекторов из листа CustomInspectors
 */
function getInspectorsConfig_(ss) {
  const sheet = ss.getSheetByName('CustomInspectors');
  
  if (!sheet) {
    return {};
  }
  
  const indices = getColumnIndices_(sheet, HEADERS.CUSTOM_INSPECTORS);
  const data = sheet.getDataRange().getValues();
  const config = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const inspector = indices.INSPECTOR !== undefined ? row[indices.INSPECTOR] : '';
    
    if (inspector) {
      config[inspector] = {
        inspector: inspector,
        color: indices.COLOR !== undefined ? row[indices.COLOR] : '#808080',
        icon: indices.ICON !== undefined ? row[indices.ICON] : '👤',
        status: indices.STATUS !== undefined ? row[indices.STATUS] : 'active'
      };
    }
  }
  
  return config;
}

/**
 * Аутентификация пользователя по паролю из листа AuthorizationPage
 */
function authenticateUser_(p) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const password = String(p.password || '').trim();
  
  if (!password) {
    return { success: false, error: 'Password required' };
  }
  
  const sheet = ss.getSheetByName('AuthorizationPage');
  if (!sheet) {
    return { success: false, error: 'Authorization sheet not found' };
  }
  
  const indices = getColumnIndices_(sheet, HEADERS.AUTHORIZATION);
  const data = sheet.getDataRange().getValues();
  
  // Найти пользователя по паролю
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const inspectorName = indices.NAME !== undefined ? row[indices.NAME] : '';
    const storedPassword = indices.PASSWORD !== undefined ? String(row[indices.PASSWORD] || '').trim() : '';
    
    if (storedPassword && storedPassword === password) {
      // Роль из колонки Role или автоопределение по имени
      let role = indices.ROLE !== undefined ? row[indices.ROLE] : '';
      if (!role) {
        role = inspectorName.toLowerCase().includes('admin') ? 'Администратор' : 'Инспектор';
      }
      
      const division = indices.DIVISION !== undefined ? row[indices.DIVISION] : '';

      return {
        success: true,
        user: {
          name: inspectorName,
          role: role,
          division: division,
          loginTime: new Date().toISOString()
        }
      };
    }
  }
  
  return { success: false, error: 'Неверный пароль' };
}

/**
 * Сохранить конфигурацию инспектора
 */
function saveInspectorConfig_(p) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('CustomInspectors');
  
  if (!sheet) {
    sheet = ss.insertSheet('CustomInspectors');
    sheet.appendRow(['Inspector', 'Color', 'Icon', 'Status']);
  }
  
  const indices = getColumnIndices_(sheet, HEADERS.CUSTOM_INSPECTORS);
  const inspector = String(p.inspector || '').trim();
  const color = p.color || '';
  const icon = p.icon || '';
  const status = p.status || 'active';
  
  if (!inspector) {
    return { success: false, error: 'Inspector name required' };
  }
  
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // Найти существующую строку
  for (let i = 1; i < data.length; i++) {
    if (indices.INSPECTOR !== undefined && data[i][indices.INSPECTOR] === inspector) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > 0) {
    // Обновить существующую
    if (color && indices.COLOR !== undefined) sheet.getRange(rowIndex, indices.COLOR + 1).setValue(color);
    if (icon && indices.ICON !== undefined) sheet.getRange(rowIndex, indices.ICON + 1).setValue(icon);
    if (status && indices.STATUS !== undefined) sheet.getRange(rowIndex, indices.STATUS + 1).setValue(status);
  } else {
    // Добавить новую — собираем значения в правильном порядке
    const newRow = new Array(sheet.getLastColumn()).fill('');
    if (indices.INSPECTOR !== undefined) newRow[indices.INSPECTOR] = inspector;
    if (indices.COLOR !== undefined) newRow[indices.COLOR] = color;
    if (indices.ICON !== undefined) newRow[indices.ICON] = icon;
    if (indices.STATUS !== undefined) newRow[indices.STATUS] = status;
    sheet.appendRow(newRow);
  }
  
  return { success: true, message: 'Config saved for ' + inspector };
}

// =============================================================================
// MAP POINTS (ТОЧКИ НА КАРТЕ)
// =============================================================================

/**
 * Получить точки из трёх листов: Map, Laboratory, ConstructionControl
 */
function getMapPoints_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const allPoints = [];
  
  // Загружаем из четырёх листов
  const sources = [
    { name: 'Map', source: 'Map' },
    { name: 'Laboratory', source: 'Laboratory' },
    { name: 'ConstructionControl', source: 'ConstructionControl' },
    { name: 'DMS', source: 'DMS' }
  ];
  
  for (const src of sources) {
    const sheet = ss.getSheetByName(src.name);
    if (!sheet) {
      Logger.log('⚠️ Лист не найден: ' + src.name);
      continue;
    }
    
    const indices = getColumnIndices_(sheet, getHeadersForSource_(src.source));
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = indices.ID !== undefined ? String(row[indices.ID] || '').trim() : '';
      if (!id) continue;
      
      // Парсим LatLon
      const latlon = indices.LATLON !== undefined ? String(row[indices.LATLON] || '') : '';
      const coords = parseLatLon_(latlon);
      if (!coords) continue; // Пропускаем если нет координат
      
      const point = {
        id: src.source + '_' + id,  // Уникальный ID: Map_123, Laboratory_456
        originalId: id,  // Оригинальный ID для обновления
        source: src.source,
        sheetName: src.name,
        rowIndex: i + 1, // 1-based для обновления
        latitude: coords.lat,
        longitude: coords.lon,
        address: indices.ADDRESS !== undefined ? row[indices.ADDRESS] : '',
        inspector: indices.INSPECTOR !== undefined ? row[indices.INSPECTOR] : '',
        list: indices.LIST !== undefined ? row[indices.LIST] : '',
        date: indices.DATE !== undefined ? formatDateRU_(row[indices.DATE]) : '',
        entryTime: formatDateTime_(indices.ENTRY_TIME !== undefined ? row[indices.ENTRY_TIME] : ''),
        exitTime: formatDateTime_(indices.EXIT_TIME !== undefined ? row[indices.EXIT_TIME] : ''),
        timeSpent: indices.TIME_SPENT !== undefined ? row[indices.TIME_SPENT] : '',
        googleLink: indices.GOOGLE_LINK !== undefined ? row[indices.GOOGLE_LINK] : '',
        yandexDiskLink: indices.YANDEX_LINK !== undefined ? row[indices.YANDEX_LINK] : '',
        photosLink: indices.PHOTOS_LINK !== undefined ? row[indices.PHOTOS_LINK] : '',
        readiness: indices.READINESS !== undefined ? row[indices.READINESS] : '',
        number: indices.NUMBER !== undefined ? row[indices.NUMBER] : '',
        laboratory: indices.LABORATORY !== undefined ? row[indices.LABORATORY] : '',
        laboratoryComment: indices.LABORATORY_COMMENT !== undefined ? row[indices.LABORATORY_COMMENT] : ''
      };
      
      allPoints.push(point);
    }
  }
  
  return {
    success: true,
    points: allPoints,
    count: allPoints.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Парсинг LatLon в формате "55.7558, 37.6176"
 */
function parseLatLon_(latlon) {
  if (!latlon) return null;
  
  const parts = String(latlon).split(',');
  if (parts.length < 2) return null;
  
  const lat = parseFloat(parts[0].trim().replace(',', '.'));
  const lon = parseFloat(parts[1].trim().replace(',', '.'));
  
  if (isNaN(lat) || isNaN(lon)) return null;
  
  return { lat: lat, lon: lon };
}

/**
 * Форматирование даты/времени
 */
function formatDateTime_(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Извлечь оригинальный ID объекта из формата "Source_123" -> "123"
 */
function extractObjectId_(fullId) {
  const raw = String(fullId || '').trim();
  if (!raw) return '';
  return raw.includes('_') ? raw.split('_')[1] : raw;
}

/**
 * Найти строку объекта по ID.
 * @returns {{rowNumber:number,rowData:Object}|null}
 */
function findObjectRowById_(data, indices, id) {
  for (let i = 1; i < data.length; i++) {
    const rowId = indices.ID !== undefined ? String(data[i][indices.ID] || '').trim() : '';
    if (rowId === id) {
      return { rowNumber: i + 1, rowData: data[i] };
    }
  }
  return null;
}

/**
 * Подготовить общий контекст для операций с объектом на листе.
 */
function getObjectActionContext_(p) {
  const source = String(p.source || 'Map');
  const id = extractObjectId_(p.objectId);
  if (!id) return { error: 'No objectId' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(source);
  if (!sheet) return { error: 'Sheet not found: ' + source };

  const indices = getColumnIndices_(sheet, getHeadersForSource_(source));
  const data = sheet.getDataRange().getValues();
  const row = findObjectRowById_(data, indices, id);
  if (!row) return { error: 'Object not found' };

  return { source, id, sheet, indices, data, rowNumber: row.rowNumber, rowData: row.rowData };
}

// =============================================================================
// ENTRY / EXIT / DENY / LABORATORY
// =============================================================================

/**
 * Отметить вход на объект
 */
function entry_(p) {
  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };

  if (ctx.indices.ENTRY_TIME !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.ENTRY_TIME + 1).setValue(new Date());
  }
  SpreadsheetApp.flush();
  return { success: true, updated: true, row: ctx.rowNumber };
}

/**
 * Отметить выход с объекта
 */
function exit_(p) {
  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };

  if (ctx.indices.EXIT_TIME !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.EXIT_TIME + 1).setValue(new Date());
  }

  // Формула Time_spent (Google Sheets использует английские названия функций)
  if (ctx.indices.TIME_SPENT !== undefined && ctx.indices.ENTRY_TIME !== undefined && ctx.indices.EXIT_TIME !== undefined) {
    const entryColLetter = columnIndexToLetter_(ctx.indices.ENTRY_TIME);
    const exitColLetter = columnIndexToLetter_(ctx.indices.EXIT_TIME);
    const timeSpentCol = ctx.indices.TIME_SPENT + 1;
    const formula = `=IF(AND(${exitColLetter}${ctx.rowNumber}<>"";${entryColLetter}${ctx.rowNumber}<>"");${exitColLetter}${ctx.rowNumber}-${entryColLetter}${ctx.rowNumber};"")`;
    ctx.sheet.getRange(ctx.rowNumber, timeSpentCol).setFormula(formula);
  }

  // Нумерация (Number)
  if (ctx.indices.NUMBER !== undefined) {
    const inspector = ctx.indices.INSPECTOR !== undefined ? ctx.rowData[ctx.indices.INSPECTOR] : '';
    const date = ctx.indices.DATE !== undefined ? ctx.rowData[ctx.indices.DATE] : new Date();
    const newNumber = getNextNumber_(ctx.sheet, ctx.indices, inspector, date);
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.NUMBER + 1).setValue(newNumber);
  }

  SpreadsheetApp.flush();
  return { success: true, updated: true, row: ctx.rowNumber };
}

/**
 * Отказано в доступе (специальный маркер)
 */
function denyAccess_(p) {
  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };

  if (ctx.indices.EXIT_TIME !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.EXIT_TIME + 1).setValue('нет');
  }
  SpreadsheetApp.flush();
  return { success: true, updated: true, row: ctx.rowNumber };
}

/**
 * Вызов лаборатории
 */
function callLaboratory_(p) {
  const comment = String(p.comment || '');
  if (!comment) return { success: false, error: 'No comment' };

  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };

  if (ctx.indices.LABORATORY !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.LABORATORY + 1).setValue('✅');
  }
  if (ctx.indices.LABORATORY_COMMENT !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.LABORATORY_COMMENT + 1).setValue(comment);
  }
  SpreadsheetApp.flush();
  return { success: true, updated: true, row: ctx.rowNumber };
}

/**
 * Отменить вход (очистить Entry_time)
 */
function cancelEntry_(p) {
  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };

  if (ctx.indices.ENTRY_TIME !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.ENTRY_TIME + 1).clearContent();
  }
  if (ctx.indices.EXIT_TIME !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.EXIT_TIME + 1).clearContent();
  }
  if (ctx.indices.TIME_SPENT !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, ctx.indices.TIME_SPENT + 1).clearContent();
  }
  SpreadsheetApp.flush();
  return { success: true, updated: true, row: ctx.rowNumber };
}

/**
 * Преобразовать индекс колонки (0-based) в буквенное обозначение (A, B, C...)
 * @param {number} index - Индекс колонки (0 = A, 1 = B)
 * @returns {string} Буквенное обозначение колонки
 */
function columnIndexToLetter_(index) {
  if (index < 0) return 'A';
  let result = '';
  let temp = index;
  do {
    result = String.fromCharCode(65 + (temp % 26)) + result;
    temp = Math.floor(temp / 26) - 1;
  } while (temp >= 0);
  return result;
}

/**
 * Получить следующий номер для объекта (нумерация в рамках дня и инспектора)
 */
function getNextNumber_(sheet, indices, inspector, date) {
  if (indices.NUMBER === undefined || indices.INSPECTOR === undefined || indices.DATE === undefined) {
    return 1;
  }
  
  const data = sheet.getDataRange().getValues();
  const dateStr = formatDateRU_(date);
  let maxNumber = 0;
  
  for (let i = 1; i < data.length; i++) {
    const rowInspector = String(data[i][indices.INSPECTOR] || '');
    const rowDate = formatDateRU_(data[i][indices.DATE]);
    const rowNumber = parseInt(data[i][indices.NUMBER]) || 0;
    
    if (rowInspector === inspector && rowDate === dateStr && rowNumber > maxNumber) {
      maxNumber = rowNumber;
    }
  }
  
  return maxNumber + 1;
}


function formatDateRU_(d) {
  if (!d) return '';
  if (!(d instanceof Date)) {
    try { d = new Date(d); } catch(e) { return ''; }
  }
  var dd = d.getDate();
  var mm = d.getMonth() + 1;
  var yyyy = d.getFullYear();
  var sdd = dd < 10 ? ('0' + dd) : String(dd);
  var smm = mm < 10 ? ('0' + mm) : String(mm);
  return sdd + '.' + smm + '.' + yyyy;
}

/**
 * Переназначить инспектора у объекта
 */
function reassign_(p) {
  const newInspector = String(p.newInspector || '').trim();
  if (!newInspector) return { success: false, error: 'No newInspector' };

  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };
  if (ctx.indices.INSPECTOR === undefined) return { success: false, error: 'Inspector column not found' };

  ctx.sheet.getRange(ctx.rowNumber, ctx.indices.INSPECTOR + 1).setValue(newInspector);
  SpreadsheetApp.flush();
  return { success: true, updated: true, row: ctx.rowNumber, message: 'Inspector reassigned' };
}

/**
 * Сохранить ссылку фотоотчета в колонку Photos_link.
 */
function savePhotosLink_(p) {
  const photosLink = String(p.photosLink || '').trim();
  if (!photosLink) return { success: false, error: 'No photosLink' };

  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };
  if (ctx.indices.PHOTOS_LINK === undefined) return { success: false, error: 'Photos_link column not found' };

  ctx.sheet.getRange(ctx.rowNumber, ctx.indices.PHOTOS_LINK + 1).setValue(photosLink);
  SpreadsheetApp.flush();
  return { success: true, updated: true, row: ctx.rowNumber, message: 'Photos_link saved' };
}

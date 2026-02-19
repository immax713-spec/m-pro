var CONFIG = {
  MAP_SHEET_NAME: 'Map',
  ARCHIVE_SHEET_NAME: 'Archive',
  ADDOBJECT_SHEET_NAME: 'AddObject',
  MIN_DAYS_BETWEEN_VISITS: 7,
  DEFAULT_INSPECTOR: 'Admin',
  
  // Цвета
  COLOR_NEW_OBJECT: '#C8E6C9',      // 🟢 Зелёный — новый
  COLOR_TOO_SOON: '#FFF9C4',        // 🟡 Жёлтый — < 7 дней
  COLOR_DUPLICATE: '#FFCDD2',       // 🔴 Светло-красный — дубль
  
  // Заголовки колонок (для динамического поиска)
  HEADERS: {
    ID: 'id',
    DATE: 'Date',
    ADDRESS: 'Adress',      // так в таблице написано
    LATLON: 'LatLon',
    INSPECTOR: 'Inspector',
    LIST: 'List',
    ENTRY: 'Entry_time',
    EXIT: 'Exit_time',
    TIME_SPENT: 'Time_spent',
    GOOGLE: 'Google_link',
    YANDEX: 'Yandex_link',
    READINESS: 'Readiness',
    NUMBER: 'Number',
    PHOTOS: 'Photos_link'
  }
};

/**
 * Получить индексы колонок по заголовкам (0-based)
 */
function getColumnIndices(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var indices = {};
  
  for (var key in CONFIG.HEADERS) {
    var headerName = CONFIG.HEADERS[key];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim().toLowerCase() === headerName.toLowerCase()) {
        indices[key] = i; // 0-based
        break;
      }
    }
    if (indices[key] === undefined) {
      Logger.log('⚠️ Заголовок не найден: ' + headerName);
    }
  }
  
  return indices;
}

// =============================================================================
// ГЛАВНАЯ ФУНКЦИЯ (точка входа)
// =============================================================================

/**
 * Добавить объект с проверкой Archive
 * Вызывается из меню или через макрос
 */
function addObjectKostyl() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActive();
  
  try {
    // 1. Ввод ID
    var idResponse = ui.prompt(
      '➕ Добавить объект',
      'Введите ID объекта:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (idResponse.getSelectedButton() != ui.Button.OK) {
      return; // Отмена
    }
    
    var objectId = String(idResponse.getResponseText()).trim();
    
    if (!objectId) {
      ui.alert('❌ Ошибка', 'ID не может быть пустым', ui.ButtonSet.OK);
      return;
    }
    
    // 2. Ввод даты (с проверкой формата)
    var dateStr = askForDate(ui);
    if (!dateStr) return; // Отмена
    
    // 3. Проверяем, нет ли уже такого объекта на эту дату
    var mapSheet = ss.getSheetByName(CONFIG.MAP_SHEET_NAME);
    if (!mapSheet) {
      ui.alert('❌ Ошибка', 'Лист "Map" не найден!', ui.ButtonSet.OK);
      return;
    }
    
    if (isObjectExists(mapSheet, objectId, dateStr)) {
      ui.alert(
        '⚠️ Объект уже существует',
        'Объект ' + objectId + ' уже добавлен на ' + dateStr,
        ui.ButtonSet.OK
      );
      return;
    }
    
    // 4. Ищем в AddObject
    var addObjData = findInAddObject(ss, objectId);
    
    // 5. Создаём строку
    var newRow = createRow(objectId, dateStr, addObjData);
    
    // 6. Добавляем в Map
    var newRowIndex = mapSheet.getLastRow() + 1;
    mapSheet.getRange(newRowIndex, 1, 1, 14).setValues([newRow]);
    
    // 7. Проверяем Archive (авто-назначение + цвет)
    var checkResult = checkArchiveAndFormat(ss, mapSheet, newRowIndex, objectId, dateStr);
    
    // 8. Отчёт
    var message = '✅ Объект добавлен!\n\n' +
                  'ID: ' + objectId + '\n' +
                  'Дата: ' + dateStr + '\n';
    
    if (addObjData.found) {
      message += 'Источник: AddObject\n';
      message += 'Адрес: ' + (addObjData.address || '—') + '\n';
    } else {
      message += 'Источник: Новый объект\n';
    }
    
    if (checkResult.autoAssigned) {
      message += 'Инспектор: ' + checkResult.inspector + ' (авто)\n';
    }
    
    if (checkResult.isNew) {
      message += 'Статус: 🟢 Новый объект';
    } else if (checkResult.tooSoon) {
      message += 'Статус: 🟡 Предупреждение (осматривался ' + checkResult.daysAgo + ' дн. назад)';
    } else {
      message += 'Статус: ⚪ Норма (последний раз ' + checkResult.daysAgo + ' дн. назад)';
    }
    
    ui.alert(message);
    
  } catch (e) {
    ui.alert('❌ Ошибка', e.message, ui.ButtonSet.OK);
  }
}

// =============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =============================================================================

/**
 * Запрос даты с валидацией
 */
function askForDate(ui) {
  var attempts = 0;
  var maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    var response = ui.prompt(
      '📅 Дата осмотра',
      'Введите дату в формате ДД.ММ.ГГГГ\n(например: 08.02.2026):',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response.getSelectedButton() != ui.Button.OK) {
      return null; // Отмена
    }
    
    var dateStr = response.getResponseText().trim();
    
    // Проверка формата ДД.ММ.ГГГГ
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
      var parts = dateStr.split('.');
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      var year = parseInt(parts[2], 10);
      
      // Проверка корректности даты
      var testDate = new Date(year, month - 1, day);
      if (testDate.getDate() === day && 
          testDate.getMonth() === month - 1 && 
          testDate.getFullYear() === year) {
        return dateStr;
      }
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      ui.alert(
        '❌ Неверный формат',
        'Используйте ДД.ММ.ГГГГ (например: 08.02.2026)\nОсталось попыток: ' + (maxAttempts - attempts),
        ui.ButtonSet.OK
      );
    }
  }
  
  ui.alert('❌ Превышено количество попыток', 'Попробуйте снова позже', ui.ButtonSet.OK);
  return null;
}

/**
 * Проверка существования объекта
 */
function isObjectExists(sheet, objectId, dateStr) {
  var indices = getColumnIndices(sheet);
  if (indices.ID === undefined || indices.DATE === undefined) return false;
  
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var existingId = String(data[i][indices.ID] || '').trim();
    var existingDate = formatDate(data[i][indices.DATE]);
    
    if (existingId === objectId && existingDate === dateStr) {
      return true;
    }
  }
  
  return false;
}

/**
 * Поиск в AddObject (устаревшее, используй loadAddObjectCache)
 */
function findInAddObject(ss, objectId) {
  var sheet = ss.getSheetByName(CONFIG.ADDOBJECT_SHEET_NAME);
  
  if (!sheet) {
    return { found: false };
  }
  
  var indices = getColumnIndices(sheet);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (indices.ID !== undefined && String(data[i][indices.ID]).trim() === objectId) {
      return {
        found: true,
        address: indices.ADDRESS !== undefined ? data[i][indices.ADDRESS] : '',
        latlon: indices.LATLON !== undefined ? data[i][indices.LATLON] : '',
        list: indices.LIST !== undefined ? data[i][indices.LIST] : '',
        inspector: indices.INSPECTOR !== undefined ? data[i][indices.INSPECTOR] : ''
      };
    }
  }
  
  return { found: false };
}

/**
 * Создание строки для Map
 */
function createRow(objectId, dateStr, addObjData, indices) {
  // Если индексы не переданы, используем дефолтные (0-13)
  if (!indices) {
    indices = { ID: 0, DATE: 1, ADDRESS: 2, LATLON: 3, INSPECTOR: 4, LIST: 5 };
  }
  
  var maxCol = Math.max(indices.ID || 0, indices.DATE || 0, indices.ADDRESS || 0, 
                        indices.LATLON || 0, indices.INSPECTOR || 0, indices.LIST || 0);
  var row = new Array(maxCol + 1).fill('');
  
  if (indices.ID !== undefined) row[indices.ID] = objectId;
  if (indices.DATE !== undefined) row[indices.DATE] = dateStr;
  if (indices.INSPECTOR !== undefined) row[indices.INSPECTOR] = CONFIG.DEFAULT_INSPECTOR;
  
  if (addObjData.found) {
    if (indices.ADDRESS !== undefined) row[indices.ADDRESS] = addObjData.address || '';
    if (indices.LATLON !== undefined) row[indices.LATLON] = addObjData.latlon || '';
    if (indices.LIST !== undefined) row[indices.LIST] = addObjData.list || '';
  }
  
  return row;
}

/**
 * Проверка Archive + форматирование
 */
function checkArchiveAndFormat(ss, mapSheet, rowIndex, objectId, dateStr) {
  var archiveSheet = ss.getSheetByName(CONFIG.ARCHIVE_SHEET_NAME);
  var indices = getColumnIndices(mapSheet);
  
  var result = {
    isNew: true,
    tooSoon: false,
    daysAgo: null,
    autoAssigned: false,
    inspector: CONFIG.DEFAULT_INSPECTOR
  };
  
  if (!archiveSheet) {
    // Archive не найден — помечаем как новый
    highlightRow(mapSheet, rowIndex, CONFIG.COLOR_NEW_OBJECT, indices);
    setNote(mapSheet, rowIndex, '🟢 Новый объект (Archive не найден)', indices);
    return result;
  }
  
  // Ищем в Archive
  var history = findInArchive(archiveSheet, objectId);
  
  if (history.length === 0) {
    // Новый объект
    highlightRow(mapSheet, rowIndex, CONFIG.COLOR_NEW_OBJECT, indices);
    setNote(mapSheet, rowIndex, '🟢 Новый объект (не найден в Archive)', indices);
    return result;
  }
  
  // Объект был раньше
  result.isNew = false;
  
  var lastVisit = history[0];
  var lastDate = parseDate(lastVisit.date); // в history уже переименовано
  var lastInspector = lastVisit.inspector;
  var today = parseDate(dateStr);
  
  // Считаем дни
  var diffMs = today.getTime() - lastDate.getTime();
  var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  result.daysAgo = diffDays;
  
  // Авто-назначение инспектора
  var currentInspector = indices.INSPECTOR !== undefined ? 
    mapSheet.getRange(rowIndex, indices.INSPECTOR + 1).getValue() : '';
  if (currentInspector === CONFIG.DEFAULT_INSPECTOR && lastInspector) {
    if (indices.INSPECTOR !== undefined) {
      mapSheet.getRange(rowIndex, indices.INSPECTOR + 1).setValue(lastInspector);
    }
    result.autoAssigned = true;
    result.inspector = lastInspector;
  } else {
    result.inspector = currentInspector;
  }
  
  // Определяем цвет
  var note = '';
  var bgColor = null;
  
  if (diffDays < CONFIG.MIN_DAYS_BETWEEN_VISITS) {
    // Менее 7 дней — жёлтый
    bgColor = CONFIG.COLOR_TOO_SOON;
    result.tooSoon = true;
    note = '⚠️ ВНИМАНИЕ: Объект осматривался ' + diffDays + ' дн. назад (' + 
           formatDate(lastDate) + '), инспектор: ' + lastInspector;
  } else {
    // Норма
    note = '✓ Последний осмотр: ' + diffDays + ' дн. назад (' + 
           formatDate(lastDate) + '), инспектор: ' + lastInspector;
  }
  
  highlightRow(mapSheet, rowIndex, bgColor);
  setNote(mapSheet, rowIndex, note);
  
  return result;
}

/**
 * Поиск в Archive
 */
function findInArchive(archiveSheet, objectId) {
  var indices = getColumnIndices(archiveSheet);
  var data = archiveSheet.getDataRange().getValues();
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var rowId = indices.ID !== undefined ? String(data[i][indices.ID] || '').trim() : '';
    if (rowId === String(objectId).trim()) {
      // Возвращаем объект с именованными полями вместо массива
      results.push({
        date: indices.DATE !== undefined ? data[i][indices.DATE] : '',
        inspector: indices.INSPECTOR !== undefined ? data[i][indices.INSPECTOR] : ''
      });
    }
  }
  
  // Сортируем по дате (свежие сверху)
  results.sort(function(a, b) {
    var dateA = parseDate(a.date);
    var dateB = parseDate(b.date);
    if (!dateA || !dateB) return 0;
    return dateB.getTime() - dateA.getTime();
  });
  
  return results;
}

// =============================================================================
// УТИЛИТЫ
// =============================================================================

function parseDate(dateValue) {
  if (!dateValue) return null;
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  var str = String(dateValue).trim();
  
  // DEBUG
  Logger.log('parseDate input: "' + str + '"');
  
  var parts = str.split('.');
  
  // Формат ДД.ММ.ГГГГ (русский)
  if (parts.length === 3) {
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parseInt(parts[2], 10);
    
    Logger.log('parseDate parsed: day=' + day + ', month=' + month + ', year=' + year);
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000) {
      var result = new Date(year, month, day);
      Logger.log('parseDate result: ' + result + ', getDate=' + result.getDate() + ', getMonth=' + result.getMonth() + ', getFullYear=' + result.getFullYear());
      // Проверяем что дата валидна
      if (result.getDate() === day && result.getMonth() === month && result.getFullYear() === year) {
        return result;
      }
    }
  }
  
  // Пробуем стандартный парсинг только если не DD.MM.YYYY
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    Logger.log('parseDate fallback: ' + parsed);
    return parsed;
  }
  
  Logger.log('parseDate: null');
  return null;
}

function formatDate(date) {
  if (!date) return '';
  
  // Если уже строка в формате ДД.ММ.ГГГГ — возвращаем как есть
  if (typeof date === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
    return date;
  }
  
  var d = new Date(date);
  var dd = d.getDate();
  var mm = d.getMonth() + 1;
  var yyyy = d.getFullYear();
  return (dd < 10 ? '0' + dd : dd) + '.' + 
         (mm < 10 ? '0' + mm : mm) + '.' + 
         yyyy;
}

function highlightRow(sheet, rowIndex, color, indices) {
  var idCol = indices && indices.ID !== undefined ? indices.ID + 1 : 1;
  if (color) {
    sheet.getRange(rowIndex, 1, 1, Math.max(14, idCol + 5)).setBackground(color);
  } else {
    sheet.getRange(rowIndex, 1, 1, Math.max(14, idCol + 5)).setBackground(null);
  }
}

function setNote(sheet, rowIndex, note, indices) {
  var idCol = indices && indices.ID !== undefined ? indices.ID + 1 : 1;
  sheet.getRange(rowIndex, idCol).setNote(note);
}

// =============================================================================
// АВТО-ЗАПОЛНЕНИЕ ПРИ ВВОДЕ (onEdit триггер)
// =============================================================================

/**
 * Автоматическое заполнение при редактировании
 * Настройка: Триггеры → Добавить триггер → onEdit → При редактировании
 */
function onEdit(e) {
  if (!e) {
    // Ручной запуск без события — ничего не делаем
    return;
  }
  
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var startRow = range.getRow();
    var col = range.getColumn();
    var numRows = range.getNumRows();
    
    // Проверяем: это лист Map
    if (sheet.getName() !== CONFIG.MAP_SHEET_NAME) return;
    if (startRow < 2) return; // Заголовок
    
    // Получаем динамические индексы колонок
    var indices = getColumnIndices(sheet);
    
    // Проверяем: это колонка ID
    if (col !== indices.ID + 1) return;
    
    // При пачечной вставке читаем ВСЕ значения из диапазона
    var idValues = range.getValues(); // [[val1], [val2], ...]
    
    var ss = SpreadsheetApp.getActive();
    var today = formatDate(new Date());
    
    // === ОПТИМИЗАЦИЯ: Кэшируем AddObject и Archive один раз ===
    var addObjectCache = loadAddObjectCache(ss);
    var archiveCache = loadArchiveCache(ss);
    
    // Кэшируем существующие ID в Map для проверки дублей
    var existingIds = loadExistingIdsCache(sheet, startRow, numRows);
    
    // Читаем каждую колонку ОТДЕЛЬНО (чтобы работало при любом порядке колонок)
    // Date
    var dateRange = null, dateValues = null;
    if (indices.DATE !== undefined) {
      dateRange = sheet.getRange(startRow, indices.DATE + 1, numRows, 1);
      dateValues = dateRange.getValues();
    }
    
    // Address
    var addressRange = null, addressValues = null;
    if (indices.ADDRESS !== undefined) {
      addressRange = sheet.getRange(startRow, indices.ADDRESS + 1, numRows, 1);
      addressValues = addressRange.getValues();
    }
    
    // LatLon
    var latlonRange = null, latlonValues = null;
    if (indices.LATLON !== undefined) {
      latlonRange = sheet.getRange(startRow, indices.LATLON + 1, numRows, 1);
      latlonValues = latlonRange.getValues();
    }
    
    // Inspector
    var inspectorRange = null, inspectorValues = null;
    if (indices.INSPECTOR !== undefined) {
      inspectorRange = sheet.getRange(startRow, indices.INSPECTOR + 1, numRows, 1);
      inspectorValues = inspectorRange.getValues();
    }
    
    // List
    var listRange = null, listValues = null;
    if (indices.LIST !== undefined) {
      listRange = sheet.getRange(startRow, indices.LIST + 1, numRows, 1);
      listValues = listRange.getValues();
    }
    
    // Google_link
    var googleRange = null, googleValues = null;
    if (indices.GOOGLE !== undefined) {
      googleRange = sheet.getRange(startRow, indices.GOOGLE + 1, numRows, 1);
      googleValues = googleRange.getValues();
    }
    
    // Yandex_link
    var yandexRange = null, yandexValues = null;
    if (indices.YANDEX !== undefined) {
      yandexRange = sheet.getRange(startRow, indices.YANDEX + 1, numRows, 1);
      yandexValues = yandexRange.getValues();
    }
    
    // Readiness
    var readinessRange = null, readinessValues = null;
    if (indices.READINESS !== undefined) {
      readinessRange = sheet.getRange(startRow, indices.READINESS + 1, numRows, 1);
      readinessValues = readinessRange.getValues();
    }
    
    // Массивы для batch-обновления
    var rowsToUpdate = [];
    var bgColors = [];
    var notes = [];
    var idCellColors = []; // Цвета для ячеек ID (дубли)
    var hasDateChange = false, hasAddressChange = false, hasLatLonChange = false, hasInspectorChange = false;
    var hasListChanges = false, hasGoogleChange = false, hasYandexChange = false, hasReadinessChanges = false;
    
    // Отслеживаем ID в текущей вставке (для дублей внутри пачки)
    var idsInBatch = {};
    
    // Обрабатываем каждую строку диапазона
    for (var i = 0; i < numRows; i++) {
      var objectId = String(idValues[i] && idValues[i][0] || '').trim();
      
      if (!objectId) {
        rowsToUpdate.push(null);
        bgColors.push(null);
        notes.push(null);
        idCellColors.push(null);
        continue;
      }
      
      // Проверка на дубли
      var isDuplicate = existingIds[objectId] || idsInBatch[objectId];
      if (isDuplicate) {
        idCellColors.push('#FFCDD2'); // Светло-красный для ячейки ID
      } else {
        idCellColors.push(null);
        idsInBatch[objectId] = true; // Запоминаем ID в текущей пачке
      }
      
      // Флаги изменений для каждой колонки
      var hasDateChange = false, hasAddressChange = false, hasLatLonChange = false, hasInspectorChange = false;
      
      // 1. Авто-заполнение даты (если пустая)
      if (dateValues && !dateValues[i][0]) {
        dateValues[i][0] = today;
        hasDateChange = true;
      }
      
      // 2. Поиск в AddObject (из кэша)
      var addObjData = addObjectCache[objectId];
      if (addObjData) {
        if (addressValues && !addressValues[i][0]) { 
          addressValues[i][0] = addObjData.address || ''; 
          hasAddressChange = true; 
        }
        if (latlonValues && !latlonValues[i][0]) { 
          latlonValues[i][0] = addObjData.latlon || ''; 
          hasLatLonChange = true; 
        }
        if (listValues && !listValues[i][0]) { 
          listValues[i][0] = addObjData.list || ''; 
          hasListChanges = true; 
        }
      }
      
      // 3. Копирование ссылок из AddObject
      if (googleValues && addObjData && addObjData.googleLink && !googleValues[i][0]) {
        googleValues[i][0] = addObjData.googleLink;
        hasGoogleChange = true;
      }
      
      if (yandexValues && addObjData && addObjData.yandexLink && !yandexValues[i][0]) {
        yandexValues[i][0] = addObjData.yandexLink;
        hasYandexChange = true;
      }
      
      // 4. Копирование Readiness из AddObject (если пусто)
      if (readinessValues && addObjData && addObjData.readiness !== undefined && addObjData.readiness !== '') {
        var currentReadiness = readinessValues[i][0];
        var isEmpty = (currentReadiness === '' || currentReadiness === null || currentReadiness === undefined);
        if (isEmpty) {
          readinessValues[i][0] = addObjData.readiness;
          hasReadinessChanges = true;
        }
      }
      
      // 5. Проверка Archive (из кэша) + авто-инспектор
      var dateStr = dateValues ? formatDate(dateValues[i][0]) : today;
      var archiveResult = checkArchiveFromCache(archiveCache, objectId, dateStr);
      
      if (archiveResult.inspector && archiveResult.autoAssign && inspectorValues && !inspectorValues[i][0]) {
        inspectorValues[i][0] = archiveResult.inspector;
        hasInspectorChange = true;
      }
      
      rowsToUpdate.push(i);
      bgColors.push(archiveResult.bgColor);
      notes.push(archiveResult.note);
    }
    
    // Batch-запись только если были изменения (каждая колонка отдельно)
    if (hasDateChange && dateRange) dateRange.setValues(dateValues);
    if (hasAddressChange && addressRange) addressRange.setValues(addressValues);
    if (hasLatLonChange && latlonRange) latlonRange.setValues(latlonValues);
    if (hasInspectorChange && inspectorRange) inspectorRange.setValues(inspectorValues);
    if (hasListChanges && listRange) listRange.setValues(listValues);
    if (hasGoogleChange && googleRange) googleRange.setValues(googleValues);
    if (hasYandexChange && yandexRange) yandexRange.setValues(yandexValues);
    if (hasReadinessChanges && readinessRange) readinessRange.setValues(readinessValues);
    
    // Batch-установка цветов и примечаний
    for (var j = 0; j < rowsToUpdate.length; j++) {
      if (rowsToUpdate[j] === null) continue;
      
      var r = startRow + rowsToUpdate[j];
      
      // Цвет фона строки (Archive)
      if (bgColors[j]) {
        sheet.getRange(r, 1, 1, 14).setBackground(bgColors[j]);
      }
      
      // Цвет ячейки ID (дубль)
      if (idCellColors[j] && indices.ID !== undefined) {
        sheet.getRange(r, indices.ID + 1).setBackground(idCellColors[j]);
      }
      
      if (notes[j] && indices.ID !== undefined) {
        sheet.getRange(r, indices.ID + 1).setNote(notes[j]);
      }
    }
    
  } catch (err) {
    Logger.log('Ошибка в onEdit: ' + err.message);
  }
}

/**
 * Загрузка AddObject в кэш (объект для O(1) поиска)
 */
function loadAddObjectCache(ss) {
  var cache = {};
  var sheet = ss.getSheetByName(CONFIG.ADDOBJECT_SHEET_NAME);
  if (!sheet) return cache;
  
  var indices = getColumnIndices(sheet);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var id = indices.ID !== undefined ? String(data[i][indices.ID] || '').trim() : '';
    if (id) {
      cache[id] = {
        address: indices.ADDRESS !== undefined ? data[i][indices.ADDRESS] : '',
        latlon: indices.LATLON !== undefined ? data[i][indices.LATLON] : '',
        list: indices.LIST !== undefined ? data[i][indices.LIST] : '',
        inspector: indices.INSPECTOR !== undefined ? data[i][indices.INSPECTOR] : '',
        googleLink: indices.GOOGLE !== undefined ? data[i][indices.GOOGLE] : '',
        yandexLink: indices.YANDEX !== undefined ? data[i][indices.YANDEX] : '',
        readiness: indices.READINESS !== undefined ? data[i][indices.READINESS] : ''
      };
    }
  }
  return cache;
}

/**
 * Загрузка существующих ID из Map (для проверки дублей)
 * Исключаем текущий диапазон (startRow..endRow)
 */
function loadExistingIdsCache(sheet, excludeStartRow, excludeNumRows) {
  var cache = {};
  var indices = getColumnIndices(sheet);
  if (indices.ID === undefined) return cache;
  
  var data = sheet.getDataRange().getValues();
  var excludeEndRow = excludeStartRow + excludeNumRows - 1;
  
  for (var i = 1; i < data.length; i++) {
    var rowNum = i + 1; // 1-based row number
    // Пропускаем текущий диапазон (только что вставленные)
    if (rowNum >= excludeStartRow && rowNum <= excludeEndRow) {
      continue;
    }
    var id = String(data[i][indices.ID] || '').trim();
    if (id) {
      cache[id] = true;
    }
  }
  return cache;
}

/**
 * Загрузка Archive в кэш (группировка по ID)
 */
function loadArchiveCache(ss) {
  var cache = {};
  var sheet = ss.getSheetByName(CONFIG.ARCHIVE_SHEET_NAME);
  if (!sheet) return cache;
  
  var indices = getColumnIndices(sheet);
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var id = indices.ID !== undefined ? String(data[i][indices.ID] || '').trim() : '';
    if (!id) continue;
    
    if (!cache[id]) {
      cache[id] = [];
    }
    
    cache[id].push({
      date: indices.DATE !== undefined ? data[i][indices.DATE] : '',
      inspector: indices.INSPECTOR !== undefined ? data[i][indices.INSPECTOR] : ''
    });
  }
  
  // Сортируем каждый массив по дате (свежие сверху)
  for (var id in cache) {
    cache[id].sort(function(a, b) {
      var dateA = parseDate(a.date);
      var dateB = parseDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  return cache;
}

/**
 * Проверка Archive из кэша
 */
function checkArchiveFromCache(cache, objectId, dateStr) {
  var result = {
    bgColor: null,
    note: null,
    inspector: null,
    autoAssign: false
  };
  
  var history = cache[objectId];
  
  if (!history || history.length === 0) {
    result.bgColor = CONFIG.COLOR_NEW_OBJECT;
    result.note = '🟢 Новый объект (не найден в Archive)';
    return result;
  }
  
  var lastVisit = history[0];
  var lastDate = parseDate(lastVisit.date);
  var lastInspector = lastVisit.inspector;
  var today = parseDate(dateStr);
  
  var diffMs = today.getTime() - lastDate.getTime();
  var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (lastInspector) {
    result.inspector = lastInspector;
    result.autoAssign = true;
  }
  
  if (diffDays < CONFIG.MIN_DAYS_BETWEEN_VISITS) {
    result.bgColor = CONFIG.COLOR_TOO_SOON;
    result.note = '⚠️ ВНИМАНИЕ: Объект осматривался ' + diffDays + ' дн. назад (' + 
                  formatDate(lastDate) + '), инспектор: ' + lastInspector;
  } else {
    result.note = '✓ Последний осмотр: ' + diffDays + ' дн. назад (' + 
                  formatDate(lastDate) + '), инспектор: ' + lastInspector;
  }
  
  return result;
}

/**
 * Проверка Archive для batch-режима (возвращает данные, не изменяет ячейки)
 */
function checkArchiveForBatch(ss, objectId, dateStr) {
  var archiveSheet = ss.getSheetByName(CONFIG.ARCHIVE_SHEET_NAME);
  
  var result = {
    bgColor: null,
    note: null,
    inspector: null,
    autoAssign: false
  };
  
  if (!archiveSheet) {
    result.bgColor = CONFIG.COLOR_NEW_OBJECT;
    result.note = '🟢 Новый объект (Archive не найден)';
    return result;
  }
  
  // Ищем в Archive
  var history = findInArchive(archiveSheet, objectId);
  
  if (history.length === 0) {
    result.bgColor = CONFIG.COLOR_NEW_OBJECT;
    result.note = '🟢 Новый объект (не найден в Archive)';
    return result;
  }
  
  var lastVisit = history[0];
  var lastDate = parseDate(lastVisit.date);
  var lastInspector = lastVisit.inspector;
  var today = parseDate(dateStr);
  
  // Считаем дни
  var diffMs = today.getTime() - lastDate.getTime();
  var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Авто-назначение инспектора
  if (lastInspector) {
    result.inspector = lastInspector;
    result.autoAssign = true;
  }
  
  // Определяем цвет и примечание
  if (diffDays < CONFIG.MIN_DAYS_BETWEEN_VISITS) {
    result.bgColor = CONFIG.COLOR_TOO_SOON;
    result.note = '⚠️ ВНИМАНИЕ: Объект осматривался ' + diffDays + ' дн. назад (' + 
                  formatDate(lastDate) + '), инспектор: ' + lastInspector;
  } else {
    result.note = '✓ Последний осмотр: ' + diffDays + ' дн. назад (' + 
                  formatDate(lastDate) + '), инспектор: ' + lastInspector;
  }
  
  return result;
}

// =============================================================================
// ПАЧЕЧНАЯ ОБРАБОТКА (для вставки диапазона)
// =============================================================================

/**
 * Обработать выделенные строки
 * Вызывается из меню после вставки пачки ID
 */
function processSelectedRows() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getActiveSheet();
  
  if (sheet.getName() !== CONFIG.MAP_SHEET_NAME) {
    ui.alert('❌ Выберите лист Map');
    return;
  }
  
  var selection = sheet.getActiveRange();
  var startRow = selection.getRow();
  var endRow = selection.getLastRow();
  
  if (startRow < 2) startRow = 2; // Пропускаем заголовок
  
  var indices = getColumnIndices(sheet);
  var processed = 0;
  var errors = [];
  
  for (var i = startRow; i <= endRow; i++) {
    try {
      var id = indices.ID !== undefined ? String(sheet.getRange(i, indices.ID + 1).getValue()).trim() : '';
      if (!id) continue;
      
      // Проверяем/заполняем дату
      var dateCell = indices.DATE !== undefined ? sheet.getRange(i, indices.DATE + 1) : null;
      if (dateCell && !dateCell.getValue()) {
        dateCell.setValue(formatDate(new Date()));
      }
      
      // Ищем в AddObject
      var addObjData = findInAddObject(ss, id);
      if (addObjData.found) {
        if (indices.ADDRESS !== undefined && !sheet.getRange(i, indices.ADDRESS + 1).getValue()) {
          sheet.getRange(i, indices.ADDRESS + 1).setValue(addObjData.address || '');
        }
        if (indices.LATLON !== undefined && !sheet.getRange(i, indices.LATLON + 1).getValue()) {
          sheet.getRange(i, indices.LATLON + 1).setValue(addObjData.latlon || '');
        }
        if (indices.LIST !== undefined && !sheet.getRange(i, indices.LIST + 1).getValue()) {
          sheet.getRange(i, indices.LIST + 1).setValue(addObjData.list || '');
        }
      }
      
      // Проверка Archive
      var dateStr = dateCell ? formatDate(dateCell.getValue()) : formatDate(new Date());
      checkArchiveAndFormat(ss, sheet, i, id, dateStr);
      
      processed++;
      
    } catch (e) {
      errors.push('Строка ' + i + ': ' + e.message);
    }
  }
  
  var msg = '✅ Обработано: ' + processed + ' строк';
  if (errors.length > 0) {
    msg += '\n\n❌ Ошибок: ' + errors.length + '\n' + errors.slice(0, 3).join('\n');
  }
  
  ui.alert(msg);
}

// =============================================================================
// МЕНЮ
// =============================================================================

/**
 * Тест parseDate
 */
function testParseDate() {
  var testDates = ['05.02.2026', '09.02.2026', '5.02.2026', '05.02.2026 12:00'];
  
  for (var i = 0; i < testDates.length; i++) {
    Logger.log('=== Тест: ' + testDates[i] + ' ===');
    var result = parseDate(testDates[i]);
    Logger.log('Результат: ' + result);
    if (result) {
      Logger.log('День: ' + result.getDate() + ', Месяц: ' + (result.getMonth() + 1) + ', Год: ' + result.getFullYear());
    }
  }
  
  // Тест diff
  var d1 = parseDate('05.02.2026');
  var d2 = parseDate('09.02.2026');
  if (d1 && d2) {
    var diff = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    Logger.log('Разница между 05.02.2026 и 09.02.2026: ' + diff + ' дней');
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔧 Костыль')
    .addItem('➕ Добавить объект (с выбором даты)', 'addObjectKostyl')
    .addItem('🔄 Обработать выделенные строки', 'processSelectedRows')
    .addItem('✅ Проверить все объекты', 'checkAllObjects')
    .addToUi();
}

// =============================================================================
// БЫСТРАЯ ПРОВЕРКА ВСЕХ ОБЪЕКТОВ (для существующих)
// =============================================================================

function checkAllObjects() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActive();
  var mapSheet = ss.getSheetByName(CONFIG.MAP_SHEET_NAME);
  
  if (!mapSheet) {
    ui.alert('❌ Лист Map не найден!');
    return;
  }
  
  var lastRow = mapSheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('Нет данных для проверки');
    return;
  }
  
  var indices = getColumnIndices(mapSheet);
  var processed = 0;
  var autoAssigned = 0;
  var warnings = 0;
  
  for (var i = 2; i <= lastRow; i++) {
    try {
      var id = indices.ID !== undefined ? String(mapSheet.getRange(i, indices.ID + 1).getValue()).trim() : '';
      var date = indices.DATE !== undefined ? formatDate(mapSheet.getRange(i, indices.DATE + 1).getValue()) : '';
      
      if (id && date) {
        var result = checkArchiveAndFormat(ss, mapSheet, i, id, date);
        processed++;
        
        if (result.autoAssigned) autoAssigned++;
        if (result.tooSoon) warnings++;
      }
    } catch (e) {
      Logger.log('Ошибка в строке ' + i + ': ' + e.message);
    }
  }
  
  ui.alert(
    '✅ Проверка завершена',
    'Обработано: ' + processed + '\n' +
    'Авто-назначено: ' + autoAssigned + '\n' +
    'Предупреждений: ' + warnings,
    ui.ButtonSet.OK
  );
}

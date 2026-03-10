/**
 * M-PRO Google Apps Script
 * Единая загрузка данных
 */

const SPREADSHEET_ID = '1BEd6qWf8Y2wx1zKh_ysTLcpigPId5HWF52yINkHX_8E';
const WORKDAY_SHEET_NAME = 'WorkDay';
const INSPECTORS_MESSAGE_SHEET_NAME = 'InspectorsMessage';
const WORKDAY_HEADERS = Object.freeze([
  'date',
  'inspector',
  'time_open',
  'open_coordinats',
  'coordinates_first_object',
  'coordinate_correspondence_open',
  'open_comment',
  'time_close',
  'close_coordinats',
  'coordinates_last_object',
  'coordinate_correspondence_close',
  'close_comment'
]);
const WORKDAY_NO_GEO_MARKER = 'ГЕОЛОКАЦИЯ НЕДОСТУПНА: запросить селфи';
const WORKDAY_COORD_MATCH_DISTANCE_M = 1000;
const WORKDAY_COORD_MATCH_YES = '✅';
const WORKDAY_COORD_MATCH_NO = '❌';
const SELFIE_REQUEST_MESSAGE = 'Требуется прислать селфи Администратору';
const WORKDAY_COORD_MATCH_NO_OPEN = WORKDAY_COORD_MATCH_NO + ' ' + SELFIE_REQUEST_MESSAGE;
const GLOBAL_MESSAGE_TARGET = 'all';
const AUTH_NONCE_CACHE_PREFIX = 'auth_nonce:';
const AUTH_NONCE_TTL_SEC = 120;
const SESSION_TOKEN_TTL_SEC = 12 * 60 * 60;
const SESSION_TOKEN_TTL_REMEMBER_SEC = 30 * 24 * 60 * 60;
const SESSION_SECRET_PROP = 'SESSION_HMAC_SECRET';
const YANDEX_TOKEN_PROP = 'YANDEX_OAUTH_TOKEN';
const YANDEX_TOKEN_PROP_LEGACY = 'YANDEX_TOKEN';
const ACTIONS_WITHOUT_SESSION = Object.freeze({
  auth: true,
  authNonce: true
});

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
  ENTRY: 'Entry',
  COORDINATE_CORRESPONDENCE: 'Coordinate_correspondence',
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
  DMS: OBJECT_HEADERS,
  METRO: OBJECT_HEADERS
};

const MAP_POINT_SOURCES = Object.freeze([
  Object.freeze({ name: 'Map', source: 'Map', divisionNorm: 'map' }),
  Object.freeze({ name: 'Laboratory', source: 'Laboratory', divisionNorm: 'laboratory' }),
  Object.freeze({ name: 'ConstructionControl', source: 'ConstructionControl', divisionNorm: 'constructioncontrol' }),
  Object.freeze({ name: 'DMS', source: 'DMS', divisionNorm: 'dms' }),
  Object.freeze({ name: 'Metro', source: 'Metro', divisionNorm: 'metro' })
]);

/**
 * Получить заголовки для указанного листа
 * @param {string} source - Sheet name (Map, Laboratory, ConstructionControl, DMS, Metro)
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
    case 'METRO':
      return HEADERS.METRO;
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

function normalizeText_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u0451\u0401]/g, '\u0435')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDivisionAlias_(valueRaw) {
  const value = normalizeText_(valueRaw);
  if (!value) return '';

  const compact = value.replace(/[^a-z\u0430-\u044f0-9]+/g, ' ').trim();
  if (!compact) return '';

  const tokens = compact.split(/\s+/).filter(Boolean);
  const hasToken = token => tokens.indexOf(token) !== -1;
  const hasTokenPrefix = prefix => tokens.some(token => token.indexOf(prefix) === 0);
  const hasFragment = fragment => compact.indexOf(fragment) !== -1;

  if (
    hasToken('map') || hasTokenPrefix('map') ||
    hasToken('\u0433\u0441') || hasTokenPrefix('\u0433\u0441') ||
    hasFragment('\u0433\u0440\u0430\u0436\u0434') ||
    hasFragment('\u0433\u0435\u043d\u0441\u0442\u0440')
  ) return 'map';

  if (
    hasToken('dms') || hasTokenPrefix('dms') ||
    hasToken('\u0434\u043c\u0441') || hasTokenPrefix('\u0434\u043c\u0441')
  ) return 'dms';

  if (
    hasToken('laboratory') || hasTokenPrefix('laboratory') ||
    hasToken('lab') || hasTokenPrefix('lab') ||
    hasFragment('\u043b\u0430\u0431\u043e\u0440')
  ) return 'laboratory';

  if (
    hasToken('metro') || hasTokenPrefix('metro') ||
    hasFragment('\u043c\u0435\u0442\u0440')
  ) return 'metro';

  if (
    hasToken('constructioncontrol') || hasTokenPrefix('constructioncontrol') ||
    (hasToken('construction') && hasToken('control')) ||
    hasToken('cc') || hasTokenPrefix('cc') ||
    hasToken('\u0441\u043a') || hasTokenPrefix('\u0441\u043a') ||
    hasFragment('\u0441\u0442\u0440\u043e\u0439\u043a\u043e\u043d\u0442\u0440')
  ) return 'constructioncontrol';

  return compact;
}

function getSourceDivisionNorm_(sourceRaw) {
  const source = normalizeText_(sourceRaw);
  if (!source) return '';
  if (source === 'map') return 'map';
  if (source === 'dms') return 'dms';
  if (source === 'laboratory') return 'laboratory';
  if (source === 'metro') return 'metro';
  if (source === 'constructioncontrol') return 'constructioncontrol';
  return '';
}

function addDivisionNormIfPresent_(collector, seen, valueRaw) {
  const normalized = normalizeDivisionAlias_(valueRaw);
  const canonical = getSourceDivisionNorm_(normalized);
  const value = canonical || normalized;
  if (!value || seen[value]) return;
  seen[value] = true;
  collector.push(value);
}

function getDivisionNormsFromRaw_(divisionRaw) {
  const rawDivision = String(divisionRaw || '').replace(/\u00A0/g, ' ').trim();
  if (!rawDivision) return [];

  const parts = rawDivision
    .split(/(?:\r?\n|[;,|/])+/)
    .map(item => String(item || '').trim())
    .filter(Boolean);
  const sourceParts = parts.length ? parts : [rawDivision];
  const result = [];
  const seen = {};

  for (let i = 0; i < sourceParts.length; i += 1) {
    const part = sourceParts[i];
    addDivisionNormIfPresent_(result, seen, part);

    // Поддержка краткой записи вида "Map DMS"
    const tokens = normalizeText_(part).split(/\s+/).filter(Boolean);
    for (let j = 0; j < tokens.length; j += 1) {
      addDivisionNormIfPresent_(result, seen, tokens[j]);
    }
  }

  return result.filter(norm => !!getSourceDivisionNorm_(norm));
}

function getAdminAllowedDivisionNorms_(requestUser) {
  const user = (requestUser && typeof requestUser === 'object') ? requestUser : {};
  if (!user.isAdmin) return [];
  return getDivisionNormsFromRaw_(user.division);
}

function getInspectorAllowedDivisionNormsFast_(ss, requestUser) {
  const user = (requestUser && typeof requestUser === 'object') ? requestUser : {};
  if (!user.isInspector) return [];

  const result = [];
  const seen = {};
  const directNorms = getDivisionNormsFromRaw_(user.division);
  for (let i = 0; i < directNorms.length; i += 1) {
    addDivisionNormIfPresent_(result, seen, directNorms[i]);
  }

  if (result.length === 0) {
    const fallbackDivision = getInspectorDivisionByName_(
      ss,
      user.nameNorm || user.name || ''
    );
    addDivisionNormIfPresent_(result, seen, fallbackDivision);
  }

  return result.filter(norm => !!getSourceDivisionNorm_(norm));
}

function getMaxDefinedColumnIndex_(indices) {
  const source = (indices && typeof indices === 'object') ? indices : {};
  const keys = Object.keys(source);
  let maxIndex = -1;
  for (let i = 0; i < keys.length; i += 1) {
    const idx = Number(source[keys[i]]);
    if (!Number.isFinite(idx) || idx < 0) continue;
    if (idx > maxIndex) maxIndex = idx;
  }
  return maxIndex;
}

function splitInspectorNames_(value) {
  const raw = String(value || '')
    .replace(/\u00A0/g, ' ')
    .trim();
  if (!raw) return [];

  const parts = raw
    .split(/(?:\r?\n|[;,|/+&])+|\s+\u0438\s+/i)
    .map(item => String(item || '').replace(/\u00A0/g, ' ').trim())
    .filter(Boolean);

  const result = [];
  const seen = {};
  for (let i = 0; i < parts.length; i += 1) {
    const name = parts[i];
    const norm = normalizeText_(name);
    if (!norm || seen[norm]) continue;
    seen[norm] = true;
    result.push(name);
  }
  return result;
}

function inspectorCellContainsInspector_(inspectorCellRaw, inspectorNameNorm) {
  const target = normalizeText_(inspectorNameNorm);
  if (!target) return false;

  const names = splitInspectorNames_(inspectorCellRaw);
  if (!names.length) return normalizeText_(inspectorCellRaw) === target;

  for (let i = 0; i < names.length; i += 1) {
    if (normalizeText_(names[i]) === target) return true;
  }
  return false;
}

function normalizeInspectorCustomStatus_(statusRaw) {
  const statusNorm = normalizeText_(statusRaw);
  if (!statusNorm) return 'active';
  if (statusNorm === 'active' || statusNorm.indexOf('\u0430\u043a\u0442\u0438\u0432') !== -1) return 'active';
  return 'absent';
}
function normalizeRole_(roleRaw) {
  const role = normalizeText_(roleRaw);
  if (!role) return '';
  if (role.indexOf('admin') !== -1 || role.indexOf('\u0430\u0434\u043c\u0438\u043d') !== -1) return 'admin';
  if (role.indexOf('inspector') !== -1 || role.indexOf('\u0438\u043d\u0441\u043f\u0435\u043a\u0442') !== -1) return 'inspector';
  return role;
}

function bytesToHex_(bytes) {
  return (bytes || []).map(b => {
    const value = (b + 256) % 256;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function sha256Hex_(text) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(text || ''),
    Utilities.Charset.UTF_8
  );
  return bytesToHex_(digest);
}

function base64WebSafeNoPad_(bytesOrText) {
  const encoded = (bytesOrText instanceof Array)
    ? Utilities.base64EncodeWebSafe(bytesOrText)
    : Utilities.base64EncodeWebSafe(String(bytesOrText || ''), Utilities.Charset.UTF_8);
  return String(encoded || '').replace(/=+$/g, '');
}

function base64WebSafeDecodeNoPadToText_(value) {
  const raw = String(value || '');
  if (!raw) return '';
  const padding = (4 - (raw.length % 4)) % 4;
  const padded = raw + '='.repeat(padding);
  const bytes = Utilities.base64DecodeWebSafe(padded);
  return Utilities.newBlob(bytes).getDataAsString('UTF-8');
}

function getSessionSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = String(props.getProperty(SESSION_SECRET_PROP) || '').trim();
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(SESSION_SECRET_PROP, secret);
  }
  return secret;
}

function createAuthNonce_() {
  const nonceId = Utilities.getUuid().replace(/-/g, '');
  const nonce = Utilities.getUuid().replace(/-/g, '') + String(Date.now());
  CacheService.getScriptCache().put(AUTH_NONCE_CACHE_PREFIX + nonceId, nonce, AUTH_NONCE_TTL_SEC);
  return { nonceId: nonceId, nonce: nonce, ttlSec: AUTH_NONCE_TTL_SEC };
}

function consumeAuthNonce_(nonceIdRaw) {
  const nonceId = String(nonceIdRaw || '').trim();
  if (!nonceId) return '';
  const cache = CacheService.getScriptCache();
  const key = AUTH_NONCE_CACHE_PREFIX + nonceId;
  const nonce = String(cache.get(key) || '');
  if (!nonce) return '';
  cache.remove(key);
  return nonce;
}

function issueSessionToken_(user, ttlSecOverride) {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = Number(ttlSecOverride);
  const effectiveTtlSec = Number.isFinite(ttlSec) && ttlSec > 0 ? ttlSec : SESSION_TOKEN_TTL_SEC;
  const expSec = nowSec + effectiveTtlSec;
  const payload = {
    v: 1,
    iat: nowSec,
    exp: expSec,
    user: {
      name: String(user && user.name || '').trim(),
      role: String(user && user.role || '').trim(),
      division: String(user && user.division || '').trim()
    }
  };
  const payloadPart = base64WebSafeNoPad_(JSON.stringify(payload));
  const signatureBytes = Utilities.computeHmacSha256Signature(
    payloadPart,
    getSessionSecret_(),
    Utilities.Charset.UTF_8
  );
  const signaturePart = base64WebSafeNoPad_(signatureBytes);
  return {
    token: `${payloadPart}.${signaturePart}`,
    expiresAt: new Date(expSec * 1000).toISOString()
  };
}

function verifySessionToken_(tokenRaw) {
  const token = String(tokenRaw || '').trim();
  if (!token) return { success: false, error: 'missing_token' };

  const parts = token.split('.');
  if (parts.length !== 2) return { success: false, error: 'invalid_token_format' };
  const payloadPart = parts[0];
  const signaturePart = parts[1];
  if (!payloadPart || !signaturePart) return { success: false, error: 'invalid_token_parts' };

  const expectedSignature = base64WebSafeNoPad_(
    Utilities.computeHmacSha256Signature(
      payloadPart,
      getSessionSecret_(),
      Utilities.Charset.UTF_8
    )
  );
  if (expectedSignature !== signaturePart) {
    return { success: false, error: 'invalid_token_signature' };
  }

  let payload;
  try {
    payload = JSON.parse(base64WebSafeDecodeNoPadToText_(payloadPart));
  } catch (error) {
    return { success: false, error: 'invalid_token_payload' };
  }

  const exp = Number(payload && payload.exp || 0);
  if (!exp || Math.floor(Date.now() / 1000) >= exp) {
    return { success: false, error: 'token_expired' };
  }

  const user = payload && payload.user;
  if (!user || !user.name || !user.role) {
    return { success: false, error: 'invalid_token_user' };
  }

  return {
    success: true,
    user: {
      name: String(user.name || '').trim(),
      role: String(user.role || '').trim(),
      division: String(user.division || '').trim()
    },
    expiresAt: new Date(exp * 1000).toISOString()
  };
}

function getRequestUserContext_(p) {
  const params = p || {};
  const sessionUser = (params.__sessionUser && typeof params.__sessionUser === 'object')
    ? params.__sessionUser
    : null;
  if (sessionUser) {
    const name = String(sessionUser.name || '').trim();
    const role = normalizeRole_(sessionUser.role || '');
    const nameNorm = normalizeText_(name);
    return {
      name: name,
      nameNorm: nameNorm,
      role: role,
      isInspector: role === 'inspector',
      isAdmin: role === 'admin',
      division: String(sessionUser.division || '').trim(),
      fromToken: true
    };
  }

  const tokenCandidate = String(params.sessionToken || params.token || '').trim();
  if (tokenCandidate) {
    const verified = verifySessionToken_(tokenCandidate);
    if (verified.success && verified.user) {
      const name = String(verified.user.name || '').trim();
      const role = normalizeRole_(verified.user.role || '');
      const nameNorm = normalizeText_(name);
      return {
        name: name,
        nameNorm: nameNorm,
        role: role,
        isInspector: role === 'inspector',
        isAdmin: role === 'admin',
        division: String(verified.user.division || '').trim(),
        fromToken: true
      };
    }
  }

  const name = String(params.userName || params.inspectorName || params.user || '').trim();
  const role = normalizeRole_(params.userRole || params.role || '');
  const nameNorm = normalizeText_(name);
  return {
    name: name,
    nameNorm: nameNorm,
    role: role,
    isInspector: role === 'inspector',
    isAdmin: role === 'admin',
    division: String(params.division || '').trim(),
    fromToken: false
  };
}

function filterPointsByInspector_(points, inspectorNameNorm) {
  if (!inspectorNameNorm) return [];
  const source = Array.isArray(points) ? points : [];
  return source.filter(point => inspectorCellContainsInspector_(point && point.inspector, inspectorNameNorm));
}

function filterInspectorsListByInspector_(inspectors, inspectorNameNorm) {
  if (!inspectorNameNorm) return [];
  const source = Array.isArray(inspectors) ? inspectors : [];
  return source.filter(insp => normalizeText_(insp && insp.name) === inspectorNameNorm);
}

function filterHomesByInspector_(homes, inspectorNameNorm) {
  if (!inspectorNameNorm || !homes || typeof homes !== 'object') return {};
  const result = {};
  Object.keys(homes).forEach(name => {
    if (normalizeText_(name) === inspectorNameNorm) {
      result[name] = homes[name];
    }
  });
  return result;
}

function filterInspectorsConfigByInspector_(config, inspectorNameNorm) {
  if (!inspectorNameNorm || !config || typeof config !== 'object') return {};
  const result = {};
  Object.keys(config).forEach(name => {
    if (normalizeText_(name) === inspectorNameNorm) {
      result[name] = config[name];
    }
  });
  return result;
}

function filterInspectorsWorkDayByInspector_(statusMap, inspectorNameNorm) {
  if (!inspectorNameNorm || !statusMap || typeof statusMap !== 'object') return {};
  const result = {};
  if (Object.prototype.hasOwnProperty.call(statusMap, inspectorNameNorm)) {
    result[inspectorNameNorm] = statusMap[inspectorNameNorm];
  }
  return result;
}

function collectInspectorNameNormSetFromPoints_(points) {
  const source = Array.isArray(points) ? points : [];
  const set = {};

  for (let i = 0; i < source.length; i += 1) {
    const point = source[i] || {};
    const names = splitInspectorNames_(point.inspector);
    const fallback = String(point.inspector || '').trim();
    const normalizedFallback = normalizeText_(fallback);

    if (names.length) {
      for (let j = 0; j < names.length; j += 1) {
        const nameNorm = normalizeText_(names[j]);
        if (nameNorm) set[nameNorm] = true;
      }
      continue;
    }

    if (normalizedFallback) {
      set[normalizedFallback] = true;
    }
  }

  return set;
}

function filterInspectorsListByInspectorNormSet_(inspectors, inspectorNormSet) {
  const source = Array.isArray(inspectors) ? inspectors : [];
  if (!inspectorNormSet || typeof inspectorNormSet !== 'object') return [];
  return source.filter(item => {
    const nameNorm = normalizeText_(item && item.name);
    return !!(nameNorm && inspectorNormSet[nameNorm]);
  });
}

function filterHomesByInspectorNormSet_(homes, inspectorNormSet) {
  if (!homes || typeof homes !== 'object' || !inspectorNormSet || typeof inspectorNormSet !== 'object') {
    return {};
  }
  const result = {};
  Object.keys(homes).forEach(name => {
    const nameNorm = normalizeText_(name);
    if (nameNorm && inspectorNormSet[nameNorm]) {
      result[name] = homes[name];
    }
  });
  return result;
}

function filterInspectorsConfigByInspectorNormSet_(config, inspectorNormSet) {
  if (!config || typeof config !== 'object' || !inspectorNormSet || typeof inspectorNormSet !== 'object') {
    return {};
  }
  const result = {};
  Object.keys(config).forEach(name => {
    const nameNorm = normalizeText_(name);
    if (nameNorm && inspectorNormSet[nameNorm]) {
      result[name] = config[name];
    }
  });
  return result;
}

function filterInspectorsWorkDayByInspectorNormSet_(statusMap, inspectorNormSet) {
  if (!statusMap || typeof statusMap !== 'object' || !inspectorNormSet || typeof inspectorNormSet !== 'object') {
    return {};
  }
  const result = {};
  Object.keys(statusMap).forEach(nameNorm => {
    const normalized = normalizeText_(nameNorm);
    if (normalized && inspectorNormSet[normalized]) {
      result[nameNorm] = statusMap[nameNorm];
    }
  });
  return result;
}

function filterInspectorsListByDivisionNorms_(inspectors, divisionNorms) {
  const source = Array.isArray(inspectors) ? inspectors : [];
  const allowedNorms = Array.isArray(divisionNorms) ? divisionNorms.filter(Boolean) : [];
  if (allowedNorms.length === 0) return source.slice();

  return source.filter(item => {
    const divisionNorm = getSourceDivisionNorm_(normalizeDivisionAlias_(item && item.division));
    return !!(divisionNorm && allowedNorms.indexOf(divisionNorm) !== -1);
  });
}

function collectInspectorNormSetFromInspectorsList_(inspectors) {
  const source = Array.isArray(inspectors) ? inspectors : [];
  const result = {};

  for (let i = 0; i < source.length; i += 1) {
    const item = source[i] || {};
    const nameNorm = normalizeText_(item.name);
    if (nameNorm) result[nameNorm] = true;
  }

  return result;
}

function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  const action = String(p.action || '');
  const callback = p.callback;
  
  try {
    if (!ACTIONS_WITHOUT_SESSION[action]) {
      const tokenCheck = verifySessionToken_(p.sessionToken || p.token);
      if (!tokenCheck.success) {
        return jsonp_(callback, { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }
      p.__sessionUser = tokenCheck.user;
    }

    let result;
    
    switch(action) {
      case 'authNonce':
        result = { success: true, ...createAuthNonce_() };
        break;
      case 'getData':
        result = getData_(p);
        break;
      case 'getMapPoints':
        result = getMapPoints_(p);
        break;
      case 'checkWorkDay':
        result = checkWorkDay_(p);
        break;
      case 'startWorkDay':
        result = startWorkDay_(p);
        break;
      case 'endWorkDay':
        result = endWorkDay_(p);
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
      case 'yandexCreateFolder':
        result = yandexCreateFolder_(p);
        break;
      case 'yandexCheckFolder':
        result = yandexCheckFolder_(p);
        break;
      case 'archiveCompleted':
        result = archiveCompletedObjects_(p);
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
function getData_(p) {
  const requestUser = getRequestUserContext_(p);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Загрузить дома инспекторов (из листа InspectorsHomes)
  let homes = getInspectorsHomes_(ss);
  
  // Загрузить конфигурацию инспекторов (из листа CustomInspectors)
  let config = getInspectorsConfig_(ss);
  
  // Загрузить точки объектов (из трёх листов)
  const mapPoints = getMapPoints_(p, ss);
  
  // Загрузить список инспекторов с подразделениями
  let inspectorsList = getInspectorsList_(ss);
  let points = mapPoints.points || [];
  const requestedDateToken = String((p && (p.dateToken || p.clientDate || p.today)) || '').trim();
  let inspectorsWorkDay = getInspectorsWorkDayStatusByInspectorForDate_(ss, requestedDateToken || new Date());
  const inspectorMessages = requestUser.isInspector
    ? getInspectorMessagesForUser_(ss, requestUser)
    : { individual: [], group: [] };

  if (requestUser.isInspector) {
    inspectorsList = filterInspectorsListByInspector_(inspectorsList, requestUser.nameNorm);
    homes = filterHomesByInspector_(homes, requestUser.nameNorm);
    config = filterInspectorsConfigByInspector_(config, requestUser.nameNorm);
    inspectorsWorkDay = filterInspectorsWorkDayByInspector_(inspectorsWorkDay, requestUser.nameNorm);
  } else if (requestUser.isAdmin) {
    const adminDivisionNorms = getAdminAllowedDivisionNorms_(requestUser);
    if (adminDivisionNorms.length > 0) {
      inspectorsList = filterInspectorsListByDivisionNorms_(inspectorsList, adminDivisionNorms);
      const inspectorNormSet = collectInspectorNormSetFromInspectorsList_(inspectorsList);
      inspectorsList = filterInspectorsListByInspectorNormSet_(inspectorsList, inspectorNormSet);
      homes = filterHomesByInspectorNormSet_(homes, inspectorNormSet);
      config = filterInspectorsConfigByInspectorNormSet_(config, inspectorNormSet);
      inspectorsWorkDay = filterInspectorsWorkDayByInspectorNormSet_(inspectorsWorkDay, inspectorNormSet);
    }
  }
  
  return {
    success: true,
    inspectorsHomes: homes,
    inspectorsConfig: config,
    inspectorsList: inspectorsList,
    points: points,
    inspectorsWorkDay: inspectorsWorkDay,
    inspectorMessages: inspectorMessages,
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
        status: normalizeInspectorCustomStatus_(indices.STATUS !== undefined ? row[indices.STATUS] : 'active')
      };
    }
  }
  
  return config;
}

function getInspectorsWorkDayStatusByInspectorForDate_(ss, dateValue) {
  const result = {};
  const sheet = ss.getSheetByName(WORKDAY_SHEET_NAME);
  if (!sheet) return result;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return result;

  const timeZone = Session.getScriptTimeZone() || 'Etc/GMT';
  const targetDateToken = formatDateToken_(dateValue, timeZone) || Utilities.formatDate(new Date(), timeZone, 'dd.MM.yyyy');
  const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowDateToken = formatDateToken_(row[0], timeZone);
    if (rowDateToken !== targetDateToken) continue;

    const inspectorRaw = String(row[1] || '').trim();
    const inspectorNorm = normalizeText_(inspectorRaw);
    if (!inspectorNorm) continue;

    const openTime = String(row[2] || '').trim();
    const closeTime = String(row[7] || '').trim();
    const rowOpen = !!openTime && !closeTime;

    const prev = result[inspectorNorm];
    if (!prev) {
      result[inspectorNorm] = {
        inspector: inspectorRaw,
        open: rowOpen,
        openTime: openTime || '',
        closeTime: closeTime || '',
        date: targetDateToken,
        rowIndex: i + 2
      };
      continue;
    }

    // Если есть хотя бы одна открытая запись за день — считаем день открытым.
    if (rowOpen && !prev.open) {
      result[inspectorNorm] = {
        inspector: inspectorRaw,
        open: true,
        openTime: openTime || prev.openTime || '',
        closeTime: '',
        date: targetDateToken,
        rowIndex: i + 2
      };
      continue;
    }

    // Если обе записи одного типа, берём более позднюю строку как актуальную.
    if (rowOpen === !!prev.open && (i + 2) > Number(prev.rowIndex || 0)) {
      result[inspectorNorm] = {
        inspector: inspectorRaw,
        open: rowOpen,
        openTime: openTime || prev.openTime || '',
        closeTime: closeTime || prev.closeTime || '',
        date: targetDateToken,
        rowIndex: i + 2
      };
    }
  }

  Object.keys(result).forEach(key => {
    delete result[key].rowIndex;
  });

  return result;
}

function ensureInspectorsMessageSheet_(ss) {
  let sheet = ss.getSheetByName(INSPECTORS_MESSAGE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(INSPECTORS_MESSAGE_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Inspector', 'Message']]);
    return sheet;
  }

  const lastCol = Math.max(2, sheet.getLastColumn());
  if (sheet.getLastColumn() < lastCol) {
    sheet.insertColumnsAfter(sheet.getLastColumn(), lastCol - sheet.getLastColumn());
  }

  const headers = sheet.getRange(1, 1, 1, 2).getDisplayValues()[0];
  const expected = ['Inspector', 'Message'];
  const mustRewrite = expected.some((name, idx) => {
    return normalizeText_(headers[idx]) !== normalizeText_(name);
  });
  if (mustRewrite) {
    sheet.getRange(1, 1, 1, 2).setValues([expected]);
  }

  return sheet;
}

function getInspectorMessagesForUser_(ss, requestUser) {
  const result = { individual: [], group: [] };
  if (!requestUser || !requestUser.isInspector || !requestUser.nameNorm) return result;

  const sheet = ss.getSheetByName(INSPECTORS_MESSAGE_SHEET_NAME);
  if (!sheet) return result;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return result;

  const rows = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
  for (let i = 0; i < rows.length; i += 1) {
    const inspectorRaw = String(rows[i][0] || '').trim();
    const messageRaw = String(rows[i][1] || '').trim();
    if (!messageRaw) continue;

    const inspectorNorm = normalizeText_(inspectorRaw);
    const payload = {
      inspector: inspectorRaw,
      message: messageRaw,
      rowIndex: i + 2
    };

    if (inspectorNorm === GLOBAL_MESSAGE_TARGET) {
      result.group.push(payload);
      continue;
    }
    if (inspectorNorm === requestUser.nameNorm || inspectorCellContainsInspector_(inspectorRaw, requestUser.nameNorm)) {
      result.individual.push(payload);
    }
  }

  return result;
}

function appendInspectorMessage_(inspectorName, messageText, options) {
  const inspector = String(inspectorName || '').trim();
  const message = String(messageText || '').trim();
  if (!inspector || !message) return { saved: false, reason: 'empty_payload' };

  const opts = (options && typeof options === 'object') ? options : {};
  const ss = opts.ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = opts.sheet || ensureInspectorsMessageSheet_(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
    const inspectorNorm = normalizeText_(inspector);
    for (let i = 0; i < rows.length; i += 1) {
      const rowInspectorNorm = normalizeText_(rows[i][0]);
      if (rowInspectorNorm === inspectorNorm) {
        const rowIndex = i + 2;
        sheet.getRange(rowIndex, 2).setValue(message);
        return { saved: true, rowIndex: rowIndex, mode: 'update' };
      }
    }
  }

  sheet.appendRow([inspector, message]);
  return { saved: true, rowIndex: sheet.getLastRow(), mode: 'append' };
}

function appendInspectorMessageToTargets_(inspectorTargetsRaw, messageText) {
  const message = String(messageText || '').trim();
  if (!message) return { saved: false, reason: 'empty_message', targets: [] };

  const parsedTargets = splitInspectorNames_(inspectorTargetsRaw);
  const source = parsedTargets.length ? parsedTargets : [String(inspectorTargetsRaw || '').trim()];
  const uniqueTargets = [];
  const seen = {};

  for (let i = 0; i < source.length; i += 1) {
    const target = String(source[i] || '').trim();
    const targetNorm = normalizeText_(target);
    if (!targetNorm || seen[targetNorm]) continue;
    seen[targetNorm] = true;
    uniqueTargets.push(target);
  }

  if (!uniqueTargets.length) return { saved: false, reason: 'empty_targets', targets: [] };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureInspectorsMessageSheet_(ss);
  const targets = uniqueTargets.map(inspector => {
    return {
      inspector: inspector,
      result: appendInspectorMessage_(inspector, message, { ss: ss, sheet: sheet })
    };
  });

  return {
    saved: targets.some(item => !!(item && item.result && item.result.saved)),
    targets: targets
  };
}

/**
 * Аутентификация пользователя по паролю из листа AuthorizationPage
 */
function authenticateUser_(p) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('AuthorizationPage');
  if (!sheet) {
    return { success: false, error: 'Authorization sheet not found' };
  }

  const indices = getColumnIndices_(sheet, HEADERS.AUTHORIZATION);
  const data = sheet.getDataRange().getValues();

  const nonceId = String(p.nonceId || '').trim();
  const proof = String(p.proof || '').trim().toLowerCase();
  const rememberRequested = /^(1|true|yes|on)$/i.test(String(p.remember || '').trim());
  const isProofFlow = !!(nonceId || proof);
  let password = '';
  let nonce = '';

  if (isProofFlow) {
    if (!nonceId || !proof) {
      return { success: false, error: 'Nonce/proof required' };
    }
    nonce = consumeAuthNonce_(nonceId);
    if (!nonce) {
      return { success: false, error: 'Nonce expired' };
    }
  } else {
    password = String(p.password || '').trim();
    if (!password) {
      return { success: false, error: 'Password required' };
    }
  }

  // Найти пользователя по паролю (legacy) или proof (secure flow)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const inspectorName = indices.NAME !== undefined ? row[indices.NAME] : '';
    const storedPassword = indices.PASSWORD !== undefined ? String(row[indices.PASSWORD] || '').trim() : '';
    if (!storedPassword) continue;

    const isMatch = isProofFlow
      ? (sha256Hex_(storedPassword + '|' + nonce) === proof)
      : (storedPassword === password);

    if (isMatch) {
      let role = indices.ROLE !== undefined ? row[indices.ROLE] : '';
      if (!role) {
        role = String(inspectorName || '').toLowerCase().includes('admin') ? 'Администратор' : 'Инспектор';
      }
      const division = indices.DIVISION !== undefined ? row[indices.DIVISION] : '';
      const user = {
        name: inspectorName,
        role: role,
        division: division,
        loginTime: new Date().toISOString()
      };
      const tokenPayload = issueSessionToken_(
        user,
        rememberRequested ? SESSION_TOKEN_TTL_REMEMBER_SEC : SESSION_TOKEN_TTL_SEC
      );

      return {
        success: true,
        user: user,
        sessionToken: tokenPayload.token,
        expiresAt: tokenPayload.expiresAt,
        remember: rememberRequested
      };
    }
  }

  return { success: false, error: 'Неверный пароль' };
}

/**
 * Сохранить конфигурацию инспектора
 */
function saveInspectorConfig_(p) {
  const requestUser = getRequestUserContext_(p);
  if (requestUser.isInspector) {
    return { success: false, error: 'Forbidden for inspector role' };
  }

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
  const status = normalizeInspectorCustomStatus_(p.status || 'active');
  
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
function getMapPoints_(p, ssOptional) {
  const requestUser = getRequestUserContext_(p);
  const ss = ssOptional || SpreadsheetApp.openById(SPREADSHEET_ID);
  const allPoints = [];
  const restrictByInspector = requestUser.isInspector && !!requestUser.nameNorm;
  const inspectorDivisionNorms = requestUser.isInspector
    ? getInspectorAllowedDivisionNormsFast_(ss, requestUser)
    : [];
  const restrictByInspectorDivision = requestUser.isInspector && inspectorDivisionNorms.length > 0;
  const adminDivisionNorms = getAdminAllowedDivisionNorms_(requestUser);
  const restrictByAdminDivision = requestUser.isAdmin && adminDivisionNorms.length > 0;
  
  // Загружаем из четырёх листов
  const sources = MAP_POINT_SOURCES;
  
  for (const src of sources) {
    if (restrictByInspectorDivision && inspectorDivisionNorms.indexOf(src.divisionNorm) === -1) {
      continue;
    }
    if (restrictByAdminDivision && adminDivisionNorms.indexOf(src.divisionNorm) === -1) {
      continue;
    }

    const sheet = ss.getSheetByName(src.name);
    if (!sheet) {
      Logger.log('⚠️ Лист не найден: ' + src.name);
      continue;
    }
    
    const indices = getColumnIndices_(sheet, getHeadersForSource_(src.source));
    const maxColIndex = getMaxDefinedColumnIndex_(indices);
    if (maxColIndex < 0) continue;

    const lastRow = Number(sheet.getLastRow() || 0);
    if (lastRow < 2) continue;
    const data = sheet.getRange(1, 1, lastRow, maxColIndex + 1).getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const inspectorRaw = indices.INSPECTOR !== undefined ? row[indices.INSPECTOR] : '';
      if (restrictByInspector && !inspectorCellContainsInspector_(inspectorRaw, requestUser.nameNorm)) {
        continue;
      }

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
        inspector: inspectorRaw,
        list: indices.LIST !== undefined ? row[indices.LIST] : '',
        date: indices.DATE !== undefined ? formatDateRU_(row[indices.DATE]) : '',
        entryTime: formatDateTime_(indices.ENTRY_TIME !== undefined ? row[indices.ENTRY_TIME] : ''),
        exitTime: formatDateTime_(indices.EXIT_TIME !== undefined ? row[indices.EXIT_TIME] : ''),
        timeSpent: indices.TIME_SPENT !== undefined ? row[indices.TIME_SPENT] : '',
        entry: indices.ENTRY !== undefined ? row[indices.ENTRY] : '',
        coordinateCorrespondence: indices.COORDINATE_CORRESPONDENCE !== undefined ? row[indices.COORDINATE_CORRESPONDENCE] : '',
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

function parseCoordsPair_(value) {
  if (!value) return null;
  const parts = String(value).split(',');
  if (parts.length < 2) return null;

  const lat = parseFloat(String(parts[0] || '').trim().replace(',', '.'));
  const lon = parseFloat(String(parts[1] || '').trim().replace(',', '.'));
  if (isNaN(lat) || isNaN(lon)) return null;

  return { lat: lat, lon: lon };
}

function formatCoordsFixed4_(lat, lon) {
  return `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;
}

function distanceMeters_(lat1, lon1, lat2, lon2) {
  const toRad = value => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
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

function findObjectRowNumberById_(sheet, indices, id) {
  if (!sheet || !indices || indices.ID === undefined) return -1;

  const targetId = String(id || '').trim();
  if (!targetId) return -1;

  const lastRow = Number(sheet.getLastRow() || 0);
  if (lastRow < 2) return -1;

  const idRange = sheet.getRange(2, indices.ID + 1, lastRow - 1, 1);
  const match = idRange
    .createTextFinder(targetId)
    .matchEntireCell(true)
    .findNext();

  return match ? Number(match.getRow() || -1) : -1;
}

function resolveObjectRowNumberByIdAndHint_(sheet, indices, id, rowHintRaw) {
  if (!sheet || !indices || indices.ID === undefined) return -1;

  const targetId = String(id || '').trim();
  if (!targetId) return -1;

  const lastRow = Number(sheet.getLastRow() || 0);
  if (lastRow < 2) return -1;

  const hintedRow = parseInt(String(rowHintRaw || '').trim(), 10);
  if (Number.isFinite(hintedRow) && hintedRow >= 2 && hintedRow <= lastRow) {
    const hintedId = String(sheet.getRange(hintedRow, indices.ID + 1).getDisplayValue() || '').trim();
    if (hintedId === targetId) return hintedRow;
  }

  return findObjectRowNumberById_(sheet, indices, targetId);
}

function findObjectRowNumberByIdForInspector_(sheet, indices, id, inspectorNameNorm) {
  if (!sheet || !indices || indices.ID === undefined || indices.INSPECTOR === undefined) return -1;

  const targetId = String(id || '').trim();
  const targetInspectorNorm = normalizeText_(inspectorNameNorm);
  if (!targetId || !targetInspectorNorm) return -1;

  const lastRow = Number(sheet.getLastRow() || 0);
  if (lastRow < 2) return -1;

  const rowCount = lastRow - 1;
  const idValues = sheet.getRange(2, indices.ID + 1, rowCount, 1).getDisplayValues();
  const inspectorValues = sheet.getRange(2, indices.INSPECTOR + 1, rowCount, 1).getDisplayValues();

  for (let i = 0; i < rowCount; i += 1) {
    const rowId = String(idValues[i] && idValues[i][0] || '').trim();
    if (rowId !== targetId) continue;
    const rowInspectorRaw = inspectorValues[i] && inspectorValues[i][0];
    if (inspectorCellContainsInspector_(rowInspectorRaw, targetInspectorNorm)) {
      return i + 2;
    }
  }

  return -1;
}

/**
 * Подготовить общий контекст для операций с объектом на листе.
 */
function getInspectorDivisionByName_(ss, inspectorNameRaw) {
  const inspectorNameNorm = normalizeText_(inspectorNameRaw);
  if (!inspectorNameNorm) return '';

  const divisionMap = getInspectorDivisionMap_(ss);
  return resolveDivisionFromInspectorNameNorm_(divisionMap, inspectorNameNorm);
}

function getInspectorDivisionMap_(ss) {
  const safeSs = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  const cacheBySpreadsheet = getInspectorDivisionMap_._runtimeCache || (getInspectorDivisionMap_._runtimeCache = {});
  const cacheKey = safeSs.getId();
  const cacheTtlMs = 60 * 1000;
  const nowTs = Date.now();
  const cached = cacheBySpreadsheet[cacheKey];
  if (cached && cached.map && (nowTs - Number(cached.ts || 0)) < cacheTtlMs) {
    return cached.map;
  }

  const inspectors = getInspectorsList_(safeSs);
  const map = {};

  for (let i = 0; i < inspectors.length; i += 1) {
    const item = inspectors[i] || {};
    const nameNorm = normalizeText_(item.name);
    if (!nameNorm) continue;
    map[nameNorm] = normalizeDivisionAlias_(item.division);
  }

  cacheBySpreadsheet[cacheKey] = { ts: nowTs, map: map };
  return map;
}

function getInspectorDivisionNormsForInspectorCell_(ss, inspectorCellRaw) {
  const names = splitInspectorNames_(inspectorCellRaw);
  const source = names.length ? names : [String(inspectorCellRaw || '').trim()];
  const divisionMap = getInspectorDivisionMap_(ss);
  const seen = {};
  const divisions = [];

  for (let i = 0; i < source.length; i += 1) {
    const nameNorm = normalizeText_(source[i]);
    let divisionNorm = resolveDivisionFromInspectorNameNorm_(divisionMap, nameNorm);
    if (!divisionNorm) {
      divisionNorm = normalizeDivisionAlias_(nameNorm);
      if (divisionNorm === nameNorm) {
        divisionNorm = '';
      }
    }
    if (!divisionNorm || seen[divisionNorm]) continue;
    seen[divisionNorm] = true;
    divisions.push(divisionNorm);
  }

  return divisions;
}

function getInspectorAllowedDivisionNorms_(ss, requestUser) {
  const safeUser = (requestUser && typeof requestUser === 'object') ? requestUser : {};
  const nameNorm = normalizeText_(safeUser.nameNorm || safeUser.name || '');
  const result = [];
  const seen = {};

  addDivisionNormIfPresent_(result, seen, safeUser.division || '');
  addDivisionNormIfPresent_(result, seen, getInspectorDivisionByName_(ss, nameNorm || safeUser.name || ''));

  if (!nameNorm) return result;

  const sourceSheets = [
    { name: 'Map', source: 'map' },
    { name: 'Laboratory', source: 'laboratory' },
    { name: 'ConstructionControl', source: 'constructioncontrol' },
    { name: 'DMS', source: 'dms' },
    { name: 'Metro', source: 'metro' }
  ];

  for (let s = 0; s < sourceSheets.length; s += 1) {
    const sourceItem = sourceSheets[s];
    const sheet = ss.getSheetByName(sourceItem.name);
    if (!sheet) continue;

    const lastRow = Number(sheet.getLastRow() || 0);
    const lastCol = Number(sheet.getLastColumn() || 0);
    if (lastRow < 2 || lastCol < 1) continue;

    const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const inspectorCol = findColumnIndexByHeaderCandidates_(headers, [
      OBJECT_HEADERS.INSPECTOR,
      'Inspector',
      'Инспектор'
    ]);
    if (inspectorCol < 0) continue;

    const divisionCol = findColumnIndexByHeaderCandidates_(headers, [
      'Division',
      'division',
      'Отдел',
      'Подразделение',
      'Department',
      'Дивизион'
    ]);

    const rowCount = lastRow - 1;
    const inspectorValues = sheet.getRange(2, inspectorCol + 1, rowCount, 1).getDisplayValues();
    const divisionValues = divisionCol >= 0
      ? sheet.getRange(2, divisionCol + 1, rowCount, 1).getDisplayValues()
      : null;

    let foundAssignmentInSheet = false;
    for (let i = 0; i < rowCount; i += 1) {
      const rowInspectorRaw = inspectorValues[i] && inspectorValues[i][0];
      if (!inspectorCellContainsInspector_(rowInspectorRaw, nameNorm)) continue;

      foundAssignmentInSheet = true;
      if (divisionValues) {
        const rowDivisionRaw = divisionValues[i] && divisionValues[i][0];
        addDivisionNormIfPresent_(result, seen, rowDivisionRaw);
      }
    }

    if (foundAssignmentInSheet) {
      addDivisionNormIfPresent_(result, seen, sourceItem.source);
    }
  }

  return result;
}

function resolveDivisionFromInspectorNameNorm_(divisionMap, inspectorNameNorm) {
  const map = (divisionMap && typeof divisionMap === 'object') ? divisionMap : {};
  const rawNameNorm = normalizeText_(inspectorNameNorm);
  if (!rawNameNorm) return '';

  if (map[rawNameNorm]) {
    return normalizeDivisionAlias_(map[rawNameNorm]);
  }

  const cleanedName = rawNameNorm
    .replace(/[(){}\[\]"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleanedName && map[cleanedName]) {
    return normalizeDivisionAlias_(map[cleanedName]);
  }

  const targetTokens = cleanedName.split(/\s+/).filter(Boolean);
  if (targetTokens.length < 2) return '';

  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i += 1) {
    const keyName = normalizeText_(keys[i]);
    if (!keyName) continue;
    const keyTokens = keyName.split(/\s+/).filter(Boolean);
    if (keyTokens.length < 2) continue;

    let tokenMatches = 0;
    for (let j = 0; j < targetTokens.length; j += 1) {
      if (keyTokens.indexOf(targetTokens[j]) !== -1) {
        tokenMatches += 1;
      }
    }
    if (tokenMatches >= 2) {
      return normalizeDivisionAlias_(map[keys[i]]);
    }
  }

  return '';
}

function getObjectActionContext_(p) {
  const requestUser = getRequestUserContext_(p);
  const source = String(p.source || 'Map');
  const id = extractObjectId_(p.objectId);
  if (!id) return { error: 'No objectId' };

  if (requestUser.isAdmin) {
    const adminDivisionNorms = getAdminAllowedDivisionNorms_(requestUser);
    if (adminDivisionNorms.length > 0) {
      const sourceDivisionNorm = getSourceDivisionNorm_(source);
      if (!sourceDivisionNorm || adminDivisionNorms.indexOf(sourceDivisionNorm) === -1) {
        return { error: 'Forbidden: source is not allowed for this admin' };
      }
    }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(source);
  if (!sheet) return { error: 'Sheet not found: ' + source };

  const indices = getColumnIndices_(sheet, getHeadersForSource_(source));
  const rowHintRaw = p.rowIndex || p.rowNumber || p.sheetRowIndex || '';
  let rowNumber = resolveObjectRowNumberByIdAndHint_(sheet, indices, id, rowHintRaw);
  if (requestUser.isInspector) {
    const ownRowNumber = findObjectRowNumberByIdForInspector_(
      sheet,
      indices,
      id,
      requestUser.nameNorm
    );
    if (ownRowNumber >= 2) {
      rowNumber = ownRowNumber;
    }
  }
  if (rowNumber < 2) return { error: 'Object not found' };
  const rowData = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  const objectHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const objectDivisionColumnIndex = findColumnIndexByHeaderCandidates_(objectHeaders, [
    'Division',
    'division',
    'Отдел',
    'Подразделение',
    'Department',
    'Дивизион'
  ]);

  if (requestUser.isInspector) {
    const rowInspectorRaw = indices.INSPECTOR !== undefined ? rowData[indices.INSPECTOR] : '';
    const rowInspectorNorm = normalizeText_(rowInspectorRaw);
    const rowDivisionRaw = objectDivisionColumnIndex >= 0 ? rowData[objectDivisionColumnIndex] : '';
    const rowDivisionNorm = normalizeDivisionAlias_(rowDivisionRaw);

    if (rowInspectorNorm) {
      const directInspectorMatch = inspectorCellContainsInspector_(rowInspectorRaw, requestUser.nameNorm);

      if (!directInspectorMatch) {
        const requestDivisionNorms = getInspectorAllowedDivisionNorms_(ss, requestUser);
        const rowDivisionNorms = getInspectorDivisionNormsForInspectorCell_(ss, rowInspectorRaw);
        const sourceDivisionNorm = getSourceDivisionNorm_(source);
        const sameObjectDivision = !!rowDivisionNorm &&
          requestDivisionNorms.indexOf(rowDivisionNorm) !== -1;
        const sameDivisionByInspectorCell = rowDivisionNorms.some(divNorm => {
          const value = normalizeDivisionAlias_(divNorm);
          return value && requestDivisionNorms.indexOf(value) !== -1;
        });
        const sameBySourceFallback = !!sourceDivisionNorm &&
          requestDivisionNorms.indexOf(sourceDivisionNorm) !== -1;
        const unresolvedInspectorDivision = requestDivisionNorms.length === 0;
        const allowedByDivision = sameObjectDivision || sameDivisionByInspectorCell || sameBySourceFallback;

        if (!allowedByDivision && !unresolvedInspectorDivision) {
          return { error: 'Forbidden: object is assigned to another inspector' };
        }

        if (!allowedByDivision && unresolvedInspectorDivision) {
          Logger.log(
            'Access fallback (unresolved inspector division). inspector=' +
            String(requestUser.name || '') +
            ', source=' + String(source || '') +
            ', objectId=' + String(id || '') +
            ', objectDivision=' + String(rowDivisionNorm || '')
          );
        }
      }
    }
  }

  return {
    source: source,
    id: id,
    sheet: sheet,
    indices: indices,
    rowNumber: rowNumber,
    rowData: rowData,
    requestUser: requestUser
  };
}

function buildSelfieRequestMessageForObject_(ctx, rowValues, indices) {
  const safeCtx = ctx || {};
  const safeIndices = indices || {};
  const safeRow = Array.isArray(rowValues) ? rowValues : [];

  const pointNumber = safeIndices.NUMBER !== undefined
    ? String(safeRow[safeIndices.NUMBER] || '').trim()
    : '';
  if (pointNumber) return SELFIE_REQUEST_MESSAGE + ' (point #' + pointNumber + ')';

  const objectId = safeIndices.ID !== undefined
    ? String(safeRow[safeIndices.ID] || '').trim()
    : String(safeCtx.id || '').trim();
  if (objectId) return SELFIE_REQUEST_MESSAGE + ' (object #' + objectId + ')';

  return SELFIE_REQUEST_MESSAGE;
}
function getCoordMismatchValue_() {
  return WORKDAY_COORD_MATCH_NO + ' ' + SELFIE_REQUEST_MESSAGE;
}

function resolveCoordinateCorrespondenceColumnIndex_(sheet, indices) {
  if (indices && indices.COORDINATE_CORRESPONDENCE !== undefined) {
    return indices.COORDINATE_CORRESPONDENCE;
  }
  if (!sheet) return undefined;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const fallbackIndex = findColumnIndexByHeaderCandidates_(headers, [
    OBJECT_HEADERS.COORDINATE_CORRESPONDENCE,
    'Coordinate correspondence',
    'Coordinate-correspondence',
    'coordinatecorrespondence',
  ]);
  return fallbackIndex >= 0 ? fallbackIndex : undefined;
}

function syncObjectEntryMetrics_(ctx, params) {
  if (!ctx || !ctx.sheet) {
    return { updated: false, reason: 'no_sheet' };
  }

  const indices = getColumnIndices_(ctx.sheet, getHeadersForSource_(ctx.source));
  const entryColumnIndex = indices.ENTRY;
  const correspondenceColumnIndex = resolveCoordinateCorrespondenceColumnIndex_(ctx.sheet, indices);
  if (entryColumnIndex === undefined && correspondenceColumnIndex === undefined) {
    Logger.log('syncObjectEntryMetrics_: missing Entry and Coordinate_correspondence columns for source ' + String(ctx.source || ''));
    return { updated: false, reason: 'missing_columns' };
  }

  const rowValues = ctx.sheet.getRange(ctx.rowNumber, 1, 1, ctx.sheet.getLastColumn()).getValues()[0];
  const entryCoordsRaw = resolveWorkDayCoords_(params, 'entry');
  const entryCoords = parseCoordsPair_(entryCoordsRaw);
  const objectCoords = indices.LATLON !== undefined
    ? parseLatLon_(rowValues[indices.LATLON])
    : null;

  const entryValue = entryCoords
    ? formatCoordsFixed4_(entryCoords.lat, entryCoords.lon)
    : WORKDAY_NO_GEO_MARKER;

  let correspondence = getCoordMismatchValue_();
  let distanceM = null;

  if (entryCoords && objectCoords) {
    distanceM = distanceMeters_(entryCoords.lat, entryCoords.lon, objectCoords.lat, objectCoords.lon);
    correspondence = distanceM <= WORKDAY_COORD_MATCH_DISTANCE_M
      ? WORKDAY_COORD_MATCH_YES
      : getCoordMismatchValue_();
  }

  if (entryColumnIndex !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, entryColumnIndex + 1).setValue(entryValue);
  }
  if (correspondenceColumnIndex !== undefined) {
    ctx.sheet.getRange(ctx.rowNumber, correspondenceColumnIndex + 1).setValue(correspondence);
  }

  const isMismatch = correspondence !== WORKDAY_COORD_MATCH_YES;
  if (isMismatch) {
    const inspectorName = indices.INSPECTOR !== undefined
      ? String(rowValues[indices.INSPECTOR] || '').trim()
      : '';
    const messageTargetRaw = inspectorName || (ctx.requestUser && ctx.requestUser.name) || '';
    if (messageTargetRaw) {
      const mismatchMessage = buildSelfieRequestMessageForObject_(ctx, rowValues, indices);
      appendInspectorMessageToTargets_(messageTargetRaw, mismatchMessage);
    }
  }

  return {
    updated: true,
    entryValue: entryValue,
    correspondence: correspondence,
    distanceM: distanceM,
    mismatch: isMismatch,
    entryColumnIndex: entryColumnIndex,
    correspondenceColumnIndex: correspondenceColumnIndex
  };
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

  let objectEntrySync = { updated: false };
  try {
    objectEntrySync = syncObjectEntryMetrics_(ctx, p);
  } catch (error) {
    Logger.log('Object entry sync failed: ' + error);
  }

  let workDaySync = { updated: false };
  try {
    workDaySync = syncWorkDayOnEntry_(ctx, p, objectEntrySync);
  } catch (error) {
    Logger.log('WorkDay sync on entry failed: ' + error);
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    updated: true,
    row: ctx.rowNumber,
    objectEntrySync: objectEntrySync,
    workDaySync: workDaySync
  };
}

function syncWorkDayOnEntry_(ctx, params, objectEntrySync) {
  if (!ctx || !ctx.requestUser || !ctx.requestUser.isInspector) {
    return { updated: false, reason: 'not_inspector' };
  }

  const workDaySheet = ensureWorkDaySheet_();
  const rowIndex = getWorkDayRowIndex_(workDaySheet, ctx.requestUser.nameNorm, new Date());
  if (rowIndex < 0) {
    return { updated: false, reason: 'workday_row_not_found' };
  }

  const rowValues = workDaySheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).getValues()[0];
  const entryCoordsRaw = resolveWorkDayCoords_(params, 'entry');
  const entryCoords = parseCoordsPair_(entryCoordsRaw);
  const entryCoordsText = entryCoords
    ? formatCoordsFixed4_(entryCoords.lat, entryCoords.lon)
    : WORKDAY_NO_GEO_MARKER;

  const objectCoordsRaw = ctx.indices.LATLON !== undefined ? ctx.rowData[ctx.indices.LATLON] : '';
  const objectCoords = parseLatLon_(objectCoordsRaw);
  const objectCoordsText = objectCoords
    ? formatCoordsFixed4_(objectCoords.lat, objectCoords.lon)
    : entryCoordsText;

  // Last visited object coordinates (always refresh on entry).
  rowValues[9] = objectCoordsText;

  let distanceM = null;
  let compared = false;
  const hasFirstCoords = String(rowValues[4] || '').trim() !== '';

  // First object of the day: store once and compare with opening coordinates.
  if (!hasFirstCoords) {
    rowValues[4] = entryCoordsText;

    const openCoords = parseCoordsPair_(rowValues[3]);
    if (openCoords && entryCoords) {
      compared = true;
      distanceM = distanceMeters_(openCoords.lat, openCoords.lon, entryCoords.lat, entryCoords.lon);
      rowValues[5] = distanceM <= WORKDAY_COORD_MATCH_DISTANCE_M
        ? WORKDAY_COORD_MATCH_YES
        : getCoordMismatchValue_();
    } else {
      rowValues[5] = WORKDAY_COORD_MATCH_NO_OPEN;
    }

    if (rowValues[5] !== WORKDAY_COORD_MATCH_YES && ctx.requestUser && ctx.requestUser.name) {
      const mismatchMessage = buildSelfieRequestMessageForObject_(ctx, ctx.rowData, ctx.indices);
      appendInspectorMessageToTargets_(ctx.requestUser.name, mismatchMessage);
    }
  }

  workDaySheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).setValues([rowValues]);

  return {
    updated: true,
    rowIndex: rowIndex,
    firstObjectCaptured: !hasFirstCoords,
    compared: compared,
    distanceM: distanceM,
    objectEntrySync: objectEntrySync || null
  };
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

  const lastRow = Number(sheet.getLastRow() || 0);
  if (lastRow < 2) return 1;

  const rowCount = lastRow - 1;
  const inspectorValues = sheet.getRange(2, indices.INSPECTOR + 1, rowCount, 1).getDisplayValues();
  const dateValues = sheet.getRange(2, indices.DATE + 1, rowCount, 1).getValues();
  const numberValues = sheet.getRange(2, indices.NUMBER + 1, rowCount, 1).getValues();
  const dateStr = formatDateRU_(date);
  let maxNumber = 0;

  for (let i = 0; i < rowCount; i += 1) {
    const rowInspector = String(inspectorValues[i][0] || '');
    const rowDate = formatDateRU_(dateValues[i][0]);
    const rowNumber = parseInt(numberValues[i][0], 10) || 0;

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

function ensureWorkDaySheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(WORKDAY_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(WORKDAY_SHEET_NAME);
    sheet.getRange(1, 1, 1, WORKDAY_HEADERS.length).setValues([WORKDAY_HEADERS]);
    return sheet;
  }

  const currentLastCol = sheet.getLastColumn();
  if (currentLastCol < WORKDAY_HEADERS.length) {
    sheet.insertColumnsAfter(currentLastCol, WORKDAY_HEADERS.length - currentLastCol);
  }

  // WorkDay schema is strict: keep only operational 12 columns.
  const afterEnsureLastCol = sheet.getLastColumn();
  if (afterEnsureLastCol > WORKDAY_HEADERS.length) {
    sheet.deleteColumns(WORKDAY_HEADERS.length + 1, afterEnsureLastCol - WORKDAY_HEADERS.length);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, WORKDAY_HEADERS.length).getDisplayValues()[0];
  const mustRewrite = WORKDAY_HEADERS.some((header, idx) => {
    return String(currentHeaders[idx] || '').trim() !== header;
  });
  if (mustRewrite) {
    sheet.getRange(1, 1, 1, WORKDAY_HEADERS.length).setValues([WORKDAY_HEADERS]);
  }

  return sheet;
}

function formatDateToken_(dateValue, timeZone) {
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return Utilities.formatDate(dateValue, timeZone, 'dd.MM.yyyy');
  }

  const raw = String(dateValue || '').trim();
  if (!raw) return '';

  const ddmmyyyy = raw.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[1]}.${ddmmyyyy[2]}.${ddmmyyyy[3]}`;

  const yyyymmdd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) return `${yyyymmdd[3]}.${yyyymmdd[2]}.${yyyymmdd[1]}`;

  return '';
}

function getWorkDayRowIndex_(sheet, inspectorNameNorm, dateValue) {
  if (!sheet || !inspectorNameNorm) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const timeZone = Session.getScriptTimeZone() || 'Etc/GMT';
  const targetDateToken = Utilities.formatDate(dateValue instanceof Date ? dateValue : new Date(dateValue), timeZone, 'dd.MM.yyyy');
  const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();

  for (let i = 0; i < rows.length; i += 1) {
    const rowDateToken = formatDateToken_(rows[i][0], timeZone);
    const rowInspectorNorm = normalizeText_(rows[i][1]);
    if (rowDateToken === targetDateToken && rowInspectorNorm === inspectorNameNorm) {
      return i + 2;
    }
  }
  return -1;
}

function resolveWorkDayCoords_(params, directKey) {
  const p = params || {};
  const direct = String(p[directKey] || '').trim();
  if (direct) return direct;

  const coords = String(p.coords || '').trim();
  if (coords) return coords;

  const lat = String(p.lat || '').trim();
  const lon = String(p.lon || '').trim();
  if (lat && lon) return `${lat}, ${lon}`;

  return '';
}

function getWorkDayInspectorContext_(p) {
  const requestUser = getRequestUserContext_(p);
  if (!requestUser.isInspector) {
    return { error: 'WorkDay is available only for inspector role' };
  }
  if (!requestUser.nameNorm) {
    return { error: 'Inspector name is required' };
  }
  return {
    requestUser: requestUser,
    inspectorName: requestUser.name,
    inspectorNameNorm: requestUser.nameNorm
  };
}

function checkWorkDay_(p) {
  const inspectorCtx = getWorkDayInspectorContext_(p);
  if (inspectorCtx.error) return { success: false, error: inspectorCtx.error };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(WORKDAY_SHEET_NAME);
  if (!sheet) {
    return { success: true, open: false, persisted: true };
  }

  const now = new Date();
  const rowIndex = getWorkDayRowIndex_(sheet, inspectorCtx.inspectorNameNorm, now);
  if (rowIndex < 0) {
    return { success: true, open: false, persisted: true };
  }

  const row = sheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).getValues()[0];
  const openTime = String(row[2] || '').trim();
  const closeTime = String(row[7] || '').trim();
  const open = !!openTime && !closeTime;

  return {
    success: true,
    open: open,
    openTime: openTime || null,
    closeTime: closeTime || null,
    rowIndex: rowIndex,
    persisted: true
  };
}

function startWorkDay_(p) {
  const inspectorCtx = getWorkDayInspectorContext_(p);
  if (inspectorCtx.error) return { success: false, error: inspectorCtx.error };

  const sheet = ensureWorkDaySheet_();
  const now = new Date();
  const timeZone = Session.getScriptTimeZone() || 'Etc/GMT';
  const dateToken = Utilities.formatDate(now, timeZone, 'dd.MM.yyyy');
  const timeToken = Utilities.formatDate(now, timeZone, 'HH:mm');
  const openCoords = resolveWorkDayCoords_(p, 'open_coordinates');
  const openCoordsValue = openCoords || WORKDAY_NO_GEO_MARKER;
  const openComment = String((p && p.open_comment) || '').trim();

  let rowIndex = getWorkDayRowIndex_(sheet, inspectorCtx.inspectorNameNorm, now);
  let rowValues = new Array(WORKDAY_HEADERS.length).fill('');

  if (rowIndex > 0) {
    rowValues = sheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).getValues()[0];
    const closeTime = String(rowValues[7] || '').trim();
    const alreadyOpen = !closeTime && String(rowValues[2] || '').trim();
    if (alreadyOpen) {
      return { success: false, error: 'WorkDay already open today', code: 'ALREADY_OPEN' };
    }
  }

  rowValues[0] = dateToken;
  rowValues[1] = inspectorCtx.inspectorName;
  rowValues[2] = timeToken;
  rowValues[3] = openCoordsValue;
  rowValues[6] = openComment || rowValues[6] || '';

  // On start/re-open: clear all close-related fields.
  rowValues[7] = '';
  rowValues[8] = '';
  rowValues[10] = '';
  rowValues[11] = '';

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    rowIndex = sheet.getLastRow();
  }

  SpreadsheetApp.flush();

  const verify = sheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).getValues()[0];
  const persistedOpen = !!String(verify[2] || '').trim() && !String(verify[7] || '').trim();
  if (!persistedOpen) {
    return { success: false, error: 'Failed to persist open status', code: 'PERSIST_FAILED' };
  }

  return {
    success: true,
    persisted: true,
    open: true,
    openTime: String(verify[2] || ''),
    rowIndex: rowIndex
  };
}

function endWorkDay_(p) {
  const inspectorCtx = getWorkDayInspectorContext_(p);
  if (inspectorCtx.error) return { success: false, error: inspectorCtx.error };

  const sheet = ensureWorkDaySheet_();
  const now = new Date();
  const timeZone = Session.getScriptTimeZone() || 'Etc/GMT';
  const timeToken = Utilities.formatDate(now, timeZone, 'HH:mm');
  const closeCoords = resolveWorkDayCoords_(p, 'close_coordinates');
  const closeCoordsValue = closeCoords || WORKDAY_NO_GEO_MARKER;
  const closeComment = String((p && p.close_comment) || '').trim();

  const rowIndex = getWorkDayRowIndex_(sheet, inspectorCtx.inspectorNameNorm, now);
  if (rowIndex < 0) {
    return { success: false, error: 'WorkDay not found for today', code: 'NOT_FOUND' };
  }

  const rowValues = sheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).getValues()[0];
  const openTime = String(rowValues[2] || '').trim();
  const closeTime = String(rowValues[7] || '').trim();
  if (!openTime) {
    return { success: false, error: 'WorkDay open time is missing', code: 'INVALID_STATE' };
  }
  if (closeTime) {
    return { success: false, error: 'WorkDay already closed today', code: 'ALREADY_CLOSED' };
  }

  rowValues[7] = timeToken;
  rowValues[8] = closeCoordsValue;
  rowValues[11] = closeComment || rowValues[11] || '';
  sheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).setValues([rowValues]);

  SpreadsheetApp.flush();

  const verify = sheet.getRange(rowIndex, 1, 1, WORKDAY_HEADERS.length).getValues()[0];
  const persistedClosed = !!String(verify[7] || '').trim();
  if (!persistedClosed) {
    return { success: false, error: 'Failed to persist close status', code: 'PERSIST_FAILED' };
  }

  return {
    success: true,
    persisted: true,
    open: false,
    closeTime: String(verify[7] || ''),
    rowIndex: rowIndex
  };
}

/**
 * Переназначить инспектора у объекта
 */
function reassign_(p) {
  const newInspector = String(p.newInspector || '').trim();
  if (!newInspector) return { success: false, error: 'No newInspector' };

  const ctx = getObjectActionContext_(p);
  if (ctx.error) return { success: false, error: ctx.error };
  if (ctx.requestUser && ctx.requestUser.isInspector) {
    return { success: false, error: 'Forbidden for inspector role' };
  }
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

function findColumnIndexByHeaderCandidates_(headers, candidates) {
  const headerRow = Array.isArray(headers) ? headers : [];
  const wanted = (Array.isArray(candidates) ? candidates : []).map(name => normalizeText_(name));
  for (let i = 0; i < headerRow.length; i += 1) {
    const normalized = normalizeText_(headerRow[i]);
    if (wanted.indexOf(normalized) !== -1) return i;
  }
  return -1;
}

function ensureArchiveSheet_(ss) {
  let sheet = ss.getSheetByName('Archive');
  if (!sheet) {
    sheet = ss.insertSheet('Archive');
  }
  return sheet;
}

function archiveCompletedObjects_(p) {
  const requestUser = getRequestUserContext_(p);
  if (requestUser && requestUser.isInspector) {
    return { success: false, error: 'Forbidden for inspector role', code: 'FORBIDDEN' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const archiveSheet = ensureArchiveSheet_(ss);
  const sourceSheets = ['Map', 'Laboratory', 'ConstructionControl', 'DMS', 'Metro'];
  const bySource = {};
  let totalArchived = 0;

  sourceSheets.forEach(sourceName => {
    bySource[sourceName] = 0;

    const sheet = ss.getSheetByName(sourceName);
    if (!sheet) return;

    const lastRow = Number(sheet.getLastRow() || 0);
    const lastCol = Number(sheet.getLastColumn() || 0);
    if (lastRow < 2 || lastCol < 1) return;

    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = data[0] || [];

    let exitCol = findColumnIndexByHeaderCandidates_(headers, [
      OBJECT_HEADERS.EXIT_TIME,
      'Exit_time',
      'Exit',
      'Exit time',
      'exittime',
      '\u0412\u0440\u0435\u043c\u044f \u0432\u044b\u0445\u043e\u0434\u0430',
      '\u0412\u044b\u0445\u043e\u0434'
    ]);
    if (exitCol < 0 && lastCol > 7) exitCol = 7;
    if (exitCol < 0) return;

    const keepRows = [headers];
    const archiveRows = [];

    for (let i = 1; i < data.length; i += 1) {
      const row = data[i];
      const exitValue = row[exitCol];
      const hasExit = !(exitValue === null || exitValue === undefined || String(exitValue).trim() === '');
      if (hasExit) {
        archiveRows.push(row);
      } else {
        keepRows.push(row);
      }
    }

    if (archiveRows.length === 0) return;

    const archiveLastCol = Number(archiveSheet.getLastColumn() || 0);
    if (archiveLastCol < lastCol) {
      const addCols = lastCol - archiveLastCol;
      if (archiveLastCol > 0) {
        archiveSheet.insertColumnsAfter(archiveLastCol, addCols);
      }
    }

    const writeRow = archiveSheet.getLastRow() + 1;
    archiveSheet.getRange(writeRow, 1, archiveRows.length, lastCol).setValues(archiveRows);

    sheet.getRange(1, 1, lastRow, lastCol).clearContent();
    sheet.getRange(1, 1, keepRows.length, lastCol).setValues(keepRows);

    bySource[sourceName] = archiveRows.length;
    totalArchived += archiveRows.length;
  });

  SpreadsheetApp.flush();

  return {
    success: true,
    count: totalArchived,
    bySource: bySource,
    message: totalArchived > 0
      ? ('Archived ' + totalArchived + ' objects')
      : 'Nothing to archive'
  };
}
function getYandexOauthToken_() {
  const props = PropertiesService.getScriptProperties();
  const primary = String(props.getProperty(YANDEX_TOKEN_PROP) || '').trim();
  if (primary) return primary;

  const legacy = String(props.getProperty(YANDEX_TOKEN_PROP_LEGACY) || '').trim();
  if (legacy) return legacy;

  throw new Error('Yandex OAuth token is missing. Set Script Property "YANDEX_OAUTH_TOKEN" (or legacy "YANDEX_TOKEN").');
}

function yandexApiRequest_(method, path) {
  const normalizedMethod = String(method || 'get').trim().toLowerCase();
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) throw new Error('Path required');

  const url = 'https://cloud-api.yandex.net/v1/disk/resources?path=' + encodeURIComponent(normalizedPath);
  const response = UrlFetchApp.fetch(url, {
    method: normalizedMethod,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'OAuth ' + getYandexOauthToken_()
    }
  });

  return {
    code: Number(response.getResponseCode() || 0),
    body: String(response.getContentText() || '')
  };
}

function yandexCreateFolder_(p) {
  const path = String(p.path || '').trim();
  if (!path) return { success: false, error: 'Path required' };

  try {
    const apiResult = yandexApiRequest_('put', path);
    const code = apiResult.code;
    if (code === 201 || code === 409) {
      return { success: true, created: code === 201, code: code };
    }
    return {
      success: false,
      code: code,
      message: apiResult.body || 'Yandex API error'
    };
  } catch (error) {
    return { success: false, code: 0, message: String(error) };
  }
}

function yandexCheckFolder_(p) {
  const path = String(p.path || '').trim();
  if (!path) return { success: false, error: 'Path required', exists: false };

  try {
    const apiResult = yandexApiRequest_('get', path);
    return {
      success: true,
      exists: apiResult.code === 200,
      code: apiResult.code
    };
  } catch (error) {
    return { success: false, exists: false, code: 0, message: String(error) };
  }
}

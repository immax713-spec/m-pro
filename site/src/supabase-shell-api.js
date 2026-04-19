(function () {
  'use strict';

  const config = window.SUPABASE_MPRO_CONFIG || {};

  const supabaseUrl = String(config.supabaseUrl || '').trim().replace(/\/+$/g, '');
  const supabaseAnonKey = String(config.supabaseAnonKey || '').trim();
  const supabaseSchema = String(config.schema || 'api').trim() || 'api';
  const requestTimeoutMs = normalizeTimeoutMs(config.requestTimeoutMs || config.timeoutMs, 20000);
  const authRequestTimeoutMs = normalizeTimeoutMs(config.authRequestTimeoutMs, 12000);

  if (!supabaseUrl || !supabaseAnonKey) {
    window.SupabaseShellApi = {
      run() {
        return Promise.reject(new Error('Supabase RPC transport is not configured.'));
      }
    };
    return;
  }

  const RPC = config.rpc || {};
  const SOURCE_CATALOG = window.MPRO_SOURCE_CATALOG && typeof window.MPRO_SOURCE_CATALOG === 'object'
    ? window.MPRO_SOURCE_CATALOG
    : {};
  const PERSISTED_BUNDLE_CACHE_KEY = 'smart_filter_shell_bundle_cache_v3';

  let bundleCache = null;
  let bundleCachePromise = null;
  const SOURCE_LABELS_BY_KEY = Object.freeze({
    objects: 'Реестр объектов',
    sm: 'Строительный мониторинг',
    ksg: 'КСГ',
    suid: 'Замечания СУИД',
    lb: 'Лаборатория',
    ppr: 'Комплексная оценка объекта',
    mgz: 'МГЗ'
  });
  const KSG_FIELD_LABEL_OVERRIDES = Object.freeze({
    ksg_2_2: 'Получение разрешения на строительство по эталонному графику (План)',
    ksg_2_3: 'Получение разрешения на строительство по эталонному графику (Факт)',
    ksg_4_2: 'Передача строительной площадки подрядчику по эталонному графику (План)',
    ksg_4_3: 'Передача строительной площадки подрядчику по эталонному графику (Факт)',
    ksg_5_1: 'Начало СМР по контракту, эталонному графику (Контракт)',
    ksg_5_2: 'Начало СМР по контракту, эталонному графику (План)',
    ksg_5_3: 'Начало СМР по контракту, эталонному графику (Факт)',
    ksg_6_1: 'Окончание СМР по контракту, эталонному графику (Контракт)',
    ksg_6_2: 'Окончание СМР по контракту, эталонному графику (План)',
    ksg_6_3: 'Окончание СМР по контракту, эталонному графику (Факт)',
    ksg_8_2: 'Получение актов технологического присоединения по эталонному графику (План)',
    ksg_8_3: 'Получение актов технологического присоединения по эталонному графику (Факт)',
    ksg_9_2: 'Формирование папки ЗОС по эталонному графику (План)',
    ksg_9_3: 'Формирование папки ЗОС по эталонному графику (Факт)',
    ksg_10_2: 'Получение ЗОС по эталонному графику (План)',
    ksg_10_3: 'Получение ЗОС по эталонному графику (Факт)',
    ksg_12_1: 'Получение РВ по контракту, эталонному графику (Контракт)',
    ksg_12_2: 'Получение РВ по контракту, эталонному графику (План)',
    ksg_12_3: 'Получение РВ по контракту, эталонному графику (Факт)',
    ksg_12_4: 'Получение РВ по контракту, эталонному графику (№ РВ)'
  });

  function createShellError(message, code) {
    const error = new Error(String(message || 'Ошибка Supabase API').trim() || 'Ошибка Supabase API');
    if (code) error.code = String(code || '').trim();
    return error;
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function normalizeString(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeTimeoutMs(value, fallback) {
    const timeout = Number(value);
    if (!Number.isFinite(timeout) || timeout <= 0) return Math.max(3000, Number(fallback) || 15000);
    return Math.min(60000, Math.max(3000, Math.floor(timeout)));
  }

  function normalizeIdentity(value) {
    try {
      return String(value == null ? '' : value)
        .normalize('NFKC')
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (_error) {
      return normalizeString(value).replace(/\s+/g, ' ').trim();
    }
  }

  function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function getRpcUrl(name) {
    return `${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(String(name || '').trim())}`;
  }

  function getRpcHeaders() {
    return {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
      Prefer: 'params=single-object',
      'Accept-Profile': supabaseSchema,
      'Content-Profile': supabaseSchema
    };
  }

  async function callRpc(rpcName, params, options) {
    const timeoutMs = normalizeTimeoutMs(options && options.timeoutMs, requestTimeoutMs);
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timerId = controller
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : 0;
    try {
      const response = await window.fetch(getRpcUrl(rpcName), {
        method: 'POST',
        headers: getRpcHeaders(),
        body: JSON.stringify(params || {}),
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {})
      });
      const responseText = await response.text();
      let payload = null;
      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch (_error) {
          payload = { message: responseText };
        }
      }
      if (response.ok) {
        return { data: payload, error: null };
      }
      return {
        data: null,
        error: payload && typeof payload === 'object'
          ? {
              ...payload,
              code: normalizeString(payload.code) || String(response.status || ''),
              message: normalizeString(payload.message || payload.error || payload.details || response.statusText || 'Supabase RPC error')
            }
          : {
              code: String(response.status || ''),
              message: normalizeString(response.statusText || 'Supabase RPC error')
            }
      };
    } catch (error) {
      if (error && error.name === 'AbortError') {
        return {
          data: null,
          error: {
            code: 'TIMEOUT',
            message: `Request timeout after ${timeoutMs} ms`
          }
        };
      }
      return {
        data: null,
        error: {
          code: normalizeString(error && error.code),
          message: normalizeString(error && error.message) || 'Failed to fetch'
        }
      };
    } finally {
      if (timerId) window.clearTimeout(timerId);
    }
  }

  function isTransientNetworkErrorLike(error) {
    const text = normalizeString(
      (error && error.message) ||
      (error && error.error_description) ||
      (error && error.details) ||
      (error && error.hint) ||
      error
    ).toUpperCase();
    if (!text) return false;
    return (
      text.indexOf('FAILED TO FETCH') >= 0 ||
      text.indexOf('FETCH FAILED') >= 0 ||
      text.indexOf('ERR_NETWORK_CHANGED') >= 0 ||
      text.indexOf('NETWORK CHANGED') >= 0 ||
      text.indexOf('ERR_HTTP2_PING_FAILED') >= 0 ||
      text.indexOf('HTTP2_PING_FAILED') >= 0 ||
      text.indexOf('LOAD FAILED') >= 0 ||
      text.indexOf('NETWORKERROR') >= 0 ||
      text.indexOf('ERR_INTERNET_DISCONNECTED') >= 0 ||
      text.indexOf('ERR_CONNECTION_CLOSED') >= 0 ||
      text.indexOf('ERR_CONNECTION_RESET') >= 0 ||
      text.indexOf('ERR_TIMED_OUT') >= 0 ||
      text.indexOf('TIMEOUT') >= 0 ||
      text.indexOf('ABORTERROR') >= 0
    );
  }

  async function callRpcWithRetry(name, params, options) {
    const rpcName = normalizeString(name);
    const maxAttempts = Math.max(1, Math.min(3, Number(options && options.maxAttempts) || 1));
    const timeoutMs = normalizeTimeoutMs(options && options.timeoutMs, requestTimeoutMs);
    let lastResult = { data: null, error: null };
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      lastResult = await callRpc(rpcName, params || {}, { timeoutMs });
      if (!lastResult.error) return lastResult;
      if (!isTransientNetworkErrorLike(lastResult.error) || attempt >= maxAttempts) return lastResult;
      await sleep(250 * attempt);
    }
    return lastResult;
  }

  function normalizeObjectId(value) {
    return normalizeString(value);
  }

  function normalizeDataset(value) {
    return normalizeText(value) === 'archive' ? 'archive' : 'registry';
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeVersion(value) {
    const version = Number(value);
    return Number.isFinite(version) && version >= 0 ? Math.floor(version) : 0;
  }

  function safeReadSessionStorage(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (_error) {
      return '';
    }
  }

  function safeWriteSessionStorage(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function safeRemoveSessionStorage(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (_error) {}
  }

  function mapSupabaseError(error) {
    const message = normalizeString(
      error && (
        error.message ||
        error.error_description ||
        error.details ||
        error.hint
      )
    ) || 'Ошибка Supabase API';
    const code = normalizeString(error && error.code);
    if (isTransientNetworkErrorLike(error)) {
      return createShellError('Не удалось связаться с сервером Supabase. Похоже на временный сетевой сбой или блокировку провайдера. Попробуйте повторить вход или включить VPN.', 'NETWORK_UNREACHABLE');
    }
    if (code === 'PGRST202') {
      return createShellError('Supabase backend не развернут. Примените supabase/schema.sql и обновите schema cache.', 'BACKEND_NOT_DEPLOYED');
    }
    if (code === 'PGRST205') {
      return createShellError(`В Supabase отсутствует таблица или view: ${message}`, 'MISSING_TABLE');
    }
    const match = message.match(/^([A-Z_]+):\s*(.+)$/);
    if (match) return createShellError(match[2], match[1]);
    if (code) return createShellError(message, code);
    return createShellError(message);
  }

  async function invokeRpc(name, params) {
    const rpcName = normalizeString(name);
    if (!rpcName) throw createShellError('Не настроено имя RPC-функции', 'CONFIG');
    const { data, error } = await callRpcWithRetry(rpcName, params || {}, {
      maxAttempts: 2,
      timeoutMs: requestTimeoutMs
    });
    if (error) throw mapSupabaseError(error);
    return data;
  }

  function canRetryVersionedRpcWithoutIfVersion(error) {
    const code = normalizeString(error && error.code).toUpperCase();
    const message = normalizeString(
      error && (
        error.message ||
        error.error_description ||
        error.details ||
        error.hint
      )
    );
    return code === 'PGRST202'
      || code === '42883'
      || /p_if_version/i.test(message)
      || (/function\s+.*does not exist/i.test(message) && /sf_get_|mpro_get_/i.test(message));
  }

  async function invokeRpcWithOptionalVersion(name, params, ifVersion) {
    const rpcName = normalizeString(name);
    if (!rpcName) throw createShellError('Не настроено имя RPC-функции', 'CONFIG');
    const baseParams = params && typeof params === 'object' && !Array.isArray(params)
      ? { ...params }
      : {};
    const version = normalizeVersion(ifVersion);
    if (!version) return invokeRpc(rpcName, baseParams);

    let data = null;
    let error = null;

    ({ data, error } = await callRpcWithRetry(rpcName, {
      ...baseParams,
      p_if_version: version
    }, {
      maxAttempts: 2,
      timeoutMs: requestTimeoutMs
    }));

    if (error && canRetryVersionedRpcWithoutIfVersion(error)) {
      ({ data, error } = await callRpcWithRetry(rpcName, baseParams, {
        maxAttempts: 1,
        timeoutMs: requestTimeoutMs
      }));
    }

    if (error) throw mapSupabaseError(error);
    return data;
  }

  function getSourceCatalogEntries(sourceKey) {
    const entries = SOURCE_CATALOG && Array.isArray(SOURCE_CATALOG[sourceKey])
      ? SOURCE_CATALOG[sourceKey]
      : [];
    return entries
      .map(entry => ({
        fieldId: normalizeString(entry && entry.fieldId),
        source: normalizeString(entry && entry.source) || normalizeString(SOURCE_LABELS_BY_KEY[sourceKey]),
        label: normalizeString(entry && entry.label)
      }))
      .filter(entry => entry.fieldId);
  }

  function buildKsgFieldLabelSafe(fieldId) {
    if (Object.prototype.hasOwnProperty.call(KSG_FIELD_LABEL_OVERRIDES, fieldId)) return KSG_FIELD_LABEL_OVERRIDES[fieldId];
    const parts = normalizeString(fieldId).split('_');
    if (parts.length === 3) return `КСГ ${parts[1]}.${parts[2]}`;
    return normalizeString(fieldId);
  }

  function buildKsgColumns(fieldOrder, startIndex, sourceLabel) {
    return (Array.isArray(fieldOrder) ? fieldOrder : []).map((fieldId, index) => ({
      index: startIndex + index,
      fieldId,
      source: sourceLabel,
      label: buildKsgFieldLabelSafe(fieldId)
    }));
  }

  function buildFieldIndexById(columns) {
    const map = new Map();
    (Array.isArray(columns) ? columns : []).forEach((column, index) => {
      map.set(normalizeString(column && column.fieldId), index);
    });
    return map;
  }

  function buildColumnsFromCatalogAndKsg(ksgFieldIds) {
    const columns = [];
    const pushCatalogColumns = (sourceKey) => {
      getSourceCatalogEntries(sourceKey).forEach(entry => {
        columns.push({
          index: columns.length,
          fieldId: entry.fieldId,
          source: entry.source || normalizeString(SOURCE_LABELS_BY_KEY[sourceKey]),
          label: entry.label || entry.fieldId
        });
      });
    };

    pushCatalogColumns('objects');
    pushCatalogColumns('sm');
    buildKsgColumns(ksgFieldIds, columns.length, SOURCE_LABELS_BY_KEY.ksg).forEach(column => columns.push(column));
    ['suid', 'lb', 'ppr', 'mgz'].forEach(pushCatalogColumns);

    return columns.map((column, index) => ({
      index,
      fieldId: normalizeString(column && column.fieldId),
      source: normalizeString(column && column.source),
      label: normalizeString(column && column.label)
    }));
  }

  function buildBundleFromFastPayload(payload, fallbackUser) {
    const ksgFieldIds = Array.from(new Set(
      (Array.isArray(payload && payload.ksgFieldIds) ? payload.ksgFieldIds : [])
        .map(normalizeString)
        .filter(Boolean)
    ));
    const explicitColumns = Array.isArray(payload && payload.columns)
      ? payload.columns
          .map((column, index) => ({
            index: Number.isFinite(Number(column && column.index)) ? Math.floor(Number(column.index)) : index,
            fieldId: normalizeString(column && column.fieldId),
            source: normalizeString(column && column.source),
            label: normalizeString(column && column.label) || normalizeString(column && column.fieldId)
          }))
          .filter(column => column.fieldId)
      : [];
    const columns = explicitColumns.length
      ? explicitColumns
      : buildColumnsFromCatalogAndKsg(ksgFieldIds);
    const rows = (Array.isArray(payload && payload.rows) ? payload.rows : []).map(row => (
      Array.isArray(row) ? row.map(value => normalizeString(value)) : []
    ));
    const objectIds = (Array.isArray(payload && payload.objectIds) ? payload.objectIds : [])
      .map(normalizeObjectId)
      .filter(Boolean);
    const totalRowsRaw = Number(payload && payload.totalRows);
    const totalRows = Number.isFinite(totalRowsRaw) && totalRowsRaw >= rows.length
      ? Math.floor(totalRowsRaw)
      : rows.length;
    const versionRaw = Number(payload && payload.version);
    const currentUser = payload && payload.currentUser && typeof payload.currentUser === 'object'
      ? cloneJson(payload.currentUser)
      : (fallbackUser && typeof fallbackUser === 'object' ? cloneJson(fallbackUser) : null);

    return {
      dataset: normalizeDataset(payload && payload.dataset),
      sheetName: normalizeString(payload && payload.sheetName) || (explicitColumns.length ? 'Archive monitoring' : 'Summary'),
      fetchedAt: normalizeString(payload && payload.fetchedAt) || new Date().toISOString(),
      version: Number.isFinite(versionRaw) ? Math.floor(versionRaw) : 0,
      currentUser,
      columns,
      rows,
      objectIds,
      totalRows,
      fieldIndexById: buildFieldIndexById(columns)
    };
  }

  function serializeBundleForStorage(bundle, sessionToken) {
    return JSON.stringify({
      sessionToken: normalizeString(sessionToken),
      dataset: normalizeDataset(bundle && bundle.dataset),
      sheetName: normalizeString(bundle && bundle.sheetName),
      fetchedAt: normalizeString(bundle && bundle.fetchedAt),
      version: Number.isFinite(Number(bundle && bundle.version)) ? Math.floor(Number(bundle.version)) : 0,
      currentUser: bundle && bundle.currentUser && typeof bundle.currentUser === 'object'
        ? bundle.currentUser
        : null,
      columns: Array.isArray(bundle && bundle.columns) ? bundle.columns : [],
      rows: Array.isArray(bundle && bundle.rows) ? bundle.rows : [],
      objectIds: Array.isArray(bundle && bundle.objectIds) ? bundle.objectIds : [],
      totalRows: Number.isFinite(Number(bundle && bundle.totalRows)) ? Math.floor(Number(bundle.totalRows)) : 0
    });
  }

  function restorePersistedBundle(sessionToken, dataset) {
    const token = normalizeString(sessionToken);
    const datasetMode = normalizeDataset(dataset);
    if (!token) return null;
    const raw = safeReadSessionStorage(PERSISTED_BUNDLE_CACHE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || normalizeString(parsed.sessionToken) !== token || normalizeDataset(parsed.dataset) !== datasetMode) return null;
      const columns = Array.isArray(parsed.columns) ? parsed.columns : [];
      return cacheBundle({
        dataset: datasetMode,
        sheetName: normalizeString(parsed.sheetName) || (datasetMode === 'archive' ? 'Archive monitoring' : 'Summary'),
        fetchedAt: normalizeString(parsed.fetchedAt) || new Date().toISOString(),
        version: Number.isFinite(Number(parsed.version)) ? Math.floor(Number(parsed.version)) : 0,
        currentUser: parsed.currentUser && typeof parsed.currentUser === 'object' ? parsed.currentUser : null,
        columns,
        rows: Array.isArray(parsed.rows) ? parsed.rows : [],
        objectIds: Array.isArray(parsed.objectIds) ? parsed.objectIds : [],
        totalRows: Number.isFinite(Number(parsed.totalRows)) ? Math.floor(Number(parsed.totalRows)) : 0,
        fieldIndexById: buildFieldIndexById(columns)
      }, { sessionToken: token, dataset: datasetMode });
    } catch (_error) {
      safeRemoveSessionStorage(PERSISTED_BUNDLE_CACHE_KEY);
      return null;
    }
  }

  function cacheBundle(bundle, options) {
    bundleCache = {
      ...(bundle || {}),
      dataset: normalizeDataset(bundle && bundle.dataset),
      sheetName: normalizeString(bundle && bundle.sheetName) || (normalizeDataset(bundle && bundle.dataset) === 'archive' ? 'Archive monitoring' : 'Summary')
    };
    const sessionToken = normalizeString(options && options.sessionToken);
    if (sessionToken && bundleCache) {
      safeWriteSessionStorage(PERSISTED_BUNDLE_CACHE_KEY, serializeBundleForStorage(bundleCache, sessionToken));
    }
    return bundleCache;
  }

  async function tryLoadFastBundlePayload(options) {
    const rpcName = normalizeString(RPC.getDataBundle);
    const sessionToken = normalizeString(options && options.sessionToken);
    if (!rpcName || !sessionToken) return null;

    try {
      return await invokeRpc(rpcName, {
        p_session_token: sessionToken,
        p_if_version: Number.isFinite(Number(options && options.ifVersion))
          ? Math.floor(Number(options && options.ifVersion))
          : null,
        p_dataset: normalizeDataset(options && options.dataset)
      });
    } catch (error) {
      const code = normalizeString(error && error.code).toUpperCase();
      if (code === 'BACKEND_NOT_DEPLOYED' || code === 'MISSING_TABLE' || code === '42P01') return null;
      throw error;
    }
  }

  function createStrictDataAccessError() {
    return createShellError(
      'Прямое чтение таблиц отключено. Для загрузки данных требуется RPC sf_get_data_bundle и активная сессия.',
      'SECURE_DATA_LAYER_REQUIRED'
    );
  }

  async function getBundle(options) {
    const settings = options || {};
    const sessionToken = normalizeString(settings.sessionToken);
    const rpcName = normalizeString(RPC.getDataBundle);
    const dataset = normalizeDataset(settings.dataset);
    const canUseFastBundle = !!(sessionToken && rpcName);
    const skipRemoteCheck = !!settings.skipRemoteCheck;
    if (bundleCache && normalizeDataset(bundleCache.dataset) !== dataset) bundleCache = null;
    if (bundleCachePromise && normalizeDataset(bundleCachePromise.dataset) !== dataset) bundleCachePromise = null;
    if (!settings.force && !bundleCache && canUseFastBundle) restorePersistedBundle(sessionToken, dataset);

    if (!settings.force && bundleCache && skipRemoteCheck) return bundleCache;
    if (!settings.force && bundleCachePromise) return bundleCachePromise.promise;
    if (!sessionToken) throw createShellError('Требуется авторизация', 'UNAUTHORIZED');
    if (!rpcName) throw createStrictDataAccessError();

    const pendingPromise = (async () => {
      if (!settings.force && bundleCache && canUseFastBundle && !skipRemoteCheck) {
        const fastPayload = await tryLoadFastBundlePayload({
          sessionToken,
          ifVersion: bundleCache.version,
          dataset
        });
        if (fastPayload) {
          if (fastPayload.changed === false) {
            bundleCache.currentUser = fastPayload.currentUser && typeof fastPayload.currentUser === 'object'
              ? cloneJson(fastPayload.currentUser)
              : bundleCache.currentUser;
            bundleCache.fetchedAt = normalizeString(fastPayload.fetchedAt) || bundleCache.fetchedAt;
            if (Number.isFinite(Number(fastPayload.version))) bundleCache.version = Math.floor(Number(fastPayload.version));
            return bundleCache;
          }
          return cacheBundle(buildBundleFromFastPayload(fastPayload, bundleCache.currentUser), { sessionToken, dataset });
        }
        throw createStrictDataAccessError();
      }

      if (canUseFastBundle) {
        const fastPayload = await tryLoadFastBundlePayload({ sessionToken, dataset });
        if (fastPayload) {
          if (fastPayload.changed === false && bundleCache) return bundleCache;
          return cacheBundle(buildBundleFromFastPayload(fastPayload, bundleCache && bundleCache.currentUser), { sessionToken, dataset });
        }
      }

      throw createStrictDataAccessError();
    })()
      .finally(() => {
        if (bundleCachePromise && normalizeDataset(bundleCachePromise.dataset) === dataset) {
          bundleCachePromise = null;
        }
      });

    bundleCachePromise = { dataset, promise: pendingPromise };
    return pendingPromise;
  }

  function invalidateBundleCache() {
    bundleCache = null;
    bundleCachePromise = null;
    safeRemoveSessionStorage(PERSISTED_BUNDLE_CACHE_KEY);
  }

  async function requireSession(sessionToken) {
    const token = normalizeString(sessionToken);
    if (!token) throw createShellError('Требуется авторизация', 'UNAUTHORIZED');
    const result = await invokeRpc(RPC.getSessionUser, { p_session_token: token });
    const user = result && typeof result === 'object' && result.user ? result.user : result;
    if (!user || typeof user !== 'object') throw createShellError('Требуется авторизация', 'UNAUTHORIZED');
    return {
      user: {
        name: normalizeString(user.name) || 'Пользователь',
        role: normalizeString(user.role) || 'Пользователь',
        division: normalizeString(user.division),
        apps: cloneJson(user.apps && typeof user.apps === 'object' ? user.apps : {}),
        allowedApps: cloneJson(Array.isArray(user.allowedApps || user.allowed_apps) ? (user.allowedApps || user.allowed_apps) : []),
        loginTime: normalizeString(user.loginTime),
        spreadsheetId: 'supabase'
      },
      expiresAt: normalizeString(result && result.expiresAt)
    };
  }

  function buildDataResponse(bundle, user, options) {
    const totalRows = Number(bundle && bundle.totalRows) || 0;
    const maxRowsRaw = Number(options && options.maxRows);
    const effectiveMaxRows = Number.isFinite(maxRowsRaw) && maxRowsRaw > 0
      ? Math.floor(maxRowsRaw)
      : totalRows;
    const rows = (bundle && Array.isArray(bundle.rows) ? bundle.rows : []).slice(0, effectiveMaxRows);
    const objectIds = (bundle && Array.isArray(bundle.objectIds) ? bundle.objectIds : []).slice(0, effectiveMaxRows);

    return {
      columns: Array.isArray(bundle && bundle.columns) ? bundle.columns : [],
      rows,
      objectIds,
      totalRows,
      returnedRows: rows.length,
      truncated: rows.length < totalRows,
      spreadsheetName: 'Supabase',
      sheetName: normalizeString(bundle && bundle.sheetName) || (normalizeDataset(bundle && bundle.dataset) === 'archive' ? 'Archive monitoring' : 'Summary'),
      dataset: normalizeDataset(bundle && bundle.dataset),
      fetchedAt: normalizeString(bundle && bundle.fetchedAt) || new Date().toISOString(),
      headerRow: 3,
      fieldIdRow: 1,
      sourceRow: 2,
      currentUser: user || (bundle && bundle.currentUser) || {}
    };
  }

  function peekBundleCache(options) {
    const settings = options || {};
    const dataset = normalizeDataset(settings.dataset);
    const sessionToken = normalizeString(settings.sessionToken);
    if (bundleCache && normalizeDataset(bundleCache.dataset) !== dataset) bundleCache = null;
    if (!bundleCache && sessionToken) restorePersistedBundle(sessionToken, dataset);
    if (!bundleCache) return null;
    return buildDataResponse(bundleCache, bundleCache.currentUser || null, settings);
  }

  function getFieldValueFromBundle(bundle, rowIndex, fieldId) {
    const index = bundle && bundle.fieldIndexById instanceof Map
      ? bundle.fieldIndexById.get(normalizeString(fieldId))
      : -1;
    if (!Number.isFinite(index) || index < 0) return '';
    const row = bundle && Array.isArray(bundle.rows) ? bundle.rows[rowIndex] : null;
    return normalizeString(row && row[index]);
  }

  function getBlockInfo(user) {
    const blockName = normalizeString(user && user.division);
    return {
      key: normalizeText(blockName),
      name: blockName
    };
  }

  function buildEmptyWorkState(selectionId, user) {
    const blockInfo = getBlockInfo(user);
    return {
      selectionId: normalizeString(selectionId),
      blockKey: blockInfo.key,
      blockName: blockInfo.name,
      items: []
    };
  }

  function getCachedBootstrap(options) {
    const cached = options && options.cachedBootstrap && typeof options.cachedBootstrap === 'object'
      ? options.cachedBootstrap
      : null;
    return cached ? cloneJson(cached) : null;
  }

  function getCachedBootstrapVersion(cachedBootstrap, key) {
    return normalizeVersion(cachedBootstrap && cachedBootstrap[key]);
  }

  function getCachedOverlayPayload(cachedBootstrap, key) {
    const fallback = cachedBootstrap && cachedBootstrap[key] && typeof cachedBootstrap[key] === 'object'
      ? cloneJson(cachedBootstrap[key])
      : { rows: [] };
    if (!Array.isArray(fallback.rows)) fallback.rows = [];
    fallback.version = normalizeVersion(fallback.version);
    fallback.fetchedAt = normalizeString(fallback.fetchedAt);
    return fallback;
  }

  function resolveVersionedOverlayPayload(payload, fallbackPayload, fallbackVersion) {
    if (payload && typeof payload === 'object' && payload.changed === false) {
      const resolvedFallback = fallbackPayload && typeof fallbackPayload === 'object'
        ? cloneJson(fallbackPayload)
        : { rows: [] };
      if (!Array.isArray(resolvedFallback.rows)) resolvedFallback.rows = [];
      resolvedFallback.version = normalizeVersion(payload.version) || normalizeVersion(fallbackVersion);
      resolvedFallback.fetchedAt = normalizeString(payload.fetchedAt) || normalizeString(resolvedFallback.fetchedAt) || new Date().toISOString();
      return resolvedFallback;
    }
    const resolved = payload && typeof payload === 'object'
      ? cloneJson(payload)
      : { rows: [] };
    if (!Array.isArray(resolved.rows)) resolved.rows = [];
    resolved.version = normalizeVersion(resolved.version);
    resolved.fetchedAt = normalizeString(resolved.fetchedAt) || new Date().toISOString();
    return resolved;
  }

  function getCachedSharedSelectionsItems(cachedBootstrap) {
    return Array.isArray(cachedBootstrap && cachedBootstrap.sharedSelections)
      ? cloneJson(cachedBootstrap.sharedSelections)
      : [];
  }

  function resolveSharedSelectionsPayload(payload, cachedBootstrap) {
    if (payload && typeof payload === 'object' && payload.changed === false) {
      return {
        items: getCachedSharedSelectionsItems(cachedBootstrap),
        version: normalizeVersion(payload.version) || getCachedBootstrapVersion(cachedBootstrap, 'sharedSelectionsVersion'),
        fetchedAt: normalizeString(payload.fetchedAt) || new Date().toISOString()
      };
    }
    if (Array.isArray(payload)) {
      return {
        items: cloneJson(payload),
        version: 0,
        fetchedAt: new Date().toISOString()
      };
    }
    return {
      items: Array.isArray(payload && payload.items) ? cloneJson(payload.items) : [],
      version: normalizeVersion(payload && payload.version),
      fetchedAt: normalizeString(payload && payload.fetchedAt) || new Date().toISOString()
    };
  }

  function getCachedSharedSelectionWork(cachedBootstrap, selectionId, user) {
    const fallback = cachedBootstrap && cachedBootstrap.sharedSelectionWork && typeof cachedBootstrap.sharedSelectionWork === 'object'
      ? cloneJson(cachedBootstrap.sharedSelectionWork)
      : buildEmptyWorkState(selectionId, user);
    if (normalizeString(fallback.selectionId) !== normalizeString(selectionId)) {
      return buildEmptyWorkState(selectionId, user);
    }
    if (!Array.isArray(fallback.items)) fallback.items = [];
    return fallback;
  }

  function resolveSharedSelectionWorkPayload(payload, cachedBootstrap, selectionId, user) {
    if (payload && typeof payload === 'object' && payload.changed === false) {
      return {
        workState: getCachedSharedSelectionWork(cachedBootstrap, selectionId, user),
        version: normalizeVersion(payload.version) || getCachedBootstrapVersion(cachedBootstrap, 'sharedSelectionWorkVersion')
      };
    }
    const workState = payload && typeof payload === 'object'
      ? cloneJson(payload)
      : buildEmptyWorkState(selectionId, user);
    if (!Array.isArray(workState.items)) workState.items = [];
    workState.selectionId = normalizeString(workState.selectionId || selectionId);
    return {
      workState,
      version: normalizeVersion(workState.version)
    };
  }

  function normalizeEditPayload(bundle, rawEdits) {
    const edits = Array.isArray(rawEdits) ? rawEdits : [];
    const out = [];

    edits.forEach(edit => {
      const rowIndex = Number(edit && edit.rowIndex);
      const colIndex = Number(edit && edit.colIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
      if (!Number.isFinite(colIndex) || colIndex < 0) return;

      const objectId = normalizeObjectId(bundle && bundle.objectIds && bundle.objectIds[rowIndex]);
      const column = bundle && Array.isArray(bundle.columns) ? bundle.columns[colIndex] : null;
      if (!objectId || !column || !normalizeString(column.fieldId)) return;

      out.push({
        row_index: rowIndex,
        col_index: colIndex,
        object_id: objectId,
        field_id: normalizeString(column.fieldId),
        field_label: normalizeString(column.label),
        value: String(edit && edit.value != null ? edit.value : ''),
        old_value: normalizeString(bundle && bundle.rows && bundle.rows[rowIndex] && bundle.rows[rowIndex][colIndex]),
        uin: getFieldValueFromBundle(bundle, rowIndex, 'ro_1_3')
      });
    });

    return out;
  }

  function normalizeRowIndexes(rawRowIndexes) {
    return Array.from(new Set(
      (Array.isArray(rawRowIndexes) ? rawRowIndexes : [])
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value >= 0)
        .map(value => Math.floor(value))
    )).sort((left, right) => left - right);
  }

  function resolveObjectIdsFromRowIndexes(bundle, rawRowIndexes) {
    return normalizeRowIndexes(rawRowIndexes)
      .map(rowIndex => ({
        rowIndex,
        objectId: normalizeObjectId(bundle && bundle.objectIds && bundle.objectIds[rowIndex])
      }))
      .filter(item => item.objectId)
      .map(item => ({
        rowIndex: item.rowIndex,
        objectId: item.objectId
      }));
  }

  function normalizePublishVisitRequests(bundle, rawRequests) {
    return (Array.isArray(rawRequests) ? rawRequests : [])
      .map(item => {
        const rowIndex = Number(item && item.rowIndex);
        const normalizedRowIndex = Number.isFinite(rowIndex) && rowIndex >= 0 ? Math.floor(rowIndex) : -1;
        const objectId = normalizeObjectId(
          item && item.objectId ||
          (normalizedRowIndex >= 0 && bundle && bundle.objectIds ? bundle.objectIds[normalizedRowIndex] : '')
        );
        return {
          rowIndex: normalizedRowIndex,
          objectId,
          divisionCode: normalizeString(item && item.divisionCode),
          inspectorName: normalizeString(item && item.inspectorName)
        };
      })
      .filter(item => item.objectId);
  }

  async function auth(options) {
    const password = normalizeString(options && options.password);
    const remember = !!(options && options.remember);
    if (!password) throw createShellError('Пароль обязателен', 'AUTH_INPUT');
    const result = await invokeRpc(RPC.auth, {
      p_password: password,
      p_remember: remember
    });
    return result && typeof result === 'object' ? result : {};
  }

  async function authWithIdentity(options) {
    const identity = normalizeIdentity(options && (options.name || options.identity || options.login));
    const password = normalizeString(options && options.password);
    const remember = !!(options && options.remember);
    const skipClientValidation = !!(options && options.skipClientValidation);

    if (!identity && !skipClientValidation) throw createShellError('Логин или имя обязательны', 'AUTH_INPUT');
    if (!password && !skipClientValidation) throw createShellError('Пароль обязателен', 'AUTH_INPUT');

    let data = null;
    let error = null;

    ({ data, error } = await callRpcWithRetry(RPC.auth, {
      p_name: identity,
      p_password: password,
      p_remember: remember
    }, {
      maxAttempts: 2,
      timeoutMs: authRequestTimeoutMs
    }));

    if (error) {
      const errorMessage = normalizeString(
        error.message ||
        error.error_description ||
        error.details ||
        error.hint
      );
      const canUseLegacyPasswordOnlyFallback =
        normalizeString(error.code) === 'PGRST202' ||
        /p_name/i.test(errorMessage);

      if (!canUseLegacyPasswordOnlyFallback) {
        throw mapSupabaseError(error);
      }

      let legacyData = null;
      let legacyError = null;
      ({ data: legacyData, error: legacyError } = await callRpcWithRetry(RPC.auth, {
        p_password: password,
        p_remember: remember
      }, {
        maxAttempts: 1,
        timeoutMs: authRequestTimeoutMs
      }));
      if (legacyError) throw mapSupabaseError(legacyError);
      const legacyResult = legacyData && typeof legacyData === 'object' ? legacyData : {};
      if (legacyResult && typeof legacyResult === 'object') {
        legacyResult.legacyPasswordOnly = true;
      }
      return legacyResult;
    }

    return data && typeof data === 'object' ? data : {};
  }

  async function getSmartFilterShellData(options) {
    const bundle = await getBundle({
      sessionToken: options && options.sessionToken,
      force: !!(options && options.force),
      dataset: options && options.dataset
    });
    if (bundle && bundle.currentUser) {
      return buildDataResponse(bundle, bundle.currentUser, options);
    }
    const session = await requireSession(options && options.sessionToken);
    if (bundle) bundle.currentUser = cloneJson(session.user);
    return buildDataResponse(bundle, session.user, options);
  }

  async function getSmartFilterShellBootstrap(options) {
    const settings = options || {};
    const sessionToken = normalizeString(settings.sessionToken);
    const selectionId = normalizeString(options && options.activeSelectionId);
    const cachedBootstrap = !settings.force ? getCachedBootstrap(settings) : null;
    const bundlePromise = getBundle({
      sessionToken,
      force: !!settings.force,
      dataset: settings.dataset
    });
    const monitoringOverlayPromise = invokeRpcWithOptionalVersion(RPC.getMonitoringOverlay, {
      p_session_token: sessionToken
    }, settings.force ? 0 : getCachedBootstrapVersion(cachedBootstrap, 'monitoringOverlayVersion'));
    const mapOverlayPromise = invokeRpcWithOptionalVersion(RPC.getRegistryMapOverlay, {
      p_session_token: sessionToken
    }, settings.force ? 0 : getCachedBootstrapVersion(cachedBootstrap, 'mapOverlayVersion'));
    const selectionsPromise = invokeRpcWithOptionalVersion(RPC.getSharedSelections, {
      p_session_token: sessionToken
    }, settings.force ? 0 : getCachedBootstrapVersion(cachedBootstrap, 'sharedSelectionsVersion'));
    const workPromise = selectionId
      ? invokeRpcWithOptionalVersion(RPC.getSharedSelectionWorkState, {
          p_session_token: sessionToken,
          p_selection_id: selectionId
        }, settings.force
          ? 0
          : (
              normalizeString(
                cachedBootstrap &&
                cachedBootstrap.sharedSelectionWork &&
                cachedBootstrap.sharedSelectionWork.selectionId
              ) === selectionId
                ? getCachedBootstrapVersion(cachedBootstrap, 'sharedSelectionWorkVersion')
                : 0
            ))
      : Promise.resolve(null);

    const [bundle, monitoringOverlay, mapOverlay, sharedSelections, sharedSelectionWork] = await Promise.all([
      bundlePromise,
      monitoringOverlayPromise,
      mapOverlayPromise,
      selectionsPromise,
      workPromise
    ]);
    const session = bundle && bundle.currentUser
      ? { user: cloneJson(bundle.currentUser) }
      : await requireSession(sessionToken);
    if (bundle && !bundle.currentUser) bundle.currentUser = cloneJson(session.user);
    const resolvedMonitoringOverlay = resolveVersionedOverlayPayload(
      monitoringOverlay,
      getCachedOverlayPayload(cachedBootstrap, 'monitoringOverlay'),
      getCachedBootstrapVersion(cachedBootstrap, 'monitoringOverlayVersion')
    );
    const resolvedMapOverlay = resolveVersionedOverlayPayload(
      mapOverlay,
      getCachedOverlayPayload(cachedBootstrap, 'mapOverlay'),
      getCachedBootstrapVersion(cachedBootstrap, 'mapOverlayVersion')
    );
    const resolvedSharedSelections = resolveSharedSelectionsPayload(sharedSelections, cachedBootstrap);
    const resolvedSharedSelectionWork = resolveSharedSelectionWorkPayload(
      sharedSelectionWork,
      cachedBootstrap,
      selectionId,
      session.user
    );

    return {
      data: buildDataResponse(bundle, session.user, settings),
      monitoringOverlay: resolvedMonitoringOverlay,
      monitoringOverlayVersion: resolvedMonitoringOverlay.version,
      mapOverlay: resolvedMapOverlay,
      mapOverlayVersion: resolvedMapOverlay.version,
      sharedSelections: resolvedSharedSelections.items,
      sharedSelectionsVersion: resolvedSharedSelections.version,
      sharedSelectionWork: resolvedSharedSelectionWork.workState,
      sharedSelectionWorkVersion: resolvedSharedSelectionWork.version
    };
  }

  async function getSmartFilterShellObjectMonitoringHistory(options) {
    await requireSession(options && options.sessionToken);
    const result = await invokeRpc(RPC.getObjectMonitoringHistory, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_object_id: normalizeString(options && options.objectId)
    });
    return result && typeof result === 'object' ? result : { rows: [] };
  }

  async function getSmartFilterShellArchiveMonitoring(options) {
    await requireSession(options && options.sessionToken);
    const limitRaw = Number(options && options.limit);
    const result = await invokeRpc(RPC.getArchiveMonitoring, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_limit: Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null
    });
    return result && typeof result === 'object' ? result : { rows: [] };
  }

  async function getSmartFilterShellObjectLabStudiesHistory(options) {
    await requireSession(options && options.sessionToken);
    const result = await invokeRpc(RPC.getObjectLabStudiesHistory, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_object_id: normalizeString(options && options.objectId)
    });
    return result && typeof result === 'object' ? result : { rows: [] };
  }

  async function getSmartFilterShellLabStudyInspectors(options) {
    await requireSession(options && options.sessionToken);
    const result = await invokeRpc(RPC.getLabStudyInspectors, {
      p_session_token: normalizeString(options && options.sessionToken)
    });
    return result && typeof result === 'object' ? result : { rows: [] };
  }

  async function getSmartFilterShellMproInspectorDirectory(options) {
    await requireSession(options && options.sessionToken);
    const result = await invokeRpc(RPC.getMproInspectorDirectory, {
      p_session_token: normalizeString(options && options.sessionToken)
    });
    return result && typeof result === 'object'
      ? result
      : { inspectorsList: [], inspectorsConfig: {}, inspectorsHomes: {} };
  }

  async function createSmartFilterShellLabStudy(options) {
    await requireSession(options && options.sessionToken);
    return invokeRpc(RPC.createLabStudy, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_payload: options || {}
    });
  }

  async function getSmartFilterShellSharedSelections(options) {
    await requireSession(options && options.sessionToken);
    const result = await invokeRpc(RPC.getSharedSelections, {
      p_session_token: normalizeString(options && options.sessionToken)
    });
    return Array.isArray(result)
      ? result
      : (Array.isArray(result && result.items) ? result.items : []);
  }

  async function getSmartFilterShellSharedSelectionWorkState(options) {
    const session = await requireSession(options && options.sessionToken);
    const selectionId = normalizeString(options && options.selectionId);
    if (!selectionId) return buildEmptyWorkState(selectionId, session.user);

    const result = await invokeRpc(RPC.getSharedSelectionWorkState, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_selection_id: selectionId
    });
    return result && typeof result === 'object' ? result : buildEmptyWorkState(selectionId, session.user);
  }

  async function saveSmartFilterShellSharedSelection(options) {
    await requireSession(options && options.sessionToken);
    return invokeRpc(RPC.saveSharedSelection, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_payload: options || {}
    });
  }

  async function publishSmartFilterShellSelectionToMpro(options) {
    const session = await requireSession(options && options.sessionToken);
    const bundle = await getBundle({
      sessionToken: options && options.sessionToken,
      skipRemoteCheck: true
    });
    const resolved = resolveObjectIdsFromRowIndexes(bundle, options && options.rowIndexes);
    const visitRequests = normalizePublishVisitRequests(bundle, options && options.visitRequests);
    const result = await invokeRpc(RPC.publishSelectionToMpro, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_payload: {
        selectionId: normalizeString(options && options.selectionId),
        selectionName: normalizeString(options && options.selectionName),
        targetDivision:
          normalizeString(options && options.targetDivision) ||
          normalizeString(
            session &&
            session.user &&
            session.user.apps &&
            session.user.apps.mpro &&
            session.user.apps.mpro.division
          ) ||
          normalizeString(session && session.user && session.user.division) ||
          'map',
        divisionCode:
          normalizeString(options && options.divisionCode) ||
          normalizeString(options && options.targetDivision) ||
          normalizeString(
            session &&
            session.user &&
            session.user.apps &&
            session.user.apps.mpro &&
            session.user.apps.mpro.division
          ) ||
          normalizeString(session && session.user && session.user.division) ||
          'map',
        mode: normalizeString(options && options.mode) || 'append',
        objectIds: resolved.map(item => item.objectId),
        visitRequests
      }
    });
    return result && typeof result === 'object'
      ? {
          ...result,
          resolvedRows: resolved.map(item => item.rowIndex)
        }
      : {
          success: true,
          resolvedRows: resolved.map(item => item.rowIndex)
        };
  }

  async function removeSmartFilterShellRegistryObjectsFromMproMap(options) {
    await requireSession(options && options.sessionToken);
    const bundle = await getBundle({
      sessionToken: options && options.sessionToken,
      skipRemoteCheck: true
    });
    const resolved = resolveObjectIdsFromRowIndexes(bundle, options && options.rowIndexes);
    const result = await invokeRpc(RPC.removeRegistryObjectsFromMproMap, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_payload: {
        objectIds: resolved.map(item => item.objectId),
        divisionCode: normalizeString(options && options.divisionCode),
        visitIds: (Array.isArray(options && options.visitIds) ? options.visitIds : [])
          .map(value => normalizeString(value))
          .filter(Boolean)
      }
    });
    return result && typeof result === 'object'
      ? {
          ...result,
          resolvedRows: resolved.map(item => item.rowIndex)
        }
      : {
          success: true,
          resolvedRows: resolved.map(item => item.rowIndex)
        };
  }

  async function saveSmartFilterShellSharedSelectionWorkState(options) {
    await requireSession(options && options.sessionToken);
    return invokeRpc(RPC.saveSharedSelectionWorkState, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_payload: options || {}
    });
  }

  async function saveSmartFilterShellSharedSelectionWorkBatch(options) {
    await requireSession(options && options.sessionToken);
    return invokeRpc(RPC.saveSharedSelectionWorkBatch, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_payload: options || {}
    });
  }

  async function deleteSmartFilterShellSharedSelection(options) {
    await requireSession(options && options.sessionToken);
    return invokeRpc(RPC.deleteSharedSelection, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_selection_id: normalizeString(options && options.selectionId)
    });
  }

  async function deleteSmartFilterShellRegistryRows(options) {
    await requireSession(options && options.sessionToken);
    const bundle = await getBundle({
      sessionToken: options && options.sessionToken,
      skipRemoteCheck: true
    });
    const resolved = resolveObjectIdsFromRowIndexes(bundle, options && options.rowIndexes);
    const result = await invokeRpc(RPC.deleteRegistryRows, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_object_ids: resolved.map(item => item.objectId)
    });
    invalidateBundleCache();
    return {
      ...(result && typeof result === 'object' ? result : {}),
      deletedRows: Array.isArray(resolved) ? resolved.length : 0,
      deletedRowIndexes: resolved.map(item => item.rowIndex)
    };
  }

  async function addSmartFilterShellRegistryRow(options) {
    await requireSession(options && options.sessionToken);
    const result = await invokeRpc(RPC.addRegistryRow, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_values: options && options.values ? options.values : {}
    });
    invalidateBundleCache();
    return result && typeof result === 'object' ? result : {};
  }

  async function saveSmartFilterShellEdits(options) {
    await requireSession(options && options.sessionToken);
    const bundle = await getBundle({
      sessionToken: options && options.sessionToken,
      skipRemoteCheck: true
    });
    const edits = normalizeEditPayload(bundle, options && options.edits);
    if (!edits.length) {
      return {
        updatedCells: 0,
        updatedRows: 0,
        logEntries: 0,
        savedAt: new Date().toISOString()
      };
    }

    const result = await invokeRpc(RPC.saveEdits, {
      p_session_token: normalizeString(options && options.sessionToken),
      p_payload: edits
    });
    invalidateBundleCache();
    return result && typeof result === 'object'
      ? result
      : {
          updatedCells: edits.length,
          updatedRows: Array.from(new Set(edits.map(item => item.row_index))).length,
          logEntries: edits.length,
          savedAt: new Date().toISOString()
        };
  }

  async function run(method, options) {
    const handlers = {
      auth: authWithIdentity,
      getSmartFilterShellData,
      getSmartFilterShellBootstrap,
      getSmartFilterShellArchiveMonitoring,
      getSmartFilterShellObjectMonitoringHistory,
      getSmartFilterShellObjectLabStudiesHistory,
      getSmartFilterShellLabStudyInspectors,
      getSmartFilterShellMproInspectorDirectory,
      createSmartFilterShellLabStudy,
      getSmartFilterShellSharedSelections,
      getSmartFilterShellSharedSelectionWorkState,
      saveSmartFilterShellSharedSelection,
      publishSmartFilterShellSelectionToMpro,
      removeSmartFilterShellRegistryObjectsFromMproMap,
      saveSmartFilterShellSharedSelectionWorkState,
      saveSmartFilterShellSharedSelectionWorkBatch,
      deleteSmartFilterShellSharedSelection,
      deleteSmartFilterShellRegistryRows,
      addSmartFilterShellRegistryRow,
      saveSmartFilterShellEdits
    };

    const handler = handlers[normalizeString(method)];
    if (!handler) throw createShellError(`Unsupported method "${normalizeString(method) || '-'}"`, 'BAD_METHOD');
    return handler(options || {});
  }

  window.SupabaseShellApi = {
    run,
    invalidateBundleCache,
    peekBundleCache
  };
})();


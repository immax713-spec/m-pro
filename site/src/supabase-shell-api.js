(function () {
  'use strict';

  const config = window.SUPABASE_MPRO_CONFIG || {};

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    window.SupabaseShellApi = {
      run() {
        return Promise.reject(new Error('Supabase client library is not loaded.'));
      }
    };
    return;
  }

  const supabase = window.supabase.createClient(
    String(config.supabaseUrl || '').trim(),
    String(config.supabaseAnonKey || '').trim(),
    {
      db: { schema: String(config.schema || 'public').trim() || 'public' },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );

  const RPC = config.rpc || {};
  const SOURCE_CATALOG = window.MPRO_SOURCE_CATALOG && typeof window.MPRO_SOURCE_CATALOG === 'object'
    ? window.MPRO_SOURCE_CATALOG
    : {};
  const PERSISTED_BUNDLE_CACHE_KEY = 'smart_filter_shell_bundle_cache_v2';

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
    ksg_5_2: 'Начало СМР Дата начала план (этал.график)',
    ksg_12_3: 'Фактическая дата окончания  (этал.график)',
    ksg_12_4: '№ РВ'
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

  function normalizeObjectId(value) {
    const text = normalizeString(value);
    if (!text) return '';
    const number = Number(text);
    if (Number.isFinite(number)) return String(Math.trunc(number));
    return text;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
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
    const { data, error } = await supabase.rpc(rpcName, params || {});
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
    const columns = buildColumnsFromCatalogAndKsg(ksgFieldIds);
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
      fetchedAt: normalizeString(bundle && bundle.fetchedAt),
      version: Number.isFinite(Number(bundle && bundle.version)) ? Math.floor(Number(bundle.version)) : 0,
      currentUser: bundle && bundle.currentUser && typeof bundle.currentUser === 'object'
        ? cloneJson(bundle.currentUser)
        : null,
      columns: cloneJson(Array.isArray(bundle && bundle.columns) ? bundle.columns : []),
      rows: cloneJson(Array.isArray(bundle && bundle.rows) ? bundle.rows : []),
      objectIds: cloneJson(Array.isArray(bundle && bundle.objectIds) ? bundle.objectIds : []),
      totalRows: Number.isFinite(Number(bundle && bundle.totalRows)) ? Math.floor(Number(bundle.totalRows)) : 0
    });
  }

  function restorePersistedBundle(sessionToken) {
    const token = normalizeString(sessionToken);
    if (!token) return null;
    const raw = safeReadSessionStorage(PERSISTED_BUNDLE_CACHE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || normalizeString(parsed.sessionToken) !== token) return null;
      const columns = cloneJson(Array.isArray(parsed.columns) ? parsed.columns : []);
      return cacheBundle({
        fetchedAt: normalizeString(parsed.fetchedAt) || new Date().toISOString(),
        version: Number.isFinite(Number(parsed.version)) ? Math.floor(Number(parsed.version)) : 0,
        currentUser: parsed.currentUser && typeof parsed.currentUser === 'object' ? cloneJson(parsed.currentUser) : null,
        columns,
        rows: cloneJson(Array.isArray(parsed.rows) ? parsed.rows : []),
        objectIds: cloneJson(Array.isArray(parsed.objectIds) ? parsed.objectIds : []),
        totalRows: Number.isFinite(Number(parsed.totalRows)) ? Math.floor(Number(parsed.totalRows)) : 0,
        fieldIndexById: buildFieldIndexById(columns)
      }, { sessionToken: token });
    } catch (_error) {
      safeRemoveSessionStorage(PERSISTED_BUNDLE_CACHE_KEY);
      return null;
    }
  }

  function cacheBundle(bundle, options) {
    bundleCache = bundle;
    const sessionToken = normalizeString(options && options.sessionToken);
    if (sessionToken && bundle) {
      safeWriteSessionStorage(PERSISTED_BUNDLE_CACHE_KEY, serializeBundleForStorage(bundle, sessionToken));
    }
    return bundle;
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
          : null
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
    const canUseFastBundle = !!(sessionToken && rpcName);
    const skipRemoteCheck = !!settings.skipRemoteCheck;
    if (!settings.force && !bundleCache && canUseFastBundle) restorePersistedBundle(sessionToken);

    if (!settings.force && bundleCache && skipRemoteCheck) return bundleCache;
    if (!settings.force && bundleCachePromise) return bundleCachePromise;
    if (!sessionToken) throw createShellError('Требуется авторизация', 'UNAUTHORIZED');
    if (!rpcName) throw createStrictDataAccessError();

    bundleCachePromise = (async () => {
      if (!settings.force && bundleCache && canUseFastBundle && !skipRemoteCheck) {
        const fastPayload = await tryLoadFastBundlePayload({
          sessionToken,
          ifVersion: bundleCache.version
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
          return cacheBundle(buildBundleFromFastPayload(fastPayload, bundleCache.currentUser), { sessionToken });
        }
        throw createStrictDataAccessError();
      }

      if (canUseFastBundle) {
        const fastPayload = await tryLoadFastBundlePayload({ sessionToken });
        if (fastPayload) {
          if (fastPayload.changed === false && bundleCache) return bundleCache;
          return cacheBundle(buildBundleFromFastPayload(fastPayload, bundleCache && bundleCache.currentUser), { sessionToken });
        }
      }

      throw createStrictDataAccessError();
    })()
      .finally(() => {
        bundleCachePromise = null;
      });

    return bundleCachePromise;
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

    return {
      columns: cloneJson(Array.isArray(bundle && bundle.columns) ? bundle.columns : []),
      rows: cloneJson(rows),
      totalRows,
      returnedRows: rows.length,
      truncated: rows.length < totalRows,
      spreadsheetName: 'Supabase',
      sheetName: 'Сводная',
      fetchedAt: normalizeString(bundle && bundle.fetchedAt) || new Date().toISOString(),
      headerRow: 3,
      fieldIdRow: 1,
      sourceRow: 2,
      currentUser: cloneJson(user || (bundle && bundle.currentUser) || {})
    };
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
        object_id: Number(objectId),
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
        objectId: Number(item.objectId)
      }));
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

  async function getSmartFilterShellData(options) {
    const bundle = await getBundle({
      sessionToken: options && options.sessionToken,
      force: !!(options && options.force)
    });
    if (bundle && bundle.currentUser) {
      return buildDataResponse(bundle, bundle.currentUser, options);
    }
    const session = await requireSession(options && options.sessionToken);
    if (bundle) bundle.currentUser = cloneJson(session.user);
    return buildDataResponse(bundle, session.user, options);
  }

  async function getSmartFilterShellBootstrap(options) {
    const selectionId = normalizeString(options && options.activeSelectionId);
    const bundlePromise = getBundle({
      sessionToken: options && options.sessionToken,
      force: !!(options && options.force)
    });
    const selectionsPromise = invokeRpc(RPC.getSharedSelections, {
      p_session_token: normalizeString(options && options.sessionToken)
    });
    const workPromise = selectionId
      ? invokeRpc(RPC.getSharedSelectionWorkState, {
          p_session_token: normalizeString(options && options.sessionToken),
          p_selection_id: selectionId
        })
      : Promise.resolve(null);

    const [bundle, sharedSelections, sharedSelectionWork] = await Promise.all([
      bundlePromise,
      selectionsPromise,
      workPromise
    ]);
    const session = bundle && bundle.currentUser
      ? { user: cloneJson(bundle.currentUser) }
      : await requireSession(options && options.sessionToken);
    if (bundle && !bundle.currentUser) bundle.currentUser = cloneJson(session.user);

    return {
      data: buildDataResponse(bundle, session.user, options),
      sharedSelections: Array.isArray(sharedSelections) ? sharedSelections : [],
      sharedSelectionWork: sharedSelectionWork && typeof sharedSelectionWork === 'object'
        ? sharedSelectionWork
        : buildEmptyWorkState(selectionId, session.user)
    };
  }

  async function getSmartFilterShellSharedSelections(options) {
    await requireSession(options && options.sessionToken);
    const result = await invokeRpc(RPC.getSharedSelections, {
      p_session_token: normalizeString(options && options.sessionToken)
    });
    return Array.isArray(result) ? result : [];
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
      auth,
      getSmartFilterShellData,
      getSmartFilterShellBootstrap,
      getSmartFilterShellSharedSelections,
      getSmartFilterShellSharedSelectionWorkState,
      saveSmartFilterShellSharedSelection,
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
    invalidateBundleCache
  };
})();

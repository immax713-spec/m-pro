/**
         * ============================================
         * M-PRO: модульная архитектура приложения
         * ============================================
         *
         * Структура модулей:
         * 1. CONFIG    - константы и конфигурация
         * 2. STATE     - управление состоянием приложения
         * 3. UTILS     - вспомогательные функции
         * 4. API       - взаимодействие с внешними API (GAS, Яндекс)
         * 5. UI        - рендеринг интерфейса
         * 6. MAP       - карта и управление объектами
         * 7. AUTH      - авторизация
         * 8. INIT      - инициализация приложения
         * ============================================
         */

        // ============================================
        // Модуль конфигурации
        // ============================================
        
        const MPRO_RUNTIME_OVERRIDES = window.__M_PRO_APP_CONFIG && typeof window.__M_PRO_APP_CONFIG === 'object'
            ? window.__M_PRO_APP_CONFIG
            : {};
        const MPRO_BACKEND_OVERRIDES = MPRO_RUNTIME_OVERRIDES.backend && typeof MPRO_RUNTIME_OVERRIDES.backend === 'object'
            ? MPRO_RUNTIME_OVERRIDES.backend
            : {};
        const MPRO_REFRESH_OVERRIDES = MPRO_RUNTIME_OVERRIDES.refresh && typeof MPRO_RUNTIME_OVERRIDES.refresh === 'object'
            ? MPRO_RUNTIME_OVERRIDES.refresh
            : {};

        const CONFIG = Object.freeze({
            // Транспорт к backend вынесен в отдельный узел, чтобы позже
            // можно было переключить M-PRO с GAS на единый Supabase-контур.
            BACKEND: Object.freeze({
                transport: String(MPRO_BACKEND_OVERRIDES.transport || 'jsonp').trim().toLowerCase() || 'jsonp',
                baseUrl: String(MPRO_BACKEND_OVERRIDES.baseUrl || 'https://script.google.com/macros/s/AKfycbwuFRmzkP6ZXVVW7HweB_qkm5oSEftYm8zZ40DXJR2dbQRZUFjTgaBjq6FJgRd6cMcB/exec').trim()
            }),
            REFRESH: Object.freeze({
                pollIntervalMs: Math.max(5000, Number(MPRO_REFRESH_OVERRIDES.pollIntervalMs) || 45000),
                reloadDebounceMs: Math.max(300, Number(MPRO_REFRESH_OVERRIDES.reloadDebounceMs) || 700),
                mutationReloadDelayMs: Math.max(300, Number(MPRO_REFRESH_OVERRIDES.mutationReloadDelayMs) || 1200)
            }),
            
            // Конфигурация Яндекс.Диска
            YANDEX: {
                ROOT_PATH: 'Осмотры объектов АНО СМГ',
                SUBFOLDERS: Object.freeze([
                    'Акт + селфи + СКУД + ОЖР',
                    'Общий фотоотчет',
                    'Периметральное ограждение + Подъездные пути',
                    'Замечания строительной площадки + Грунт',
                    'Бытовые помещения',
                    'Замечания контроль качества'
                ])
            },
            
            // Конфигурация карты
            MAP: {
                DEFAULT_CENTER: [55.7558, 37.6176],
                DEFAULT_ZOOM: 10,
                // Константы расчета смещения (спираль Архимеда)
                SPIRAL: {
                    ANGLE_STEP: 1.2,      // радианы
                    RADIUS_BASE: 0.001,   // градусы (~100-300 метров)
                    RADIUS_MULTIPLIER: Math.sqrt
                },
                // Размеры иконок в пикселях
                ICON_SIZE: {
                    DEFAULT: [30, 30],
                    ACTIVE: [50, 50]
                }
            },
            
            // Типы статусов объекта
            STATUS: Object.freeze({
                NEW: 'new',
                ACTIVE: 'active',
                COMPLETED: 'completed',
                DENIED: 'denied'
            }),
            
            // Соответствие источников отображаемым названиям
            SOURCES: Object.freeze({
                Map: 'ГС',
                Laboratory: 'Лаборатория',
                ConstructionControl: 'СК',
                DMS: 'ДМС',
                Metro: 'Метро'
            }),
            
            // Ключ временной сессии (до закрытия вкладки)
            SESSION_KEY: 'mpro_user',

            // Ключ постоянной сессии (режим "Запомнить вход")
            SESSION_PERSIST_KEY: 'mpro_user_persist',

            // Сохраненный пароль для поля авторизации (когда включен "Запомнить вход")
            AUTH_PASSWORD_KEY: 'mpro_auth_password',

            // Сохранённый логин / имя для unified auth
            AUTH_IDENTITY_KEY: 'mpro_auth_identity',

            // Сохраненное состояние чекбокса "Запомнить вход"
            AUTH_REMEMBER_KEY: 'mpro_auth_remember',

            // Ключ в localStorage для выбранных фильтров
            FILTERS_STORAGE_KEY: 'mpro_filters',

            // Маркер для WorkDay, когда геолокация недоступна
            WORKDAY_NO_GEO_MARKER: 'ГЕОЛОКАЦИЯ НЕДОСТУПНА: запросить селфи',
            
            // Таймаут запроса в миллисекундах
            TIMEOUT: 15000,
            
            // Длительности UI-анимаций (мс)
            ANIMATION: {
                MENU_TRANSITION: 250,
                NOTIFICATION_DURATION: 4000,
                BUTTON_RESET_DELAY: 1500,
                PANEL_TRANSITION: 300,
                MODAL_ANIMATION: 250
            },
            
            // Настройки индикатора прогресса
            PROGRESS: {
                INITIAL_PERCENT: 20,
                COMPLETE_PERCENT: 100
            },
            
            // Форматирование даты
            DATE: {
                LOCALE: 'ru-RU',
                FORMAT: {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }
            },
            
            // Значения по умолчанию
            DEFAULTS: {
                INSPECTOR_ICON: '👤',
                INSPECTOR_COLOR: '#1f6fb2',
                INSPECTOR_STATUS: 'active',
                MAP_PRESET: 'islands#dotIcon',
                UNKNOWN_INSPECTOR: 'Не назначен'
            },
            
            // Слои по z-индексу
            Z_INDEX: {
                ACTIVE_OBJECTS: 1000,
                NOTIFICATION: 999999,
                AUTH_OVERLAY: 99999,
                SIDE_PANEL: 10000,
                MODAL: 1500
            }
        });

        const DEBUG_MODE = new URLSearchParams(window.location.search).get('debug') === '1';
        function debugLog(...args) {
            if (!DEBUG_MODE) return;
            console.log(...args);
        }

        function normalizeInspectorName_(value) {
            return String(value || '')
                .replace(/\u00A0/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/[\u0451\u0401]/g, '\u0435')
                .trim()
                .toLowerCase();
        }

        const UNASSIGNED_INSPECTOR_FILTER_KEY = '__mpro_unassigned__';
        const UNASSIGNED_INSPECTOR_LABEL = 'Инспектор не назначен';

        function getUnassignedInspectorFilterKey_() {
            return UNASSIGNED_INSPECTOR_FILTER_KEY;
        }

        function getUnassignedInspectorLabel_() {
            return UNASSIGNED_INSPECTOR_LABEL;
        }

        function isUnassignedInspectorFilterValue_(value) {
            return String(value || '').trim() === UNASSIGNED_INSPECTOR_FILTER_KEY;
        }

        function getUnassignedInspectorBackendValue_() {
            return String(CONFIG.DEFAULTS?.UNKNOWN_INSPECTOR || '').trim() || 'Не назначен';
        }

        function isUnassignedInspectorName_(value) {
            const normalized = normalizeInspectorName_(value);
            if (!normalized) return true;
            return normalized === normalizeInspectorName_(getUnassignedInspectorBackendValue_())
                || normalized === normalizeInspectorName_(getUnassignedInspectorLabel_());
        }

        // Override broken encoded labels with stable Unicode escapes.
        function getUnassignedInspectorLabel_() {
            return '\u0418\u043d\u0441\u043f\u0435\u043a\u0442\u043e\u0440 \u043d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d';
        }

        function getUnassignedInspectorBackendValue_() {
            return String(CONFIG.DEFAULTS?.UNKNOWN_INSPECTOR || '').trim() || '\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d';
        }

        function getBackendBaseUrl_() {
            const baseUrl = String(CONFIG.BACKEND?.baseUrl || '').trim();
            if (!baseUrl) {
                throw new Error('Backend URL is not configured');
            }
            return baseUrl;
        }

        function assertJsonpBackendTransport_() {
            const transport = String(CONFIG.BACKEND?.transport || 'jsonp').trim().toLowerCase();
            if (transport !== 'jsonp') {
                throw new Error(`Unsupported backend transport: ${transport}`);
            }
        }

        function buildDateToken_() {
            const nowLocal = new Date();
            const dd = String(nowLocal.getDate()).padStart(2, '0');
            const mm = String(nowLocal.getMonth() + 1).padStart(2, '0');
            const yyyy = String(nowLocal.getFullYear());
            return `${dd}.${mm}.${yyyy}`;
        }

        function buildBackendRequestUrl_(params, callbackName) {
            assertJsonpBackendTransport_();
            const requestParams = { ...params };
            const action = String(requestParams.action || '').trim();
            const sessionToken = RuntimeState.getSessionToken();
            if (action !== 'auth' && action !== 'authNonce' && requestParams.sessionToken === undefined && sessionToken) {
                requestParams.sessionToken = sessionToken;
            }

            const queryParams = Object.entries(requestParams)
                .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val ?? '')}`)
                .join('&');

            return `${getBackendBaseUrl_()}?${queryParams}&callback=${encodeURIComponent(callbackName)}`;
        }

        function handleUnauthorizedResponse_() {
            stopBackgroundRefresh_();
            clearStoredSession_();
            RuntimeState.clearCurrentUser();
            RuntimeState.clearSessionToken();
            clearSessionScopedUiData_();
            const overlay = document.getElementById('authOverlay');
            if (overlay) overlay.classList.remove('hidden');
        }

        // ============================================
        // Глобальное состояние приложения
        // ============================================

        const AppState = {
            ui: {
                showInspectorsHomes: false,
                currentOpenObjectId: null,
                selectedObjectId: null,
                delegatedEventsInitialized: false,
                objectsListUpdateTimer: null,
                objectsListRenderQueued: false,
                mapRenderQueued: false,
                domByIdCache: {},
                filterCheckboxesCache: {
                    inspectors: [],
                    lists: []
                },
                objectsListRenderCache: {
                    active: '',
                    new: '',
                    completed: ''
                },
                objectsBadgesCache: {
                    active: null,
                    new: null,
                    completed: null
                }
            },
            filters: {
                currentFilters: {
                    inspectors: [],
                    lists: []
                },
                objectsTabInspectorFiltersCache: { inspectors: [], divisions: [] },
                showOnlyActiveObjects: false,
                showCompletedOnMap: false,
                recentlyCompletedUntil: new Map()
            },
            data: {
                inspectorsHomesData: {},
                inspectorsConfig: {},
                objectsData: [],
                objectsById: new Map(),
                inspectorsList: [],
                inspectorsWorkDay: {}
            },
            map: {
                mapInstance: null,
                mapInitPromise: null,
                mapWarmupTimer: null,
                pendingRender: false,
                inspectorsHomesLayer: null,
                objectManager: null,
                activeObjectsLayer: null,
                coordinateCounter: 0,
                lastMapRenderSignature: ''
            },
            runtime: {
                currentUser: null,
                sessionToken: '',
                dataLoadPromise: null,
                bootstrapVersion: 0,
                bootstrapFetchedAt: '',
                bootstrapDateToken: '',
                mapSearchQuery: '',
                workDay: {
                    isLoaded: false,
                    isOpen: false,
                    isSyncing: false,
                    openTime: null,
                    lastError: '',
                    lastSyncAt: 0,
                    lastSyncInspectorNorm: ''
                }
            }
        };

        const FiltersState = Object.freeze({
            getCurrent() {
                return AppState.filters.currentFilters;
            },
            setCurrent(nextFilters) {
                const inspectors = Array.isArray(nextFilters?.inspectors) ? nextFilters.inspectors.slice() : [];
                const lists = Array.isArray(nextFilters?.lists)
                    ? nextFilters.lists
                        .filter(item => item && typeof item === 'object')
                        .map(item => ({ name: item.name, division: item.division }))
                    : [];
                AppState.filters.currentFilters = { inspectors, lists };
            },
            getObjectsTabInspectorCache() {
                return AppState.filters.objectsTabInspectorFiltersCache;
            },
            setObjectsTabInspectorCache(nextCache) {
                AppState.filters.objectsTabInspectorFiltersCache = {
                    inspectors: Array.isArray(nextCache?.inspectors) ? nextCache.inspectors.slice() : [],
                    divisions: Array.isArray(nextCache?.divisions) ? nextCache.divisions.slice() : []
                };
            },
            isOnlyActiveMode() {
                return !!AppState.filters.showOnlyActiveObjects;
            },
            setOnlyActiveMode(value) {
                AppState.filters.showOnlyActiveObjects = !!value;
            },
            isShowCompletedOnMap() {
                return !!AppState.filters.showCompletedOnMap;
            },
            setShowCompletedOnMap(value) {
                AppState.filters.showCompletedOnMap = !!value;
            },
            getRecentlyCompletedMap() {
                return AppState.filters.recentlyCompletedUntil;
            },
            setRecentlyCompletedUntil(objectId, untilTs) {
                AppState.filters.recentlyCompletedUntil.set(String(objectId), untilTs);
            },
            clearRecentlyCompleted(objectId) {
                AppState.filters.recentlyCompletedUntil.delete(String(objectId));
            }
        });

        const UIState = Object.freeze({
            isDelegatedEventsInitialized() {
                return !!AppState.ui.delegatedEventsInitialized;
            },
            markDelegatedEventsInitialized() {
                AppState.ui.delegatedEventsInitialized = true;
            },
            toggleInspectorsHomesVisible() {
                AppState.ui.showInspectorsHomes = !AppState.ui.showInspectorsHomes;
                return AppState.ui.showInspectorsHomes;
            },
            isInspectorsHomesVisible() {
                return !!AppState.ui.showInspectorsHomes;
            },
            getObjectsListUpdateTimer() {
                return AppState.ui.objectsListUpdateTimer;
            },
            setObjectsListUpdateTimer(timerId) {
                AppState.ui.objectsListUpdateTimer = timerId ?? null;
            },
            getDomById(id) {
                const key = String(id || '');
                if (!key) return null;
                const cached = AppState.ui.domByIdCache[key];
                if (cached && cached.isConnected) return cached;
                const node = document.getElementById(key);
                if (node) AppState.ui.domByIdCache[key] = node;
                return node || null;
            },
            setFilterCheckboxes(type, checkboxes) {
                const key = type === 'lists' ? 'lists' : 'inspectors';
                AppState.ui.filterCheckboxesCache[key] = Array.isArray(checkboxes)
                    ? checkboxes.filter(cb => cb && cb.isConnected)
                    : [];
            },
            getFilterCheckboxes(type) {
                const key = type === 'lists' ? 'lists' : 'inspectors';
                const current = Array.isArray(AppState.ui.filterCheckboxesCache[key])
                    ? AppState.ui.filterCheckboxesCache[key]
                    : [];
                const alive = current.filter(cb => cb && cb.isConnected);
                if (alive.length !== current.length) {
                    AppState.ui.filterCheckboxesCache[key] = alive;
                }
                return alive;
            },
            isObjectsListRenderQueued() {
                return !!AppState.ui.objectsListRenderQueued;
            },
            setObjectsListRenderQueued(value) {
                AppState.ui.objectsListRenderQueued = !!value;
            },
            isMapRenderQueued() {
                return !!AppState.ui.mapRenderQueued;
            },
            setMapRenderQueued(value) {
                AppState.ui.mapRenderQueued = !!value;
            },
            getObjectsBadge(sectionKey) {
                return AppState.ui.objectsBadgesCache[sectionKey];
            },
            setObjectsBadge(sectionKey, count) {
                AppState.ui.objectsBadgesCache[sectionKey] = count;
            },
            getObjectsListRenderSignature(sectionKey) {
                return AppState.ui.objectsListRenderCache[sectionKey];
            },
            setObjectsListRenderSignature(sectionKey, signature) {
                AppState.ui.objectsListRenderCache[sectionKey] = signature;
            },
            snapshotObjectsListRenderCache() {
                return { ...AppState.ui.objectsListRenderCache };
            },
            restoreObjectsListRenderCache(snapshot) {
                AppState.ui.objectsListRenderCache = {
                    active: snapshot?.active ?? '',
                    new: snapshot?.new ?? '',
                    completed: snapshot?.completed ?? ''
                };
            },
            getCurrentOpenObjectId() {
                return AppState.ui.currentOpenObjectId;
            },
            setCurrentOpenObjectId(objectId) {
                AppState.ui.currentOpenObjectId = objectId;
            },
            clearCurrentOpenObjectId() {
                AppState.ui.currentOpenObjectId = null;
            },
            getSelectedObjectId() {
                return AppState.ui.selectedObjectId;
            },
            setSelectedObjectId(objectId) {
                AppState.ui.selectedObjectId = objectId || null;
            }
        });

        const DataState = Object.freeze({
            getInspectorsHomesData() {
                return AppState.data.inspectorsHomesData;
            },
            setInspectorsHomesData(homesData) {
                AppState.data.inspectorsHomesData = (homesData && typeof homesData === 'object') ? homesData : {};
            },
            clearInspectorsHomesData() {
                AppState.data.inspectorsHomesData = {};
            },
            getInspectorsConfig() {
                return AppState.data.inspectorsConfig;
            },
            setInspectorsConfig(config) {
                if (!config || typeof config !== 'object') {
                    AppState.data.inspectorsConfig = {};
                    return;
                }
                const next = {};
                Object.keys(config).forEach(name => {
                    const raw = (config[name] && typeof config[name] === 'object') ? config[name] : {};
                    next[name] = { ...raw };
                });
                AppState.data.inspectorsConfig = next;
            },
            ensureInspectorConfig(inspectorName) {
                const config = this.getInspectorsConfig();
                if (!config[inspectorName]) config[inspectorName] = {};
                return config[inspectorName];
            },
            getInspectorsList() {
                return AppState.data.inspectorsList;
            },
            setInspectorsList(inspectorsList) {
                AppState.data.inspectorsList = Array.isArray(inspectorsList) ? inspectorsList : [];
            },
            getInspectorsWorkDay() {
                return (AppState.data.inspectorsWorkDay && typeof AppState.data.inspectorsWorkDay === 'object')
                    ? AppState.data.inspectorsWorkDay
                    : {};
            },
            setInspectorsWorkDay(payload) {
                AppState.data.inspectorsWorkDay = (payload && typeof payload === 'object') ? payload : {};
            },
            clearInspectorsWorkDay() {
                AppState.data.inspectorsWorkDay = {};
            },
            getObjectsData() {
                return AppState.data.objectsData;
            },
            setObjectsData(objectsData) {
                const nextObjects = Array.isArray(objectsData) ? objectsData : [];
                const byId = new Map();
                for (let i = 0; i < nextObjects.length; i += 1) {
                    const obj = nextObjects[i];
                    const idKey = String(obj?.id ?? '');
                    if (!idKey) continue;
                    const division = resolveObjectDivision_(obj);
                    const listValue = getObjectListName_(obj);
                    obj.__divisionResolved = division;
                    obj.__listDivisionKey = `${division}::${listValue}`;
                    obj.__searchBlobLower = `${idKey}|${listValue}|${String(obj?.address || '')}`.toLowerCase();
                    if (!byId.has(idKey)) byId.set(idKey, obj);
                }
                AppState.data.objectsData = nextObjects;
                AppState.data.objectsById = byId;
            },
            clearObjectsData() {
                this.setObjectsData([]);
            },
            findObjectById(objectId) {
                const idKey = String(objectId ?? '');
                if (idKey && AppState.data.objectsById.has(idKey)) {
                    return AppState.data.objectsById.get(idKey) || null;
                }
                return AppState.data.objectsData.find(obj => obj.id == objectId) || null;
            },
            snapshotObjectsData() {
                return AppState.data.objectsData;
            },
            restoreObjectsData(snapshot) {
                this.setObjectsData(snapshot);
            },
            clearInspectorsList() {
                AppState.data.inspectorsList = [];
            }
        });

        const RuntimeState = Object.freeze({
            getCurrentUser() {
                return AppState.runtime.currentUser;
            },
            setCurrentUser(user) {
                AppState.runtime.currentUser = (user && typeof user === 'object') ? user : null;
            },
            clearCurrentUser() {
                AppState.runtime.currentUser = null;
            },
            hasCurrentUser() {
                return !!AppState.runtime.currentUser;
            },
            getCurrentUserName(fallback = 'Инспектор') {
                const name = AppState.runtime.currentUser?.name;
                return name ? String(name) : fallback;
            },
            getSessionToken() {
                return String(AppState.runtime.sessionToken || '');
            },
            setSessionToken(token) {
                AppState.runtime.sessionToken = String(token || '').trim();
            },
            clearSessionToken() {
                AppState.runtime.sessionToken = '';
            },
            getDataLoadPromise() {
                return AppState.runtime.dataLoadPromise;
            },
            setDataLoadPromise(promise) {
                AppState.runtime.dataLoadPromise = promise || null;
            },
            clearDataLoadPromise() {
                AppState.runtime.dataLoadPromise = null;
            },
            getBootstrapVersion() {
                return Number(AppState.runtime.bootstrapVersion || 0);
            },
            setBootstrapVersion(version) {
                const parsed = Math.floor(Number(version) || 0);
                AppState.runtime.bootstrapVersion = parsed > 0 ? parsed : 0;
            },
            clearBootstrapVersion() {
                AppState.runtime.bootstrapVersion = 0;
            },
            getBootstrapFetchedAt() {
                return String(AppState.runtime.bootstrapFetchedAt || '');
            },
            setBootstrapFetchedAt(value) {
                AppState.runtime.bootstrapFetchedAt = String(value || '').trim();
            },
            clearBootstrapFetchedAt() {
                AppState.runtime.bootstrapFetchedAt = '';
            },
            getBootstrapDateToken() {
                return String(AppState.runtime.bootstrapDateToken || '').trim();
            },
            setBootstrapDateToken(value) {
                AppState.runtime.bootstrapDateToken = String(value || '').trim();
            },
            clearBootstrapDateToken() {
                AppState.runtime.bootstrapDateToken = '';
            },
            getMapSearchQuery() {
                return String(AppState.runtime.mapSearchQuery || '');
            },
            setMapSearchQuery(query) {
                AppState.runtime.mapSearchQuery = String(query || '');
            },
            clearMapSearchQuery() {
                AppState.runtime.mapSearchQuery = '';
            }
        });

        const WorkDayRuntimeState = Object.freeze({
            reset() {
                AppState.runtime.workDay = {
                    isLoaded: false,
                    isOpen: false,
                    isSyncing: false,
                    openTime: null,
                    lastError: '',
                    lastSyncAt: 0,
                    lastSyncInspectorNorm: ''
                };
            },
            isLoaded() {
                return !!AppState.runtime.workDay.isLoaded;
            },
            setLoaded(value) {
                AppState.runtime.workDay.isLoaded = !!value;
            },
            isOpen() {
                return !!AppState.runtime.workDay.isOpen;
            },
            setOpen(value) {
                AppState.runtime.workDay.isOpen = !!value;
            },
            isSyncing() {
                return !!AppState.runtime.workDay.isSyncing;
            },
            setSyncing(value) {
                AppState.runtime.workDay.isSyncing = !!value;
            },
            getOpenTime() {
                return AppState.runtime.workDay.openTime || null;
            },
            setOpenTime(value) {
                const raw = String(value || '').trim();
                AppState.runtime.workDay.openTime = raw || null;
            },
            getLastError() {
                return String(AppState.runtime.workDay.lastError || '');
            },
            setLastError(message) {
                AppState.runtime.workDay.lastError = String(message || '').trim();
            },
            clearError() {
                AppState.runtime.workDay.lastError = '';
            },
            markSynced(inspectorNorm) {
                AppState.runtime.workDay.lastSyncAt = Date.now();
                AppState.runtime.workDay.lastSyncInspectorNorm = String(inspectorNorm || '');
            },
            getLastSyncAt() {
                return Number(AppState.runtime.workDay.lastSyncAt || 0);
            },
            getLastSyncInspectorNorm() {
                return String(AppState.runtime.workDay.lastSyncInspectorNorm || '');
            }
        });

        const MapState = Object.freeze({
            getMapInstance() {
                return AppState.map.mapInstance;
            },
            setMapInstance(instance) {
                AppState.map.mapInstance = instance || null;
            },
            getMapInitPromise() {
                return AppState.map.mapInitPromise || null;
            },
            setMapInitPromise(promise) {
                AppState.map.mapInitPromise = promise || null;
            },
            clearMapInitPromise() {
                AppState.map.mapInitPromise = null;
            },
            getMapWarmupTimer() {
                return AppState.map.mapWarmupTimer || null;
            },
            setMapWarmupTimer(timerId) {
                AppState.map.mapWarmupTimer = timerId ?? null;
            },
            clearMapWarmupTimer() {
                const timerId = AppState.map.mapWarmupTimer;
                if (timerId && typeof timerId === 'object' && timerId.kind === 'idle' && typeof cancelIdleCallback === 'function') {
                    cancelIdleCallback(timerId.id);
                } else if (timerId && typeof clearTimeout === 'function') {
                    clearTimeout(timerId);
                }
                AppState.map.mapWarmupTimer = null;
            },
            hasPendingRender() {
                return !!AppState.map.pendingRender;
            },
            markPendingRender() {
                AppState.map.pendingRender = true;
            },
            clearPendingRender() {
                AppState.map.pendingRender = false;
            },
            destroyMapInstance() {
                const mapInstance = AppState.map.mapInstance;
                if (mapInstance && typeof mapInstance.destroy === 'function') {
                    mapInstance.destroy();
                }
                AppState.map.mapInstance = null;
                AppState.map.mapInitPromise = null;
                this.clearMapWarmupTimer();
                this.clearPendingRender();
                AppState.map.lastMapRenderSignature = '';
            },
            getHomesLayer() {
                return AppState.map.inspectorsHomesLayer;
            },
            setHomesLayer(layer) {
                AppState.map.inspectorsHomesLayer = layer || null;
            },
            getObjectManager() {
                return AppState.map.objectManager;
            },
            setObjectManager(manager) {
                AppState.map.objectManager = manager || null;
            },
            getActiveObjectsLayer() {
                return AppState.map.activeObjectsLayer;
            },
            setActiveObjectsLayer(layer) {
                AppState.map.activeObjectsLayer = layer || null;
            },
            areObjectLayersReady() {
                return !!(AppState.map.objectManager && AppState.map.activeObjectsLayer);
            },
            clearObjectLayers() {
                if (AppState.map.objectManager) AppState.map.objectManager.removeAll();
                if (AppState.map.activeObjectsLayer) AppState.map.activeObjectsLayer.removeAll();
            },
            resetCoordinateCounter() {
                AppState.map.coordinateCounter = 0;
            },
            getLastRenderSignature() {
                return AppState.map.lastMapRenderSignature;
            },
            setLastRenderSignature(signature) {
                AppState.map.lastMapRenderSignature = String(signature || '');
            },
            snapshotObjectLayers() {
                return {
                    objectManager: AppState.map.objectManager,
                    activeObjectsLayer: AppState.map.activeObjectsLayer
                };
            },
            restoreObjectLayers(snapshot) {
                AppState.map.objectManager = snapshot?.objectManager || null;
                AppState.map.activeObjectsLayer = snapshot?.activeObjectsLayer || null;
            }
        });
        
        // ============================================
        // ИНИЦИАЛИЗАЦИЯ
        // ============================================
        
        // Проверка авторизации до DOMContentLoaded, чтобы избежать мерцания

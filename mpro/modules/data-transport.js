// Data hydration, division helpers, and backend transport extracted from app-legacy.js

        function buildInspectorsListFromPayload_(data) {
            if (data.inspectorsList && Array.isArray(data.inspectorsList)) {
                return data.inspectorsList.map(insp => {
                    const config = (DataState.getInspectorsConfig() && DataState.getInspectorsConfig()[insp.name]) || {};
                    return {
                        ...insp,
                        ...config,
                        division: insp.division || config.division || 'Прочие'
                    };
                });
            }

            if (DataState.getInspectorsConfig()) {
                return Object.keys(DataState.getInspectorsConfig()).map(name => ({
                    name: name,
                    division: DataState.getInspectorsConfig()[name].division || 'Прочие',
                    ...DataState.getInspectorsConfig()[name]
                }));
            }

            return [];
        }

        const MPRO_BOOTSTRAP_CACHE_STORAGE_KEY = 'mpro_bootstrap_cache_v1';

        function clearBootstrapCache_() {
            try {
                window.sessionStorage.removeItem(MPRO_BOOTSTRAP_CACHE_STORAGE_KEY);
            } catch (_error) {}
        }

        function applyBootstrapRuntimeMetadata_(data, options = {}) {
            if (!data || typeof data !== 'object') return;
            RuntimeState.setBootstrapVersion(data.version);
            RuntimeState.setBootstrapFetchedAt(data.fetchedAt || data.timestamp || '');
            RuntimeState.setBootstrapDateToken(options.dateToken || RuntimeState.getBootstrapDateToken() || buildDateToken_());
        }

        function persistBootstrapCache_(data, options = {}) {
            const sessionToken = String(options.sessionToken || RuntimeState.getSessionToken()).trim();
            const dateToken = String(options.dateToken || buildDateToken_()).trim();
            if (!sessionToken || !dateToken || !data || typeof data !== 'object') return;

            try {
                window.sessionStorage.setItem(MPRO_BOOTSTRAP_CACHE_STORAGE_KEY, JSON.stringify({
                    sessionToken,
                    dateToken,
                    cachedAt: new Date().toISOString(),
                    data: {
                        success: true,
                        version: Math.max(0, Math.floor(Number(data.version) || 0)),
                        fetchedAt: String(data.fetchedAt || data.timestamp || '').trim(),
                        points: Array.isArray(data.points) ? data.points : [],
                        inspectorsList: Array.isArray(data.inspectorsList) ? data.inspectorsList : [],
                        inspectorsConfig: data.inspectorsConfig && typeof data.inspectorsConfig === 'object'
                            ? data.inspectorsConfig
                            : {},
                        inspectorsHomes: data.inspectorsHomes && typeof data.inspectorsHomes === 'object'
                            ? data.inspectorsHomes
                            : {},
                        inspectorsWorkDay: data.inspectorsWorkDay && typeof data.inspectorsWorkDay === 'object'
                            ? data.inspectorsWorkDay
                            : {}
                    }
                }));
            } catch (_error) {}
        }

        function readBootstrapCache_(sessionToken, dateToken = buildDateToken_()) {
            const token = String(sessionToken || '').trim();
            const safeDateToken = String(dateToken || '').trim();
            if (!token || !safeDateToken) return null;

            try {
                const raw = window.sessionStorage.getItem(MPRO_BOOTSTRAP_CACHE_STORAGE_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || String(parsed.sessionToken || '').trim() !== token) return null;
                if (String(parsed.dateToken || '').trim() !== safeDateToken) return null;
                const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : null;
                if (!data) return null;
                return {
                    success: true,
                    version: Math.max(0, Math.floor(Number(data.version) || 0)),
                    fetchedAt: String(data.fetchedAt || parsed.cachedAt || '').trim(),
                    points: Array.isArray(data.points) ? data.points : [],
                    inspectorsList: Array.isArray(data.inspectorsList) ? data.inspectorsList : [],
                    inspectorsConfig: data.inspectorsConfig && typeof data.inspectorsConfig === 'object'
                        ? data.inspectorsConfig
                        : {},
                    inspectorsHomes: data.inspectorsHomes && typeof data.inspectorsHomes === 'object'
                        ? data.inspectorsHomes
                        : {},
                    inspectorsWorkDay: data.inspectorsWorkDay && typeof data.inspectorsWorkDay === 'object'
                        ? data.inspectorsWorkDay
                        : {}
                };
            } catch (_error) {
                clearBootstrapCache_();
                return null;
            }
        }

        function hydrateDataBundle_(data, options = {}) {
            if (data.points) {
                DataState.setObjectsData(data.points);
                debugLog('✅ Загружено точек:', DataState.getObjectsData().length);
            }

            if (data.inspectorsHomes) {
                DataState.setInspectorsHomesData(data.inspectorsHomes);
                debugLog('✅ Загружено домов:', Object.keys(DataState.getInspectorsHomesData()).length);
            }
            if (data.inspectorsConfig) {
                DataState.setInspectorsConfig(data.inspectorsConfig);
            }
            DataState.setInspectorsWorkDay(data.inspectorsWorkDay);

            const inspectorsList = buildInspectorsListFromPayload_(data);
            DataState.setInspectorsList(inspectorsList);
            DataState.getInspectorsList().sort((a, b) => a.name.localeCompare(b.name));

            debugLog('✅ Загружено инспекторов:', DataState.getInspectorsList().length);

            applyBootstrapRuntimeMetadata_(data, { dateToken: options.dateToken });
            scheduleMapUpdate_();
            updateUserCard();
            autoRenderOpenPanels();
            renderFilterLists();
            refreshInspectorManagementWorkDayIndicators_();
            filterManagementInspectors();
            if (options.persistCache !== false) {
                persistBootstrapCache_(data, {
                    sessionToken: options.sessionToken,
                    dateToken: options.dateToken
                });
            }
        }

        /**
         * Загрузить данные из backend-транспорта.
         * @returns {Promise} Промис с данными
         */
        function hydrateDataFromBootstrapCache_(sessionToken, options = {}) {
            const dateToken = String(options.dateToken || buildDateToken_()).trim();
            const cached = readBootstrapCache_(sessionToken, dateToken);
            if (!cached) return false;
            hydrateDataBundle_(cached, {
                persistCache: false,
                sessionToken,
                dateToken
            });
            return true;
        }

        function loadData(options = {}) {
            // Если загрузка уже идет, возвращаем текущий промис
            if (RuntimeState.getDataLoadPromise()) return RuntimeState.getDataLoadPromise();

            const dateToken = String(options.dateToken || buildDateToken_()).trim();
            const timeout = Math.max(1000, Number(options.timeout) || 15000);
            const runtimeVersion = RuntimeState.getBootstrapDateToken() === dateToken
                ? Math.floor(Number(RuntimeState.getBootstrapVersion()) || 0)
                : 0;
            const currentVersion = Math.max(
                0,
                Math.floor(Number(options.ifVersion) || 0),
                runtimeVersion
            );

            const loadPromise = MproApi.fetchData({
                dateToken,
                timeout,
                ifVersion: currentVersion > 0 ? currentVersion : null,
                useBundle: options.useBundle !== false
            })
                .then((data) => {
                    if (!data?.success) {
                        throw new Error(data?.error || 'Ошибка загрузки');
                    }

                    if (data.changed === false) {
                        applyBootstrapRuntimeMetadata_(data, { dateToken });
                        return data;
                    }

                    hydrateDataBundle_(data, {
                        dateToken,
                        sessionToken: RuntimeState.getSessionToken(),
                        persistCache: options.persistCache !== false
                    });
                    return data;
                })
                .finally(() => {
                    RuntimeState.clearDataLoadPromise();
                });

            RuntimeState.setDataLoadPromise(loadPromise);
            return loadPromise;
        }

        /**
         * Загрузить данные с ограниченными повторными попытками.
         * Используется на старте/после логина для сглаживания редких сбоев JSONP.
         * @param {{attempts?:number,retryDelayMs?:number,reason?:string}} options
         * @returns {Promise<any>}
         */
        function loadDataWithRetry_(options = {}) {
            const attempts = Math.max(1, Number(options.attempts) || 3);
            const retryDelayMs = Math.max(200, Number(options.retryDelayMs) || 800);
            const reason = String(options.reason || 'generic');
            let attempt = 0;

            const run = () => {
                attempt += 1;
                if (attempt > 1) {
                    RuntimeState.clearDataLoadPromise();
                }
                return loadData(options).catch((error) => {
                    if (attempt >= attempts) throw error;
                    const waitMs = retryDelayMs * attempt;
                    console.warn(`loadData retry ${attempt}/${attempts} failed (${reason}):`, error);
                    return new Promise((resolve) => setTimeout(resolve, waitMs)).then(run);
                });
            };

            return run();
        }
        
        /**
         * Автоматически отрисовать открытые панели при получении данных
         * Вызывается после успешной загрузки данных
         */
        function autoRenderOpenPanels() {
            // Панель управления инспекторами
            const inspectorPanel = document.getElementById('inspectorManagementPanel');
            if (inspectorPanel && !inspectorPanel.classList.contains('hidden')) {
                // В открытой панели не делаем авто-перерисовку на фоновых sync/loadData:
                // на iPhone это вызывает тяжёлые перерисовки и может приводить к reload страницы.
                return;
            }
        }
        
        const DIVISION_MAPPING = {
            'Map': 'ГС',
            'DMS': 'ДМС',
            'ConstructionControl': 'СК',
            'Laboratory': 'Лаборатория',
            'Metro': 'Метро'
        };

        const DIVISION_ALIASES = Object.freeze({
            'гс': 'ГС',
            'map': 'ГС',
            'дмс': 'ДМС',
            'dms': 'ДМС',
            'ск': 'СК',
            'constructioncontrol': 'СК',
            'construction-control': 'СК',
            'construction control': 'СК',
            'лаборатория': 'Лаборатория',
            'laboratory': 'Лаборатория',
            'метро': 'Метро',
            'metro': 'Метро'
        });

        /**
         * Нормализовать произвольное название дивизиона к каноническому.
         * @param {any} value
         * @returns {string}
         */
        function normalizeDivisionName_(value) {
            const raw = String(value || '')
                .replace(/\u00A0/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (!raw) return '';

            const lower = raw.toLowerCase();
            if (DIVISION_ALIASES[lower]) return DIVISION_ALIASES[lower];

            const compact = lower.replace(/\s+/g, '');
            if (DIVISION_ALIASES[compact]) return DIVISION_ALIASES[compact];

            return '';
        }


        
        // ============================================
        // Модуль интерфейса
        // ============================================
        
        // ============================================
        // Синглтон стеклянных уведомлений
        // ============================================
        
        

function createJsonpRequest(params, timeout = CONFIG.TIMEOUT) {
            // Проверка входных параметров
            if (!params || typeof params !== 'object') {
                return Promise.reject(new Error('Invalid params: expected object'));
            }
            
            const callbackName = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const script = document.createElement('script');
            script.charset = 'utf-8';
            
            let timeoutId;
            let isResolved = false;
            
            const cleanup = () => {
                clearTimeout(timeoutId);
                if (script.parentNode) document.head.removeChild(script);
                try { delete window[callbackName]; } catch(e) {}
            };
            
            return new Promise((resolve, reject) => {
                // Обработчик таймаута
                timeoutId = setTimeout(() => {
                    isResolved = true;
                    cleanup();
                    reject(new Error('Request timeout'));
                }, timeout);
                
                // Обработчик успешного ответа
                window[callbackName] = (data) => {
                    if (isResolved) return;
                    isResolved = true;
                    cleanup();
                    
                    // Проверка валидности ответа
                    if (!data || typeof data !== 'object') {
                        reject(new Error('Invalid response format'));
                        return;
                    }

                    if (data.code === 'UNAUTHORIZED') {
                        handleUnauthorizedResponse_();
                    }
                    
                    resolve(data);
                };
                
                // Обработчик ошибок загрузки
                script.onerror = () => {
                    if (isResolved) return;
                    isResolved = true;
                    cleanup();
                    reject(new Error('Ошибка соединения'));
                };
                
                // Сформировать адрес запроса
                script.src = buildBackendRequestUrl_(params, callbackName);
                document.head.appendChild(script);
            });
        }
        
        // ============================================
        // Модуль точек на карте (объекты)
        // ============================================
        
        /**
         * Инициализировать менеджеры объектов (ObjectManager) для точек.
         * Вызывается из initMap() после создания карты
         * @private
         */
        

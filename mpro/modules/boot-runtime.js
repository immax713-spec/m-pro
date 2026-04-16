// Boot/runtime shell extracted from session-access.js.
// Owns viewport sync, mobile shell, background refresh, DOM bootstrap, and glass-menu interactions.

        function syncMenuIndicator_(tabName = '') {
            const menu = document.getElementById('modernMenu');
            if (!menu) return false;

            let activeBtn = null;
            if (tabName) {
                activeBtn = document.getElementById(`btn-${tabName}`);
            }
            if (!activeBtn) {
                activeBtn = menu.querySelector('.modern-menu-btn.active') || menu.querySelector('.modern-menu-btn');
            }
            if (!activeBtn) return false;

            const indicator = document.getElementById('menuIndicator');
            const indicatorInner = document.getElementById('menuIndicatorInner');
            if (indicator) {
                indicator.style.width = `${activeBtn.offsetWidth}px`;
                indicator.style.left = `${activeBtn.offsetLeft}px`;
            }
            if (indicatorInner) {
                indicatorInner.style.width = `${menu.offsetWidth}px`;
                indicatorInner.style.left = `-${activeBtn.offsetLeft}px`;
            }

            return true;
        }

        function markMproShellReady_() {
            try {
                if (document && document.body) {
                    document.body.classList.remove('mpro-shell-booting');
                }
            } catch (_error) {}
        }

        function scheduleMenuIndicatorSync_() {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    syncMenuIndicator_();
                });
            });
        }

        function isMobileViewport_() {
            return window.matchMedia('(max-width: 980px)').matches;
        }

        let lastSyncedViewportHeight_ = 0;
        let fitMapToViewportRaf_ = 0;

        function scheduleMapFitToViewport_() {
            const mapInstance = MapState.getMapInstance();
            if (!mapInstance || !mapInstance.container || typeof mapInstance.container.fitToViewport !== 'function') {
                return;
            }
            if (fitMapToViewportRaf_) {
                cancelAnimationFrame(fitMapToViewportRaf_);
            }
            fitMapToViewportRaf_ = requestAnimationFrame(() => {
                fitMapToViewportRaf_ = 0;
                try {
                    mapInstance.container.fitToViewport();
                } catch (err) {
                    // Защита от редких race-condition в iOS Safari при смене viewport.
                }
            });
        }

        function syncViewportHeight_() {
            const root = document.documentElement;
            if (!root) return;

            const vv = window.visualViewport;
            const vvHeight = vv && Number(vv.height);
            const innerHeight = Number(window.innerHeight);
            const nextHeight = Math.round((vvHeight && vvHeight > 0) ? vvHeight : innerHeight);
            if (!Number.isFinite(nextHeight) || nextHeight < 320) return;

            if (nextHeight === lastSyncedViewportHeight_) return;
            lastSyncedViewportHeight_ = nextHeight;
            root.style.setProperty('--app-height', `${nextHeight}px`);
            scheduleMapFitToViewport_();
            syncFilterPanelHeight_(document.getElementById('filter-lists'));
            syncFilterPanelHeight_(document.getElementById('filter-inspectors'));
        }

        function getMainSidebarElement_() {
            return document.getElementById('mainSidebar') || document.querySelector('.sidebar');
        }

        function getMobileFabMenuElement_() {
            return document.getElementById('mobileFabMenu');
        }

        function isMobileFabExpanded_() {
            const fabMenu = getMobileFabMenuElement_();
            return !!(fabMenu && fabMenu.classList.contains('mobile-fab-menu--expanded'));
        }

        function isMapInlineSearchOpen_() {
            const fabMenu = getMobileFabMenuElement_();
            return !!(fabMenu && fabMenu.classList.contains('mobile-fab-menu--search-open'));
        }

        function setMobileFabExpanded_(nextExpanded) {
            const fabMenu = getMobileFabMenuElement_();
            const toggle = document.getElementById('mobileSidebarToggle');
            const isMobile = isMobileViewport_();
            const sidebarOpen = document.body.classList.contains('mobile-sidebar-open');
            const shouldExpand = !!nextExpanded && isMobile && !sidebarOpen;
            const shouldActive = shouldExpand || isMapInlineSearchOpen_();

            if (fabMenu) {
                fabMenu.classList.toggle('mobile-fab-menu--expanded', shouldExpand);
            }
            if (toggle) {
                toggle.classList.toggle('active', shouldActive);
                toggle.setAttribute('aria-expanded', shouldActive ? 'true' : 'false');
                toggle.setAttribute('aria-label', shouldActive ? 'Свернуть мобильные действия' : 'Открыть мобильные действия');
            }
        }

        function toggleMobileFabMenu_() {
            if (!isMobileViewport_()) return;
            if (isMapInlineSearchOpen_()) {
                setMapInlineSearchOpen_(false);
                setMobileFabExpanded_(true);
                return;
            }
            setMobileFabExpanded_(!isMobileFabExpanded_());
        }

        function setMapInlineSearchOpen_(nextOpen) {
            const wrapper = document.getElementById('mapInlineSearch');
            const fabMenu = getMobileFabMenuElement_();
            const toggle = document.getElementById('mobileSidebarToggle');
            const input = document.getElementById('mapInlineSearchInput');
            const isMobile = isMobileViewport_();
            const sidebarOpen = document.body.classList.contains('mobile-sidebar-open');
            const shouldOpen = !!nextOpen && isMobile && !sidebarOpen;
            if (!wrapper) return;
            wrapper.classList.toggle('visible', shouldOpen);
            if (fabMenu) {
                fabMenu.classList.toggle('mobile-fab-menu--search-open', shouldOpen);
            }
            if (toggle) {
                const shouldActive = shouldOpen || isMobileFabExpanded_();
                toggle.classList.toggle('active', shouldActive);
                toggle.setAttribute('aria-expanded', shouldActive ? 'true' : 'false');
                toggle.setAttribute('aria-label', shouldActive ? 'Свернуть мобильные действия' : 'Открыть мобильные действия');
            }
            if (shouldOpen && input) {
                requestAnimationFrame(() => {
                    input.focus();
                    input.select();
                });
            } else if (input) {
                input.blur();
                if (input.value || RuntimeState.getMapSearchQuery()) {
                    setMapSearchQuery_('');
                }
            }
        }

        function toggleMapInlineSearch_() {
            const isOpen = isMapInlineSearchOpen_();
            setMobileFabExpanded_(false);
            AppModules.Objects.switchNav('map');
            setMapInlineSearchOpen_(!isOpen);
        }

        function normalizeMapSearchQuery_(rawValue) {
            return String(rawValue || '')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
        }

        function syncSearchInputsValue_(rawValue, sourceId = '') {
            const safeRaw = String(rawValue || '');
            const objectsInput = document.getElementById('objectsSearchInput');
            const mapInput = document.getElementById('mapInlineSearchInput');

            if (objectsInput && sourceId !== 'objectsSearchInput' && objectsInput.value !== safeRaw) {
                objectsInput.value = safeRaw;
            }
            if (mapInput && sourceId !== 'mapInlineSearchInput' && mapInput.value !== safeRaw) {
                mapInput.value = safeRaw;
            }
        }

        function setMapSearchQuery_(rawValue, options = {}) {
            const sourceId = String(options.sourceId || '');
            syncSearchInputsValue_(rawValue, sourceId);

            const nextQuery = normalizeMapSearchQuery_(rawValue);
            if (RuntimeState.getMapSearchQuery() === nextQuery) {
                scheduleObjectsListUpdate_();
                return;
            }
            RuntimeState.setMapSearchQuery(nextQuery);
            scheduleMapUpdate_();
            scheduleObjectsListUpdate_();
        }

        function handleMapInlineSearchInput_(target) {
            if (!(target instanceof HTMLInputElement)) return;
            setMapSearchQuery_(target.value, { sourceId: target.id });
        }

        function handleObjectsSearchInput_(target) {
            if (!(target instanceof HTMLInputElement)) return;
            setMapSearchQuery_(target.value, { sourceId: target.id });
        }

        function submitMapInlineSearch_() {
            const input = document.getElementById('mapInlineSearchInput');
            if (!input) return;
            setMapSearchQuery_(input.value, { sourceId: input.id });
            input.blur();
        }

        function setMobileSidebarOpen_(nextOpen) {
            const sidebar = getMainSidebarElement_();
            const backdrop = document.getElementById('mobileSidebarBackdrop');
            const isMobile = isMobileViewport_();

            if (!sidebar) return;

            const shouldOpen = !!nextOpen && isMobile;
            if (shouldOpen) {
                setMobileFabExpanded_(false);
                setMapInlineSearchOpen_(false);
            }
            sidebar.classList.toggle('sidebar--mobile-open', shouldOpen);
            document.body.classList.toggle('mobile-sidebar-open', shouldOpen);

            if (backdrop) {
                backdrop.classList.toggle('visible', shouldOpen);
            }
        }

        function openMobileSidebarFromFab_(tabName = 'lists') {
            if (!isMobileViewport_()) return;
            setMobileFabExpanded_(false);
            setMobileSidebarOpen_(true);
            if (tabName) {
                switchNav(tabName);
            }
        }

        function closeMobileSidebar_() {
            setMobileSidebarOpen_(false);
        }

        function syncMobileLayoutState_() {
            if (!isMobileViewport_()) {
                setMobileSidebarOpen_(false);
                setMobileFabExpanded_(false);
                setMapInlineSearchOpen_(false);
            }
        }

        const BackgroundRefreshState = {
            refreshTimer: null,
            refreshInFlight: false,
            refreshQueued: false,
            externalSyncPending: false
        };
        const MPRO_SYNC_SIGNAL_STORAGE_KEY = 'mpro_sync_signal';
        let mproSyncBroadcastChannel_ = null;
        let lastExternalSyncSignalAt_ = 0;

        function isDocumentHidden_() {
            return typeof document !== 'undefined' && document.visibilityState === 'hidden';
        }

        function stopBackgroundRefresh_(options = {}) {
            if (BackgroundRefreshState.refreshTimer) {
                clearTimeout(BackgroundRefreshState.refreshTimer);
                BackgroundRefreshState.refreshTimer = null;
            }
            if (options.keepQueued) {
                BackgroundRefreshState.refreshQueued = true;
                return;
            }
            BackgroundRefreshState.refreshQueued = false;
            if (!options.keepPendingSignal) {
                BackgroundRefreshState.externalSyncPending = false;
            }
        }

        function resumeBackgroundRefresh_(reason = 'visible') {
            if (!RuntimeState.hasCurrentUser() || isDocumentHidden_()) return;
            if (BackgroundRefreshState.refreshInFlight) return;
            if (BackgroundRefreshState.externalSyncPending || BackgroundRefreshState.refreshQueued) {
                BackgroundRefreshState.refreshQueued = false;
                runBackgroundRefresh_(reason);
                return;
            }
            scheduleBackgroundRefresh_(reason, 120);
        }

        function handleDocumentVisibilityChange_() {
            if (isDocumentHidden_()) {
                stopBackgroundRefresh_({ keepQueued: true, keepPendingSignal: true });
                return;
            }
            resumeBackgroundRefresh_('visibility-resume');
        }

        function scheduleBackgroundRefresh_(reason = 'poll', delayMs = CONFIG.REFRESH?.pollIntervalMs) {
            if (!RuntimeState.hasCurrentUser()) return;
            if (isDocumentHidden_()) {
                BackgroundRefreshState.refreshQueued = true;
                return;
            }

            const timeoutMs = Math.max(80, Number(delayMs) || Number(CONFIG.REFRESH?.pollIntervalMs) || 45000);
            if (BackgroundRefreshState.refreshTimer) {
                clearTimeout(BackgroundRefreshState.refreshTimer);
            }

            BackgroundRefreshState.refreshTimer = setTimeout(() => {
                BackgroundRefreshState.refreshTimer = null;
                runBackgroundRefresh_(reason);
            }, timeoutMs);
        }

        function runBackgroundRefresh_(reason = 'poll') {
            if (!RuntimeState.hasCurrentUser()) return;
            if (isDocumentHidden_()) {
                BackgroundRefreshState.refreshQueued = true;
                return;
            }
            if (BackgroundRefreshState.refreshInFlight) {
                BackgroundRefreshState.refreshQueued = true;
                return;
            }

            BackgroundRefreshState.refreshInFlight = true;
            const activeLoad = RuntimeState.getDataLoadPromise();
            const tasks = [activeLoad || loadData()];
            if (isInspectorRole_()) {
                tasks.push(syncWorkDayStateFromServer_({ force: true, silent: true }).catch(() => null));
            }

            Promise.allSettled(tasks)
                .finally(() => {
                    const hadExternalSyncPending = !!BackgroundRefreshState.externalSyncPending;
                    BackgroundRefreshState.refreshInFlight = false;
                    BackgroundRefreshState.externalSyncPending = false;
                    if (!RuntimeState.hasCurrentUser()) return;
                    if (BackgroundRefreshState.refreshQueued) {
                        BackgroundRefreshState.refreshQueued = false;
                        scheduleBackgroundRefresh_('queued', hadExternalSyncPending ? 80 : CONFIG.REFRESH?.reloadDebounceMs);
                        return;
                    }
                    scheduleBackgroundRefresh_('poll', CONFIG.REFRESH?.pollIntervalMs);
                });
        }

        function requestImmediateExternalRefresh_(reason = 'external-sync', signalAt = Date.now()) {
            const normalizedAt = Math.max(0, Number(signalAt) || 0);
            if (normalizedAt && normalizedAt <= lastExternalSyncSignalAt_) return;
            if (normalizedAt) lastExternalSyncSignalAt_ = normalizedAt;
            if (!RuntimeState.hasCurrentUser()) return;
            BackgroundRefreshState.externalSyncPending = true;
            if (BackgroundRefreshState.refreshTimer) {
                clearTimeout(BackgroundRefreshState.refreshTimer);
                BackgroundRefreshState.refreshTimer = null;
            }
            if (isDocumentHidden_()) {
                BackgroundRefreshState.refreshQueued = true;
                return;
            }
            if (BackgroundRefreshState.refreshInFlight || RuntimeState.getDataLoadPromise()) {
                BackgroundRefreshState.refreshQueued = true;
                return;
            }
            runBackgroundRefresh_(reason);
        }

        function clearPersistedMapFiltersForCurrentUser_() {
            const baseKey = String(CONFIG.FILTERS_STORAGE_KEY || 'mpro_filters');
            const userNorm = normalizeInspectorName_(RuntimeState.getCurrentUserName(''));
            const storageKey = userNorm ? `${baseKey}:${userNorm}` : baseKey;
            try {
                localStorage.removeItem(storageKey);
            } catch (_) {
                // no-op
            }
            try {
                FiltersState.setCurrent({ inspectors: [], lists: [] });
            } catch (_) {
                // no-op
            }
            try {
                UIState.setObjectsTabInspectorCache({ inspectors: [], divisions: [] });
            } catch (_) {
                // no-op
            }
        }

        function handleExternalSyncSignal_(rawSignal, reason = 'external-sync') {
            if (!rawSignal) return;
            let payload = rawSignal;
            if (typeof rawSignal === 'string') {
                try {
                    payload = JSON.parse(rawSignal);
                } catch (_) {
                    payload = { at: Date.now() };
                }
            }
            if (!payload || typeof payload !== 'object') return;
            if (String(payload.publishMode || '').trim() === 'replace') {
                clearPersistedMapFiltersForCurrentUser_();
            }
            requestImmediateExternalRefresh_(reason, payload.at);
        }

        function initExternalSyncBridge_() {
            window.addEventListener('storage', (event) => {
                if (!event || event.key !== MPRO_SYNC_SIGNAL_STORAGE_KEY || !event.newValue) return;
                handleExternalSyncSignal_(event.newValue, 'storage-sync');
            });

            try {
                if ('BroadcastChannel' in window) {
                    mproSyncBroadcastChannel_ = new BroadcastChannel('mpro-sync');
                    mproSyncBroadcastChannel_.addEventListener('message', (event) => {
                        handleExternalSyncSignal_(event?.data, 'broadcast-sync');
                    });
                }
            } catch (_) {
                mproSyncBroadcastChannel_ = null;
            }
        }
        
        let mproBootRuntimeStarted_ = false;

        function startMproBootRuntime_() {
            if (mproBootRuntimeStarted_) return;
            mproBootRuntimeStarted_ = true;
            initDelegatedEvents_();
            initExternalSyncBridge_();
            syncViewportHeight_();
            syncMobileLayoutState_();
            window.addEventListener('resize', () => {
                syncViewportHeight_();
                scheduleMenuIndicatorSync_();
                syncMobileLayoutState_();
            });
            window.addEventListener('orientationchange', () => {
                setTimeout(syncViewportHeight_, 120);
            });
            window.addEventListener('pageshow', () => {
                setTimeout(syncViewportHeight_, 60);
            });
            document.addEventListener('visibilitychange', handleDocumentVisibilityChange_);
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', syncViewportHeight_);
                window.visualViewport.addEventListener('scroll', syncViewportHeight_);
            }
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    setMobileFabExpanded_(false);
                    setMapInlineSearchOpen_(false);
                }
                if (event.key === 'Enter' && event.target && event.target.id === 'mapInlineSearchInput') {
                    event.preventDefault();
                    submitMapInlineSearch_();
                }
            });
            
            if (isLoggedIn) {
                // Пользователь авторизован: показываем приложение сразу
                RuntimeState.setCurrentUser(bootSession.user);
                RuntimeState.setSessionToken(bootSession.sessionToken);
                const bootDateToken = buildDateToken_();
                const hydratedFromCache = hydrateDataFromBootstrapCache_(bootSession.sessionToken, {
                    dateToken: bootDateToken
                });
                markMproShellReady_();
                updateUserCard();
                initWorkDayStateForCurrentUser_({ force: true, silent: true });
                scheduleMapWarmup_({
                    delayMs: hydratedFromCache ? 900 : 1400,
                    timeoutMs: 2400
                });
                loadDataWithRetry_({
                    attempts: hydratedFromCache ? 1 : 3,
                    retryDelayMs: hydratedFromCache ? 300 : 800,
                    reason: hydratedFromCache ? 'boot-validate' : 'boot',
                    dateToken: bootDateToken
                })
                    .catch((error) => {
                        console.error('Initial data load failed:', error);
                        if (hydratedFromCache) return;
                        showNotification('Ошибка загрузки данных. Проверьте сеть или обновите страницу', 'error');
                    })
                    .finally(() => {
                        if (RuntimeState.hasCurrentUser()) {
                            scheduleBackgroundRefresh_('boot-ready');
                        }
                    });
                scheduleMenuIndicatorSync_();
            } else {
                // Пользователь не авторизован: показываем оверлей входа
                window.location.replace(SITE_APP_ENTRY_URL);
                return;
                // Подключаем обработчики событий
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startMproBootRuntime_, { once: true });
        } else {
            startMproBootRuntime_();
        }
        
        // Функциональность перетаскивания нижнего меню с поддержкой MutationObserver
        (function () {
            let listenersAttached = false;
            let isDragging = false;
            let dragInputType = '';
            let currentIndex = 0;
            
            /**
             * Инициализировать интерактивность стеклянного меню
             * Настраивает перетаскивание индикатора меню
             * @returns {boolean} Успешно ли инициализировано
             */
            function initGlassInteractions() {
                if (listenersAttached) return true;
                
                const menu = document.querySelector('.modern-menu');
                if (!menu) return false;
                
                const indicator = menu.querySelector('.menu-indicator');
                const indicatorInner = menu.querySelector('.menu-indicator-inner');
                if (!indicator) return false;
                

                
                // Логика перетаскивания стеклянного индикатора меню
                const buttons = menu.querySelectorAll('.modern-menu-btn');
                const tabCount = buttons.length;
                
                /**
                 * Обновить позицию индикатора меню
                 * @param {number} index - Индекс активной кнопки
                 * @param {boolean} [animate=true] - Использовать ли анимацию
                 */
                function updateIndicator(index, animate = true) {
                    currentIndex = Math.max(0, Math.min(index, tabCount - 1));
                    const activeBtn = buttons[currentIndex];
                    if (!activeBtn) return;
                    
                    if (animate) {
                        indicator.style.transition = 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
                        if (indicatorInner) {
                            indicatorInner.style.transition = 'left 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
                        }
                    } else {
                        indicator.style.transition = 'none';
                        if (indicatorInner) {
                            indicatorInner.style.transition = 'none';
                        }
                    }
                    
                    indicator.style.width = `${activeBtn.offsetWidth}px`;
                    indicator.style.left = `${activeBtn.offsetLeft}px`;
                    
                    if (indicatorInner) {
                        indicatorInner.style.width = `${menu.offsetWidth}px`;
                        indicatorInner.style.left = `-${activeBtn.offsetLeft}px`;
                    }
                    
                    // Обновить активные состояния кнопок
                    buttons.forEach((btn, i) => {
                        btn.classList.toggle('active', i === currentIndex);
                    });
                }
                
                function extractClientX_(e) {
                    if (!e) return null;
                    if (typeof e.clientX === 'number') return e.clientX;
                    const touches = e.touches;
                    if (touches && touches.length) return touches[0].clientX;
                    const changedTouches = e.changedTouches;
                    if (changedTouches && changedTouches.length) return changedTouches[0].clientX;
                    return null;
                }

                /**
                 * Обновить положение индикатора по координате X.
                 * Возвращает индекс ближайшей вкладки.
                 */
                function updateIndicatorByClientX_(clientX) {
                    if (clientX === null) return currentIndex;
                    const rect = menu.getBoundingClientRect();
                    const relativeX = clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
                    const btnWidth = rect.width / tabCount;
                    const pixelPosition = percentage * rect.width - (btnWidth / 2);

                    const clampedLeft = Math.max(0, Math.min(pixelPosition, rect.width - btnWidth));
                    indicator.style.left = `${clampedLeft}px`;
                    if (indicatorInner) {
                        indicatorInner.style.left = `-${clampedLeft}px`;
                    }

                    return Math.round(percentage * (tabCount - 1));
                }

                /**
                 * Обработчик начала перетаскивания
                 */
                function beginDragging_(e, inputType) {
                    const clientX = extractClientX_(e);
                    if (clientX === null) return;

                    isDragging = true;
                    dragInputType = inputType || '';
                    indicator.style.transition = 'none';
                    if (indicatorInner) {
                        indicatorInner.style.transition = 'none';
                    }
                    if (dragInputType === 'touch') {
                        e.preventDefault();
                    }
                    updateIndicatorByClientX_(clientX);
                }

                /**
                 * Обработчик движения при перетаскивании
                 */
                function handleMove(e) {
                    if (!isDragging) return;
                    const clientX = extractClientX_(e);
                    if (clientX === null) return;
                    if (dragInputType === 'touch') {
                        e.preventDefault();
                    }
                    updateIndicatorByClientX_(clientX);
                }

                /**
                 * Обработчик окончания перетаскивания
                 */
                function handleEnd(e) {
                    if (!isDragging) return;
                    const clientX = extractClientX_(e);
                    isDragging = false;
                    const newIndex = updateIndicatorByClientX_(clientX);
                    updateIndicator(newIndex, true);

                    const targetBtn = buttons[currentIndex];
                    if (targetBtn) {
                        const tabName = targetBtn.id.replace('btn-', '');
                        if (tabName) {
                            switchNav(tabName);
                        }
                    }
                }

                // Подключить события перетаскивания (мышь + touch).
                indicator.addEventListener('mousedown', (e) => beginDragging_(e, 'mouse'));
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleEnd);

                indicator.addEventListener('touchstart', (e) => beginDragging_(e, 'touch'), { passive: false });
                document.addEventListener('touchmove', handleMove, { passive: false });
                document.addEventListener('touchend', handleEnd, { passive: true });
                document.addEventListener('touchcancel', handleEnd, { passive: true });
                
                listenersAttached = true;
                return true;
            }
            
            // Пробуем инициализировать сразу
            if (initGlassInteractions()) return;
            
            // Если DOM еще не готов, наблюдаем за изменениями
            const observer = new MutationObserver(() => {
                if (initGlassInteractions()) {
                    observer.disconnect();
                }
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
            
            // Защитный сценарий: отключаем наблюдатель через 5 секунд
            setTimeout(() => observer.disconnect(), 5000); // Резервный таймаут для MutationObserver
        })();
        
        // ============================================
        // Модуль авторизации
        // ============================================
        
        /**
         * Выполнить вход через JSONP-запрос к GAS
         * Проверяет пароль и инициализирует сессию
         */


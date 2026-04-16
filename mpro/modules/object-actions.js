// Object detail workflow and actions extracted from app-legacy.js

function openObjectDetails(objectId) {
            if (!ensureCurrentUserCanInteractWithObjects_('Открой рабочий день, чтобы работать с точками')) {
                return;
            }
            const object = DataState.findObjectById(objectId);
            if (!object) {
                console.error('❌ Объект не найден:', objectId);
                return;
            }
            
            UIState.setCurrentOpenObjectId(objectId);
            UIState.setSelectedObjectId(objectId);
            const content = UIState.getDomById('objectDetailsContent');
            if (!content) return;
            
            renderOpenObjectDetailsContent_(object);
            
            const overlay = UIState.getDomById('objectDetailsOverlay');
            if (!overlay) return;
            overlay.classList.add('object-details--visible');
            overlay.classList.remove('hidden');
            document.body.classList.add('object-details-open');
            
            // Инициализировать кнопки Яндекс.Диска
            setTimeout(() => {
                initYandexDiskButtons();
            }, 100);
        }
        
        function isRetriableObjectActionError_(error) {
            if (typeof isRetriableSupabaseTransportError_ === 'function' && isRetriableSupabaseTransportError_(error)) {
                return true;
            }
            const status = Number(error?.status || error?.response?.status || 0);
            const code = String(error?.code || '').trim().toUpperCase();
            const message = String(
                error?.message ||
                error?.error ||
                error?.details ||
                error
            ).trim().toUpperCase();
            return (
                code === 'TIMEOUT' ||
                status === 0 ||
                status === 408 ||
                status === 425 ||
                status === 429 ||
                status >= 500 ||
                message.indexOf('TIMEOUT') >= 0 ||
                message.indexOf('FAILED TO FETCH') >= 0 ||
                message.indexOf('LOAD FAILED') >= 0 ||
                message.indexOf('CONNECTION') >= 0 ||
                message.indexOf('NETWORK') >= 0
            );
        }

        function waitForObjectActionRetry_(delayMs) {
            const timeoutMs = Math.max(400, Number(delayMs) || 0);
            if (typeof navigator === 'undefined' || navigator.onLine !== false) {
                return new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 700)));
            }
            return new Promise((resolve) => {
                let settled = false;
                let timerId = 0;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('online', handleOnline);
                    if (timerId) clearTimeout(timerId);
                    resolve();
                };
                const handleOnline = () => finish();
                window.addEventListener('online', handleOnline, { once: true });
                timerId = window.setTimeout(finish, timeoutMs);
            });
        }

        function executeObjectActionRequestWithRetry_(payload, options = {}) {
            const attempts = Math.max(1, Number(options.attempts) || 1);
            const timeoutMs = Math.max(5000, Number(options.timeout) || 15000);
            const onRetry = typeof options.onRetry === 'function' ? options.onRetry : null;
            let attempt = 0;

            const run = () => {
                attempt += 1;
                return Promise.resolve(MproApi.executeObjectAction(payload, timeoutMs))
                    .then((response) => {
                        if (response?.success !== false) return response;
                        const responseError = {
                            ...response,
                            message: String(response?.error || response?.message || '').trim(),
                            code: String(response?.code || '').trim(),
                            status: Number(response?.status || 0)
                        };
                        if (attempt >= attempts || !isRetriableObjectActionError_(responseError)) {
                            return response;
                        }
                        if (onRetry) onRetry({ attempt, maxAttempts: attempts, error: responseError });
                        return waitForObjectActionRetry_(650 * attempt).then(run);
                    })
                    .catch((error) => {
                        if (attempt >= attempts || !isRetriableObjectActionError_(error)) {
                            throw error;
                        }
                        if (onRetry) onRetry({ attempt, maxAttempts: attempts, error });
                        return waitForObjectActionRetry_(650 * attempt).then(run);
                    });
            };

            return run();
        }

        function executeObjectActionEnhanced_(objectId, action, params) {
            if (!objectId) {
                showNotification('❌ Ошибка: не указан ID объекта', 'error');
                return Promise.resolve({ success: false, error: 'Object id missing' });
            }

            if (!action || typeof action !== 'string') {
                showNotification('❌ Ошибка: не указано действие', 'error');
                return Promise.resolve({ success: false, error: 'Action missing' });
            }

            const internalParams = params && typeof params === 'object' ? { ...params } : {};
            const keepOpen = !!internalParams._keepOpen;
            const skipOptimistic = !!internalParams._skipOptimistic;
            const onSuccess = typeof internalParams._onSuccess === 'function' ? internalParams._onSuccess : null;
            const onError = typeof internalParams._onError === 'function' ? internalParams._onError : null;
            const onRetry = typeof internalParams._onRetry === 'function' ? internalParams._onRetry : null;
            const requestAttempts = Math.max(1, Number(internalParams._requestAttempts) || 1);
            const requestTimeout = Math.max(5000, Number(internalParams._requestTimeout) || 15000);
            delete internalParams._keepOpen;
            delete internalParams._skipOptimistic;
            delete internalParams._onSuccess;
            delete internalParams._onError;
            delete internalParams._onRetry;
            delete internalParams._requestAttempts;
            delete internalParams._requestTimeout;

            const object = DataState.findObjectById(objectId);
            if (object && !skipOptimistic) {
                optimisticallyUpdateObject_(objectId, action, internalParams);
            }

            if (!keepOpen) closeObjectDetails();

            const requestParams = {
                action: action,
                objectId: String(objectId),
                dbObjectId: String(object?.dbObjectId || ''),
                dbVisitId: String(object?.dbVisitId || ''),
                source: object?.source || 'Map',
                rowIndex: String(object?.rowIndex || ''),
                list: String(object?.list || ''),
                ...internalParams
            };

            const requestPayloadPromise = action === 'entry'
                ? getCurrentGeoCoordsForWorkDay_()
                    .then((coords) => {
                        const coordsValue = String(coords || '').trim();
                        if (coordsValue) {
                            const parts = coordsValue.split(',');
                            const lat = String(parts[0] || '').trim();
                            const lon = String(parts[1] || '').trim();
                            requestParams.coords = coordsValue;
                            requestParams.entry = coordsValue;
                            if (lat) requestParams.lat = lat;
                            if (lon) requestParams.lon = lon;
                        }
                        return requestParams;
                    })
                    .catch(() => requestParams)
                : Promise.resolve(requestParams);

            return requestPayloadPromise
                .then((payload) => executeObjectActionRequestWithRetry_(payload, {
                    attempts: requestAttempts,
                    timeout: requestTimeout,
                    onRetry
                }))
                .then((response) => {
                    if (response.success) {
                        showNotification('✅ ' + (response.message || 'Действие выполнено'), 'success');
                        if (onSuccess) onSuccess(response);
                        if (action === 'entry' || action === 'exit' || action === 'cancelEntry' || action === 'denyAccess') {
                            clearObjectFactState_(objectId);
                            if (isInspectorRole_()) {
                                syncWorkDayStateFromServer_({ force: true, silent: true }).catch(() => null);
                            }
                            scheduleBackgroundReloadAfterObjectAction_();
                        }
                        return response;
                    }

                    showNotification('❌ ' + (response.error || 'Ошибка'), 'error');
                    if (onError) onError(response);
                    if (!skipOptimistic) rollbackObjectUpdate_(objectId);
                    return response;
                })
                .catch((error) => {
                    showNotification('❌ Ошибка соединения', 'error');
                    console.error('Action error:', error);
                    if (onError) onError(error);
                    if (!skipOptimistic) rollbackObjectUpdate_(objectId);
                    return { success: false, error };
                });
        }

        const executeObjectAction_ = executeObjectActionEnhanced_;

        /**
         * Закрыть модальное окно деталей объекта
         */
        function closeObjectDetails() {
            UIState.clearCurrentOpenObjectId();
            const overlay = UIState.getDomById('objectDetailsOverlay');
            if (!overlay) return;
            overlay.classList.remove('object-details--visible');
            overlay.classList.add('hidden');
            document.body.classList.remove('object-details-open');
        }
        
        /**
         * Получить конфигурацию статуса объекта.
         * @param {Object} obj - Данные объекта
         * @returns {{isNew: boolean, isActive: boolean, isDenied: boolean, isCompleted: boolean}}
         */
        function getObjectStatus(obj) {
            const isNew = !obj.entryTime && !obj.exitTime;
            const isActive = obj.entryTime && !obj.exitTime;
            const isDenied = obj.exitTime === 'нет';
            const isCompleted = !!obj.exitTime && !isDenied;
            return { isNew, isActive, isDenied, isCompleted };
        }

        function renderActionIcon_(iconName) {
            const icon = String(iconName || '').trim().toLowerCase();
            const icons = {
                checklist: `
                    <path d="M9 5h10"></path>
                    <path d="M9 12h10"></path>
                    <path d="M9 19h10"></path>
                    <path d="M4 5.5l1.5 1.5L7.8 4.7"></path>
                    <path d="M4 12.5l1.5 1.5 2.3-2.3"></path>
                    <path d="M4 19.5l1.5 1.5 2.3-2.3"></path>
                `,
                coordinates: `
                    <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"></path>
                    <circle cx="12" cy="10" r="2.4"></circle>
                `,
                entry: `
                    <path d="M14 5h4v14h-4"></path>
                    <path d="M10 8l-4 4 4 4"></path>
                    <path d="M6 12h11"></path>
                `,
                exit: `
                    <path d="M10 5H6v14h4"></path>
                    <path d="M14 8l4 4-4 4"></path>
                    <path d="M7 12h11"></path>
                `,
                undo: `
                    <path d="M9 9H5V5"></path>
                    <path d="M5 9a8 8 0 1 1-1 5"></path>
                `,
                denied: `
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M9 9l6 6"></path>
                    <path d="M15 9l-6 6"></path>
                `,
                scheme: `
                    <path d="M9 6l6 2.5-6 2.5L3 8.5 9 6Z"></path>
                    <path d="M3 12l6 2.5 6-2.5"></path>
                    <path d="M3 15.5L9 18l6-2.5"></path>
                    <path d="M15 8.5V18"></path>
                `,
                photos: `
                    <rect x="4" y="5" width="16" height="14" rx="2"></rect>
                    <circle cx="9" cy="10" r="1.4"></circle>
                    <path d="M6.5 16l3.8-3.8a1 1 0 0 1 1.4 0L14 14.5l1.8-1.8a1 1 0 0 1 1.4 0L19 14.5"></path>
                `,
                folders: `
                    <path d="M3 8.5h18"></path>
                    <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"></path>
                `,
                copy: `
                    <rect x="9" y="9" width="10" height="10" rx="2"></rect>
                    <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
                `,
                default: `
                    <path d="M6 12h12"></path>
                    <path d="M12 6v12"></path>
                `
            };
            const markup = icons[icon] || icons.default;
            return `<span class="object-card__button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${markup}</svg></span>`;
        }

        function renderActionLabel_(iconName, text, meta = '') {
            const safeText = Utils.escapeHtml(String(text || ''));
            const safeMeta = Utils.escapeHtml(String(meta || ''));
            const metaHtml = safeMeta
                ? `<span class="object-card__button-meta">${safeMeta}</span>`
                : '';
            return `
                ${renderActionIcon_(iconName)}
                <span class="object-card__button-copy">
                    <span class="object-card__button-text">${safeText}</span>
                    ${metaHtml}
                </span>
                <span class="object-card__button-arrow" aria-hidden="true">
                    <svg viewBox="0 0 20 20" focusable="false">
                        <path d="M7 4.5 12.5 10 7 15.5"></path>
                    </svg>
                </span>
            `;
        }

        function renderQuickLinkLabel_(iconName, text, meta = '') {
            const safeText = Utils.escapeHtml(String(text || ''));
            const safeMeta = Utils.escapeHtml(String(meta || ''));
            const metaHtml = safeMeta
                ? `<span class="object-card__quick-link-meta">${safeMeta}</span>`
                : '';
            return `
                ${renderActionIcon_(iconName)}
                <span class="object-card__quick-link-copy">
                    <span class="object-card__quick-link-text">${safeText}</span>
                    ${metaHtml}
                </span>
            `;
        }
        
        
        /**
         * Сформировать селект переназначения инспектора.
         * @param {Object} obj - Данные объекта
         * @returns {string} HTML-строка
         */
        function renderReassignSelect(obj) {
            if (isInspectorRole_()) return '';
            const inspectorsList = Array.isArray(DataState.getInspectorsList())
                ? DataState.getInspectorsList()
                : [];
            const currentInspectorNorm = normalizeInspectorName_(obj?.inspector);
            const currentInspectorAssigned = !!String(obj?.inspector || '').trim();
            const seen = new Set();
            const reassignInspectors = inspectorsList
                .filter(item => {
                    if (!item || !item.name) return false;
                    const role = String(item.role || '').toLowerCase();
                    if (role && (role.indexOf('admin') !== -1 || role.indexOf('админ') !== -1)) return false;
                    const norm = normalizeInspectorName_(item.name);
                    if (!norm || seen.has(norm)) return false;
                    seen.add(norm);
                    return true;
                })
                .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru'));

            const objectIdAttr = Utils.escapeAttr(obj.id);
            const currentLabelState = currentInspectorAssigned
                ? String(obj?.inspector || '').trim()
                : getUnassignedInspectorLabel_();
            const triggerClassNameState = 'object-card__dropdown-trigger-text';
            const currentInspectorText = currentInspectorAssigned
                ? String(obj?.inspector || '').trim()
                : getUnassignedInspectorLabel_();
            const currentLabel = currentInspectorText || 'Выберите инспектора';
            const triggerClassName = currentInspectorText
                ? 'object-card__dropdown-trigger-text'
                : 'object-card__dropdown-trigger-text object-card__dropdown-trigger-text--placeholder';
            const options = [
                {
                    name: '',
                    label: getUnassignedInspectorLabel_(),
                    inspectorNorm: normalizeInspectorName_(getUnassignedInspectorLabel_()),
                    isSelected: !currentInspectorAssigned
                }
            ].concat(reassignInspectors.map(item => ({
                name: String(item.name || '').trim(),
                label: String(item.name || '').trim(),
                inspectorNorm: normalizeInspectorName_(String(item.name || '').trim()),
                isSelected: normalizeInspectorName_(String(item.name || '').trim()) === currentInspectorNorm
            }))).map(item => {
                const inspectorName = String(item.name || '').trim();
                const inspectorNorm = String(item.inspectorNorm || '').trim();
                const isSelected = !!item.isSelected;
                const valueAttr = Utils.escapeAttr(inspectorName);
                const optionText = Utils.escapeHtml(String(item.label || inspectorName));
                return `
                    <button
                        type="button"
                        class="object-card__dropdown-option${isSelected ? ' is-selected' : ''}"
                        data-action="select-reassign-inspector"
                        data-object-id="${objectIdAttr}"
                        data-inspector-value="${valueAttr}"
                        data-inspector-norm="${Utils.escapeAttr(inspectorNorm)}"
                    >
                        <span class="object-card__dropdown-option-text">${optionText}</span>
                        <span class="object-card__dropdown-option-check" aria-hidden="true">
                            <svg viewBox="0 0 20 20" focusable="false">
                                <path d="M4.5 10.5 8 14l7.5-8"></path>
                            </svg>
                        </span>
                    </button>
                `;
            }).join('');

            return `
                <div class="object-card__dropdown" data-dropdown="reassign-inspector" data-object-id="${objectIdAttr}">
                    <button
                        type="button"
                        class="object-card__dropdown-trigger"
                        data-action="toggle-reassign-dropdown"
                        data-object-id="${objectIdAttr}"
                        aria-expanded="false"
                    >
                        <span class="object-card__dropdown-trigger-copy">
                            <span class="${triggerClassNameState}">${Utils.escapeHtml(currentLabelState)}</span>
                        </span>
                        <span class="object-card__dropdown-trigger-icon" aria-hidden="true">
                            <svg viewBox="0 0 20 20" focusable="false">
                                <path d="M5 7.5 10 12.5 15 7.5"></path>
                            </svg>
                        </span>
                    </button>
                    <div class="object-card__dropdown-menu" hidden>
                        <div class="object-card__dropdown-search-wrap">
                            <input
                                type="text"
                                class="object-card__dropdown-search"
                                data-input-action="filter-reassign-options"
                                placeholder="Поиск инспектора"
                                autocomplete="off"
                                spellcheck="false"
                            >
                        </div>
                        <div class="object-card__dropdown-options" role="listbox">
                            ${options}
                            <div class="object-card__dropdown-empty" hidden>Ничего не найдено</div>
                        </div>
                    </div>
                </div>
            `;
        }

        function closeReassignDropdowns_(exceptRoot = null) {
            document.querySelectorAll('.object-card__dropdown--open').forEach((root) => {
                if (!(root instanceof HTMLElement)) return;
                if (exceptRoot && root === exceptRoot) return;
                root.classList.remove('object-card__dropdown--open');
                const trigger = root.querySelector('.object-card__dropdown-trigger');
                const menu = root.querySelector('.object-card__dropdown-menu');
                const search = root.querySelector('.object-card__dropdown-search');
                const empty = root.querySelector('.object-card__dropdown-empty');
                if (trigger) trigger.setAttribute('aria-expanded', 'false');
                if (menu instanceof HTMLElement) menu.hidden = true;
                if (search instanceof HTMLInputElement) {
                    search.value = '';
                    filterReassignOptions_(search);
                }
                if (empty instanceof HTMLElement) empty.hidden = true;
            });
        }

        function scrollSelectedReassignOptionIntoView_(root, behavior = 'auto') {
            if (!(root instanceof HTMLElement)) return;
            const selectedNode = root.querySelector('.object-card__dropdown-option.is-selected:not([hidden])');
            if (!(selectedNode instanceof HTMLElement)) return;
            selectedNode.scrollIntoView({
                block: 'nearest',
                inline: 'nearest',
                behavior
            });
        }

        function filterReassignOptions_(inputNode) {
            if (!(inputNode instanceof HTMLInputElement)) return;
            const root = inputNode.closest('.object-card__dropdown');
            if (!(root instanceof HTMLElement)) return;
            const query = normalizeInspectorName_(inputNode.value);
            let visibleCount = 0;
            root.querySelectorAll('.object-card__dropdown-option').forEach((optionNode) => {
                if (!(optionNode instanceof HTMLElement)) return;
                const optionNorm = String(optionNode.dataset.inspectorNorm || '');
                const isVisible = !query || optionNorm.indexOf(query) !== -1;
                optionNode.hidden = !isVisible;
                if (isVisible) visibleCount += 1;
            });
            const emptyNode = root.querySelector('.object-card__dropdown-empty');
            if (emptyNode instanceof HTMLElement) {
                emptyNode.hidden = visibleCount > 0;
            }
        }

        function toggleReassignDropdown_(actionNode) {
            const root = actionNode instanceof Element
                ? actionNode.closest('.object-card__dropdown')
                : null;
            if (!(root instanceof HTMLElement)) return;
            if (root.classList.contains('object-card__dropdown--open')) {
                closeReassignDropdowns_();
                return;
            }
            closeReassignDropdowns_(root);
            root.classList.add('object-card__dropdown--open');
            const trigger = root.querySelector('.object-card__dropdown-trigger');
            const menu = root.querySelector('.object-card__dropdown-menu');
            const search = root.querySelector('.object-card__dropdown-search');
            if (trigger) trigger.setAttribute('aria-expanded', 'true');
            if (menu instanceof HTMLElement) menu.hidden = false;
            if (search instanceof HTMLInputElement) {
                search.value = '';
                filterReassignOptions_(search);
                requestAnimationFrame(() => {
                    scrollSelectedReassignOptionIntoView_(root);
                    search.focus();
                });
            }
        }

        function selectReassignInspectorOption_(actionNode) {
            if (!(actionNode instanceof HTMLElement)) return;
            const objectId = String(actionNode.dataset.objectId || '').trim();
            const inspectorValue = String(actionNode.dataset.inspectorValue || '').trim();
            if (!objectId) return;
            closeReassignDropdowns_();
            reassignInspector(objectId, inspectorValue);
        }
        
        /**
         * Сформировать кнопку Яндекс.Диска.
         * @param {Object} obj - Данные объекта
         * @param {boolean} isActive - Активен ли объект
         * @returns {string} HTML-строка
         */
        // Yandex card actions extracted to mpro/modules/yandex-integration.js.

        function getRenderSig_(value) {
            const input = String(value ?? '');
            let hash = 2166136261;
            for (let i = 0; i < input.length; i += 1) {
                hash ^= input.charCodeAt(i);
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                hash >>>= 0;
            }
            return hash.toString(16);
        }

        function formatLabStudyTypeLabel_(value) {
            const text = String(value || '').trim();
            if (!text) return '';
            const upper = text.toUpperCase();
            if (text === upper && /\p{Lu}/u.test(text)) {
                return text;
            }
            const lower = text.toLowerCase();
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        }

        function formatLabStudyNumber_(value) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return '';
            if (Math.abs(numeric - Math.round(numeric)) < 0.000001) {
                return String(Math.round(numeric));
            }
            return String(Math.round(numeric * 100) / 100).replace('.', ',');
        }

        function getLabStudyStatusLabel_(value) {
            const normalized = String(value || '').trim().toLowerCase();
            if (normalized === 'pending') return 'Назначено';
            if (normalized === 'in_progress') return 'В работе';
            if (normalized === 'completed') return 'Завершено';
            if (normalized === 'not_completed') return 'Не завершено';
            return '';
        }

        function buildLabStudyParametersText_(obj) {
            const parts = [];
            const lengthText = formatLabStudyNumber_(obj?.labStudyLengthM);
            const widthText = formatLabStudyNumber_(obj?.labStudyWidthM);
            if (lengthText) parts.push(`Длина ${lengthText} м`);
            if (widthText) parts.push(`Ширина ${widthText} м`);
            return parts.join(' • ');
        }

        function buildLabStudySummaryText_(obj) {
            const parts = [];
            const typeText = formatLabStudyTypeLabel_(obj?.labStudyType || obj?.laboratory);
            const statusText = getLabStudyStatusLabel_(obj?.labStudyStatus);
            if (typeText) parts.push(typeText);
            if (statusText) parts.push(statusText);
            return parts.join(' • ');
        }

        function parseLabStudyCoords_(value) {
            const text = String(value || '')
                .replace(/\u00A0/g, ' ')
                .trim();
            if (!text) return null;

            const match = text.match(/(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
            if (!match) return null;

            const lat = Number(String(match[1] || '').replace(',', '.'));
            const lon = Number(String(match[2] || '').replace(',', '.'));
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            return { lat, lon };
        }

        function formatLabStudyCoordsText_(coords) {
            if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return '—';
            return `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
        }

        function getLabStudyCenterCoords_(obj) {
            const studyPoint = parseLabStudyCoords_(obj?.labStudyLatLon);
            if (studyPoint) return studyPoint;

            const lat = Number(obj?.latitude);
            const lon = Number(obj?.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            return { lat, lon };
        }

        function getLabStudySchemePayload_(obj) {
            if (!obj || typeof obj !== 'object') return null;

            const start = parseLabStudyCoords_(obj?.labStudyStartLatLon);
            const study = getLabStudyCenterCoords_(obj);
            const finish = parseLabStudyCoords_(obj?.labStudyFinishLatLon);
            if (!start || !study || !finish) return null;

            return {
                displayId: Utils.extractDisplayId(obj.originalId || obj.id),
                address: String(obj?.address || '').trim(),
                points: [
                    {
                        key: 'start',
                        title: 'Начало объекта',
                        marker: '1',
                        coords: start
                    },
                    {
                        key: 'study',
                        title: 'Точка исследования',
                        marker: '2',
                        coords: study
                    },
                    {
                        key: 'finish',
                        title: 'Конец объекта',
                        marker: '3',
                        coords: finish
                    }
                ]
            };
        }

        function canOpenLabStudyScheme_(obj) {
            return !!getLabStudySchemePayload_(obj);
        }

        const OBJECT_FACT_DRAFTS_ = new Map();
        const OBJECT_FACT_SAVE_PENDING_ = new Set();
        const OBJECT_FACT_SESSION_VALUES_ = new Map();
        const OBJECT_FACT_STORAGE_PREFIX_ = 'mpro:object-facts:';

        function normalizeObjectFactText_(value) {
            return String(value ?? '')
                .replace(/\u00A0/g, ' ')
                .trim();
        }

        function sanitizeObjectFactDraftValue_(fieldKey, value) {
            const raw = String(value ?? '').replace(/\u00A0/g, ' ');
            if (fieldKey === 'peopleCount') {
                return raw.replace(/[^\d]/g, '');
            }
            if (fieldKey === 'readiness') {
                const compact = raw.replace(/\s+/g, '').replace(/[^\d,.-]/g, '');
                const unsigned = compact.replace(/-/g, '');
                const separatorIndex = unsigned.search(/[,.]/);
                if (separatorIndex === -1) return unsigned;
                const integerPart = unsigned.slice(0, separatorIndex).replace(/[,.]/g, '');
                const separator = unsigned.charAt(separatorIndex);
                const fractionalPart = unsigned.slice(separatorIndex + 1).replace(/[,.]/g, '');
                return `${integerPart}${separator}${fractionalPart}`;
            }
            return normalizeObjectFactText_(raw);
        }

        function getSavedObjectFacts_(obj) {
            return {
                readiness: normalizeObjectFactText_(
                    obj?.readiness ||
                    obj?.currentReadiness ||
                    obj?.current_readiness ||
                    obj?.sm_1_6 ||
                    ''
                ),
                peopleCount: normalizeObjectFactText_(
                    obj?.peopleCount ||
                    obj?.currentPeopleCount ||
                    obj?.current_people_count ||
                    obj?.sm_1_7 ||
                    obj?.people_count ||
                    ''
                )
            };
        }

        function normalizeObjectFactValues_(value) {
            return {
                readiness: sanitizeObjectFactDraftValue_('readiness', value?.readiness || ''),
                peopleCount: sanitizeObjectFactDraftValue_('peopleCount', value?.peopleCount || '')
            };
        }

        function getObjectFactsVisitKey_(obj) {
            const objectId = String(obj?.id || '').trim();
            if (!objectId) return '';
            const visitId = String(obj?.dbVisitId || obj?.visitId || '').trim();
            return visitId
                ? `${OBJECT_FACT_STORAGE_PREFIX_}${objectId}:${visitId}`
                : `${OBJECT_FACT_STORAGE_PREFIX_}${objectId}:active`;
        }

        function readObjectFactsSessionValue_(storageKey) {
            if (!storageKey) return null;
            try {
                const raw = window.sessionStorage.getItem(storageKey);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                return normalizeObjectFactValues_(parsed);
            } catch (error) {
                console.warn('Failed to restore object facts state', error);
                return null;
            }
        }

        function getCachedObjectFactsSessionValue_(storageKey) {
            if (!storageKey) return null;
            if (OBJECT_FACT_SESSION_VALUES_.has(storageKey)) {
                return OBJECT_FACT_SESSION_VALUES_.get(storageKey) || null;
            }
            const restored = readObjectFactsSessionValue_(storageKey);
            if (restored) {
                OBJECT_FACT_SESSION_VALUES_.set(storageKey, restored);
            }
            return restored;
        }

        function persistObjectFactsSessionValue_(storageKey, value) {
            if (!storageKey) return normalizeObjectFactValues_(value);
            const normalized = normalizeObjectFactValues_(value);
            OBJECT_FACT_SESSION_VALUES_.set(storageKey, normalized);
            try {
                window.sessionStorage.setItem(storageKey, JSON.stringify(normalized));
            } catch (error) {
                console.warn('Failed to persist object facts state', error);
            }
            return normalized;
        }

        function removeObjectFactsSessionValue_(storageKey) {
            if (!storageKey) return;
            OBJECT_FACT_SESSION_VALUES_.delete(storageKey);
            try {
                window.sessionStorage.removeItem(storageKey);
            } catch (error) {
                console.warn('Failed to clear object facts state', error);
            }
        }

        function clearObjectFactState_(objectId) {
            const key = String(objectId || '').trim();
            if (!key) return;

            clearObjectFactDraft_(key);

            const storagePrefix = `${OBJECT_FACT_STORAGE_PREFIX_}${key}:`;
            Array.from(OBJECT_FACT_SESSION_VALUES_.keys()).forEach((entryKey) => {
                if (String(entryKey || '').indexOf(storagePrefix) === 0) {
                    OBJECT_FACT_SESSION_VALUES_.delete(entryKey);
                }
            });

            try {
                const storageKeys = [];
                for (let index = 0; index < window.sessionStorage.length; index += 1) {
                    const storageKey = window.sessionStorage.key(index);
                    if (String(storageKey || '').indexOf(storagePrefix) === 0) {
                        storageKeys.push(storageKey);
                    }
                }
                storageKeys.forEach((storageKey) => window.sessionStorage.removeItem(storageKey));
            } catch (error) {
                console.warn('Failed to clear object facts storage state', error);
            }
        }

        function getCommittedObjectFacts_(obj) {
            const status = getObjectStatus(obj);
            if (!status?.isActive) {
                return getSavedObjectFacts_(obj);
            }

            const objectId = String(obj?.id || '').trim();
            const storageKey = getObjectFactsVisitKey_(obj);
            const activeFallbackKey = `${OBJECT_FACT_STORAGE_PREFIX_}${objectId}:active`;
            let committed = getCachedObjectFactsSessionValue_(storageKey);

            if (!committed && storageKey !== activeFallbackKey) {
                committed = getCachedObjectFactsSessionValue_(activeFallbackKey);
                if (committed) {
                    persistObjectFactsSessionValue_(storageKey, committed);
                    removeObjectFactsSessionValue_(activeFallbackKey);
                }
            }

            return committed || { readiness: '', peopleCount: '' };
        }

        function getObjectFactsState_(obj) {
            const objectId = String(obj?.id || '').trim();
            const saved = getSavedObjectFacts_(obj);
            const committed = getCommittedObjectFacts_(obj);
            const draft = objectId ? OBJECT_FACT_DRAFTS_.get(objectId) : null;
            const readinessValue = draft && Object.prototype.hasOwnProperty.call(draft, 'readiness')
                ? String(draft.readiness || '')
                : committed.readiness;
            const peopleCountValue = draft && Object.prototype.hasOwnProperty.call(draft, 'peopleCount')
                ? String(draft.peopleCount || '')
                : committed.peopleCount;
            const missingReadiness = !normalizeObjectFactText_(readinessValue);
            const missingPeopleCount = !normalizeObjectFactText_(peopleCountValue);
            const hasRequiredFields = !missingReadiness && !missingPeopleCount;
            const isDirty = readinessValue !== committed.readiness || peopleCountValue !== committed.peopleCount;

            return {
                objectId,
                savedReadiness: saved.readiness,
                savedPeopleCount: saved.peopleCount,
                committedReadiness: committed.readiness,
                committedPeopleCount: committed.peopleCount,
                readinessValue,
                peopleCountValue,
                missingReadiness,
                missingPeopleCount,
                hasRequiredFields,
                isDirty,
                isSaving: objectId ? OBJECT_FACT_SAVE_PENDING_.has(objectId) : false
            };
        }

        function updateObjectFactDraft_(objectId, fieldKey, value) {
            const key = String(objectId || '').trim();
            if (!key || !fieldKey) return null;
            const object = DataState.findObjectById(key);
            if (!object) return null;
            const current = { ...(OBJECT_FACT_DRAFTS_.get(key) || {}) };
            current[fieldKey] = sanitizeObjectFactDraftValue_(fieldKey, value);

            const committed = getCommittedObjectFacts_(object);
            const normalizedReadiness = Object.prototype.hasOwnProperty.call(current, 'readiness')
                ? String(current.readiness || '')
                : committed.readiness;
            const normalizedPeopleCount = Object.prototype.hasOwnProperty.call(current, 'peopleCount')
                ? String(current.peopleCount || '')
                : committed.peopleCount;

            if (normalizedReadiness === committed.readiness && normalizedPeopleCount === committed.peopleCount) {
                OBJECT_FACT_DRAFTS_.delete(key);
            } else {
                OBJECT_FACT_DRAFTS_.set(key, current);
            }
            return getObjectFactsState_(object);
        }

        function clearObjectFactDraft_(objectId) {
            const key = String(objectId || '').trim();
            if (!key) return;
            OBJECT_FACT_DRAFTS_.delete(key);
        }

        function setObjectFactSavePending_(objectId, isPending) {
            const key = String(objectId || '').trim();
            if (!key) return;
            if (isPending) OBJECT_FACT_SAVE_PENDING_.add(key);
            else OBJECT_FACT_SAVE_PENDING_.delete(key);
            syncObjectFactsDraftUi_(key);
        }

        function applyObjectFactsToObject_(objectId, readinessValue, peopleCountValue) {
            const object = DataState.findObjectById(objectId);
            if (!object) return;
            object.readiness = String(readinessValue || '').trim();
            object.currentReadiness = object.readiness;
            object.current_readiness = object.readiness;
            object.sm_1_6 = object.readiness;
            object.peopleCount = String(peopleCountValue || '').trim();
            object.currentPeopleCount = object.peopleCount;
            object.current_people_count = object.peopleCount;
            object.people_count = object.peopleCount;
            object.sm_1_7 = object.peopleCount;
            if (getObjectStatus(object)?.isActive) {
                persistObjectFactsSessionValue_(getObjectFactsVisitKey_(object), {
                    readiness: object.readiness,
                    peopleCount: object.peopleCount
                });
            } else {
                clearObjectFactState_(objectId);
            }
            clearObjectFactDraft_(objectId);
            scheduleMapUpdate_();
            if (UIState.getCurrentOpenObjectId() == objectId) {
                renderOpenObjectDetailsContent_(object);
            }
        }

        function buildObjectFactsPayload_(objectId) {
            const object = DataState.findObjectById(objectId);
            if (!object) {
                return {
                    readinessValue: '',
                    peopleCountValue: '',
                    hasRequiredFields: false,
                    missingReadiness: true,
                    missingPeopleCount: true
                };
            }
            const state = getObjectFactsState_(object);
            return {
                readinessValue: String(state.readinessValue || '').trim(),
                peopleCountValue: String(state.peopleCountValue || '').trim(),
                hasRequiredFields: state.hasRequiredFields,
                missingReadiness: state.missingReadiness,
                missingPeopleCount: state.missingPeopleCount
            };
        }

        function syncObjectFactsDraftUi_(objectId) {
            const content = UIState.getDomById('objectDetailsContent');
            if (!content) return;
            const card = content.querySelector('.object-card');
            if (!(card instanceof HTMLElement)) return;
            if (String(card.dataset.objectId || '') !== String(objectId || '')) return;

            const object = DataState.findObjectById(objectId);
            if (!object) return;
            const facts = getObjectFactsState_(object);

            card.querySelectorAll('.object-card__fact-input').forEach((inputNode) => {
                if (inputNode instanceof HTMLInputElement) {
                    inputNode.disabled = !!facts.isSaving;
                }
            });

            const saveButton = card.querySelector('[data-action="save-object-facts"]');
            if (saveButton instanceof HTMLButtonElement) {
                saveButton.disabled = !!facts.isSaving || !facts.isDirty;
                saveButton.classList.toggle('is-loading', !!facts.isSaving);
                saveButton.textContent = facts.isSaving ? 'Сохраняем...' : 'Сохранить';
            }

            const exitButton = card.querySelector('[data-action="mark-exit"]');
            if (exitButton instanceof HTMLButtonElement) {
                exitButton.disabled = !!facts.isSaving || !facts.hasRequiredFields;
                exitButton.title = facts.hasRequiredFields
                    ? 'Завершить посещение объекта'
                    : 'Сначала заполните строительную готовность и кол-во людей';
            }

        }

        function handleObjectFactInput_(inputNode) {
            if (!(inputNode instanceof HTMLInputElement)) return;
            const objectId = String(inputNode.dataset.objectId || '').trim();
            const fieldKey = String(inputNode.dataset.factField || '').trim();
            if (!objectId || !fieldKey) return;
            const nextState = updateObjectFactDraft_(objectId, fieldKey, inputNode.value);
            if (!nextState) return;
            const normalizedValue = fieldKey === 'readiness'
                ? nextState.readinessValue
                : nextState.peopleCountValue;
            if (inputNode.value !== normalizedValue) {
                inputNode.value = normalizedValue;
            }
            syncObjectFactsDraftUi_(objectId);
        }

        function saveObjectFacts(objectId) {
            if (!ensureCurrentUserCanInteractWithObjects_()) return Promise.resolve(null);
            const objectKey = String(objectId || '').trim();
            if (!objectKey) return Promise.resolve({ success: false, error: 'Object id missing' });
            if (OBJECT_FACT_SAVE_PENDING_.has(objectKey)) {
                return Promise.resolve({ success: false, error: 'Save already in progress' });
            }
            const factsPayload = buildObjectFactsPayload_(objectKey);
            setObjectFactSavePending_(objectKey, true);
            return executeObjectAction_(objectKey, 'saveFacts', {
                readinessValue: factsPayload.readinessValue,
                peopleCountValue: factsPayload.peopleCountValue,
                _keepOpen: true,
                _skipOptimistic: true,
                _requestAttempts: 3,
                _requestTimeout: 12000,
                _onRetry: ({ attempt, maxAttempts }) => {
                    const nextAttempt = Math.min(maxAttempts, attempt + 1);
                    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                        showNotification(`Нет сети. Жду соединение и повторяю сохранение (${nextAttempt}/${maxAttempts})`, 'warning');
                        return;
                    }
                    showNotification(`Связь нестабильна. Повторяю сохранение (${nextAttempt}/${maxAttempts})`, 'warning');
                },
                _onSuccess: () => {
                    applyObjectFactsToObject_(objectKey, factsPayload.readinessValue, factsPayload.peopleCountValue);
                    showNotification('Данные сохранены', 'success');
                },
                _onError: () => {
                    syncObjectFactsDraftUi_(objectKey);
                    showNotification('Не удалось сохранить данные. Проверьте сеть и попробуйте ещё раз', 'error');
                }
            }).finally(() => {
                setObjectFactSavePending_(objectKey, false);
            });
        }

        function buildObjectCardViewModel_(obj, icon) {
            const status = getObjectStatus(obj);
            const facts = getObjectFactsState_(obj);
            const anoSmgCode = String(
                obj?.anoSmgCode ||
                obj?.sourceAnoSmgCode ||
                obj?.archive_ano_smg_code ||
                obj?.sm_1_1 ||
                obj?.ano_smg_code ||
                ''
            ).trim();
            const latitudeText = String(obj?.latitude ?? '').trim();
            const longitudeText = String(obj?.longitude ?? '').trim();
            const coordinatesText = latitudeText && longitudeText
                ? `${latitudeText}, ${longitudeText}`
                : '';

            return {
                status,
                facts,
                objectIdRaw: String(obj.id || ''),
                objectIdAttr: Utils.escapeAttr(obj.id),
                coordinates: coordinatesText,
                inspectorDisplay: Utils.escapeHtml(obj.inspector || 'Не назначен'),
                sourceLabel: Utils.escapeHtml(CONFIG.SOURCES[obj.source] || obj.source || ''),
                displayId: Utils.escapeHtml(Utils.extractDisplayId(obj.originalId || obj.id)),
                iconSafe: Utils.escapeHtml(icon || CONFIG.DEFAULTS?.INSPECTOR_ICON || '👤'),
                listLabel: Utils.escapeHtml(obj.list || 'Без списка'),
                addressLabel: Utils.escapeHtml(obj.address || '—'),
                anoSmgCodeLabel: Utils.escapeHtml(anoSmgCode),
                entryLabel: Utils.escapeHtml(Utils.formatDate(obj.entryTime)),
                exitLabel: Utils.escapeHtml(Utils.formatDate(obj.exitTime)),
                googleLink: Utils.sanitizeUrl(obj.googleLink || ''),
                labStudyLabel: Utils.escapeHtml(buildLabStudySummaryText_(obj)),
                labStudyTaskLabel: Utils.escapeHtml(String(obj.labStudyTask || '').trim()),
                labStudyParametersLabel: Utils.escapeHtml(buildLabStudyParametersText_(obj)),
                labStudyCommentLabel: Utils.escapeHtml(String(obj.laboratoryComment || '').trim()),
                labStudyRouteLink: Utils.sanitizeUrl(obj.labStudyRouteUrl || '')
            };
        }

        function renderObjectCardStatusBadge_(status) {
            if (status?.isDenied) {
                return '<span class="object-card__badge object-card__badge--denied">Отказано</span>';
            }
            if (status?.isActive) {
                return '<span class="object-card__badge object-card__badge--active">На объекте</span>';
            }
            if (status?.isCompleted) {
                return '<span class="object-card__badge object-card__badge--completed">Завершено</span>';
            }
            return '<span class="object-card__badge object-card__badge--new">Новая точка</span>';
        }

        function renderObjectCardHeaderHtml_(vm) {
            const eyebrowHtml = vm.sourceLabel
                ? `<div class="object-card__eyebrow">${vm.sourceLabel}</div>`
                : '';
            const headerCodeHtml = `<div class="object-card__meta object-card__meta--code">Код АНО СМГ: ${vm.anoSmgCodeLabel || '—'}</div>`;
            return `
                <div class="object-card__title">
                    <div class="object-card__title-copy">
                        ${eyebrowHtml}
                        <div class="object-card__name">Точка №${vm.displayId}</div>
                        ${headerCodeHtml}
                        <div class="object-card__meta">${vm.listLabel}</div>
                    </div>
                </div>
                ${renderObjectCardStatusBadge_(vm.status)}
            `;
        }

        function renderCoordinatesCopyActionHtml_(vm) {
            const coordinates = String(vm?.coordinates || '').trim();
            if (!coordinates) return '';
            return `
                <button class="object-card__inline-copy" type="button" data-action="copy-coordinates" data-coordinates="${Utils.escapeAttr(coordinates)}" title="Скопировать координаты" aria-label="Скопировать координаты">
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <rect x="9" y="9" width="10" height="10" rx="2"></rect>
                        <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            `;
        }

        function renderObjectFactsFormHtml_(obj, vm) {
            const facts = vm?.facts || getObjectFactsState_(obj);
            const objectIdAttr = Utils.escapeAttr(obj?.id);
            const readinessValueAttr = Utils.escapeAttr(facts.readinessValue || '');
            const peopleCountValueAttr = Utils.escapeAttr(facts.peopleCountValue || '');

            return `
                <div class="object-card__row object-card__row--facts">
                    <div class="object-card__row-head">
                        <span class="object-card__label">Фактические данные</span>
                    </div>
                    <div class="object-card__facts-grid">
                        <label class="object-card__fact-field">
                            <span class="object-card__fact-label">
                                <span>Строительная готовность</span>
                            </span>
                            <input
                                class="object-card__fact-input"
                                type="text"
                                inputmode="decimal"
                                autocomplete="off"
                                placeholder="Введите факт"
                                value="${readinessValueAttr}"
                                data-input-action="update-object-fact"
                                data-object-id="${objectIdAttr}"
                                data-fact-field="readiness"
                            >
                        </label>
                        <label class="object-card__fact-field">
                            <span class="object-card__fact-label">
                                <span>Кол-во людей</span>
                            </span>
                            <input
                                class="object-card__fact-input"
                                type="text"
                                inputmode="numeric"
                                autocomplete="off"
                                placeholder="Введите факт"
                                value="${peopleCountValueAttr}"
                                data-input-action="update-object-fact"
                                data-object-id="${objectIdAttr}"
                                data-fact-field="peopleCount"
                            >
                        </label>
                    </div>
                    <div class="object-card__facts-footer">
                        <button
                            class="object-card__fact-save"
                            type="button"
                            data-action="save-object-facts"
                            data-object-id="${objectIdAttr}"
                            ${facts.isDirty ? '' : 'disabled'}
                        >Сохранить</button>
                    </div>
                </div>
            `;
        }


        let labStudySchemeMap_ = null;
        let labStudySchemeLayer_ = null;
        let labStudySchemeCurrentObjectId_ = null;


        function syncLabStudySchemeLegend_(object) {
            const subtitle = UIState.getDomById('labStudySchemeSubtitle');
            const legend = UIState.getDomById('labStudySchemeLegend');
            if (!subtitle || !legend) return;

            const payload = getLabStudySchemePayload_(object);
            const displayId = Utils.extractDisplayId(object?.originalId || object?.id || '');
            const address = String(object?.address || '').trim();

            subtitle.textContent = displayId
                ? `Точка №${displayId}${address ? ` • ${address}` : ''}`
                : (address || 'Схема исследования');

            if (!payload) {
                legend.innerHTML = `
                    <div class="lab-study-scheme-modal__legend-item">
                        <span class="lab-study-scheme-pin lab-study-scheme-pin--study lab-study-scheme-pin--legend">
                            <span class="lab-study-scheme-pin__label">?</span>
                        </span>
                        <div class="lab-study-scheme-modal__legend-text">
                            <div class="lab-study-scheme-modal__legend-title">Схема пока недоступна</div>
                            <div class="lab-study-scheme-modal__legend-coords">Нужны координаты начала объекта, точки исследования и конца объекта.</div>
                        </div>
                    </div>
                `;
                return;
            }

            legend.innerHTML = payload.points.map((point) => `
                <div class="lab-study-scheme-modal__legend-item">
                    <span class="lab-study-scheme-pin lab-study-scheme-pin--${Utils.escapeAttr(point.key)} lab-study-scheme-pin--legend">
                        <span class="lab-study-scheme-pin__label">${Utils.escapeHtml(point.marker)}</span>
                    </span>
                    <div class="lab-study-scheme-modal__legend-text">
                        <div class="lab-study-scheme-modal__legend-title">${Utils.escapeHtml(point.title)}</div>
                        <div class="lab-study-scheme-modal__legend-coords">${Utils.escapeHtml(formatLabStudyCoordsText_(point.coords))}</div>
                    </div>
                </div>
            `).join('');
        }

        function ensureLabStudySchemeMap_() {
            if (labStudySchemeMap_) return labStudySchemeMap_;

            const root = UIState.getDomById('labStudySchemeMap');
            if (!root || typeof ymaps === 'undefined' || typeof ymaps.Map !== 'function') return null;

            labStudySchemeMap_ = new ymaps.Map(root, {
                center: CONFIG.MAP?.DEFAULT_CENTER || [55.7558, 37.6176],
                zoom: 12,
                controls: ['zoomControl']
            }, {
                suppressMapOpenBlock: true
            });

            labStudySchemeLayer_ = new ymaps.GeoObjectCollection();
            labStudySchemeMap_.geoObjects.add(labStudySchemeLayer_);
            return labStudySchemeMap_;
        }

        function getLabStudySchemePreset_(pointKey) {
            if (pointKey === 'study') return 'islands#greenIcon';
            if (pointKey === 'finish') return 'islands#redIcon';
            return 'islands#blueIcon';
        }

        function renderLabStudySchemeMap_(object) {
            const payload = getLabStudySchemePayload_(object);
            const map = ensureLabStudySchemeMap_();
            if (!payload || !map || !labStudySchemeLayer_) return;

            labStudySchemeLayer_.removeAll();

            payload.points.forEach((point) => {
                const placemark = new ymaps.Placemark(
                    [point.coords.lat, point.coords.lon],
                    {
                        iconContent: String(point.marker || ''),
                        balloonContentHeader: Utils.escapeHtml(point.title),
                        balloonContentBody: Utils.escapeHtml(formatLabStudyCoordsText_(point.coords)),
                        hintContent: Utils.escapeHtml(point.title)
                    },
                    {
                        preset: getLabStudySchemePreset_(point.key)
                    }
                );
                labStudySchemeLayer_.add(placemark);
            });

            const bounds = labStudySchemeLayer_.getBounds();
            if (bounds) {
                map.setBounds(bounds, {
                    checkZoomRange: true,
                    zoomMargin: [32, 32, 32, 32]
                });
            }
            map.container.fitToViewport();
        }

        function openLabStudySchemeModal_(objectId) {
            const object = DataState.findObjectById(objectId);
            if (!object) {
                showNotification('❌ Не удалось найти точку для схемы', 'error');
                return;
            }

            if (!canOpenLabStudyScheme_(object)) {
                showNotification('ℹ️ Схема пока не настроена для этой точки', 'info');
                return;
            }

            const overlay = UIState.getDomById('labStudySchemeOverlay');
            if (!overlay) return;

            closeObjectDetails();
            labStudySchemeCurrentObjectId_ = String(object.id || '');
            syncLabStudySchemeLegend_(object);
            overlay.classList.remove('hidden');
            document.body.classList.add('object-details-open');

            const ymapsReady = window.__M_PRO_YMAPS_READY__ && typeof window.__M_PRO_YMAPS_READY__.then === 'function'
                ? window.__M_PRO_YMAPS_READY__
                : Promise.resolve();

            ymapsReady
                .then(() => new Promise((resolve) => {
                    if (typeof ymaps === 'undefined' || typeof ymaps.ready !== 'function') {
                        resolve(false);
                        return;
                    }
                    ymaps.ready(() => resolve(true));
                }))
                .then((ready) => {
                    if (!ready) {
                        showNotification('❌ Карта схемы ещё не готова', 'error');
                        return;
                    }
                    const currentObject = DataState.findObjectById(labStudySchemeCurrentObjectId_);
                    if (!currentObject) return;
                    renderLabStudySchemeMap_(currentObject);
                })
                .catch((error) => {
                    console.error('Lab study scheme modal error:', error);
                    showNotification('❌ Не удалось открыть схему исследования', 'error');
                });
        }

        function closeLabStudySchemeModal_() {
            const overlay = UIState.getDomById('labStudySchemeOverlay');
            if (overlay) overlay.classList.add('hidden');
            labStudySchemeCurrentObjectId_ = null;
            document.body.classList.remove('object-details-open');
        }


        function renderLabStudySchemeActionHtml_(obj) {
            if (!canOpenLabStudyScheme_(obj)) return '';
            return `<button class="object-card__quick-link" type="button" data-action="open-lab-study-scheme" data-object-id="${Utils.escapeAttr(obj.id)}" title="Открыть схему исследования">${renderQuickLinkLabel_('scheme', 'Схема')}</button>`;
        }

        function renderObjectCardEmbeddedLinksHtml_(obj, vm) {
            const linksHtml = [
                vm.googleLink
                    ? `<a href="${Utils.escapeAttr(vm.googleLink)}" target="_blank" rel="noopener noreferrer" class="object-card__quick-link" title="Открыть чек-лист">${renderQuickLinkLabel_('checklist', 'Чек-лист')}</a>`
                    : '',
                renderLabStudySchemeActionHtml_(obj),
                renderYandexButton(obj, vm.status.isActive)
            ].filter(Boolean).join('');

            if (!linksHtml) return '';

            return `
                <div class="object-card__row object-card__row--materials">
                    <span class="object-card__label">Материалы</span>
                    <div class="object-card__quick-links">${linksHtml}</div>
                </div>
            `;
        }

        function renderObjectCardInfoHtml_(obj, vm) {
            const reassignSelectHtml = renderReassignSelect(obj);
            const coordinatesCopyHtml = renderCoordinatesCopyActionHtml_(vm);
            const embeddedLinksHtml = renderObjectCardEmbeddedLinksHtml_(obj, vm);
            const factsFormHtml = renderObjectFactsFormHtml_(obj, vm);
            return `
                <div class="object-card__row object-card__row--address">
                    <div class="object-card__row-head">
                        <span class="object-card__label">Адрес</span>
                        ${coordinatesCopyHtml}
                    </div>
                    <span class="object-card__value">${vm.addressLabel}</span>
                </div>
                ${embeddedLinksHtml}
                ${factsFormHtml}
                <div class="object-card__row object-card__row--inspector">
                    <span class="object-card__label">Инспектор</span>
                    ${reassignSelectHtml || `<span class="object-card__value">${vm.inspectorDisplay}</span>`}
                </div>
                ${obj.entryTime ? `
                <div class="object-card__row">
                    <span class="object-card__label">Вход</span>
                    <span class="object-card__value object-card__value--timestamp">${vm.entryLabel}</span>
                </div>
                ` : ''}
                ${obj.exitTime && obj.exitTime !== 'нет' ? `
                <div class="object-card__row">
                    <span class="object-card__label">Выход</span>
                    <span class="object-card__value object-card__value--timestamp">${vm.exitLabel}</span>
                </div>
                ` : ''}
                ${obj.exitTime === 'нет' ? `
                <div class="object-card__row">
                    <span class="object-card__label">Статус</span>
                    <span class="object-card__value" style="color: #e74c3c;">Отказано</span>
                </div>
                ` : ''}
                ${vm.labStudyLabel ? `
                <div class="object-card__row">
                    <span class="object-card__label">Исследование</span>
                    <span class="object-card__value">${vm.labStudyLabel}</span>
                </div>
                ` : ''}
                ${vm.labStudyTaskLabel ? `
                <div class="object-card__row">
                    <span class="object-card__label">Задание</span>
                    <span class="object-card__value">${vm.labStudyTaskLabel}</span>
                </div>
                ` : ''}
                ${vm.labStudyCommentLabel ? `
                <div class="object-card__row">
                    <span class="object-card__label">Комментарий</span>
                    <span class="object-card__value">${vm.labStudyCommentLabel}</span>
                </div>
                ` : ''}
            `;
        }

        function renderObjectCardActionsHtml_(obj, vm) {
            const workflow = buildWorkflowActionGroups_(obj, vm.status);
            const content = [
                workflow.primaryHtml,
                workflow.trailingHtml
            ].filter(Boolean).join('');

            if (!content) return '';

            return `
                <div class="object-card__section">
                    <div class="object-card__section-title">Действия</div>
                    <div class="object-card__actions">${content}</div>
                </div>
            `;
        }

        function buildWorkflowActionGroups_(obj, { isNew, isActive }) {
            const objectIdAttr = Utils.escapeAttr(obj.id);
            const primary = [];
            const trailing = [];
            const facts = getObjectFactsState_(obj);

            if (isNew) {
                primary.push(`<button class="object-card__button object-card__button--primary" data-action="mark-entry" data-object-id="${objectIdAttr}">${renderActionLabel_('entry', 'Вход', 'Начать посещение объекта')}</button>`);
            }

            if (isActive) {
                const allowCancelEntry = !isInspectorRole_();
                const exitMeta = facts.hasRequiredFields
                    ? 'Завершить посещение объекта'
                    : 'Заполните готовность и кол-во людей';
                primary.push(`<button class="object-card__button object-card__button--primary" data-action="mark-exit" data-object-id="${objectIdAttr}"${facts.hasRequiredFields ? '' : ' disabled'}>${renderActionLabel_('exit', 'Завершить', exitMeta)}</button>`);
                if (allowCancelEntry) {
                    trailing.push(`<button class="object-card__button object-card__button--warning" data-action="cancel-entry" data-object-id="${objectIdAttr}">${renderActionLabel_('undo', 'Отменить вход', 'Снять текущее посещение')}</button>`);
                }
                trailing.push(`<button class="object-card__button object-card__button--danger" data-action="mark-denied" data-object-id="${objectIdAttr}">${renderActionLabel_('denied', 'Отказано', 'Зафиксировать отказ в доступе')}</button>`);
            }

            return {
                primaryHtml: primary.join(''),
                trailingHtml: trailing.join('')
            };
        }

        function buildObjectCardSections_(obj, icon) {
            const vm = buildObjectCardViewModel_(obj, icon);
            return {
                objectIdRaw: vm.objectIdRaw,
                objectIdAttr: vm.objectIdAttr,
                headerHtml: renderObjectCardHeaderHtml_(vm),
                infoHtml: renderObjectCardInfoHtml_(obj, vm),
                actionsHtml: renderObjectCardActionsHtml_(obj, vm)
            };
        }

        function patchCardSectionHtml_(card, selector, nextHtml) {
            const target = card.querySelector(selector);
            if (!target) return false;
            const nextSig = getRenderSig_(nextHtml);
            if (target.dataset.renderSig === nextSig) return false;
            target.innerHTML = nextHtml;
            target.dataset.renderSig = nextSig;
            return true;
        }

        function patchOpenObjectDetailsContent_(obj) {
            const content = UIState.getDomById('objectDetailsContent');
            if (!content || !obj) return false;

            const card = content.querySelector('.object-card');
            if (!card) return false;
            if (String(card.dataset.objectId || '') !== String(obj.id || '')) return false;

            const sections = buildObjectCardSections_(obj, CONFIG.DEFAULTS?.INSPECTOR_ICON || '👤');

            patchCardSectionHtml_(card, '.js-object-card-header', sections.headerHtml);
            patchCardSectionHtml_(card, '.js-object-card-info', sections.infoHtml);
            patchCardSectionHtml_(card, '.js-object-card-actions', sections.actionsHtml);

            card.dataset.objectId = sections.objectIdRaw;
            return true;
        }

        function renderOpenObjectDetailsContent_(obj) {
            const content = UIState.getDomById('objectDetailsContent');
            if (!content || !obj) return;
            if (patchOpenObjectDetailsContent_(obj)) return;

            content.innerHTML = getBalloonContent(obj, CONFIG.DEFAULTS?.INSPECTOR_ICON || '👤');
        }
        
        /**
         * Сгенерировать HTML-контент для балуна объекта.
         * @param {Object} obj - Данные объекта
         * @param {string} icon - Иконка инспектора
         * @returns {string} HTML строка
         */
        function getBalloonContent(obj, icon) {
            const sections = buildObjectCardSections_(obj, icon);
            
            // Используем renderYandexButton для генерации кнопки Яндекс.Диска
            
            return `
                <div class="object-card" data-object-id="${sections.objectIdAttr}">
                    <div class="object-card__header js-object-card-header" data-render-sig="${getRenderSig_(sections.headerHtml)}">
                        ${sections.headerHtml}
                    </div>
                    
                    <div class="object-card__info js-object-card-info" data-render-sig="${getRenderSig_(sections.infoHtml)}">
                        ${sections.infoHtml}
                    </div>
                    
                    <div class="js-object-card-actions" data-render-sig="${getRenderSig_(sections.actionsHtml)}">${sections.actionsHtml}</div>
                    <div class="object-card__spacer"></div>
                </div>
            `;
        }
        
        // Примечание: используем Utils.formatDate() вместо formatDate_()
        
        // ============================================
        // ДЕЙСТВИЯ С ТОЧКАМИ
        // ============================================
        
        /**
         * Отметить вход на объект
         * @param {string|number} objectId - ID объекта
         */
        function markEntry(objectId) {
            if (!ensureCurrentUserCanInteractWithObjects_()) return;
            executeObjectAction_(objectId, 'entry', {});
        }
        
        
        /**
         * Отменить вход (очистить entryTime)
         * Показывает диалог подтверждения
         * @param {string|number} objectId - ID объекта
         */
        function cancelEntry(objectId) {
            if (!ensureCurrentUserCanInteractWithObjects_()) return;
            if (!confirm('Отменить вход? Точка вернётся в статус "Новая".')) return;
            executeObjectAction_(objectId, 'cancelEntry', {});
        }
        
        
        /**
         * Переназначить инспектора объекта
         * @param {string|number} objectId - ID объекта
         * @param {string} newInspector - Имя нового инспектора
         */
        function reassignInspector(objectId, newInspector) {
            const normalizedInspector = String(newInspector || '').trim();
            const object = DataState.findObjectById(objectId);
            if (object && normalizeInspectorName_(object.inspector) === normalizeInspectorName_(normalizedInspector)) return;
            executeObjectAction_(objectId, 'reassign', { newInspector: normalizedInspector });
        }

        function markExit(objectId) {
            if (!ensureCurrentUserCanInteractWithObjects_()) return;
            const factsPayload = buildObjectFactsPayload_(objectId);
            if (!factsPayload.hasRequiredFields) {
                showNotification('Заполните строительную готовность и кол-во людей', 'warning');
                syncObjectFactsDraftUi_(objectId);
                return;
            }
            if (!confirm('Завершить посещение объекта? Точка перейдёт в выполненные.')) return;
            executeObjectAction_(objectId, 'exit', {
                readinessValue: factsPayload.readinessValue,
                peopleCountValue: factsPayload.peopleCountValue
            });
        }

        function markDenied(objectId) {
            if (!ensureCurrentUserCanInteractWithObjects_()) return;
            if (!confirm('Отметить точку как "Отказано"?')) return;
            const factsPayload = buildObjectFactsPayload_(objectId);
            executeObjectAction_(objectId, 'denyAccess', {
                readinessValue: factsPayload.readinessValue,
                peopleCountValue: factsPayload.peopleCountValue
            });
        }
        
        /**
         * Скопировать координаты в буфер обмена
         * @param {string} coordinates - Координаты "lat, lon"
         */
        async function copyCoordinates(coordinates) {
            const success = await Utils.copyToClipboard(coordinates);
            showNotification(success ? '🧭 Координаты скопированы' : 'Не удалось скопировать координаты', success ? 'success' : 'error');
        }

        async function archiveCompletedObjects() {
            const confirmed = confirm('Очистить карту от выполненных объектов? Они исчезнут с карты, а история мониторинга сохранится в архиве.');
            if (!confirmed) return;

            showNotification('⏳ Очищаю карту от выполненных объектов...', 'info');

            try {
                const response = await MproApi.archiveCompleted(60000);
                if (!response?.success) {
                    showNotification('❌ ' + (response?.message || response?.error || 'Ошибка очистки карты'), 'error');
                    return;
                }

                const count = Number(response?.count || 0);
                if (count <= 0) {
                    showNotification('ℹ️ На карте нет выполненных объектов для очистки', 'info');
                    return;
                }

                const historyCount = Number(response?.archivedToHistoryCount || 0);
                const details = response?.bySource && typeof response.bySource === 'object'
                    ? Object.entries(response.bySource)
                        .map(([name, value]) => `${name}: ${Number(value || 0)}`)
                        .join(', ')
                    : '';

                showNotification(
                    `✅ Карта очищена. Убрано точек: ${count}${historyCount ? `. В архиве сохранено: ${historyCount}` : ''}${details ? ` (${details})` : ''}`,
                    'success'
                );

                await loadDataWithRetry_({ attempts: 2, retryDelayMs: 600, reason: 'archive-completed' });
            } catch (error) {
                showNotification('❌ ' + (error?.message || 'Ошибка очистки карты'), 'error');
            }
        }

        // Yandex Disk integration extracted to mpro/modules/yandex-integration.js.

        function legacyExecuteObjectAction_(objectId, action, params) {
            // Проверить входные параметры
            if (!objectId) {
                showNotification('❌ Ошибка: не указан ID объекта', 'error');
                return;
            }
            
            if (!action || typeof action !== 'string') {
                showNotification('❌ Ошибка: не указано действие', 'error');
                return;
            }
            
            // Оптимистичное обновление интерфейса
            const object = DataState.findObjectById(objectId);
            if (object) {
                optimisticallyUpdateObject_(objectId, action, params);
            }
            
            // Закрыть модальное окно деталей
            closeObjectDetails();
            
            // Сформировать параметры запроса
            const requestParams = {
                action: action,
                objectId: String(objectId),
                dbObjectId: String(object?.dbObjectId || ''),
                dbVisitId: String(object?.dbVisitId || ''),
                source: object?.source || 'Map',
                rowIndex: String(object?.rowIndex || ''),
                list: String(object?.list || ''),
                ...params
            };

            const requestPayloadPromise = action === 'entry'
                ? getCurrentGeoCoordsForWorkDay_()
                    .then((coords) => {
                        const coordsValue = String(coords || '').trim();
                        if (coordsValue) {
                            const parts = coordsValue.split(',');
                            const lat = String(parts[0] || '').trim();
                            const lon = String(parts[1] || '').trim();
                            requestParams.coords = coordsValue;
                            requestParams.entry = coordsValue;
                            if (lat) requestParams.lat = lat;
                            if (lon) requestParams.lon = lon;
                        }
                        return requestParams;
                    })
                    .catch(() => requestParams)
                : Promise.resolve(requestParams);
            
            // Отправляем запрос
            requestPayloadPromise
                .then((payload) => MproApi.executeObjectAction(payload, 15000))
                .then(response => {
                    if (response.success) {
                        showNotification('✅ ' + (response.message || 'Действие выполнено'), 'success');
                        // Для большинства действий держим UI быстрым за счет оптимистичного обновления.
                        // Тяжелую синхронизацию всей модели делаем для критичных переходов статуса.
                        if (action === 'entry' || action === 'exit' || action === 'cancelEntry' || action === 'denyAccess') {
                            if (isInspectorRole_()) {
                                syncWorkDayStateFromServer_({ force: true, silent: true }).catch(() => null);
                            }
                            scheduleBackgroundReloadAfterObjectAction_();
                        }
                        return;
                    } else {
                        showNotification('❌ ' + (response.error || 'Ошибка'), 'error');
                        // Откат при ошибке
                        rollbackObjectUpdate_(objectId);
                    }
                })
                .catch(error => {
                    showNotification('❌ Ошибка соединения', 'error');
                    console.error('Action error:', error);
                    // Откат при ошибке
                    rollbackObjectUpdate_(objectId);
                });
        }
        
        /**
         * Оптимистично обновить объект в локальных данных
         * @private
         * @param {string|number} objectId - ID объекта
         * @param {string} action - Тип действия
         * @param {Object} params - Параметры
         */
        function optimisticallyUpdateObject_(objectId, action, params) {
            const object = DataState.findObjectById(objectId);
            if (!object) return;
            
            // Сохраняем оригинал для отката
            object._original = { ...object };
            
            const now = new Date().toISOString();
            let forceMapRerender = false;
            
            switch (action) {
                case 'entry':
                    object.entryTime = now;
                    break;
                case 'exit':
                    object.exitTime = now;
                    markCompletedTemporarilyVisible_(objectId);
                    break;
                case 'cancelEntry':
                    object.entryTime = null;
                    object.exitTime = null;
                    object.timeSpent = '';
                    break;
                case 'denyAccess':
                    object.exitTime = 'нет';
                    markCompletedTemporarilyVisible_(objectId);
                    break;
                case 'reassign':
                    object.inspector = params.newInspector;
                    const reassignedStyle = getInspectorStyle(object.inspector);
                    applyLiveInspectorColorToMap_(object.inspector, reassignedStyle.color);
                    forceMapRerender = true;
                    break;
            }
            
            if (forceMapRerender) {
                MapState.setLastRenderSignature('');
            }
            // Обновляем карту
            scheduleMapUpdate_();
            
            // Если балун открыт - обновляем его содержимое
            if (UIState.getCurrentOpenObjectId() == objectId) {
                renderOpenObjectDetailsContent_(object);
            }
        }
        
        /**
         * Откатить изменения объекта при ошибке
         * @private
         * @param {string|number} objectId - ID объекта
         */
        function rollbackObjectUpdate_(objectId) {
            const object = DataState.findObjectById(objectId);
            if (object && object._original) {
                // Восстанавливаем оригинальные значения
                Object.assign(object, object._original);
                delete object._original;

                // Если оптимистичное завершение откатилось — убираем временную видимость
                if (!object.exitTime) {
                    FiltersState.clearRecentlyCompleted(objectId);
                }
                
                // Обновляем карту
                scheduleMapUpdate_();
                
                // Если балун открыт - обновляем содержимое
                if (UIState.getCurrentOpenObjectId() == objectId) {
                    renderOpenObjectDetailsContent_(object);
                }
            }
        }
        
        /**
         * Перезагрузить данные с сервера
         * @private
         */
        function reloadData_() {
            RuntimeState.clearDataLoadPromise();
            loadData().catch(err => console.error('Reload error:', err));
        }

        const OBJECT_ACTION_BACKGROUND_RELOAD_DELAY_MS = Number(CONFIG.REFRESH?.mutationReloadDelayMs) || 1200;
        let objectActionBackgroundReloadTimer_ = null;

        function scheduleBackgroundReloadAfterObjectAction_(delayMs = OBJECT_ACTION_BACKGROUND_RELOAD_DELAY_MS) {
            const timeoutMs = Math.max(300, Number(delayMs) || OBJECT_ACTION_BACKGROUND_RELOAD_DELAY_MS);
            if (objectActionBackgroundReloadTimer_) {
                clearTimeout(objectActionBackgroundReloadTimer_);
            }
            objectActionBackgroundReloadTimer_ = setTimeout(() => {
                objectActionBackgroundReloadTimer_ = null;
                reloadData_();
            }, timeoutMs);
        }
        
        // ============================================
        // Публичный API модулей
        // ============================================

        

// Inspector management module extracted from the legacy monolith.
// Owns inspector customization UI, workday badges, and save flows.

        async function showInspectorManagement() {
            if (isInspectorRole_()) return;
            const panel = document.getElementById('inspectorManagementPanel');
            const body = document.getElementById('inspectorManagementBody');
            
            panel.classList.remove('hidden');
            
            // Если данных нет — показать загрузку и дождаться
            if (Object.keys(DataState.getInspectorsConfig()).length === 0) {
                body.innerHTML = '<div class="loading">Загрузка данных...</div>';
                
                try {
                    await loadData();
                    // Рендер произойдёт автоматически через autoRenderOpenPanels
                    // Но на всякий случай вызовем ещё раз
                    renderInspectorManagement();
                } catch (error) {
                    body.innerHTML = `
                        <div class="empty">
                            <div>Ошибка загрузки</div>
                            <div style="font-size: 12px; color: #8e8e93; margin-top: 8px;">${error.message}</div>
                            <button class="apply-btn" data-action="show-inspector-management" style="margin-top: 16px;">
                                Повторить
                            </button>
                        </div>
                    `;
                }
            } else {
                renderInspectorManagement();
            }
        }
        
        /**
         * Скрыть боковую панель управления инспекторами
         * Очищает все ожидающие изменения
         */
        function closeInspectorManagement() {
            const panel = document.getElementById('inspectorManagementPanel');
            panel.classList.add('hidden');
            
            // Очистить все ожидающие изменения
            panel.querySelectorAll('.inspector-card').forEach(card => {
                delete card.dataset.changes;
            });
        }
        
        /**
         * Переключить развёрнутость карточки инспектора
         * @param {HTMLElement} card - Элемент карточки инспектора
         */
        function toggleInspectorCard(card) {
            const willOpen = !card.classList.contains('open');
            card.classList.toggle('open');
            if (willOpen) {
                warmupInspectorCardPickers_(card);
            }
        }
        
        /**
         * Фильтровать инспекторов в панели управления по тексту поиска
         * Использует значение из поля #searchManagement
         */
        function filterManagementInspectors() {
            const input = document.getElementById('searchManagement');
            const filter = String(input?.value || '').toUpperCase();
            const selectedSet = getSelectedInspectorFilterSetForManagement_();
            const cards = document.querySelectorAll('#inspectorManagementBody .inspector-card');
            let visibleCount = 0;

            cards.forEach(card => {
                const name = String(card.querySelector('.inspector-name')?.textContent || '').toUpperCase();
                const inspectorRaw = String(card.dataset.inspector || '');
                const bySearch = !filter || name.includes(filter);
                const byInspectorFilter = isInspectorAllowedInManagementByFilters_(inspectorRaw, selectedSet);
                const isVisible = bySearch && byInspectorFilter;
                card.style.display = isVisible ? '' : 'none';
                if (isVisible) visibleCount += 1;
            });

            const emptyHint = document.getElementById('managementFilterEmpty');
            if (emptyHint) {
                emptyHint.style.display = visibleCount > 0 ? 'none' : '';
            }
        }
        
        /**
         * Отрендерить содержимое панели управления инспекторами
         * Создаёт карточки для всех инспекторов с пикерами цвета/иконки/статуса
         */
        function createInspectorManagementListRoot_(body) {
            let root = body.querySelector('.inspector-list[data-management-root="true"]');
            if (!root) {
                root = document.createElement('div');
                root.className = 'inspector-list';
                root.dataset.managementRoot = 'true';
            }

            let emptyHint = root.querySelector('#managementFilterEmpty');
            if (!emptyHint) {
                emptyHint = document.createElement('div');
                emptyHint.className = 'empty';
                emptyHint.id = 'managementFilterEmpty';
                emptyHint.style.display = 'none';
                emptyHint.textContent = 'Нет инспекторов по текущему фильтру';
                root.appendChild(emptyHint);
            }

            if (body.firstElementChild !== root || body.childElementCount !== 1) {
                body.replaceChildren(root);
            }
            if (emptyHint.parentElement !== root) {
                root.appendChild(emptyHint);
            }
            return root;
        }

        function createInspectorCardNode_(insp, cfg) {
            const template = document.createElement('template');
            template.innerHTML = renderInspectorCard(insp, cfg, 'management').trim();
            return template.content.firstElementChild;
        }

        function syncInspectorCardNode_(card, insp, cfg) {
            if (!(card instanceof HTMLElement)) return card;
            const cardId = buildInspectorCardId_(insp, 'management');
            const workDayBadge = getInspectorWorkDayBadge_(insp);
            const pendingChanges = CardChanges.get(cardId);
            const resolvedColor = String(
                pendingChanges.color ||
                cfg?.color ||
                CONFIG.DEFAULTS?.INSPECTOR_COLOR ||
                '#1f6fb2'
            );

            card.id = 'card_' + cardId;
            card.dataset.inspector = String(insp || '');
            card.dataset.inspectorNorm = normalizeInspectorName_(insp);

            const emoji = card.querySelector('.inspector-emoji');
            if (emoji) emoji.textContent = CONFIG.DEFAULTS?.INSPECTOR_ICON || '👤';

            const name = card.querySelector('.inspector-name');
            if (name) name.textContent = String(insp || '');

            const workday = card.querySelector('.inspector-workday-dot');
            if (workday) {
                workday.id = 'workday_' + cardId;
                workday.className = `inspector-workday-dot ${workDayBadge.cssClass}`;
                workday.setAttribute('title', workDayBadge.title);
                workday.setAttribute('aria-label', workDayBadge.title);
            }

            const toggle = card.querySelector('.picker-toggle');
            if (toggle) {
                toggle.id = 'color_toggle_' + cardId;
                toggle.dataset.action = 'toggle-picker';
                toggle.dataset.pickerType = 'color';
                toggle.dataset.cardId = cardId;
            }

            const preview = card.querySelector('.picker-preview-color');
            if (preview) {
                preview.id = 'color_preview_' + cardId;
                preview.style.background = resolvedColor;
            }

            const dropdown = card.querySelector('.picker-dropdown');
            if (dropdown) {
                dropdown.id = 'color_dropdown_' + cardId;
            }

            const picker = card.querySelector('.color-picker');
            if (picker) {
                picker.id = 'colors_' + cardId;
            }

            const colorInput = card.querySelector('.color-custom-input');
            if (colorInput) {
                colorInput.dataset.changeAction = 'custom-inspector-color';
                colorInput.dataset.cardId = cardId;
                if (/^#[0-9a-f]{6}$/i.test(resolvedColor)) {
                    colorInput.value = resolvedColor.toLowerCase();
                }
            }

            const button = card.querySelector('.apply-btn');
            if (button) {
                button.id = 'apply_btn_' + cardId;
                button.dataset.action = 'apply-inspector-changes';
                button.dataset.inspector = String(insp || '');
                button.dataset.cardId = cardId;
                if (!button.classList.contains('saving')) {
                    button.className = 'apply-btn';
                    button.textContent = 'Сохранить';
                }
            }

            if ((dropdown && dropdown.classList.contains('open')) || picker?.dataset.mode === 'dynamic') {
                renderLazyPickerOptions_('color', cardId);
            }
            return card;
        }

        function syncInspectorManagementCards_(root, inspectors, config) {
            const emptyHint = root.querySelector('#managementFilterEmpty');
            const existingCards = new Map();
            root.querySelectorAll('.inspector-card').forEach((card) => {
                existingCards.set(String(card.dataset.inspectorNorm || ''), card);
            });

            let previousCard = null;
            const seenNorms = new Set();

            inspectors.forEach((insp) => {
                const norm = normalizeInspectorName_(insp);
                if (!norm) return;
                seenNorms.add(norm);

                let card = existingCards.get(norm);
                if (!card) {
                    card = createInspectorCardNode_(insp, config[insp]);
                }
                syncInspectorCardNode_(card, insp, config[insp]);

                const anchor = previousCard ? previousCard.nextSibling : emptyHint;
                if (anchor !== card) {
                    root.insertBefore(card, anchor);
                }
                previousCard = card;
            });

            existingCards.forEach((card, norm) => {
                if (!seenNorms.has(norm)) {
                    card.remove();
                }
            });

            if (emptyHint && emptyHint.parentElement !== root) {
                root.appendChild(emptyHint);
            }
        }

        function renderInspectorManagement() {
            const body = document.getElementById('inspectorManagementBody');
            const config = DataState.getInspectorsConfig() || {};
            const selectedSet = getSelectedInspectorFilterSetForManagement_();

            if (selectedSet.size === 0) {
                body.innerHTML = '<div class="empty">Выберите инспекторов в блоке «Списки инспекторов»</div>';
                return;
            }

            const inspectors = Object.keys(config)
                .filter(name => isInspectorAllowedInManagementByFilters_(name, selectedSet))
                .sort((a, b) => a.localeCompare(b, 'ru'));

            if (inspectors.length === 0) {
                body.innerHTML = '<div class="empty">Нет данных об инспекторах</div>';
                return;
            }

            const root = createInspectorManagementListRoot_(body);
            syncInspectorManagementCards_(root, inspectors, config);
            filterManagementInspectors();
            refreshInspectorManagementWorkDayIndicators_();
        }

        function getSelectedInspectorFilterSetForManagement_() {
            const selected = FiltersState.getCurrent()?.inspectors;
            if (!Array.isArray(selected) || selected.length === 0) return new Set();
            const set = new Set();
            selected.forEach(name => {
                const norm = normalizeInspectorName_(name);
                if (norm) set.add(norm);
            });
            return set;
        }

        function isInspectorAllowedInManagementByFilters_(inspectorName, selectedSet) {
            if (!(selectedSet instanceof Set)) return false;
            if (selectedSet.size === 0) return false;
            const inspectorNorm = normalizeInspectorName_(inspectorName);
            return !!inspectorNorm && selectedSet.has(inspectorNorm);
        }

        function findInspectorWorkDayPayloadByName_(map, inspectorName) {
            if (!map || typeof map !== 'object') return null;
            const key = normalizeInspectorName_(inspectorName);
            if (!key) return null;
            if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];

            const keyTokens = key.split(' ').filter(Boolean);
            let bestMatchKey = '';
            let bestScore = -1;

            Object.keys(map).forEach(candidateRaw => {
                const candidate = normalizeInspectorName_(candidateRaw);
                if (!candidate) return;

                let score = -1;
                if (candidate === key) {
                    score = 1000;
                } else if (candidate.startsWith(key) || key.startsWith(candidate)) {
                    score = 500 + Math.min(candidate.length, key.length);
                } else if (keyTokens.length >= 2) {
                    const candidateTokens = candidate.split(' ').filter(Boolean);
                    if (candidateTokens.length >= 2 &&
                        candidateTokens[0] === keyTokens[0] &&
                        candidateTokens[1] === keyTokens[1]) {
                        score = 300 + Math.min(candidateTokens.length, keyTokens.length);
                    }
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatchKey = candidateRaw;
                }
            });

            return bestMatchKey ? map[bestMatchKey] : null;
        }

        function getInspectorWorkDayStateForManagement_(inspectorName) {
            const map = DataState.getInspectorsWorkDay();
            const payload = findInspectorWorkDayPayloadByName_(map, inspectorName);
            const isOpen = !!payload?.open;
            const openTime = String(payload?.openTime || '').trim();
            return {
                open: isOpen,
                openTime: openTime
            };
        }

        function getInspectorWorkDayBadge_(inspectorName) {
            const state = getInspectorWorkDayStateForManagement_(inspectorName);
            if (state.open) {
                const suffix = state.openTime ? ` (с ${state.openTime})` : '';
                return {
                    cssClass: 'open',
                    title: `Рабочий день открыт${suffix}`
                };
            }
            return {
                cssClass: 'closed',
                title: 'Рабочий день не открыт'
            };
        }

        function refreshInspectorManagementWorkDayIndicators_() {
            const panel = UIState.getDomById('inspectorManagementPanel');
            if (!panel || panel.classList.contains('hidden')) return;

            const cards = panel.querySelectorAll('.inspector-card');
            cards.forEach(card => {
                if (!(card instanceof HTMLElement)) return;
                const inspectorName = String(card.dataset.inspector || '');
                const badge = getInspectorWorkDayBadge_(inspectorName);
                const dot = card.querySelector('.inspector-workday-dot');
                if (!dot) return;
                dot.className = `inspector-workday-dot ${badge.cssClass}`;
                dot.setAttribute('title', badge.title);
                dot.setAttribute('aria-label', badge.title);
            });
        }
        
        function renderLazyPickerOptions_(type, cardId) {
            const isColor = type === 'color';
            if (!isColor) return;

            const card = document.getElementById('card_' + cardId);
            if (!card) return;
            const inspector = card.dataset.inspector || '';
            const cfg = DataState.ensureInspectorConfig(inspector);
            const pendingChanges = CardChanges.get(cardId);
            const selectedValue = String(
                pendingChanges.color ||
                cfg.color ||
                CONFIG.DEFAULTS?.INSPECTOR_COLOR ||
                ''
            );

            const pickerId = 'colors_' + cardId;
            const picker = document.getElementById(pickerId);
            if (!picker) return;

            if (picker.dataset.mode === 'dynamic' && picker.dataset.selected === selectedValue) {
                return;
            }

            picker.innerHTML = '';
            picker.dataset.mode = 'dynamic';
            picker.dataset.selected = selectedValue;

            const colorInput = document.querySelector(`.color-custom-input[data-card-id="${cardId}"]`);
            if (colorInput instanceof HTMLInputElement && /^#[0-9a-f]{6}$/i.test(selectedValue)) {
                colorInput.value = selectedValue.toLowerCase();
            }
        }

        function warmupInspectorCardPickers_(card) {
            if (!(card instanceof HTMLElement)) return;
            const cardId = String(card.id || '').replace(/^card_/, '');
            if (!cardId) return;
            renderLazyPickerOptions_('color', cardId);
        }

        function buildInspectorCardId_(inspectorName, seed = '') {
            const base = String(inspectorName || '').trim();
            const raw = `${base}|${seed}`;
            let hash = 2166136261;
            for (let i = 0; i < raw.length; i += 1) {
                hash ^= raw.charCodeAt(i);
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                hash >>>= 0;
            }
            return `insp_${hash.toString(16)}`;
        }
        
        /**
         * Сгенерировать HTML для карточки инспектора
         * @param {string} insp - Имя инспектора
         * @param {Object} cfg - Конфигурация инспектора {color, icon, status}
         * @returns {string} HTML-строка
         */
        function renderInspectorCard(insp, cfg, cardIdSeed = '') {
            const cardId = buildInspectorCardId_(insp, cardIdSeed);
            const workDayBadge = getInspectorWorkDayBadge_(insp);
            const safeInspectorText = Utils.escapeHtml(String(insp || ''));
            const safeInspectorAttr = Utils.escapeAttr(String(insp || ''));
            const safeInspectorNormAttr = Utils.escapeAttr(normalizeInspectorName_(insp));
            const safeWorkDayTitle = Utils.escapeAttr(workDayBadge.title);
            const color = String(cfg?.color || CONFIG.DEFAULTS?.INSPECTOR_COLOR || '#1f6fb2');
            
            return `
                <div class="inspector-card" data-inspector="${safeInspectorAttr}" data-inspector-norm="${safeInspectorNormAttr}" id="card_${cardId}">
                    <div class="inspector-card-header" data-action="toggle-inspector-card">
                        <span class="inspector-emoji">${Utils.escapeHtml(CONFIG.DEFAULTS?.INSPECTOR_ICON || '👤')}</span>
                        <span class="inspector-name">${safeInspectorText}</span>
                        <span class="inspector-badges">
                            <span
                                class="inspector-workday-dot ${workDayBadge.cssClass}"
                                id="workday_${cardId}"
                                title="${safeWorkDayTitle}"
                                aria-label="${safeWorkDayTitle}"
                            ></span>
                        </span>
                    </div>
                    <div class="inspector-card-content">
                        <div class="control-group">
                            <label>Цвет маркера</label>
                            <div class="picker-toggle" id="color_toggle_${cardId}" data-action="toggle-picker" data-picker-type="color" data-card-id="${cardId}">
                                <div class="picker-toggle-content">
                                    <div class="picker-preview-color" id="color_preview_${cardId}" style="background:${Utils.escapeAttr(color)}"></div>
                                    <span>Выбрать цвет</span>
                                </div>
                                <span class="picker-toggle-arrow">&#9662;</span>
                            </div>
                            <div class="picker-dropdown" id="color_dropdown_${cardId}">
                                <div class="color-custom-row">
                                    <span class="color-custom-label">Свободный цвет</span>
                                    <input
                                        type="color"
                                        class="color-custom-input"
                                        value="${Utils.escapeAttr(color)}"
                                        data-change-action="custom-inspector-color"
                                        data-card-id="${cardId}"
                                    >
                                </div>
                                <div class="color-picker" id="colors_${cardId}" data-mode="none" data-selected=""></div>
                            </div>
                        </div>
                        <button class="apply-btn" id="apply_btn_${cardId}" data-action="apply-inspector-changes" data-inspector="${safeInspectorAttr}" data-card-id="${cardId}">Сохранить</button>
                    </div>
                </div>
            `;
        }
        
        /**
         * Переключить видимость выпадающего списка
         * @param {string} type - Тип пикера ('color' | 'icon' | 'status')
         * @param {string} cardId - Идентификатор карточки
         */
        function togglePicker(type, cardId) {
            if (type !== 'color') return;
            const toggle = document.getElementById(type + '_toggle_' + cardId);
            const dropdown = document.getElementById(type + '_dropdown_' + cardId);
            if (!toggle || !dropdown) return;
            
            // Закрыть остальные пикеры
            ['color'].forEach(t => {
                if (t !== type) {
                    const otherDropdown = document.getElementById(t + '_dropdown_' + cardId);
                    const otherToggle = document.getElementById(t + '_toggle_' + cardId);
                    if (otherDropdown?.classList.contains('open')) {
                        otherDropdown.classList.remove('open');
                        otherToggle?.classList.remove('open');
                    }
                }
            });

            if (!dropdown.classList.contains('open') && type === 'color') {
                renderLazyPickerOptions_(type, cardId);
            }
            
            // Переключить текущий пикер
            dropdown.classList.toggle('open');
            toggle.classList.toggle('open');
        }
        
        // ============================================
        // УПРАВЛЕНИЕ ИЗМЕНЕНИЯМИ КАРТОЧЕК
        // ============================================
        
        const CardChanges = {
            /**
             * Получить элемент карточки
             * @private
             * @param {string} cardId - ID карточки
             * @returns {HTMLElement|null}
             */
            _getCard(cardId) {
                return document.getElementById('card_' + cardId);
            },
            
            /**
             * Получить изменения карточки
             * @param {string} cardId - ID карточки
             * @returns {Object} Объект изменений или пустой объект
             */
            get(cardId) {
                const card = this._getCard(cardId);
                if (!card) return {};
                try {
                    return JSON.parse(card.dataset.changes || '{}');
                } catch (e) {
                    return {};
                }
            },
            
            /**
             * Сохранить изменения карточки
             * @param {string} cardId - ID карточки
             * @param {Object} changes - Объект изменений
             */
            set(cardId, changes) {
                const card = this._getCard(cardId);
                if (card) {
                    card.dataset.changes = JSON.stringify(changes);
                }
            },
            
            /**
             * Очистить изменения карточки
             * @param {string} cardId - ID карточки
             */
            clear(cardId) {
                const card = this._getCard(cardId);
                if (card) {
                    delete card.dataset.changes;
                }
            }
        };
        
        // ============================================
        // УНИФИЦИРОВАННЫЙ ПИКЕР
        // ============================================
        
        const PICKER_TYPE_COLOR = 'color';
        
        const Picker = {
            config: {
                [PICKER_TYPE_COLOR]: {
                    containerSuffix: 'colors_',
                    itemClass: 'color-dot',
                    dataAttr: 'data-color',
                    previewType: 'style',
                    previewProp: 'background',
                    extraUpdate: (cardId, value) => {
                        const colorInput = document.querySelector(`.color-custom-input[data-card-id="${cardId}"]`);
                        if (colorInput instanceof HTMLInputElement && /^#[0-9a-f]{6}$/i.test(value)) {
                            colorInput.value = String(value).toLowerCase();
                        }
                        renderLazyPickerOptions_(PICKER_TYPE_COLOR, cardId);
                    },
                    useEventTarget: false
                }
            },
            
            /**
             * Обработать выбор значения в пикере
             * @param {string} cardId - ID карточки инспектора
             * @param {string} type - Тип пикера
             * @param {string} value - Выбранное значение
             */
            select(cardId, type, value) {
                const cfg = this.config[type];
                if (!cfg) {
                    console.error('Unknown picker type:', type);
                    return;
                }
                
                // 1. Сохранить изменения
                const changes = CardChanges.get(cardId);
                changes[type] = value;
                CardChanges.set(cardId, changes);
                
                // 2. Обновить активный элемент в списке
                const container = document.getElementById(cfg.containerSuffix + cardId);
                if (container) {
                    const items = container.querySelectorAll('.' + cfg.itemClass);
                    items.forEach(el => {
                        const itemValue = el.getAttribute(cfg.dataAttr);
                        el.classList.toggle('active', itemValue === value);
                    });
                }
                
                // 3. Обновить превью
                const preview = document.getElementById(type + '_preview_' + cardId);
                if (preview) {
                    preview.style[cfg.previewProp] = value;
                }
                
                // 4. Дополнительные обновления (специфичные для типа)
                if (cfg.extraUpdate) {
                    cfg.extraUpdate(cardId, value);
                }
                
                // 5. Закрыть выпадающий список
                document.getElementById(type + '_dropdown_' + cardId)?.classList.remove('open');
                document.getElementById(type + '_toggle_' + cardId)?.classList.remove('open');
            }
        };
        
        // Обертки для обратной совместимости с inline-обработчиками
        /**
         * Обертка для выбора цвета (обратная совместимость с inline-обработчиками)
         * @param {string} cardId - ID карточки инспектора
         * @param {string} color - Выбранный цвет (hex)
         */
        function selectColor(cardId, color) {
            Picker.select(cardId, PICKER_TYPE_COLOR, color);
        }
        
        // ============================================
        // СОХРАНЕНИЕ НАСТРОЕК ИНСПЕКТОРА
        // ============================================
        
        /**
         * Применить и сохранить изменения инспектора в Google Apps Script.
         * @param {string} inspector - Имя инспектора
         * @param {string} cardId - Идентификатор карточки
         */
        function applyInspectorChanges(inspector, cardId) {
            const changes = CardChanges.get(cardId);
            
            if (!changes.color) {
                showNotification('Нет изменений для сохранения', 'info');
                return;
            }
            
            // Обновить локальную конфигурацию (с учетом возможных вариантов написания имени)
            const matchedKeys = getInspectorConfigKeysByName_(inspector);
            if (matchedKeys.length === 0) {
                Object.assign(DataState.ensureInspectorConfig(inspector), changes);
            } else {
                matchedKeys.forEach(key => {
                    Object.assign(DataState.ensureInspectorConfig(key), changes);
                });
            }
            
            // Мгновенное локальное обновление интерфейса: меняем цвет уже видимых точек инспектора
            // (без ожидания ответа сервера и без F5).
            const localStyle = getInspectorStyle(inspector);
            applyLiveInspectorColorToMap_(inspector, localStyle.color);
            refreshOpenObjectDetailsForInspector_(inspector);
            updateUserCard();
            if (UIState.isInspectorsHomesVisible()) {
                updateInspectorsHomesLayer();
            }
            
            // Состояние сохранения в интерфейсе
            const btn = document.getElementById('apply_btn_' + cardId);
            const originalText = btn.textContent;
            setButtonState(btn, 'saving');
            
            // Отправить запрос
            const request = MproApi.saveInspectorConfig({
                inspector,
                color: changes.color
            });
            
            // Обработать ответ
            request
                .then(data => {
                    if (data?.success) {
                        CardChanges.clear(cardId);
                        setButtonState(btn, 'saved', originalText);
                        showNotification('Настройки сохранены', 'success');
                    } else {
                        throw new Error(data?.error || 'Ошибка сохранения');
                    }
                })
                .catch(error => {
                    setButtonState(btn, 'error', originalText);
                    showNotification(error.message, 'error');
                });
        }
        
        /**
         * Найти все ключи конфигурации инспекторов, соответствующие отображаемому имени.
         * @private
         * @param {string} inspectorName
         * @returns {string[]}
         */
        function getInspectorConfigKeysByName_(inspectorName) {
            const inspectorsConfig = DataState.getInspectorsConfig();
            if (!inspectorsConfig || !inspectorName) return [];
            if (Object.prototype.hasOwnProperty.call(inspectorsConfig, inspectorName)) {
                return [inspectorName];
            }
            const target = normalizeInspectorName_(inspectorName);
            return Object.keys(inspectorsConfig).filter(key => normalizeInspectorName_(key) === target);
        }
        
        /**
         * Мгновенно обновить цвет у видимых на карте точек выбранного инспектора.
         * @private
         * @param {string} inspectorName
         * @param {string} color
         */
        function applyLiveInspectorColorToMap_(inspectorName, color) {
            const objectManager = MapState.getObjectManager();
            const activeLayer = MapState.getActiveObjectsLayer();
            if (!inspectorName || !color || !objectManager || !activeLayer || !Array.isArray(DataState.getObjectsData())) return;
            const target = normalizeInspectorName_(inspectorName);
            if (!target) return;
            
            const setLayerColor = (layer, objectId) => {
                if (!layer || !layer.objects || typeof layer.objects.getById !== 'function') return;
                const feature = layer.objects.getById(objectId);
                if (!feature) return;
                try {
                    layer.objects.setObjectOptions(feature.id ?? objectId, {
                        ...(feature.options || {}),
                        iconColor: color
                    });
                } catch (_) {}
            };
            
            DataState.getObjectsData().forEach(obj => {
                if (normalizeInspectorName_(obj?.inspector) !== target) return;
                setLayerColor(objectManager, obj.id);
                setLayerColor(activeLayer, obj.id);
            });
        }

        /**
         * Обновить открытые детали объекта, если объект принадлежит измененному инспектору.
         * @private
         * @param {string} inspectorName
         */
        function refreshOpenObjectDetailsForInspector_(inspectorName) {
            const openObjectId = UIState.getCurrentOpenObjectId();
            if (!inspectorName || !openObjectId) return;
            const object = DataState.findObjectById(openObjectId);
            if (!object) return;

            const updated = normalizeInspectorName_(inspectorName);
            const current = normalizeInspectorName_(object.inspector);
            if (!updated || updated !== current) return;

            const content = UIState.getDomById('objectDetailsContent');
            if (!content) return;
            renderOpenObjectDetailsContent_(object);
        }
        
        /**
         * Установить состояние кнопки
         * @param {HTMLElement} btn - Кнопка
         * @param {'saving'|'saved'|'error'} state - Состояние
         * @param {string} [originalText='Сохранить'] - Исходный текст кнопки
         */
        function setButtonState(btn, state, originalText = 'Сохранить') {
            const states = {
                saving: { text: 'Сохранение...', className: 'saving' },
                saved: { text: 'Сохранено', className: 'saved' },
                error: { text: originalText, className: '' }
            };
            
            const cfg = states[state];
            btn.textContent = cfg.text;
            btn.className = 'apply-btn ' + cfg.className;
            
            // Через 1.5 секунды вернуть исходное состояние после режима "saved"
            if (state === 'saved') {
                const resetDelay = (typeof CONFIG !== 'undefined' && CONFIG.ANIMATION?.BUTTON_RESET_DELAY) || 1500;
                setTimeout(() => setButtonState(btn, 'error', originalText), resetDelay);
            }
        }

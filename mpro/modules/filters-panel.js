// Filters panel module extracted from the legacy monolith.
// Owns sidebar filters, persisted filter state, and map filter mutations.

        function syncFilterPanelHeight_(panel) {
            if (!panel || !panel.classList.contains('open')) return;

            const vv = window.visualViewport;
            const viewportHeight = Math.round((vv && Number(vv.height)) || window.innerHeight || 0);
            const sidebarContent = document.querySelector('.sidebar-content');
            const sidebarHeight = sidebarContent ? sidebarContent.clientHeight : 0;

            // Ограничиваем высоту панели, чтобы она оставалась прокручиваемой и не "зажималась".
            const byViewport = viewportHeight > 0 ? Math.floor(viewportHeight * 0.62) : 420;
            const bySidebar = sidebarHeight > 0 ? Math.floor(sidebarHeight * 0.64) : byViewport;
            const nextHeight = Math.max(220, Math.min(byViewport, bySidebar));

            panel.style.setProperty('--filter-open-max-height', `${nextHeight}px`);
        }

        function toggleFilter(id) {
            const panel = document.getElementById('filter-' + id);
            if (!panel) return;
            panel.classList.toggle('open');
            syncFilterPanelHeight_(panel);
        }

        /**
         * Переключить аккордеон
         * @param {HTMLElement} header - Заголовок аккордеона
         */
        function toggleAccordion(header) {
            const content = header.nextElementSibling;
            if (!content) return;
            
            // Переключить класс активности
            content.classList.toggle('active');
            
            // Дополнительно: повернуть стрелку, если она есть
            const arrow = header.querySelector('.accordion-meta > .accordion-arrow, .accordion-meta > span:last-child');
            if (arrow) {
                arrow.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
            }

            // При раскрытии внутренних блоков пересчитываем доступную высоту внешней панели.
            const parentFilterPanel = header.closest('.filter-content');
            if (parentFilterPanel) {
                requestAnimationFrame(() => syncFilterPanelHeight_(parentFilterPanel));
            }
        }

        /**
         * Рендер списков фильтрации (Объекты и Инспекторы)
         */
        /**
         * Рендер списков фильтрации (Объекты и Инспекторы)
         */
        function createDivisionBuckets_() {
            return {
                'ГС': [],
                'ДМС': [],
                'СК': [],
                'Лаборатория': [],
                'Метро': [],
                'Прочие': []
            };
        }

        function buildFilterItemDomId_(prefix, division, value) {
            const raw = `${prefix}|${division}|${value}`;
            let hash = 2166136261;
            for (let i = 0; i < raw.length; i += 1) {
                hash ^= raw.charCodeAt(i);
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                hash >>>= 0;
            }
            return `${prefix}-${hash.toString(16)}`;
        }

        function buildFilterGroupSignature_(group) {
            const items = Array.isArray(group?.items) ? group.items : [];
            let hash = 2166136261;
            const update = (value) => {
                const str = String(value ?? '');
                for (let i = 0; i < str.length; i += 1) {
                    hash ^= str.charCodeAt(i);
                    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                    hash >>>= 0;
                }
            };

            update(group?.key);
            update(group?.count);
            items.forEach((item) => {
                update(item?.key);
                update(item?.value);
                update(item?.badgeText);
                update(item?.badgeTitle);
            });
            return hash.toString(16);
        }

        function createFilterItemNode_(item) {
            const row = document.createElement('div');
            row.className = 'checkbox-item';
            row.dataset.itemKey = String(item.key || '');

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = String(item.inputId || '');
            input.value = String(item.value || '');
            input.dataset.division = String(item.division || '');
            input.dataset.changeAction = 'update-map-filters';

            const label = document.createElement('label');
            label.setAttribute('for', input.id);
            label.textContent = String(item.label || item.value || '');

            const badge = document.createElement('span');
            badge.className = 'inspector-counter list-progress-counter';
            badge.textContent = String(item.badgeText || '0/0');
            badge.title = String(item.badgeTitle || '');

            row.appendChild(input);
            row.appendChild(label);
            row.appendChild(badge);
            return row;
        }

        function syncAccordionNodeFromGroup_(accordion, group, wasOpen) {
            const nextAccordion = accordion || createAccordion(group.title, group.count, group.checkboxId, group.groupMeta);
            nextAccordion.dataset.groupKey = String(group.key || '');
            nextAccordion.dataset.renderSignature = String(group.signature || '');

            const titleLabel = nextAccordion.querySelector('.accordion-title > span:last-child');
            if (titleLabel) titleLabel.textContent = String(group.title || '');

            const counter = nextAccordion.querySelector('.accordion-meta .inspector-counter');
            if (counter) counter.textContent = String(group.count || 0);

            const headerCheckbox = nextAccordion.querySelector('.checkbox-wrapper input[type="checkbox"]');
            if (headerCheckbox) {
                headerCheckbox.id = String(group.checkboxId || '');
                headerCheckbox.dataset.changeAction = 'toggle-division-filters';
                headerCheckbox.dataset.division = String(group.groupMeta?.division || '');
                headerCheckbox.dataset.filterType = String(group.groupMeta?.type || '');
            }

            const content = nextAccordion.querySelector('.accordion-content');
            if (content) {
                const fragment = document.createDocumentFragment();
                group.items.forEach((item) => {
                    fragment.appendChild(createFilterItemNode_(item));
                });
                content.replaceChildren(fragment);
                content.classList.toggle('active', !!wasOpen);
            }

            const arrow = nextAccordion.querySelector('.accordion-meta > .accordion-arrow, .accordion-meta > span:last-child');
            if (arrow) {
                arrow.style.transform = wasOpen ? 'rotate(180deg)' : 'rotate(0deg)';
            }

            return nextAccordion;
        }

        function ensureFilterContainerEmptyState_(container, text) {
            let empty = container.querySelector('.filter-item[data-empty-state="true"]');
            if (!empty) {
                empty = document.createElement('div');
                empty.className = 'filter-item';
                empty.dataset.emptyState = 'true';
                empty.style.cursor = 'default';
                container.appendChild(empty);
            }
            empty.textContent = String(text || '');
            return empty;
        }

        function syncFilterContainer_(container, groups, emptyText) {
            const accordionNodes = [];
            const existingByKey = new Map();
            Array.from(container.querySelectorAll('.accordion')).forEach((node) => {
                const groupKey = String(node.dataset.groupKey || '');
                if (!groupKey) {
                    node.remove();
                    return;
                }
                accordionNodes.push(node);
                existingByKey.set(groupKey, node);
            });

            Array.from(container.children).forEach((node) => {
                if (!(node instanceof HTMLElement)) return;
                if (node.classList.contains('accordion')) return;
                if (node.matches('.filter-item[data-empty-state="true"]')) return;
                node.remove();
            });

            const emptyNodes = Array.from(container.querySelectorAll('.filter-item[data-empty-state="true"]'));
            emptyNodes.forEach((node) => node.remove());

            if (!Array.isArray(groups) || groups.length === 0) {
                accordionNodes.forEach((node) => node.remove());
                ensureFilterContainerEmptyState_(container, emptyText);
                return;
            }

            let previousNode = null;
            const seenKeys = new Set();

            groups.forEach((group) => {
                const groupKey = String(group.key || '');
                if (!groupKey) return;
                seenKeys.add(groupKey);

                let accordion = existingByKey.get(groupKey) || null;
                const wasOpen = !!accordion?.querySelector('.accordion-content.active');
                const currentSignature = String(accordion?.dataset.renderSignature || '');
                if (!accordion || currentSignature !== group.signature) {
                    const nextAccordion = syncAccordionNodeFromGroup_(accordion, group, wasOpen);
                    if (accordion && accordion !== nextAccordion) {
                        accordion.replaceWith(nextAccordion);
                    }
                    accordion = nextAccordion;
                }

                if (previousNode) {
                    if (accordion.previousElementSibling !== previousNode) {
                        container.insertBefore(accordion, previousNode.nextSibling);
                    }
                } else if (container.firstElementChild !== accordion) {
                    container.insertBefore(accordion, container.firstChild);
                }
                previousNode = accordion;
            });

            accordionNodes.forEach((node) => {
                const groupKey = String(node.dataset.groupKey || '');
                if (!seenKeys.has(groupKey) && node.isConnected) {
                    node.remove();
                }
            });
        }

        function buildFilterRenderModel_() {
            const inspectorsByDivision = createDivisionBuckets_();
            const listStatsByDivision = createDivisionBuckets_();
            const visibleInspectors = getRoleScopedInspectors_(DataState.getInspectorsList());
            const visibleObjects = getRoleScopedObjects_(DataState.getObjectsData());
            const inspectorStatsByNorm = {};
            const unassignedStats = { total: 0, completed: 0 };

            visibleObjects.forEach((obj) => {
                if (!obj || typeof obj !== 'object') return;

                const inspectorNorm = normalizeInspectorName_(obj.inspector);
                if (inspectorNorm) {
                    if (!inspectorStatsByNorm[inspectorNorm]) {
                        inspectorStatsByNorm[inspectorNorm] = { total: 0, completed: 0 };
                    }
                    inspectorStatsByNorm[inspectorNorm].total += 1;
                    if (isObjectCompletedForListStats_(obj)) {
                        inspectorStatsByNorm[inspectorNorm].completed += 1;
                    }
                } else {
                    unassignedStats.total += 1;
                    if (isObjectCompletedForListStats_(obj)) {
                        unassignedStats.completed += 1;
                    }
                }

                const division = normalizeDivisionName_(resolveObjectDivision_(obj)) || 'Прочие';
                if (!listStatsByDivision[division]) listStatsByDivision[division] = {};
                const listName = getObjectListName_(obj);
                if (!listStatsByDivision[division][listName]) {
                    listStatsByDivision[division][listName] = { total: 0, completed: 0 };
                }
                listStatsByDivision[division][listName].total += 1;
                if (isObjectCompletedForListStats_(obj)) {
                    listStatsByDivision[division][listName].completed += 1;
                }
            });

            visibleInspectors.forEach((insp) => {
                if (!insp || typeof insp !== 'object') return;
                const division = normalizeDivisionName_(String(insp.division || 'Прочие').trim()) || 'Прочие';
                if (!inspectorsByDivision[division]) inspectorsByDivision[division] = [];
                inspectorsByDivision[division].push(insp);
            });

            const inspectorGroups = [];
            Object.keys(inspectorsByDivision).forEach((division) => {
                const inspectors = inspectorsByDivision[division]
                    .slice()
                    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'ru'));
                if (!inspectors.length) return;

                const items = inspectors.map((insp) => {
                    const stats = inspectorStatsByNorm[normalizeInspectorName_(insp.name)] || { total: 0, completed: 0 };
                    return {
                        key: normalizeInspectorName_(insp.name) || String(insp.name || ''),
                        inputId: buildFilterItemDomId_('insp', division, insp.name),
                        value: String(insp.name || ''),
                        division,
                        badgeText: `${stats.completed}/${stats.total}`,
                        badgeTitle: `Выполнено ${stats.completed} из ${stats.total}`
                    };
                });

                const group = {
                    key: `inspectors:${division}`,
                    title: division,
                    count: inspectors.length,
                    checkboxId: `chk-group-insp-${division}`,
                    groupMeta: { division, type: 'inspectors' },
                    items
                };
                group.signature = buildFilterGroupSignature_(group);
                inspectorGroups.push(group);
            });

            if (unassignedStats.total > 0) {
                const unassignedGroup = {
                    key: 'inspectors:unassigned',
                    title: 'Без инспектора',
                    count: unassignedStats.total,
                    checkboxId: 'chk-group-insp-unassigned',
                    groupMeta: { division: 'Без инспектора', type: 'inspectors' },
                    items: [{
                        key: getUnassignedInspectorFilterKey_(),
                        inputId: buildFilterItemDomId_('insp', 'Без инспектора', getUnassignedInspectorFilterKey_()),
                        value: getUnassignedInspectorFilterKey_(),
                        label: getUnassignedInspectorLabel_(),
                        division: 'Без инспектора',
                        badgeText: `${unassignedStats.completed}/${unassignedStats.total}`,
                        badgeTitle: `Выполнено ${unassignedStats.completed} из ${unassignedStats.total}`
                    }]
                };
                unassignedGroup.signature = buildFilterGroupSignature_(unassignedGroup);
                inspectorGroups.push(unassignedGroup);
            }

            const listGroups = [];
            Object.keys(listStatsByDivision).forEach((division) => {
                const statsMap = listStatsByDivision[division];
                const listNames = Object.keys(statsMap).sort((a, b) => a.localeCompare(b, 'ru'));
                if (!listNames.length) return;

                const items = listNames.map((listName) => {
                    const stats = statsMap[listName] || { total: 0, completed: 0 };
                    return {
                        key: `${division}::${listName}`,
                        inputId: buildFilterItemDomId_('list', division, listName),
                        value: listName,
                        division,
                        badgeText: `${stats.completed}/${stats.total}`,
                        badgeTitle: `Выполнено ${stats.completed} из ${stats.total}`
                    };
                });

                const group = {
                    key: `lists:${division}`,
                    title: division,
                    count: listNames.length,
                    checkboxId: `chk-group-list-${division}`,
                    groupMeta: { division, type: 'lists' },
                    items
                };
                group.signature = buildFilterGroupSignature_(group);
                listGroups.push(group);
            });

            return {
                inspectorGroups,
                listGroups,
                visibleObjectsCount: visibleObjects.length
            };
        }

        function renderFilterLists() {
            const listsContainer = document.getElementById('lists-container');
            const inspectorsContainer = document.getElementById('inspectors-container');
            if (!listsContainer || !inspectorsContainer) return;

            const model = buildFilterRenderModel_();
            syncFilterContainer_(inspectorsContainer, model.inspectorGroups, 'Нет доступных инспекторов');

            const currentUser = RuntimeState.getCurrentUser() || {};
            const division = String(currentUser.division || '').trim();
            const emptyListsText = model.visibleObjectsCount === 0
                ? (isInspectorRole_()
                    ? 'Для вас пока нет доступных объектов на тестовом стенде'
                    : (division
                        ? `Для дивизиона ${division} пока нет доступных объектов на тестовом стенде`
                        : 'На тестовом стенде пока нет доступных объектов'))
                : 'Нет доступных списков объектов';
            syncFilterContainer_(listsContainer, model.listGroups, emptyListsText);

            UIState.setFilterCheckboxes(
                'inspectors',
                Array.from(inspectorsContainer.querySelectorAll('input[type="checkbox"][data-division][data-change-action="update-map-filters"]'))
            );
            UIState.setFilterCheckboxes(
                'lists',
                Array.from(listsContainer.querySelectorAll('input[type="checkbox"][data-division][data-change-action="update-map-filters"]'))
            );
            applyStoredFiltersToUI_();
            syncFilterPanelHeight_(document.getElementById('filter-lists'));
            syncFilterPanelHeight_(document.getElementById('filter-inspectors'));
        }

        function loadStoredFilters_() {
            const storageKey = getFiltersStorageKey_();
            try {
                const raw = localStorage.getItem(storageKey);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return null;
                return {
                    inspectors: Array.isArray(parsed.inspectors) ? parsed.inspectors : [],
                    lists: Array.isArray(parsed.lists) ? parsed.lists : []
                };
            } catch (err) {
                console.warn('⚠️ Не удалось прочитать сохраненные фильтры:', err);
                return null;
            }
        }

        /**
         * Сохранить фильтры в localStorage
         * @param {{inspectors: string[], lists: {name: string, division: string}[]}} filters
         */
        function saveFiltersToStorage_(filters) {
            const storageKey = getFiltersStorageKey_();
            try {
                localStorage.setItem(storageKey, JSON.stringify(filters));
            } catch (err) {
                console.warn('⚠️ Не удалось сохранить фильтры:', err);
            }
        }

        /**
         * Получить ключ хранения фильтров с привязкой к текущему пользователю.
         * Это предотвращает перенос фильтров между разными учетными записями.
         * @returns {string}
         */
        function getFiltersStorageKey_() {
            const baseKey = String(CONFIG.FILTERS_STORAGE_KEY || 'mpro_filters');
            const userNorm = normalizeInspectorName_(RuntimeState.getCurrentUserName(''));
            if (!userNorm) return baseKey;
            return `${baseKey}:${userNorm}`;
        }

        /**
         * Применить сохраненные фильтры к чекбоксам после рендера
         */
        function applyStoredFiltersToUI_() {
            const cache = ensureFilterCheckboxCache_();
            const current = FiltersState.getCurrent();
            const hasCurrent =
                (Array.isArray(current?.inspectors) && current.inspectors.length > 0) ||
                (Array.isArray(current?.lists) && current.lists.length > 0);
            const sourceFilters = hasCurrent ? current : loadStoredFilters_();
            const hasSourceSelections = !!(
                (Array.isArray(sourceFilters?.inspectors) && sourceFilters.inspectors.length > 0) ||
                (Array.isArray(sourceFilters?.lists) && sourceFilters.lists.length > 0)
            );

            if (!sourceFilters || !hasSourceSelections) {
                cache.inspectors.forEach(cb => { cb.checked = !cb.disabled; });
                cache.lists.forEach(cb => { cb.checked = !cb.disabled; });
                updateMapFilters();
                return;
            }

            const inspectorSet = new Set(Array.isArray(sourceFilters.inspectors) ? sourceFilters.inspectors : []);
            cache.inspectors.forEach(cb => {
                cb.checked = inspectorSet.has(cb.value);
            });

            const storedLists = Array.isArray(sourceFilters.lists) ? sourceFilters.lists : [];
            cache.lists.forEach(cb => {
                const match = storedLists.some(item => item && item.name === cb.value && item.division === cb.dataset.division);
                cb.checked = match;
            });

            updateMapFilters();
        }

        /**
         * Синхронизировать чекбоксы групп (в заголовках аккордеонов)
         * с состоянием дочерних чекбоксов
         */
        function syncGroupCheckboxes_() {
            syncGroupCheckboxesForContainer_('inspectors-container', 'chk-group-insp-');
            syncGroupCheckboxesForContainer_('lists-container', 'chk-group-list-');
        }

        function ensureFilterCheckboxCache_() {
            let inspectors = UIState.getFilterCheckboxes('inspectors');
            let lists = UIState.getFilterCheckboxes('lists');

            if (inspectors.length === 0) {
                const inspectorRoot = UIState.getDomById('inspectors-container');
                inspectors = inspectorRoot
                    ? Array.from(inspectorRoot.querySelectorAll('input[type="checkbox"][data-division][data-change-action="update-map-filters"]'))
                    : [];
                UIState.setFilterCheckboxes('inspectors', inspectors);
                inspectors = UIState.getFilterCheckboxes('inspectors');
            }

            if (lists.length === 0) {
                const listsRoot = UIState.getDomById('lists-container');
                lists = listsRoot
                    ? Array.from(listsRoot.querySelectorAll('input[type="checkbox"][data-division][data-change-action="update-map-filters"]'))
                    : [];
                UIState.setFilterCheckboxes('lists', lists);
                lists = UIState.getFilterCheckboxes('lists');
            }

            return { inspectors, lists };
        }

        /**
         * @param {string} containerId
         * @param {string} idPrefix
         */
        function syncGroupCheckboxesForContainer_(containerId, idPrefix) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const accordions = container.querySelectorAll('.accordion');
            accordions.forEach(accordion => {
                const headerCheckbox = accordion.querySelector(`input[type="checkbox"][id^="${idPrefix}"]`);
                if (!headerCheckbox) return;

                const items = accordion.querySelectorAll('.accordion-content input[type="checkbox"][data-division]');
                const enabledItems = Array.from(items).filter(cb => !cb.disabled);
                const total = enabledItems.length;
                let checkedCount = 0;
                enabledItems.forEach(cb => { if (cb.checked) checkedCount++; });

                if (total === 0) {
                    headerCheckbox.disabled = true;
                    headerCheckbox.checked = false;
                    headerCheckbox.indeterminate = false;
                    return;
                }

                headerCheckbox.disabled = false;
                headerCheckbox.checked = checkedCount === total;
                headerCheckbox.indeterminate = checkedCount > 0 && checkedCount < total;
            });
        }

        /**
         * Ограничить доступные списки выбранными инспекторами.
         * Если инспектор(ы) выбраны, активными остаются только их списки.
         * Остальные списки становятся неактивными (серые) и снимаются.
         * @param {string[]} selectedInspectors
         * @param {{inspectors: HTMLInputElement[], lists: HTMLInputElement[]}} cache
         */
        function applyInspectorDrivenListAvailability_(selectedInspectors, cache) {
            const listCheckboxes = Array.isArray(cache?.lists) ? cache.lists : [];
            const selectedInspectorValues = Array.isArray(selectedInspectors) ? selectedInspectors : [];
            const includeUnassigned = selectedInspectorValues.some(value => isUnassignedInspectorFilterValue_(value));
            const selectedNormSet = new Set(
                selectedInspectorValues
                    .filter(value => !isUnassignedInspectorFilterValue_(value))
                    .map(name => normalizeInspectorName_(name))
                    .filter(Boolean)
            );

            let allowedListKeys = null;
            if (selectedNormSet.size > 0 || includeUnassigned) {
                allowedListKeys = new Set();
                const scopedObjects = getRoleScopedObjects_(DataState.getObjectsData());
                scopedObjects.forEach(obj => {
                    const objInspectorNorm = normalizeInspectorName_(obj?.inspector);
                    if (objInspectorNorm) {
                        if (!selectedNormSet.has(objInspectorNorm)) return;
                    } else if (!includeUnassigned) {
                        return;
                    }
                    allowedListKeys.add(getObjectListDivisionKey_(obj));
                });
            }

            listCheckboxes.forEach(cb => {
                if (!cb) return;

                const row = cb.closest('.checkbox-item');
                const key = `${String(cb.dataset.division || '')}::${String(cb.value || '')}`;
                const isEnabled = !allowedListKeys || allowedListKeys.has(key);

                if (!isEnabled && cb.checked) cb.checked = false;
                cb.disabled = !isEnabled;

                if (row) {
                    row.classList.toggle('checkbox-item--disabled', !isEnabled);
                }
            });

            syncGroupCheckboxesForContainer_('lists-container', 'chk-group-list-');
        }

        /**
         * Массовое переключение чекбоксов в группе
         */
        function toggleDivisionFilters(division, type, isChecked) {
            const cache = ensureFilterCheckboxCache_();
            const checkboxes = (type === 'inspectors' ? cache.inspectors : cache.lists)
                .filter(cb => cb.dataset.division === division && !cb.disabled);
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            
            updateMapFilters();
        }

        /**
         * Создать HTML-элемент аккордеона.
         */
        function createAccordion(title, count, checkboxId, groupMeta = null) {
            const div = document.createElement('div');
            div.className = 'accordion';
            const safeTitle = Utils.escapeHtml(title);
            const safeCheckboxId = Utils.escapeAttr(checkboxId || '');
            const safeDivision = Utils.escapeAttr((groupMeta && groupMeta.division) || '');
            const safeType = Utils.escapeAttr((groupMeta && groupMeta.type) || '');
            
            // Разметка чекбокса
            const checkboxHtml = checkboxId ? `
                <div class="checkbox-wrapper" data-stop-propagation="true" style="display:inline-flex; margin-right:8px;">
                    <input type="checkbox" id="${safeCheckboxId}" class="blue-checkbox"
                        data-change-action="toggle-division-filters"
                        data-division="${safeDivision}"
                        data-filter-type="${safeType}">
                </div>
            ` : '';

            div.innerHTML = `
                <div class="accordion-header" data-action="toggle-accordion">
                    <div class="accordion-title" style="display: flex; align-items: center;">
                        ${checkboxHtml}
                        <span>${safeTitle}</span>
                    </div>
                    <div class="accordion-meta">
                        <span class="inspector-counter">${count}</span>
                        <span class="accordion-arrow">&#9662;</span>
                    </div>
                </div>
                <div class="accordion-content"></div>
            `;
            return div;
        }

        /**
         * Обновить фильтры карты на основе выбранных чекбоксов
         */
        function updateMapFilters() {
            const cache = ensureFilterCheckboxCache_();
            // Получить выбранных инспекторов
            const selectedInspectorCheckboxes = cache.inspectors.filter(cb => cb.checked);
            const selectedInspectors = selectedInspectorCheckboxes.map(cb => cb.value);
            const selectedInspectorDivisions = Array.from(
                new Set(selectedInspectorCheckboxes.map(cb => cb.dataset.division).filter(Boolean))
            );

            FiltersState.setObjectsTabInspectorCache({
                inspectors: selectedInspectors,
                divisions: selectedInspectorDivisions
            });

            applyInspectorDrivenListAvailability_(selectedInspectors, cache);

            syncGroupCheckboxes_();

            // Получить выбранные списки (только доступные)
            const selectedLists = cache.lists
                .filter(cb => cb.checked && !cb.disabled)
                .map(cb => ({
                    name: cb.value,
                    division: cb.dataset.division
                }));

            const nextFilters = {
                inspectors: selectedInspectors,
                lists: selectedLists
            };

            if (areFiltersEqual_(FiltersState.getCurrent(), nextFilters)) return;

            // Обновляем фильтры приложения
            FiltersState.setCurrent(nextFilters);
            saveFiltersToStorage_(FiltersState.getCurrent());
            
            debugLog('Filters updated:', FiltersState.getCurrent());
            const managementPanel = UIState.getDomById('inspectorManagementPanel');
            if (managementPanel && !managementPanel.classList.contains('hidden') && !isInspectorRole_()) {
                renderInspectorManagement();
            }
            scheduleMapUpdate_();
        }

        /**
         * Переключить режим "Только в работе" для карты
         * @param {boolean} isChecked
         */
        function toggleOnlyActiveMode(isChecked) {
            const nextValue = !!isChecked;
            if (FiltersState.isOnlyActiveMode() === nextValue) return;
            FiltersState.setOnlyActiveMode(nextValue);
            scheduleMapUpdate_();
        }

        /**
         * Переключить показ выполненных точек на карте
         * @param {boolean} isChecked
         */
        function toggleShowCompletedOnMap(isChecked) {
            const nextValue = !!isChecked;
            if (FiltersState.isShowCompletedOnMap() === nextValue) return;
            FiltersState.setShowCompletedOnMap(nextValue);
            scheduleMapUpdate_();
        }

        /**
         * Временно оставить выполненную точку видимой на карте
         * (аналог автоскрытия в резервной копии)
         * @param {string|number} objectId
         */
        function markCompletedTemporarilyVisible_(objectId) {
            const id = String(objectId);
            FiltersState.setRecentlyCompletedUntil(id, Date.now() + COMPLETED_AUTO_HIDE_MS);

            setTimeout(() => {
                if (!FiltersState.isShowCompletedOnMap()) {
                    scheduleMapUpdate_();
                }
            }, COMPLETED_AUTO_HIDE_MS + 50);
        }

        /**
         * Сравнить фильтры и не перерисовывать карту, если изменений нет
         * @param {{inspectors:string[], lists:{name:string,division:string}[]}} a
         * @param {{inspectors:string[], lists:{name:string,division:string}[]}} b
         * @returns {boolean}
         */
        function areFiltersEqual_(a, b) {
            if (!a || !b) return false;
            if (!Array.isArray(a.inspectors) || !Array.isArray(b.inspectors)) return false;
            if (!Array.isArray(a.lists) || !Array.isArray(b.lists)) return false;
            if (a.inspectors.length !== b.inspectors.length) return false;
            if (a.lists.length !== b.lists.length) return false;

            for (let i = 0; i < a.inspectors.length; i += 1) {
                if (a.inspectors[i] !== b.inspectors[i]) return false;
            }
            for (let i = 0; i < a.lists.length; i += 1) {
                if (a.lists[i].name !== b.lists[i].name || a.lists[i].division !== b.lists[i].division) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Проверить, должна ли выполненная точка оставаться видимой временно
         * @param {string|number} objectId
         * @returns {boolean}
         */
        function isCompletedTemporarilyVisible_(objectId) {
            const id = String(objectId);
            const recentlyCompletedMap = FiltersState.getRecentlyCompletedMap();
            const until = recentlyCompletedMap.get(id);
            if (!until) return false;

            if (Date.now() > until) {
                recentlyCompletedMap.delete(id);
                return false;
            }

            return true;
        }

        /**
         * Получить выбранных инспекторов и дивизионы из блока "Списки инспекторов"
         * @returns {{inspectors: string[], divisions: string[]}}
         */


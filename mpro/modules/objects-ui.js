// Objects list and navigation extracted from app-legacy.js

function getSelectedInspectorFilters_() {
            const cache = FiltersState.getObjectsTabInspectorCache();
            return {
                inspectors: Array.isArray(cache.inspectors)
                    ? cache.inspectors.slice()
                    : [],
                divisions: Array.isArray(cache.divisions)
                    ? cache.divisions.slice()
                    : []
            };
        }

        /**
         * Получить отображаемое имя списка объекта.
         * Для пустых значений используем стабильный fallback.
         * @param {Object} obj
         * @returns {string}
         */
        function getObjectListName_(obj) {
            const raw = String(obj?.list ?? '')
                .replace(/\s+/g, ' ')
                .trim();
            return raw || 'Без списка';
        }

        /**
         * Признак выполненного объекта для счетчика "выполнено/всего".
         * Любой заполненный exitTime (включая "нет") считаем выполнением.
         * @param {Object} obj
         * @returns {boolean}
         */
        function isObjectCompletedForListStats_(obj) {
            const exitRaw = String(obj?.exitTime ?? '').trim().toLowerCase();
            if (!exitRaw) return false;
            return true;
        }

        /**
         * Ключ "дивизион::список" для фильтрации.
         * @param {Object} obj
         * @returns {string}
         */
        function getObjectListDivisionKey_(obj) {
            return `${resolveObjectDivision_(obj)}::${getObjectListName_(obj)}`;
        }

        /**
         * Определить дивизион объекта
         * @param {Object} obj
         * @returns {string}
         */
        function resolveObjectDivision_(obj) {
            if (!obj || typeof obj !== 'object') return 'Прочие';
            if (obj.__divisionResolved) {
                const normalizedCached = normalizeDivisionName_(obj.__divisionResolved);
                if (normalizedCached) {
                    obj.__divisionResolved = normalizedCached;
                    return normalizedCached;
                }
            }
            const mappedBySheet = DIVISION_MAPPING[obj.sheetName];
            if (mappedBySheet) {
                obj.__divisionResolved = mappedBySheet;
                return mappedBySheet;
            }

            const mappedBySource = DIVISION_MAPPING[obj.source];
            if (mappedBySource) {
                obj.__divisionResolved = mappedBySource;
                return mappedBySource;
            }

            const sourceName = CONFIG.SOURCES[obj.source] || obj.source;
            const normalizedByName = normalizeDivisionName_(sourceName);
            if (normalizedByName) {
                obj.__divisionResolved = normalizedByName;
                return normalizedByName;
            }

            const normalizedBySheetRaw = normalizeDivisionName_(obj.sheetName);
            if (normalizedBySheetRaw) {
                obj.__divisionResolved = normalizedBySheetRaw;
                return normalizedBySheetRaw;
            }

            const normalizedBySourceRaw = normalizeDivisionName_(obj.source);
            if (normalizedBySourceRaw) {
                obj.__divisionResolved = normalizedBySourceRaw;
                return normalizedBySourceRaw;
            }

            obj.__divisionResolved = 'Прочие';
            return obj.__divisionResolved;
        }

        /**
         * Получить объекты для вкладки "Объекты"
         * Логика: фильтрация только по выбранным инспекторам и их дивизионам
         * @returns {Object[]}
         */
        function getObjectsForObjectsTab_() {
            const objectsData = getRoleScopedObjects_(DataState.getObjectsData());
            if (!Array.isArray(objectsData) || objectsData.length === 0) return [];

            const selected = getSelectedInspectorFilters_();
            const currentFilters = FiltersState.getCurrent();
            const selectedLists = Array.isArray(currentFilters?.lists) ? currentFilters.lists : [];
            if (selected.inspectors.length === 0 || selectedLists.length === 0) return [];

            const showUnassignedObjects = selected.inspectors.some(value => isUnassignedInspectorFilterValue_(value));
            const inspectorSet = new Set(
                selected.inspectors
                    .filter(value => !isUnassignedInspectorFilterValue_(value))
                    .map(name => normalizeInspectorName_(name))
                    .filter(Boolean)
            );
            const listSet = new Set(
                selectedLists
                    .filter(item => item && typeof item === 'object')
                    .map(item => `${item.division}::${item.name}`)
            );
            if ((inspectorSet.size === 0 && !showUnassignedObjects) || listSet.size === 0) return [];

            return objectsData.filter(obj => {
                const listKey = obj.__listDivisionKey || getObjectListDivisionKey_(obj);
                if (!listSet.has(listKey)) return false;
                const inspectorNorm = normalizeInspectorName_(obj?.inspector);
                if (!inspectorNorm) return showUnassignedObjects;
                return inspectorSet.has(inspectorNorm);
            });
        }

        /**
         * Отложенное обновление списка при вводе в поиске вкладки "Объекты".
         */
        function scheduleObjectsListRender_() {
            if (UIState.isObjectsListRenderQueued()) return;
            UIState.setObjectsListRenderQueued(true);
            requestAnimationFrame(() => {
                UIState.setObjectsListRenderQueued(false);
                updateObjectsList();
            });
        }

        /**
         * Отложенное обновление списка при вводе в поиске вкладки "Объекты".
         */
        function scheduleObjectsListUpdate_() {
            const pendingTimer = UIState.getObjectsListUpdateTimer();
            if (pendingTimer) {
                clearTimeout(pendingTimer);
            }
            UIState.setObjectsListUpdateTimer(setTimeout(() => {
                UIState.setObjectsListUpdateTimer(null);
                scheduleObjectsListRender_();
            }, 120));
        }

        /**
         * Построить компактную сигнатуру секции, чтобы избежать лишнего ререндера.
         * @param {Object[]} items
         * @param {string} icon
         * @returns {string}
         */
        function getObjectsSectionSignature_(items, icon) {
            let hash = 2166136261;
            const update = (value) => {
                const str = String(value ?? '');
                for (let i = 0; i < str.length; i += 1) {
                    hash ^= str.charCodeAt(i);
                    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                    hash >>>= 0;
                }
            };

            update(icon);
            update(items.length);
            for (let i = 0; i < items.length; i += 1) {
                const obj = items[i];
                update(obj?.id);
                update(obj?.entryTime);
                update(obj?.exitTime);
                update(obj?.list);
                update(obj?.address);
                update(obj?.inspector);
                update(obj?.latitude);
                update(obj?.longitude);
                update(obj?.__divisionResolved || resolveObjectDivision_(obj));
            }

            return hash.toString(16);
        }

        /**
         * Обновить бейдж секции только при изменении значения.
         * @param {'active'|'new'|'completed'} sectionKey
         * @param {string} badgeId
         * @param {number} count
         */
        function updateObjectsBadge_(sectionKey, badgeId, count) {
            if (UIState.getObjectsBadge(sectionKey) === count) return;
            UIState.setObjectsBadge(sectionKey, count);
            const badge = UIState.getDomById(badgeId);
            if (badge) badge.textContent = String(count);
        }

        /**
         * Обновить списки во вкладке "Объекты".
         */
        function updateObjectsList() {
            const activeRoot = UIState.getDomById('objectsActiveList');
            const newRoot = UIState.getDomById('objectsNewList');
            const completedRoot = UIState.getDomById('objectsCompletedList');
            if (!activeRoot || !newRoot || !completedRoot) return;

            const searchText = RuntimeState.getMapSearchQuery();

            const base = getObjectsForObjectsTab_();
            const matchesSearch = (obj) => {
                if (!searchText) return true;
                const searchBlob = obj.__searchBlobLower || `${String(obj.id || '').toLowerCase()}|${String(obj.list || '').toLowerCase()}|${String(obj.address || '').toLowerCase()}`;
                return searchBlob.includes(searchText);
            };

            const activeObjects = [];
            const newObjects = [];
            const completedObjects = [];

            for (let i = 0; i < base.length; i += 1) {
                const obj = base[i];
                if (!matchesSearch(obj)) continue;

                if (obj.entryTime && !obj.exitTime) {
                    activeObjects.push(obj);
                } else if (!obj.entryTime && !obj.exitTime) {
                    newObjects.push(obj);
                } else {
                    completedObjects.push(obj);
                }
            }

            populateObjectsList_(activeRoot, activeObjects, '🔥', 'active');
            populateObjectsList_(newRoot, newObjects, '🆕', 'new');
            populateObjectsList_(completedRoot, completedObjects, '✅', 'completed');

            updateObjectsBadge_('active', 'activeObjectsBadge', activeObjects.length);
            updateObjectsBadge_('new', 'newObjectsBadge', newObjects.length);
            updateObjectsBadge_('completed', 'completedObjectsBadge', completedObjects.length);
        }

        /**
         * Рендер списка объектов в секции вкладки "Объекты"
         * @param {HTMLElement} root
         * @param {Object[]} items
         * @param {string} icon
         * @param {'active'|'new'|'completed'} sectionKey
         */
        function populateObjectsList_(root, items, icon, sectionKey) {
            const nextSignature = getObjectsSectionSignature_(items, icon);
            if (UIState.getObjectsListRenderSignature(sectionKey) === nextSignature) return;
            UIState.setObjectsListRenderSignature(sectionKey, nextSignature);
            syncObjectsListRows_(root, items, icon);
        }

        function createObjectsListRow_() {
            const row = document.createElement('div');
            row.className = 'objects-list-item';
            row.dataset.action = 'focus-object-from-list';

            const iconEl = document.createElement('span');
            iconEl.dataset.role = 'icon';

            const main = document.createElement('div');
            main.className = 'objects-list-item__main';

            const title = document.createElement('div');
            title.className = 'objects-list-item__title';
            title.dataset.role = 'title';

            const address = document.createElement('div');
            address.className = 'objects-list-item__sub';
            address.dataset.role = 'address';

            const inspector = document.createElement('div');
            inspector.className = 'objects-list-item__sub';
            inspector.dataset.role = 'inspector';

            const pin = document.createElement('span');
            pin.className = 'objects-list-item__sub';
            pin.dataset.role = 'pin';

            main.appendChild(title);
            main.appendChild(address);
            main.appendChild(inspector);
            row.appendChild(iconEl);
            row.appendChild(main);
            row.appendChild(pin);
            return row;
        }

        function updateObjectsListRow_(row, obj, icon) {
            const objectId = String(obj?.id ?? '');
            row.dataset.objectId = objectId;
            row.dataset.rowKey = objectId;

            const iconEl = row.querySelector('[data-role="icon"]');
            const title = row.querySelector('[data-role="title"]');
            const address = row.querySelector('[data-role="address"]');
            const inspector = row.querySelector('[data-role="inspector"]');
            const pin = row.querySelector('[data-role="pin"]');

            if (iconEl) iconEl.textContent = icon;
            if (title) title.textContent = `#${obj.id} • ${getObjectListName_(obj)}`;
            if (address) address.textContent = obj.address || 'Без адреса';
            if (inspector) {
                inspector.textContent = `${obj.inspector || 'Не назначен'} • ${obj.__divisionResolved || resolveObjectDivision_(obj)}`;
            }
            if (pin) pin.textContent = '📌';
        }

        function ensureObjectsListEmptyState_(root) {
            let empty = root.querySelector('.objects-list-empty');
            if (!empty) {
                empty = document.createElement('div');
                empty.className = 'objects-list-empty';
                empty.textContent = 'Нет объектов';
                root.appendChild(empty);
            }
            return empty;
        }

        function syncObjectsListRows_(root, items, icon) {
            const objectRows = Array.from(root.querySelectorAll('.objects-list-item[data-object-id]'));
            const existingById = new Map();
            objectRows.forEach((row) => {
                existingById.set(String(row.dataset.objectId || ''), row);
            });

            if (!items || items.length === 0) {
                objectRows.forEach((row) => row.remove());
                ensureObjectsListEmptyState_(root);
                return;
            }

            const emptyState = root.querySelector('.objects-list-empty');
            if (emptyState) emptyState.remove();

            let previousRow = null;
            const seenIds = new Set();

            items.forEach((obj) => {
                const objectId = String(obj?.id ?? '');
                if (!objectId) return;
                seenIds.add(objectId);

                let row = existingById.get(objectId);
                if (!row) {
                    row = createObjectsListRow_();
                }
                updateObjectsListRow_(row, obj, icon);

                if (previousRow) {
                    if (row.previousElementSibling !== previousRow) {
                        root.insertBefore(row, previousRow.nextSibling);
                    }
                } else if (root.firstElementChild !== row) {
                    root.insertBefore(row, root.firstChild);
                }

                previousRow = row;
            });

            objectRows.forEach((row) => {
                const objectId = String(row.dataset.objectId || '');
                if (!seenIds.has(objectId)) {
                    row.remove();
                }
            });
        }

        function focusObjectFromObjectsTabById_(objectId) {
            const obj = DataState.findObjectById(objectId);
            if (!obj) return;
            focusObjectFromObjectsTab_(obj);
        }

        /**
         * Центрировать карту и открыть карточку объекта из вкладки "Объекты"
         * @param {Object} obj
         */
        function focusObjectFromObjectsTab_(obj) {
            const lat = parseFloat(obj.latitude);
            const lon = parseFloat(obj.longitude);
            const mapInstance = MapState.getMapInstance();

            if (mapInstance && !isNaN(lat) && !isNaN(lon)) {
                mapInstance.setCenter([lat, lon], 17, { duration: 250 });
            } else if (!isNaN(lat) && !isNaN(lon)) {
                ensureMapReady_({ fitToViewport: false })
                    .then((readyMap) => {
                        if (readyMap && typeof readyMap.setCenter === 'function') {
                            readyMap.setCenter([lat, lon], 17, { duration: 250 });
                        }
                    })
                    .catch(() => null);
            }

            openObjectDetails(obj.id);
        }

        /**
         * Обновить вкладку "Объекты" только если она активна
         */
        function refreshObjectsTabIfVisible_() {
            const pane = UIState.getDomById('nav-objects');
            if (pane && pane.classList.contains('active')) {
                scheduleObjectsListRender_();
            }
        }
        
        /**
         * Переключить вкладки нижнего меню.
         * @param {string} tabName - Идентификатор вкладки ('lists' | 'objects' | 'map' | 'exit')
         */
        function switchNav(tabName) {
            debugLog('🔘 Switched to:', tabName);
            
            if (tabName === 'exit') {
                logout();
                return;
            }
            
            // Обновить состояние кнопок меню
            document.querySelectorAll('.modern-menu-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.getElementById(`btn-${tabName}`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
            syncMenuIndicator_(tabName);

            const objectsPane = UIState.getDomById('nav-objects');
            const objectsSearchWrapper = UIState.getDomById('objectsSearchWrapper');

            if (objectsPane) objectsPane.classList.remove('active');
            if (objectsSearchWrapper) objectsSearchWrapper.style.display = 'none';

            if (tabName === 'objects' && objectsPane) {
                objectsPane.classList.add('active');
                if (objectsSearchWrapper) objectsSearchWrapper.style.display = 'block';
                scheduleObjectsListRender_();
            }

            if (tabName === 'map') {
                ensureMapReady_().catch(() => null);
            }

            if (tabName === 'map' && isMobileViewport_()) {
                closeMobileSidebar_();
            } else {
                setMapInlineSearchOpen_(false);
            }
        }
        
        // ============================================
        // Модуль администрирования
        // ============================================
        
        /**
         * Показать боковую панель управления инспекторами
         */
        

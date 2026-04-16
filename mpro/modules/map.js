// Map runtime and rendering extracted from app-legacy.js

        function getYandexMapsReadyPromise_() {
            const readyPromise = window.__M_PRO_YMAPS_READY__;
            if (readyPromise && typeof readyPromise.then === 'function') {
                return readyPromise;
            }
            return Promise.resolve();
        }

        function scheduleMapWarmup_(options = {}) {
            if (MapState.getMapInstance() || MapState.getMapInitPromise() || MapState.getMapWarmupTimer()) {
                return;
            }

            const delayMs = Math.max(0, Number(options.delayMs) || 0);
            const timeoutMs = Math.max(800, Number(options.timeoutMs) || 2000);
            const runWarmup = () => {
                MapState.clearMapWarmupTimer();
                initMap({ silentErrors: true }).catch(() => null);
            };

            if (delayMs > 0) {
                MapState.setMapWarmupTimer(setTimeout(runWarmup, delayMs));
                return;
            }

            if (typeof window.requestIdleCallback === 'function') {
                MapState.setMapWarmupTimer({
                    kind: 'idle',
                    id: window.requestIdleCallback(runWarmup, { timeout: timeoutMs })
                });
                return;
            }

            MapState.setMapWarmupTimer(setTimeout(runWarmup, Math.min(timeoutMs, 600)));
        }

        function ensureMapReady_(options = {}) {
            MapState.clearMapWarmupTimer();
            return initMap(options).then((mapInstance) => {
                if (MapState.hasPendingRender()) {
                    MapState.clearPendingRender();
                    scheduleMapUpdate_();
                }
                if (options.fitToViewport !== false) {
                    scheduleMapFitToViewport_();
                }
                return mapInstance;
            });
        }

        function initMap(options = {}) {
            if (MapState.getMapInstance()) {
                return Promise.resolve(MapState.getMapInstance());
            }

            const pendingInit = MapState.getMapInitPromise();
            if (pendingInit) {
                return pendingInit;
            }

            MapState.clearMapWarmupTimer();
            const initPromise = getYandexMapsReadyPromise_()
                .then(() => new Promise((resolve, reject) => {
                    const api = window.ymaps;
                    if (!api || typeof api.ready !== 'function') {
                        reject(new Error('Yandex Maps API is not loaded'));
                        return;
                    }
                    api.ready(resolve);
                }))
                .then(() => {
                    if (MapState.getMapInstance()) {
                        return MapState.getMapInstance();
                    }

                    const api = window.ymaps;
                    MapState.setMapInstance(new api.Map('map', {
                        center: [55.7558, 37.6176],
                        zoom: 10,
                        controls: ['zoomControl', 'typeSelector']
                    }));
                    scheduleMapFitToViewport_();
                    setTimeout(scheduleMapFitToViewport_, 120);
                    initObjectManagers_();
                    MapState.setHomesLayer(new api.GeoObjectCollection());
                    MapState.getMapInstance().geoObjects.add(MapState.getHomesLayer());
                    if (UIState.isInspectorsHomesVisible()) {
                        updateInspectorsHomesLayer();
                    }
                    if (MapState.hasPendingRender()) {
                        MapState.clearPendingRender();
                    }
                    scheduleMapUpdate_();
                    return MapState.getMapInstance();
                })
                .catch((error) => {
                    console.error('Failed to initialize Yandex map:', error);
                    if (!options.silentErrors) {
                        showNotification('Не удалось загрузить карту. Проверьте сеть и обновите страницу.', 'error');
                    }
                    throw error;
                })
                .finally(() => {
                    MapState.clearMapInitPromise();
                });

            MapState.setMapInitPromise(initPromise);
            return initPromise;
                
                // Инициализируем менеджеры объектов (ObjectManager) для точек
                
                // Слой для домашних адресов инспекторов

                // Догоняющий рендер: если данные пришли раньше готовности слоев карты.
        }
        
        /**
         * Переключить видимость домов инспекторов на карте
         */
        async function showHomes() {
            if (isInspectorRole_()) return;
            if (Object.keys(DataState.getInspectorsHomesData()).length === 0) {
                try {
                    await loadData();
                } catch (error) {
                    showNotification('Ошибка загрузки домов: ' + error.message, 'error');
                    return;
                }
            }

            const shouldEnable = !UIState.isInspectorsHomesVisible();
            if (shouldEnable) {
                try {
                    await ensureMapReady_({ fitToViewport: false });
                } catch (_error) {
                    return;
                }
            }

            const visible = UIState.toggleInspectorsHomesVisible();
            debugLog('🏠 Дома инспекторов:', visible ? 'показаны' : 'скрыты');
            updateInspectorsHomesLayer();
        }

        function parseInspectorHomeCoords_(home) {
            if (!home || typeof home !== 'object') return null;

            const directLat = Number(home.lat);
            const directLon = Number(home.lon);
            if (Number.isFinite(directLat) && Number.isFinite(directLon)) {
                return { lat: directLat, lon: directLon };
            }

            const latlonText = String(home.latlon || '').trim();
            if (!latlonText) return null;

            const match = latlonText.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)\s*$/);
            if (!match) return null;

            const parsedLat = Number(match[1].replace(',', '.'));
            const parsedLon = Number(match[2].replace(',', '.'));
            if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return null;

            return { lat: parsedLat, lon: parsedLon };
        }

        function updateInspectorsHomesLayer() {
            const homesLayer = MapState.getHomesLayer();
            if (!homesLayer) return;
            
            homesLayer.removeAll();
            
            if (!UIState.isInspectorsHomesVisible()) return;
            
            const homes = DataState.getInspectorsHomesData();
            const keys = Object.keys(homes);
            
            if (keys.length === 0) {
                alert('Нет данных о домах инспекторов');
                return;
            }
            
            keys.forEach(inspector => {
                const home = homes[inspector];
                const coords = parseInspectorHomeCoords_(home);
                if (!coords) return;
                const style = getInspectorStyle(inspector);
                const homeColor = style.color || CONFIG.DEFAULTS?.INSPECTOR_COLOR || '#1f6fb2';
                
                const placemark = new ymaps.Placemark(
                    [coords.lat, coords.lon],
                    {
                        balloonContent: `<b>🏠 ${inspector}</b><br>Домашний адрес`
                    },
                    {
                        preset: 'islands#blueHomeIcon',
                        iconColor: homeColor
                    }
                );
                
                homesLayer.add(placemark);
            });
        }
        
        // ============================================
        // Модуль данных
        // ============================================

        

function scheduleMapUpdate_() {
            if (!MapState.areObjectLayersReady()) {
                MapState.markPendingRender();
                return;
            }
            if (UIState.isMapRenderQueued()) return;
            UIState.setMapRenderQueued(true);
            requestAnimationFrame(() => {
                UIState.setMapRenderQueued(false);
                updateMap();
            });
        }

function initObjectManagers_() {
            // Менеджер обычных точек (Новая, Выполнена, Отказано)
            MapState.setObjectManager(new ymaps.ObjectManager({
                clusterize: false  // Кластеризацию отключаем: точки уже разнесены смещением
            }));
            
            // Менеджер активных точек (В работе), поверх обычных
            MapState.setActiveObjectsLayer(new ymaps.ObjectManager({
                clusterize: false  // Кластеризацию отключаем
            }));

            const objectManager = MapState.getObjectManager();
            const activeObjectsLayer = MapState.getActiveObjectsLayer();
            const mapInstance = MapState.getMapInstance();
            
            // Настройки балунов (хотя используем кастомный модал)
            objectManager.objects.options.set({
                balloonMaxWidth: 600,
                balloonMinWidth: 400,
                balloonPanelMaxMapArea: 0,
                openBalloonOnClick: false  // Отключаем стандартный балун по клику
            });
            
            activeObjectsLayer.objects.options.set({
                balloonMaxWidth: 600,
                balloonMinWidth: 400,
                balloonPanelMaxMapArea: 0,
                openBalloonOnClick: false  // Отключаем стандартный балун по клику
            });
            
            // Обработчики клика на точки - открываем кастомный балун
            objectManager.objects.events.add('click', (e) => {
                const objectId = e.get('objectId');
                openObjectDetails(objectId);
            });
            
            activeObjectsLayer.objects.events.add('click', (e) => {
                const objectId = e.get('objectId');
                openObjectDetails(objectId);
            });
            
            // Добавляем слои на карту
            mapInstance.geoObjects.add(objectManager);
            mapInstance.geoObjects.add(activeObjectsLayer);
            
            // Активные точки поверх обычных
            activeObjectsLayer.options.set('zIndex', 1000);
        }
        
        const COMPLETED_AUTO_HIDE_MS = 4000;

        /**
         * Обновить отображение точек на карте
         * Распределяет точки по слоям (обычные и активные) со смещением для одинаковых координат.
         */
        function clearMapLayers_() {
            MapState.clearObjectLayers();
        }

        /**
         * Построить компактную сигнатуру текущего состояния карты.
         * @param {Object[]} regularFeatures
         * @param {Object[]} activeFeatures
         * @returns {string}
         */
        function getMapRenderSignature_(regularFeatures, activeFeatures) {
            let hash = 2166136261;

            const update = (value) => {
                const str = String(value ?? '');
                for (let i = 0; i < str.length; i += 1) {
                    hash ^= str.charCodeAt(i);
                    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                    hash >>>= 0;
                }
            };

            const visit = (feature) => {
                if (!feature) return;
                update(feature.id);
                const coords = feature.geometry?.coordinates || [];
                update(coords[0]);
                update(coords[1]);
                const opts = feature.options || {};
                update(opts.preset);
                update(opts.iconColor);
                update(opts.iconSize);
                update(feature.properties?.hintContent);
            };

            update('regular');
            update(regularFeatures.length);
            regularFeatures.forEach(visit);

            update('active');
            update(activeFeatures.length);
            activeFeatures.forEach(visit);

            return hash.toString(16);
        }

        /**
         * Применить пустое состояние карты только при фактическом изменении.
         * @param {string} stateKey
         */
        function applyEmptyMapState_(stateKey) {
            const signature = `empty:${stateKey}`;
            if (MapState.getLastRenderSignature() === signature) return;
            clearMapLayers_();
            MapState.setLastRenderSignature(signature);
        }

        /**
         * Применить наборы точек на карту только при изменении сигнатуры рендера.
         * @param {Object[]} regularFeatures
         * @param {Object[]} activeFeatures
         * @returns {boolean} true, если слои были обновлены
         */
        function applyMapRender_(regularFeatures, activeFeatures) {
            const nextSignature = getMapRenderSignature_(regularFeatures, activeFeatures);
            if (MapState.getLastRenderSignature() === nextSignature) {
                return false;
            }

            clearMapLayers_();

            const objectManager = MapState.getObjectManager();
            const activeObjectsLayer = MapState.getActiveObjectsLayer();

            if (regularFeatures.length > 0) {
                objectManager.add({
                    type: 'FeatureCollection',
                    features: regularFeatures
                });
            }
            
            if (activeFeatures.length > 0) {
                activeObjectsLayer.add({
                    type: 'FeatureCollection',
                    features: activeFeatures
                });
            }

            MapState.setLastRenderSignature(nextSignature);
            return true;
        }

        function updateMap() {
            if (!MapState.areObjectLayersReady()) {
                MapState.markPendingRender();
                return;
            }
            MapState.clearPendingRender();

            const objectsData = getRoleScopedObjects_(DataState.getObjectsData());
            
            if (!objectsData || objectsData.length === 0) {
                debugLog('ℹ️ Нет данных для отображения на карте');
                applyEmptyMapState_('no-data');
                return;
            }
            
            debugLog('🗺️ Обновление карты:', objectsData.length, 'точек');
            
            // Сбрасываем счетчик координат
            MapState.resetCoordinateCounter();
            
            // Коллекция Map для отслеживания точек с одинаковыми координатами
            /** @type {Map<string, number>} */
            const coordinateMap = new Map();
            
            const regularFeatures = [];
            const activeFeatures = [];
            
            // Проверка, есть ли активные фильтры
            const currentFilters = FiltersState.getCurrent();
            const hasInspectorFilters = currentFilters.inspectors.length > 0;
            const hasListFilters = currentFilters.lists.length > 0;
            const hasFilters = hasInspectorFilters || hasListFilters;

            // Если фильтры не выбраны, не показываем точки (строгий режим)
            if (!hasFilters) {
                debugLog('ℹ️ Фильтры не выбраны - карта пуста');
                applyEmptyMapState_('no-filters');
                return;
            }

            // Если выбраны инспекторы, но не выбран ни один список, ничего не показываем.
            if (hasInspectorFilters && !hasListFilters) {
                debugLog('ℹ️ Выбран инспектор, но не выбран список');
                applyEmptyMapState_('inspector-no-lists');
                return;
            }

            // Режим "Только в работе" требует выбранных инспекторов
            if (FiltersState.isOnlyActiveMode() && !hasInspectorFilters) {
                debugLog('ℹ️ Режим "Только в работе": нет выбранных инспекторов');
                applyEmptyMapState_('active-no-inspectors');
                return;
            }

            const selectedInspectorsSet = hasInspectorFilters
                ? new Set(
                    currentFilters.inspectors
                        .filter(name => !isUnassignedInspectorFilterValue_(name))
                        .map(name => normalizeInspectorName_(name))
                        .filter(Boolean)
                )
                : null;
            const showUnassignedObjects = hasInspectorFilters
                ? currentFilters.inspectors.some(name => isUnassignedInspectorFilterValue_(name))
                : false;
            const selectedListsSet = hasListFilters
                ? new Set(currentFilters.lists.map(item => `${item.division}::${item.name}`))
                : null;
            const mapSearchQuery = RuntimeState.getMapSearchQuery();
            const hasMapSearchQuery = !!mapSearchQuery;

            // Кешируем ключи списка для текущего прохода (ускоряет фильтрацию при большом количестве точек)
            objectsData.forEach((obj) => {
                // Фильтрация
                let match = false;
                const isActive = obj.entryTime && !obj.exitTime;
                const isCompleted = !!obj.exitTime;
                const inspectorNorm = normalizeInspectorName_(obj?.inspector);
                const listKey = obj.__listDivisionKey || getObjectListDivisionKey_(obj);

                if (FiltersState.isOnlyActiveMode()) {
                    // В этом режиме используем только выбранных инспекторов и только активные точки
                    if (!isActive) return;
                    if (inspectorNorm) {
                        if (!selectedInspectorsSet || !selectedInspectorsSet.has(inspectorNorm)) return;
                    } else if (!showUnassignedObjects) {
                        return;
                    }
                    if (selectedListsSet && !selectedListsSet.has(listKey)) return;
                    match = true;
                } else {
                    // При выбранных инспекторах: пересечение инспектор + список.
                    if (selectedInspectorsSet || showUnassignedObjects) {
                        if (selectedListsSet && !selectedListsSet.has(listKey)) return;
                        if (inspectorNorm) {
                            if (!selectedInspectorsSet || !selectedInspectorsSet.has(inspectorNorm)) return;
                        } else if (!showUnassignedObjects) {
                            return;
                        }
                        match = true;
                    } else if (selectedListsSet) {
                        // Без выбранных инспекторов фильтруем только по спискам.
                        if (selectedListsSet.has(listKey)) {
                            match = true;
                        }
                    }
                }
                
                if (!match) return;

                if (hasMapSearchQuery) {
                    const fallbackBlob = `${String(obj?.id || '')}|${String(obj?.list || '')}|${String(obj?.address || '')}`.toLowerCase();
                    const searchBlob = `${obj?.__searchBlobLower || fallbackBlob}|${String(obj?.inspector || '').toLowerCase()}`;
                    if (!searchBlob.includes(mapSearchQuery)) return;
                }

                // Выполненные/отказанные точки по умолчанию скрываем с карты.
                // После "Выход" точка видна ещё несколько секунд и затем исчезает.
                if (!FiltersState.isOnlyActiveMode() && isCompleted && !FiltersState.isShowCompletedOnMap() && !isCompletedTemporarilyVisible_(obj.id)) {
                    return;
                }

                const feature = createPointFeature_(obj, coordinateMap);
                if (!feature) return;
                
                if (isActive) {
                    activeFeatures.push(feature);
                } else {
                    regularFeatures.push(feature);
                }
            });
            
            // Обновляем слои только при реальном изменении набора/стиля/координат точек
            applyMapRender_(regularFeatures, activeFeatures);
            
            debugLog('✅ На карте: обычных', regularFeatures.length, ', активных', activeFeatures.length);
            refreshObjectsTabIfVisible_();
        }
        
        /**
         * Создать GeoJSON-объект точки для карты.
         * @private
         * @param {Object} obj - Данные объекта
         * @param {Map<string, number>} coordinateMap - Хранилище для отслеживания дубликатов координат
         * @returns {Object|null} GeoJSON-объект или null
         */
        function createPointFeature_(obj, coordinateMap) {
            const id = obj.id;
            const lat = parseFloat(obj.latitude);
            const lon = parseFloat(obj.longitude);
            
            if (isNaN(lat) || isNaN(lon)) {
                console.warn('⚠️ Некорректные координаты для точки', id);
                return null;
            }
            
            // Проверяем дубликаты координат и добавляем смещение
            const coordKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
            const count = coordinateMap.get(coordKey) || 0;
            coordinateMap.set(coordKey, count + 1);
            
            // Смещение для точек с одинаковыми координатами (спираль)
            let offsetLat = 0;
            let offsetLon = 0;
            if (count > 0) {
                const offset = calculateOffset_(count);
                offsetLat = offset.lat;
                offsetLon = offset.lon;
            }
            
            // Определяем статус и стиль
            const isNew = !obj.entryTime && !obj.exitTime;
            const isActive = obj.entryTime && !obj.exitTime;
            const isDenied = obj.exitTime === 'нет';
            const isCompleted = !!obj.exitTime && !isDenied;
            
            const style = getInspectorStyle(obj.inspector);
            
            // Выбираем пресет и размер иконки по статусу
            let preset = 'islands#dotIcon';
            let iconColor = style.color || '#1f6fb2';
            let iconSize = CONFIG.MAP.ICON_SIZE.DEFAULT;
            
            if (isActive) {
                preset = 'islands#circleIcon';
                iconSize = CONFIG.MAP.ICON_SIZE.ACTIVE;
            } else if (isCompleted) {
                preset = 'islands#greenMedicalIcon';
                iconColor = style.color || '#1f6fb2';
            } else if (isDenied) {
                preset = 'islands#redAttentionIcon';
                iconColor = style.color || '#1f6fb2';
            }
            
            return {
                type: 'Feature',
                id: id,
                geometry: {
                    type: 'Point',
                    coordinates: [lat + offsetLat, lon + offsetLon]
                },
                properties: {
                    hintContent: getHintContent_(obj),
                    objectData: obj  // Сохраняем данные для балуна
                },
                options: {
                    preset: preset,
                    iconColor: iconColor,
                    iconSize: iconSize
                }
            };
        }
        
        /**
         * Рассчитать смещение для дубликатов координат по спирали Архимеда.
         * @private
         * @param {number} index - Индекс дубликата (1, 2, 3...)
         * @returns {{lat: number, lon: number}} Смещение в градусах
         */
        function calculateOffset_(index) {
            const { ANGLE_STEP, RADIUS_BASE } = CONFIG.MAP.SPIRAL;
            const angle = index * ANGLE_STEP;
            const radius = RADIUS_BASE * Math.sqrt(index);
            
            return {
                lat: radius * Math.cos(angle),
                lon: radius * Math.sin(angle)
            };
        }
        
        /**
         * Получить текст подсказки для точки.
         * @private
         * @param {Object} obj - Данные объекта
         * @returns {string} Текст подсказки
         */
        function getHintContent_(obj) {
            const isActive = obj.entryTime && !obj.exitTime;
            const isDenied = obj.exitTime === 'нет';
            const isCompleted = !!obj.exitTime && !isDenied;
            // Извлекаем оригинальный ID для отображения
            const displayId = obj.originalId || (obj.id.includes('_') ? obj.id.split('_')[1] : obj.id);
            
            if (isActive) return `В работе: Точка №${displayId}`;
            if (isDenied) return `Отказано: Точка №${displayId}`;
            if (isCompleted) return `Выполнена: Точка №${displayId}`;
            return `Точка №${displayId}`;
        }
        
        /**
         * Получить стиль инспектора (цвет, иконка, статус)
         * @param {string} inspectorName - Имя инспектора
         * @returns {{color: string, icon: string, status: string}} Стиль инспектора
         */
        function getInspectorStyle(inspectorName) {
            const defaultStyle = { 
                color: CONFIG.DEFAULTS?.INSPECTOR_COLOR || '#1f6fb2',
                icon: CONFIG.DEFAULTS?.INSPECTOR_ICON || '👤'
            };
            if (!inspectorName) {
                return defaultStyle;
            }
            const keys = getInspectorConfigKeysByName_(inspectorName);
            if (keys.length === 0) return defaultStyle;
            
            const resolved = DataState.getInspectorsConfig()[keys[0]] || {};
            return {
                ...defaultStyle,
                color: String(resolved.color || defaultStyle.color)
            };
        }

        

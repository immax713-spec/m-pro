import { SCRIPT_URL, UPSTREAM_URL, REPORTS_URL, STORAGE_KEYS, SESSION_TIMEOUT, DEFAULT_SHEET_ID, DEFAULT_GID } from './config.js';
import { state } from './state.js';
import { showNotification, dismissNotification } from './notifications.js';
import { enqueueUpload, getAllUploads, getQueueStats, retryFailedUpload, deleteUpload, updateUploadStatus } from './upload-queue.js';

const {
    SESSION: SESSION_KEY,
    REMEMBER_ME: REMEMBER_ME_KEY,
    SAVED_PASSWORDS: SAVED_PASSWORDS_KEY,
    WORK_DAY_STATUS: WORK_DAY_STATUS_KEY,
    WORK_DAY_START_TIME: WORK_DAY_START_TIME_KEY,
    FILTERS_STATE: FILTERS_STATE_KEY,
    SAVED_PASSWORD,
    SESSION,
    CACHED_DATA,
    LAST_USER_LIST,
    INSPECTORS_CACHE,
    ACTIVE_ENTRIES
} = STORAGE_KEYS;

// 🔥 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
window.REPORTS_URL = REPORTS_URL; // Expose for checklistManager
window.showNotification = showNotification; // Expose for NEW_openChecklistForm.js
window.dismissNotification = dismissNotification; // Expose for NEW_openChecklistForm.js
let currentUser = null;
let userAccessRights = null;
let isWorkDayOpen = true;
let objectsData = [];
let map;
let objectManager;
let activeObjectsLayer;
let inspectorsHomesLayer;
let showInspectorsHomes = false;
// Removed duplicate isWorkDayOpen
let availableIcons = {};
let availableColors = [];
let activeMenu = null;
let isSidebarCollapsed = false;
let currentDetailsObjectId = null;
// ✅ Карта завершённости материалов по объектам (в памяти)
let completionMap = {};
// 🔥 Debounce для оптимизации обновления карты
let updateMapTimeout = null;
let isMapUpdating = false;

// Дополнительные параметры для проксирования ID таблицы/папки фото через URL
const getExtraParams = () => {
    try {
        const params = new URLSearchParams(window.location.search || '');
        const out = [];
        let sid = params.get('sheet_id') || params.get('spreadsheetId');
        const pid = params.get('photos_id') || params.get('photosFolderId');
        let gid = params.get('gid');
        if (!sid && DEFAULT_SHEET_ID) sid = DEFAULT_SHEET_ID;
        if (!gid && DEFAULT_GID) gid = DEFAULT_GID;
        if (sid) out.push('spreadsheetId=' + encodeURIComponent(sid));
        if (pid) out.push('photos_id=' + encodeURIComponent(pid));
        if (gid) out.push('gid=' + encodeURIComponent(gid));
        return out.length ? ('&' + out.join('&')) : '';
    } catch (_) { return ''; }
};
const obsTextToKey = {}; // REMOVED per user request

Object.defineProperties(state, {
    currentUser: {
        get: () => currentUser,
        set: (value) => {
            currentUser = value;
        }
    },
    userAccessRights: {
        get: () => userAccessRights,
        set: (value) => {
            userAccessRights = value;
        }
    },
    objectsData: {
        get: () => objectsData,
        set: (value) => {
            objectsData = value;
        }
    },
    map: {
        get: () => map,
        set: (value) => {
            map = value;
        }
    },
    objectManager: {
        get: () => objectManager,
        set: (value) => {
            objectManager = value;
        }
    },
    activeObjectsLayer: {
        get: () => activeObjectsLayer,
        set: (value) => {
            activeObjectsLayer = value;
        }
    },
    inspectorsHomesLayer: {
        get: () => inspectorsHomesLayer,
        set: (value) => {
            inspectorsHomesLayer = value;
        }
    },
    showInspectorsHomes: {
        get: () => showInspectorsHomes,
        set: (value) => {
            showInspectorsHomes = value;
        }
    },
    isWorkDayOpen: {
        get: () => isWorkDayOpen,
        set: (value) => {
            isWorkDayOpen = value;
        }
    },
    availableIcons: {
        get: () => availableIcons,
        set: (value) => {
            availableIcons = value;
        }
    },
    availableColors: {
        get: () => availableColors,
        set: (value) => {
            availableColors = value;
        }
    },
    activeMenu: {
        get: () => activeMenu,
        set: (value) => {
            activeMenu = value;
        }
    },
    isSidebarCollapsed: {
        get: () => isSidebarCollapsed,
        set: (value) => {
            isSidebarCollapsed = value;
        }
    }
});

Object.defineProperties(window, {
    map: {
        get: () => map,
        set: (value) => {
            map = value;
        }
    },
    objectsData: {
        get: () => objectsData,
        set: (value) => {
            objectsData = value;
        }
    }
});

// 🔥 СОХРАНЕНИЕ СОСТОЯНИЯ ФИЛЬТРОВ
function saveFilterState() {
    try {
        const filterState = {
            inspectors: getSelectedInspectors(),
            lists: getSelectedLists(),
            showHidden: document.getElementById('showHidden').checked,
            timestamp: Date.now()
        };
        localStorage.setItem(FILTERS_STATE_KEY, JSON.stringify(filterState));
        console.log('✅ Состояние фильтров сохранено');
    } catch (error) {
        console.error('❌ Ошибка сохранения фильтров:', error);
    }
}

// 🔥 ЗАГРУЗКА СОСТОЯНИЯ ФИЛЬТРОВ
function loadFilterState() {
    try {
        const saved = localStorage.getItem(FILTERS_STATE_KEY);
        if (saved) {
            const filterState = JSON.parse(saved);

            // 🔥 ВОССТАНАВЛИВАЕМ ИНСПЕКТОРОВ
            const inspectorCheckboxes = document.querySelectorAll('#inspectorsList input[type="checkbox"]');
            inspectorCheckboxes.forEach(checkbox => {
                const inspector = decodeURIComponent(checkbox.id.replace('insp_', ''));
                checkbox.checked = filterState.inspectors.includes(inspector);
            });

            // 🔥 ВОССТАНАВЛИВАЕМ СПИСКИ
            const listCheckboxes = document.querySelectorAll('#listsList input[type="checkbox"]');
            listCheckboxes.forEach(checkbox => {
                const list = decodeURIComponent(checkbox.id.replace('list_', ''));
                checkbox.checked = filterState.lists.includes(list);
            });

            // 🔥 ВОССТАНАВЛИВАЕМ ЧЕКБОКС "МОНИТОРИНГ"
            document.getElementById('showHidden').checked = filterState.showHidden;

            checkSelectAllState(); // 🔥 Update Select All checkboxes after restore

            console.log('✅ Состояние фильтров восстановлено');
            // 🔥 НЕ вызываем updateFilters() здесь - это будет сделано в initInterface()
            return true;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки фильтров:', error);
    }
    return false;
}

// 🔥 СБРОС ФИЛЬТРОВ К СОСТОЯНИЮ "ПО УМОЛЧАНИЮ"
function resetFiltersToDefault() {
    // 🔥 ВЫБИРАЕМ ВСЕХ ИНСПЕКТОРОВ (кроме неактивных)
    const inspectorCheckboxes = document.querySelectorAll('#inspectorsList input[type="checkbox"]');
    inspectorCheckboxes.forEach(checkbox => {
        const inspector = decodeURIComponent(checkbox.id.replace('insp_', ''));
        const style = getInspectorStyle(inspector);
        checkbox.checked = style.status === 'active'; // только активных
    });

    // 🔥 ВЫБИРАЕМ ВСЕ СПИСКИ
    const listCheckboxes = document.querySelectorAll('#listsList input[type="checkbox"]');
    listCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
    });

    // 🔥 СБРАСЫВАЕМ ЧЕКБОКС "МОНИТОРИНГ"
    document.getElementById('showHidden').checked = false;

    console.log('✅ Фильтры сброшены к состоянию по умолчанию');
    saveFilterState();
    updateFilters();
}

// 🔥 ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
function initializeApp() {
    console.log('🟡 Страница загружена, проверяем сессию...');

    // Всегда загружаем свежих инспекторов
    loadInspectorsFromServer();

    // Пытаемся восстановить сессию
    if (restoreSession()) {
        console.log('✅ Сессия восстановлена');
        updateUIForRole(); // 🔥 ОБНОВЛЯЕМ МЕНЮ ПРИ ВОССТАНОВЛЕНИИ СЕССИИ
        showMainInterface();
        loadData();
    }

    // Инициализируем карту
    ymaps.ready(initMap);

    // Обработчик клика по карте для скрытия мобильного сайдбара
    document.getElementById('map').addEventListener('click', function () {
        if (checkMobileDevice() && document.getElementById('sidebar').classList.contains('mobile-open')) {
            toggleMobileSidebar();
        }
    });

    const overlay = document.getElementById('objectDetailsOverlay');
    if (overlay) {
        const backdrop = overlay.querySelector('.object-details__backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => closeObjectDetails());
        }
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeObjectDetails();
            closeInspectorManagement();
        }
    });
    // try { showMainInterface(); loadData(); } catch (_) { } // 🔥 REMOVED TO PREVENT GUEST ACCESS
}

document.addEventListener('DOMContentLoaded', initializeApp);

// 🔥 ПРОВЕРКА МОБИЛЬНОГО УСТРОЙСТВА
function checkMobileDevice() {
    return window.innerWidth <= 768;
}



// 🔥 ПЕРЕКЛЮЧЕНИЕ МОБИЛЬНОГО САЙДБАРА
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('mobileToggleBtn');

    if (sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        toggleBtn.textContent = '📱 Панель';
    } else {
        sidebar.classList.add('mobile-open');
        toggleBtn.textContent = '✕ Закрыть';
    }
}

// 🔥 СИСТЕМА СЕССИЙ И АУТЕНТИФИКАЦИИ
function saveSession() {
    if (currentUser) {
        const sessionData = {
            user: currentUser,
            role: userAccessRights,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        console.log('✅ Сессия сохранена');
    }
}

function restoreSession() {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (sessionData) {
            const session = JSON.parse(sessionData);
            const sessionAge = Date.now() - session.timestamp;

            if (sessionAge < SESSION_TIMEOUT) {
                console.log('🔄 Восстанавливаем сессию для:', session.user);

                currentUser = session.user;
                userAccessRights = session.role;

                // Восстанавливаем статус рабочего дня ОТДЕЛЬНО от сессии
                const workDayStatus = getWorkDayStatus();
                isWorkDayOpen = workDayStatus.isOpen;

                showMainInterface();
                loadData();
                return true;
            } else {
                console.log('❌ Сессия истекла');
                clearSession();
            }
        }
    } catch (error) {
        console.error('❌ Ошибка восстановления сессии:', error);
        clearSession();
    }
    return false;
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    currentUser = null;
    userAccessRights = 'Инспектор';
}

// 🔥 СИСТЕМА "ЗАПОМНИТЬ ПАРОЛЬ"
function savePassword(username, password) {
    try {
        const rememberMe = document.getElementById('rememberPassword').checked;

        if (rememberMe && username && password) {
            localStorage.setItem(REMEMBER_ME_KEY, 'true');

            const savedPasswords = getSavedPasswords();
            savedPasswords[username] = password;
            localStorage.setItem(SAVED_PASSWORDS_KEY, JSON.stringify(savedPasswords));

            console.log('✅ Пароль сохранен для:', username);
        } else {
            clearSavedPassword(username);
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения пароля:', error);
    }
}

function getSavedPasswords() {
    try {
        const saved = localStorage.getItem(SAVED_PASSWORDS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        return {};
    }
}

function getSavedPassword(username) {
    try {
        const savedPasswords = getSavedPasswords();
        return savedPasswords[username] || null;
    } catch (error) {
        return null;
    }
}

function clearSavedPassword(username) {
    try {
        const savedPasswords = getSavedPasswords();
        if (savedPasswords[username]) {
            delete savedPasswords[username];
            localStorage.setItem(SAVED_PASSWORDS_KEY, JSON.stringify(savedPasswords));
        }
    } catch (error) {
        console.error('❌ Ошибка удаления пароля:', error);
    }
}

function autoFillLoginForm() {
    const userSelect = document.getElementById('userSelect');
    const passwordInput = document.getElementById('passwordInput');
    const rememberCheckbox = document.getElementById('rememberPassword');

    if (userSelect.value) {
        const savedPassword = getSavedPassword(userSelect.value);
        if (savedPassword) {
            passwordInput.value = savedPassword;
            rememberCheckbox.checked = true;
        } else {
            passwordInput.value = '';
            rememberCheckbox.checked = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
        }
    }
}

// 🔥 СИСТЕМА РАБОЧЕГО ДНЯ
function saveWorkDayStatus(isOpen, startTime = null) {
    try {
        localStorage.setItem(WORK_DAY_STATUS_KEY, isOpen ? 'open' : 'closed');
        if (startTime) {
            localStorage.setItem(WORK_DAY_START_TIME_KEY, startTime);
        }
        console.log('✅ Статус рабочего дня сохранен:', isOpen ? 'открыт' : 'закрыт');
    } catch (error) {
        console.error('❌ Ошибка сохранения статуса рабочего дня:', error);
    }
}

function getWorkDayStatus() {
    try {
        const status = localStorage.getItem(WORK_DAY_STATUS_KEY);
        const startTime = localStorage.getItem(WORK_DAY_START_TIME_KEY);

        return {
            isOpen: status === 'open',
            startTime: startTime
        };
    } catch (error) {
        return { isOpen: false, startTime: null };
    }
}

// 🔥 Parsing Helper for GAS responses
function parseServerResponse(text) {
    try {
        // 1. Try direct JSON
        return JSON.parse(text);
    } catch (e1) {
        try {
            // 2. Try unwrapping JSONP (tolerant of newlines)
            const start = text.indexOf('(');
            const end = text.lastIndexOf(')');
            if (start !== -1 && end !== -1 && end > start) {
                const inner = text.substring(start + 1, end);
                return JSON.parse(inner);
            }
        } catch (e2) {
            // 3. Fallback: maybe it's strict JSONP but with weird whitespace?
            // Just return null/throw to trigger error handler
        }
    }
    throw new Error('Failed to parse server response');
}

function clearWorkDayStatus() {
    try {
        localStorage.removeItem(WORK_DAY_STATUS_KEY);
        localStorage.removeItem(WORK_DAY_START_TIME_KEY);
    } catch (error) {
        console.error('❌ Ошибка очистки статуса рабочего дня:', error);
    }
}

// 🔥 ЗАГРУЗКА ИНСПЕКТОРОВ - БЕЗ КЭША
function loadInspectorsFromServer() {
    const path = '?action=getData&t=' + Date.now() + getExtraParams();

    // 🔥 FIX: Use FETCH if proxy is active to prevent spinning favicon
    if (SCRIPT_URL.includes('/exec')) {
        fetch(SCRIPT_URL + path, { cache: 'no-store' })
            .then(r => r.text())
            .then(text => {
                const data = parseServerResponse(text);
                const hasData = data && data.inspectorsData && Object.keys(data.inspectorsData).length > 0;
                const hasConfig = data && data.inspectorsConfig && Object.keys(data.inspectorsConfig).length > 0;
                const source = hasData ? data.inspectorsData : (hasConfig ? data.inspectorsConfig : null);



                if (data && data.success && source) {
                    window.inspectorsConfig = data.inspectorsConfig || {};
                    const map = hasData ? data.inspectorsData : Object.fromEntries(Object.keys(source).map(n => [n, '']));
                    updateUserSelect(map);
                    console.log('✅ Инспекторы загружены через Fetch:', Object.keys(map).length);
                } else {
                    console.error('❌ Ошибка загрузки инспекторов (Fetch)');
                    const userSelect = document.getElementById('userSelect');
                    userSelect.innerHTML = '<option value="">-- Ошибка загрузки --</option>';
                }
            })
            .catch(e => {
                console.error('❌ Ошибка сети при загрузке инспекторов:', e);
                const userSelect = document.getElementById('userSelect');
                userSelect.innerHTML = '<option value="">-- Ошибка сети --</option>';
            });
        return;
    }

    // Fallback to JSONP for direct Google usage
    const callbackName = 'inspectorsLoginCallback_' + Date.now();
    const scriptPath = path + '&callback=' + callbackName;
    const originalHandler = function (data) {
        delete window[callbackName];
        const hasData = data && data.inspectorsData && Object.keys(data.inspectorsData).length > 0;
        const hasConfig = data && data.inspectorsConfig && Object.keys(data.inspectorsConfig).length > 0;
        const source = hasData ? data.inspectorsData : (hasConfig ? data.inspectorsConfig : null);

        if (data && data.success && source) {
            window.inspectorsConfig = data.inspectorsConfig || {}; // 🔥 Save config globally
            const map = hasData ? data.inspectorsData : Object.fromEntries(Object.keys(source).map(n => [n, '']));
            updateUserSelect(map);
            console.log('✅ Инспекторы загружены мгновенно:', Object.keys(map).length);
        } else {
            console.error('❌ Ошибка загрузки инспекторов');
            const userSelect = document.getElementById('userSelect');
            userSelect.innerHTML = '<option value="">-- Ошибка загрузки --</option>';
        }
    };
    window[callbackName] = originalHandler;
    const s1 = document.createElement('script');
    s1.src = SCRIPT_URL + scriptPath;
    s1.onerror = function () {
        delete window[callbackName];
        console.error('❌ Ошибка загрузки инспекторов');
        const userSelect = document.getElementById('userSelect');
        userSelect.innerHTML = '<option value="">-- Ошибка сети --</option>';
    };
    document.head.appendChild(s1);
}

function refreshInspectorsList() {
    loadInspectorsFromServer();
    showNotification('🔄 Обновляем список инспекторов...', 'success');
}

function updateUserSelect(inspectorsData) {
    const userSelect = document.getElementById('userSelect');
    userSelect.innerHTML = '<option value="">-- Выберите инспектора --</option>';

    Object.keys(inspectorsData).forEach(inspector => {
        const option = document.createElement('option');
        option.value = inspector;
        option.textContent = inspector;
        userSelect.appendChild(option);
    });

    // Добавляем обработчик для автозаполнения пароля
    userSelect.addEventListener('change', autoFillLoginForm);

    console.log('✅ Обновлен список пользователей:', Object.keys(inspectorsData).length);
}

// 🔥 ОСНОВНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА
function showMainInterface() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('currentUser').textContent = currentUser + ' (' + userAccessRights + ')';

    // 🔥 ПОКАЗЫВАЕМ СООТВЕТСТВУЮЩИЕ СЕКЦИИ УПРАВЛЕНИЯ
    if (userAccessRights === 'Император' || userAccessRights === 'Администратор') {
        document.getElementById('adminSection').style.display = 'block';
    } else {
        document.getElementById('workDaySection').style.display = 'block';
        updateWorkDayButtons();
        checkWorkDayStatus();
    }

    // 🔥 СКРЫВАЕМ КНОПКУ МОБИЛЬНОЙ ПАНЕЛИ НА ДЕСКТОПЕ
    const mobileBtn = document.getElementById('mobileToggleBtn');
    if (!checkMobileDevice() && mobileBtn) {
        mobileBtn.style.display = 'none';
    }
}

function login() {
    const userSelect = document.getElementById('userSelect');
    const passwordInput = document.getElementById('passwordInput');
    let selectedUser = userSelect.value;

    // 🔥 DEV BYPASS REMOVED
    if (!selectedUser) {
        showNotification('❌ Выберите пользователя', 'error');
        return;
    }

    console.log('✅ Логин для:', selectedUser);
    currentUser = selectedUser;

    // 🔥 Lookup role from config
    const config = window.inspectorsConfig || {};
    const userConfig = config[selectedUser];
    userAccessRights = (userConfig && userConfig.accessRights) ? userConfig.accessRights : 'Инспектор';

    showMainInterface();
    updateUIForRole();

    // Clear old data
    objectsData = [];
    if (objectManager) objectManager.removeAll();
    if (activeObjectsLayer) activeObjectsLayer.removeAll();

    loadData();
    showNotification(`✅ Добро пожаловать, ${currentUser} (${userAccessRights})`, 'success');
}


function logout() {
    clearSession();
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('adminSection').style.display = 'none';
    document.getElementById('workDaySection').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    showInspectorsHomes = false;
    if (inspectorsHomesLayer) inspectorsHomesLayer.removeAll();
    closeAllMenus();
    closeObjectDetails();
}

// 🔥 КАРТА И ДАННЫЕ
function initMap() {
    console.log('🟡 Yandex Maps ready');
    map = new ymaps.Map("map", {
        center: [55.7558, 37.6173],
        zoom: 10
    });

    objectManager = new ymaps.ObjectManager({
        clusterize: false,
        gridSize: 64
    });

    activeObjectsLayer = new ymaps.ObjectManager({
        clusterize: false,
        gridSize: 64
    });

    inspectorsHomesLayer = new ymaps.ObjectManager({
        clusterize: false,
        gridSize: 64
    });

    // 🔥 УСТАНАВЛИВАЕМ НАСТРОЙКИ БАЛЛУНОВ
    objectManager.objects.options.set({
        balloonMaxWidth: 300,
        balloonMinWidth: 250,
        balloonPanelMaxMapArea: 0,
        hasBalloon: false
    });

    activeObjectsLayer.objects.options.set({
        balloonMaxWidth: 300,
        balloonMinWidth: 250,
        balloonPanelMaxMapArea: 0,
        hasBalloon: false
    });

    objectManager.objects.events.add('click', function (e) {
        const objectId = e.get('objectId');
        showObjectBalloon(objectId);
    });

    activeObjectsLayer.objects.events.add('click', function (e) {
        const objectId = e.get('objectId');
        showObjectBalloon(objectId);
    });

    map.geoObjects.add(objectManager);
    map.geoObjects.add(activeObjectsLayer);
    map.geoObjects.add(inspectorsHomesLayer);

    // 🔥 ОБРАБОТЧИКИ ИЗМЕНЕНИЯ МАСШТАБА ДЛЯ АДАПТАЦИИ БАЛЛУНОВ
    map.events.add('boundschange', function () {
        const zoom = map.getZoom();
        updateBalloonSize(zoom);
    });

    // 🔥 DATA MIGHT BE LOADED BEFORE MAP, UPDATE NOW
    if (window.objectsData && window.objectsData.length > 0) {
        console.log('🟢 Map init finished, updating with existing data...');
        updateMapImmediate();
    }
}

// 🔥 ФУНКЦИЯ АДАПТАЦИИ РАЗМЕРА БАЛЛУНОВ ПОД МАСШТАБ
function updateBalloonSize(zoom) {
    let balloonWidth = 300;
    let balloonMinWidth = 250;

    if (zoom > 15) {
        balloonWidth = 280;
        balloonMinWidth = 230;
    } else if (zoom < 10) {
        balloonWidth = 320;
        balloonMinWidth = 270;
    }

    objectManager.objects.options.set({
        balloonMaxWidth: balloonWidth,
        balloonMinWidth: balloonMinWidth
    });

    activeObjectsLayer.objects.options.set({
        balloonMaxWidth: balloonWidth,
        balloonMinWidth: balloonMinWidth
    });
}

function loadData() {

    // 🔥 CACHE LOAD: Try to load immediately without blocking UI
    let cacheLoaded = false;
    try {
        const cached = localStorage.getItem('cached_objects_data');
        if (cached) {
            console.log('🟢 Found cached data, loading immediately...');
            const data = JSON.parse(cached);
            if (data && data.success && data.points) {
                cacheLoaded = true;
                processServerData(data, true); // true = fromCache

                if (window.objectsData && window.objectsData.length > 0) {
                    // We have data! Don't show blocking loader.
                    // Just show a small info toast
                    showNotification('🔄 Синхронизация с сервером...', 'info');
                }
            }
        }
    } catch (e) {
        console.error('❌ Error loading cache:', e);
    }

    // Only show blocking loader if we have NO data from cache
    if (!cacheLoaded) {
        showLoading('Загрузка данных...');
    }

    console.log('🟡 Загрузка данных с сервера...');

    const callbackName = 'jsonpCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const originalHandler = function (data) {
        console.log('🟡 Получены данные от сервера:', data);

        // 🔥 CRITICAL PROTECTION: Check for empty server response
        const serverHasData = data && data.points && data.points.length > 0;
        const appHasData = window.objectsData && window.objectsData.length > 0;

        if (serverHasData) {
            console.log('🔍 Keys in first object:', Object.keys(data.points[0]));

            // Valid data received - process it
            processServerData(data, false); // false = fromServer
            updateLocalCache();
            showNotification(`✅ Данные обновлены: ${objectsData.length} объектов`, 'success');

        } else {
            console.warn('⚠️ Server returned 0 points (or invalid)!');

            if (appHasData) {
                // We have cached data, but server returned nothing. 
                // IGNORE SERVER to protect our data.
                console.warn('🛡️ Protecting cached data from empty server response.');
                showNotification('⚠️ Сервер вернул пустой список. Оставлены сохраненные данные.', 'warning');
                // Do NOT call processServerData. Do NOT update cache with empty.
            } else {
                // We have no data AND server gave no data.
                // Try to process anyway to at least initialize empty state properly (clear loading, etc)
                processServerData(data, false);
                showNotification('⚠️ Нет данных для отображения', 'warning');
            }
        }

        delete window[callbackName];

        // Ensure loader is hidden (in case it was shown)
        hideLoading();
    };
    const path = '?action=getData&t=' + Date.now() + getExtraParams();

    // 🔥 FIX: Use FETCH if proxy is active to prevent spinning favicon
    if (SCRIPT_URL.includes('/exec')) {
        console.log('🚀 Loading data via FETCH (No Spinner)...');
        fetch(SCRIPT_URL + path, { cache: 'no-store' })
            .then(r => r.text())
            .then(text => {
                const data = parseServerResponse(text);
                if (!cacheLoaded) hideLoading();
                // We reuse the logic from processServerData directly
                processServerData(data);
            })
            .catch(e => {
                console.error('❌ Data fetch error:', e);
                if (!cacheLoaded) {
                    hideLoading();
                    showNotification('❌ Ошибка загрузки данных. Проверьте сеть.', 'error');
                }
            });
        return;
    }

    // Fallback JSONP
    window[callbackName] = originalHandler;
    const scriptPath = path + '&callback=' + callbackName;
    const url = SCRIPT_URL + scriptPath;
    console.log('🟡 Запрос к URL (JSONP):', url);
    const s1 = document.createElement('script');
    s1.src = url;

    // 🔥 TIMEOUT HANDLER (25 seconds)
    // We do NOT delete the callback here anymore. If the server responds late (e.g. 30s),
    // it will still find the function and run without crashing.
    const timeoutId = setTimeout(() => {
        if (window[callbackName]) {
            console.warn('⚠️ Server request timed out (25s) - Switch to background mode');
            // Unblock the user
            hideLoading();

            // 🔥 REMOVED DESTRUCTIVE ACTION
            // We just let the user continue. If data arrives later, good.
            showNotification('⚠️ Сервер отвечает медленно. Вы можете продолжать работу.', 'warning');

            // Do NOT delete window[callbackName]!
            // Do NOT remove child script (let it finish)!
        }
    }, 25000);

    s1.onerror = function () {
        clearTimeout(timeoutId);
        console.error('❌ Ошибка загрузки скрипта');

        // On real error (404/DNS), we can close it, but safer to just leave it or handle gracefully
        // delete window[callbackName]; 

        hideLoading();

        if (!window.objectsData || window.objectsData.length === 0) {
            showError('Ошибка загрузки данных. Проверьте подключение.');
        } else {
            console.warn('Server update failed, but cache is active.');
            showNotification('⚠️ Сервер недоступен, работаем с кэшом', 'warning');
        }
    };

    // Wrap to clear timeout
    const successWrapper = function (data) {
        clearTimeout(timeoutId);
        originalHandler(data);
    };
    window[callbackName] = successWrapper;

    document.head.appendChild(s1);
}



function processServerData(data, fromCache = false) {
    // 🔥 ВОЗВРАЩАЕМ ОРИГИНАЛЬНЫЕ ID (без преобразования в строки!)
    const normalizePoints = (arr) => {
        if (!Array.isArray(arr)) return [];

        // 🔥 Analyze first item to find correct keys ONCE
        if (arr.length > 0) {
            const firstSample = arr[0];
            const sampleKeys = Object.keys(firstSample || {});

            // Log keys for debugging
            console.log('🔍 Raw keys from server:', sampleKeys);

            // Helper to find key by regex
            const findKey = (regex) => sampleKeys.find(k => regex.test(k));

            // Find Entry/Exit keys globally for the dataset
            const entryKey = findKey(/вход|entry|время.*входа/i);
            const exitKey = findKey(/выход|exit|время.*выхода/i);

            console.log(`🔍 Detected columns - Entry: "${entryKey}", Exit: "${exitKey}"`);

            return arr.map((o) => {
                const keys = Object.keys(o || {});
                const lc = {};
                keys.forEach(k => { lc[k.trim().toLowerCase()] = o[k]; });

                const pick = (names, def) => {
                    for (let i = 0; i < names.length; i++) {
                        const v = lc[names[i]];
                        if (v !== undefined && v !== null && v !== '') return v;
                    }
                    return def;
                };

                const id = pick(['id', 'ид', '№', 'no', 'object_id']);
                const latitude = pick(['latitude', 'lat', 'широта']);
                const longitude = pick(['longitude', 'lon', 'lng', 'долгота']);
                const address = pick(['address', 'адрес']);
                const inspector = pick(['inspector', 'инспектор', 'ответственный'], 'Admin');
                const list = pick(['list', 'список', 'лист'], 'Без списка');

                // 🔥 Use detected keys or fallback to broad search
                let entryTime = entryKey ? o[entryKey] : undefined;
                let exitTime = exitKey ? o[exitKey] : undefined;

                // Extra check: if entryTime is undefined, try deep scan of current object keys just in case structure varies
                if (entryTime === undefined) {
                    const k = keys.find(key => /вход|entry|время.*входа/i.test(key) && !/выход|exit/i.test(key));
                    if (k) entryTime = o[k];
                }
                if (exitTime === undefined) {
                    const k = keys.find(key => /выход|exit|время.*выхода/i.test(key));
                    if (k) exitTime = o[k];
                }

                return { id, latitude, longitude, address, inspector, list, entryTime, exitTime };
            });
        } else {
            return [];
        }
    };
    objectsData = normalizePoints(data.points);
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENTRIES || 'active_entries');
        const map = raw ? JSON.parse(raw) : {};
        objectsData = objectsData.map(function (o) {
            const key = String(o.inspector || '') + ':' + String(o.id);
            if (map[key] && !o.exitTime) {
                o.entryTime = o.entryTime || new Date(map[key]).toISOString();
            }
            return o;
        });
    } catch (_) { }

    window.INSPECTORS_CONFIG = data.inspectorsConfig || {};
    window.ADDED_OBJECTS = data.addedObjects || []; // 🔥 Store added objects

    // 🔥 ОБНОВЛЯЕМ БЕЙДЖ ПОЛЬЗОВАТЕЛЯ ПОСЛЕ ЗАГРУЗКИ КОНФИГА
    updateSidebarUserInfo();
    // 🔥 REMOVED LOCAL CACHE OVERRIDE TO FORCE SERVER SYNC
    /*
    try {
        const rawCfg = localStorage.getItem(STORAGE_KEYS.INSPECTORS_CACHE);
        if (rawCfg) {
            const overrides = JSON.parse(rawCfg);
            Object.keys(overrides || {}).forEach(function (insp) {
                const cfg = overrides[insp];
                if (!window.INSPECTORS_CONFIG[insp]) window.INSPECTORS_CONFIG[insp] = {};
                ['color', 'icon', 'status', 'accessRights'].forEach(function (k) {
                    if (cfg && cfg[k] !== undefined && cfg[k] !== null && cfg[k] !== '') {
                        window.INSPECTORS_CONFIG[insp][k] = cfg[k];
                    }
                });
            });
        }
    } catch (_) { }
    */

    try {
        const transferred = applyInactiveInspectorTransfer();
        if (transferred > 0) {
            console.log('🔵 Перенесено объектов неактивных инспекторов → Admin:', transferred);
        }
    } catch (_) { }
    window.INSPECTOR_HOMES = data.inspectorsHomes || {};
    const extendedIcons = {
        '💎': 'Алмаз', '⭐': 'Звезда', '👑': 'Корона', '🌪️': 'Смерч', '🌀': 'Ураган',
        '🦍': 'Горилла', '🦸': 'Супермен', '🏅': 'Медаль', '🥷': 'Ниндзя', '🦾': 'Железная рука',
        '🧜‍♂️': 'Русал', '🦁': 'Лев', '🐯': 'Тигр', '⚡': 'Молния', '🔥': 'Огонь',
        '💥': 'Взрыв', '🤺': 'Борьба', '🥋': 'Кимоно', '💩': 'Какашка', '🐢': 'Черепаха',
        '🤡': 'Клоун', '🤮': 'Блюющий', '🦑': 'Кальмар', '🐙': 'Осьминог', '🦄': 'Единорог',
        '🌈': 'Радуга', '🤥': 'Врун', '🧟': 'Зомби', '👻': 'Призрак', '🐌': 'Улитка',
        '🦥': 'Ленивец', '🙈': 'Не вижу', '🙉': 'Не слышу', '🙊': 'Не говорю',
        '😁': 'Улыбка', '🥹': 'Слёзы', '🤣': 'Хохот', '🥲': 'Слеза', '😇': 'Ангел',
        '🙂': 'Улыбка', '😍': 'Влюблён', '🥰': 'Нежность', '😘': 'Поцелуй', '🤪': 'Сумасшедший',
        '🤨': 'Вопрос', '🧐': 'Лупа', '🤓': 'Умник', '😎': 'Очки', '🥸': 'Усы',
        '🤩': 'Восхищение', '🥳': 'Праздник', '🥺': 'Просьба', '😭': 'Плач', '😤': 'Злость',
        '😡': 'Гнев', '🤬': 'Мат', '🤯': 'Взрыв мозга', '🥶': 'Холод', '🥵': 'Жара',
        '🫣': 'Стеснение', '🤭': 'Ой', '🫡': 'Салют', '🫠': 'Растаял', '🤫': 'Тсс',
        '😐': 'Ровно', '🥱': 'Зевота', '😴': 'Сон', '🤤': 'Слюни', '😵': 'Ох',
        '😵‍💫': 'Головокружение', '🤐': 'Молчу', '🥴': 'Пьяный', '🤢': 'Тошнота', '😷': 'Маска',
        '🤒': 'Болеет', '🤕': 'Ранен', '🤑': 'Деньги', '🤠': 'Ковбой', '😈': 'Злой',
        '👿': 'Демон', '👹': 'Они', '👺': 'Тэнгу', '💀': 'Череп', '☠️': 'Кости',
        '👽': 'Иноплан', '🤖': 'Робот', '🎃': 'Тыква', '🫰': 'Щепотка', '🫶': 'Сердце',
        '🤞': 'Удача', '✌️': 'Мир', '👊': 'Кулак', '🤝': 'Рукопожатие', '🤌': 'Пинч',
        '🫵': 'Ты', '🫦': 'Губы', '🧠': 'Мозг', '👁️': 'Глаз', '🤴': 'Принц',
        '🦹‍♂️': 'Злодей', '🧞‍♂️': 'Джинн', '🧞': 'Джинн', '🧜': 'Русалка', '🙆‍♂️': 'Ок',
        '🤦‍♂️': 'Фейспалм', '🙋‍♂️': 'Рука', '🧖‍♂️': 'СПА', '🧑‍🦽': 'Коляска', '🧑‍🦼': 'Электроколяска',
        '⛑️': 'Каска', '🦺': 'Жилет', '🕶️': 'Очки', '🕷️': 'Паук', '🦂': 'Скорпион',
        '🦖': 'Динозавр', '🐡': 'Иглобрюх', '🐠': 'Рыба', '🐟': 'Рыба', '🐬': 'Дельфин',
        '🐳': 'Кит', '🐋': 'Кит', '🦈': 'Акула', '🦭': 'Тюлень', '🦧': 'Орангутан',
        '🪽': 'Крыло', '🦦': 'Выдра', '🌈': 'Радуга', '💫': 'Искра', '⭐': 'Звезда',
        '✨': 'Сияние', '⚡': 'Молния', '🍌': 'Банан', '🍑': 'Персик', '🌶️': 'Перчик',
        '🍓': 'Клубника', '🥥': 'Кокос', '🍭': 'Леденец', '🍬': 'Конфета', '🍫': 'Шоколад',
        '🥃': 'Виски', '🍺': 'Пиво', '🍻': 'Пиво', '🍷': 'Вино', '🍾': 'Шампанское',
        '🚀': 'Ракета', '💵': 'Доллары', '💸': 'Бумажки', '💰': 'Мешок', '💳': 'Карта',
        '💣': 'Бомба', '🧨': 'Фейерверк', '🔪': 'Нож', '🏴‍☠️': 'Пираты', '🇷🇺': 'Россия'
    };
    const extendedColors = [
        '#ff0000', '#ff7f00', '#ffff00', '#7fff00', '#00ff00', '#00ff7f', '#00ffff',
        '#007fff', '#0000ff', '#7f00ff', '#ff00ff', '#ff007f', '#8B0000', '#3498db',
        '#27ae60', '#e67e22', '#9b59b6', '#f1c40f', '#1abc9c', '#2c3e50', '#95a5a6',
        '#e74c3c', '#c0392b', '#d35400', '#f39c12', '#16a085', '#2ecc71', '#1abc9c',
        '#2980b9', '#34495e', '#7f8c8d', '#bdc3c7', '#8e44ad', '#6c5ce7', '#00cec9',
        '#fdcb6e', '#e17055', '#d63031', '#b2bec3', '#74b9ff', '#a29bfe', '#55efc4'
    ];
    availableIcons = Object.assign({}, extendedIcons, data.availableIcons || {});
    const serverColors = data.availableColors || [];
    const mergedColors = extendedColors.concat(serverColors);
    const uniq = {};
    mergedColors.forEach(function (c) { uniq[c] = true; });
    availableColors = Object.keys(uniq);

    console.log('✅ Загружено объектов:', objectsData.length);
    console.log('✅ Конфигурация инспекторов:', Object.keys(window.INSPECTORS_CONFIG).length);

    initInterface();
    initInterface();
    // 🔥 updateMap() будет вызван внутри initInterface() после загрузки фильтров
    // Не вызываем здесь, чтобы избежать двойного обновления

    if (!fromCache) {
        updateLocalCache();
        console.log('✅ Server data processed and cache updated');
    }
}

function forceRefreshData() {
    loadData();
}

function forceStyleRefresh() {
    try {
        const insp = getSelectedInspectors();
        const lists = getSelectedLists();
        document.querySelectorAll('#inspectorsList input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('#listsList input[type="checkbox"]').forEach(cb => cb.checked = false);
        insp.forEach(name => { const cb = document.getElementById('insp_' + encodeURIComponent(name)); if (cb) cb.checked = true; });
        lists.forEach(name => { const cb = document.getElementById('list_' + encodeURIComponent(name)); if (cb) cb.checked = true; });
        updateFilters();
        saveFilterState();
    } catch (_) { }
}

// 🔥 ФУНКЦИЯ ДЛЯ СЧЕТЧИКОВ СПИСКОВ
function calculateListStats() {
    const stats = {};
    const selectedInspectors = getSelectedInspectors(); // 🔥 Получаем выбранных инспекторов

    objectsData.forEach(obj => {
        // 🔥 УЧИТЫВАЕМ ТОЛЬКО ОБЪЕКТЫ ВЫБРАННЫХ ИНСПЕКТОРОВ
        if (selectedInspectors.length > 0 && !selectedInspectors.includes(obj.inspector)) {
            return; // Пропускаем объекты невыбранных инспекторов
        }

        if (!stats[obj.list]) {
            stats[obj.list] = {
                total: 0,
                completed: 0,
                active: 0
            };
        }

        stats[obj.list].total++;

        if (obj.exitTime && obj.exitTime !== '') {
            stats[obj.list].completed++;
        }
        if (obj.entryTime && !obj.exitTime) {
            stats[obj.list].active++;
        }
    });

    return stats;
}

function jsStringLiteral(str) {
    return "'" + String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + "'";
}

function initInterface() {
    if (window.isInterfaceInitialized) {
        console.log('♻️ Обновление интерфейса (новые данные)...');
    } else {
        console.log('🟡 ========== НАЧАЛО ИНИЦИАЛИЗАЦИИ ИНТЕРФЕЙСА ==========');
        window.isInterfaceInitialized = true;
    }

    // 🔥 FILTER LISTS FOR INSPECTORS
    let relevantObjects = objectsData;
    if (userAccessRights === 'Инспектор' && currentUser) {
        relevantObjects = objectsData.filter(obj => isSameInspector(obj.inspector, currentUser));
    }

    const uniqueLists = [...new Set(relevantObjects.map(obj => obj.list).filter(Boolean))].sort();
    const inspectorStats = calculateInspectorStats();
    const listStats = calculateListStats();

    const inspectorsList = document.getElementById('inspectorsList');
    inspectorsList.innerHTML = '';

    // 🔥 СКРЫВАЕМ ФИЛЬТР ИНСПЕКТОРОВ ДЛЯ ИНСПЕКТОРОВ
    const searchInspectorsInput = document.getElementById('searchInspectors');
    if (searchInspectorsInput) {
        const filterSection = searchInspectorsInput.closest('.filter-section');
        if (filterSection) {
            if (userAccessRights === 'Инспектор') {
                filterSection.style.display = 'none';
            } else {
                filterSection.style.display = 'block';
            }
        }
    }

    // 🔥 ВКЛЮЧАЕМ ADMIN ТОЛЬКО ДЛЯ ИМПЕРАТОРА
    let allSystemInspectors = Object.keys(window.INSPECTORS_CONFIG || {}).filter(inspector =>
        inspector !== 'Юсупов Артур Русланович'
    );

    // 🔥 ЕСЛИ ПОЛЬЗОВАТЕЛЬ НЕ ИМПЕРАТОР - ИСКЛЮЧАЕМ ADMIN ИЗ ФИЛЬТРОВ
    if (userAccessRights !== 'Император') {
        allSystemInspectors = allSystemInspectors.filter(inspector => inspector !== 'Admin');
    }

    allSystemInspectors.forEach(inspector => {
        const style = getInspectorStyle(inspector);
        const stats = inspectorStats[inspector] || { total: 0, completed: 0, active: 0 };

        const hasAccessToObjects = (userAccessRights === 'Император' ||
            userAccessRights === 'Администратор' ||
            !currentUser ||
            isSameInspector(inspector, currentUser) ||
            hasFilterAccessToInspector(inspector));

        if (hasAccessToObjects) {
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox-item';

            checkbox.innerHTML = `
                <input type="checkbox" id="insp_${encodeURIComponent(inspector)}" onchange="onInspectorChange()" 
                       ${isSameInspector(inspector, currentUser) ? 'checked' : ''}>
                <span class="inspector-icon">${style.icon}</span>
                <span class="color-dot" style="background-color: ${style.color}"></span>
                <label for="insp_${encodeURIComponent(inspector)}">
                    ${inspector}
                </label>
                <span class="inspector-counter ${inspector === 'Admin' ? 'admin' : ''} 
                      ${style.status !== 'active' ? 'inactive' : ''}">
                    ${stats.completed}/${stats.total}
                </span>
            `;
            inspectorsList.appendChild(checkbox);
        }
    });

    const listsList = document.getElementById('listsList');
    listsList.innerHTML = '';

    uniqueLists.forEach(list => {
        const stats = listStats[list] || { total: 0, completed: 0, active: 0 };
        const checkbox = document.createElement('div');
        checkbox.className = 'checkbox-item';
        checkbox.innerHTML = `
            <input type="checkbox" id="list_${encodeURIComponent(list)}" onchange="onListChange()" checked>
            <label for="list_${encodeURIComponent(list)}">
                ${list} 
                <span class="list-counter">(${stats.completed}/${stats.total})</span>
            </label>
        `;
        listsList.appendChild(checkbox);
    });

    setTimeout(() => {
        updateInspectorCounters();

        // 🔥 ЗАГРУЗКА СОХРАНЕННЫХ ФИЛЬТРОВ ИЛИ УСТАНОВКА ПО УМОЛЧАНИЮ
        const filtersLoaded = loadFilterState();
        if (!filtersLoaded) {
            resetFiltersToDefault(); // если нет сохраненных - ставим по умолчанию
        }

        // 🔥 Обновляем карту только один раз после загрузки фильтров
        updateFilters();
    }, 100);
}

function getInspectorStyle(inspector) {
    if (!inspector) {
        return {
            color: '#808080',
            icon: '👨‍💼',
            status: 'active',
            accessRights: 'Инспектор'
        };
    }

    const config = window.INSPECTORS_CONFIG ? window.INSPECTORS_CONFIG[inspector] : null;
    if (config) {
        // console.log(`🎨 Style for ${inspector}:`, config); // Too noisy
        return {
            color: config.color || '#808080',
            icon: config.icon || '👨‍💼',
            status: config.status || 'active',
            accessRights: config.accessRights || 'Инспектор'
        };
    }

    return {
        color: '#808080',
        icon: '👨‍💼',
        status: 'active',
        accessRights: 'Инспектор'
    };
}

function calculateInspectorStats(selectedLists = null) {
    const stats = {};

    objectsData.forEach(obj => {
        if (selectedLists && selectedLists.length > 0 && !selectedLists.includes(obj.list)) {
            return;
        }

        if (!stats[obj.inspector]) {
            stats[obj.inspector] = {
                total: 0,
                completed: 0,
                active: 0
            };
        }

        stats[obj.inspector].total++;

        if (obj.exitTime && obj.exitTime !== '') {
            stats[obj.inspector].completed++;
        }
        if (obj.entryTime && !obj.exitTime) {
            stats[obj.inspector].active++;
        }
    });

    return stats;
}

function hasFilterAccessToInspector() {
    return (userAccessRights === 'Император' || userAccessRights === 'Администратор');
}

function isSameInspector(objInspector, userInspector) {
    if (!objInspector || !userInspector) return false;
    return objInspector.toLowerCase().trim() === userInspector.toLowerCase().trim();
}

function updateInspectorCounters() {
    const selectedLists = getSelectedLists();
    const inspectorStats = calculateInspectorStats(selectedLists.length > 0 ? selectedLists : null);

    const inspectorCheckboxes = document.querySelectorAll('#inspectorsList input[type="checkbox"]');
    inspectorCheckboxes.forEach(checkbox => {
        const inspector = decodeURIComponent(checkbox.id.replace('insp_', ''));
        const stats = inspectorStats[inspector] || { total: 0, completed: 0, active: 0 };
        const counterElement = checkbox.parentNode.querySelector('.inspector-counter');

        if (counterElement) {
            counterElement.textContent = `${stats.completed}/${stats.total}`;
            if (stats.completed === stats.total && stats.total > 0) {
                counterElement.classList.add('completed');
            } else {
                counterElement.classList.remove('completed');
            }
        }
    });
}

// 🔥 ДОБАВЛЯЕМ ФУНКЦИЮ ОБНОВЛЕНИЯ СЧЕТЧИКОВ СПИСКОВ
function updateListCounters() {
    const listStats = calculateListStats(); // 🔥 Теперь учитывает выбранных инспекторов
    const listCheckboxes = document.querySelectorAll('#listsList input[type="checkbox"]');

    listCheckboxes.forEach(checkbox => {
        const list = checkbox.id.replace('list_', '');
        const stats = listStats[list] || { total: 0, completed: 0, active: 0 };
        const counterElement = checkbox.parentNode.querySelector('.list-counter');

        if (counterElement) {
            counterElement.textContent = `${stats.completed}/${stats.total}`;
        }
    });
}



// 🔥 ФИЛЬТРАЦИЯ И КАРТА
function getSelectedInspectors() {
    const selected = [];
    const checkboxes = document.querySelectorAll('#inspectorsList input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        selected.push(decodeURIComponent(checkbox.id.replace('insp_', '')));
    });
    return selected;
}

function getSelectedLists() {
    const selected = [];
    const checkboxes = document.querySelectorAll('#listsList input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        selected.push(decodeURIComponent(checkbox.id.replace('list_', '')));
    });
    return selected;
}

function getFilteredObjects() {
    let selectedInspectors = getSelectedInspectors();
    const effectiveLists = getSelectedLists();
    const showHidden = document.getElementById('showHidden').checked;
    const searchText = document.getElementById('searchInput').value.toLowerCase();

    if (userAccessRights === 'Император' || userAccessRights === 'Администратор') {
        return objectsData.filter(obj => {
            if (selectedInspectors.length === 0) return false;
            if (effectiveLists.length === 0) return false;
            if (!effectiveLists.includes(obj.list)) return false;
            if (!selectedInspectors.includes(obj.inspector)) return false;
            if (searchText && !obj.id.toString().toLowerCase().includes(searchText) && !obj.address.toLowerCase().includes(searchText)) return false;
            const isCompleted = !!obj.exitTime;
            if (!showHidden && isCompleted) return false;
            return true;
        });
    }

    return objectsData.filter(obj => {
        if (selectedInspectors.length === 0) return false;
        if (!selectedInspectors.includes(obj.inspector)) return false;
        if (effectiveLists.length === 0) return false;
        if (!effectiveLists.includes(obj.list)) return false;
        const hasAccessToObject = userAccessRights === 'Император' || userAccessRights === 'Администратор' || isSameInspector(obj.inspector, currentUser) || hasFilterAccessToInspector(obj.inspector);
        if (!hasAccessToObject) return false;
        const isCompleted = !!obj.exitTime;
        if (!showHidden && isCompleted) return false;
        return true;
    });
}

function updateMap() {
    // 🔥 Debounce: отменяем предыдущий вызов если он еще не выполнился
    if (updateMapTimeout) {
        clearTimeout(updateMapTimeout);
    }

    // 🔥 Если карта уже обновляется, откладываем следующий вызов
    if (isMapUpdating) {
        updateMapTimeout = setTimeout(() => updateMap(), 100);
        return;
    }

    updateMapTimeout = setTimeout(() => {
        updateMapImmediate();
    }, 50); // Небольшая задержка для батчинга множественных вызовов
}

function updateMapImmediate() {
    if (objectsData.length === 0) {
        console.log('❌ Нет данных для отображения на карте');
        return;
    }

    if (isMapUpdating) {
        return; // Предотвращаем параллельные обновления
    }

    // 🔥 Guard: Ensure map is initialized
    if (!objectManager || !activeObjectsLayer) {
        console.warn('⚠️ Map not initialized yet, skipping update');
        return;
    }

    isMapUpdating = true;

    try {
        const filteredObjects = getFilteredObjects();
        console.log('🟡 Обновление карты с', filteredObjects.length, 'объектами');

        objectManager.removeAll();
        activeObjectsLayer.removeAll();

        const newObjects = filteredObjects.filter(obj => {
            const isNew = !obj.entryTime && !obj.exitTime;
            return isNew;
        });

        const activeObjects = filteredObjects.filter(obj => {
            const isActive = obj.entryTime && !obj.exitTime;
            return isActive;
        });

        const completedObjects = filteredObjects.filter(obj => {
            const isCompleted = !!obj.exitTime;
            return isCompleted && document.getElementById('showHidden').checked;
        });

        console.log('🟡 Статусы объектов после фильтрации:', {
            new: newObjects.length,
            active: activeObjects.length,
            completed: completedObjects.length,
            total: filteredObjects.length
        });

        // Новые точки
        const newFeatures = newObjects
            .filter(obj => isFinite(parseFloat(obj.latitude)) && isFinite(parseFloat(obj.longitude)))
            .map(obj => {
                const style = getInspectorStyle(obj.inspector);
                // console.log(`🎨 Map style for ${obj.inspector}:`, style.color); // Debug log
                const isImperial = obj.inspector === 'Admin' ||
                    (window.INSPECTORS_CONFIG[obj.inspector] &&
                        window.INSPECTORS_CONFIG[obj.inspector].accessRights === 'Император');
                const markerType = isImperial ? 'islands#blueStarIcon' : 'islands#dotIcon';

                return {
                    type: 'Feature',
                    id: obj.id,
                    geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(obj.latitude), parseFloat(obj.longitude)]
                    },
                    properties: {
                        hintContent: `🟡 Точка №${obj.id} (${obj.list || 'Без списка'})`,
                        balloonContent: getBalloonContent(obj, style.icon),
                        inspector: obj.inspector,
                        list: obj.list,
                        address: obj.address,
                        checklistLink: obj.checklistLink,
                        yandexDiskLink: obj.yandexDiskLink
                    },
                    options: {
                        preset: markerType,
                        iconColor: (obj.inspector === 'Admin') ? style.color : (style.status === 'active' ? style.color : '#808080'),
                        iconSize: [30, 30]
                    }
                };
            });

        // Активные точки
        const activeFeatures = activeObjects
            .filter(obj => isFinite(parseFloat(obj.latitude)) && isFinite(parseFloat(obj.longitude)))
            .map(obj => {
                const style = getInspectorStyle(obj.inspector);

                return {
                    type: 'Feature',
                    id: obj.id,
                    geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(obj.latitude), parseFloat(obj.longitude)]
                    },
                    properties: {
                        hintContent: `🔵 АКТИВНА Точка №${obj.id} (${obj.list || 'Без списка'})`,
                        balloonContent: getBalloonContent(obj, style.icon),
                        inspector: obj.inspector,
                        list: obj.list,
                        address: obj.address,
                        checklistLink: obj.checklistLink,
                        yandexDiskLink: obj.yandexDiskLink
                    },
                    options: {
                        preset: 'islands#circleIcon',
                        iconColor: style.color,
                        iconSize: [50, 50]
                    }
                };
            });

        // Выполненные точки
        const completedFeatures = completedObjects
            .filter(obj => isFinite(parseFloat(obj.latitude)) && isFinite(parseFloat(obj.longitude)))
            .map(obj => {
                const style = getInspectorStyle(obj.inspector);

                return {
                    type: 'Feature',
                    id: obj.id,
                    geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(obj.latitude), parseFloat(obj.longitude)]
                    },
                    properties: {
                        hintContent: `✅ ВЫПОЛНЕНА Точка №${obj.id} (${obj.list || 'Без списка'})`,
                        balloonContent: getBalloonContent(obj, style.icon),
                        inspector: obj.inspector,
                        list: obj.list,
                        address: obj.address,
                        checklistLink: obj.checklistLink,
                        yandexDiskLink: obj.yandexDiskLink
                    },
                    options: {
                        preset: 'islands#blueMedicalIcon',
                        iconColor: style.color,
                        iconSize: [30, 30]
                    }
                };
            });

        if (newFeatures.length > 0 || completedFeatures.length > 0) {
            objectManager.add({
                type: 'FeatureCollection',
                features: [...newFeatures, ...completedFeatures]
            });
        }

        if (activeFeatures.length > 0) {
            activeObjectsLayer.add({
                type: 'FeatureCollection',
                features: activeFeatures
            });
        }

        updateStats(filteredObjects);
        updateInspectorCounters();

        if (document.getElementById('objects-tab').classList.contains('active')) {
            updateObjectsList();
        }
    } finally {
        isMapUpdating = false;
    }
}

function refreshPointSummaries() {
    const filteredObjects = getFilteredObjects();
    updateStats(filteredObjects);
    updateInspectorCounters();
    if (document.getElementById('objects-tab').classList.contains('active')) {
        updateObjectsList();
    }
}

// 🔥 УЛУЧШЕННОЕ ТОЧЕЧНОЕ ОБНОВЛЕНИЕ КАРТЫ - ИСПРАВЛЕННАЯ ВЕРСИЯ
function updateSinglePointOnMap(objectId, newStatus) {
    const object = objectsData.find(obj => obj.id == objectId); // 🔥 ИСПРАВЛЕНО: == вместо ===
    if (!object) return;

    // 🔥 PREVENT CRASH: Check if map is initialized
    if (!objectManager || !activeObjectsLayer) {
        console.warn('⚠️ Map not initialized yet, skipping single point update');
        return;
    }

    console.log(`🔄 Точечное обновление точки ${objectId} -> ${newStatus}`);

    // 🔥 УДАЛЯЕМ ИЗ ВСЕХ СЛОЕВ СРАЗУ
    try { objectManager.remove([objectId]); } catch (_) { }
    try { objectManager.remove([String(objectId)]); } catch (_) { }
    try { activeObjectsLayer.remove([objectId]); } catch (_) { }
    try { activeObjectsLayer.remove([String(objectId)]); } catch (_) { }

    const style = getInspectorStyle(object.inspector);

    // Determine target layer and marker type
    let targetLayer = objectManager;
    let preset = 'islands#dotIcon';

    if (newStatus === 'active') {
        targetLayer = activeObjectsLayer;
        preset = 'islands#circleIcon';
    } else if (newStatus === 'completed') {
        preset = 'islands#blueMedicalIcon'; // Dot with plus

        // 🔥 Remove after 5 seconds
        setTimeout(() => {
            console.log(`⏳ Removing completed object ${objectId} after 5s`);
            try { objectManager.remove([objectId]); } catch (_) { }
            try { objectManager.remove([String(objectId)]); } catch (_) { }
            try { activeObjectsLayer.remove([objectId]); } catch (_) { }
            try { activeObjectsLayer.remove([String(objectId)]); } catch (_) { }

            // Also refresh stats to reflect completion
            refreshPointSummaries();
        }, 5000);

    } else {
        // new
        const isImperial = object.inspector === 'Admin' ||
            (window.INSPECTORS_CONFIG[object.inspector] &&
                window.INSPECTORS_CONFIG[object.inspector].accessRights === 'Император');
        preset = isImperial ? 'islands#blueStarIcon' : 'islands#dotIcon';
        console.log(`👑 Imperial check for ${object.inspector}: ${isImperial} (Preset: ${preset})`);
    }

    // Check if object exists in the target layer
    const existingObject = targetLayer.objects.getById(objectId);

    if (existingObject) {
        console.log(`✨ Updating existing object ${objectId} in place`);
        targetLayer.objects.setObjectOptions(objectId, {
            preset: preset,
            iconColor: style.color,
            iconSize: newStatus === 'active' ? [50, 50] : [30, 30]
        });
        targetLayer.objects.setObjectProperties(objectId, {
            hintContent: getHintContent(object, newStatus),
            balloonContent: getBalloonContent(object, style.icon),
            inspector: object.inspector,
            list: object.list,
            address: object.address,
            checklistLink: object.checklistLink,
            yandexDiskLink: object.yandexDiskLink
        });
    } else {
        console.log(`✨ Re-creating object ${objectId} (Layer switch or new)`);

        // 🔥 Remove from ALL layers first to be safe (Handle both Number and String IDs)
        // IMPORTANT: objectManager.remove expects an ARRAY of IDs or a JSON object
        try { objectManager.remove([objectId]); } catch (_) { }
        try { objectManager.remove([String(objectId)]); } catch (_) { }
        try { activeObjectsLayer.remove([objectId]); } catch (_) { }
        try { activeObjectsLayer.remove([String(objectId)]); } catch (_) { }

        // 🔥 Small delay to ensure removal is processed by Map API
        setTimeout(() => {
            const feature = {
                type: 'Feature',
                id: object.id,
                geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(object.latitude), parseFloat(object.longitude)]
                },
                properties: {
                    hintContent: getHintContent(object, newStatus),
                    balloonContent: getBalloonContent(object, style.icon),
                    inspector: object.inspector,
                    list: object.list,
                    address: object.address,
                    checklistLink: object.checklistLink,
                    yandexDiskLink: object.yandexDiskLink
                },
                options: {
                    preset: preset,
                    iconColor: style.color,
                    iconSize: newStatus === 'active' ? [50, 50] : [30, 30]
                }
            };
            targetLayer.add({ type: 'FeatureCollection', features: [feature] });

            console.log('✅ Точечное обновление завершено (Re-created):', objectId, newStatus);

            // 🔥 ОБНОВЛЯЕМ БАЛЛУН ЕСЛИ ОН ОТКРЫТ
            refreshPointSummaries();

            if (currentDetailsObjectId == objectId) {
                renderObjectDetails(object);
            }
        }, 50);

        return; // Exit early as we handle the rest in timeout
    }

    console.log('✅ Точечное обновление завершено (In-place):', objectId, newStatus, style.color);

    // 🔥 ОБНОВЛЯЕМ БАЛЛУН ЕСЛИ ОН ОТКРЫТ
    refreshPointSummaries();

    if (currentDetailsObjectId == objectId) {
        renderObjectDetails(object);
    }
}

function getHintContent(object, status) {
    if (status === 'active') return `🔵 АКТИВНА Точка №${object.id} (${object.list || 'Без списка'})`;
    if (status === 'completed') return `✅ ВЫПОЛНЕНА Точка №${object.id} (${object.list || 'Без списка'})`;
    return `🟡 Точка №${object.id} (${object.list || 'Без списка'})`;
}

function showObjectBalloon(objectId) {
    const object = objectsData.find(obj => obj.id == objectId);
    if (!object) return;

    openObjectDetails(objectId);

    if (map && object.latitude && object.longitude) {
        map.setCenter([parseFloat(object.latitude), parseFloat(object.longitude)], map.getZoom());
    }
}



function getBalloonContent(obj, icon) {
    const isNew = !obj.entryTime && !obj.exitTime;
    const isActive = obj.entryTime && !obj.exitTime;
    const isCompleted = !!obj.exitTime;
    const coordinates = `${obj.latitude}, ${obj.longitude}`;

    let badgeClass = 'object-card__badge object-card__badge--new';
    let badgeText = 'Новая';

    if (isActive) {
        badgeClass = 'object-card__badge object-card__badge--active';
        badgeText = 'В работе';
    } else if (isCompleted) {
        badgeClass = 'object-card__badge object-card__badge--completed';
        badgeText = 'Выполнена';
    }

    const actionButtons = [
        `<button class="object-card__button object-card__button--primary" onclick="copyCoordinates('${coordinates}')">📍 Координаты</button>`
    ];

    actionButtons.push(`<button class="object-card__button object-card__button--primary" onclick="toggleChecklistForm(${jsStringLiteral(obj.id)})">📋 Чек-лист</button>`);

    actionButtons.push(`<button class="object-card__button object-card__button--primary" onclick="toggleDashboard(${jsStringLiteral(obj.id)})">📷 Фотоотчет</button>`);

    // Only show "Create Dashboard" button for Emperor/Administrator
    const canCreateDashboard = (userAccessRights === 'Император' || userAccessRights === 'Администратор');
    const collectDashboardBtn = canCreateDashboard
        ? `<button class="object-card__button object-card__button--primary" onclick="openDashboardsAppFor(${jsStringLiteral(obj.id)})">🚀 Создать дашборд</button>`
        : '';

    const canMarkEntryExit = (userAccessRights === 'Император' || userAccessRights === 'Администратор') ||
        isSameInspector(obj.inspector, currentUser);

    const entryButtons = [];
    let notices = '';

    if (!isCompleted) {
        if (isNew && canMarkEntryExit) {
            const entryCheck = (userAccessRights === 'Инспектор')
                ? canInspectorEnterObject(currentUser, obj.id)
                : { canEnter: true };

            if (entryCheck.canEnter) {
                actionButtons.push(`<button class="object-card__button object-card__button--primary" onclick="markEntry(${jsStringLiteral(obj.id)})">🚪 Вход</button>`);
            } else {
                entryButtons.push(`<button class="object-card__button object-card__button--primary" disabled>🚪 Вход</button>`);
                notices += `<div class="object-card__notice object-card__notice--warning">${entryCheck.message}</div>`;

                if (entryCheck.activeObjectId) {
                    const activeObj = objectsData.find(o => o.id == entryCheck.activeObjectId);
                    if (activeObj) {
                        notices += `<button class="object-card__link" onclick="map.setCenter([${activeObj.latitude}, ${activeObj.longitude}], 17); openObjectDetails(${jsStringLiteral(activeObj.id)});">📍 Перейти к активному объекту ${entryCheck.activeObjectId}</button>`;
                    }
                }
            }
        } else if (isActive && canMarkEntryExit) {
            entryButtons.push(`<button class="object-card__button object-card__button--danger" onclick="markExit(${jsStringLiteral(obj.id)})">🚪 Выход</button>`);

            if (userAccessRights === 'Император' || userAccessRights === 'Администратор') {
                entryButtons.push(`<button class="object-card__button object-card__button--danger" onclick="cancelEntry(${jsStringLiteral(obj.id)})">❌ Отменить вход</button>`);
            }
        } else if (!canMarkEntryExit) {
            notices += `<div class="object-card__notice object-card__notice--info">⚠️ Доступно только инспектору: ${obj.inspector}</div>`;
        }
    } else {
        notices += `<div class="object-card__notice object-card__notice--muted">🚫 Действия недоступны</div>`;
    }

    const reassignSelect = ((userAccessRights === 'Император' || userAccessRights === 'Администратор') && !isCompleted) ? `
                <div class="object-card__section object-card__section--reassign">
                    <label class="object-card__label">Переназначить инспектора</label>
                    <select class="object-card__select" onchange="reassignInspector(${jsStringLiteral(obj.id)}, this.value)">
                        <option value="">-- Выберите инспектора --</option>
                        ${Object.keys(window.INSPECTOR_HOMES || {}).map(inspector => {
        const style = getInspectorStyle(inspector);
        const statusText = style.status !== 'active' ? ` (${getStatusText(style.status)})` : '';
        const isCurrent = obj.inspector === inspector;
        const disabled = style.status !== 'active' ? 'disabled' : '';
        return `<option value="${inspector}" ${isCurrent ? 'selected' : ''} ${disabled}>
                                ${style.icon} ${inspector}${statusText} ${isCurrent ? ' ← текущий' : ''}
                            </option>`;
    }).join('')}
                    </select>
                </div>
            ` : '';

    const inspectorDisplay = obj.inspector || 'Не назначен';

    return `
                <div class="object-card">
                    <div class="object-card__header">
                        <div class="object-card__title">
                            <span class="object-card__emoji">${icon || '📍'}</span>
                            <div>
                                <div class="object-card__name">Точка №${obj.id}</div>
                                <div class="object-card__meta">${obj.list || 'Без списка'}</div>
                            </div>
                        </div>
                        <span class="${badgeClass}">${badgeText}</span>
                    </div>

                    <div class="object-card__info">
                        <div class="object-card__row">
                            <span class="object-card__label">Адрес</span>
                            <span class="object-card__value">${obj.address || '—'}</span>
                        </div>
                        <div class="object-card__row">
                            <span class="object-card__label">Инспектор</span>
                            <span class="object-card__value">${inspectorDisplay}</span>
                        </div>
                    </div>

                    ${actionButtons.length ? `<div class="object-card__actions">${actionButtons.join('')}</div>` : ''}
                    ${collectDashboardBtn ? `<div class="object-card__actions">${collectDashboardBtn}</div>` : ''}
                    ${entryButtons.length ? `<div class="object-card__actions">${entryButtons.join('')}</div>` : ''}
                    ${notices}
                    ${reassignSelect}
                </div>
            `;
}

function renderObjectDetails(object) {
    const content = document.getElementById('objectDetailsContent');
    if (!content) return;

    const style = getInspectorStyle(object.inspector);
    content.innerHTML = getBalloonContent(object, style.icon);
    const holder = document.createElement('div');
    holder.id = 'checklistFormContainer';
    holder.style.display = 'none'; // 🔥 Hide by default to fix toggle logic
    content.appendChild(holder);
    const uploader = document.createElement('div');
    uploader.id = 'photoUploaderContainer';
    uploader.style.display = 'none'; // 🔥 Hide by default
    content.appendChild(uploader);
}

function openObjectDetails(objectId) {
    const object = objectsData.find(obj => obj.id == objectId);
    const overlay = document.getElementById('objectDetailsOverlay');
    if (!object || !overlay) return;

    currentDetailsObjectId = objectId;
    renderObjectDetails(object);

    overlay.classList.add('object-details--visible');
    overlay.classList.remove('hidden');
    document.body.classList.add('object-details-open');

    // Swipe handler for balloon
    const card = overlay.querySelector('.object-details__card');
    if (card && !card.hasAttribute('data-swipe-enabled')) {
        card.setAttribute('data-swipe-enabled', 'true');
        let startY = 0, currentY = 0, isDragging = false;
        const handleTouchStart = (e) => {
            const rect = card.getBoundingClientRect();
            if (e.touches[0].clientY - rect.top > 60) return;
            startY = e.touches[0].clientY; isDragging = true;
            card.classList.add('swiping'); card.style.willChange = 'transform, opacity';
        };
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY; const deltaY = currentY - startY;
            if (deltaY > 0) requestAnimationFrame(() => {
                card.style.transform = `translateY(${deltaY}px)`;
                card.style.opacity = Math.max(0.3, 1 - deltaY / 300);
            });
        };
        const handleTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false; card.classList.remove('swiping'); card.style.willChange = 'auto';
            const deltaY = currentY - startY;
            if (deltaY > 100) {
                card.classList.add('dismissing');
                setTimeout(() => {
                    closeObjectDetails(); card.classList.remove('dismissing');
                    card.style.transform = ''; card.style.opacity = '';
                }, 400);
            } else {
                card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease';
                card.style.transform = ''; card.style.opacity = '';
                setTimeout(() => card.style.transition = '', 300);
            }
        };
        card.addEventListener('touchstart', handleTouchStart, { passive: true });
        card.addEventListener('touchmove', handleTouchMove, { passive: false });
        card.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
}

function closeObjectDetails() {
    const overlay = document.getElementById('objectDetailsOverlay');
    if (!overlay) return;

    overlay.classList.remove('object-details--visible');
    overlay.classList.add('hidden');
    document.body.classList.remove('object-details-open');
    currentDetailsObjectId = null;
}


// OLD openChecklistForm deleted - see NEW_openChecklistForm.js



function toggleChecklistForm(objectId) {
    const overlay = document.getElementById('objectDetailsOverlay');
    const isVisible = overlay && overlay.classList.contains('object-details--visible') && !overlay.classList.contains('hidden');
    if (isVisible && String(currentDetailsObjectId) === String(objectId)) {
        const target = document.getElementById('checklistFormContainer');
        if (!target) return;
        if (target.style.display === 'none') {
            target.style.display = '';
            if (!target.innerHTML || target.innerHTML.trim() === '') {
                openChecklistForm(objectId);
            }
        } else {
            target.style.display = 'none';
        }
    } else {
        openObjectDetails(objectId);
        openChecklistForm(objectId);
        const target = document.getElementById('checklistFormContainer');
        if (target) target.style.display = '';
    }
}

function submitChecklist(payload) {
    try {
        const btn = document.getElementById('cl_submit');
        if (btn) { btn.disabled = true; btn.textContent = 'Сохранение...'; btn.style.opacity = '0.7'; }
        window.__CL_QUEUE = window.__CL_QUEUE || {};
        window.__CL_TIMER = window.__CL_TIMER || {};
        const oid = String(payload.object_id || '');
        const dateStr = String(payload.monitoring_date || '');
        if (!oid || !dateStr) return;
        const key = oid + '|' + dateStr;
        const prev = window.__CL_QUEUE[key] || {};
        const merged = Object.assign({}, prev, payload);
        window.__CL_QUEUE[key] = merged;
        if (window.__CL_TIMER[key]) clearTimeout(window.__CL_TIMER[key]);
        window.__CL_TIMER[key] = setTimeout(function () {
            fetch(REPORTS_URL + ('?action=saveChecklist' + getExtraParams()), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(window.__CL_QUEUE[key]), mode: 'cors' })
                .then(function (r) { return r.text(); }).then(function (t) {
                    var res; try { res = JSON.parse(t); } catch (_) { res = { success: false }; }
                    if (res && res.success) { showNotification('✅ Мониторинг сохранен', 'success'); try { if (oid) { markCompletion(oid, 'checklist'); maybeAutoDashboard(oid); } } catch (_) { } if (btn) { btn.textContent = 'Сохранено'; setTimeout(function () { btn.textContent = 'Завершить мониторинг'; btn.disabled = false; btn.style.opacity = '1'; }, 1500); } }
                    else { var msg = (res && res.message) ? String(res.message) : ''; showNotification('❌ Ошибка сохранения' + (msg ? ': ' + msg : ''), 'error'); if (btn) { btn.textContent = 'Завершить мониторинг'; btn.disabled = false; btn.style.opacity = '1'; } }
                }).catch(function () { showNotification('❌ Ошибка сети', 'error'); if (btn) { btn.textContent = 'Завершить мониторинг'; btn.disabled = false; btn.style.opacity = '1'; } });
        }, 800);
    } catch (e) {
        showNotification('❌ Ошибка', 'error');
        const btn = document.getElementById('cl_submit');
        if (btn) { btn.textContent = 'Завершить мониторинг'; btn.disabled = false; btn.style.opacity = '1'; }
    }
}

// 🔥 OPEN PHOTO UPLOADER (Refactored for Dropdown + New Categories)
function openGeneralPhotoUploader(objectId) {
    const object = objectsData.find(obj => obj.id == objectId);
    const container = document.getElementById('objectDetailsContent');
    if (!object || !container) return;
    const target = document.getElementById('photoUploaderContainer');
    if (!target) return;

    target.innerHTML = `
            <div class="ph-container">
                <style>
                    .ph-header { margin-bottom: 20px; text-align: center; }
                    
                    /* 🔥 NEW: Smooth Dropdown Animation (like work day toggle) */
                    .ph-custom-select-wrapper { 
                        position: relative; width: 100%; max-width: 100%; margin: 0 auto; 
                        text-align: left; user-select: none; 
                    }
                    .ph-custom-select-trigger {
                        display: flex; justify-content: space-between; align-items: center;
                        width: 100%; padding: 14px 16px; font-size: 16px;
                        border: 2px solid #667eea; border-radius: 10px; background: transparent;
                        color: #667eea; font-weight: 600;
                        cursor: pointer; box-sizing: border-box;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: none;
                    }
                    .ph-custom-select-trigger.placeholder {
                        color: #95a5a6;
                        font-weight: 500;
                    }
                    .ph-custom-select-trigger:hover { 
                        border-color: #764ba2;
                        color: #764ba2;
                        background: rgba(102, 126, 234, 0.05);
                    }
                    .ph-custom-select-trigger.placeholder:hover {
                        color: #7f8c8d;
                    }
                    .ph-custom-select-trigger::after { 
                        content: '▼'; font-size: 12px; margin-left: 10px; 
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .ph-custom-select-wrapper.open .ph-custom-select-trigger::after {
                        transform: rotate(180deg);
                    }
                    
                    .ph-custom-options {
                        position: absolute; top: calc(100% + 8px); left: 0; right: 0;
                        background: white; border: 2px solid #667eea;
                        border-radius: 10px; z-index: 999;
                        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.25);
                        max-height: 0; overflow: hidden;
                        opacity: 0;
                        transform: translateY(-10px);
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .ph-custom-select-wrapper.open .ph-custom-options {
                        max-height: 400px;
                        opacity: 1;
                        transform: translateY(0);
                        overflow-y: auto;
                    }
                    
                    .ph-custom-option {
                        padding: 14px 16px; cursor: pointer; 
                        border-bottom: 1px solid #f0f0f0;
                        white-space: normal; line-height: 1.5; color: #333;
                        transition: all 0.25s ease;
                        position: relative;
                    }
                    .ph-custom-option:last-child { border-bottom: none; }
                    .ph-custom-option:hover { 
                        background: linear-gradient(90deg, #e3f2fd 0%, #f3e5f5 100%); 
                        padding-left: 24px;
                    }
                    .ph-custom-option.selected { 
                        background: linear-gradient(90deg, #667eea15 0%, #764ba215 100%); 
                        font-weight: 600; 
                        color: #667eea;
                        border-left: 4px solid #667eea;
                    }
                    .ph-custom-option.disabled { 
                        color: #ccc; cursor: default; background: #fafafa; 
                        text-align: center; font-size: 11px; letter-spacing: 2px; 
                        padding: 8px;
                    }
                    
                    /* 🔥 HIDDEN OLD MENU (To restore: remove display:none from line below) */
                    /* RESTORE INSTRUCTION: Delete "display: none;" from .ph-old-menu-hidden class to show old menu */
                    .ph-old-menu-hidden { display: none; }

                    .ph-add-bulk-btn {
                        display: block; width: 100%; padding: 14px;
                        background: linear-gradient(180deg, #3a8fe8 0%, #2d6fc2 100%);
                        color: white; border: none; border-radius: 12px;
                        font-size: 15px; font-weight: 600; margin-top: 15px; cursor: pointer; 
                        text-align: center;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        box-shadow: 0 4px 8px rgba(58, 143, 232, 0.2);
                    }
                    .ph-add-bulk-btn:hover { 
                        background: linear-gradient(180deg, #3f96ef 0%, #2a63af 100%);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 16px rgba(58, 143, 232, 0.3);
                    }
                    
                    .ph-global-footer {
                        margin-top: 20px; padding-top: 20px; border-top: 2px solid #eee; text-align: center;
                    }
                    
                    /* 🔥 DYNAMIC UPLOAD BUTTON: Hidden by default, appears with animation */
                    .ph-upload-all {
                        display: none; /* Hidden by default */
                        width: 100%;
                        padding: 12px 14px; 
                        background: linear-gradient(180deg, #3a8fe8 0%, #2d6fc2 100%);
                        color: white; border: none;
                        border-radius: 12px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
                        box-shadow: 0 4px 8px rgba(58, 143, 232, 0.2);
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                        opacity: 0;
                        transform: scale(0.95) translateY(10px);
                    }
                    .ph-upload-all.visible {
                        display: block;
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                    .ph-upload-all:hover { 
                        background: linear-gradient(180deg, #3f96ef 0%, #2a63af 100%);
                        transform: translateY(-1px);
                        box-shadow: 0 6px 16px rgba(58, 143, 232, 0.3);
                    }
                    .ph-upload-all:disabled { 
                        background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
                        cursor: not-allowed; 
                        transform: scale(1);
                    }
                    
                    .ph-progress-container {
                        display: none; width: 100%; margin: 15px auto 0;
                        background: #f0f0f0; border-radius: 12px; overflow: hidden; height: 28px;
                        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                        position: relative;
                    }
                    .ph-progress-bar {
                        height: 100%; 
                        background: linear-gradient(180deg, #3a8fe8 0%, #2d6fc2 100%);
                        width: 0%; color: white;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 13px; font-weight: bold;
                        transition: width 0.3s ease;
                        min-width: 50px; /* Чтобы всегда был виден процент */
                    }
                    .ph-progress-text { 
                        text-align: center; font-size: 14px; margin-top: 8px; 
                        color: #555; font-weight: 500;
                    }
                    
                    .ph-slot-header { 
                        display: flex; align-items: center; justify-content: space-between; 
                        margin-bottom: 8px; 
                    }
                    .ph-slot-title { 
                        font-weight: 600; 
                        font-size: 14px; 
                        color: #333; 
                    }
                    /* Mobile responsive - smaller font */
                    @media (max-width: 768px) {
                        .ph-slot-title {
                            font-size: 11px !important;
                        }
                    }
                    .ph-slot { 
                        border: 2px solid #e8e8e8; padding: 12px; border-radius: 10px; 
                        margin-bottom: 12px; background: #fff;
                        transition: all 0.3s ease;
                    }
                    .ph-slot:hover {
                        border-color: #667eea;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                    }
                    
                    /* 🔥 Remove duplicate section titles */
                    .ph-section-title { display: none; }
                </style>

                <div class="ph-header">
                    <div class="ph-custom-select-wrapper" id="ph_custom_dropdown">
                        <div class="ph-custom-select-trigger placeholder" id="ph_trigger">Выберите раздел</div>
                        <div class="ph-custom-options">
                             <div class="ph-custom-option" data-value="ph_sec_general">📸 Общий фотоотчет</div>
                             <div class="ph-custom-option" data-value="ph_sec_acts">📋 Акт/селфи/журнал общ.раб</div>
                             <div class="ph-custom-option" data-value="ph_sec_perimeter">🚧 Периметральное ограждение</div>
                             <div class="ph-custom-option" data-value="ph_sec_skud">🔐 СКУД</div>
                             <div class="ph-custom-option" data-value="ph_sec_household">🏠 Бытовые помещения</div>
                             <div class="ph-custom-option" data-value="ph_sec_site">⚠️ Замечания строительной площадки</div>
                             <div class="ph-custom-option" data-value="ph_sec_quality">✅ Замечания контроль качества</div>
                        </div>
                    </div>
                </div>

                <!-- 🔥 Sections with Multiple Photo Upload -->
                <div id="ph_sec_general" class="ph-section" style="display:none;">
                    <div id="ph_general_list"></div>
                    <button class="ph-add-bulk-btn" onclick="document.getElementById('ph_bulk_input_general').click()">📷 Добавить фото</button>
                    <input type="file" id="ph_bulk_input_general" multiple style="display:none;" accept="image/*" />
                </div>
                
                <div id="ph_sec_acts" class="ph-section" style="display:none;">
                    <div id="ph_acts_list"></div>
                    <button class="ph-add-bulk-btn" onclick="document.getElementById('ph_bulk_input_acts').click()">📷 Добавить фото</button>
                    <input type="file" id="ph_bulk_input_acts" multiple style="display:none;" accept="image/*" />
                </div>
                
                <div id="ph_sec_perimeter" class="ph-section" style="display:none;">
                    <div id="ph_perimeter_list"></div>
                    <button class="ph-add-bulk-btn" onclick="document.getElementById('ph_bulk_input_perimeter').click()">📷 Добавить фото</button>
                    <input type="file" id="ph_bulk_input_perimeter" multiple style="display:none;" accept="image/*" />
                </div>
                
                <div id="ph_sec_skud" class="ph-section" style="display:none;">
                    <div id="ph_skud_list"></div>
                    <button class="ph-add-bulk-btn" onclick="document.getElementById('ph_bulk_input_skud').click()">📷 Добавить фото</button>
                    <input type="file" id="ph_bulk_input_skud" multiple style="display:none;" accept="image/*" />
                </div>
                
                <div id="ph_sec_household" class="ph-section" style="display:none;">
                    <div id="ph_household_list"></div>
                    <button class="ph-add-bulk-btn" onclick="document.getElementById('ph_bulk_input_household').click()">📷 Добавить фото</button>
                    <input type="file" id="ph_bulk_input_household" multiple style="display:none;" accept="image/*" />
                </div>
                
                <div id="ph_sec_site" class="ph-section" style="display:none;">
                    <div id="ph_site_list"></div>
                    <button class="ph-add-bulk-btn" onclick="document.getElementById('ph_bulk_input_site').click()">📷 Добавить фото</button>
                    <input type="file" id="ph_bulk_input_site" multiple style="display:none;" accept="image/*" />
                </div>
                
                <div id="ph_sec_quality" class="ph-section" style="display:none;">
                    <div id="ph_quality_list"></div>
                    <button class="ph-add-bulk-btn" onclick="document.getElementById('ph_bulk_input_quality').click()">📷 Добавить фото</button>
                    <input type="file" id="ph_bulk_input_quality" multiple style="display:none;" accept="image/*" />
                </div>

                <div class="ph-global-footer">
                    <button id="ph_upload_all_btn" class="ph-upload-all object-card__button object-card__button--primary" style="width:100%; justify-content:center;">🚀 Загрузить все фото</button>
                    <div id="ph_progress_container" class="ph-progress-container"><div id="ph_progress_bar" class="ph-progress-bar">0%</div></div>
                    <div id="ph_progress_text" class="ph-progress-text" style="display:none;">Подготовка...</div>
                </div>
            </div>`;

    // --- LOGIC ---
    // Custom Dropdown Logic
    const ddWrapper = document.getElementById('ph_custom_dropdown');
    const ddTrigger = document.getElementById('ph_trigger');
    const ddOptions = document.querySelectorAll('.ph-custom-option');

    if (ddWrapper && ddTrigger) {
        // Toggle
        ddTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const wasOpen = ddWrapper.classList.contains('open');
            ddWrapper.classList.toggle('open');

            // 🔥 Auto-scroll to make dropdown FULLY visible (all 7 options)
            if (!wasOpen) {
                setTimeout(() => {
                    const container = document.getElementById('objectDetailsContent');
                    if (container) {
                        const containerRect = container.getBoundingClientRect();
                        const dropdownRect = ddWrapper.getBoundingClientRect();
                        const optionsHeight = 400; // Максимальная высота меню с 7 пунктами

                        // Вычисляем позицию, чтобы весь dropdown был виден
                        const scrollTop = container.scrollTop;
                        const dropdownTop = dropdownRect.top - containerRect.top + scrollTop;
                        const dropdownBottom = dropdownTop + dropdownRect.height + optionsHeight;
                        const containerVisibleHeight = containerRect.height;

                        // Прокручиваем так, чтобы низ выпадающего списка был виден
                        // Это покажет все 7 пунктов меню
                        const targetScroll = dropdownBottom - containerVisibleHeight + 140; // 140px отступ снизу для отображения всех пунктов

                        container.scrollTo({
                            top: Math.max(0, targetScroll),
                            behavior: 'smooth'
                        });
                    }
                }, 180);
            }
        });

        // Close on click outside
        document.addEventListener('click', function (e) {
            if (!ddWrapper.contains(e.target)) {
                ddWrapper.classList.remove('open');
            }
        });

        // Option selection
        ddOptions.forEach(opt => {
            opt.addEventListener('click', function () {
                if (this.classList.contains('disabled')) return;

                const val = this.getAttribute('data-value');
                const text = this.textContent;

                // Update trigger text
                ddTrigger.textContent = text;
                ddTrigger.classList.remove('placeholder'); // Remove placeholder class

                // Update visual selection
                ddOptions.forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');

                // Close dropdown
                ddWrapper.classList.remove('open');

                // Trigger visibility logic
                document.querySelectorAll('.ph-section').forEach(el => el.style.display = 'none');
                const active = document.getElementById(val);
                if (active) active.style.display = 'block';
            });
        });
    }

    // 🔥 Helper: Check if any photos added and show upload button
    const checkAndShowUploadButton = () => {
        const uploadBtn = document.getElementById('ph_upload_all_btn');
        if (!uploadBtn) return;

        const allLists = [
            'ph_general_list', 'ph_acts_list', 'ph_perimeter_list',
            'ph_skud_list', 'ph_household_list', 'ph_site_list', 'ph_quality_list'
        ];

        let hasPhotos = false;
        allLists.forEach(listId => {
            const list = document.getElementById(listId);
            if (list && list.querySelectorAll('.ph-slot').length > 0) {
                hasPhotos = true;
            }
        });

        if (hasPhotos && !uploadBtn.classList.contains('visible')) {
            uploadBtn.classList.add('visible');
            // Smooth scroll to button
            setTimeout(() => {
                uploadBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 400);
        } else if (!hasPhotos) {
            uploadBtn.classList.remove('visible');
        }
    };

    // Helper: Bulk Input Setup
    const setupBulkInput = (inputId, listId) => {
        const inp = document.getElementById(inputId);
        const list = document.getElementById(listId);
        if (!inp || !list) return;
        inp.addEventListener('change', function () {
            const files = Array.from(inp.files || []);
            if (files.length === 0) return;

            const div = document.createElement('div');
            div.className = 'ph-slot';
            // Unique batch ID
            const seq = Date.now() + '_batch_' + Math.random().toString(36).substr(2, 5);
            div.setAttribute('data-seq', seq);

            // Create a new input holding all these selected files
            const newInput = document.createElement('input');
            newInput.type = 'file';
            newInput.multiple = true;
            newInput.style.display = 'none';
            const dt = new DataTransfer();
            files.forEach(f => dt.items.add(f));
            newInput.files = dt.files;

            div.innerHTML = `<div class="ph-slot-header">
                                <div class="ph-slot-title">📷 Добавлено фото: ${files.length} шт.</div>
                                <span class="ph-indicator" data-state="ok">✅</span>
                             </div>
                             <button class="ph-skip" style="margin-top:8px; padding:8px 12px; background:#fde1e1; color:#c0392b; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; transition:all 0.2s;">Удалить</button>`;
            div.appendChild(newInput); // attach hidden input with files
            list.appendChild(div);

            div.querySelector('.ph-skip').addEventListener('click', () => {
                div.remove();
                checkAndShowUploadButton(); // Re-check after deletion
            });
            // Add hover effect
            const skipBtn = div.querySelector('.ph-skip');
            skipBtn.addEventListener('mouseenter', () => {
                skipBtn.style.background = '#f8c9c9';
            });
            skipBtn.addEventListener('mouseleave', () => {
                skipBtn.style.background = '#fde1e1';
            });
            inp.value = ''; // Reset main input

            checkAndShowUploadButton(); // Show button if photos added
        });
    };
    setupBulkInput('ph_bulk_input_general', 'ph_general_list');
    setupBulkInput('ph_bulk_input_acts', 'ph_acts_list');
    setupBulkInput('ph_bulk_input_perimeter', 'ph_perimeter_list');
    setupBulkInput('ph_bulk_input_skud', 'ph_skud_list');
    setupBulkInput('ph_bulk_input_household', 'ph_household_list');
    setupBulkInput('ph_bulk_input_site', 'ph_site_list');
    setupBulkInput('ph_bulk_input_quality', 'ph_quality_list');

    // Helper: Indicators
    const setIndicator = (slot, ok) => {
        if (!slot) return;
        const ind = slot.querySelector('.ph-indicator');
        if (ind) { ind.textContent = ok ? '✅' : '❌'; ind.setAttribute('data-state', ok ? 'ok' : 'fail'); }
    };

    // 🔥 OLD MENU LOGIC (Hidden, but preserved for future restore)
    // This entire block is kept but not executed since grids don't exist in new layout

    // 🔥 OLD GRID SETUP LOGIC (Hidden, preserved for future restore)
    // Not executed as new menu doesn't use grids


    // Global Upload Logic
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image(); img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    const MAX = 1024;
                    if (w > h && w > MAX) { h *= MAX / w; w = MAX; } else if (h > MAX) { w *= MAX / h; h = MAX; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.35));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    // 🔥 NEW PWA UPLOAD FUNCTION - Uses Service Worker + Upload Queue
    const uploadAllPhotos = async () => {
        const sections = [
            { id: 'ph_sec_general', name: 'Общий фотоотчет', key: 'general' },
            { id: 'ph_sec_acts', name: 'Акт/селфи/журнал общ.раб', key: 'acts' },
            { id: 'ph_sec_perimeter', name: 'Периметральное ограждение', key: 'perimeter' },
            { id: 'ph_sec_skud', name: 'СКУД', key: 'skud' },
            { id: 'ph_sec_household', name: 'Бытовые помещения', key: 'household' },
            { id: 'ph_sec_site', name: 'Замечания строительной площадки', key: 'site' },
            { id: 'ph_sec_quality', name: 'Замечания контроль качества', key: 'quality' }
        ];

        let allFiles = [];
        sections.forEach(sec => {
            const el = document.getElementById(sec.id);
            if (!el) return;
            const slots = Array.from(el.querySelectorAll('.ph-slot'));
            slots.forEach(s => {
                const inp = s.querySelector('input[type="file"]');
                const slotSeq = s.getAttribute('data-seq') || ('rnd_' + Math.random());
                const obsKey = s.getAttribute('data-obskey') || '';

                if (inp && inp.files && inp.files.length > 0) {
                    Array.from(inp.files).forEach((f, idx) => {
                        const fileSeq = slotSeq + '_' + idx;
                        allFiles.push({ file: f, seq: fileSeq, slot: s, obsKey, category: sec.name, sectionKey: sec.key });
                    });
                }
            });
        });

        if (allFiles.length === 0) {
            showNotification('❌ Нет фото', 'error');
            return;
        }

        const btn = document.getElementById('ph_upload_all_btn');
        const progCont = document.getElementById('ph_progress_container');
        const progBar = document.getElementById('ph_progress_bar');
        const progText = document.getElementById('ph_progress_text');

        if (btn) { btn.disabled = true; btn.textContent = '🔄 Подготовка...'; }
        if (progCont) progCont.style.display = 'block';
        if (progText) progText.style.display = 'block';

        // Get inspector name
        const inspectorEl = document.getElementById('currentUser');
        const rawName = inspectorEl ? inspectorEl.textContent.trim() : '';
        const inspectorName = rawName.split('(')[0].trim();

        // Get object data from global variable (set when photo report modal opens)
        const objectId = window.currentDetailsObjectId || currentDetailsObjectId;

        if (!objectId) {
            showNotification('❌ Не найден ID объекта. Пожалуйста, выберите объект на карте.', 'error');
            if (btn) {
                btn.textContent = '🚀 Загрузить все фото';
                btn.disabled = false;
            }
            return;
        }

        // Get object name from report title if available
        const reportTitleEl = document.querySelector('.report-title');
        const objectName = reportTitleEl ? reportTitleEl.textContent.trim() : `Объект #${objectId}`;

        try {
            // Step 1: Ensure folder exists
            if (progText) progText.textContent = 'Подготовка папок...';

            await new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', REPORTS_URL + '?action=ensurePhotoFolder', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.timeout = 30000;
                xhr.onload = () => resolve();
                xhr.onerror = () => resolve(); // Continue anyway
                xhr.ontimeout = () => resolve();

                xhr.send(JSON.stringify({
                    objectId: objectId,
                    monitoring_date: formatDateOnly(new Date()),
                    inspector: inspectorName
                }));
            });

            // Step 2: Compress and enqueue all photos to IndexedDB
            if (progText) progText.textContent = 'Сжатие фото...';
            let enqueuedCount = 0;

            for (let i = 0; i < allFiles.length; i++) {
                const item = allFiles[i];

                if (progText) {
                    progText.textContent = `Обработка фото ${i + 1} из ${allFiles.length}...`;
                }

                try {
                    // Compress image
                    let dataUrl;
                    try {
                        dataUrl = await compressImage(item.file);
                    } catch (err) {
                        console.warn('Compression failed, using original:', err);
                        // Fallback to original file
                        dataUrl = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(item.file);
                        });
                    }

                    // Enqueue to IndexedDB
                    await enqueueUpload({
                        objectId: objectId,
                        objectName: objectName,
                        fileName: item.file.name,
                        fileData: dataUrl,
                        category: item.category,
                        inspector: inspectorName,
                        monitoring_date: formatDateOnly(new Date()),
                        observationRefs: item.obsKey ? [item.obsKey] : [],
                        serverUrl: REPORTS_URL
                    });

                    enqueuedCount++;

                    // Update progress
                    const pct = Math.round((enqueuedCount / allFiles.length) * 100);
                    if (progBar) {
                        progBar.style.width = pct + '%';
                        progBar.textContent = pct + '%';
                    }

                } catch (error) {
                    console.error('Failed to enqueue photo:', item.file.name, error);
                    setIndicator(item.slot, false);
                }
            }

            // Step 3: Trigger Service Worker Background Sync
            if (progText) progText.textContent = 'Запуск фоновой загрузки...';

            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                // Register background sync
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('upload-photos');

                showNotification(
                    `✅ ${enqueuedCount} фото добавлено в очередь. Загрузка продолжится даже если вы закроете окно!`,
                    'success',
                    10000
                );

                // Listen for messages from Service Worker
                navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

            } else {
                // Fallback: Upload directly (for browsers without Background Sync)
                console.warn('Background Sync not supported, uploading directly');
                if (progText) progText.textContent = 'Загрузка напрямую...';

                await uploadQueueDirectly(progText, progBar);
            }

            // Update UI
            if (btn) {
                btn.textContent = '✅ Добавлено в очередь';
                setTimeout(() => {
                    btn.textContent = '🚀 Загрузить все фото';
                    btn.disabled = false;
                }, 3000);
            }

            if (progCont) {
                setTimeout(() => {
                    progCont.style.display = 'none';
                }, 5000);
            }

        } catch (error) {
            console.error('Upload queue error:', error);
            showNotification('❌ Ошибка подготовки загрузки: ' + error.message, 'error');

            if (btn) {
                btn.textContent = '🚀 Загрузить все фото';
                btn.disabled = false;
            }
        }
    };

    // Handle messages from Service Worker
    function handleServiceWorkerMessage(event) {
        const data = event.data;

        if (data.type === 'UPLOAD_PROGRESS') {
            const progText = document.getElementById('ph_progress_text');
            const progBar = document.getElementById('ph_progress_bar');

            if (progText) {
                progText.textContent = `Загружено ${data.completed} из ${data.total} (успешно: ${data.success}, ошибок: ${data.failed})`;
            }

            if (progBar) {
                const pct = Math.round((data.completed / data.total) * 100);
                progBar.style.width = pct + '%';
                progBar.textContent = pct + '%';
            }
        }

        if (data.type === 'UPLOAD_COMPLETE') {
            showNotification(
                `✅ Загрузка завершена!\nУспешно: ${data.success}\nОшибок: ${data.failed}`,
                data.failed > 0 ? 'warning' : 'success',
                8000
            );

            // Refresh data to show new photo links
            if (typeof refreshData === 'function') {
                setTimeout(() => refreshData(), 2000);
            }
        }

        if (data.type === 'VERIFICATION_COMPLETE') {
            showNotification(
                `🔍 Проверка завершена!\nПроверено: ${data.verified}\nНе найдено: ${data.failed}`,
                data.failed > 0 ? 'warning' : 'success'
            );
        }

        if (data.type === 'UPLOAD_ERROR') {
            showNotification(`❌ Ошибка загрузки: ${data.error}`, 'error');
        }
    }

    // Fallback: Direct upload for browsers without Background Sync
    async function uploadQueueDirectly(progText, progBar) {
        const uploads = await getAllUploads({ status: 'pending' });
        let completed = 0;
        const total = uploads.length;

        for (const upload of uploads) {
            try {
                const formData = new FormData();
                const blob = await fetch(upload.fileData).then(r => r.blob());
                formData.append('photo', blob, upload.fileName);
                formData.append('objectId', upload.objectId);
                formData.append('category', upload.category);
                formData.append('inspector', upload.inspector);
                formData.append('monitoring_date', upload.monitoring_date);

                if (upload.observationRefs && upload.observationRefs.length > 0) {
                    formData.append('observationRefs', JSON.stringify(upload.observationRefs));
                }

                const response = await fetch(`${upload.serverUrl}?action=uploadPhoto`, {
                    method: 'POST',
                    body: formData
                });

                if (response.ok || response.status === 405) {
                    await updateUploadStatus(upload.id, 'uploaded', { uploadedAt: Date.now() });
                } else {
                    throw new Error(`Upload failed: ${response.status}`);
                }

            } catch (error) {
                console.error('Direct upload error:', error);
                await updateUploadStatus(upload.id, 'failed', { lastError: error.message });
            }

            completed++;
            if (progText) {
                progText.textContent = `Загружено ${completed} из ${total}`;
            }
            if (progBar) {
                const pct = Math.round((completed / total) * 100);
                progBar.style.width = pct + '%';
                progBar.textContent = pct + '%';
            }
        }

        showNotification(`✅ Загрузка завершена: ${completed} фото`, 'success');
    }


    const btnAll = document.getElementById('ph_upload_all_btn');
    if (btnAll) btnAll.addEventListener('click', uploadAllPhotos);
}
// ✅ Помечаем завершение блока материала для объекта
function markCompletion(objectId, type) {
    if (!objectId) return;
    if (!completionMap[objectId]) completionMap[objectId] = { checklist: false, general: false, site: false, perimeter: false, household: false };
    completionMap[objectId][type] = true;
}

// 🚀 Проверяем, всё ли загружено, и автоматически открываем дашборд
function maybeAutoDashboard(objectId) {
    const s = completionMap[objectId];
    if (!s) return;
    const allDone = !!(s.checklist && s.general && s.site && s.perimeter && s.household);
    if (!allDone) return;
    try {
        let targetUrl;
        try {
            const u = new URL(window.location.href);
            u.port = '5550';
            u.pathname = '/dashboards';
            targetUrl = u.toString();
        } catch (_) {
            targetUrl = 'http://localhost:5550/dashboards';
        }
        window.open(targetUrl, '_blank');
        showNotification('✅ Материалы загружены. Создан дашборд.', 'success');
        completionMap[objectId] = { checklist: false, general: false, site: false, perimeter: false, household: false };
    } catch (_) { }
}

function toggleDashboard(objectId) {
    const overlay = document.getElementById('objectDetailsOverlay');
    const target = document.getElementById('photoUploaderContainer');
    if (!target) return;

    // 🔥 Check if currently visible AND has content (is open)
    const isVisible = target.style.display !== 'none' && target.innerHTML.trim().length > 0;

    if (isVisible) {
        // CLOSE
        target.style.display = 'none';
        target.innerHTML = ''; // Update: clear content
    } else {
        // OPEN
        if (overlay && overlay.classList.contains('hidden')) {
            openObjectDetails(objectId);
        }
        target.style.display = 'block';
        openGeneralPhotoUploader(objectId);

        // 🔥 Auto-scroll to photo uploader
        setTimeout(() => {
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function uploadPhotoSend(object, dataUrl, category, seq, obsRefs) {
    const dateStr = formatDateOnly(new Date());
    const body = {
        object_id: String(object.id),
        monitoring_date: String(dateStr),
        category: String(category),
        seq: String(seq),
        dataUrl: String(dataUrl),
        obs: Array.isArray(obsRefs) ? obsRefs : (obsRefs ? [String(obsRefs)] : [])
    };

    // 🔥 Use XMLHttpRequest instead of fetch to avoid 64KB keepalive limit
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', REPORTS_URL + '?action=uploadPhoto', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 300000; // 5 minutes

        xhr.onload = function () {
            // Accept 2xx and 405 (405 occurs after successful upload due to proxy/redirect)
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 405) {
                const text = xhr.responseText;
                let res;
                try {
                    res = JSON.parse(text);
                } catch (_) {
                    // For 405, assume success since files actually upload
                    res = { success: true };
                }

                // Proxy may return 200 OK but with {success:false, status:405} in JSON
                if ((res && res.success) || (res && res.status === 405)) {
                    showNotification('Фото загружено', 'success');
                    resolve(res);
                } else {
                    const msg = (res && res.message) ? String(res.message) : '';
                    showNotification('Ошибка загрузки фото' + (msg ? ': ' + msg : ''), 'error');
                    resolve(res);
                }
            } else {
                reject(new Error('Server returned ' + xhr.status));
            }
        };

        xhr.onerror = function () {
            console.error('XHR network error');
            showNotification('Ошибка сети', 'error');
            reject(new Error('Network error'));
        };

        xhr.ontimeout = function () {
            console.error('XHR timeout');
            showNotification('Превышено время ожидания', 'error');
            reject(new Error('Timeout'));
        };

        xhr.send(JSON.stringify(body));
    });
}

function formatDateOnly(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
}

function checkInspectorActiveObject(inspector) {
    if (!inspector) return null;

    const activeObject = objectsData.find(obj =>
        obj.inspector === inspector &&
        obj.entryTime &&
        !obj.exitTime
    );

    return activeObject;
}

function canInspectorEnterObject(inspector, objectId) {
    if (userAccessRights === 'Император' || userAccessRights === 'Администратор') {
        return { canEnter: true };
    }

    const activeObject = checkInspectorActiveObject(inspector);

    if (activeObject) {
        if (activeObject.id == objectId) {
            return { canEnter: false, message: 'Вы уже находитесь на этом объекте' };
        } else {
            return {
                canEnter: false,
                message: `Нельзя войти на объект ${objectId}. Сначала завершите объект ${activeObject.id}`,
                activeObjectId: activeObject.id
            };
        }
    }

    return { canEnter: true };
}

function getStatusText(status) {
    switch (status) {
        case 'active': return '🟢 Активен';
        case 'vacation': return '🏖️ В отпуске';
        case 'sick': return '🤒 На больничном';
        default: return '❓ Неизвестно';
    }
}

function copyCoordinates(coordinates) {
    navigator.clipboard.writeText(coordinates).then(() => {
        showNotification('✅ Координаты скопированы: ' + coordinates, 'success');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = coordinates;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('✅ Координаты скопированы: ' + coordinates, 'success');
    });
}

// 🔥 РАБОТА С ТОЧКАМИ - УЛУЧШЕННАЯ ВЕРСИЯ
function markEntry(objectId) {
    const object = objectsData.find(obj => obj.id == objectId); // 🔥 ИСПРАВЛЕНО: == вместо ===
    if (!object) {
        showNotification('❌ Объект не найден', 'error');
        return;
    }

    const canMarkEntryExit = (userAccessRights === 'Император' || userAccessRights === 'Администратор') ||
        isSameInspector(object.inspector, currentUser);

    if (!canMarkEntryExit) {
        showNotification('❌ Недостаточно прав для отметки входа на чужой объект', 'error');
        return;
    }

    if (userAccessRights === 'Инспектор') {
        const canEnter = canInspectorEnterObject(currentUser, objectId);
        if (!canEnter.canEnter) {
            showNotification('❌ ' + canEnter.message, 'error');
            if (canEnter.activeObjectId) {
                setTimeout(() => {
                    const activeObj = objectsData.find(o => o.id == canEnter.activeObjectId); // 🔥 ИСПРАВЛЕНО: == вместо ===
                    if (activeObj) {
                        map.setCenter([parseFloat(activeObj.latitude), parseFloat(activeObj.longitude)], 17);
                        showObjectBalloon(activeObj.id);
                    }
                }, 1000);
            }
            return;
        }
    }

    performMarkEntry(objectId);
}

function markExit(objectId) {
    const object = objectsData.find(obj => obj.id == objectId); // 🔥 ИСПРАВЛЕНО: == вместо ===
    if (!object) {
        showNotification('❌ Объект не найден', 'error');
        return;
    }

    const canMarkEntryExit = (userAccessRights === 'Император' || userAccessRights === 'Администратор') ||
        isSameInspector(object.inspector, currentUser);

    if (!canMarkEntryExit) {
        showNotification('❌ Недостаточно прав для отметки выхода на чужой объект', 'error');
        return;
    }

    performMarkExit(objectId);
}

function performMarkEntry(objectId) {
    const object = objectsData.find(obj => obj.id == objectId);
    if (!object) return;

    // 🔥 OPTIMISTIC UPDATE: Меняем состояние мгновенно
    const originalEntryTime = object.entryTime;
    const revertOptimisticUpdate = () => {
        object.entryTime = originalEntryTime;
        updateSinglePointOnMap(objectId, originalEntryTime ? 'active' : 'new');
        updateLocalCache(); // 🔥 Revert cache
    };
    object.entryTime = new Date().toISOString();
    object.exitTime = ''; // Сбрасываем выход если был

    // Обновляем карту
    updateSinglePointOnMap(objectId, 'active');

    // Обновляем локальнй кэш "активных"
    try {
        const key = (currentUser || '') + ':' + String(objectId);
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENTRIES || 'active_entries');
        const map = raw ? JSON.parse(raw) : {};
        map[key] = Date.now();
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ENTRIES || 'active_entries', JSON.stringify(map));
    } catch (_) { }

    updateLocalCache(); // 🔥 Save to cache immediately (Optimistic)

    showNotification('🔄 Вход отмечен (синхронизация...)', 'success');

    console.log('🔍 MarkEntry for:', objectId, 'Inspector:', currentUser);
    const queryParams = `?action=entry&objectId=${objectId}&inspector=${encodeURIComponent(currentUser)}&sheet_id=${DEFAULT_SHEET_ID}`;

    if (SCRIPT_URL.includes('/exec')) {
        const warnTimeout = setTimeout(() => { showNotification('⚠️ Сервер отвечает медленно...', 'warning'); }, 15000);
        fetch(SCRIPT_URL + queryParams, { cache: 'no-store' })
            .then(r => r.text())
            .then(text => {
                clearTimeout(warnTimeout);
                const res = parseServerResponse(text);
                if (res.success) { showNotification('✅ Сохранено', 'success'); updateLocalCache(); }
                else {
                    // SERVER EXPLICIT ERROR: Revert
                    revertOptimisticUpdate();
                    showNotification('❌ Ошибка: ' + res.message, 'error');
                }
            })
            .catch(err => {
                clearTimeout(warnTimeout);
                console.error('⚠️ Network Error on Save (Optimistic kept):', err);
                // DO NOT REVERT. Assume success / retry later.
                // revertOptimisticUpdate(); 
                showNotification('⚠️ Сохранено локально (ошибка сети)', 'warning');
            });
        return;
    }

    const callbackName = 'entryCallback_' + Date.now();

    // 🔥 TIMEOUT HANDLER: Warn after 15s, but keep waiting up to 120s
    const warnTimeout = setTimeout(() => {
        showNotification('⚠️ Сервер отвечает медленно, пожалуйста подождите...', 'warning');
    }, 15000);

    // Safety cleanup after 2 minutes (prevent memory leak, but allow slow server)
    const safetyCleanup = setTimeout(() => {
        if (window[callbackName]) {
            console.warn('Entry request timed out fully (120s)');
            delete window[callbackName];
            showNotification('❌ Сервер не ответил вовремя. Проверьте интернет.', 'error');
            revertOptimisticUpdate();
        }
    }, 120000);

    window[callbackName] = function (result) {
        clearTimeout(warnTimeout);
        clearTimeout(safetyCleanup);
        delete window[callbackName];

        if (result.success) {
            showNotification(`✅ Данные синхронизированы для точки ${objectId}`, 'success');
            updateLocalCache(); // 🔥 Sync to cache
        } else {
            console.error('❌ Ошибка на сервере:', result);
            revertOptimisticUpdate();
            showNotification('❌ Ошибка на сервере: ' + (result.message || 'Не удалось отметить вход'), 'error');
        }
    };



    const url = `${SCRIPT_URL}?action=entry&objectId=${objectId}&inspector=${encodeURIComponent(currentUser)}&sheet_id=${DEFAULT_SHEET_ID}&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = function () {
        clearTimeout(warnTimeout);
        clearTimeout(safetyCleanup);
        delete window[callbackName];

        revertOptimisticUpdate();
        showNotification('❌ Ошибка соединения с сервером', 'error');
    };
    document.head.appendChild(script);
}

function performMarkExit(objectId) {
    const object = objectsData.find(obj => obj.id == objectId);
    if (!object) return;

    // 🔥 OPTIMISTIC UPDATE
    const originalExitTime = object.exitTime;
    const originalEntryTime = object.entryTime; // Backup just in case

    // Ставим текущее время
    object.exitTime = new Date().toISOString();
    // Если по какой-то причине нет entryTime, ставим и его (fallback)
    object.entryTime = object.entryTime || new Date().toISOString();

    // Обновляем карту (статус completed -> плюсик)
    updateSinglePointOnMap(objectId, 'completed');

    // Через 3 секунды убираем точку (визуально скрываем или обновляем фильтр)
    // Но так как это "выполненная", она может сама пропасть при обновлении фильтров.
    // Если пользователь хочет, чтобы она "пропадала" - возможно скрытие слоя или обновление.
    // Пока сделаем задержку перед "исчезновением" (если фильтр скрывает выполненные)
    // Но для мгновенного эффекта можно просто удалить её через 3 сек, если не revert.

    const disappearTimer = setTimeout(() => {
        // Проверяем, не было ли отката
        if (object.exitTime) {
            // Если в фильтрах стоит "скрывать выполненные" (обычно по дефолту да, или просто из списка уходит)
            // Мы можем принудительно удалить с карты, чтобы пользователь увидел исчезновение
            try {
                activeObjectsLayer.remove(activeObjectsLayer.objects.getById(objectId));
                objectManager.remove(objectManager.objects.getById(objectId));
            } catch (e) { }
        }
    }, 3000);

    // Удаляем из "активных" локально
    try {
        const key = (currentUser || '') + ':' + String(objectId);
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENTRIES || 'active_entries');
        const map = raw ? JSON.parse(raw) : {};
        delete map[key];
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ENTRIES || 'active_entries', JSON.stringify(map));
    } catch (_) { }

    updateLocalCache(); // 🔥 Save to cache immediately (Optimistic)

    showNotification('🔄 Выход отмечен (синхронизация...)', 'success');

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    console.log('🔍 MarkExit for:', objectId, 'Inspector:', currentUser);
    const queryParams = `?action=exit&objectId=${objectId}&inspector=${encodeURIComponent(currentUser)}&sheet_id=${DEFAULT_SHEET_ID}&_=${timestamp}&r=${random}`;

    if (SCRIPT_URL.includes('/exec')) {
        const warnTimeout = setTimeout(() => { showNotification('⚠️ Сервер отвечает медленно...', 'warning'); }, 15000);
        fetch(SCRIPT_URL + queryParams, { cache: 'no-store' })
            .then(r => r.text())
            .then(text => {
                clearTimeout(warnTimeout);
                const res = parseServerResponse(text);
                if (res.success) { showNotification('✅ Выполнено', 'success'); updateLocalCache(); }
                else {
                    // SERVER EXPLICIT ERROR: Revert
                    clearTimeout(disappearTimer); object.exitTime = originalExitTime; updateSinglePointOnMap(objectId, 'active'); updateLocalCache(); showNotification('❌ Ошибка: ' + res.message, 'error');
                }
            })
            .catch(err => {
                clearTimeout(warnTimeout);
                console.error('⚠️ Network Error on Exit (Optimistic kept):', err);
                // DO NOT REVERT. Assume success / retry later.
                // clearTimeout(disappearTimer); object.exitTime = originalExitTime; updateSinglePointOnMap(objectId, 'active'); updateLocalCache();
                showNotification('⚠️ Сохранено локально (ошибка сети)', 'warning');
            });

        return;
    }

    const cleanTimers = () => {
        clearTimeout(warnTimeout);
        clearTimeout(safetyCleanup);
    };

    const callbackName = 'exitCallback_' + Date.now();

    // 🔥 TIMEOUT HANDLER: Warn after 15s
    const warnTimeout = setTimeout(() => {
        showNotification('⚠️ Сервер отвечает медленно, пожалуйста подождите...', 'warning');
    }, 15000);

    // Safety cleanup after 2 minutes
    const safetyCleanup = setTimeout(() => {
        if (window[callbackName]) {
            console.warn('Exit request timed out fully (120s)');
            delete window[callbackName];

            // Revert
            clearTimeout(disappearTimer);
            object.exitTime = originalExitTime;
            updateSinglePointOnMap(objectId, 'active');
            updateLocalCache();
            showNotification('❌ Сервер не ответил вовремя. Данные не сохранены.', 'error');
        }
    }, 120000);

    window[callbackName] = function (result) {
        cleanTimers();
        delete window[callbackName];
        console.log('🟡 Ответ от сервера при выходе:', result);

        if (result.success) {
            showNotification(`✅ Синхронизировано: точка ${objectId} выполнена`, 'success');
            updateLocalCache();
        } else {
            // Revert
            clearTimeout(disappearTimer);
            object.exitTime = originalExitTime;
            // object.entryTime = originalEntryTime; // Don't revert this often
            updateSinglePointOnMap(objectId, 'active'); // вернем в активную
            updateLocalCache(); // 🔥 Revert cache
            showNotification('❌ Ошибка: ' + (result.message || 'Не удалось отметить выход'), 'error');
            console.error('❌ Ошибка при выходе:', result);
        }
    };

    // timestamp and random moved up
    const url = `${SCRIPT_URL}?action=exit&objectId=${objectId}&inspector=${encodeURIComponent(currentUser)}&sheet_id=${DEFAULT_SHEET_ID}&_=${timestamp}&r=${random}&callback=${callbackName}`;

    console.log('🟡 Отправляем запрос на выход:', url);
    const script = document.createElement('script');
    script.src = url;
    script.onerror = function () {
        cleanTimers();
        delete window[callbackName];
        // Revert
        clearTimeout(disappearTimer);
        object.exitTime = originalExitTime;
        updateSinglePointOnMap(objectId, 'active');
        updateLocalCache(); // 🔥 Revert cache
        showNotification('❌ Ошибка соединения с сервером', 'error');
    };
    document.head.appendChild(script);
}

function cancelEntry(objectId) {
    if (!(userAccessRights === 'Император' || userAccessRights === 'Администратор')) {
        showNotification('❌ Только администратор может отменять вход', 'error');
        return;
    }

    const object = objectsData.find(obj => obj.id == objectId); // 🔥 ИСПРАВЛЕНО: == вместо ===
    if (!object) {
        showNotification('❌ Объект не найден', 'error');
        return;
    }

    // Если нет времени входа, но мы тут - странно, но проверим
    if (!object.entryTime && !object.exitTime) {
        showNotification('ℹ️ Объект уже в статусе "Новая"', 'success');
        return;
    }

    if (!confirm(`Отменить вход на объект ${objectId}? Объект вернется в статус "Новая".`)) {
        return;
    }

    // 🔥 OPTIMISTIC UPDATE
    const originalEntryTime = object.entryTime;
    const originalExitTime = object.exitTime; // на всякий случай, хотя отмена входа подразумевает активную

    object.entryTime = '';
    // Если был exitTime, теоретически его тоже надо сбросить при "Отмене входа"? 
    // Обычно отмена входа делается для активных. Но если отменяем полностью, то сбрасываем всё.
    object.exitTime = '';

    updateSinglePointOnMap(objectId, 'new');

    // Удаляем из локального кэша активных
    try {
        const key = (object.inspector || currentUser || '') + ':' + String(objectId);
        const activeKey = (currentUser || '') + ':' + String(objectId); // И так и так проверим
        const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENTRIES || 'active_entries');
        const map = raw ? JSON.parse(raw) : {};
        delete map[key];
        delete map[activeKey];
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ENTRIES || 'active_entries', JSON.stringify(map));
    } catch (_) { }

    updateLocalCache(); // 🔥 Save to cache immediately (Optimistic)

    showNotification('🔄 Отмена входа (синхронизация...)', 'success');

    const callbackName = 'cancelEntryCallback_' + Date.now();

    const cleanupCallback = function () {
        setTimeout(() => {
            if (window[callbackName]) {
                // Instead of deleting, we could set it to no-op or just leave it longer
                delete window[callbackName];
            }
        }, 60000); // Increased from 10s to 60s to prevent ReferenceError on slow connections
    };

    window[callbackName] = function (result) {
        cleanupCallback();
        if (result.success && result.updated) {
            showNotification(`✅ Отмена входа синхронизирована для ${objectId}`, 'success');
            updateLocalCache();
        } else {
            // Revert
            object.entryTime = originalEntryTime;
            object.exitTime = originalExitTime;
            updateSinglePointOnMap(objectId, originalEntryTime ? 'active' : 'new');
            updateLocalCache(); // 🔥 Revert cache
            showNotification('❌ Ошибка: ' + (result.message || 'Не удалось отменить вход'), 'error');
        }
    };

    const url = `${SCRIPT_URL}?action=cancelEntry&objectId=${objectId}&inspector=${encodeURIComponent(currentUser)}&sheet_id=${DEFAULT_SHEET_ID}&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = function () {
        cleanupCallback();
        // Revert
        object.entryTime = originalEntryTime;
        object.exitTime = originalExitTime;
        updateSinglePointOnMap(objectId, originalEntryTime ? 'active' : 'new');
        updateLocalCache(); // 🔥 Revert cache
        showNotification('❌ Ошибка соединения с сервером', 'error');
    };
    document.head.appendChild(script);
    cleanupCallback();
}

// 🔥 ПЕРЕРАСПРЕДЕЛЕНИЕ ИНСПЕКТОРА - УЛУЧШЕННАЯ ВЕРСИЯ
function reassignInspector(objectId, newInspector, silent = false) {
    if (!(userAccessRights === 'Император' || userAccessRights === 'Администратор')) return;
    if (!newInspector) return;

    if (!silent) console.log('🟡 Переназначение:', objectId, '→', newInspector);

    // 🔥 Сразу скрываем балун по требованию
    try { closeObjectDetails(); } catch (_) { }

    // 🔥 OPTIMISTIC UPDATE: Update local data immediately
    const object = objectsData.find(obj => obj.id == objectId);
    let oldInspector = null;
    if (object) {
        oldInspector = object.inspector;
        object.inspector = newInspector;
        const isActive = object.entryTime && !object.exitTime;
        updateSinglePointOnMap(objectId, isActive ? 'active' : 'new');
        refreshPointSummaries();

        // 🔥 UPDATE LOCAL CACHE IMMEDIATELY
        updateLocalCache({ objects: [{ id: objectId, inspector: newInspector }] });
    }

    const callbackName = 'reassignCallback_' + objectId + '_' + Date.now();

    const cleanupCallback = function () {
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
            }
        }, 300000); // 5 minutes safety cleanup
    };

    window[callbackName] = function (result) {
        cleanupCallback();
        if (result.success) {
            if (!silent) {
                showNotification(`✅ Точка ${objectId} переназначена ${newInspector}`, 'success');
            }
        } else {
            // ❌ REVERT ON ERROR
            if (object && oldInspector) {
                object.inspector = oldInspector;
                const isActive = object.entryTime && !object.exitTime;
                updateSinglePointOnMap(objectId, isActive ? 'active' : 'new');
                refreshPointSummaries();
            }
            if (!silent) showNotification('❌ Ошибка переназначения: ' + result.message, 'error');
        }
    };

    const url = `${SCRIPT_URL}?action=reassign&objectId=${objectId}&newInspector=${encodeURIComponent(newInspector)}&sheet_id=${DEFAULT_SHEET_ID}&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;

    script.onerror = function () {
        cleanupCallback();
        // ❌ REVERT ON ERROR
        if (object && oldInspector) {
            object.inspector = oldInspector;
            const isActive = object.entryTime && !object.exitTime;
            updateSinglePointOnMap(objectId, isActive ? 'active' : 'new');
            refreshPointSummaries();
        }
        if (!silent) showNotification('❌ Ошибка соединения с сервером', 'error');
    };

    document.head.appendChild(script);
    cleanupCallback();
}

// ... (existing code) ...

function transferInspectorObjectsLocally(inspector) {
    const adminInspector = 'Admin';
    if (inspector === adminInspector) {
        return;
    }

    const affectedObjects = [];

    objectsData.forEach(obj => {
        if (obj.inspector === inspector && (!obj.exitTime || obj.exitTime === '')) {
            obj.inspector = adminInspector;
            affectedObjects.push(obj);
        }
    });

    if (affectedObjects.length === 0) {
        return;
    }

    console.log(`🔄 Локальная передача ${affectedObjects.length} объектов ${inspector} → ${adminInspector}`);

    // 🔥 ОТПРАВЛЯЕМ ЗАПРОСЫ НА СЕРВЕР ДЛЯ КАЖДОГО ОБЪЕКТА
    affectedObjects.forEach((obj, index) => {
        setTimeout(() => {
            reassignInspector(obj.id, adminInspector, true);
        }, index * 100); // 100ms delay to prevent flooding
    });

    const adminCheckbox = document.getElementById(`insp_${adminInspector}`);
    if (adminCheckbox && !adminCheckbox.checked) {
        adminCheckbox.checked = true;
    }

    setTimeout(() => {
        // 🔥 Call updateFilters to ensure we pick up the new Admin checkbox state
        updateFilters();
        refreshPointSummaries();
        // forceStyleRefresh();
    }, 100);
}

// 🔥 РАБОЧИЙ ДЕНЬ
function checkWorkDayStatus() {
    if (userAccessRights === 'Император' || userAccessRights === 'Администратор') return;

    const localStatus = getWorkDayStatus();
    if (localStatus.isOpen) {
        console.log('🔄 Восстанавливаем локальный статус рабочего дня: открыт');
        isWorkDayOpen = true;
        updateWorkDayButtons();
        return;
    }

    const callbackName = 'checkWorkDayCallback_' + Date.now();

    const cleanupCallback = function () {
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
            }
        }, 10000);
    };

    window[callbackName] = function (result) {
        cleanupCallback();
        if (result.success) {
            isWorkDayOpen = result.isWorkDayOpen;

            if (isWorkDayOpen) {
                saveWorkDayStatus(true);
            } else {
                saveWorkDayStatus(false);
            }

            updateWorkDayButtons();
            updateWorkDayNavButton(); // 🔥 Sync nav button with server state
            showNotification(isWorkDayOpen ? '🟢 Рабочий день открыт' : '🔴 Рабочий день закрыт', 'success');
        }
    };

    const url = `${SCRIPT_URL}?action=checkWorkDay&inspector=${encodeURIComponent(currentUser)}&sheet_id=${DEFAULT_SHEET_ID}&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = function () {
        cleanupCallback();
    };
    document.head.appendChild(script);
    cleanupCallback();
}

function updateWorkDayButtons() {
    const openBtn = document.getElementById('openDayBtn');
    const closeBtn = document.getElementById('closeDayBtn');
    const indicator = document.getElementById('workDayIndicator');

    if (!openBtn || !closeBtn || !indicator) return;

    const isInspector = userAccessRights === 'Инспектор';

    // 🔥 Стилизация кнопок для инспекторов
    if (isInspector) {
        // Логика будет применена ниже в зависимости от статуса
        indicator.className = 'status-badge-gray';
    } else {
        // Возвращаем стандартные классы для админов
        openBtn.className = 'inspector-btn';
        closeBtn.className = 'inspector-btn close-day-btn';
        // Индикатор для админов управляется ниже
    }

    if (isWorkDayOpen) {
        // 🔵 День открыт
        openBtn.disabled = true;
        closeBtn.disabled = false;

        if (isInspector) {
            openBtn.className = 'btn-gray'; // Неактивная - серая
            closeBtn.className = 'btn-blue'; // Активная - голубая
        }

        const localStatus = getWorkDayStatus();
        let statusText = 'Статус: День открыт';

        if (localStatus.startTime) {
            const startDate = new Date(localStatus.startTime);
            const timeString = startDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            statusText = `Статус: День открыт (с ${timeString})`;
        }

        indicator.textContent = statusText;

        // 🔥 Custom style as requested: White badge, blue border, button shape
        indicator.className = ''; // Reset classes
        indicator.style.cssText = `
            background-color: #ffffff;
            border: 2px solid #2196F3;
            color: #2196F3;
            border-radius: 12px;
            padding: 12px;
            text-align: center;
            width: 100%;
            display: block;
            margin-top: 10px;
            font-weight: 600;
            box-sizing: border-box;
        `;

        if (isInspector) {
            indicator.classList.add('active-day'); // Голубая рамка
        } else {
            indicator.className = 'work-day-indicator open';
        }

    } else {
        // 🔴 День закрыт
        openBtn.disabled = false;
        closeBtn.disabled = true;

        if (isInspector) {
            openBtn.className = 'btn-blue'; // Активная - голубая
            closeBtn.className = 'btn-gray'; // Неактивная - серая
        }

        indicator.textContent = 'Статус: День закрыт';

        // 🔥 Custom style as requested: White badge, blue border, button shape
        indicator.className = ''; // Reset classes
        indicator.style.cssText = `
            background-color: #ffffff;
            border: 2px solid #2196F3;
            color: #2196F3;
            border-radius: 12px;
            padding: 12px;
            text-align: center;
            width: 100%;
            display: block;
            margin-top: 10px;
            font-weight: 600;
            box-sizing: border-box;
        `;

        if (isInspector) {
            indicator.classList.remove('active-day');
        } else {
            indicator.className = 'work-day-indicator closed';
        }
    }

    // 🔥 ОБНОВЛЯЕМ БЕЙДЖ ПОЛЬЗОВАТЕЛЯ
    updateSidebarUserInfo();
}

// 🔥 ФУНКЦИЯ ОБНОВЛЕНИЯ БЕЙДЖА ПОЛЬЗОВАТЕЛЯ
function updateSidebarUserInfo() {
    const sidebar = document.getElementById('sidebar');
    const workDaySection = document.getElementById('workDaySection');

    if (!sidebar) return;

    let badge = document.getElementById('userSidebarBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'userSidebarBadge';
        badge.className = 'user-badge';
        // Вставляем перед секцией управления днем или перед админской секцией
        const target = workDaySection || document.getElementById('adminSection');
        if (target) {
            sidebar.insertBefore(badge, target);
        } else {
            // Если секций нет, вставляем после хедера
            const header = sidebar.querySelector('.header');
            if (header) {
                header.after(badge);
            }
        }
    }

    // 🔥 ПОЛУЧАЕМ ЭМОДЗИ ИНСПЕКТОРА
    // Используем getInspectorStyle, так как он уже умеет работать с конфигом и имеет фоллбэк
    const style = getInspectorStyle(currentUser);
    const userIcon = style.icon || '👤';

    badge.innerHTML = `
        <div class="user-badge-label">ПОЛЬЗОВАТЕЛЬ</div>
        <div class="user-badge-name">
            <span style="font-size: 1.2rem;">${userIcon}</span> ${currentUser || 'Неизвестно'}
        </div>
        <div class="user-badge-label">РОЛЬ</div>
        <div class="user-badge-role">${userAccessRights || 'Гость'}</div>
    `;

    // 🔥 ОБНОВЛЕНИЕ ПАНЕЛИ СТАТИСТИКИ (СКРЫТИЕ ЗАГОЛОВКА, КНОПКА ВЫХОДА)
    updateStatsPanelUI();
}

function updateStatsPanelUI() {
    const statsPanel = document.querySelector('.stats');
    if (!statsPanel) return;

    // 1. Убираем текст "📊 Статистика:"
    // Перебираем узлы и удаляем текстовые узлы, содержащие "Статистика"
    Array.from(statsPanel.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Статистика')) {
            node.remove();
        }
        // Также удаляем div с текстом, если он есть (вдруг структура поменялась)
        if (node.nodeType === Node.ELEMENT_NODE && node.textContent.includes('Статистика') && node.tagName === 'DIV' && !node.id) {
            // Проверяем, что это не счетчик
            if (!node.id) node.style.display = 'none';
        }
    });

    // 2. Скрываем текстовые счетчики
    const counters = ['objectsCounter', 'completedCounter', 'activeCounter'];
    counters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 3. Обновляем кнопку обновления (делаем голубой)
    const refreshBtn = statsPanel.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.classList.remove('force'); // Убираем оранжевый класс
        refreshBtn.classList.add('btn-blue'); // Добавляем голубой
        refreshBtn.style.marginBottom = '4px';
    }

    // 4. Добавляем кнопку выхода, если её нет
    let logoutBtn = document.getElementById('statsLogoutBtn');
    if (!logoutBtn) {
        logoutBtn = document.createElement('button');
        logoutBtn.id = 'statsLogoutBtn';
        logoutBtn.className = 'btn-red-soft';
        logoutBtn.textContent = 'Выйти';
        logoutBtn.onclick = logout;
        statsPanel.appendChild(logoutBtn);
    }
}

let pendingWorkDayAction = null;

function openWorkDayApproval(type) {
    pendingWorkDayAction = type;
    const overlay = document.getElementById('workDayApprovalOverlay');
    const content = document.getElementById('workDayApprovalContent');
    if (!overlay || !content) return;
    try {
        const sidebar = document.getElementById('sidebar');
        if (checkMobileDevice() && sidebar && sidebar.classList.contains('mobile-open')) {
            toggleMobileSidebar();
        }
    } catch (_) { }
    const title = type === 'start' ? 'Согласование открытия рабочего дня' : 'Согласование закрытия рабочего дня';
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    content.innerHTML = `
                <div style="font-weight:700; font-size:1rem;">${title}</div>
                <div>Пользователь: <b>${currentUser}</b></div>
                <div>Время: ${time}</div>
                <textarea id="workDayComment" placeholder="Комментарий (необязательно)" style="width:100%; min-height:60px; border:1px solid #dfe6e9; border-radius:8px; padding:8px;"></textarea>
                <div class="workday-actions">
                    <button class="btn btn-primary" onclick="confirmWorkDayApproval()">Подтвердить</button>
                    <button class="btn btn-secondary" onclick="closeWorkDayApproval(true)">Отмена</button>
                </div>
            `;
    overlay.classList.remove('hidden');
}

function closeWorkDayApproval(isCancelled = false) {
    const overlay = document.getElementById('workDayApprovalOverlay');
    if (overlay) overlay.classList.add('hidden');
    // 🔥 Revert optimistic update if cancelled
    if (isCancelled && window.revertWorkDayState) {
        window.revertWorkDayState();
        window.revertWorkDayState = null;
        pendingWorkDayAction = null; // Clear action on cancel
    }
}

function confirmWorkDayApproval() {
    const comment = document.getElementById('workDayComment')?.value || '';
    const action = pendingWorkDayAction; // Save action before closing
    closeWorkDayApproval(false); // Not cancelled

    if (action === 'start') {
        startWorkDayExecute(comment);
    } else if (action === 'end') {
        endWorkDayExecute(comment);
    }
    pendingWorkDayAction = null;
}

window.closeWorkDayApproval = closeWorkDayApproval;
window.confirmWorkDayApproval = confirmWorkDayApproval;
window.openWorkDayApproval = openWorkDayApproval;

function startWorkDay() {
    if (userAccessRights === 'Император' || userAccessRights === 'Администратор') {
        showNotification('❌ Администратор не может открывать рабочий день', 'error');
        return;
    }

    if (isWorkDayOpen) {
        showNotification('ℹ️ Рабочий день уже открыт', 'success');
        return;
    }

    openWorkDayApproval('start');
}

function startWorkDayExecute(comment) {
    if (!navigator.geolocation) {
        showNotification('❌ Геолокация не поддерживается браузером', 'error');
        return;
    }

    showNotification('🔄 Открываем рабочий день...', 'success');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latRounded = Number(position.coords.latitude).toFixed(4);
            const lonRounded = Number(position.coords.longitude).toFixed(4);
            const coords = `${latRounded}, ${lonRounded}`;
            const startTime = new Date().toISOString();

            const callbackName = 'startWorkDayCallback_' + Date.now();

            const cleanupCallback = function () {
                setTimeout(() => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                    }
                }, 10000);
            };

            window[callbackName] = function (result) {
                cleanupCallback();
                if (result.success) {
                    isWorkDayOpen = true;

                    saveWorkDayStatus(true, startTime);

                    updateWorkDayButtons();
                    showNotification(`✅ Рабочий день открыт!`, 'success');
                } else {
                    showNotification('❌ Ошибка: ' + result.message, 'error');
                }
            };

            const parts = String(coords).split(',');
            const lat = (parts[0] || '').trim();
            const lon = (parts[1] || '').trim();
            const url = `${SCRIPT_URL}?action=startWorkDay&inspector=${encodeURIComponent(currentUser)}&coords=${encodeURIComponent(coords)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&open_coordinates=${encodeURIComponent(coords)}&open_comment=${encodeURIComponent(comment)}&time=${encodeURIComponent(startTime)}&note=open&sheet_id=${DEFAULT_SHEET_ID}&callback=${callbackName}`;
            const script = document.createElement('script');
            script.src = url;
            script.onerror = function () {
                cleanupCallback();
                if (window.revertWorkDayState) window.revertWorkDayState(); // 🔥 Revert on error
                showNotification('❌ Ошибка соединения с сервером', 'error');
            };
            document.head.appendChild(script);
            cleanupCallback();
        },
        (error) => {
            if (window.revertWorkDayState) window.revertWorkDayState(); // 🔥 Revert on error
            showNotification('❌ Не удалось получить местоположение', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

function endWorkDay() {
    if (userAccessRights === 'Император' || userAccessRights === 'Администратор') {
        showNotification('❌ Администратор не может закрывать рабочий день', 'error');
        return;
    }

    if (!isWorkDayOpen) {
        showNotification('ℹ️ Рабочий день уже закрыт', 'success');
        return;
    }
    openWorkDayApproval('end');
}

function endWorkDayExecute(comment) {
    if (!navigator.geolocation) {
        showNotification('❌ Геолокация не поддерживается браузером', 'error');
        return;
    }
    showNotification('🔄 Закрываем рабочий день...', 'success');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latRounded = Number(position.coords.latitude).toFixed(4);
            const lonRounded = Number(position.coords.longitude).toFixed(4);
            const coords = `${latRounded}, ${lonRounded}`;

            const callbackName = 'endWorkDayCallback_' + Date.now();

            const cleanupCallback = function () {
                setTimeout(() => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                    }
                }, 10000);
            };

            window[callbackName] = function (result) {
                cleanupCallback();
                if (result.success) {
                    isWorkDayOpen = false;

                    saveWorkDayStatus(false);

                    updateWorkDayButtons();
                    showNotification(`✅ Рабочий день закрыт!`, 'success');
                } else {
                    showNotification('❌ Ошибка: ' + result.message, 'error');
                }
            };

            const parts = String(coords).split(',');
            const lat = (parts[0] || '').trim();
            const lon = (parts[1] || '').trim();
            const url = `${SCRIPT_URL}?action=endWorkDay&inspector=${encodeURIComponent(currentUser)}&coords=${encodeURIComponent(coords)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&close_coordinates=${encodeURIComponent(coords)}&close_comment=${encodeURIComponent(comment)}&time=${encodeURIComponent(new Date().toISOString())}&note=close&sheet_id=${DEFAULT_SHEET_ID}&callback=${callbackName}`;
            const script = document.createElement('script');
            script.src = url;
            script.onerror = function () {
                cleanupCallback();
                if (window.revertWorkDayState) window.revertWorkDayState(); // 🔥 Revert on error
                showNotification('❌ Ошибка соединения с сервером', 'error');
            };
            document.head.appendChild(script);
            cleanupCallback();
        },
        (error) => {
            if (window.revertWorkDayState) window.revertWorkDayState(); // 🔥 Revert on error
            showNotification('❌ Не удалось получить местоположение', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// 🔥 АДМИНИСТРАТИВНЫЕ ФУНКЦИИ
function toggleInspectorsHomes() {
    showInspectorsHomes = !showInspectorsHomes;
    updateInspectorsHomesLayer();
    showNotification(showInspectorsHomes ? '🏠 Дома инспекторов показаны' : '🏠 Дома инспекторов скрыты', 'success');
}

function updateInspectorsHomesLayer() {
    inspectorsHomesLayer.removeAll();

    if (showInspectorsHomes && (userAccessRights === 'Император' || userAccessRights === 'Администратор')) {
        const homeFeatures = Object.keys(window.INSPECTOR_HOMES || {}).map(inspector => {
            const home = window.INSPECTOR_HOMES[inspector];
            const style = getInspectorStyle(inspector);

            return {
                type: 'Feature',
                id: 'home_' + inspector,
                geometry: {
                    type: 'Point',
                    coordinates: [home.lat, home.lon]
                },
                properties: {
                    hintContent: `🏠 ${inspector}`,
                    balloonContent: `
                                <div style="padding: 10px; min-width: 250px;">
                                    <h3>🏠 ${inspector}</h3>
                                    <p><strong>Адрес:</strong> ${home.address}</p>
                                    <p><strong>Координаты:</strong> ${home.lat}, ${home.lon}</p>
                                    <p><strong>Статус:</strong> ${getStatusText(style.status)}</p>
                                </div>
                            `
                },
                options: {
                    preset: 'islands#blueHomeIcon',
                    iconColor: style.status === 'active' ? style.color : '#808080'
                }
            };
        });

        inspectorsHomesLayer.add({
            type: 'FeatureCollection',
            features: homeFeatures
        });
    }
}

function probeUrl(url, timeoutMs) {
    return new Promise((resolve) => {
        let done = false;
        const t = setTimeout(() => { if (done) return; done = true; resolve(false); }, timeoutMs || 2000);
        try {
            fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(() => { if (done) return; done = true; clearTimeout(t); resolve(true); }).catch(() => { if (done) return; done = true; clearTimeout(t); resolve(false); });
        } catch (_) {
            if (done) return; done = true; clearTimeout(t); resolve(false);
        }
    });
}

async function openDashboardsApp() {
    try {
        const canOpen = (userAccessRights === 'Император' || userAccessRights === 'Администратор');
        if (!canOpen) {
            showNotification('❌ Доступно только администратору/императору', 'error');
            return;
        }
        const base = (location && location.origin ? location.origin : '') + '/Приложение 2/';
        const w = window.open(base, '_blank');
        if (!w) { window.location.href = base; }
    } catch (e) {
        showNotification('❌ Не удалось открыть презентации', 'error');
    }
}

async function openDashboardsAppFor(objectId) {
    try {
        const canOpen = (userAccessRights === 'Император' || userAccessRights === 'Администратор');
        if (!canOpen) {
            showNotification('❌ Доступно только администратору/императору', 'error');
            return;
        }
        const params = new URLSearchParams();
        params.set('object_id', String(objectId));
        const base = (location && location.origin ? location.origin : '') + '/Приложение 2/';
        const url = base + '?' + params.toString();
        const w = window.open(url, '_blank');
        if (!w) { window.location.href = url; }
    } catch (e) {
        showNotification('❌ Не удалось открыть презентации', 'error');
    }
}

// 🔥 EXPOSE TO WINDOW
window.openDashboardsApp = openDashboardsApp;
window.openDashboardsAppFor = openDashboardsAppFor;

// 🔥 УПРАВЛЕНИЕ МЕНЮ
function closeAllMenus() {
    const managementMenu = document.getElementById('inspectorManagementMenu');
    if (managementMenu) {
        managementMenu.classList.remove('active');
    }
    activeMenu = null;
}

function toggleInspectorsManagement() {
    const menu = document.getElementById('inspectorManagementMenu');
    if (!menu) return;

    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
        activeMenu = null;
    } else {
        closeAllMenus();
        menu.classList.add('active');
        activeMenu = 'management';
        updateInspectorManagementContent();

        // Add swipe LEFT handler
        if (!menu.hasAttribute('data-swipe-enabled')) {
            menu.setAttribute('data-swipe-enabled', 'true');
            let startX = 0, currentX = 0, isDragging = false;
            const handleTouchStart = (e) => {
                startX = e.touches[0].clientX; isDragging = true;
                menu.style.willChange = 'transform';
            };
            const handleTouchMove = (e) => {
                if (!isDragging) return;
                currentX = e.touches[0].clientX; const deltaX = currentX - startX;
                if (deltaX < 0) requestAnimationFrame(() => {
                    menu.style.transform = `translateX(${deltaX}px)`;
                });
            };
            const handleTouchEnd = () => {
                if (!isDragging) return;
                isDragging = false; menu.style.willChange = 'auto';
                const deltaX = currentX - startX;
                if (deltaX < -100) {
                    menu.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    menu.style.transform = 'translateX(-100%)';
                    setTimeout(() => {
                        // Direct close to avoid jerking
                        menu.classList.remove('active');
                        activeMenu = null;
                        menu.style.transition = '';
                        menu.style.transform = '';
                    }, 300);
                } else {
                    menu.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    menu.style.transform = '';
                    setTimeout(() => menu.style.transition = '', 300);
                }
            };
            menu.addEventListener('touchstart', handleTouchStart, { passive: true });
            menu.addEventListener('touchmove', handleTouchMove, { passive: false });
            menu.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    }
}

// Close hamburger menu only (doesn't toggle)
function closeHamburgerMenu() {
    const modal = document.getElementById('navModal');
    const overlay = document.getElementById('navModalOverlay');
    const hamburgerBtn = document.querySelector('.hamburger-btn');

    if (!modal || !overlay) return;

    if (modal.classList.contains('active')) {
        if (hamburgerBtn) hamburgerBtn.classList.remove('hidden');
        modal.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// Close the topmost visible menu (correct priority order)
function closeTopMenu() {

    // Priority: drawer > management > sidebar > nav modal
    const drawer = document.getElementById('addObjectDrawer');
    const managementMenu = document.getElementById('inspectorManagementMenu');
    const sidebar = document.getElementById('sidebar');
    const navModal = document.getElementById('navModal');

    // Check drawer first (highest z-index)
    if (drawer && drawer.classList.contains('open')) {
        closeAddObjectDrawer();
        return true;
    }

    // Then management menu
    if (managementMenu && managementMenu.classList.contains('active')) {
        toggleInspectorsManagement();
        return true;
    }

    // Then sidebar
    if (sidebar && sidebar.classList.contains('slide-in')) {
        toggleSidebar();
        return true;
    }

    // Finally nav modal
    if (navModal && navModal.classList.contains('active')) {
        closeHamburgerMenu();
        return true;
    }

    return false;
}

// 🔥 HAMBURGER MENU NAVIGATION
function toggleHamburgerMenu() {
    const modal = document.getElementById('navModal');
    const overlay = document.getElementById('navModalOverlay');
    if (!modal || !overlay) return;

    const isActive = modal.classList.contains('active');

    if (!isActive) {
        // Opening modal - populate user info
        if (currentUser) {
            const roleEl = document.getElementById('navUserRole');
            const nameEl = document.getElementById('navUserName');

            if (roleEl && nameEl) {
                const isAdmin = currentUser === 'Admin' || currentUser.includes('Император');

                // Determine Role Text
                let roleText = 'Инспектор';
                if (currentUser === 'Admin') {
                    roleText = 'Император';
                } else if (isAdmin) {
                    roleText = 'Администратор';
                }

                // Get assigned emoji from config
                let userEmoji = '👤';
                try {
                    const style = getInspectorStyle(currentUser);
                    if (style && style.icon) {
                        if (window.INSPECTORS_CONFIG && window.INSPECTORS_CONFIG[currentUser]) {
                            const config = window.INSPECTORS_CONFIG[currentUser];
                            if (config.icon) userEmoji = config.icon;
                        } else {
                            if (style.icon && !style.icon.includes('/') && !style.icon.includes('.')) {
                                userEmoji = style.icon;
                            }
                        }
                    }
                    if (currentUser === 'Admin') userEmoji = '👑';
                } catch (e) {
                    console.error('Error getting user emoji:', e);
                }

                roleEl.textContent = roleText;
                nameEl.textContent = `${userEmoji} ${currentUser}`;
            }
        }
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        if (hamburgerBtn) hamburgerBtn.classList.add('hidden');

        modal.classList.add('active');
        overlay.classList.add('active');

        // Swipe handler for nav modal (ONLY swipe DOWN from top bar)
        if (!modal.hasAttribute('data-swipe-enabled')) {
            modal.setAttribute('data-swipe-enabled', 'true');
            let startY = 0, currentY = 0, isDragging = false;

            const handleTouchStart = (e) => {
                const rect = modal.getBoundingClientRect();
                // Only from top 60px
                if (e.touches[0].clientY - rect.top > 60) return;
                startY = e.touches[0].clientY;
                isDragging = true;
                modal.classList.add('swiping');
                modal.style.willChange = 'transform, opacity';
            };

            const handleTouchMove = (e) => {
                if (!isDragging) return;
                currentY = e.touches[0].clientY;
                const deltaY = currentY - startY;

                // Only allow downward swipe
                if (deltaY > 0) {
                    requestAnimationFrame(() => {
                        modal.style.transform = `translate(-50%, calc(-50% + ${deltaY}px)) scale(1)`;
                        modal.style.opacity = Math.max(0.3, 1 - deltaY / 300);
                    });
                }
            };

            const handleTouchEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                modal.classList.remove('swiping');
                modal.style.willChange = 'auto';
                const deltaY = currentY - startY;

                if (deltaY > 100) {
                    modal.classList.add('dismissing');
                    setTimeout(() => {
                        closeHamburgerMenu();
                        modal.classList.remove('dismissing');
                        modal.style.transform = '';
                        modal.style.opacity = '';
                    }, 400);
                } else {
                    modal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s ease';
                    modal.style.transform = 'translate(-50%, -50%) scale(1)';
                    modal.style.opacity = '';
                    setTimeout(() => modal.style.transition = '', 300);
                }
            };

            modal.addEventListener('touchstart', handleTouchStart, { passive: true });
            modal.addEventListener('touchmove', handleTouchMove, { passive: false });
            modal.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    } else {
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        if (hamburgerBtn) hamburgerBtn.classList.remove('hidden');

        modal.classList.remove('active');
        overlay.classList.remove('active');
    }
}

function selectNavItem(item) {

    const modal = document.getElementById('navModal');
    const overlay = document.getElementById('navModalOverlay');
    const sidebar = document.getElementById('sidebar');
    const managementMenu = document.getElementById('inspectorManagementMenu');
    const mainContainer = document.getElementById('mainContainer');

    // Close hamburger menu
    if (modal) modal.classList.remove('active');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    if (hamburgerBtn) hamburgerBtn.classList.remove('hidden');
    if (overlay) overlay.classList.remove('active');

    if (item === 'map') {
        // Hide sidebar, show only map
        if (sidebar) {
            sidebar.style.display = 'none';
        }
        if (managementMenu) {
            managementMenu.classList.remove('active');
        }
        activeMenu = null;
    } else if (item === 'menu') {

        // 🔥 КРИТИЧЕСКИЙ ФИК: Если сайдбар УЖЕ открыт - НЕ переоткрывать!
        const isAlreadyOpen = sidebar && sidebar.classList.contains('slide-in');
        if (isAlreadyOpen) {
            // Already open, don't reopen
            return; // Просто выходим
        }

        // Show sidebar with slide-in animation
        if (sidebar) {
            sidebar.style.display = 'flex';
            // Trigger animation
            setTimeout(() => {
                sidebar.classList.add('slide-in');
            }, 10);

            // Add swipe LEFT handler (same as in toggleSidebar)
            if (!sidebar.hasAttribute('data-swipe-enabled')) {
                sidebar.setAttribute('data-swipe-enabled', 'true');
                let startX = 0, currentX = 0, isDragging = false;
                const handleTouchStart = (e) => {
                    // 🔥 КРИТИЧЕСКИЙ ФИК: Игнорируем touch на интерактивных элементах
                    const target = e.target;
                    if (target.closest('.tab-button') ||
                        target.closest('button') ||
                        target.closest('input') ||
                        target.closest('select') ||
                        target.closest('a')) {
                        return; // Ignore swipe on interactive elements // Не обрабатываем как свайп
                    }

                    startX = e.touches[0].clientX;
                    isDragging = true;
                    sidebar.style.willChange = 'transform';
                };
                const handleTouchMove = (e) => {
                    if (!isDragging) return;
                    currentX = e.touches[0].clientX; const deltaX = currentX - startX;
                    if (deltaX < 0) requestAnimationFrame(() => {
                        sidebar.style.transform = `translateX(${deltaX}px)`;
                    });
                };
                const handleTouchEnd = () => {
                    if (!isDragging) return;
                    isDragging = false; sidebar.style.willChange = 'auto';
                    const deltaX = currentX - startX;
                    if (deltaX < -100) {
                        sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                        sidebar.style.transform = 'translateX(-100%)';
                        setTimeout(() => {
                            // Direct close
                            sidebar.classList.remove('slide-in');
                            const hamburgerBtn = document.querySelector('.hamburger-btn');
                            if (hamburgerBtn) hamburgerBtn.classList.remove('hidden');
                            setTimeout(() => {
                                if (!sidebar.classList.contains('slide-in')) {
                                    sidebar.style.display = 'none';
                                }
                                sidebar.style.transition = '';
                                sidebar.style.transform = '';
                            }, 300);
                        }, 0);
                    } else {
                        sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                        sidebar.style.transform = '';
                        setTimeout(() => sidebar.style.transition = '', 300);
                    }
                };
                sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
                sidebar.addEventListener('touchmove', handleTouchMove, { passive: false });
                sidebar.addEventListener('touchend', handleTouchEnd, { passive: true });
            }
        }
        // Hide hamburger when sidebar is open
        if (hamburgerBtn) hamburgerBtn.classList.add('hidden');

        if (mainContainer) {
            mainContainer.style.display = 'flex';
        }
        if (managementMenu) {
            managementMenu.classList.remove('active');
        }
        activeMenu = null;
    }
}

// Close modal when clicking outside
document.addEventListener('click', function (event) {
    const modal = document.getElementById('navModal');
    const hamburger = document.getElementById('hamburgerBtn');

    if (!modal || !hamburger) return;

    if (!hamburger.contains(event.target) && !modal.contains(event.target) && modal.classList.contains('active')) {
        toggleHamburgerMenu();
    }
});

// 🔥 SIDEBAR & DRAWER AUTO-CLOSE: Robust version using Capture Phase
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('sidebar');
    const drawer = document.getElementById('addObjectDrawer');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    let handled = false;

    // 1. Handle Sidebar - ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ДИАГНОСТИКИ
    /*
    if (sidebar && sidebar.classList.contains('slide-in')) {
        // 🔥 Если клик внутри сайдбара - НЕ закрывать!
        // Проверяем: сам элемент или любой родитель является сайдбаром
        // if (sidebar.contains(event.target)) {
        //     return; // Клик внутри сайдбара - ничего не делаем
        // }

        // Если клик СНАРУЖИ сайдбара - закрыть
        toggleSidebar();
        handled = true;
    }
    */

    // 2. Handle Add Object Drawer
    if (drawer && drawer.classList.contains('open')) {
        // If click is OUTSIDE drawer
        if (!drawer.contains(event.target)) {
            closeAddObjectDrawer();
            handled = true;
        }
    }

    if (handled) {
        event.stopPropagation(); // Prevent map click or button click
        // event.preventDefault(); // Optional: might prevent default button actions
    }
}, true); // 🔥 true = Capture Phase

function toggleSidebar() {

    // 🔥 КРИТИЧЕСКИЙ ФИК: Блокируем закрытие во время переключения вкладок
    if (window._sidebarSwitchLock) {
        return; // Blocked during tab switching // Просто выходим, ничего не делаем
    }

    const sidebar = document.getElementById('sidebar');
    const mainContainer = document.getElementById('mainContainer');

    if (!sidebar) return;

    const isVisible = sidebar.classList.contains('slide-in');

    if (isVisible) {
        // Close sidebar
        sidebar.classList.remove('slide-in');

        // Show hamburger when sidebar closes
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        if (hamburgerBtn) hamburgerBtn.classList.remove('hidden');

        // Wait for animation to finish before hiding
        setTimeout(() => {
            if (!sidebar.classList.contains('slide-in')) {
                sidebar.style.display = 'none';
            }
        }, 300);
    } else {
        // Open sidebar
        sidebar.style.display = 'flex';
        if (mainContainer) mainContainer.style.display = 'flex';

        // Hide hamburger when sidebar opens
        const hamburgerBtn = document.querySelector('.hamburger-btn');
        if (hamburgerBtn) hamburgerBtn.classList.add('hidden');

        // Trigger animation
        setTimeout(() => {
            sidebar.classList.add('slide-in');
        }, 10);

        // Add swipe LEFT handler
        if (!sidebar.hasAttribute('data-swipe-enabled')) {
            sidebar.setAttribute('data-swipe-enabled', 'true');
            let startX = 0, currentX = 0, isDragging = false;
            const handleTouchStart = (e) => {
                startX = e.touches[0].clientX; isDragging = true;
                sidebar.style.willChange = 'transform';
            };
            const handleTouchMove = (e) => {
                if (!isDragging) return;
                currentX = e.touches[0].clientX; const deltaX = currentX - startX;
                if (deltaX < 0) requestAnimationFrame(() => {
                    sidebar.style.transform = `translateX(${deltaX}px)`;
                });
            };
            const handleTouchEnd = () => {
                if (!isDragging) return;
                isDragging = false; sidebar.style.willChange = 'auto';
                const deltaX = currentX - startX;
                if (deltaX < -100) {
                    sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    sidebar.style.transform = 'translateX(-100%)';
                    setTimeout(() => {
                        // Direct close to avoid jerking
                        sidebar.classList.remove('slide-in');
                        const hamburgerBtn = document.querySelector('.hamburger-btn');
                        if (hamburgerBtn) hamburgerBtn.classList.remove('hidden');
                        setTimeout(() => {
                            if (!sidebar.classList.contains('slide-in')) {
                                sidebar.style.display = 'none';
                            }
                            sidebar.style.transition = '';
                            sidebar.style.transform = '';
                        }, 300);
                    }, 0);
                } else {
                    sidebar.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    sidebar.style.transform = '';
                    setTimeout(() => sidebar.style.transition = '', 300);
                }
            };
            sidebar.addEventListener('touchstart', handleTouchStart, { passive: true });
            sidebar.addEventListener('touchmove', handleTouchMove, { passive: false });
            sidebar.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    }
}

function closeInspectorManagement() {
    const menu = document.getElementById('inspectorManagementMenu');
    if (menu) {
        menu.classList.remove('active');
    }
    activeMenu = null;
}

// 🔥 УПРАВЛЕНИЕ ИНСПЕКТОРАМИ - УЛУЧШЕННАЯ ВЕРСИЯ
// 🔥 GLOBAL REGISTRY FOR INSPECTOR HANDLERS
window.inspectorHandlers = {};

function updateInspectorManagementContent() {
    const managementContent = document.getElementById('inspectorManagementContent');
    managementContent.innerHTML = '';
    window.inspectorHandlers = {}; // Clear old handlers

    const inspectors = Object.keys(window.INSPECTORS_CONFIG || {});

    // 🔥 Split inspectors into groups
    const unavailableInspectors = [];
    const activeInspectors = [];

    inspectors.forEach(inspector => {
        const style = getInspectorStyle(inspector);
        if (style.status === 'vacation' || style.status === 'sick') {
            unavailableInspectors.push(inspector);
        } else {
            activeInspectors.push(inspector);
        }
    });

    // Helper to render accordion item
    const renderInspectorItem = (inspector, index) => {
        const style = getInspectorStyle(inspector);
        const inspId = (inspector || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const handlerId = `h_${index}_${inspId}`; // Unique ID
        window.inspectorHandlers[handlerId] = inspector;

        let statusIcon = '';
        if (style.status === 'active') statusIcon = '🟢';
        else if (style.status === 'vacation') statusIcon = '🏖️';
        else if (style.status === 'sick') statusIcon = '🤒';

        return `
            <div class="accordion">
                <div class="accordion-header" onclick="toggleAccordion(this)">
                    <div class="accordion-title">
                        ${style.icon} ${inspector}
                    </div>
                    <div class="accordion-meta">
                        <span class="status-icon-header">${statusIcon}</span>
                        <span>▼</span>
                    </div>
                </div>
                <div class="accordion-content">
                    <div class="management-tabs">
                        <button class="tab-btn" onclick="showManagementTab('${handlerId}','status')">Статус</button>
                        <button class="tab-btn" onclick="showManagementTab('${handlerId}','color')">Цвет</button>
                        <button class="tab-btn" onclick="showManagementTab('${handlerId}','icon')">Иконка</button>
                    </div>
                    <div class="tab-section" id="tab_${handlerId}_status">${createStatusSection(inspector, style, handlerId)}</div>
                    <div class="tab-section hidden" id="tab_${handlerId}_color">${createColorSection(inspector, style, handlerId)}</div>
                    <div class="tab-section hidden" id="tab_${handlerId}_icon">${createIconSection(inspector, style, handlerId)}</div>

                    <button class="apply-changes-btn hidden" id="applyBtn_${handlerId}" onclick="applyInspectorChanges(window.inspectorHandlers['${handlerId}'])">Применить изменения</button>
                </div>
            </div>
        `;
    };

    // Render Unavailable Section
    if (unavailableInspectors.length > 0) {
        const unavailableSection = document.createElement('div');
        unavailableSection.className = 'management-group';
        unavailableSection.innerHTML = `<div class="management-group-title">🌴 Отсутствующие</div>`;
        unavailableInspectors.forEach((inspector, i) => {
            unavailableSection.innerHTML += renderInspectorItem(inspector, 'u' + i);
        });
        managementContent.appendChild(unavailableSection);
    }

    // Render Active Section
    const activeSection = document.createElement('div');
    activeSection.className = 'management-group';
    activeSection.innerHTML = `<div class="management-group-title">⚡ Активные</div>`;
    activeInspectors.forEach((inspector, i) => {
        activeSection.innerHTML += renderInspectorItem(inspector, 'a' + i);
    });
    managementContent.appendChild(activeSection);
}

function createStatusSection(inspector, style, handlerId) {
    const statusMap = {
        'active': '🟢 Активен',
        'vacation': '🏖️ В отпуске',
        'sick': '🤒 На больничном'
    };
    const currentStatusText = statusMap[style.status] || '🟢 Активен';

    return `
        <div class="management-section">
            <div class="management-section-title"></div>
            <div class="custom-select-container" id="customSelect_${handlerId}_status">
                <div class="select-selected" onclick="window.toggleCustomSelect('${handlerId}', 'status')">
                    ${currentStatusText}
                </div>
                <div class="select-items select-hide">
                    <div onclick="window.selectCustomOption('${handlerId}', 'status', 'active', '🟢 Активен')">🟢 Активен</div>
                    <div onclick="window.selectCustomOption('${handlerId}', 'status', 'vacation', '🏖️ В отпуске')">🏖️ В отпуске</div>
                    <div onclick="window.selectCustomOption('${handlerId}', 'status', 'sick', '🤒 На больничном')">🤒 На больничном</div>
                </div>
                </div>
            </div>
        </div>
    `;
}

// 🔥 Define functions locally first so they can be exported
function toggleCustomSelect(handlerId, type) {
    const container = document.getElementById(`customSelect_${handlerId}_${type}`);
    if (!container) return;

    const items = container.querySelector('.select-items');
    const selected = container.querySelector('.select-selected');

    // Close all other selects
    closeAllCustomSelects(selected);

    items.classList.toggle('select-show');
    items.classList.toggle('select-hide');
    selected.classList.toggle('select-arrow-active');
}

function selectCustomOption(handlerId, type, value, text) {
    const container = document.getElementById(`customSelect_${handlerId}_${type}`);
    const selected = container.querySelector('.select-selected');

    selected.innerHTML = text;
    updateInspectorConfig(window.inspectorHandlers[handlerId], type, value);

    // Close dropdown
    toggleCustomSelect(handlerId, type);
}

function closeAllCustomSelects(elmnt) {
    const items = document.getElementsByClassName("select-items");
    const selected = document.getElementsByClassName("select-selected");
    const arrNo = [];

    for (let i = 0; i < selected.length; i++) {
        if (elmnt == selected[i]) {
            arrNo.push(i);
        } else {
            selected[i].classList.remove("select-arrow-active");
        }
    }

    for (let i = 0; i < items.length; i++) {
        if (arrNo.indexOf(i)) {
            items[i].classList.remove("select-show");
            items[i].classList.add("select-hide");
        }
    }
}

// 🔥 Expose to window for HTML attributes
window.toggleCustomSelect = toggleCustomSelect;
window.selectCustomOption = selectCustomOption;
window.closeAllCustomSelects = closeAllCustomSelects;

// Close custom selects when clicking outside
document.addEventListener("click", function (e) {
    if (!e.target.closest('.custom-select-container')) {
        window.closeAllCustomSelects();
    }
});

function createColorSection(inspector, style, handlerId) {
    let colorOptions = '';
    availableColors.forEach(color => {
        const isSelected = style.color === color;
        colorOptions += `
                    <div class="color-option ${isSelected ? 'selected' : ''}" 
                         style="background-color: ${color}"
                         onclick="selectColor(window.inspectorHandlers['${handlerId}'], '${color}')"
                         title="${color}">
                    </div>
                `;
    });

    return `
                <div class="management-section">
                    <div class="management-section-title"></div>
                    <div class="color-palette">
                        ${colorOptions}
                    </div>
                </div>
            `;
}

function createIconSection(inspector, style, handlerId) {
    let iconOptions = '';
    let currentIconText = '-- Выберите иконку --';

    Object.keys(availableIcons).forEach(key => {
        const val = availableIcons[key];
        // 🔥 IMPROVED EMOJI DETECTION: Check if key is short (likely emoji) and value is long (name)
        // OR if key matches emoji regex (including simple stars/sparkles)
        const isKeyEmoji = key.length <= 2 || /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}]/u.test(key);

        const name = isKeyEmoji ? String(val) : String(key);
        const emoji = isKeyEmoji ? String(key) : String(val);

        if (style.icon === emoji) {
            currentIconText = `${name} ${emoji}`;
        }

        iconOptions += `<div onclick="window.selectCustomOption('${handlerId}', 'icon', '${emoji}', '${name} ${emoji}')">${name} ${emoji}</div>`;
    });

    return `
        <div class="management-section">
            <div class="management-section-title"></div>
            <div class="custom-select-container" id="customSelect_${handlerId}_icon">
                <div class="select-selected" onclick="window.toggleCustomSelect('${handlerId}', 'icon')">
                    ${currentIconText}
                </div>
                <div class="select-items select-hide" style="max-height: 200px; overflow-y: auto;">
                    ${iconOptions}
                </div>
            </div>
        </div>
    `;
}

function selectColor(inspector, color) {
    console.log(`🎨 selectColor called for: ${inspector}, color: ${color}`);
    if (!inspector) {
        console.error('❌ Inspector is undefined in selectColor');
        return;
    }
    updateInspectorConfig(inspector, 'color', color);

    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        if (header && header.textContent.includes(inspector)) {
            const colorOptions = accordion.querySelectorAll('.color-option');
            colorOptions.forEach(option => {
                option.classList.remove('selected');
                if (option.style.backgroundColor === color) {
                    option.classList.add('selected');
                }
            });

            const colorPreview = accordion.querySelector('.color-preview');
            if (colorPreview) {
                colorPreview.style.backgroundColor = color;
            }
        }
    });
}

function getStatusIcon(status) {
    const icons = {
        'active': '🟢',
        'vacation': '🏖️',
        'sick': '🤒'
    };
    return icons[status] || '🟢';
}

window.PENDING_INSPECTOR_CHANGES = {};

function updateInspectorConfig(inspector, key, value) {
    console.log(`🔄 Обновление ${key} для ${inspector}:`, value);

    if (!window.PENDING_INSPECTOR_CHANGES[inspector]) {
        // Initialize with current config copy
        window.PENDING_INSPECTOR_CHANGES[inspector] = Object.assign({}, window.INSPECTORS_CONFIG[inspector] || { status: 'active', color: '#3498db', icon: '👤' });
    }
    window.PENDING_INSPECTOR_CHANGES[inspector][key] = value;

    // Show apply button for this inspector
    const handlerId = Object.keys(window.inspectorHandlers).find(id => window.inspectorHandlers[id] === inspector);
    if (handlerId) {
        const btn = document.getElementById(`applyBtn_${handlerId}`);
        if (btn) {
            btn.classList.remove('hidden');
            btn.classList.add('visible');
        }
    }

    // Update UI Previews (Accordion Header)
    if (key === 'status' || key === 'icon') {
        const list = document.querySelectorAll('#inspectorManagementContent .accordion');
        list.forEach(function (acc) {
            const header = acc.querySelector('.accordion-header');
            if (header && header.textContent.includes(inspector)) {
                // Construct style from pending + current
                const current = window.INSPECTORS_CONFIG[inspector] || { status: 'active', color: '#3498db', icon: '👤' };
                const pending = window.PENDING_INSPECTOR_CHANGES[inspector];
                const style = Object.assign({}, current, pending);

                header.innerHTML = `<div class="accordion-title">${style.icon} ${inspector}</div>
                                    <div class="accordion-meta">
                                        <span class="status-icon-header">${getStatusIcon(style.status)}</span>
                                        <span>▼</span>
                                    </div>`;
            }
        });
    }
}

function applyInspectorChanges(inspector) {
    // Read from pending changes, fallback to current config
    const pending = window.PENDING_INSPECTOR_CHANGES[inspector];
    const current = window.INSPECTORS_CONFIG[inspector] || { status: 'active', color: '#3498db', icon: '👤' };

    const config = pending ? Object.assign({}, current, pending) : current;

    console.log(`💾 Применение изменений для ${inspector}:`, config);

    // 🔥 ЕСЛИ СТАТУС ИЗМЕНИЛСЯ НА НЕАКТИВНЫЙ - ПЕРЕДАЕМ ОБЪЕКТЫ ADMIN (БЕЗ ПОДТВЕРЖДЕНИЯ)
    saveInspectorConfig(inspector, config, true);

    // Clear pending changes after apply
    if (window.PENDING_INSPECTOR_CHANGES[inspector]) {
        delete window.PENDING_INSPECTOR_CHANGES[inspector];
    }
}



function applyInactiveInspectorTransfer() {
    const cfg = window.INSPECTORS_CONFIG || cfg;
    const inactive = Object.keys(cfg).filter(function (name) {
        const s = cfg[name] && cfg[name].status;
        return s && s !== 'active';
    });
    if (inactive.length === 0) return 0;
    let count = 0;
    objectsData.forEach(function (obj) {
        if (inactive.includes(obj.inspector) && (!obj.exitTime || obj.exitTime === '')) {
            obj.inspector = 'Admin';
            count++;
        }
    });
    return count;
}

function saveInspectorConfig(inspector, config, applyChanges = false) {
    console.log(`💾 Сохранение конфигурации для ${inspector}:`, config);

    const callbackName = 'saveConfigCallback_' + Date.now();

    const cleanupCallback = function () {
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                console.log('✅ Callback очищен');
            }
        }, 10000);
    };

    window[callbackName] = function (result) {
        console.log('🟡 Ответ от сервера:', result);
        cleanupCallback();

        if (result.success) {
            console.log(`✅ Конфигурация сохранена для ${inspector}`);

            if (applyChanges) {
                window.INSPECTORS_CONFIG[inspector] = Object.assign({}, window.INSPECTORS_CONFIG[inspector] || {}, config);

                // 🔥 UPDATE LOCAL CACHE IMMEDIATELY
                updateLocalCache({ inspector: inspector, config: config });

                // 🔥 REMOVED LOCAL CACHE WRITE TO FORCE SERVER SYNC
                /*
                try {
                    const raw = localStorage.getItem(STORAGE_KEYS.INSPECTORS_CACHE);
                    const cache = raw ? JSON.parse(raw) : {};
                    cache[inspector] = Object.assign({}, cache[inspector] || {}, config, { _ts: Date.now() });
                    localStorage.setItem(STORAGE_KEYS.INSPECTORS_CACHE, JSON.stringify(cache));
                    localStorage.setItem(STORAGE_KEYS.INSPECTORS_CACHE_TIMESTAMP, String(Date.now()));
                } catch (_) { }
                */
                const inspectorBecameInactive = config.status && config.status !== 'active';

                if (inspectorBecameInactive) {
                    transferInspectorObjectsLocally(inspector);
                }

                // 🔥 НЕМЕДЛЕННОЕ ПРИМЕНЕНИЕ ИЗМЕНЕНИЙ К ВСЕМУ
                updateInspectorInFilters(inspector, config);

                // 🔥 FORCE UPDATE OBJECT OPTIONS DIRECTLY (Fix for blue map issue)
                console.log(`🎨 Force updating map objects for ${inspector} to color ${config.color}`);
                if (objectsData) {
                    objectsData.forEach(obj => {
                        if (obj.inspector === inspector) {
                            // Update in objectManager
                            if (objectManager && objectManager.objects.getById(obj.id)) {
                                objectManager.objects.setObjectOptions(obj.id, { iconColor: config.color });
                            }
                            // Update in activeObjectsLayer
                            if (activeObjectsLayer && activeObjectsLayer.objects.getById(obj.id)) {
                                activeObjectsLayer.objects.setObjectOptions(obj.id, { iconColor: config.color });
                            }
                        }
                    });
                }

                // 🔥 Применяем возможную передачу объектов для всех неактивных
                try { applyInactiveInspectorTransfer(); } catch (_) { }

                // 🔥 Оптимизированное обновление карты - объединяем все обновления в одно
                setTimeout(() => {
                    if (objectManager) objectManager.removeAll();
                    if (activeObjectsLayer) activeObjectsLayer.removeAll();
                    updateMap();
                    refreshPointSummaries();
                    forceStyleRefresh();
                }, 50);

                // 🔥 ОБНОВЛЯЕМ ДОМАШНИЕ ТОЧКИ
                if (showInspectorsHomes) {
                    toggleInspectorsHomes();
                    setTimeout(() => toggleInspectorsHomes(), 200);
                }
            }

            if (result.transferredObjects > 0) {
                showNotification(`✅ Конфигурация сохранена. Перенесено объектов: ${result.transferredObjects}`, 'success');
                // 🔥 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ПРИ ПЕРЕДАЧЕ ОБЪЕКТОВ
                setTimeout(() => loadData(), 1000);
            } else {
                showNotification(`✅ Настройки для ${inspector} применены`, 'success');
            }

            // 🔥 ЗАКРЫВАЕМ МЕНЮ ПОСЛЕ ПРИМЕНЕНИЯ
            setTimeout(() => {
                closeInspectorManagement();
            }, 500);

        } else {
            showNotification('❌ Ошибка сохранения: ' + result.message, 'error');
        }
    };

    const url = `${SCRIPT_URL}?action=saveInspectorConfig&inspector=${encodeURIComponent(inspector)}&config=${encodeURIComponent(JSON.stringify(config))}&status=${encodeURIComponent(config.status || '')}&color=${encodeURIComponent(config.color || '')}&icon=${encodeURIComponent(config.icon || '')}&sheet_id=${DEFAULT_SHEET_ID}&callback=${callbackName}`;
    const script = document.createElement('script');
    script.src = url;

    script.onerror = function () {
        console.error('❌ Ошибка загрузки скрипта');
        showNotification('❌ Ошибка соединения с сервером', 'error');
        cleanupCallback();
    };

    document.head.appendChild(script);
    cleanupCallback();
}

function updateInspectorInFilters(inspector, config) {
    const inspectorCheckbox = document.getElementById(`insp_${encodeURIComponent(inspector)}`);
    if (inspectorCheckbox) {
        const parent = inspectorCheckbox.parentNode;
        if (config.color) {
            const colorDot = parent.querySelector('.color-dot');
            if (colorDot) {
                colorDot.style.backgroundColor = config.color;
            }
        }
        if (config.icon) {
            const iconSpan = parent.querySelector('.inspector-icon');
            if (iconSpan) {
                iconSpan.textContent = config.icon;
            }
        }
    }
}

function filterManagementInspectors() {
    const searchText = document.getElementById('searchManagement').value.toLowerCase();
    const accordions = document.querySelectorAll('#inspectorManagementContent .accordion');

    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        const inspectorName = header.textContent.toLowerCase();

        if (inspectorName.includes(searchText)) {
            accordion.style.display = 'block';
        } else {
            accordion.style.display = 'none';
        }
    });
}

function toggleAccordion(header) {
    const content = header.nextElementSibling;
    const isActive = content.classList.contains('active');

    document.querySelectorAll('.accordion-content').forEach(acc => {
        acc.classList.remove('active');
    });

    if (!isActive) {
        content.classList.add('active');

        // 🔥 Auto-scroll to make content visible
        setTimeout(() => {
            content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300); // Wait for CSS transition if any, or just a small delay
    }
}

// 🔥 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function selectAllInspectors() {
    const inspectorCheckboxes = document.querySelectorAll('#inspectorsList input[type="checkbox"]');
    inspectorCheckboxes.forEach(checkbox => checkbox.checked = true);
    updateFilters();
    saveFilterState();
}

function deselectAllInspectors() {
    const inspectorCheckboxes = document.querySelectorAll('#inspectorsList input[type="checkbox"]');
    inspectorCheckboxes.forEach(checkbox => checkbox.checked = false);
    updateFilters();
    saveFilterState();
}


function filterInspectorsList() {
    const searchText = document.getElementById('searchInspectors').value.toLowerCase();
    const inspectorItems = document.querySelectorAll('#inspectorsList .checkbox-item');

    inspectorItems.forEach(item => {
        const label = item.querySelector('label');
        const inspectorName = label.textContent.toLowerCase();
        if (inspectorName.includes(searchText)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function selectAllLists() {
    const listCheckboxes = document.querySelectorAll('#listsList input[type="checkbox"]');
    listCheckboxes.forEach(checkbox => checkbox.checked = true);
    updateFilters();
    saveFilterState();
}

function deselectAllLists() {
    const listCheckboxes = document.querySelectorAll('#listsList input[type="checkbox"]');
    listCheckboxes.forEach(checkbox => checkbox.checked = false);
    updateFilters();
    saveFilterState();
}

function onInspectorChange() {
    checkSelectAllState(); // 🔥 Update Select All checkbox
    updateFilters();
    saveFilterState();
    updateListCounters();
}

function onListChange() {
    checkSelectAllState(); // 🔥 Update Select All checkbox
    updateFilters();
    saveFilterState();
}

// 🔥 ПРОВЕРКА СОСТОЯНИЯ ЧЕКБОКСОВ "ВЫДЕЛИТЬ ВСЕ"
function checkSelectAllState() {
    const allInspectors = document.querySelectorAll('#inspectorsList input[type="checkbox"]');
    const checkedInspectors = document.querySelectorAll('#inspectorsList input[type="checkbox"]:checked');
    const selectAllInspectors = document.getElementById('selectAllInspectorsCheckbox');
    if (selectAllInspectors) {
        selectAllInspectors.checked = allInspectors.length > 0 && allInspectors.length === checkedInspectors.length;
    }

    const allLists = document.querySelectorAll('#listsList input[type="checkbox"]');
    const checkedLists = document.querySelectorAll('#listsList input[type="checkbox"]:checked');
    const selectAllLists = document.getElementById('selectAllListsCheckbox');
    if (selectAllLists) {
        selectAllLists.checked = allLists.length > 0 && allLists.length === checkedLists.length;
    }
}

function updateFilters() {
    updateMap();
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    document.querySelector(`.tab-button[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'objects') {
        updateObjectsList();
    }
}

function updateObjectsList() {
    const objectsListContent = document.getElementById('objectsListContent');
    const searchText = document.getElementById('searchListInput').value.toLowerCase();
    const filteredObjects = getFilteredObjects().filter(obj => {
        if (!searchText) return true;

        return obj.id.toString().toLowerCase().includes(searchText) ||
            obj.address.toLowerCase().includes(searchText);
    });

    if (filteredObjects.length === 0) {
        objectsListContent.innerHTML = '<div class="loading">Нет объектов для отображения</div>';
        return;
    }

    objectsListContent.innerHTML = '';

    filteredObjects.forEach(obj => {
        const style = getInspectorStyle(obj.inspector);

        // 🔥 REMOVED STATUS ICONS AS REQUESTED
        /*
        const isNew = !obj.entryTime && !obj.exitTime;
        const isActive = obj.entryTime && !obj.exitTime;
        const isCompleted = !!obj.exitTime;

        let statusClass = 'status-new';
        let statusText = '🆕';
        if (isCompleted) {
            statusClass = 'status-completed';
            statusText = '✅';
        } else if (isActive) {
            statusClass = 'status-active';
            statusText = '🔵';
        }
        */

        const objectItem = document.createElement('div');
        objectItem.className = 'object-item';
        objectItem.onclick = () => {
            const lat = parseFloat(obj.latitude);
            const lon = parseFloat(obj.longitude);
            if (isFinite(lat) && isFinite(lon)) {
                map.setCenter([lat, lon], 17);
            }
            showObjectBalloon(obj.id);
        };

        objectItem.innerHTML = `
                    <div style="flex: 1;">
                        <div class="object-id">${obj.id}</div>
                        <div class="object-address">${obj.address}</div>
                        <div class="object-inspector">${obj.inspector || 'Не назначен'}</div>
                    </div>
                    <!-- Status icon removed -->
                `;
        objectsListContent.appendChild(objectItem);
    });
}

function updateStats(filteredObjects) {
    const totalObjects = objectsData.length;
    const shownObjects = filteredObjects.length;

    const totalCompletedObjects = objectsData.filter(obj => obj.exitTime && obj.exitTime !== '').length;
    const totalActiveObjects = objectsData.filter(obj => obj.entryTime && !obj.exitTime).length;

    document.getElementById('objectsCounter').textContent = `Показано: ${shownObjects} из ${totalObjects} объектов`;
    document.getElementById('completedCounter').textContent = `Выполнено: ${totalCompletedObjects} объектов`;
    document.getElementById('activeCounter').textContent = `Активных: ${totalActiveObjects} объектов`;
}

function showLoading(message) {
    document.getElementById('inspectorsList').innerHTML = `<div class="loading">${message}</div>`;
    document.getElementById('listsList').innerHTML = `<div class="loading">${message}</div>`;
}

function showError(message) {
    document.getElementById('inspectorsList').innerHTML = `<div class="error">${message}</div>`;
    document.getElementById('listsList').innerHTML = `<div class="error">${message}</div>`;
}

// 🔥 ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ ОБНОВЛЕНИЯ СЕССИИ
document.addEventListener('click', function () {
    if (currentUser) {
        saveSession();
    }
});

document.addEventListener('visibilitychange', function () {
    if (!document.hidden && currentUser) {
        saveSession();
    }
});

// 🔥 ЗАКРЫТИЕ МЕНЮ ПО КЛИКУ НА КАРТУ
document.getElementById('map').addEventListener('click', function (e) {
    if (activeMenu && e.target.closest('.inspector-management-menu') === null) {
        closeAllMenus();
    }
});

// 🔥 Helper to update local cache optimistically
// 🔥 Helper to update local cache optimistically (Saves GLOBAL state)
function updateLocalCache(updates = {}) {
    try {
        const cacheData = {
            success: true,
            points: objectsData,
            inspectorsConfig: window.INSPECTORS_CONFIG || {},
            addedObjects: window.ADDED_OBJECTS || [],
            inspectorsHomes: window.INSPECTOR_HOMES || {}
        };
        localStorage.setItem('cached_objects_data', JSON.stringify(cacheData));
        console.log('💾 Global Cache Updated (ignoring partial updates)');
    } catch (e) {
        console.error('❌ Error updating local cache:', e);
    }
}

export {
    initializeApp,
    login,
    refreshInspectorsList,
    toggleMobileSidebar,
    logout,
    toggleSidebar,
    toggleInspectorsHomes,
    toggleInspectorsManagement,
    switchTab,
    updateFilters,
    saveFilterState,
    selectAllInspectors,
    deselectAllInspectors,
    selectAllLists,
    deselectAllLists,
    forceRefreshData,
    startWorkDay,
    endWorkDay,
    filterManagementInspectors,
    updateObjectsList,
    markEntry,
    markExit,
    cancelEntry,
    copyCoordinates,
    toggleAccordion,
    applyInspectorChanges,
    selectColor,
    showObjectBalloon,
    reassignInspector,
    toggleCustomSelect,
    selectCustomOption,
    filterInspectorsList,
    updateInspectorConfig,
    onInspectorChange,
    toggleHamburgerMenu,
    selectNavItem,
    openObjectDetails,
    closeObjectDetails,
    toggleChecklistForm,
    openGeneralPhotoUploader,
    toggleDashboard,
    openDashboardsApp,
    openDashboardsAppFor
};
// Экспортируем в window для inline-обработчиков onclick
window.openObjectDetails = openObjectDetails;
// window.openChecklistForm = openChecklistForm; // ❌ MOVED to NEW_openChecklistForm.js - exported there
window.toggleChecklistForm = toggleChecklistForm;
window.openGeneralPhotoUploader = openGeneralPhotoUploader;
window.toggleDashboard = toggleDashboard;
window.openDashboardsApp = openDashboardsApp;
window.openDashboardsAppFor = openDashboardsAppFor;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.selectNavItem = selectNavItem;
window.toggleSidebar = toggleSidebar;
window.toggleInspectorsManagement = toggleInspectorsManagement;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.selectNavItem = selectNavItem;
window.toggleSidebar = toggleSidebar;
window.logout = logout;
window.login = login;
window.refreshInspectorsList = refreshInspectorsList;
window.toggleInspectorsHomes = toggleInspectorsHomes;
window.selectAllInspectors = selectAllInspectors;
window.deselectAllInspectors = deselectAllInspectors;
window.selectAllLists = selectAllLists;
window.deselectAllLists = deselectAllLists;
window.forceRefreshData = forceRefreshData;
window.updateFilters = updateFilters;
window.saveFilterState = saveFilterState;
window.updateObjectsList = updateObjectsList;
// 🔥 Сохраняем оригинальные функции перед экспортом для последующего улучшения
const originalStartWorkDay = startWorkDay;
const originalEndWorkDay = endWorkDay;
// Экспортируем улучшенные версии с обновлением кнопки навигации
window.startWorkDay = function () {
    originalStartWorkDay();
    setTimeout(updateWorkDayNavButton, 100);
};
window.endWorkDay = function () {
    originalEndWorkDay();
    setTimeout(updateWorkDayNavButton, 100);
};
window.filterManagementInspectors = filterManagementInspectors;
window.markEntry = markEntry;
window.markExit = markExit;
window.cancelEntry = cancelEntry;
window.copyCoordinates = copyCoordinates;
window.toggleAccordion = toggleAccordion;
window.applyInspectorChanges = applyInspectorChanges;
window.selectColor = selectColor;
window.showObjectBalloon = showObjectBalloon;
window.reassignInspector = reassignInspector;
window.toggleCustomSelect = toggleCustomSelect;
window.selectCustomOption = selectCustomOption;
window.filterInspectorsList = filterInspectorsList;
window.updateInspectorConfig = updateInspectorConfig;
window.onInspectorChange = onInspectorChange;

function showManagementTab(inspId, tab) {
    const ids = [`tab_${inspId}_status`, `tab_${inspId}_color`, `tab_${inspId}_icon`];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id.endsWith(tab)) el.classList.remove('hidden'); else el.classList.add('hidden');
    });
}

try { window.showManagementTab = showManagementTab; } catch (_) { }
// Functions openDashboardsApp and openDashboardsAppFor are already defined above (lines 3689-3719)
// These window assignments ensure they're available globally

window.toggleAllInspectors = function (checked) {
    if (checked) {
        selectAllInspectors();
    } else {
        deselectAllInspectors();
    }
};

window.toggleAllLists = function (checked) {
    if (checked) {
        selectAllLists();
    } else {
        deselectAllLists();
    }
};

// 🔥 НОВАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
window.switchTab = function (tabName) {

    // 🔥 Запоминаем, был ли сайдбар открыт ДО переключения
    const sidebar = document.getElementById('sidebar');
    const wasOpen = sidebar && sidebar.classList.contains('slide-in');

    if (sidebar && wasOpen) {
        // Block toggleSidebar during tab switch
        window._sidebarSwitchLock = true;

        // Снимаем блокировку через 500ms
        setTimeout(() => {
            window._sidebarSwitchLock = false;
        }, 500);
    }

    // Hide all panes
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    // Deactivate all buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

    // Show target pane
    const targetPane = document.getElementById(`${tabName}-tab`);
    if (targetPane) targetPane.classList.add('active');

    // Activate target button (simple logic based on onclick attribute)
    const targetBtn = Array.from(document.querySelectorAll('.tab-button')).find(btn => btn.getAttribute('onclick').includes(`'${tabName}'`));
    if (targetBtn) targetBtn.classList.add('active');

};

// 🔥 ОБНОВЛЕНИЕ UI В ЗАВИСИМОСТИ ОТ РОЛИ
window.updateUIForRole = function () {
    const isInspector = userAccessRights === 'Инспектор';
    const isAdmin = userAccessRights === 'Администратор' || userAccessRights === 'Император' || userAccessRights === 'Admin'; // Check specific role names if needed

    const btnManagement = document.getElementById('navBtnManagement');
    const btnDashboards = document.getElementById('navBtnDashboards');
    const btnWorkDay = document.getElementById('navBtnWorkDay');

    // Sidebar elements
    const adminDashboardBtn = document.getElementById('adminDashboardBtn');
    const sidebarTabs = document.getElementById('sidebarTabs');
    const navBtnList = document.getElementById('navBtnList');

    if (btnManagement) btnManagement.style.display = isInspector ? 'none' : 'flex';

    // 🔥 Hide Dashboard buttons for Inspectors
    const showDashboards = !isInspector;
    if (btnDashboards) btnDashboards.style.display = showDashboards ? 'flex' : 'none';
    if (adminDashboardBtn) adminDashboardBtn.style.display = showDashboards ? 'block' : 'none';

    // 🔥 Hide Sidebar Tabs for Admin
    if (sidebarTabs) sidebarTabs.style.display = isAdmin ? 'none' : 'flex';

    // 🔥 Change "Object List" button behavior for Admin
    if (navBtnList) {
        if (isAdmin) {
            navBtnList.onclick = function () {
                toggleHamburgerMenu(); // Close menu
                openAddObjectList(); // Open list drawer
            };
        } else {
            navBtnList.onclick = function () {
                toggleHamburgerMenu(); // Close menu
                switchTab('objects'); // Switch to objects tab

                // 🔥 Explicitly ensure sidebar is open for Inspectors
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.style.display = 'flex';
                    // Hide hamburger
                    const hamburgerBtn = document.querySelector('.hamburger-btn');
                    if (hamburgerBtn) hamburgerBtn.classList.add('hidden');

                    setTimeout(() => {
                        sidebar.classList.add('slide-in');
                    }, 10);
                }
            };
        }
    }

    // Work Day button logic
    if (btnWorkDay) {
        if (isInspector) {
            btnWorkDay.style.display = 'flex';
            updateWorkDayNavButton();
        } else {
            btnWorkDay.style.display = 'none';
        }
    }

    // 🔥 ОБНОВЛЯЕМ БЕЙДЖ ПОЛЬЗОВАТЕЛЯ И ПАНЕЛЬ СТАТИСТИКИ ДЛЯ ВСЕХ
    updateSidebarUserInfo();
};

// 🔥 УПРАВЛЕНИЕ РАБОЧИМ ДНЕМ ИЗ МЕНЮ
window.toggleWorkDayFromNav = function () {
    // 🔥 Optimistic update
    const previousState = isWorkDayOpen;
    isWorkDayOpen = !isWorkDayOpen;
    updateWorkDayNavButton();

    // Store revert function in case of cancel/error
    window.revertWorkDayState = function () {
        isWorkDayOpen = previousState;
        updateWorkDayNavButton();
    };

    if (previousState) {
        // Was open, now closing. Call approval directly to bypass isWorkDayOpen check
        openWorkDayApproval('end');
    } else {
        // Was closed, now opening. Call approval directly to bypass isWorkDayOpen check
        openWorkDayApproval('start');
    }
};

function updateWorkDayNavButton() {
    const btn = document.getElementById('navBtnWorkDay');
    if (!btn) return;

    const textSpan = btn.querySelector('.nav-text');
    if (isWorkDayOpen) {
        if (textSpan) textSpan.textContent = 'Закрыть рабочий день';
        btn.classList.add('nav-logout'); // Red style
        btn.querySelector('.nav-icon').textContent = '🛑';
    } else {
        if (textSpan) textSpan.textContent = 'Открыть рабочий день';
        btn.classList.remove('nav-logout'); // Default style
        btn.querySelector('.nav-icon').textContent = '📅';
    }
    // 🔥 Ensure button shape matches others (remove inline styles if any)
    btn.style.borderRadius = '';
    btn.style.padding = '';
}

// 🔥 Функции startWorkDay и endWorkDay уже переопределены выше при экспорте в window (строки 4623-4630)

// 🔥 OBJECT LIST DRAWER LOGIC
window.ADDED_OBJECTS = [];

window.openAddObjectList = function () {
    const drawer = document.getElementById('addObjectDrawer');
    if (drawer) {
        drawer.classList.add('open');

        // Add swipe LEFT handler
        if (!drawer.hasAttribute('data-swipe-enabled')) {
            drawer.setAttribute('data-swipe-enabled', 'true');
            let startX = 0, currentX = 0, isDragging = false;
            const handleTouchStart = (e) => {
                startX = e.touches[0].clientX; isDragging = true;
                drawer.style.willChange = 'transform';
            };
            const handleTouchMove = (e) => {
                if (!isDragging) return;
                currentX = e.touches[0].clientX; const deltaX = currentX - startX;
                if (deltaX < 0) requestAnimationFrame(() => {
                    drawer.style.transform = `translateX(${deltaX}px)`;
                });
            };
            const handleTouchEnd = () => {
                if (!isDragging) return;
                isDragging = false; drawer.style.willChange = 'auto';
                const deltaX = currentX - startX;
                if (deltaX < -100) {
                    drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    drawer.style.transform = 'translateX(-100%)';
                    setTimeout(() => {
                        // NUCLEAR OPTION: Hide completely to prevent ANY animation glitch
                        drawer.style.display = 'none';

                        // Clean up state while hidden
                        drawer.classList.remove('open');
                        drawer.style.transition = '';
                        drawer.style.transform = '';

                        // Restore display after a short delay
                        setTimeout(() => {
                            drawer.style.display = '';
                        }, 50);
                    }, 300);
                } else {
                    drawer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
                    drawer.style.transform = '';
                    setTimeout(() => drawer.style.transition = '', 300);
                }
            };
            drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
            drawer.addEventListener('touchmove', handleTouchMove, { passive: false });
            drawer.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    }
    renderAddObjectList();
};

window.closeAddObjectDrawer = function () {
    const drawer = document.getElementById('addObjectDrawer');
    if (drawer) drawer.classList.remove('open');
};

window.filterAddObjectList = function (query) {
    renderAddObjectList(query);
};

window.renderAddObjectList = function (filter = '') {
    const container = document.getElementById('addObjectListContent');
    if (!container) return;

    if (!window.ADDED_OBJECTS || window.ADDED_OBJECTS.length === 0) {
        container.innerHTML = '<div class="loading">Нет объектов в списке add_object</div>';
        return;
    }

    const lowerFilter = filter.toLowerCase();
    const filtered = window.ADDED_OBJECTS.filter(obj => {
        const id = String(obj.id || '').toLowerCase();
        const addr = String(obj.address || '').toLowerCase();
        return id.includes(lowerFilter) || addr.includes(lowerFilter);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="loading">Ничего не найдено</div>';
        return;
    }

    let html = '';
    filtered.forEach(obj => {
        const id = obj.id || '???';
        // 🔥 Fix: If address is 'Admin', it's likely a data mapping error, show 'Нет адреса' or try to find real address
        let addr = obj.address || 'Нет адреса';
        if (addr === 'Admin') addr = 'Адрес не указан';

        html += `
            <div class="add-object-item" onclick="showAddObjectBalloon('${id}')">
                <div class="add-object-title">Точка № ${id}</div>
                <div class="add-object-badge">Запланировать</div>
                <div class="add-object-address">${addr}</div>
            </div>
        `;
    });
    container.innerHTML = html;
};

window.showAddObjectBalloon = function (id) {
    const obj = window.ADDED_OBJECTS.find(o => String(o.id) === String(id));
    if (!obj) return;

    // Close drawer when opening balloon
    closeAddObjectDrawer();

    // Ensure balloon is visible
    const overlay = document.getElementById('objectDetailsOverlay');
    const container = document.getElementById('objectDetailsContent');

    if (!overlay || !container) {
        console.error('Balloon elements not found!');
        return;
    }

    let addr = obj.address || '-';
    if (addr === 'Admin') addr = 'Адрес не указан';

    // Use standard object-card structure
    // Removed icon and close button as requested
    // Added specific style for title to match map balloon (bold, dark blue)
    const content = `
        <div class="object-card">
            <div class="object-card__header" style="justify-content: flex-start; padding-bottom: 10px;">
                <div class="object-card__title-block">
                    <div class="object-card__title" style="font-family: 'Roboto', sans-serif; font-weight: 700; font-size: 18px; color: #2c3e50;">Точка №${obj.id}</div>
                </div>
            </div>

            <div class="object-card__info-block">
                <div class="object-card__row">
                    <div class="object-card__label">АДРЕС</div>
                    <div class="object-card__value">${addr}</div>
                </div>
                <div class="object-card__row">
                    <div class="object-card__label">ИНСПЕКТОР</div>
                    <div class="object-card__value" id="current-inspector-display-${obj.id}">${obj.inspector || 'Admin'}</div>
                </div>
            </div>

            <div class="object-card__actions">
                <button class="object-card__button object-card__button--primary" onclick="addObjectToMap('${obj.id}')">Добавить на карту</button>
                ${(userAccessRights === 'Император' || userAccessRights === 'Администратор') ? `<button class="object-card__button object-card__button--primary" onclick="openDashboardsAppFor('${obj.id}')">Дашборд</button>` : ''}
            </div>

            <div class="object-card__section object-card__section--reassign">
                <label class="object-card__label">ПЕРЕНАЗНАЧИТЬ ИНСПЕКТОРА</label>
                <select class="object-card__select" id="inspector-select-${obj.id}">
                    <option value="">-- Выберите инспектора --</option>
                    <option value="Admin">Admin</option>
                    ${Object.keys(window.INSPECTORS_CONFIG || {}).filter(k => k !== 'Admin').map(inspector => {
        const selected = obj.inspector === inspector ? 'selected' : '';
        return `<option value="${inspector}" ${selected}>${inspector}</option>`;
    }).join('')}
                </select>
            </div>
        </div>
    `;

    container.innerHTML = content;
    overlay.classList.remove('hidden');
    overlay.classList.add('object-details--visible'); // Use standard class for visibility
    overlay.style.display = 'flex';
};

window.reassignAddObjectInspector = function (objectId, newInspector) {
    if (!newInspector) return;

    // Optimistic update
    const obj = window.ADDED_OBJECTS.find(o => String(o.id) === String(objectId));
    if (obj) {
        obj.inspector = newInspector;
        // Refresh balloon to show new inspector name in the info block
        showAddObjectBalloon(objectId);
    }

    const url = `${SCRIPT_URL}?action=reassign&objectId=${encodeURIComponent(objectId)}&newInspector=${encodeURIComponent(newInspector)}&sheet_id=${DEFAULT_SHEET_ID}&callback=handleReassignAddObject`;

    window.handleReassignAddObject = function (data) {
        if (data.success) {
            showNotification(`Инспектор изменен на ${newInspector}`, 'success');
        } else {
            showNotification('Ошибка смены инспектора: ' + (data.message || 'Unknown error'), 'error');
        }
        delete window.handleReassignAddObject;
    };

    const script = document.createElement('script');
    script.src = url;
    document.body.appendChild(script);
};

window.addObjectToMap = function (id) {
    if (!confirm(`Добавить Точку №${id} на карту?`)) return;

    const btn = document.querySelector(`button[onclick="addObjectToMap('${id}')"]`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Добавление...';
    }

    // Get selected inspector from dropdown
    const select = document.getElementById(`inspector-select-${id}`);
    const selectedInspector = select ? select.value : '';

    // Use SCRIPT_URL directly and pass inspector if selected
    let url = `${SCRIPT_URL}?action=moveobject&objectId=${encodeURIComponent(id)}&callback=handleMoveObject`;
    if (selectedInspector) {
        url += `&inspector=${encodeURIComponent(selectedInspector)}`;
    }

    // JSONP callback
    window.handleMoveObject = function (data) {
        if (data.success) {
            alert('Объект успешно добавлен на карту!');
            closeObjectDetails();
            loadData(); // Refresh data
        } else {
            alert('Ошибка при добавлении: ' + (data.message || 'Unknown error'));
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Добавить на карту';
            }
        }
        delete window.handleMoveObject; // Cleanup
    };

    const script = document.createElement('script');
    script.src = url;
    document.body.appendChild(script);
};



// 🔥 GLOBAL LOADING SPINNER HELPERS
window.showLoading = window.showLoading || function (message = 'Загрузка...') {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(255, 255, 255, 0.8)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.flexDirection = 'column';
        overlay.style.backdropFilter = 'blur(4px)';

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner'; // Should perform CSS styling elsewhere if needed, or inline
        spinner.style.width = '50px';
        spinner.style.height = '50px';
        spinner.style.border = '5px solid #f3f3f3';
        spinner.style.borderTop = '5px solid #3498db';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'spin 1s linear infinite';

        // Add spin keyframes if not exists
        if (!document.getElementById('spin-style')) {
            const style = document.createElement('style');
            style.id = 'spin-style';
            style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        const text = document.createElement('div');
        text.id = 'global-loading-text';
        text.style.marginTop = '20px';
        text.style.fontSize = '18px';
        text.style.color = '#333';
        text.style.fontFamily = 'Arial, sans-serif';
        text.innerText = message;

        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);
    } else {
        const text = overlay.querySelector('#global-loading-text');
        if (text) text.innerText = message;
        overlay.style.display = 'flex';
    }
};

window.hideLoading = window.hideLoading || function () {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
};

// Export close functions for HTML onclick handlers
window.closeHamburgerMenu = closeHamburgerMenu;
window.closeTopMenu = closeTopMenu;
window.toggleSidebar = toggleSidebar;
window.toggleInspectorsManagement = toggleInspectorsManagement;
window.formatDateOnly = formatDateOnly;
window.userAccessRights = userAccessRights;
window.getExtraParams = getExtraParams;

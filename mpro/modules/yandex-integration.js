// Yandex Disk integration extracted from object-actions.js.
// Owns Yandex button rendering, folder provisioning, and report-link sync.

        function getPhotoReportLink_(obj) {
            return String(obj?.photosLink || '').trim();
        }

        function getYandexWorkLink_(obj) {
            return String(obj?.yandexDiskLink || obj?.photosLink || '').trim();
        }

        function buildYandexDiskClientLink_(pathRaw) {
            const path = normalizeYandexDiskPath_(pathRaw).replace(/^\/+|\/+$/g, '');
            if (!path) return '';
            const encodedPath = path
                .split('/')
                .filter(Boolean)
                .map(part => encodeURIComponent(part))
                .join('/');
            return `https://disk.yandex.ru/client/disk/${encodedPath}`;
        }

        function decodeYandexDiskClientPath_(linkRaw) {
            const link = String(linkRaw || '').trim();
            if (!link || !link.includes('/client/disk/')) return '';
            return decodeURIComponent(link.split('/client/disk/')[1].split('?')[0]);
        }

        function normalizeYandexDiskPath_(pathRaw) {
            let path = String(pathRaw || '');
            if (!path) return '';
            path = path.replace(/\\/g, '/');
            path = path.replace(/^disk:\/+/i, '/');
            path = path.replace(/^\/+/, '/');
            if (!path.startsWith('/')) {
                path = `/${path}`;
            }
            path = path.replace(/\/{2,}/g, '/');
            return path;
        }

        function sanitizeYandexFolderSegment_(segmentRaw) {
            return String(segmentRaw || '')
                .replace(/[\\:*?"<>|]/g, ' ')
                .replace(/[\u0000-\u001f]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function sanitizeYandexDiskPath_(pathRaw) {
            const normalized = normalizeYandexDiskPath_(pathRaw);
            if (!normalized) return '';
            const parts = normalized
                .split('/')
                .filter(Boolean)
                .map(sanitizeYandexFolderSegment_)
                .filter(Boolean);
            return parts.length ? `/${parts.join('/')}` : '';
        }

        function buildYandexPathCandidates_(pathRaw) {
            const candidates = [];
            [normalizeYandexDiskPath_(pathRaw), sanitizeYandexDiskPath_(pathRaw)].forEach((candidate) => {
                const value = String(candidate || '');
                if (!value || candidates.includes(value)) return;
                candidates.push(value);
            });
            return candidates;
        }

        function extractYandexBasePathCandidates_(objectId, yandexLink) {
            const rawPath = decodeYandexDiskClientPath_(yandexLink) || `${CONFIG.YANDEX.ROOT_PATH}/${objectId}`;
            return buildYandexPathCandidates_(rawPath);
        }

        function buildYandexMainFolderName_(dateStr, inspectorName) {
            return sanitizeYandexFolderSegment_(`${dateStr} ${inspectorName}`);
        }

        function renderYandexButton(obj, isActive) {
            const reportLink = getPhotoReportLink_(obj);
            const yandexWorkLink = getYandexWorkLink_(obj);
            const objectIdAttr = Utils.escapeAttr(obj.id);
            const safeReportLink = Utils.sanitizeUrl(reportLink);
            if (isActive) {
                if (safeReportLink) {
                    return `<button class="object-card__quick-link object-card__quick-link--yandex" type="button" data-action="yandex-disk" data-yandex-mode="open" data-yandex-object="${objectIdAttr}" data-yandex-target="${Utils.escapeAttr(safeReportLink)}" data-yandex-report-link="${Utils.escapeAttr(safeReportLink)}" title="Открыть фотоотчет">${renderQuickLinkLabel_('photos', 'Фотоотчет')}</button>`;
                }
                if (!yandexWorkLink) return '';
                return `<button class="object-card__quick-link object-card__quick-link--yandex" type="button" data-action="yandex-disk" data-yandex-mode="create" data-yandex-object="${objectIdAttr}" data-yandex-link="${Utils.escapeAttr(yandexWorkLink)}" data-yandex-report-link="${Utils.escapeAttr(reportLink)}" title="Подготовить папки на Яндекс.Диске">${renderQuickLinkLabel_('folders', 'Создать папки')}</button>`;
            }
            const safeUrl = Utils.sanitizeUrl(reportLink || yandexWorkLink);
            if (!safeUrl) return '';
            return `<a href="${Utils.escapeAttr(safeUrl)}" target="_blank" rel="noopener noreferrer" class="object-card__quick-link object-card__quick-link--yandex" title="Открыть фотоотчет">${renderQuickLinkLabel_('photos', 'Фотоотчет')}</a>`;
        }

        const YANDEX_FOLDER_CREATION_IN_PROGRESS = new Set();
        
        // ==================================================================
        // Работа с папками на Яндекс.Диске
        // ==================================================================
        
        /**
         * Создать папку на Яндекс.Диске через API.
         * @param {string} path - Путь к папке
         * @returns {Promise<{success: boolean, created: boolean, code: number, message?: string}>}
         */
        async function createYandexFolder(path) {
            try {
                const response = await MproApi.yandexCreateFolder(path, 30000);
                const code = Number(response?.code || 0);
                if (response?.success && (code === 201 || code === 409)) {
                    return {
                        success: true,
                        code: code,
                        created: !!response.created,
                        path: String(response?.path || path || '')
                    };
                }
                return {
                    success: false,
                    code: code,
                    message: response?.message || response?.error || 'Yandex API error'
                };
            } catch (error) {
                return { success: false, code: 0, message: error.message };
            }
        }
        
        /**
         * Проверка существования папки на Яндекс.Диске
         * @param {string} path - Путь к папке
         * @returns {Promise<boolean>}
         */
        async function checkYandexFolder(path) {
            try {
                const response = await MproApi.yandexCheckFolder(path, 30000);
                return {
                    exists: !!(response?.success && response?.exists),
                    path: String(response?.path || path || '')
                };
            } catch (error) {
                console.warn('Ошибка проверки папки:', error);
                return { exists: false, path: '' };
            }
        }

        async function resolveExistingYandexPath_(pathCandidates) {
            const candidates = Array.isArray(pathCandidates) ? pathCandidates : [];
            for (const candidate of candidates) {
                const normalized = normalizeYandexDiskPath_(candidate);
                if (!normalized) continue;
                const result = await checkYandexFolder(normalized);
                if (result.exists) return normalizeYandexDiskPath_(result.path || normalized);
            }
            return '';
        }

        async function createYandexFolderWithFallback_(pathCandidates) {
            const candidates = Array.isArray(pathCandidates) ? pathCandidates : [];
            let lastError = '';

            for (const candidate of candidates) {
                const normalized = normalizeYandexDiskPath_(candidate);
                if (!normalized) continue;
                const result = await createYandexFolder(normalized);
                if (result.success && (result.code === 201 || result.code === 409)) {
                    return {
                        ...result,
                        path: normalizeYandexDiskPath_(result.path || normalized)
                    };
                }
                if (result.message) lastError = result.message;
            }

            return {
                success: false,
                code: 0,
                message: lastError || 'Yandex API error'
            };
        }
        
        /**
         * Обработчик создания папок на Яндекс.Диске
         * @param {string} objectId - ID объекта
         * @param {string} yandexLink - Ссылка на папку из таблицы
         */
        async function savePhotosLinkToSheet_(objectId, photosLink) {
            if (!objectId || !photosLink) return { success: false, error: 'invalid params' };

            const object = DataState.findObjectById(objectId);
            if (!object) return { success: false, error: 'object not found' };

            try {
                const response = await MproApi.savePhotosLink({
                    objectId: String(objectId),
                    dbObjectId: String(object.dbObjectId || ''),
                    dbVisitId: String(object.dbVisitId || ''),
                    source: object.source || 'Map',
                    rowIndex: String(object.rowIndex || ''),
                    photosLink: photosLink
                }, 15000);

                if (response?.success) {
                    object.photosLink = photosLink;
                    return { success: true };
                }
                return { success: false, error: response?.error || 'save failed' };
            } catch (error) {
                return { success: false, error: error?.message || 'request failed' };
            }
        }

        async function handleYandexDiskButton(objectId, yandexLink, reportLink = '') {
            if (!objectId || !yandexLink) {
                console.error('❌ Не передан objectId или yandexLink');
                alert('Ошибка: не указана ссылка на Яндекс.Диск');
                return;
            }
            const objectKey = String(objectId);
            if (YANDEX_FOLDER_CREATION_IN_PROGRESS.has(objectKey)) {
                return;
            }
            
            const btn = document.querySelector(`[data-yandex-object="${objectId}"]`);
            if (!btn) {
                console.error('❌ Кнопка Яндекс.Диск не найдена');
                return;
            }

            YANDEX_FOLDER_CREATION_IN_PROGRESS.add(objectKey);
            
            // Блокируем кнопку и показываем компактное состояние загрузки
            btn.dataset.yandexBusy = '1';
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.classList.add('object-card__quick-link--busy');
            btn.setAttribute('aria-busy', 'true');
            btn.innerHTML = `${renderActionIcon_('folders')}<span class="object-card__quick-link-copy"><span class="object-card__quick-link-text">Создание папок...</span></span>`;
            
            try {
                // Формируем имя основной папки
                const now = new Date();
                const dd = String(now.getDate()).padStart(2, '0');
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const yyyy = now.getFullYear();
                const dateStr = `${dd}.${mm}.${yyyy}`;
                const inspectorName = RuntimeState.getCurrentUserName('Инспектор');
                const mainFolderName = buildYandexMainFolderName_(dateStr, inspectorName);
                

                
                // Извлекаем путь из ссылки
                const basePathCandidates = extractYandexBasePathCandidates_(objectId, yandexLink);
                const mainPathCandidates = basePathCandidates
                    .map((folderPath) => normalizeYandexDiskPath_(`${folderPath}/${mainFolderName}`))
                    .filter(Boolean);
                debugLog('🔥 MainPath candidates:', mainPathCandidates);
                
                // Создаём основную папку
                const mainResult = await createYandexFolderWithFallback_(mainPathCandidates);
                if (!mainResult.success) {
                    throw new Error(`Ошибка создания папки: ${mainResult.message}`);
                }
                
                // Получить список подпапок из конфигурации
                const mainPath = normalizeYandexDiskPath_(mainResult.path || mainPathCandidates[0]);
                const subfolders = CONFIG.YANDEX.SUBFOLDERS;
                
                // Создаём подпапки параллельно
                let created = 0;
                
                const folderPromises = subfolders.map(async (subfolder) => {
                    const subfolderName = sanitizeYandexFolderSegment_(subfolder) || String(subfolder || '').trim();
                    const subPath = normalizeYandexDiskPath_(`${mainPath}/${subfolderName}`);
                    debugLog('🔥 Создание подпапки:', subPath);
                    
                    try {
                        const result = await createYandexFolderWithFallback_([subPath]);
                        if (result.success) {
                            if (result.created) created++;
                            return { success: true, subfolder };
                        } else {
                            console.warn(`⚠️ Ошибка создания подпапки "${subfolder}":`, result);
                            return { success: false, subfolder };
                        }
                    } catch (error) {
                        console.warn(`⚠️ Исключение при создании подпапки "${subfolder}":`, error);
                        return { success: false, subfolder };
                    }
                });
                
                await Promise.all(folderPromises);
                
                // Формируем прямую ссылку на созданную папку
                const resolvedMainPath = await resolveExistingYandexPath_([mainPath].concat(mainPathCandidates));
                if (!resolvedMainPath) {
                    throw new Error('Папка на Яндекс.Диске не подтверждена после создания');
                }
                const directLink = buildYandexDiskClientLink_(resolvedMainPath);
                
                // Обновляем кнопку
                btn.innerHTML = renderQuickLinkLabel_('photos', 'Фотоотчет');
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.classList.remove('object-card__quick-link--busy');
                btn.removeAttribute('aria-busy');
                btn.dataset.yandexMode = 'open';
                btn.dataset.yandexTarget = directLink;
                btn.dataset.yandexReportLink = directLink;
                
                const saveResult = await savePhotosLinkToSheet_(objectId, directLink);
                if (!saveResult.success) {
                    console.warn('Не удалось сохранить Photos_link:', saveResult.error || 'unknown error');
                }
                
                showNotification(
                    `✅ Папки созданы!\n\nСоздано: ${mainFolderName}\nПодпапок: ${created}/${subfolders.length}`,
                    'success'
                );
                
            } catch (error) {
                console.error('❌ Ошибка создания папок:', error);
                btn.innerHTML = renderQuickLinkLabel_('folders', 'Создать папки');
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.classList.remove('object-card__quick-link--busy');
                btn.removeAttribute('aria-busy');
                btn.dataset.yandexMode = 'create';
                delete btn.dataset.yandexTarget;
                alert('❌ Не удалось создать папки:\n\n' + (error.message || 'Неизвестная ошибка'));
            } finally {
                YANDEX_FOLDER_CREATION_IN_PROGRESS.delete(objectKey);
                delete btn.dataset.yandexBusy;
            }
        }

        /**
         * Унифицированный обработчик клика по кнопке Яндекс.Диска.
         * Работает через делегирование data-action, без прямых onclick.
         * @param {HTMLElement} actionNode
         */
        function handleYandexDiskAction_(actionNode) {
            const mode = actionNode.dataset.yandexMode || 'create';
            if (mode === 'open') {
                const directLink = actionNode.dataset.yandexTarget
                    || actionNode.dataset.yandexReportLink
                    || actionNode.dataset.yandexLink
                    || '';
                const safeUrl = Utils.sanitizeUrl(directLink);
                if (safeUrl) window.open(safeUrl, '_blank');
                return;
            }

            const objectId = actionNode.dataset.yandexObject || '';
            const yandexLink = actionNode.dataset.yandexLink || '';
            const reportLink = actionNode.dataset.yandexReportLink || yandexLink;
            if (!objectId || !yandexLink) return;
            handleYandexDiskButton(objectId, yandexLink, reportLink);
        }
        
        /**
         * Инициализация кнопок Яндекс.Диск после открытия балуна
         */
        async function initYandexDiskButtons() {
            const buttons = document.querySelectorAll('[data-yandex-object]');
            
            for (const btn of buttons) {
                const objectId = btn.getAttribute('data-yandex-object');
                const yandexLink = btn.getAttribute('data-yandex-link');
                const reportLink = btn.getAttribute('data-yandex-report-link') || yandexLink;
                
                if (!objectId || !yandexLink) continue;
                if (btn.dataset.yandexBusy === '1' || YANDEX_FOLDER_CREATION_IN_PROGRESS.has(String(objectId))) continue;
                if ((btn.dataset.yandexMode || '') === 'open' && (btn.dataset.yandexTarget || '')) continue;
                
                // Находим объект в данных
                const object = DataState.findObjectById(objectId);
                const isActive = object?.entryTime && !object?.exitTime;
                const directFromSheet = Utils.sanitizeUrl(String(object?.photosLink || '').trim());
                const directReportPath = decodeYandexDiskClientPath_(directFromSheet);
                const resolvedReportPath = directReportPath
                    ? await resolveExistingYandexPath_(buildYandexPathCandidates_(directReportPath))
                    : '';
                const resolvedReportLink = resolvedReportPath
                    ? buildYandexDiskClientLink_(resolvedReportPath)
                    : '';
                
                // Если вход не выполнен - просто открываем ссылку
                if (!isActive) {
                    btn.innerHTML = renderQuickLinkLabel_('photos', 'Фотоотчет');
                    btn.dataset.yandexMode = 'open';
                    btn.dataset.yandexTarget = resolvedReportLink || directFromSheet || reportLink;
                    continue;
                }

                // Если ссылка на фотоотчет уже сохранена в таблице — приоритетно открываем её.
                if (resolvedReportLink) {
                    btn.innerHTML = renderQuickLinkLabel_('photos', 'Фотоотчет');
                    btn.dataset.yandexMode = 'open';
                    btn.dataset.yandexTarget = resolvedReportLink;
                    btn.dataset.yandexReportLink = resolvedReportLink;
                    continue;
                }
                
                // Проверяем существование папки
                const now = new Date();
                const dd = String(now.getDate()).padStart(2, '0');
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const yyyy = now.getFullYear();
                const dateStr = `${dd}.${mm}.${yyyy}`;
                const inspectorName = RuntimeState.getCurrentUserName('Инспектор');
                const mainFolderName = buildYandexMainFolderName_(dateStr, inspectorName);
                
                const basePathCandidates = extractYandexBasePathCandidates_(objectId, yandexLink);
                const folderPathCandidatesToCheck = basePathCandidates
                    .map((folderPath) => normalizeYandexDiskPath_(`${folderPath}/${mainFolderName}`))
                    .filter(Boolean);
                const resolvedFolderPath = await resolveExistingYandexPath_(folderPathCandidatesToCheck);
                if (btn.dataset.yandexBusy === '1' || YANDEX_FOLDER_CREATION_IN_PROGRESS.has(String(objectId))) continue;
                
                if (resolvedFolderPath) {
                    const directLink = buildYandexDiskClientLink_(resolvedFolderPath);
                    btn.innerHTML = renderQuickLinkLabel_('photos', 'Фотоотчет');
                    btn.dataset.yandexMode = 'open';
                    btn.dataset.yandexTarget = directLink;
                    btn.dataset.yandexReportLink = directLink;
                } else {
                    btn.innerHTML = renderQuickLinkLabel_('folders', 'Создать папки');
                    btn.dataset.yandexMode = 'create';
                    delete btn.dataset.yandexTarget;
                }
            }
        }
        
        /**
         * Выполнить действие с объектом через JSONP.
         * @private
         * @param {string|number} objectId - ID объекта
         * @param {string} action - Тип действия
         * @param {Object} params - Дополнительные параметры
         */


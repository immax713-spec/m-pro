// Shared utilities extracted from app-legacy.js.
// Owns formatting, escaping, clipboard helpers, and debounce primitives.

        const Utils = (() => {
            /**
             * Форматировать дату для отображения с обработкой ошибок.
             * @param {string|Date|number} dateInput - Строка даты, объект Date или timestamp
             * @param {Object} [options={}] - Параметры форматирования
             * @param {string} [options.fallback='—'] - Значение при некорректной дате
             * @param {boolean} [options.includeTime=true] - Включать ли время в вывод
             * @returns {string} Отформатированная дата или fallback
             * @example
             * Utils.formatDate('2024-01-15'); // "15.01.2024, 00:00"
             * Utils.formatDate(null); // "—"
             * Utils.formatDate('invalid'); // "invalid" (если вход был строкой)
             */
            const formatDate = (dateInput, options = {}) => {
                const { fallback = '—', includeTime = true } = options;
                
                // Обработка пустого значения (null/undefined)
                if (dateInput === null || dateInput === undefined || dateInput === '') {
                    return fallback;
                }
                
                try {
                    const date = new Date(dateInput);
                    
                    // Проверка на невалидную дату
                    if (isNaN(date.getTime())) {
                        console.warn('Utils.formatDate: Invalid date input:', dateInput);
                        return typeof dateInput === 'string' ? dateInput : fallback;
                    }
                    
                    // Используем настройки даты из CONFIG, иначе значения по умолчанию
                    const locale = (typeof CONFIG !== 'undefined' && CONFIG.DATE?.LOCALE) || 'ru-RU';
                    const formatOptions = (typeof CONFIG !== 'undefined' && CONFIG.DATE?.FORMAT) || {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    };
                    
                    if (!includeTime) {
                        delete formatOptions.hour;
                        delete formatOptions.minute;
                    }
                    
                    return date.toLocaleString(locale, formatOptions);
                } catch (error) {
                    console.error('Utils.formatDate: Error formatting date:', error);
                    return fallback;
                }
            };
            
            /**
             * Форматировать дату как DD.MM.YYYY с обработкой ошибок.
             * @param {Date|string|number} [dateInput=new Date()] - Дата для форматирования
             * @param {Object} [options={}] - Параметры форматирования
             * @param {string} [options.fallback=''] - Значение при некорректной дате
             * @param {string} [options.separator='.'] - Разделитель частей даты
             * @returns {string} Строка DD.MM.YYYY или fallback
             * @example
             * Utils.formatDateRU(new Date(2024, 0, 15)); // "15.01.2024"
             * Utils.formatDateRU('invalid'); // ""
             */
            const formatDateRU = (dateInput = new Date(), options = {}) => {
                const { fallback = '', separator = '.' } = options;
                
                try {
                    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
                    
                    if (isNaN(date.getTime())) {
                        console.warn('Utils.formatDateRU: Invalid date input:', dateInput);
                        return fallback;
                    }
                    
                    const dd = String(date.getDate()).padStart(2, '0');
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const yyyy = date.getFullYear();
                    
                    return `${dd}${separator}${mm}${separator}${yyyy}`;
                } catch (error) {
                    console.error('Utils.formatDateRU: Error formatting date:', error);
                    return fallback;
                }
            };
            
            /**
             * Скопировать текст в буфер обмена.
             * @param {string} text - Текст для копирования
             * @returns {Promise<boolean>}
             */
            const copyToClipboard = async (text) => {
                try {
                    await navigator.clipboard.writeText(text);
                    return true;
                } catch {
                    // Резервный путь для старых браузеров
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    const success = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    return success;
                }
            };
            
            /**
             * Извлечь отображаемый ID из полного ID объекта.
             * @param {string} id - Полный ID (например, "Map_123")
             * @returns {string} Отображаемый ID (например, "123")
             */
            const extractDisplayId = (id) => {
                if (!id) return '';
                if (id.includes('_')) return id.split('_')[1];
                return id;
            };

            const escapeHtml = (value) => {
                return String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            };

            const escapeAttr = (value) => escapeHtml(value);

            const sanitizeUrl = (value) => {
                const raw = String(value ?? '').trim();
                if (!raw) return '';
                try {
                    const url = new URL(raw, window.location.origin);
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        return url.href;
                    }
                } catch (_) {}
                return '';
            };
            
            /**
             * Ограничить частоту вызова функции (debounce).
             * @param {Function} fn - Функция для обертки
             * @param {number} ms - Задержка в миллисекундах
             * @returns {Function}
             */
            const debounce = (fn, ms = 300) => {
                let timeout;
                return (...args) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => fn(...args), ms);
                };
            };
            
            return {
                formatDate,
                formatDateRU,
                copyToClipboard,
                extractDisplayId,
                escapeHtml,
                escapeAttr,
                sanitizeUrl,
                debounce
            };
        })();
        
        /**
         * Переключить видимость секции фильтра
         * @param {string} id - ID секции фильтра ('lists' | 'inspectors')
         */
        // Filters panel module extracted to mpro/modules/filters-panel.js.

        // Inspector admin module extracted to mpro/modules/inspector-admin.js.


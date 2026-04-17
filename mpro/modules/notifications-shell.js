// Notifications shell extracted from app-legacy.js.
// Owns toast rendering and the shared showNotification wrapper.

function normalizeNotificationText_(message) {
            const raw = String(message ?? '').trim();
            if (!raw) return '';

            const normalized = raw.replace(/\s+/g, ' ').trim();
            const exactMap = new Map([
                ['????? ??????? ? ???????? ? ???????', 'Выход отмечен и сохранён в истории'],
                ['????? ???????', 'Выход отмечен'],
                ['??? ????????? ????? ??? ??????', 'Нет активного входа для выхода'],
                ['????????? ???????????? ?????????? ? ???-?? ?????', 'Заполните строительную готовность и кол-во людей'],
                ['?????? ??????? ??? ????????', 'Объект отмечен как отказано'],
                ['???????? ??????? ? ???????? ? ???????', 'Недопуск отмечен и сохранён в истории']
            ]);
            if (exactMap.has(normalized)) {
                return exactMap.get(normalized) || normalized;
            }

            return normalized;
        }

const GlassNotification = {
            /** @type {HTMLElement|null} Текущее уведомление */
            current: null,
            /** @type {number|null} ID таймаута авто-скрытия */
            timeoutId: null,
            
            /**
             * Показать уведомление (заменяет предыдущее)
             * @param {string} message - Текст сообщения
             * @param {'success'|'error'|'info'|'warning'} type - Тип уведомления
             * @param {number} [duration=4000] - Длительность показа в мс
             */
            show(message, type = 'success', duration = (typeof CONFIG !== 'undefined' && CONFIG.ANIMATION?.NOTIFICATION_DURATION) || 4000) {
                // Сбросить таймер предыдущего
                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }
                
                // Удалить предыдущее уведомление
                if (this.current) {
                    const old = this.current;
                    old.classList.remove('show');
                    setTimeout(() => old.remove(), 300); // Animation cleanup delay
                }
                
                // Иконка по типу
                const icons = {
                    success: '✅',
                    error: '❌',
                    warning: '⚠️',
                    info: 'ℹ️'
                };
                const icon = icons[type] || icons.info;
                
                // Очистить сообщение от эмодзи
                const cleanMessage = normalizeNotificationText_(message)
                    .replace(/[✅❌⚠️ℹ️🔄]/g, '')
                    .trim();
                
                // Создать новое уведомление
                const el = document.createElement('div');
                el.className = 'glass-notification';
                const iconNode = document.createElement('span');
                iconNode.className = 'glass-notification-icon';
                iconNode.textContent = icon;
                const textNode = document.createElement('span');
                textNode.className = 'glass-notification-text';
                textNode.textContent = cleanMessage;
                el.appendChild(iconNode);
                el.appendChild(textNode);
                
                document.body.appendChild(el);
                this.current = el;
                
                // Анимация появления
                requestAnimationFrame(() => {
                    el.classList.add('show');
                });
                
                // Авто-скрытие
                this.timeoutId = setTimeout(() => {
                    this.hide();
                }, duration);
            },
            
            /**
             * Скрыть текущее уведомление
             */
            hide() {
                if (this.timeoutId) {
                    clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }
                
                if (this.current) {
                    const el = this.current;
                    el.classList.remove('show');
                    el.classList.add('swipe-out');
                    setTimeout(() => {
                        if (el.parentNode) el.remove();
                    }, 300);
                    this.current = null;
                }
            },
            
        };
        
        /**
         * Показать уведомление (обёртка для совместимости)
         * @param {string} message - Текст сообщения
         * @param {'success'|'error'|'info'|'warning'} type - Тип уведомления
         */
        function showNotification(message, type = 'success') {
            GlassNotification.show(message, type);
        }

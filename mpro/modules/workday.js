// Workday module extracted from session-access.js.
// Owns workday state rendering, geo capture, sync, and open/close actions.

        function formatWorkDayTime_(rawValue) {
            const raw = String(rawValue || '').trim();
            if (!raw) return '';
            const hhmm = raw.match(/^(\d{2}:\d{2})/);
            if (hhmm) return hhmm[1];

            const parsed = new Date(raw);
            if (!isNaN(parsed.getTime())) {
                return parsed.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
            return raw;
        }

        function resetWorkDayState_() {
            WorkDayRuntimeState.reset();
            renderWorkDayStatusUi_();
        }

        function renderWorkDayStatusUi_() {
            const section = UIState.getDomById('workDaySection');
            const wrapper = UIState.getDomById('workDayControlWrapper');
            const statusDot = UIState.getDomById('workDayStatusDot');
            const statusText = UIState.getDomById('workDayStatusText');
            const toggle = UIState.getDomById('workDayToggle');

            if (!section || !statusText || !statusDot || !toggle) return;
            if (!isInspectorRole_()) {
                section.style.display = 'none';
                toggle.checked = false;
                toggle.disabled = true;
                return;
            }

            section.style.display = '';
            if (wrapper) wrapper.classList.remove('open', 'pending');

            const isLoaded = WorkDayRuntimeState.isLoaded();
            const isSyncing = WorkDayRuntimeState.isSyncing();
            const isOpen = WorkDayRuntimeState.isOpen();
            const lastError = WorkDayRuntimeState.getLastError();

            let nextText = 'Синхронизация...';
            let dotClass = 'workday-status-dot pending';
            let toggleChecked = false;
            let toggleDisabled = true;

            if (isSyncing) {
                nextText = 'Синхронизация...';
                dotClass = 'workday-status-dot pending';
            } else if (!isLoaded) {
                nextText = lastError ? 'Нет связи с сервером' : 'Обновление...';
                dotClass = 'workday-status-dot pending';
            } else if (isOpen) {
                const openTime = formatWorkDayTime_(WorkDayRuntimeState.getOpenTime());
                nextText = openTime ? `День открыт с ${openTime}` : 'День открыт';
                dotClass = 'workday-status-dot open';
                toggleChecked = true;
                toggleDisabled = false;
                if (wrapper) wrapper.classList.add('open');
            } else {
                nextText = 'День закрыт';
                dotClass = 'workday-status-dot closed';
                toggleChecked = false;
                toggleDisabled = false;
            }

            if (isSyncing) {
                toggleDisabled = true;
            }

            statusDot.className = dotClass;
            statusText.textContent = nextText;
            toggle.checked = toggleChecked;
            toggle.disabled = toggleDisabled;
            if (wrapper && isSyncing) wrapper.classList.add('pending');
        }

        function getCurrentGeoCoordsForWorkDay_() {
            if (!navigator.geolocation) return Promise.resolve('');

            return new Promise((resolve) => {
                let resolved = false;
                const done = (coords) => {
                    if (resolved) return;
                    resolved = true;
                    resolve(String(coords || '').trim());
                };

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = Number(position.coords.latitude).toFixed(4);
                        const lon = Number(position.coords.longitude).toFixed(4);
                        done(`${lat}, ${lon}`);
                    },
                    () => done(''),
                    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
                );

                setTimeout(() => done(''), 13000);
            });
        }

        function syncWorkDayStateFromServer_(options = {}) {
            if (!isInspectorRole_()) return Promise.resolve(null);

            const force = !!options.force;
            const silent = !!options.silent;
            const inspectorNorm = normalizeInspectorName_(RuntimeState.getCurrentUserName(''));
            const recentlySynced = Date.now() - WorkDayRuntimeState.getLastSyncAt() < 12000;
            const sameInspector = inspectorNorm && inspectorNorm === WorkDayRuntimeState.getLastSyncInspectorNorm();

            if (!force && !WorkDayRuntimeState.isSyncing() && WorkDayRuntimeState.isLoaded() && recentlySynced && sameInspector) {
                renderWorkDayStatusUi_();
                return Promise.resolve(null);
            }

            WorkDayRuntimeState.setSyncing(true);
            WorkDayRuntimeState.clearError();
            renderWorkDayStatusUi_();

            return MproApi.checkWorkDay(20000)
                .then((result) => {
                    if (!result || !result.success) {
                        throw new Error(result?.error || 'Не удалось получить статус рабочего дня');
                    }

                    WorkDayRuntimeState.setLoaded(true);
                    WorkDayRuntimeState.setOpen(!!result.open);
                    WorkDayRuntimeState.setOpenTime(result.open ? (result.openTime || '') : '');
                    WorkDayRuntimeState.clearError();
                    WorkDayRuntimeState.markSynced(inspectorNorm);
                    return result;
                })
                .catch((error) => {
                    WorkDayRuntimeState.setLoaded(false);
                    WorkDayRuntimeState.setOpen(false);
                    WorkDayRuntimeState.setOpenTime('');
                    WorkDayRuntimeState.setLastError(error?.message || 'Ошибка синхронизации');
                    if (!silent) {
                        showNotification('❌ ' + WorkDayRuntimeState.getLastError(), 'error');
                    }
                    throw error;
                })
                .finally(() => {
                    WorkDayRuntimeState.setSyncing(false);
                    renderWorkDayStatusUi_();
                });
        }

        function initWorkDayStateForCurrentUser_(options = {}) {
            if (!isInspectorRole_()) {
                resetWorkDayState_();
                return Promise.resolve(null);
            }
            WorkDayRuntimeState.setLoaded(false);
            WorkDayRuntimeState.clearError();
            renderWorkDayStatusUi_();
            return syncWorkDayStateFromServer_({
                force: options.force !== false,
                silent: options.silent !== false
            }).catch(() => null);
        }

        async function applyWorkDayAction_(action, comment = '') {
            if (!isInspectorRole_()) {
                renderWorkDayStatusUi_();
                return;
            }
            if (WorkDayRuntimeState.isSyncing()) {
                renderWorkDayStatusUi_();
                return;
            }

            const actionName = action === 'end' ? 'endWorkDay' : 'startWorkDay';
            const desiredOpen = actionName === 'startWorkDay';
            const fallbackMessage = desiredOpen ? 'Не удалось открыть рабочий день' : 'Не удалось закрыть рабочий день';
            const noGeoMarker = String(CONFIG.WORKDAY_NO_GEO_MARKER || '').trim() || 'ГЕОЛОКАЦИЯ НЕДОСТУПНА: запросить селфи';
            let mustResync = false;
            let geoUnavailable = false;

            WorkDayRuntimeState.setSyncing(true);
            WorkDayRuntimeState.clearError();
            renderWorkDayStatusUi_();

            try {
                const coords = await getCurrentGeoCoordsForWorkDay_();
                const params = { action: actionName };
                const coordsValue = String(coords || '').trim();
                if (coordsValue) {
                    const parts = coordsValue.split(',');
                    const lat = String(parts[0] || '').trim();
                    const lon = String(parts[1] || '').trim();
                    params.coords = coordsValue;
                    if (lat) params.lat = lat;
                    if (lon) params.lon = lon;
                    if (actionName === 'startWorkDay') params.open_coordinates = coordsValue;
                    if (actionName === 'endWorkDay') params.close_coordinates = coordsValue;
                } else {
                    geoUnavailable = true;
                    if (actionName === 'startWorkDay') params.open_coordinates = noGeoMarker;
                    if (actionName === 'endWorkDay') params.close_coordinates = noGeoMarker;
                }

                const safeComment = String(comment || '').trim();
                if (safeComment) {
                    if (actionName === 'startWorkDay') params.open_comment = safeComment;
                    if (actionName === 'endWorkDay') params.close_comment = safeComment;
                }

                const response = await MproApi.applyWorkDayAction(params, 25000);
                if (!response || !response.success) {
                    const code = String(response?.code || '').toUpperCase();
                    if (code === 'ALREADY_OPEN' || code === 'ALREADY_CLOSED') {
                        mustResync = true;
                        showNotification('ℹ️ ' + (response?.error || 'Статус уже актуален'), 'info');
                        return;
                    }
                    throw new Error(response?.error || fallbackMessage);
                }
                if (!response.persisted) {
                    throw new Error('Сервер не подтвердил сохранение в таблице');
                }

                WorkDayRuntimeState.setLoaded(true);
                WorkDayRuntimeState.setOpen(!!response.open);
                WorkDayRuntimeState.setOpenTime(response.open ? (response.openTime || '') : '');
                WorkDayRuntimeState.clearError();
                WorkDayRuntimeState.markSynced(normalizeInspectorName_(RuntimeState.getCurrentUserName('')));

                if (geoUnavailable) {
                    const statusLabel = response.open ? 'Рабочий день открыт' : 'Рабочий день закрыт';
                    showNotification(`⚠️ ${statusLabel}. Геолокация недоступна, статус сохранен без координат`, 'info');
                } else {
                    showNotification(response.open ? '🟢 Рабочий день открыт' : '🔴 Рабочий день закрыт', 'success');
                }
            } catch (error) {
                mustResync = true;
                WorkDayRuntimeState.setLastError(error?.message || fallbackMessage);
                showNotification('❌ ' + WorkDayRuntimeState.getLastError(), 'error');
            } finally {
                WorkDayRuntimeState.setSyncing(false);
                renderWorkDayStatusUi_();
                if (mustResync) {
                    syncWorkDayStateFromServer_({ force: true, silent: true }).catch(() => null);
                }
            }
        }

        function handleWorkDayToggleChange_(target) {
            if (!(target instanceof HTMLInputElement)) return;

            const currentOpen = WorkDayRuntimeState.isOpen();
            const desiredOpen = !!target.checked;
            target.checked = currentOpen;

            if (!isInspectorRole_()) {
                showNotification('❌ Доступно только для роли "Инспектор"', 'error');
                renderWorkDayStatusUi_();
                return;
            }
            if (!WorkDayRuntimeState.isLoaded() || WorkDayRuntimeState.isSyncing()) {
                renderWorkDayStatusUi_();
                return;
            }
            if (desiredOpen === currentOpen) {
                renderWorkDayStatusUi_();
                return;
            }

            const question = desiredOpen ? 'Открыть рабочий день?' : 'Закрыть рабочий день?';
            if (!window.confirm(question)) {
                renderWorkDayStatusUi_();
                return;
            }

            const comment = window.prompt('Комментарий (необязательно):', '') || '';
            applyWorkDayAction_(desiredOpen ? 'start' : 'end', comment);
        }

// Explicit M-PRO backend API.
// Swaps between legacy JSONP and Supabase RPC transport.

        async function fetchDataFromSupabase_(options = {}) {
            const sessionToken = RuntimeState.getSessionToken();
            const dateToken = String(options.dateToken || buildDateToken_()).trim();
            const timeout = options.timeout || 15000;

            const [points, inspectorDirectory, inspectorsWorkDay] = await Promise.all([
                callMproSupabaseRpc_('getPoints', {
                    p_session_token: sessionToken
                }, timeout, 'mpro_get_points'),
                callMproSupabaseRpc_('getInspectorDirectory', {
                    p_session_token: sessionToken
                }, timeout, 'mpro_get_inspector_directory'),
                callMproSupabaseRpc_('getWorkDayStatusMap', {
                    p_session_token: sessionToken,
                    p_date_token: dateToken
                }, timeout, 'mpro_get_workday_status_map')
            ]);

            return {
                success: true,
                points: Array.isArray(points) ? points : [],
                inspectorsList: Array.isArray(inspectorDirectory?.inspectorsList) ? inspectorDirectory.inspectorsList : [],
                inspectorsConfig: inspectorDirectory?.inspectorsConfig && typeof inspectorDirectory.inspectorsConfig === 'object'
                    ? inspectorDirectory.inspectorsConfig
                    : {},
                inspectorsHomes: inspectorDirectory?.inspectorsHomes && typeof inspectorDirectory.inspectorsHomes === 'object'
                    ? inspectorDirectory.inspectorsHomes
                    : {},
                inspectorsWorkDay: inspectorsWorkDay && typeof inspectorsWorkDay === 'object'
                    ? inspectorsWorkDay
                    : {},
                timestamp: new Date().toISOString()
            };
        }

        function normalizeMproBootstrapBundlePayload_(payload, fallbackTimestamp = new Date().toISOString()) {
            const data = payload && typeof payload === 'object' ? payload : {};
            const timestamp = String(
                data.fetchedAt ||
                data.timestamp ||
                fallbackTimestamp ||
                new Date().toISOString()
            ).trim() || new Date().toISOString();
            const version = Math.max(0, Math.floor(Number(data.version) || 0));

            if (data.changed === false) {
                return {
                    success: true,
                    changed: false,
                    version,
                    fetchedAt: timestamp,
                    timestamp
                };
            }

            return {
                success: true,
                changed: true,
                version,
                fetchedAt: timestamp,
                points: Array.isArray(data.points) ? data.points : [],
                inspectorsList: Array.isArray(data.inspectorsList) ? data.inspectorsList : [],
                inspectorsConfig: data.inspectorsConfig && typeof data.inspectorsConfig === 'object'
                    ? data.inspectorsConfig
                    : {},
                inspectorsHomes: data.inspectorsHomes && typeof data.inspectorsHomes === 'object'
                    ? data.inspectorsHomes
                    : {},
                inspectorsWorkDay: data.inspectorsWorkDay && typeof data.inspectorsWorkDay === 'object'
                    ? data.inspectorsWorkDay
                    : {},
                timestamp
            };
        }

        async function fetchBootstrapBundleFromSupabase_(options = {}) {
            const sessionToken = RuntimeState.getSessionToken();
            const dateToken = String(options.dateToken || buildDateToken_()).trim();
            const timeout = options.timeout || 15000;
            const ifVersion = Math.max(0, Math.floor(Number(options.ifVersion) || 0));

            const payload = await callMproSupabaseRpc_('getBootstrapBundle', {
                p_session_token: sessionToken,
                p_date_token: dateToken,
                p_if_version: ifVersion > 0 ? ifVersion : null
            }, timeout, 'mpro_get_bootstrap_bundle');

            return normalizeMproBootstrapBundlePayload_(payload);
        }

        async function authViaSupabase_(params, timeout = 15000) {
            return callMproSupabaseRpc_('auth', {
                p_name: String(params?.identity || '').trim(),
                p_password: String(params?.password || ''),
                p_remember: !!params?.remember
            }, timeout, 'sf_auth');
        }

        async function checkWorkDayViaSupabase_(timeout = 20000) {
            return callMproSupabaseRpc_('checkWorkDay', {
                p_session_token: RuntimeState.getSessionToken(),
                p_date_token: buildDateToken_()
            }, timeout, 'mpro_check_workday');
        }

        async function applyWorkDayActionViaSupabase_(params, timeout = 25000) {
            const action = String(params?.action || '').trim();
            const safeAction = action === 'endWorkDay' ? 'end' : 'start';
            const coords = String(
                params?.coords ||
                params?.open_coordinates ||
                params?.close_coordinates ||
                ''
            ).trim();
            const comment = String(
                params?.open_comment ||
                params?.close_comment ||
                ''
            ).trim();

            return callMproSupabaseRpc_('applyWorkDayAction', {
                p_session_token: RuntimeState.getSessionToken(),
                p_action: safeAction,
                p_coords: coords,
                p_comment: comment
            }, timeout, 'mpro_apply_workday_action');
        }

        async function saveInspectorConfigViaSupabase_(params, timeout = 15000) {
            return callMproSupabaseRpc_('saveInspectorConfig', {
                p_session_token: RuntimeState.getSessionToken(),
                p_inspector: String(params?.inspector || '').trim(),
                p_color: String(params?.color || '').trim()
            }, timeout, 'mpro_save_inspector_config');
        }

        async function executeObjectActionViaSupabase_(params, timeout = 15000) {
            return callMproSupabaseRpc_('executeObjectAction', {
                p_session_token: RuntimeState.getSessionToken(),
                p_payload: params || {}
            }, timeout, 'mpro_execute_object_action');
        }

        async function archiveCompletedViaSupabase_(timeout = 60000) {
            return callMproSupabaseRpc_('archiveCompleted', {
                p_session_token: RuntimeState.getSessionToken()
            }, timeout, 'mpro_archive_completed');
        }

        async function yandexCreateFolderViaSupabase_(path, timeout = 30000) {
            return callMproSupabaseRpc_('yandexCreateFolder', {
                p_session_token: RuntimeState.getSessionToken(),
                p_path: String(path || '').trim()
            }, timeout, 'mpro_yandex_create_folder');
        }

        async function yandexCheckFolderViaSupabase_(path, timeout = 30000) {
            return callMproSupabaseRpc_('yandexCheckFolder', {
                p_session_token: RuntimeState.getSessionToken(),
                p_path: String(path || '').trim()
            }, timeout, 'mpro_yandex_check_folder');
        }

        async function savePhotosLinkViaSupabase_(params, timeout = 15000) {
            return callMproSupabaseRpc_('savePhotosLink', {
                p_session_token: RuntimeState.getSessionToken(),
                p_db_object_id: String(params?.dbObjectId || params?.objectId || '').trim(),
                p_db_visit_id: String(params?.dbVisitId || '').trim() || null,
                p_photos_url: String(params?.photosLink || '').trim()
            }, timeout, 'mpro_save_photos_link');
        }

        function buildUnsupportedSupabaseActionResult_(message) {
            return Promise.resolve({
                success: false,
                error: String(message || 'Действие пока не перенесено на Supabase').trim()
            });
        }

        const MproApi = Object.freeze({
            async fetchData(options = {}) {
                if (isSupabaseBackendTransport_()) {
                    if (options.useBundle !== false) {
                        try {
                            return await fetchBootstrapBundleFromSupabase_(options);
                        } catch (error) {
                            if (!isMissingSupabaseRpcError_(error)) {
                                throw error;
                            }
                        }
                    }
                    return fetchDataFromSupabase_(options);
                }
                return createJsonpRequest({
                    action: 'getData',
                    dateToken: options.dateToken || buildDateToken_()
                }, options.timeout || 15000);
            },

            authNonce(timeout = 10000) {
                if (isSupabaseBackendTransport_()) {
                    return Promise.resolve({ success: true, nonceId: 'supabase', nonce: 'supabase' });
                }
                return createJsonpRequest({ action: 'authNonce' }, timeout);
            },

            auth(params, timeout = 15000) {
                if (isSupabaseBackendTransport_()) {
                    return authViaSupabase_(params, timeout);
                }
                return createJsonpRequest({
                    action: 'auth',
                    nonceId: params?.nonceId,
                    proof: params?.proof,
                    remember: params?.remember ? '1' : '0'
                }, timeout);
            },

            archiveCompleted(timeout = 60000) {
                if (isSupabaseBackendTransport_()) {
                    return archiveCompletedViaSupabase_(timeout);
                }
                return createJsonpRequest({ action: 'archiveCompleted' }, timeout);
            },

            executeObjectAction(params, timeout = 15000) {
                if (isSupabaseBackendTransport_()) {
                    return executeObjectActionViaSupabase_(params, timeout);
                }
                return createJsonpRequest(params, timeout);
            },

            saveInspectorConfig(params, timeout = 15000) {
                if (isSupabaseBackendTransport_()) {
                    return saveInspectorConfigViaSupabase_(params, timeout);
                }
                return createJsonpRequest({
                    action: 'saveInspectorConfig',
                    inspector: params?.inspector,
                    color: params?.color
                }, timeout);
            },

            checkWorkDay(timeout = 20000) {
                if (isSupabaseBackendTransport_()) {
                    return checkWorkDayViaSupabase_(timeout);
                }
                return createJsonpRequest({ action: 'checkWorkDay' }, timeout);
            },

            applyWorkDayAction(params, timeout = 25000) {
                if (isSupabaseBackendTransport_()) {
                    return applyWorkDayActionViaSupabase_(params, timeout);
                }
                return createJsonpRequest(params, timeout);
            },

            yandexCreateFolder(path, timeout = 30000) {
                if (isSupabaseBackendTransport_()) {
                    return yandexCreateFolderViaSupabase_(path, timeout);
                    return buildUnsupportedSupabaseActionResult_('Интеграция с Яндекс.Диском ещё не перенесена на Supabase');
                }
                return createJsonpRequest({
                    action: 'yandexCreateFolder',
                    path: String(path || '')
                }, timeout);
            },

            yandexCheckFolder(path, timeout = 30000) {
                if (isSupabaseBackendTransport_()) {
                    return yandexCheckFolderViaSupabase_(path, timeout);
                    return buildUnsupportedSupabaseActionResult_('Интеграция с Яндекс.Диском ещё не перенесена на Supabase');
                }
                return createJsonpRequest({
                    action: 'yandexCheckFolder',
                    path: String(path || '')
                }, timeout);
            },

            savePhotosLink(params, timeout = 15000) {
                if (isSupabaseBackendTransport_()) {
                    return savePhotosLinkViaSupabase_(params, timeout);
                    return buildUnsupportedSupabaseActionResult_('Сохранение ссылок Яндекс.Диска на Supabase ещё не перенесено');
                }
                return createJsonpRequest({
                    action: 'savePhotosLink',
                    objectId: String(params?.objectId || ''),
                    source: params?.source || 'Map',
                    rowIndex: String(params?.rowIndex || ''),
                    photosLink: params?.photosLink || ''
                }, timeout);
            }
        });

        window.MproApi = MproApi;

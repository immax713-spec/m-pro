// Auth/session module extracted from session-access.js.
// Owns session persistence, auth flow, and post-auth boot flow.

        const SITE_SESSION_STORAGE_KEY = 'smart_filter_shell_session';
        const SITE_SESSION_PERSIST_STORAGE_KEY = 'smart_filter_shell_session_persist';
        const SITE_APP_ENTRY_URL = 'index.html';

        function sanitizeSessionUserMetaText_(value) {
            const text = String(value == null ? '' : value).trim();
            if (!text) return '';
            const meaningful = text.replace(/[\?\uFFFD\s·._-]+/g, '');
            return meaningful ? text : '';
        }

        function normalizeSessionAllowedApps_(rawValue, apps) {
            const allowed = new Set(['site', 'mpro']);
            const source = Array.isArray(rawValue)
                ? rawValue
                : (typeof rawValue === 'string' ? rawValue.split(/[,\s;|]+/) : []);
            const out = [];
            source.forEach(item => {
                const code = String(item || '').trim().toLowerCase();
                if (!code || !allowed.has(code) || out.includes(code)) return;
                out.push(code);
            });
            if (!out.length && apps && typeof apps === 'object') {
                Object.keys(apps).forEach(key => {
                    const code = String(key || '').trim().toLowerCase();
                    if (!code || !allowed.has(code) || out.includes(code)) return;
                    out.push(code);
                });
            }
            return out;
        }

        function normalizeCurrentAppUser_(user) {
            if (!user || typeof user !== 'object') return null;
            const fallbackRole = sanitizeSessionUserMetaText_(user.role);
            const fallbackDivision = sanitizeSessionUserMetaText_(user.division);
            const apps = (user.apps && typeof user.apps === 'object' && !Array.isArray(user.apps)) ? user.apps : {};
            const allowedApps = normalizeSessionAllowedApps_(user.allowedApps || user.allowed_apps, apps);
            const mproProfile = allowedApps.includes('mpro') && apps.mpro && typeof apps.mpro === 'object'
                ? apps.mpro
                : null;
            const role = mproProfile ? (sanitizeSessionUserMetaText_(mproProfile.role) || fallbackRole) : fallbackRole;
            const division = mproProfile ? (sanitizeSessionUserMetaText_(mproProfile.division) || fallbackDivision) : fallbackDivision;
            const defaultAppRaw = String(user.defaultApp || user.default_app || '').trim().toLowerCase();
            const defaultApp = allowedApps.includes(defaultAppRaw) ? defaultAppRaw : (allowedApps[0] || '');
            return {
                ...user,
                id: user.id == null ? null : user.id,
                name: String(user.name || '').trim(),
                login: String(user.login || '').trim(),
                role,
                division,
                apps,
                allowedApps,
                allowed_apps: allowedApps,
                defaultApp,
                default_app: defaultApp
            };
        }

        function hasMeaningfulSessionIdentity_(user) {
            if (!user || typeof user !== 'object') return false;
            return !!(
                sanitizeSessionUserMetaText_(user.name) ||
                sanitizeSessionUserMetaText_(user.login) ||
                sanitizeSessionUserMetaText_(user.role) ||
                sanitizeSessionUserMetaText_(user.division)
            );
        }

        function getNormalizedSessionAllowedApps_(user) {
            if (!user || typeof user !== 'object') return [];
            const apps = (user.apps && typeof user.apps === 'object' && !Array.isArray(user.apps)) ? user.apps : {};
            return normalizeSessionAllowedApps_(user.allowedApps || user.allowed_apps, apps);
        }

        function isSessionAllowedForMpro_(sessionPayload) {
            if (!sessionPayload?.user || !sessionPayload.sessionToken) return false;
            const allowedApps = getNormalizedSessionAllowedApps_(sessionPayload.user);
            return !allowedApps.length || allowedApps.includes('mpro');
        }

        function parseSessionPayload_(raw) {
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return null;
                if (!parsed.user || !parsed.sessionToken) return null;
                if (parsed.expiresAt) {
                    const expiresAtMs = Date.parse(parsed.expiresAt);
                    if (Number.isFinite(expiresAtMs) && Date.now() >= expiresAtMs) return null;
                }
                const normalizedUser = normalizeCurrentAppUser_(parsed.user);
                if (!normalizedUser) return null;
                return {
                    user: normalizedUser,
                    sessionToken: String(parsed.sessionToken || ''),
                    expiresAt: String(parsed.expiresAt || '')
                };
            } catch (error) {
                return null;
            }
        }

        function readStorageValueSafe_(storage, key) {
            try {
                return storage.getItem(key);
            } catch (_error) {
                return '';
            }
        }

        function removeStorageValueSafe_(storage, key) {
            try {
                storage.removeItem(key);
            } catch (_error) {
                // no-op
            }
        }

        function buildStoredSessionCandidate_(storage, key, meta = {}) {
            const raw = readStorageValueSafe_(storage, key);
            if (!raw) return null;

            const session = parseSessionPayload_(raw);
            if (!session) {
                removeStorageValueSafe_(storage, key);
                return null;
            }
            if (!isSessionAllowedForMpro_(session)) {
                return null;
            }

            return {
                session,
                source: String(meta.source || '').trim().toLowerCase(),
                remember: !!meta.remember,
                isSessionStorage: !!meta.isSessionStorage
            };
        }

        function scoreStoredSessionCandidate_(candidate) {
            if (!candidate?.session) return -1;
            let score = 0;
            if (hasMeaningfulSessionIdentity_(candidate.session.user)) score += 100;
            if (candidate.isSessionStorage) score += 20;
            if (candidate.source === 'site') score += 30;
            return score;
        }

        function shouldRememberCurrentSession_() {
            try {
                return !!(
                    localStorage.getItem(CONFIG.SESSION_PERSIST_KEY) ||
                    localStorage.getItem(SITE_SESSION_PERSIST_STORAGE_KEY)
                );
            } catch (_error) {
                return false;
            }
        }

        function areSessionUsersEquivalent_(leftUser, rightUser) {
            const left = normalizeCurrentAppUser_(leftUser);
            const right = normalizeCurrentAppUser_(rightUser);
            if (!left || !right) return left === right;

            const leftAllowed = getNormalizedSessionAllowedApps_(left).join('|');
            const rightAllowed = getNormalizedSessionAllowedApps_(right).join('|');

            return (
                String(left.id ?? '') === String(right.id ?? '') &&
                String(left.login || '') === String(right.login || '') &&
                String(left.name || '') === String(right.name || '') &&
                String(left.role || '') === String(right.role || '') &&
                String(left.division || '') === String(right.division || '') &&
                leftAllowed === rightAllowed
            );
        }

        function readStoredSession_() {
            const candidates = [
                buildStoredSessionCandidate_(window.sessionStorage, SITE_SESSION_STORAGE_KEY, {
                    source: 'site',
                    remember: false,
                    isSessionStorage: true
                }),
                buildStoredSessionCandidate_(window.localStorage, SITE_SESSION_PERSIST_STORAGE_KEY, {
                    source: 'site',
                    remember: true,
                    isSessionStorage: false
                }),
                buildStoredSessionCandidate_(window.sessionStorage, CONFIG.SESSION_KEY, {
                    source: 'mpro',
                    remember: false,
                    isSessionStorage: true
                }),
                buildStoredSessionCandidate_(window.localStorage, CONFIG.SESSION_PERSIST_KEY, {
                    source: 'mpro',
                    remember: true,
                    isSessionStorage: false
                })
            ]
                .filter(Boolean)
                .sort((left, right) => scoreStoredSessionCandidate_(right) - scoreStoredSessionCandidate_(left));

            if (!candidates.length) return null;

            const selected = candidates[0];
            if (selected.source === 'site') {
                persistSession_(selected.session, { remember: selected.remember });
            }
            return selected.session;
        }

        function persistSession_(sessionPayload, options = {}) {
            if (!sessionPayload || !sessionPayload.user || !sessionPayload.sessionToken) return;
            const remember = !!options.remember;
            const payload = JSON.stringify({
                user: sessionPayload.user,
                sessionToken: String(sessionPayload.sessionToken || ''),
                expiresAt: String(sessionPayload.expiresAt || '')
            });
            if (remember) {
                localStorage.setItem(CONFIG.SESSION_PERSIST_KEY, payload);
                sessionStorage.removeItem(CONFIG.SESSION_KEY);
            } else {
                sessionStorage.setItem(CONFIG.SESSION_KEY, payload);
                localStorage.removeItem(CONFIG.SESSION_PERSIST_KEY);
            }
        }

        function clearStoredSession_() {
            sessionStorage.removeItem(CONFIG.SESSION_KEY);
            localStorage.removeItem(CONFIG.SESSION_PERSIST_KEY);
            RuntimeState.clearBootstrapVersion();
            RuntimeState.clearBootstrapFetchedAt();
            RuntimeState.clearBootstrapDateToken();
            if (typeof clearBootstrapCache_ === 'function') {
                clearBootstrapCache_();
            }
        }

        function getCurrentUserAllowedApps_() {
            const currentUser = RuntimeState.getCurrentUser();
            const source = Array.isArray(currentUser?.allowedApps)
                ? currentUser.allowedApps
                : (Array.isArray(currentUser?.allowed_apps) ? currentUser.allowed_apps : []);
            return source
                .map(code => String(code || '').trim().toLowerCase())
                .filter((code, index, all) => code && all.indexOf(code) === index);
        }

        function buildAppSwitchSessionPayload_() {
            const stored = readStoredSession_();
            if (stored?.user && stored?.sessionToken) {
                return {
                    user: stored.user,
                    sessionToken: String(stored.sessionToken || ''),
                    expiresAt: String(stored.expiresAt || '')
                };
            }
            if (!RuntimeState.hasCurrentUser() || !RuntimeState.getSessionToken()) return null;
            return {
                user: RuntimeState.getCurrentUser(),
                sessionToken: RuntimeState.getSessionToken(),
                expiresAt: ''
            };
        }

        function persistSiteShellSession_(sessionPayload) {
            if (!sessionPayload?.user || !sessionPayload?.sessionToken) return;
            const payload = JSON.stringify({
                user: sessionPayload.user,
                sessionToken: String(sessionPayload.sessionToken || ''),
                expiresAt: String(sessionPayload.expiresAt || '')
            });
            try {
                window.sessionStorage.setItem(SITE_SESSION_STORAGE_KEY, payload);
                window.localStorage.removeItem(SITE_SESSION_PERSIST_STORAGE_KEY);
            } catch (_) {
                // no-op
            }
        }

        function clearSiteShellSession_() {
            try {
                window.sessionStorage.removeItem(SITE_SESSION_STORAGE_KEY);
                window.localStorage.removeItem(SITE_SESSION_PERSIST_STORAGE_KEY);
            } catch (_) {
                // no-op
            }
        }

        async function syncCurrentUserFromSessionToken_(options = {}) {
            if (!isSupabaseBackendTransport_()) return RuntimeState.getCurrentUser();

            const sessionToken = String(options.sessionToken || RuntimeState.getSessionToken()).trim();
            if (!sessionToken) return null;

            const timeoutMs = Math.max(4000, Number(options.timeoutMs) || 8000);
            const response = await callMproSupabaseRpc_('getSessionUser', {
                p_session_token: sessionToken
            }, timeoutMs, 'sf_get_session_user');

            const rawUser = response && typeof response === 'object' && response.user && typeof response.user === 'object'
                ? response.user
                : response;
            const normalizedUser = normalizeCurrentAppUser_(rawUser);
            if (!normalizedUser || !isSessionAllowedForMpro_({ user: normalizedUser, sessionToken })) {
                throw new Error('Не удалось определить пользователя M-PRO');
            }

            const currentUser = RuntimeState.getCurrentUser();
            const shouldRefreshUi = !areSessionUsersEquivalent_(currentUser, normalizedUser) || !hasMeaningfulSessionIdentity_(currentUser);
            if (shouldRefreshUi) {
                RuntimeState.setCurrentUser(normalizedUser);
                persistSession_({
                    user: normalizedUser,
                    sessionToken,
                    expiresAt: String(options.expiresAt || response?.expiresAt || '')
                }, {
                    remember: shouldRememberCurrentSession_()
                });
                updateUserCard();
            }

            return normalizedUser;
        }

        function syncAppSwitcherUi_() {
            const root = document.getElementById('appSwitcher');
            const mproButton = document.getElementById('btnOpenMpro');
            const siteButton = document.getElementById('btnOpenSite');
            if (!root || !mproButton || !siteButton) return;

            const allowedApps = getCurrentUserAllowedApps_();
            const hasMultipleApps = allowedApps.length > 1;
            root.classList.toggle('visible', hasMultipleApps);
            mproButton.classList.toggle('active', true);
            siteButton.classList.toggle('active', false);
            mproButton.disabled = !allowedApps.includes('mpro');
            siteButton.disabled = !allowedApps.includes('site');
        }

        function openApp_(appCode) {
            const code = String(appCode || '').trim().toLowerCase();
            if (!code || code === 'mpro') return;

            const allowedApps = getCurrentUserAllowedApps_();
            if (!allowedApps.includes(code)) {
                showNotification('Нет доступа к выбранному приложению', 'error');
                return;
            }

            if (code === 'site') {
                const sessionPayload = buildAppSwitchSessionPayload_();
                if (!sessionPayload) {
                    showNotification('Не удалось подготовить сессию для перехода', 'error');
                    return;
                }
                persistSiteShellSession_(sessionPayload);
                window.location.href = SITE_APP_ENTRY_URL;
            }
        }

        function clearLegacyStoredAuth_() {
            try {
                localStorage.removeItem(CONFIG.AUTH_IDENTITY_KEY);
                localStorage.removeItem(CONFIG.AUTH_PASSWORD_KEY);
                localStorage.removeItem(CONFIG.AUTH_REMEMBER_KEY);
            } catch (_) {
                // no-op
            }
        }

        let authBrandLogoReplayTimer_ = 0;
        let authBrandLogoToggleTimer_ = 0;

        function initializeAuthBrandLogo_() {
            const logo = document.getElementById('authBrandLogoSvg');
            const path = document.getElementById('authBrandLogoPath');
            if (authBrandLogoReplayTimer_) {
                clearTimeout(authBrandLogoReplayTimer_);
                authBrandLogoReplayTimer_ = 0;
            }
            if (authBrandLogoToggleTimer_) {
                clearTimeout(authBrandLogoToggleTimer_);
                authBrandLogoToggleTimer_ = 0;
            }
            if (logo) logo.classList.remove('is-replaying');
            if (!path || typeof path.getTotalLength !== 'function') return;
            const length = Number(path.dataset.logoLength) || path.getTotalLength();
            path.dataset.logoLength = String(length);
            path.style.transition = '';
            path.style.strokeDasharray = `${length} ${length}`;
            path.style.strokeDashoffset = '0';
        }

        function replayAuthBrandLogo_(onComplete) {
            const logo = document.getElementById('authBrandLogoSvg');
            const path = document.getElementById('authBrandLogoPath');
            if (!path || typeof path.getTotalLength !== 'function') {
                if (typeof onComplete === 'function') onComplete();
                return;
            }

            initializeAuthBrandLogo_();
            const length = Number(path.dataset.logoLength) || path.getTotalLength();
            if (logo) logo.classList.add('is-replaying');

            const snakeLength = Math.max(72, Math.round(length * 0.14));
            const eraseDuration = 520;
            const drawDuration = 640;

            path.style.transition = 'none';
            path.style.strokeDasharray = `${length} ${length}`;
            path.style.strokeDashoffset = '0';
            path.getBoundingClientRect();

            authBrandLogoReplayTimer_ = window.setTimeout(() => {
                path.style.transition = `stroke-dasharray ${eraseDuration}ms cubic-bezier(.65,0,.35,1), stroke-dashoffset ${eraseDuration}ms cubic-bezier(.65,0,.35,1)`;
                path.style.strokeDasharray = `${snakeLength} ${length}`;
                path.style.strokeDashoffset = `-${Math.max(0, length - snakeLength)}`;
                authBrandLogoReplayTimer_ = 0;

                authBrandLogoToggleTimer_ = window.setTimeout(() => {
                    path.style.transition = 'none';
                    path.style.strokeDasharray = `${length} ${length}`;
                    path.style.strokeDashoffset = `${length}`;
                    path.getBoundingClientRect();
                    window.requestAnimationFrame(() => {
                        path.style.transition = `stroke-dashoffset ${drawDuration}ms cubic-bezier(.33,1,.68,1)`;
                        path.style.strokeDashoffset = '0';
                    });

                    authBrandLogoToggleTimer_ = window.setTimeout(() => {
                        if (logo) logo.classList.remove('is-replaying');
                        path.style.transition = '';
                        path.style.strokeDasharray = `${length} ${length}`;
                        path.style.strokeDashoffset = '0';
                        authBrandLogoToggleTimer_ = 0;
                        if (typeof onComplete === 'function') onComplete();
                    }, drawDuration);
                }, eraseDuration);
            }, 16);
        }

        function setAuthLoadingUi_(isLoading) {
            const card = document.getElementById('authCard');
            const button = document.querySelector('.auth-btn');
            if (card) card.classList.toggle('is-loading', !!isLoading);
            if (button) button.classList.toggle('loading', !!isLoading);
            if (isLoading) replayAuthBrandLogo_();
            else initializeAuthBrandLogo_();
        }

        const bootSession = readStoredSession_();
        const isLoggedIn = !!bootSession;

        async function sha256HexClient_(text) {
            const data = new TextEncoder().encode(String(text || ''));
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        function waitForAuthRetry_(delayMs) {
            return new Promise((resolve) => {
                setTimeout(resolve, Math.max(0, Number(delayMs) || 0));
            });
        }

        async function authViaSupabaseWithRetry_(params, options = {}) {
            const attempts = Math.max(1, Number(options.attempts) || 2);
            const timeoutMs = Math.max(8000, Number(options.timeoutMs) || 18000);
            let lastError = null;

            for (let attempt = 1; attempt <= attempts; attempt += 1) {
                try {
                    return await MproApi.auth(params, timeoutMs);
                } catch (error) {
                    lastError = error;
                    const shouldRetry = attempt < attempts && isRetriableSupabaseTransportError_(error);
                    if (!shouldRetry) {
                        throw error;
                    }
                    await waitForAuthRetry_(650 * attempt);
                }
            }

            throw lastError || new Error('Ошибка соединения с сервером');
        }

        async function doLogin() {
            const identityInput = document.getElementById('authIdentity');
            const passwordInput = document.getElementById('authPassword');
            const errorDiv = document.getElementById('authError');
            const btn = document.querySelector('.auth-btn');
            const identity = String(identityInput?.value || '').trim();
            const password = passwordInput.value.trim();
            const remember = false;
            
            if (isSupabaseBackendTransport_() && !identity) {
                showAuthError('Введите логин');
                identityInput?.classList.add('error');
                setTimeout(() => identityInput?.classList.remove('error'), 500);
                identityInput?.focus();
                return;
            }

            if (!password) {
                showAuthError('Введите пароль');
                passwordInput.classList.add('error');
                setTimeout(() => passwordInput.classList.remove('error'), 500);
                passwordInput.focus();
                return;
            }
            
            setAuthLoadingUi_(true);
            btn.disabled = true;
            errorDiv.classList.remove('show');

            try {
                let authResponse;
                if (isSupabaseBackendTransport_()) {
                    authResponse = await authViaSupabaseWithRetry_({
                        identity: identity,
                        password: password,
                        remember: remember
                    }, {
                        attempts: 2,
                        timeoutMs: 18000
                    });
                } else {
                    const nonceResponse = await MproApi.authNonce(10000);
                    if (!nonceResponse?.success || !nonceResponse?.nonceId || !nonceResponse?.nonce) {
                        throw new Error(nonceResponse?.error || 'Не удалось получить nonce');
                    }

                    const proof = await sha256HexClient_(`${password}|${nonceResponse.nonce}`);
                    authResponse = await MproApi.auth({
                        nonceId: nonceResponse.nonceId,
                        proof: proof,
                        remember: remember
                    }, 15000);
                }

                if (authResponse?.success && authResponse?.user && authResponse?.sessionToken) {
                    const normalizedUser = normalizeCurrentAppUser_(authResponse.user);
                    if (!normalizedUser) throw new Error('Не удалось подготовить сессию M-PRO');
                    if (false) {
                        throw new Error(
                            normalizedUser && Array.isArray(normalizedUser.allowedApps) && normalizedUser.allowedApps.includes('site')
                                ? 'У вас нет доступа к M-PRO. Для этого пользователя открыт только Site.'
                                : 'У вас нет доступа к M-PRO'
                        );
                    }
                    RuntimeState.setCurrentUser(normalizedUser);
                    RuntimeState.setSessionToken(authResponse.sessionToken);
                    persistSession_({
                        user: normalizedUser,
                        sessionToken: authResponse.sessionToken,
                        expiresAt: authResponse.expiresAt || ''
                    }, { remember });
                    showSuccessAndContinue();
                    return;
                }

                showAuthError(authResponse?.error || 'Неверный логин или пароль');
                passwordInput.classList.add('error');
                setTimeout(() => passwordInput.classList.remove('error'), 500);
                passwordInput.focus();
            } catch (error) {
                showAuthError(error?.message || 'Ошибка соединения с сервером');
            } finally {
                setAuthLoadingUi_(false);
                btn.disabled = false;
            }
        }

        function showAuthError(message) {
            const errorDiv = document.getElementById('authError');
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
        }

        function clearSessionScopedUiData_() {
            RuntimeState.clearDataLoadPromise();
            RuntimeState.clearMapSearchQuery();
            syncSearchInputsValue_('');
            closeObjectDetails();

            DataState.clearObjectsData();
            DataState.clearInspectorsList();
            DataState.clearInspectorsHomesData();
            DataState.setInspectorsConfig({});
            DataState.clearInspectorsWorkDay();

            FiltersState.setCurrent({ inspectors: [], lists: [] });
            FiltersState.setObjectsTabInspectorCache({ inspectors: [], divisions: [] });
            FiltersState.getRecentlyCompletedMap().clear();

            UIState.restoreObjectsListRenderCache({ active: '', new: '', completed: '' });
            UIState.setObjectsBadge('active', null);
            UIState.setObjectsBadge('new', null);
            UIState.setObjectsBadge('completed', null);
            UIState.setSelectedObjectId(null);

            renderFilterLists();
            scheduleObjectsListRender_();
        }

        function showSuccessAndContinue() {
            clearSessionScopedUiData_();
            hideAuthOverlay();
            if (typeof markMproShellReady_ === 'function') {
                markMproShellReady_();
            }
            updateUserCard();
            resetWorkDayState_();
            RuntimeState.clearDataLoadPromise();
            loadDataWithRetry_({ attempts: 3, retryDelayMs: 800, reason: 'post-login' })
                .catch((error) => {
                    console.error('Post-login data load failed:', error);
                    if (typeof setWorkDayUnavailableState_ === 'function' && !WorkDayRuntimeState.isLoaded()) {
                        setWorkDayUnavailableState_(error?.message || '');
                    }
                    showNotification('Ошибка загрузки данных. Попробуйте ещё раз', 'error');
                })
                .finally(() => {
                    if (RuntimeState.hasCurrentUser()) {
                        scheduleBackgroundRefresh_('post-login-ready');
                    }
                });
            scheduleMenuIndicatorSync_();
            syncMobileLayoutState_();
        }

        function hideAuthOverlay() {
            const overlay = document.getElementById('authOverlay');
            overlay.classList.add('hidden');
            initializeAuthBrandLogo_();
        }

        function updateUserCard() {
            const userRole = document.querySelector('.user-role');
            const userName = document.querySelector('.user-name');
            const userEmoji = document.querySelector('.user-emoji');
            const currentUser = RuntimeState.getCurrentUser();
            const roleText = sanitizeSessionUserMetaText_(currentUser?.role);
            const nameText = sanitizeSessionUserMetaText_(currentUser?.name) || sanitizeSessionUserMetaText_(currentUser?.login);
            
            debugLog('👤 updateUserCard:', currentUser);
            
            if (userRole) userRole.textContent = roleText ? `${roleText}:` : 'Проверка доступа:';
            if (userName) userName.textContent = nameText || 'Подключение...';
            if (userEmoji) userEmoji.textContent = CONFIG.DEFAULTS?.INSPECTOR_ICON || '👤';
            syncAppSwitcherUi_();
            applyRoleVisibility_();
            renderWorkDayStatusUi_();
        }

        function logout() {
            if (!confirm('Выйти из системы?')) return;
            
            stopBackgroundRefresh_();
            clearStoredSession_();
            clearSiteShellSession_();
            RuntimeState.clearDataLoadPromise();
            RuntimeState.clearCurrentUser();
            RuntimeState.clearSessionToken();
            RuntimeState.clearMapSearchQuery();
            syncSearchInputsValue_('');
            closeMobileSidebar_();
            setMapInlineSearchOpen_(false);
            resetWorkDayState_();
            applyRoleVisibility_();
            clearSessionScopedUiData_();
            syncAppSwitcherUi_();
            
            MapState.destroyMapInstance();
            MapState.setHomesLayer(null);
            
            clearLegacyStoredAuth_();
            const identityInput = document.getElementById('authIdentity');
            const passwordInput = document.getElementById('authPassword');
            if (identityInput) identityInput.value = '';
            if (passwordInput) passwordInput.value = '';
            
            const errorDiv = document.getElementById('authError');
            if (errorDiv) errorDiv.classList.remove('show');
            
            window.location.replace(SITE_APP_ENTRY_URL);
        }

        clearLegacyStoredAuth_();

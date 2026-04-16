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

        function readStoredSession_() {
            const tempRaw = sessionStorage.getItem(CONFIG.SESSION_KEY);
            const tempSession = parseSessionPayload_(tempRaw);
            if (tempSession) return tempSession;

            const persistedRaw = localStorage.getItem(CONFIG.SESSION_PERSIST_KEY);
            const persistedSession = parseSessionPayload_(persistedRaw);
            if (persistedSession) return persistedSession;

            if (persistedRaw) localStorage.removeItem(CONFIG.SESSION_PERSIST_KEY);
            return null;
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
                    authResponse = await MproApi.auth({
                        identity: identity,
                        password: password,
                        remember: remember
                    }, 15000);
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
            initWorkDayStateForCurrentUser_({ force: true, silent: true });
            initMap();
            RuntimeState.clearDataLoadPromise();
            loadDataWithRetry_({ attempts: 3, retryDelayMs: 800, reason: 'post-login' })
                .catch((error) => {
                    console.error('Post-login data load failed:', error);
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
            if (!RuntimeState.hasCurrentUser()) return;
            
            const userRole = document.querySelector('.user-role');
            const userName = document.querySelector('.user-name');
            const userEmoji = document.querySelector('.user-emoji');
            const currentUser = RuntimeState.getCurrentUser();
            
            debugLog('👤 updateUserCard:', currentUser);
            
            if (userRole && currentUser.role) userRole.textContent = currentUser.role + ':';
            if (userName && currentUser.name) userName.textContent = currentUser.name;
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

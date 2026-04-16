// Lightweight Supabase RPC transport for M-PRO.
// Uses publishable key + security definer RPCs, without loading supabase-js.

        function isSupabaseBackendTransport_() {
            return String(CONFIG.BACKEND?.transport || 'jsonp').trim().toLowerCase() === 'supabase';
        }

        function getMproSupabaseConfig_() {
            const config = window.__M_PRO_SUPABASE_CONFIG && typeof window.__M_PRO_SUPABASE_CONFIG === 'object'
                ? window.__M_PRO_SUPABASE_CONFIG
                : {};
            const supabaseUrl = String(config.supabaseUrl || '').trim().replace(/\/+$/g, '');
            const supabaseAnonKey = String(config.supabaseAnonKey || '').trim();
            const schema = String(config.schema || 'api').trim() || 'api';
            const rpc = config.rpc && typeof config.rpc === 'object'
                ? config.rpc
                : {};
            return {
                supabaseUrl,
                supabaseAnonKey,
                schema,
                rpc
            };
        }

        function getSupabaseRpcUrl_(rpcName) {
            const config = getMproSupabaseConfig_();
            if (!config.supabaseUrl) {
                throw new Error('Supabase URL is not configured');
            }
            if (!config.supabaseAnonKey) {
                throw new Error('Supabase publishable key is not configured');
            }
            const safeRpcName = String(rpcName || '').trim().replace(/^\/+/g, '');
            if (!safeRpcName) {
                throw new Error('Supabase RPC name is not configured');
            }
            return `${config.supabaseUrl}/rest/v1/rpc/${encodeURIComponent(safeRpcName)}`;
        }

        function getSupabaseRpcHeaders_() {
            const config = getMproSupabaseConfig_();
            return {
                apikey: config.supabaseAnonKey,
                Authorization: `Bearer ${config.supabaseAnonKey}`,
                'Content-Type': 'application/json; charset=utf-8',
                Accept: 'application/json',
                Prefer: `params=single-object`,
                'Accept-Profile': config.schema,
                'Content-Profile': config.schema
            };
        }

        function getSupabaseFunctionUrl_(functionName) {
            const config = getMproSupabaseConfig_();
            if (!config.supabaseUrl) {
                throw new Error('Supabase URL is not configured');
            }
            if (!config.supabaseAnonKey) {
                throw new Error('Supabase publishable key is not configured');
            }
            const safeFunctionName = String(functionName || '').trim().replace(/^\/+/g, '');
            if (!safeFunctionName) {
                throw new Error('Supabase function name is not configured');
            }
            return `${config.supabaseUrl}/functions/v1/${encodeURIComponent(safeFunctionName)}`;
        }

        function getSupabaseFunctionHeaders_() {
            const config = getMproSupabaseConfig_();
            return {
                apikey: config.supabaseAnonKey,
                Authorization: `Bearer ${config.supabaseAnonKey}`,
                'Content-Type': 'application/json; charset=utf-8',
                Accept: 'application/json'
            };
        }

        async function parseSupabaseRpcResponse_(response) {
            const responseText = await response.text();
            let payload = null;
            if (responseText) {
                try {
                    payload = JSON.parse(responseText);
                } catch (_) {
                    payload = { message: responseText };
                }
            }

            if (response.ok) {
                return payload;
            }

            const message = String(
                payload?.message ||
                payload?.error ||
                payload?.details ||
                response.statusText ||
                'Supabase RPC error'
            ).trim() || 'Supabase RPC error';
            const code = String(payload?.code || '').trim().toUpperCase();
            const error = new Error(message);
            error.code = code || String(response.status || '');
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        async function parseSupabaseFunctionResponse_(response) {
            const responseText = await response.text();
            let payload = null;
            if (responseText) {
                try {
                    payload = JSON.parse(responseText);
                } catch (_) {
                    payload = { message: responseText };
                }
            }

            if (response.ok) {
                return payload;
            }

            const message = String(
                payload?.message ||
                payload?.error ||
                payload?.details ||
                response.statusText ||
                'Supabase function error'
            ).trim() || 'Supabase function error';
            const code = String(payload?.code || '').trim().toUpperCase();
            const error = new Error(message);
            error.code = code || String(response.status || '');
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        function isUnauthorizedSupabaseError_(error) {
            const code = String(error?.code || '').trim().toUpperCase();
            const status = Number(error?.status || 0);
            const message = String(error?.message || '').trim().toUpperCase();
            return (
                code === 'UNAUTHORIZED' ||
                code === 'PGRST301' ||
                status === 401 ||
                message.indexOf('UNAUTHORIZED') >= 0
            );
        }

        function isMissingSupabaseRpcError_(error) {
            const code = String(error?.code || '').trim().toUpperCase();
            const status = Number(error?.status || 0);
            const message = String(error?.message || '').trim().toUpperCase();
            return (
                code === 'PGRST202' ||
                status === 404 ||
                message.indexOf('COULD NOT FIND THE FUNCTION') >= 0 ||
                message.indexOf('FUNCTION') >= 0 && message.indexOf('NOT FOUND') >= 0
            );
        }

        function isRetriableSupabaseTransportError_(error) {
            const code = String(error?.code || '').trim().toUpperCase();
            const status = Number(error?.status || 0);
            const name = String(error?.name || '').trim().toUpperCase();
            const message = String(error?.message || '').trim().toUpperCase();
            return (
                code === 'TIMEOUT' ||
                status === 0 ||
                status === 408 ||
                status === 425 ||
                status === 429 ||
                status >= 500 ||
                name === 'TYPEERROR' ||
                message.indexOf('TIMEOUT') >= 0 ||
                message.indexOf('FAILED TO FETCH') >= 0 ||
                message.indexOf('LOAD FAILED') >= 0 ||
                message.indexOf('NETWORK') >= 0
            );
        }

        async function callSupabaseRpc_(rpcName, payload = {}, timeout = CONFIG.TIMEOUT) {
            const url = getSupabaseRpcUrl_(rpcName);
            const headers = getSupabaseRpcHeaders_();
            const controller = new AbortController();
            const timeoutMs = Math.max(1000, Number(timeout) || Number(CONFIG.TIMEOUT) || 15000);
            const timerId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload || {}),
                    signal: controller.signal
                });
                return await parseSupabaseRpcResponse_(response);
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    const timeoutError = new Error('Request timeout');
                    timeoutError.code = 'TIMEOUT';
                    throw timeoutError;
                }
                throw error;
            } finally {
                clearTimeout(timerId);
            }
        }

        async function callSupabaseFunction_(functionName, payload = {}, timeout = CONFIG.TIMEOUT) {
            const url = getSupabaseFunctionUrl_(functionName);
            const headers = getSupabaseFunctionHeaders_();
            const controller = new AbortController();
            const timeoutMs = Math.max(1000, Number(timeout) || Number(CONFIG.TIMEOUT) || 15000);
            const timerId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload || {}),
                    signal: controller.signal
                });
                return await parseSupabaseFunctionResponse_(response);
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    const timeoutError = new Error('Request timeout');
                    timeoutError.code = 'TIMEOUT';
                    throw timeoutError;
                }
                throw error;
            } finally {
                clearTimeout(timerId);
            }
        }

        function getSupabaseRpcName_(key, fallback = '') {
            const config = getMproSupabaseConfig_();
            const name = config.rpc && Object.prototype.hasOwnProperty.call(config.rpc, key)
                ? config.rpc[key]
                : fallback;
            return String(name || fallback || '').trim();
        }

        async function callMproSupabaseRpc_(key, payload = {}, timeout = CONFIG.TIMEOUT, fallbackName = '') {
            const rpcName = getSupabaseRpcName_(key, fallbackName);
            try {
                return await callSupabaseRpc_(rpcName, payload, timeout);
            } catch (error) {
                if (isUnauthorizedSupabaseError_(error)) {
                    handleUnauthorizedResponse_();
                }
                throw error;
            }
        }

        async function callMproSupabaseFunction_(functionName, payload = {}, timeout = CONFIG.TIMEOUT) {
            try {
                return await callSupabaseFunction_(functionName, payload, timeout);
            } catch (error) {
                if (isUnauthorizedSupabaseError_(error)) {
                    handleUnauthorizedResponse_();
                }
                throw error;
            }
        }

(() => {
  'use strict';

  const deployConfig = window.__M_PRO_DEPLOY_CONFIG && typeof window.__M_PRO_DEPLOY_CONFIG === 'object'
    ? window.__M_PRO_DEPLOY_CONFIG
    : {};
  const supabaseConfig = window.__M_PRO_SUPABASE_CONFIG && typeof window.__M_PRO_SUPABASE_CONFIG === 'object'
    ? window.__M_PRO_SUPABASE_CONFIG
    : {};

  const assetVersion = String(deployConfig.assetVersion || '').trim();

  function withVersion(path) {
    if (!assetVersion) {
      return path;
    }
    return `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(assetVersion)}`;
  }

  function isPlaceholder(value) {
    const text = String(value || '').trim();
    return !text || /^__.+__$/.test(text);
  }

  function renderFatalConfigError(message) {
    const mount = () => {
      if (!document.body) {
        return;
      }
      const existing = document.getElementById('deployConfigError');
      if (existing) {
        existing.textContent = message;
        return;
      }
      const banner = document.createElement('div');
      banner.id = 'deployConfigError';
      banner.setAttribute('role', 'alert');
      banner.style.cssText = [
        'position:fixed',
        'inset:16px',
        'z-index:99999',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:24px',
        'background:rgba(22,31,34,0.94)',
        'color:#f6fffd',
        'font:600 16px/1.5 Segoe UI,Arial,sans-serif',
        'text-align:center',
        'border-radius:20px',
        'box-shadow:0 18px 60px rgba(0,0,0,0.28)'
      ].join(';');
      banner.textContent = message;
      document.body.appendChild(banner);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
      return;
    }
    mount();
  }

  function waitForExistingStylesheet(link, path) {
    return new Promise((resolve, reject) => {
      if (!link) {
        reject(new Error(`Failed to load stylesheet: ${path}`));
        return;
      }
      const cleanup = () => {
        link.removeEventListener('load', handleLoad);
        link.removeEventListener('error', handleError);
      };
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Failed to load stylesheet: ${path}`));
      };
      if (link.dataset.loaded === 'true' || link.sheet) {
        resolve();
        return;
      }
      link.addEventListener('load', handleLoad, { once: true });
      link.addEventListener('error', handleError, { once: true });
    });
  }

  function delay(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }

  function waitForNetworkRecovery(attempt) {
    const timeoutMs = Math.max(600, 900 + (Math.max(0, Number(attempt) || 0) * 700));
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      return delay(Math.min(timeoutMs, 500));
    }
    return new Promise(resolve => {
      let settled = false;
      let timerId = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('online', handleOnline);
        if (timerId) {
          clearTimeout(timerId);
        }
        resolve();
      };
      const handleOnline = () => finish();
      window.addEventListener('online', handleOnline, { once: true });
      timerId = window.setTimeout(finish, timeoutMs);
    });
  }

  function loadStylesheet(path) {
    const href = withVersion(path);
    const resolvedHref = new URL(href, document.baseURI).href;
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find(link => String(link.href || '').trim() === resolvedHref);
    if (existing) {
      return waitForExistingStylesheet(existing, path);
    }
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => {
        link.dataset.loaded = 'true';
        resolve();
      };
      link.onerror = () => reject(new Error(`Failed to load stylesheet: ${path}`));
      document.head.appendChild(link);
    });
  }

  function appendScriptTag(src, path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.charset = 'utf-8';
      script.src = src;
      script.async = false;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => {
        script.dataset.failed = 'true';
        reject(new Error(`Failed to load script: ${path}`));
      };
      const parent = document.head || document.body || document.documentElement;
      parent.appendChild(script);
    });
  }

  function loadScript(path) {
    const src = withVersion(path);
    const resolvedSrc = new URL(src, document.baseURI).href;
    const maxAttempts = 2;

    const loadOnce = () => {
      const existing = Array.from(document.querySelectorAll('script[src]'))
        .find(script => String(script.src || '').trim() === resolvedSrc);
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          return Promise.resolve();
        }
        if (existing.dataset.failed === 'true') {
          existing.remove();
          return appendScriptTag(src, path);
        }
        return new Promise((resolve, reject) => {
          const cleanup = () => {
            existing.removeEventListener('load', handleLoad);
            existing.removeEventListener('error', handleError);
          };
          const handleLoad = () => {
            cleanup();
            existing.dataset.loaded = 'true';
            resolve();
          };
          const handleError = () => {
            cleanup();
            existing.dataset.failed = 'true';
            reject(new Error(`Failed to load script: ${path}`));
          };
          existing.addEventListener('load', handleLoad, { once: true });
          existing.addEventListener('error', handleError, { once: true });
        });
      }
      return appendScriptTag(src, path);
    };

    const run = (attempt) => loadOnce().catch(async (error) => {
      if (attempt >= maxAttempts) {
        throw error;
      }
      await waitForNetworkRecovery(attempt);
      return run(attempt + 1);
    });

    return run(0);
  }

  function loadScriptsSequentially(paths) {
    return (Array.isArray(paths) ? paths : []).reduce(
      (promise, path) => promise.then(() => loadScript(path)),
      Promise.resolve()
    );
  }

  function createOptionalSliceGroupLoader() {
    const groups = window.__M_PRO_SITE_OPTIONAL_SLICE_GROUPS__ && typeof window.__M_PRO_SITE_OPTIONAL_SLICE_GROUPS__ === 'object'
      ? window.__M_PRO_SITE_OPTIONAL_SLICE_GROUPS__
      : {};
    const loadingByGroup = Object.create(null);
    const statusByGroup = Object.create(null);

    function getGroupStatus(name) {
      const key = String(name || '').trim();
      const status = key && statusByGroup[key] ? statusByGroup[key] : {};
      return {
        loaded: !!status.loaded,
        loading: !!status.loading,
        error: String(status.error || '').trim()
      };
    }

    function ensureGroupLoaded(name) {
      const key = String(name || '').trim();
      if (!key) return Promise.resolve();
      const paths = Array.isArray(groups[key]) ? groups[key] : [];
      if (!paths.length) return Promise.resolve();
      const currentStatus = getGroupStatus(key);
      if (currentStatus.loaded) return Promise.resolve();
      if (loadingByGroup[key]) return loadingByGroup[key];

      statusByGroup[key] = { loaded: false, loading: true, error: '' };
      const promise = loadScriptsSequentially(paths)
        .then(() => {
          statusByGroup[key] = { loaded: true, loading: false, error: '' };
        })
        .catch(error => {
          const message = String(error && error.message || error || `Failed to load slice group: ${key}`).trim();
          statusByGroup[key] = { loaded: false, loading: false, error: message };
          delete loadingByGroup[key];
          throw error;
        });

      loadingByGroup[key] = promise.then(() => {
        delete loadingByGroup[key];
      });
      return loadingByGroup[key];
    }

    window.__ensureSiteSliceGroupLoaded__ = ensureGroupLoaded;
    window.__getSiteSliceGroupStatus__ = getGroupStatus;
  }

  const stylesheetPromise = loadStylesheet('./src/styles.css');

  async function boot() {
    if (isPlaceholder(supabaseConfig.supabaseUrl) || isPlaceholder(supabaseConfig.supabaseAnonKey)) {
      renderFatalConfigError('Заполните site/runtime-config.js перед деплоем: укажите URL и publishable key Supabase.');
      return;
    }

    await stylesheetPromise;
    await Promise.all([
      loadScript('../vendor/supabase.js'),
      loadScript('./src/config.js'),
      loadScript('./src/source-catalog.js')
    ]);
    await loadScript('./src/supabase-shell-api.js');
    await loadScript('./src/app.js');
    createOptionalSliceGroupLoader();
    const slices = Array.isArray(window.__M_PRO_SITE_APP_SLICES__)
      ? window.__M_PRO_SITE_APP_SLICES__
      : [];
    if (!slices.length) {
      throw new Error('Site app slices manifest is empty.');
    }
    await loadScriptsSequentially(slices);
  }

  function safeBoot() {
    boot().catch((error) => {
      console.error(error);
      renderFatalConfigError('Не удалось загрузить frontend Site. Проверьте соединение и повторите обновление страницы.');
    });
  }
  safeBoot();
})();

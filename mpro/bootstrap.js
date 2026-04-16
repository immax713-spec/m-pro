(function () {
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
      'left:16px',
      'right:16px',
      'top:16px',
      'z-index:99999',
      'padding:16px 20px',
      'background:rgba(22,31,34,0.94)',
      'color:#f6fffd',
      'font:600 15px/1.5 Segoe UI,Arial,sans-serif',
      'border-radius:18px',
      'box-shadow:0 18px 60px rgba(0,0,0,0.28)'
    ].join(';');
    banner.textContent = message;
    document.body.appendChild(banner);
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.charset = 'utf-8';
      script.src = withVersion(path);
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${path}`));
      document.body.appendChild(script);
    });
  }

  function loadExternalScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.charset = 'utf-8';
      script.src = path;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${path}`));
      document.body.appendChild(script);
    });
  }

  let yandexMapsReadyPromise = null;

  function ensureYandexMapsApi() {
    if (window.ymaps && typeof window.ymaps.ready === 'function') {
      return Promise.resolve(window.ymaps);
    }
    if (yandexMapsReadyPromise) {
      return yandexMapsReadyPromise;
    }
    yandexMapsReadyPromise = loadExternalScript(
      `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(deployConfig.yandexMapsApiKey)}&lang=ru_RU`
    )
      .then(() => window.ymaps)
      .catch((error) => {
        yandexMapsReadyPromise = null;
        throw error;
      });
    window.__M_PRO_YMAPS_READY__ = yandexMapsReadyPromise;
    return yandexMapsReadyPromise;
  }

  window.__M_PRO_ENSURE_YMAPS__ = ensureYandexMapsApi;

  async function boot() {
    if (isPlaceholder(supabaseConfig.supabaseUrl) || isPlaceholder(supabaseConfig.supabaseAnonKey)) {
      renderFatalConfigError('Заполните new/mpro/runtime-config.js перед деплоем: укажите URL и publishable key Supabase.');
      return;
    }
    if (isPlaceholder(deployConfig.yandexMapsApiKey)) {
      renderFatalConfigError('Заполните new/mpro/runtime-config.js перед деплоем: укажите ключ Yandex Maps API.');
      return;
    }

    await loadScript('mpro/modules/core.js');
    await loadScript('mpro/modules/shared-utils.js');
    await loadScript('mpro/modules/notifications-shell.js');
    await loadScript('mpro/modules/data-transport.js');
    await loadScript('mpro/modules/supabase-transport.js');
    await loadScript('mpro/modules/api-client.js');
    await loadScript('mpro/modules/auth-session.js');
    await loadScript('mpro/modules/access-policy.js');
    await loadScript('mpro/modules/session-access.js');
    await loadScript('mpro/modules/workday.js');
    await loadScript('mpro/modules/map.js');
    await loadScript('mpro/modules/objects-ui.js');
    await loadScript('mpro/modules/object-actions.js');
    await loadScript('mpro/modules/yandex-integration.js');
    await loadScript('mpro/modules/inspector-admin.js');
    await loadScript('mpro/modules/filters-panel.js');
    await loadScript('mpro/modules/boot-runtime.js');
    await loadScript('mpro/modules/app-shell.js');
  }

  boot().catch((error) => {
    console.error(error);
    renderFatalConfigError('Не удалось загрузить frontend M-PRO. Проверьте new/mpro/bootstrap.js и состав deploy-файлов.');
  });
})();

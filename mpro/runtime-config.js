(function () {
  'use strict';

  const currentDeployConfig = window.__M_PRO_DEPLOY_CONFIG && typeof window.__M_PRO_DEPLOY_CONFIG === 'object'
    ? window.__M_PRO_DEPLOY_CONFIG
    : {};
  const currentAppConfig = window.__M_PRO_APP_CONFIG && typeof window.__M_PRO_APP_CONFIG === 'object'
    ? window.__M_PRO_APP_CONFIG
    : {};
  const currentBackendConfig = currentAppConfig.backend && typeof currentAppConfig.backend === 'object'
    ? currentAppConfig.backend
    : {};
  const currentSupabaseConfig = window.__M_PRO_SUPABASE_CONFIG && typeof window.__M_PRO_SUPABASE_CONFIG === 'object'
    ? window.__M_PRO_SUPABASE_CONFIG
    : {};
  const currentRpcConfig = currentSupabaseConfig.rpc && typeof currentSupabaseConfig.rpc === 'object'
    ? currentSupabaseConfig.rpc
    : {};

  const deployConfig = {
    ...currentDeployConfig,
    assetVersion: '20260417a',
    supabaseUrl: 'https://vsdfxrnkxohsuewyvpih.supabase.co',
    supabaseAnonKey: 'sb_publishable_7deVw5OluDBmYalvdq_13Q_yKrCDT5H',
    yandexMapsApiKey: '52007aca-39bd-4a9c-87ef-4d9b730aeb71'
  };

  window.__M_PRO_DEPLOY_CONFIG = deployConfig;
  window.__M_PRO_APP_CONFIG = {
    ...currentAppConfig,
    backend: {
      ...currentBackendConfig,
      transport: 'supabase'
    }
  };

  window.__M_PRO_SUPABASE_CONFIG = {
    ...currentSupabaseConfig,
    supabaseUrl: String(deployConfig.supabaseUrl || '').trim(),
    supabaseAnonKey: String(deployConfig.supabaseAnonKey || '').trim(),
    schema: String(currentSupabaseConfig.schema || 'api').trim() || 'api',
    rpc: {
      ...currentRpcConfig,
      auth: String(currentRpcConfig.auth || 'sf_auth').trim() || 'sf_auth',
      getSessionUser: String(currentRpcConfig.getSessionUser || 'sf_get_session_user').trim() || 'sf_get_session_user',
      getBootstrapBundle: String(currentRpcConfig.getBootstrapBundle || 'mpro_get_bootstrap_bundle').trim() || 'mpro_get_bootstrap_bundle',
      getPoints: String(currentRpcConfig.getPoints || 'mpro_get_points').trim() || 'mpro_get_points',
      getInspectorDirectory: String(currentRpcConfig.getInspectorDirectory || 'mpro_get_inspector_directory').trim() || 'mpro_get_inspector_directory',
      getWorkDayStatusMap: String(currentRpcConfig.getWorkDayStatusMap || 'mpro_get_workday_status_map').trim() || 'mpro_get_workday_status_map',
      checkWorkDay: String(currentRpcConfig.checkWorkDay || 'mpro_check_workday').trim() || 'mpro_check_workday',
      applyWorkDayAction: String(currentRpcConfig.applyWorkDayAction || 'mpro_apply_workday_action').trim() || 'mpro_apply_workday_action',
      saveInspectorConfig: String(currentRpcConfig.saveInspectorConfig || 'mpro_save_inspector_config').trim() || 'mpro_save_inspector_config',
      executeObjectAction: String(currentRpcConfig.executeObjectAction || 'mpro_execute_object_action').trim() || 'mpro_execute_object_action',
      archiveCompleted: String(currentRpcConfig.archiveCompleted || 'mpro_archive_completed').trim() || 'mpro_archive_completed'
    }
  };
})();

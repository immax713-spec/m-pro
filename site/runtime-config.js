(() => {
  'use strict';

  const currentDeployConfig = window.__M_PRO_DEPLOY_CONFIG && typeof window.__M_PRO_DEPLOY_CONFIG === 'object'
    ? window.__M_PRO_DEPLOY_CONFIG
    : {};
  const currentSupabaseConfig = window.__M_PRO_SUPABASE_CONFIG && typeof window.__M_PRO_SUPABASE_CONFIG === 'object'
    ? window.__M_PRO_SUPABASE_CONFIG
    : {};

  const deployConfig = {
    ...currentDeployConfig,
    assetVersion: '20260421f',
    supabaseUrl: 'https://vsdfxrnkxohsuewyvpih.supabase.co',
    supabaseAnonKey: 'sb_publishable_7deVw5OluDBmYalvdq_13Q_yKrCDT5H'
  };

  window.__M_PRO_DEPLOY_CONFIG = deployConfig;
  window.__M_PRO_SUPABASE_CONFIG = {
    ...currentSupabaseConfig,
    supabaseUrl: String(deployConfig.supabaseUrl || '').trim(),
    supabaseAnonKey: String(deployConfig.supabaseAnonKey || '').trim(),
    requestTimeoutMs: 20000,
    authRequestTimeoutMs: 12000,
    schema: 'api',
    rpc: {
      ...(currentSupabaseConfig.rpc || {}),
      getDataBundle: 'sf_get_data_bundle_v2',
      getMproInspectorDirectory: 'mpro_get_inspector_directory'
    }
  };
})();

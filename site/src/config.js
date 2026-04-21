(() => {
  'use strict';

  const defaults = {
    supabaseUrl: 'https://vsdfxrnkxohsuewyvpih.supabase.co',
    supabaseAnonKey: 'sb_publishable_7deVw5OluDBmYalvdq_13Q_yKrCDT5H',
    schema: 'api',
    requestTimeoutMs: 20000,
    authRequestTimeoutMs: 25000,
    fetchPageSize: 1000,
    dataTables: {
      objects: 'objects',
      sm: 'sm',
      ppr: 'ppr',
      ksg: 'ksg',
      suid: 'suid',
      lb: 'lb',
      mgz: 'mgz'
    },
    rpc: {
      auth: 'sf_auth',
      getDataBundle: 'sf_get_data_bundle',
      getArchiveMonitoring: 'sf_get_archive_monitoring',
      getWorkControlDashboard: 'mpro_get_work_control_dashboard',
      importSkudRows: 'mpro_import_skud_rows',
      getMonitoringOverlay: 'sf_get_registry_monitoring_overlay',
      getRegistryMapOverlay: 'sf_get_registry_map_overlay',
      getObjectMonitoringHistory: 'sf_get_object_monitoring_history',
      getObjectLabStudiesHistory: 'sf_get_object_lab_studies_history',
      getLabStudyInspectors: 'sf_get_lab_study_inspectors',
      getMproInspectorDirectory: 'mpro_get_inspector_directory',
      createLabStudy: 'sf_create_lab_study',
      getSessionUser: 'sf_get_session_user',
      getSharedSelections: 'sf_get_shared_selections',
      getSharedSelectionWorkState: 'sf_get_shared_selection_work_state',
      saveSharedSelection: 'sf_save_shared_selection',
      publishSelectionToMpro: 'sf_publish_selection_to_mpro',
      removeRegistryObjectsFromMproMap: 'sf_remove_registry_objects_from_mpro_map',
      saveSharedSelectionWorkState: 'sf_save_shared_selection_work_state',
      saveSharedSelectionWorkBatch: 'sf_save_shared_selection_work_batch',
      deleteSharedSelection: 'sf_delete_shared_selection',
      deleteRegistryRows: 'sf_delete_registry_rows',
      addRegistryRow: 'sf_add_registry_row',
      saveEdits: 'sf_save_edits'
    }
  };

  const overrides = window.__M_PRO_SUPABASE_CONFIG && typeof window.__M_PRO_SUPABASE_CONFIG === 'object'
    ? window.__M_PRO_SUPABASE_CONFIG
    : {};

  const merged = {
    ...defaults,
    ...overrides,
    dataTables: {
      ...defaults.dataTables,
      ...(overrides.dataTables || {})
    },
    rpc: {
      ...defaults.rpc,
      ...(overrides.rpc || {})
    }
  };

  window.SUPABASE_MPRO_CONFIG = Object.freeze({
    ...merged,
    dataTables: Object.freeze({ ...merged.dataTables }),
    rpc: Object.freeze({ ...merged.rpc })
  });
})();

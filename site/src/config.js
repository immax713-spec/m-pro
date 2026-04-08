(() => {
  'use strict';

  const defaults = {
    supabaseUrl: 'https://lkflvchascdapzcbennf.supabase.co',
    supabaseAnonKey: 'sb_publishable_fzwXEWgtIkIjbZJ6WuXrNQ_FZ3c4kNg',
    schema: 'public',
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
      getSessionUser: 'sf_get_session_user',
      getSharedSelections: 'sf_get_shared_selections',
      getSharedSelectionWorkState: 'sf_get_shared_selection_work_state',
      saveSharedSelection: 'sf_save_shared_selection',
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

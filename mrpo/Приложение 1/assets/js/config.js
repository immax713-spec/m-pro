const ORIGIN = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
const LOCAL_PROXY = ORIGIN ? (ORIGIN + '/exec') : '';
export const SCRIPT_URL = LOCAL_PROXY || 'https://script.google.com/macros/s/AKfycbwbUxbTH5jvqX6awLbVdmDy0-8vbftNs1z47Fvro2LYSgIoIeWEUCJeQDnXBGzSHw3MRA/exec';
export const UPSTREAM_URL = 'https://script.google.com/macros/s/AKfycbwbUxbTH5jvqX6awLbVdmDy0-8vbftNs1z47Fvro2LYSgIoIeWEUCJeQDnXBGzSHw3MRA/exec';
export const REPORTS_URL = SCRIPT_URL;
export const DEFAULT_SHEET_ID = '1B9Joj6DFhJM9DMmp8JHQpF66JSii0WPSdKZIUPvZGko';
export const DEFAULT_GID = '';

export const STORAGE_KEYS = {
    SESSION: 'map_session',
    REMEMBER_ME: 'remember_password',
    SAVED_PASSWORDS: 'saved_passwords',
    WORK_DAY_STATUS: 'work_day_status',
    WORK_DAY_START_TIME: 'work_day_start_time',
    INSPECTORS_CACHE: 'inspectors_cache',
    INSPECTORS_CACHE_TIMESTAMP: 'inspectors_cache_timestamp',
    FILTERS_STATE: 'filters_state',
    ACTIVE_ENTRIES: 'active_entries'
};

export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 часа

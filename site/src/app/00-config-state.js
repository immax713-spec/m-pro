// ===== Config =====

    // ===== Runtime =====
    const MONITORING_DATE_PARSE_CACHE = new Map();
    const MONITORING_DATE_PARSE_CACHE_LIMIT = 20000;
    const DATE_RANGE_FACET_BOUNDS_CACHE = new Map();
    const DATE_RANGE_FACET_BOUNDS_CACHE_LIMIT = 128;
    const REGISTRY_FACET_VALUES_CACHE_LIMIT = 96;
    const DEFAULT_SPREADSHEET_ID = '1-cghMU6Ftyzq6Y-vhRiLeTaf7ALZEZl7xB4xps8t3oQ';
    const DEFAULT_SHEET_NAME = 'Сводная';
    const DEFAULT_HEADER_ROW = 3;
    const DEFAULT_DATA_START_ROW = 4;
    const SUMMARY_EXPORT_EXTRA_COLUMNS = Object.freeze([
      { fieldId: '', source: '', label: 'Руководитель группы СК Заказчика (чтобы знать на кого выставлять замечания в  СУИД)' },
      { fieldId: 'id_DB', source: '', label: 'id DB' },
      { fieldId: '', source: '', label: '07.04 обновление Рук проектов и Дир срока' }
    ]);
    const SHARED_SELECTION_RECONCILE_DELAYS_MS = Object.freeze([0, 500, 1200, 2200]);
    const SAFE_SERVER_METHODS = new Set([
      'auth',
      'getSmartFilterShellBootstrap',
      'getSmartFilterShellData',
      'getSmartFilterShellArchiveMonitoring',
      'getSmartFilterShellWorkControlDashboard',
      'saveSmartFilterShellWorkControlSkud',
      'getSmartFilterShellObjectMonitoringHistory',
      'getSmartFilterShellObjectLabStudiesHistory',
      'getSmartFilterShellLabStudyInspectors',
      'getSmartFilterShellMproInspectorDirectory',
      'createSmartFilterShellLabStudy',
      'getSmartFilterShellSharedSelections',
      'getSmartFilterShellSharedSelectionWorkState',
      'saveSmartFilterShellSharedSelection',
      'publishSmartFilterShellSelectionToMpro',
      'removeSmartFilterShellRegistryObjectsFromMproMap',
      'saveSmartFilterShellSharedSelectionWorkState',
      'saveSmartFilterShellSharedSelectionWorkBatch',
      'deleteSmartFilterShellSharedSelection',
      'deleteSmartFilterShellRegistryRows',
      'addSmartFilterShellRegistryRow',
      'saveSmartFilterShellEdits'
    ]);
    const AUTH_FREE_SERVER_METHODS = new Set(['auth']);
    const SHELL_SESSION_STORAGE_KEY = 'smart_filter_shell_session';
    const SHELL_SESSION_PERSIST_STORAGE_KEY = 'smart_filter_shell_session_persist';
    const MPRO_SESSION_STORAGE_KEY = 'mpro_user';
    const MPRO_SESSION_PERSIST_STORAGE_KEY = 'mpro_user_persist';
    const MPRO_APP_ENTRY_URL = '../map/';
    const MPRO_SYNC_SIGNAL_STORAGE_KEY = 'mpro_sync_signal';
    const LEGACY_AUTH_PASSWORD_STORAGE_KEY = 'smart_filter_shell_auth_password';
    const REGISTRY_SESSION_STORAGE_KEY = 'smart_filter_shell_registry_session';
    const REGISTRY_COLUMNS_LAYOUT_VERSION_STORAGE_KEY = 'smart_filter_shell_registry_columns_layout_version';
    const REGISTRY_COLUMNS_LAYOUT_VERSION = '2';
    const REGISTRY_PERSONAL_SELECTIONS_STORAGE_KEY = 'smart_filter_shell_registry_personal_selections';
    const LEGACY_REGISTRY_SELECTIONS_STORAGE_KEY = 'smart_filter_shell_registry_selections';
    const REGISTRY_SELECTION_PROGRESS_STORAGE_PREFIX = 'smart_filter_shell_registry_progress:';
    const REGISTRY_SELECTION_PUBLISH_ASSIGNMENTS_STORAGE_PREFIX = 'smart_filter_shell_registry_publish_assignments:';
    const CHANGE_HISTORY_SESSION_STORAGE_KEY = 'smart_filter_shell_change_history';
    const GOOGLE_SYNC_LAST_AT_STORAGE_KEY = 'smart_filter_shell_google_sync_last_at';
    const ANALYTICS_START_SMR_RANGE_FROM = '2026-04-01';
    const ANALYTICS_START_SMR_RANGE_TO = '2026-06-30';
    const ANALYTICS_Q1_START_SMR_RANGE_FROM = '2026-01-01';
    const ANALYTICS_Q1_START_SMR_RANGE_TO = '2026-03-31';
    const ANALYTICS_START_SMR_RESPONSE_DAYS = 7;
    const ANALYTICS_DASHBOARD_CACHE_MS = 120000;
    const ANALYTICS_DEFAULT_SECTION_KEY = 'quarter';
    const ANALYTICS_PANEL_SECTION_DEFS = Object.freeze([
      {
        key: 'quarter1',
        title: '1 квартал 2026',
        kind: 'archive',
        rangeFrom: ANALYTICS_Q1_START_SMR_RANGE_FROM,
        rangeTo: ANALYTICS_Q1_START_SMR_RANGE_TO,
        dashboardDefKey: 'q1'
      },
      {
        key: 'quarter',
        title: '2 квартал 2026',
        kind: 'archive',
        rangeFrom: ANALYTICS_START_SMR_RANGE_FROM,
        rangeTo: ANALYTICS_START_SMR_RANGE_TO,
        dashboardDefKey: 'q2'
      },
      { key: 'control', title: 'Контроль работы', kind: 'control' },
      { key: 'ksg', title: 'КСГ', kind: 'ksg' }
    ]);
    const ANALYTICS_SECTION_KEYS = Object.freeze(
      ANALYTICS_PANEL_SECTION_DEFS.map(item => String(item && item.key || '').trim()).filter(Boolean)
    );
    const ANALYTICS_Q1_DASHBOARD_DEF = Object.freeze({
      title: '1 квартал 2026',
      overall: {
        plan: 609,
        fact: 1033
      },
      tracks: [
        {
          key: 'constructionMonitoring',
          title: 'Строймониторинг',
          plan: 609,
          fact: 1033
        },
        {
          key: 'constructionControl',
          title: 'Строительный контроль',
          plan: 258,
          fact: 258
        },
        {
          key: 'metroMonitoring',
          title: 'Метрополитен',
          plan: 47,
          fact: 47
        },
        {
          key: 'uniqueMonitoring',
          title: 'Уникальные объекты',
          plan: 5,
          fact: 5
        },
        {
          key: 'labStudies',
          title: 'Лаборатория',
          plan: 72,
          fact: 275
        }
      ]
    });
    const ANALYTICS_Q2_DASHBOARD_DEF = Object.freeze({
      title: '2 квартал 2026',
      snapshotLabel: 'мониторинг 01.04–15.04.2026',
      overall: {
        plan: 526,
        fact: 746
      },
      tracks: [
        {
          key: 'constructionMonitoring',
          title: 'Строймониторинг',
          plan: 526,
          fact: 746
        },
        {
          key: 'constructionControl',
          title: 'Строительный контроль',
          plan: 195,
          fact: 12
        },
        {
          key: 'metroMonitoring',
          title: 'Метрополитен',
          plan: 48,
          fact: 31
        },
        {
          key: 'uniqueMonitoring',
          title: 'Уникальные объекты',
          plan: 5,
          fact: 4
        },
        {
          key: 'labStudies',
          title: 'Лаборатория',
          plan: 240,
          fact: 61
        }
      ]
    });
    const ANALYTICS_KSG_PAIR_DEFS = Object.freeze([
      { key: 'ksg_2', title: 'РС', planFieldId: 'ksg_2_2', factFieldId: 'ksg_2_3' },
      { key: 'ksg_4', title: 'Передача площадки', planFieldId: 'ksg_4_2', factFieldId: 'ksg_4_3' },
      { key: 'ksg_5', title: 'Начало СМР', planFieldId: 'ksg_5_2', factFieldId: 'ksg_5_3' },
      { key: 'ksg_6', title: 'Окончание СМР', planFieldId: 'ksg_6_2', factFieldId: 'ksg_6_3' },
      { key: 'ksg_10', title: 'ЗОС', planFieldId: 'ksg_10_2', factFieldId: 'ksg_10_3' },
      { key: 'ksg_12', title: 'РВ', planFieldId: 'ksg_12_2', factFieldId: 'ksg_12_3' }
    ]);

    // ===== Field specs =====
    const REGISTRY_DATASET_MODES = Object.freeze({
      registry: 'registry'
    });
    const ARCHIVE_INSPECTOR_SPEC = { ids: ['archive_inspector'], labels: ['Инспектор'] };
    const OBJECT_NAME_SPEC = { ids: ['object_name', 'ro_1_5', 'archive_object_name'], labels: ['Наименование объекта'] };
    const DASHBOARD_SPEC = { ids: ['object_dashboard', 'ro_1_2'], labels: ['Ссылка на дашборд'] };
    const UIN_SPEC = { ids: ['object_uin', 'ro_1_3', 'archive_uin'], labels: ['УИН'] };
    const PINNED_FIELDS = [
      { title: 'Статус', ids: ['object_status', 'ro_1_7'], labels: ['Статус'] },
      { title: 'ГРБС', ids: ['object_grbs', 'ro_1_8'], labels: ['ГРБС'] },
      { title: 'Заказчик', ids: ['object_customer', 'ro_1_9'], labels: ['Заказчик'] },
      { title: 'Генподрядчик', ids: ['object_contractor', 'ro_1_10'], labels: ['Генподрядчик'] }
    ];
    const DS_CODE_SPEC = { ids: ['object_ds_code', 'ro_1_4'], labels: ['Код ДС'] };
    const TEP_SPEC = { ids: ['object_tep', 'ro_1_6'], labels: ['ТЭП'] };
    const SM_ANO_CODE_SPEC = { ids: ['sm_1_1', 'archive_ano_smg_code'], labels: ['Код АНО СМГ'] };
    const SM_CHECKLIST_SPEC = { ids: ['sm_1_2', 'archive_checklist_url'], labels: ['Чек-лист'] };
    const SM_YANDEX_DISK_SPEC = { ids: ['sm_1_3', 'archive_yandex_disk_url'], labels: ['Я.Диск'] };
    const SM_COORDINATES_SPEC = { ids: ['sm_1_4'], labels: ['Координаты'] };
    const SM_AUTOSLIDER_SPEC = { ids: ['sm_1_8'], labels: ['Автослайдер'] };
    const SM_MONITORING_DATE_SPEC = { ids: ['sm_1_5', 'archive_monitoring_date'], labels: ['Дата мониторинга'] };
    const SM_READINESS_PLAN_SPEC = { ids: ['sm_1_10'], labels: ['Строительная готовность (план)'] };
    const SM_READINESS_FACT_SPEC = { ids: ['sm_1_6'], labels: ['Строительная готовность (факт)'] };
    const SM_PEOPLE_PLAN_SPEC = { ids: ['sm_1_9'], labels: ['Кол-во людей (план)'] };
    const SM_PEOPLE_FACT_SPEC = { ids: ['sm_1_7'], labels: ['Кол-во людей (факт)'] };
    const KSG_START_SMR_FACT_SPEC = { ids: ['ksg_5_2'], labels: ['Начало СМР Дата начала план (этал.график)', 'Дата начала план (этал.график)'] };
    const KSG_RV_DATE_SPEC = { ids: ['ksg_12_3'], labels: ['Фактическая дата окончания  (этал.график)'] };
    const KSG_RV_NUMBER_SPEC = { ids: ['ksg_12_4'], labels: ['№ РВ'] };
    const GOOGLE_OWNED_HTML_FIELD_IDS = new Set([
      'ppr_1_8',
      'lb_1_5',
      'lb_1_6',
      'lb_1_7',
      'lb_1_8',
      'lb_1_9',
      'lb_1_10',
      'lb_1_11',
      'lb_1_12'
    ]);
    const GOOGLE_OWNED_HTML_FIELD_PREFIXES = [];
    const DIRECTIVE_ENTRY_SPEC = { ids: ['object_directive_entry', 'ro_1_11'], labels: ['Плановый ввод по директивному графику (по дашборду)'] };
    const EVV_ENTRY_SPEC = { ids: ['object_evv_entry', 'ro_1_12'], labels: ['График ВВЕ 26-30'] };
    const EVV_YEAR_SPEC = { ids: ['object_evv_year', 'ro_1_13'], labels: ['График ВВЕ год', 'График ВВЕ'] };
    const CONTACT_OWNER_SPEC = { ids: ['ppr_1_1', 'object_project_lead', 'koo_1_6'], labels: ['ФИО', 'Руководитель проекта (Заказчик)'] };
    const CONTACT_DETAILS_SPEC = { ids: ['ppr_1_2', 'object_contact_details', 'koo_1_7'], labels: ['Телефон', 'Контактные данные'] };
    const PPR_DEADLINE_RISK_SPEC = { ids: ['ppr_1_6'], labels: ['Риск срыва сроков'] };

    // ===== Header and passport model =====
    const HEADER_TITLE_FIELDS = [
      { title: 'Статус', spec: PINNED_FIELDS[0], kind: 'status', className: 'status-highlight' },
      { title: 'УИН', spec: UIN_SPEC, kind: 'uin' },
      { title: 'Код ДС', spec: DS_CODE_SPEC },
      { title: 'ТЭП', spec: TEP_SPEC }
    ];
    const STATUS_DONE_RV_HEADER_FIELDS = Object.freeze({
      date: 'ksg_12_3',
      number: 'ksg_12_4'
    });
    const SECTION_FIELD_LABEL_OVERRIDES = Object.freeze({});
    const PASSPORT_ITEM_DEFS = [
      { type: 'field', title: 'ГРБС', spec: PINNED_FIELDS[1] },
      { type: 'field', title: 'Заказчик', spec: PINNED_FIELDS[2] },
      { type: 'field', title: 'Генподрядчик', spec: PINNED_FIELDS[3] },
      { type: 'contacts', title: 'Контакты', personSpec: CONTACT_OWNER_SPEC, detailsSpec: CONTACT_DETAILS_SPEC },
      { type: 'field', title: 'Плановый ввод по директивному графику (по дашборду)', spec: DIRECTIVE_ENTRY_SPEC },
      { type: 'field', title: 'График ВВЕ 26-30', spec: EVV_ENTRY_SPEC }
    ];

    // ===== Registry filters =====
    const REGISTRY_FILTER_DEFS = [
      { key: 'status', title: 'Статус', spec: PINNED_FIELDS[0], buttonId: 'registryStatusButton', menuId: 'registryStatusMenu', placeholder: 'Статус', menuWidth: 320, menuAlign: 'start' },
      { key: 'grbs', title: 'ГРБС', spec: PINNED_FIELDS[1], buttonId: 'registryGrbsButton', menuId: 'registryGrbsMenu', placeholder: 'ГРБС', menuWidth: 260, menuAlign: 'start' },
      { key: 'customer', title: 'Заказчик', spec: PINNED_FIELDS[2], buttonId: 'registryCustomerButton', menuId: 'registryCustomerMenu', placeholder: 'Заказчик', menuWidth: 340, menuAlign: 'start' },
      { key: 'contractor', title: 'Генподрядчик', spec: PINNED_FIELDS[3], buttonId: 'registryContractorButton', menuId: 'registryContractorMenu', placeholder: 'Генподрядчик', menuWidth: 340, menuAlign: 'end' },
      { key: 'mapPlacement', title: 'На карте', buttonId: 'registryMapPlacementButton', menuId: 'registryMapPlacementMenu', placeholder: 'На карте', menuWidth: 260, menuAlign: 'end' },
      { key: 'monitoringDate', title: 'Дата мониторинга', spec: SM_MONITORING_DATE_SPEC, buttonId: 'registryMonitoringDateButton', menuId: 'registryMonitoringDateMenu', placeholder: 'Дата мониторинга', menuWidth: 360, menuAlign: 'end', kind: 'date-range' },
      { key: 'inspector', title: 'Инспектор', spec: ARCHIVE_INSPECTOR_SPEC, buttonId: 'registryInspectorButton', menuId: 'registryInspectorMenu', placeholder: 'Инспектор', menuWidth: 320, menuAlign: 'start' },
      { key: 'constructionReadiness', title: 'Строительная готовность', spec: SM_READINESS_FACT_SPEC, buttonId: 'registryConstructionReadinessButton', menuId: 'registryConstructionReadinessMenu', placeholder: 'Строительная готовность', menuWidth: 320, menuAlign: 'end', kind: 'number-range' },
      { key: 'startSmrDate', title: 'Начало СМР', spec: KSG_START_SMR_FACT_SPEC, buttonId: 'registryStartSmrButton', menuId: 'registryStartSmrMenu', placeholder: 'Начало СМР', menuWidth: 320, menuAlign: 'end', kind: 'date-range' },
      { key: 'rvStatus', title: 'РВ', spec: KSG_RV_DATE_SPEC, buttonId: 'registryRvStatusButton', menuId: 'registryRvStatusMenu', placeholder: 'РВ', menuWidth: 260, menuAlign: 'end' }
    ];

    const REGISTRY_COLUMN_DEFS = Object.freeze([
      { key: 'uin', title: 'УИН', width: '156px', summaryKey: 'uin', required: true, defaultVisible: true },
      { key: 'dsCode', title: 'Код ДС', width: '118px', summaryKey: 'dsCode', defaultVisible: true },
      { key: 'name', title: 'Наименование', width: 'auto', summaryKey: 'name', defaultVisible: true },
      { key: 'status', title: 'Статус', width: '128px', filterKey: 'status', summaryKey: 'status', defaultVisible: true },
      { key: 'grbs', title: 'ГРБС', width: '86px', filterKey: 'grbs', summaryKey: 'grbs', defaultVisible: true },
      { key: 'customer', title: 'Заказчик', width: '170px', filterKey: 'customer', summaryKey: 'customer', defaultVisible: true },
      { key: 'contractor', title: 'Генподрядчик', width: '176px', filterKey: 'contractor', summaryKey: 'contractor', defaultVisible: true },
      { key: 'evvYear', title: 'График ВВЕ', width: '136px', summaryKey: 'evvYear', spec: EVV_YEAR_SPEC, defaultVisible: false },
      { key: 'anoSmgCode', title: 'Код АНО СМГ', width: '132px', summaryKey: 'anoSmgCode', spec: SM_ANO_CODE_SPEC, defaultVisible: false },
      { key: 'peopleCount', title: 'Кол-во людей', width: '144px', summaryKey: 'peopleCountFact', spec: SM_PEOPLE_FACT_SPEC, defaultVisible: false, isAvailable: () => hasAnyRegistryColumnSpecs_([SM_PEOPLE_PLAN_SPEC, SM_PEOPLE_FACT_SPEC]) },
      { key: 'constructionReadiness', title: 'Строительная готовность', width: '160px', filterKey: 'constructionReadiness', summaryKey: 'constructionReadinessFact', spec: SM_READINESS_FACT_SPEC, defaultVisible: false, isAvailable: () => hasAnyRegistryColumnSpecs_([SM_READINESS_PLAN_SPEC, SM_READINESS_FACT_SPEC]) },
      { key: 'monitoringDate', title: 'Дата мониторинга', width: '132px', filterKey: 'monitoringDate', summaryKey: 'monitoringDate', spec: SM_MONITORING_DATE_SPEC, defaultVisible: false },
      { key: 'coordinates', title: 'Координаты', width: '154px', summaryKey: 'coordinates', spec: SM_COORDINATES_SPEC, defaultVisible: false },
      { key: 'mapPlacement', title: 'На карте', width: '120px', filterKey: 'mapPlacement', summaryKey: 'mapPlacement', defaultVisible: false },
      { key: 'yandexDisk', title: 'Я.Диск', width: '108px', summaryKey: 'yandexDiskUrl', spec: SM_YANDEX_DISK_SPEC, defaultVisible: false },
      { key: 'autoslider', title: 'Автослайдер', width: '118px', summaryKey: 'autosliderUrl', spec: SM_AUTOSLIDER_SPEC, defaultVisible: false },
      { key: 'startSmrDate', title: 'Начало СМР', width: '132px', filterKey: 'startSmrDate', summaryKey: 'startSmrDate', spec: KSG_START_SMR_FACT_SPEC, defaultVisible: false },
      { key: 'deadlineRisk', title: 'Риск срыва сроков', width: '156px', summaryKey: 'deadlineRisk', spec: PPR_DEADLINE_RISK_SPEC, defaultVisible: false },
      { key: 'rv', title: 'РВ', width: '180px', filterKey: 'rvStatus', summaryKey: 'rvStatus', defaultVisible: false, isAvailable: () => hasAnyRegistryColumnSpecs_([KSG_RV_DATE_SPEC, KSG_RV_NUMBER_SPEC]) },
      { key: 'inspector', title: 'Инспектор', width: '190px', filterKey: 'inspector', summaryKey: 'inspector', spec: ARCHIVE_INSPECTOR_SPEC, defaultVisible: false }
    ]);

    const REGISTRY_SUMMARY_SPECS = Object.freeze({
      dashboardUrl: DASHBOARD_SPEC,
      uin: UIN_SPEC,
      dsCode: DS_CODE_SPEC,
      name: OBJECT_NAME_SPEC,
      tep: TEP_SPEC,
      status: PINNED_FIELDS[0],
      grbs: PINNED_FIELDS[1],
      customer: PINNED_FIELDS[2],
      contractor: PINNED_FIELDS[3],
      evvYear: EVV_YEAR_SPEC,
      anoSmgCode: SM_ANO_CODE_SPEC,
      coordinates: SM_COORDINATES_SPEC,
      inspector: ARCHIVE_INSPECTOR_SPEC,
      checklistUrl: SM_CHECKLIST_SPEC,
      monitoringDate: SM_MONITORING_DATE_SPEC,
      yandexDiskUrl: SM_YANDEX_DISK_SPEC,
      autosliderUrl: SM_AUTOSLIDER_SPEC,
      constructionReadinessPlan: SM_READINESS_PLAN_SPEC,
      constructionReadinessFact: SM_READINESS_FACT_SPEC,
      peopleCountPlan: SM_PEOPLE_PLAN_SPEC,
      peopleCountFact: SM_PEOPLE_FACT_SPEC,
      deadlineRisk: PPR_DEADLINE_RISK_SPEC,
      startSmrDate: KSG_START_SMR_FACT_SPEC,
      rvDate: KSG_RV_DATE_SPEC,
      rvNumber: KSG_RV_NUMBER_SPEC
    });
    const REGISTRY_MONITORING_BUCKET_OPTIONS = Object.freeze([
      { key: 'fresh', label: 'Зелёный', hint: '0-6 дней' },
      { key: 'warning', label: 'Жёлтый', hint: '7-10 дней' },
      { key: 'overdue', label: 'Красный', hint: '11+ дней' },
      { key: 'missing', label: 'Без даты', hint: 'дата не указана' }
    ]);
    const ADMIN_REGISTRY_CREATE_FIELDS = Object.freeze([
      { fieldId: 'ro_1_2', label: 'Ссылка на дашборд', type: 'url', wide: true },
      { fieldId: 'ro_1_3', label: 'УИН', required: true },
      { fieldId: 'ro_1_4', label: 'Код ДС', required: true },
      { fieldId: 'ro_1_5', label: 'Наименование объекта', required: true, wide: true },
      { fieldId: 'ro_1_6', label: 'ТЭП' },
      { fieldId: 'ro_1_7', label: 'Статус' },
      { fieldId: 'ro_1_8', label: 'ГРБС' },
      { fieldId: 'ro_1_9', label: 'Заказчик' },
      { fieldId: 'ro_1_10', label: 'Генподрядчик' },
      { fieldId: 'ro_1_11', label: 'Плановый ввод по директивному графику (по дашборду)', wide: true },
      { fieldId: 'ro_1_12', label: 'График ВВЕ 26-30' },
      { fieldId: 'ro_1_13', label: 'График ВВЕ год' }
    ]);
    const LAB_STUDY_TYPE_OPTIONS = Object.freeze([
      'Керн',
      'IRI',
      'Бетон',
      'Прочие исследования'
    ]);
    const MGZ_AUTO_CALC_FIELD_IDS = Object.freeze({
      contractSum: 'mgz_1_5',
      financed: 'mgz_1_6',
      budgetProgress: 'mgz_1_7'
    });
    const SILENT_DATA_REFRESH_INTERVAL_MS = 300000;
    const SILENT_DATA_REFRESH_MIN_GAP_MS = 120000;
    const SILENT_DATA_REFRESH_WAKE_DELAY_MS = 600;

    function buildEmptyAnalyticsStartSmrQuarter_(options) {
      const settings = options || {};
      return {
        rangeFrom: String(settings.rangeFrom || ANALYTICS_START_SMR_RANGE_FROM || '').trim(),
        rangeTo: String(settings.rangeTo || ANALYTICS_START_SMR_RANGE_TO || '').trim(),
        responseDays: Math.max(1, Number(settings.responseDays) || ANALYTICS_START_SMR_RESPONSE_DAYS),
        total: 0,
        elapsed: 0,
        onTime: 0,
        late: 0,
        upcoming: 0,
        inWindow: 0,
        rowIndexes: [],
        onTimeRowIndexes: [],
        lateRowIndexes: [],
        upcomingRowIndexes: [],
        inWindowRowIndexes: []
      };
    }

    function buildEmptyAnalyticsWorkControlDashboard_() {
      return {
        available: false,
        errorText: '',
        sourceLabel: '',
        periodFrom: '',
        periodTo: '',
        skudStatus: {
          status: 'missing',
          label: 'Отсутствует СКУД за период',
          expectedDays: 0,
          loadedDays: 0,
          loadedDates: [],
          missingDates: [],
          latestImport: {}
        },
        totalMonitorings: 0,
        totalInspectors: 0,
        totalViolations: 0,
        averageWorkMinutes: 0,
        displayMonitorings: 0,
        displayInspectors: 0,
        displayViolations: 0,
        displayAverageWorkMinutes: 0,
        inspectors: [],
        filteredInspectors: [],
        divisions: [],
        divisionOptions: [],
        selectedInspector: '',
        selectedInspectorRecord: null,
        activeDivision: ''
      };
    }

    function buildEmptyAnalyticsDashboard_() {
      return {
        tracks: [],
        trackedRows: 0,
        overallUniquePlan: 0,
        overallUniqueFact: 0,
        overallUniquePercent: 0,
        overallPlanRowIndexes: [],
        overallFactRowIndexes: [],
        workControl: buildEmptyAnalyticsWorkControlDashboard_(),
        startSmrQuarter: buildEmptyAnalyticsStartSmrQuarter_(),
        startSmrQuarterQ1: buildEmptyAnalyticsStartSmrQuarter_({
          rangeFrom: ANALYTICS_Q1_START_SMR_RANGE_FROM,
          rangeTo: ANALYTICS_Q1_START_SMR_RANGE_TO
        }),
        archiveFetchedAt: '',
        computedAt: ''
      };
    }

    function normalizeAnalyticsSection_(value) {
      const normalized = String(value || '').trim();
      if (normalized === 'archive') return 'control';
      return ANALYTICS_SECTION_KEYS.includes(normalized) ? normalized : ANALYTICS_DEFAULT_SECTION_KEY;
    }

    function normalizeAnalyticsKsgContractorFilters_(value) {
      const items = Array.isArray(value)
        ? value
        : (value == null || value === '' ? [] : [value]);
      const seen = new Set();
      return items.reduce((acc, item) => {
        const text = String(item || '').trim();
        if (!text || seen.has(text)) return acc;
        seen.add(text);
        acc.push(text);
        return acc;
      }, []);
    }

    function normalizeAnalyticsKsgGrbsFilters_(value) {
      const items = Array.isArray(value)
        ? value
        : (value == null || value === '' ? [] : [value]);
      const seen = new Set();
      return items.reduce((acc, item) => {
        const text = String(item || '').trim();
        if (!text || seen.has(text)) return acc;
        seen.add(text);
        acc.push(text);
        return acc;
      }, []);
    }

    function normalizeAnalyticsArchiveDateValue_(value) {
      const text = String(value || '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
    }

    function normalizeAnalyticsRegistryDrilldownRowIndexes_(value) {
      const items = Array.isArray(value) ? value : [];
      const seen = new Set();
      return items.reduce((acc, item) => {
        const rowIndex = Math.floor(Number(item));
        if (!Number.isFinite(rowIndex) || rowIndex < 0 || seen.has(rowIndex)) return acc;
        seen.add(rowIndex);
        acc.push(rowIndex);
        return acc;
      }, []);
    }

    function buildEmptyRegistryFacetFilters_() {
      return REGISTRY_FILTER_DEFS.reduce((acc, def) => {
        acc[def.key] = null;
        return acc;
      }, {});
    }

    function buildEmptyRegistryFacetQueries_() {
      return REGISTRY_FILTER_DEFS.reduce((acc, def) => {
        acc[def.key] = '';
        return acc;
      }, {});
    }

    function normalizeRegistryDataMode_(value) {
      return REGISTRY_DATASET_MODES.registry;
    }

    function isArchiveRegistryDataMode_() {
      return false;
    }

    function isCurrentRegistryDatasetEditable_() {
      return !isArchiveRegistryDataMode_();
    }

    function getRegistryDatasetTitle_() {
      return 'Реестр объектов';
    }

    function getRegistryDatasetRowNoun_(count) {
      const value = Math.abs(Number(count) || 0);
      const mod10 = value % 10;
      const mod100 = value % 100;
      if (mod10 === 1 && mod100 !== 11) return 'объект';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'объекта';
      return 'объектов';
    }

    function buildDefaultRegistryVisibleColumnKeys_(mode) {
      const preferredKeys = REGISTRY_COLUMN_DEFS
        .filter(def => def && def.defaultVisible !== false)
        .map(def => String(def.key || '').trim())
        .filter(Boolean);
      const selected = new Set(preferredKeys);
      REGISTRY_COLUMN_DEFS.forEach(def => {
        if (def && def.required) selected.add(String(def.key || '').trim());
      });
      return REGISTRY_COLUMN_DEFS
        .map(def => String(def && def.key || '').trim())
        .filter(key => selected.has(key));
    }

    function buildEmptyAdminRegistryFormValues_() {
      return ADMIN_REGISTRY_CREATE_FIELDS.reduce((acc, field) => {
        acc[String(field && field.fieldId || '').trim()] = '';
        return acc;
      }, {});
    }

    function buildEmptyLabStudyCreateFormValues_() {
      return {
        inspectorName: '',
        studyType: LAB_STUDY_TYPE_OPTIONS[0] || '',
        coordinateStartLatLon: '',
        studyLatLon: '',
        coordinateFinishLatLon: '',
        taskY: '',
        taskX: '',
        objectLengthM: '',
        objectWidthM: ''
      };
    }

    function normalizeStoredRegistryVisibleColumnKeys_(rawValue, mode) {
      const allowed = new Set(REGISTRY_COLUMN_DEFS.map(def => String(def && def.key || '').trim()).filter(Boolean));
      const requested = Array.isArray(rawValue) ? rawValue : [];
      const selected = new Set(
        requested
          .map(value => String(value || '').trim())
          .filter(value => allowed.has(value))
      );
      REGISTRY_COLUMN_DEFS.forEach(def => {
        if (def && def.required) selected.add(String(def.key || '').trim());
      });
      if (!selected.size) {
        buildDefaultRegistryVisibleColumnKeys_(mode).forEach(key => selected.add(key));
      }
      return REGISTRY_COLUMN_DEFS
        .map(def => String(def && def.key || '').trim())
        .filter(key => selected.has(key));
    }

    // ===== Editing and preset definitions =====
    const HEADER_EDIT_FIELDS_COMPACT = [
      { title: 'Наименование объекта', spec: OBJECT_NAME_SPEC, multiline: false },
      { title: 'Статус', spec: PINNED_FIELDS[0] },
      { title: 'УИН', spec: UIN_SPEC },
      { title: 'Код ДС', spec: DS_CODE_SPEC },
      { title: 'ТЭП', spec: TEP_SPEC }
    ];
    const QUICK_PRESET_DEFS = {
      manual_all: {
        label: 'Строительный мониторинг',
        sourceKey: '__objects__',
        excludePinned: false,
        multiSelect: true,
        defaultOption: '__all__',
        options: [
          { key: '__all__', dropdownLabel: 'Все позиции', title: 'Строительный мониторинг', subtitle: 'Основные поля раздела "Строительный мониторинг"', mode: 'all', fieldIds: [] },
          { key: 'sm_1_1', dropdownLabel: 'Код АНО СМГ', title: 'Строительный мониторинг · Код АНО СМГ', subtitle: 'Код АНО СМГ', mode: 'all', fieldIds: ['sm_1_1', 'sm_1_2'] },
          { key: 'sm_1_3', dropdownLabel: 'Я.Диск', title: 'Строительный мониторинг · Я.Диск', subtitle: 'Я.Диск', mode: 'all', fieldIds: ['sm_1_3'] },
          { key: 'sm_1_4', dropdownLabel: 'Координаты', title: 'Строительный мониторинг · Координаты', subtitle: 'Координаты', mode: 'all', fieldIds: ['sm_1_4'] },
          { key: 'sm_1_5', dropdownLabel: 'Дата мониторинга', title: 'Строительный мониторинг · Дата мониторинга', subtitle: 'Дата мониторинга', mode: 'all', fieldIds: ['sm_1_5'] },
          { key: 'monitoring_history', dropdownLabel: 'История мониторинга', title: 'Строительный мониторинг · История мониторинга', subtitle: 'История мониторинга', mode: 'all', fieldIds: [] },
          { key: 'sm_1_6', dropdownLabel: 'Строительная готовность', title: 'Строительный мониторинг · Строительная готовность', subtitle: 'Строительная готовность', mode: 'all', fieldIds: ['sm_1_6'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'sm_1_7', dropdownLabel: 'Кол-во людей', title: 'Строительный мониторинг · Кол-во людей', subtitle: 'Кол-во людей', mode: 'all', fieldIds: ['sm_1_7'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'sm_1_8', dropdownLabel: 'Автослайдер', title: 'Строительный мониторинг · Автослайдер', subtitle: 'Автослайдер', mode: 'all', fieldIds: ['sm_1_8'] }
        ]
      },
      ksg_empty: {
        label: 'КСГ',
        sourceKey: '__ksg__',
        excludePinned: false,
        multiSelect: true,
        defaultOption: '__all__',
        options: [
          { key: '__all__', dropdownLabel: 'Все позиции', title: 'КСГ', subtitle: 'Выбранные позиции блока КСГ', mode: 'all', fieldIds: [] },
          { key: 'ksg_2_2', dropdownLabel: 'Разрешение на строительство', title: 'КСГ · Разрешение на строительство', subtitle: 'Получение разрешения на строительство', mode: 'all', fieldIds: ['ksg_2_2'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ksg_4_2', dropdownLabel: 'Передача стройплощадки подрядчику', title: 'КСГ · Передача стройплощадки подрядчику', subtitle: 'Передача строительной площадки подрядчику', mode: 'all', fieldIds: ['ksg_4_2'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ksg_5_1', dropdownLabel: 'Начало СМР', title: 'КСГ · Начало СМР', subtitle: 'Начало СМР', mode: 'all', fieldIds: ['ksg_5_1'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ksg_6_1', dropdownLabel: 'Окончание СМР', title: 'КСГ · Окончание СМР', subtitle: 'Окончание СМР', mode: 'all', fieldIds: ['ksg_6_1'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ksg_8_2', dropdownLabel: 'Акты технологического присоединения', title: 'КСГ · Акты технологического присоединения', subtitle: 'Получение актов технологического присоединения', mode: 'all', fieldIds: ['ksg_8_2'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ksg_9_2', dropdownLabel: 'Папка ЗОС', title: 'КСГ · Папка ЗОС', subtitle: 'Формирование папки ЗОС', mode: 'all', fieldIds: ['ksg_9_2'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ksg_10_2', dropdownLabel: 'Получение ЗОС', title: 'КСГ · Получение ЗОС', subtitle: 'Получение ЗОС', mode: 'all', fieldIds: ['ksg_10_2'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ksg_12_1', dropdownLabel: 'Получение РВ', title: 'КСГ · Получение РВ', subtitle: 'Получение РВ', mode: 'all', fieldIds: ['ksg_12_1'], collectAllMatches: true, matchGroupedTitle: true }
        ]
      },
      suid_all: {
        label: 'СУИД',
        sourceKey: '__suid__',
        excludePinned: false,
        multiSelect: true,
        defaultOption: '__all__',
        options: [
          { key: '__all__', dropdownLabel: 'Все позиции', title: 'СУИД', subtitle: 'Выбранные позиции блока СУИД', mode: 'all', fieldIds: [] },
          { key: 'suid_5_1', dropdownLabel: 'Бытовые помещения', title: 'СУИД · Бытовые помещения', subtitle: 'Проверка бытовых помещений', mode: 'all', fieldIds: ['suid_5_1'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'suid_5_2', dropdownLabel: 'Временные ограждения', title: 'СУИД · Временные ограждения', subtitle: 'Проверка временных ограждений', mode: 'all', fieldIds: ['suid_5_2'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'suid_5_3_culture', dropdownLabel: 'Культура производства', title: 'СУИД · Культура производства', subtitle: 'Проверка культуры производства', mode: 'all', fieldIds: ['suid_5_3'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'suid_5_3_quality', dropdownLabel: 'Качество строительства', title: 'СУИД · Качество строительства', subtitle: 'Проверка качества строительства', mode: 'all', fieldIds: ['suid_5_3'], collectAllMatches: true, matchGroupedTitle: true }
        ]
      },
      lab_all: {
        label: 'Лаборатория',
        sourceKey: '__lab__',
        excludePinned: false,
        multiSelect: true,
        defaultOption: '__all__',
        options: [
          { key: '__all__', dropdownLabel: 'Все позиции', title: 'Лаборатория', subtitle: 'Выбранные позиции блока Лаборатория', mode: 'all', fieldIds: [] },
          { key: 'lab_history', dropdownLabel: 'История исследований', title: 'Лаборатория · История исследований', subtitle: 'История исследований', mode: 'all', fieldIds: [] },
          { key: 'lb_1_1', dropdownLabel: 'IRI', title: 'Лаборатория · IRI', subtitle: 'IRI', mode: 'all', fieldIds: ['lb_1_1'] },
          { key: 'lb_1_2', dropdownLabel: 'Керн', title: 'Лаборатория · Керн', subtitle: 'Керн', mode: 'all', fieldIds: ['lb_1_2'] },
          { key: 'lb_1_3', dropdownLabel: 'Бетон', title: 'Лаборатория · Бетон', subtitle: 'Бетон', mode: 'all', fieldIds: ['lb_1_3'] },
          { key: 'lb_1_4', dropdownLabel: 'Прочие исследования', title: 'Лаборатория · Прочие исследования', subtitle: 'Прочие исследования', mode: 'all', fieldIds: ['lb_1_4'] }
        ]
      },
      ppr_all: {
        label: 'Проблематика, прогноз и риски',
        sourceKey: '__ppr__',
        excludePinned: false,
        multiSelect: true,
        defaultOption: '__all__',
        options: [
          { key: '__all__', dropdownLabel: 'Все позиции', title: 'Проблематика, прогноз и риски', subtitle: 'Контакты, проблемные вопросы, факт. состояние, прогноз ввода и риск срыва', mode: 'all', fieldIds: [] },
          { key: 'ppr_1_1', dropdownLabel: 'Руководитель проекта (Заказчик)', title: 'Проблематика, прогноз и риски · Руководитель проекта (Заказчик)', subtitle: 'Руководитель проекта (Заказчик)', mode: 'all', fieldIds: ['ppr_1_1'] },
          { key: 'ppr_1_2', dropdownLabel: 'Контактные данные', title: 'Проблематика, прогноз и риски · Контактные данные', subtitle: 'Контактные данные', mode: 'all', fieldIds: ['ppr_1_2'] },
          { key: 'ppr_1_3', dropdownLabel: 'Проблемные вопросы', title: 'Проблематика, прогноз и риски · Проблемные вопросы', subtitle: 'Проблемные вопросы', mode: 'all', fieldIds: ['ppr_1_3'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'ppr_1_4', dropdownLabel: 'Фактическое состояние объекта', title: 'Проблематика, прогноз и риски · Фактическое состояние объекта', subtitle: 'Фактическое состояние объекта', mode: 'all', fieldIds: ['ppr_1_4'] },
          { key: 'ppr_1_5', dropdownLabel: 'Дата прогноза фактического ввода', title: 'Проблематика, прогноз и риски · Дата прогноза фактического ввода', subtitle: 'Дата прогноза фактического ввода', mode: 'all', fieldIds: ['ppr_1_5'] },
          { key: 'ppr_1_6', dropdownLabel: 'Риск срыва сроков', title: 'Проблематика, прогноз и риски · Риск срыва сроков', subtitle: 'Риск срыва сроков', mode: 'all', fieldIds: ['ppr_1_6'] }
        ]
      },
      mgz_all: {
        label: 'МГЗ',
        sourceKey: '__mgz__',
        excludePinned: false,
        multiSelect: true,
        defaultOption: '__all__',
        options: [
          { key: '__all__', dropdownLabel: 'Все позиции', title: 'МГЗ', subtitle: 'Выбранные позиции блока МГЗ', mode: 'all', fieldIds: [] },
          { key: 'mgz_1_1', dropdownLabel: 'Дата заключения контракта (УК/СМР)', title: 'МГЗ · Дата заключения контракта', subtitle: 'Дата заключения контракта (УК/СМР)', mode: 'all', fieldIds: ['mgz_1_1'] },
          { key: 'mgz_1_2', dropdownLabel: 'Дата исполнения по контракту', title: 'МГЗ · Дата исполнения по контракту', subtitle: 'Дата исполнения по контракту', mode: 'all', fieldIds: ['mgz_1_2'] },
          { key: 'mgz_1_3', dropdownLabel: 'Номер контракта', title: 'МГЗ · Номер контракта', subtitle: 'Номер контракта', mode: 'all', fieldIds: ['mgz_1_3'] },
          { key: 'mgz_1_4', dropdownLabel: 'Продление по контракту', title: 'МГЗ · Продление по контракту', subtitle: 'Продление по контракту', mode: 'all', fieldIds: ['mgz_1_4'] },
          { key: 'mgz_1_5', dropdownLabel: 'Сумма контракта, млрд', title: 'МГЗ · Сумма контракта', subtitle: 'Сумма контракта, млрд', mode: 'all', fieldIds: ['mgz_1_5'] },
          { key: 'mgz_1_6', dropdownLabel: 'Профинансировано, млрд', title: 'МГЗ · Профинансировано', subtitle: 'Профинансировано, млрд', mode: 'all', fieldIds: ['mgz_1_6'] },
          { key: 'mgz_1_7', dropdownLabel: '% освоения бюджета', title: 'МГЗ · Освоение бюджета', subtitle: '% освоения бюджета', mode: 'all', fieldIds: ['mgz_1_7'] }
        ]
      }
    };

    function buildPresetSectionFieldIds_(options) {
      return Array.from(new Set(
        (Array.isArray(options) ? options : []).flatMap(option => (
          Array.isArray(option && option.fieldIds)
            ? option.fieldIds.map(value => String(value || '').trim()).filter(Boolean)
            : []
        ))
      ));
    }

    function buildPresetSectionFieldSpec_(option) {
      const fieldIds = Array.isArray(option && option.fieldIds)
        ? option.fieldIds.map(value => String(value || '').trim()).filter(Boolean)
        : [];
      if (!fieldIds.length) return null;
      return {
        fieldIds,
        labels: [option && option.dropdownLabel, option && option.subtitle]
          .map(value => String(value || '').trim())
          .filter(Boolean),
        collectAllMatches: !!(option && option.collectAllMatches) || fieldIds.length > 1,
        matchGroupedTitle: !!(option && option.matchGroupedTitle)
      };
    }

    function buildPresetSectionFieldSpecs_(options) {
      return (Array.isArray(options) ? options : [])
        .map(buildPresetSectionFieldSpec_)
        .filter(Boolean);
    }

    function buildDefaultPresetSelections_() {
      const out = {};
      Object.keys(QUICK_PRESET_DEFS).forEach(key => {
        const def = QUICK_PRESET_DEFS[key];
        const firstOption = Array.isArray(def && def.options) && def.options.length ? def.options[0].key : '';
        const value = String(def && def.defaultOption || firstOption || '');
        out[key] = def && def.multiSelect ? (value ? [value] : []) : value;
      });
      return out;
    }

    function normalizeStoredPresetSelections_(rawSelections) {
      const out = buildDefaultPresetSelections_();
      const source = rawSelections && typeof rawSelections === 'object' && !Array.isArray(rawSelections)
        ? rawSelections
        : {};
      Object.keys(QUICK_PRESET_DEFS).forEach(key => {
        const def = QUICK_PRESET_DEFS[key];
        const normalized = normalizePresetSelectionKeys_(key, source[key]);
        out[key] = def && def.multiSelect
          ? normalized
          : (normalized[0] || out[key]);
      });
      return out;
    }

    function normalizeStoredActivePresetKeys_(rawValue) {
      const allowed = new Set(Object.keys(QUICK_PRESET_DEFS));
      return Array.from(new Set(
        (Array.isArray(rawValue) ? rawValue : [])
          .map(value => String(value || '').trim())
          .filter(value => allowed.has(value))
      ));
    }

    function normalizePresetSelectionKeys_(key, rawValue) {
      const def = QUICK_PRESET_DEFS[key];
      const allowed = new Set((def && Array.isArray(def.options) ? def.options : []).map(option => String(option.key || '')));
      if (def && def.multiSelect) {
        const list = Array.isArray(rawValue) ? rawValue : (rawValue ? [rawValue] : []);
        const normalized = list
          .map(item => normalizePresetSelectionKey_(key, item))
          .filter(item => allowed.has(item));
        const unique = Array.from(new Set(normalized));
        if (unique.length) return unique;
        const fallback = normalizePresetSelectionKey_(key, def && def.defaultOption || '');
        return allowed.has(fallback) ? [fallback] : [];
      }
      const single = normalizePresetSelectionKey_(key, rawValue || def && def.defaultOption || '');
      return allowed.has(single) ? [single] : [];
    }

    function normalizePresetSelectionKey_(key, value) {
      const normalizedKey = String(key || '').trim();
      const normalizedValue = String(value || '').trim();
      if (normalizedKey === 'manual_all' && normalizedValue === 'sm_1_2') return 'sm_1_1';
      return normalizedValue;
    }

    function buildDefaultSavedSelectionGroupsOpen_() {
      return {
        personal: true,
        division: true,
        shared: true
      };
    }

    const SIDEBAR_PANEL_KEYS = Object.freeze(['registry', 'categories', 'analytics', 'projects', 'data']);

    function normalizeSidebarPanel_(value) {
      const normalized = String(value || '').trim();
      return SIDEBAR_PANEL_KEYS.includes(normalized) ? normalized : 'registry';
    }

    function normalizeWorkspaceView_(value) {
      const normalized = String(value || '').trim();
      if (normalized === 'object' || normalized === 'analytics') return normalized;
      return 'registry';
    }

    function isCompactSidebarViewport_() {
      try {
        return !!(window && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 980px)').matches);
      } catch (e) {
        return false;
      }
    }

    // ===== App state =====
    const state = {
      runtimeOptions: {},
      columns: [],
      rows: [],
      rowObjectIds: [],
      registryDataMode: REGISTRY_DATASET_MODES.registry,
      monitoringOverlayByObjectKey: {},
      registryMapOverlayByObjectKey: {},
      monitoringHistoryByObjectKey: {},
      monitoringHistoryLoadingObjectKey: '',
      monitoringHistoryErrorsByObjectKey: {},
      labStudiesHistoryByObjectKey: {},
      labStudiesHistoryLoadingObjectKey: '',
      labStudiesHistoryErrorsByObjectKey: {},
      labStudySchemeStudyId: '',
      labStudyInspectors: [],
      labStudyInspectorsLoaded: false,
      labStudyInspectorsLoading: false,
      labStudyInspectorsError: '',
      labStudyCreateDialogOpen: false,
      labStudyCreateDialogSaving: false,
      labStudyCreateDialogError: '',
      labStudyCreateDialogObjectId: '',
      labStudyCreateDialogObjectTitle: '',
      labStudyCreateFormValues: buildEmptyLabStudyCreateFormValues_(),
      objectQuery: '',
      bulkUinText: '',
      registryBulkDraftText: null,
      registryBulkOpen: false,
      registryColumnsPanelOpen: false,
      registrySidebarPanelOpen: true,
      analyticsSidebarPanelOpen: true,
      analyticsSection: 'quarter',
      analyticsControlDivision: '',
      analyticsControlSelectedInspector: '',
      analyticsControlDateFrom: '',
      analyticsControlDateTo: '',
      analyticsKsgDateFrom: '',
      analyticsKsgDateTo: '',
      analyticsControlSkudUploading: false,
      analyticsControlUploadError: '',
      analyticsControlUploadNotice: '',
      analyticsKsgContractors: [],
      analyticsKsgGrbs: [],
      analyticsKsgOpenFilter: '',
      analyticsRegistryDrilldownRowIndexes: [],
      analyticsDrilldowns: new Map(),
      analyticsDrilldownSeq: 0,
      registryVisibleColumnKeys: buildDefaultRegistryVisibleColumnKeys_(REGISTRY_DATASET_MODES.registry),
        currentView: 'registry',
        sidebarExpanded: true,
        sidebarActivePanel: 'registry',
        objectTabRowIndexes: [],
        registryFacetFilters: buildEmptyRegistryFacetFilters_(),
      registryFacetQueries: buildEmptyRegistryFacetQueries_(),
      personalRegistrySelections: [],
      sharedRegistrySelections: [],
      savedSelectionPublishAssignmentsById: {},
      activeRegistrySelectionId: '',
      activeRegistrySelectionBaseRowIndexes: null,
      selectionLoadingId: '',
      selectionRemovingId: '',
      selectionPublishingId: '',
      selectionPublishMenuId: '',
      savedSelectionPanelOpen: true,
      savedSelectionGroupsOpen: buildDefaultSavedSelectionGroupsOpen_(),
      savedSelectionExpandedById: {},
      selectionComposerOpen: false,
      selectionComposerSelectionId: '',
      selectionPublishDraftOpen: false,
      selectionPublishDraftSelectionId: '',
      selectionPublishInspectorNames: [],
      selectionPublishInspectorPickerOpen: false,
      selectionPublishInspectorNamesByObjectKey: {},
      selectionPublishRowInspectorPickerKey: '',
      selectionPublishExtraVisits: '0',
      mapPublishInspectors: [],
      mapPublishInspectorsLoaded: false,
      mapPublishInspectorsLoading: false,
      mapPublishInspectorsError: '',
      mapPublishInspectorsDivisionCode: '',
      selectionComposerBusyState: '',
      selectionComposerDraftName: '',
      selectionComposerScope: 'personal',
      selectionComposerViewMode: 'draft',
      pendingSharedSelectionSave: null,
      selectionDraftSourceId: '',
      selectionEditDraftUins: [],
      selectionEditDraftAutoSync: false,
      selectionDoneById: {},
      sharedSelectionWorkSelectionId: '',
      sharedSelectionWorkBlockKey: '',
      sharedSelectionWorkBlockName: '',
      sharedSelectionWorkItemsByKey: {},
      sharedSelectionWorkPendingByKey: {},
      sharedSelectionWorkBatchMode: '',
      sharedSelectionWorkBatchPendingAction: '',
      sharedSelectionWorkBatchSelectedByKey: {},
      registryMapRemovalMode: '',
      registryMapRemovalPendingAction: '',
      registryMapRemovalSelectedByKey: {},
      registryBaseFilteredRowIndexes: [],
      filteredRowIndexes: [],
      selectedRowIndex: -1,
      activeSections: [],
      passportCollapsed: false,
      passportEditing: false,
      sectionEditingId: '',
      presetSelections: buildDefaultPresetSelections_(),
      openPresetMenuKey: '',
      openRegistryFilterKey: '',
      headerEditing: false,
      headerEditSnapshot: new Map(),
      passportEditSnapshot: new Map(),
      sectionEditSnapshot: new Map(),
      editsByRow: new Map(),
      registryRowSummaryCache: new Map(),
      registryFacetValuesCache: new Map(),
      registryTableStructureSignature: '',
      registryRowsSignature: '',
      pendingFocusFieldKey: '',
      objectSaveMessage: '',
      objectSaveError: '',
      objectSaving: false,
      objectSaveVisual: 'idle',
      summaryExportPending: false,
      googleSyncPending: false,
      googleSyncLastAt: '',
      runtimeErrorMessage: '',
      changeHistoryByObject: {},
      currentUser: null,
      adminRegistryEditMode: false,
      adminRegistrySelectedRows: [],
      adminRegistryPendingAction: '',
      adminRegistryDialogOpen: false,
      adminRegistryDialogSaving: false,
      adminRegistryDialogError: '',
      adminRegistryFormValues: buildEmptyAdminRegistryFormValues_(),
      sessionToken: '',
      sessionExpiresAt: '',
      meta: null,
      truncated: false,
      loading: false,
      analyticsDashboard: buildEmptyAnalyticsDashboard_(),
      analyticsLoading: false,
      analyticsError: '',
      analyticsLastLoadedAt: 0,
      analyticsLoadedOnce: false,
      analyticsLoadedKey: '',
      lastDataLoadedAt: 0,
      lastPersistedRegistrySessionJson: ''
    };
    let registryFloatingMenuFrame = 0;
    let registryRowsRenderFrame = 0;
    let registryRowsRenderToken = 0;
    let copyToastTimer = 0;
      let sidebarBrandLogoReplayTimer = 0;
      let sidebarBrandLogoToggleTimer = 0;
      let authBrandLogoReplayTimer = 0;
      let authBrandLogoToggleTimer = 0;
    let silentDataRefreshTimer = 0;
    let silentDataRefreshWakeTimer = 0;
    const REGISTRY_INITIAL_RENDER_BATCH = 120;
    const REGISTRY_PROGRESSIVE_RENDER_BATCH = 180;
    const REGISTRY_INITIAL_RENDER_BATCH_DURING_LOGO_REPLAY = 24;
    const REGISTRY_PROGRESSIVE_RENDER_BATCH_DURING_LOGO_REPLAY = 72;
    const REGISTRY_LAZY_RENDER_MIN_ROWS = 60;
    const REGISTRY_LAZY_RENDER_BUFFER_ROWS = 24;
    const REGISTRY_LAZY_RENDER_BATCH = 120;


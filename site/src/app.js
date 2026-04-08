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
      'getSmartFilterShellSharedSelections',
      'getSmartFilterShellSharedSelectionWorkState',
      'saveSmartFilterShellSharedSelection',
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
    const LEGACY_AUTH_PASSWORD_STORAGE_KEY = 'smart_filter_shell_auth_password';
    const REGISTRY_SESSION_STORAGE_KEY = 'smart_filter_shell_registry_session';
    const REGISTRY_COLUMNS_LAYOUT_VERSION_STORAGE_KEY = 'smart_filter_shell_registry_columns_layout_version';
    const REGISTRY_COLUMNS_LAYOUT_VERSION = '1';
    const REGISTRY_PERSONAL_SELECTIONS_STORAGE_KEY = 'smart_filter_shell_registry_personal_selections';
    const LEGACY_REGISTRY_SELECTIONS_STORAGE_KEY = 'smart_filter_shell_registry_selections';
    const REGISTRY_SELECTION_PROGRESS_STORAGE_PREFIX = 'smart_filter_shell_registry_progress:';
    const CHANGE_HISTORY_SESSION_STORAGE_KEY = 'smart_filter_shell_change_history';
    const GOOGLE_SYNC_LAST_AT_STORAGE_KEY = 'smart_filter_shell_google_sync_last_at';
    const SHELL_BOOTSTRAP_CACHE_STORAGE_KEY = 'smart_filter_shell_bootstrap_cache_v1';

    // ===== Field specs =====
    const OBJECT_NAME_SPEC = { ids: ['object_name', 'ro_1_5'], labels: ['Наименование объекта'] };
    const DASHBOARD_SPEC = { ids: ['object_dashboard', 'ro_1_2'], labels: ['Ссылка на дашборд'] };
    const UIN_SPEC = { ids: ['object_uin', 'ro_1_3'], labels: ['УИН'] };
    const PINNED_FIELDS = [
      { title: 'Статус', ids: ['object_status', 'ro_1_7'], labels: ['Статус'] },
      { title: 'ГРБС', ids: ['object_grbs', 'ro_1_8'], labels: ['ГРБС'] },
      { title: 'Заказчик', ids: ['object_customer', 'ro_1_9'], labels: ['Заказчик'] },
      { title: 'Генподрядчик', ids: ['object_contractor', 'ro_1_10'], labels: ['Генподрядчик'] }
    ];
    const DS_CODE_SPEC = { ids: ['object_ds_code', 'ro_1_4'], labels: ['Код ДС'] };
    const TEP_SPEC = { ids: ['object_tep', 'ro_1_6'], labels: ['ТЭП'] };
    const SM_ANO_CODE_SPEC = { ids: ['sm_1_1'], labels: ['Код АНО СМГ'] };
    const SM_CHECKLIST_SPEC = { ids: ['sm_1_2'], labels: ['Чек-лист'] };
    const SM_YANDEX_DISK_SPEC = { ids: ['sm_1_3'], labels: ['Я.Диск'] };
    const SM_AUTOSLIDER_SPEC = { ids: ['sm_1_8'], labels: ['Автослайдер'] };
    const SM_MONITORING_DATE_SPEC = { ids: ['sm_1_5'], labels: ['Дата мониторинга'] };
    const SM_READINESS_PLAN_SPEC = { ids: ['sm_1_10'], labels: ['Строительная готовность (план)'] };
    const SM_READINESS_FACT_SPEC = { ids: ['sm_1_6'], labels: ['Строительная готовность (факт)'] };
    const SM_PEOPLE_PLAN_SPEC = { ids: ['sm_1_9'], labels: ['Кол-во людей (план)'] };
    const SM_PEOPLE_FACT_SPEC = { ids: ['sm_1_7'], labels: ['Кол-во людей (факт)'] };
    const KSG_START_SMR_FACT_SPEC = { ids: ['ksg_5_2'], labels: ['Начало СМР Дата начала план (этал.график)', 'Дата начала план (этал.график)'] };
    const KSG_RV_DATE_SPEC = { ids: ['ksg_12_3'], labels: ['Фактическая дата окончания  (этал.график)'] };
    const KSG_RV_NUMBER_SPEC = { ids: ['ksg_12_4'], labels: ['№ РВ'] };
    const GOOGLE_OWNED_HTML_FIELD_IDS = new Set(['sm_1_5', 'sm_1_6', 'sm_1_7', 'sm_1_10']);
    const GOOGLE_OWNED_HTML_FIELD_PREFIXES = ['ksg_', 'suid_'];
    const DIRECTIVE_ENTRY_SPEC = { ids: ['object_directive_entry', 'ro_1_11'], labels: ['Плановый ввод по директивному графику (по дашборду)'] };
    const EVV_ENTRY_SPEC = { ids: ['object_evv_entry', 'ro_1_12'], labels: ['График ВВЕ 26-30'] };
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
    const SECTION_FIELD_LABEL_OVERRIDES = Object.freeze({
      ksg_12_3: 'Дата РВ',
      ksg_12_4: '№РВ'
    });
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
      { key: 'monitoringDate', title: 'Дата мониторинга', spec: SM_MONITORING_DATE_SPEC, buttonId: 'registryMonitoringDateButton', menuId: 'registryMonitoringDateMenu', placeholder: 'Дата мониторинга', menuWidth: 360, menuAlign: 'end', kind: 'monitoring-date' },
      { key: 'constructionReadiness', title: 'Строительная готовность', spec: SM_READINESS_FACT_SPEC, buttonId: 'registryConstructionReadinessButton', menuId: 'registryConstructionReadinessMenu', placeholder: 'Строительная готовность', menuWidth: 320, menuAlign: 'end', kind: 'number-range' },
      { key: 'startSmrDate', title: 'Начало СМР', spec: KSG_START_SMR_FACT_SPEC, buttonId: 'registryStartSmrButton', menuId: 'registryStartSmrMenu', placeholder: 'Начало СМР', menuWidth: 320, menuAlign: 'end', kind: 'date-range' },
      { key: 'rvStatus', title: 'РВ', spec: KSG_RV_DATE_SPEC, buttonId: 'registryRvStatusButton', menuId: 'registryRvStatusMenu', placeholder: 'РВ', menuWidth: 260, menuAlign: 'end' }
    ];

    const REGISTRY_COLUMN_DEFS = Object.freeze([
      { key: 'uin', title: 'УИН', width: '156px', summaryKey: 'uin', required: true, defaultVisible: true },
      { key: 'dsCode', title: 'Код ДС', width: '118px', summaryKey: 'dsCode', defaultVisible: true },
      { key: 'name', title: 'Наименование объекта', width: 'auto', summaryKey: 'name', defaultVisible: true },
      { key: 'status', title: 'Статус', width: '128px', filterKey: 'status', summaryKey: 'status', defaultVisible: true },
      { key: 'grbs', title: 'ГРБС', width: '86px', filterKey: 'grbs', summaryKey: 'grbs', defaultVisible: true },
      { key: 'customer', title: 'Заказчик', width: '170px', filterKey: 'customer', summaryKey: 'customer', defaultVisible: true },
      { key: 'contractor', title: 'Генподрядчик', width: '176px', filterKey: 'contractor', summaryKey: 'contractor', defaultVisible: true },
      { key: 'anoSmgCode', title: 'Код АНО СМГ', width: '132px', summaryKey: 'anoSmgCode', spec: SM_ANO_CODE_SPEC, defaultVisible: false },
      { key: 'monitoringDate', title: 'Дата мониторинга', width: '132px', filterKey: 'monitoringDate', summaryKey: 'monitoringDate', spec: SM_MONITORING_DATE_SPEC, defaultVisible: false },
      { key: 'yandexDisk', title: 'Я.Диск', width: '108px', summaryKey: 'yandexDiskUrl', spec: SM_YANDEX_DISK_SPEC, defaultVisible: false },
      { key: 'autoslider', title: 'Автослайдер', width: '118px', summaryKey: 'autosliderUrl', spec: SM_AUTOSLIDER_SPEC, defaultVisible: false },
      { key: 'constructionReadiness', title: 'Строительная готовность', width: '160px', filterKey: 'constructionReadiness', summaryKey: 'constructionReadinessFact', spec: SM_READINESS_FACT_SPEC, defaultVisible: false, isAvailable: () => hasAnyRegistryColumnSpecs_([SM_READINESS_PLAN_SPEC, SM_READINESS_FACT_SPEC]) },
      { key: 'peopleCount', title: 'Кол-во людей', width: '144px', summaryKey: 'peopleCountFact', spec: SM_PEOPLE_FACT_SPEC, defaultVisible: false, isAvailable: () => hasAnyRegistryColumnSpecs_([SM_PEOPLE_PLAN_SPEC, SM_PEOPLE_FACT_SPEC]) },
      { key: 'deadlineRisk', title: 'Риск срыва сроков', width: '156px', summaryKey: 'deadlineRisk', spec: PPR_DEADLINE_RISK_SPEC, defaultVisible: false },
      { key: 'startSmrDate', title: 'Начало СМР', width: '132px', filterKey: 'startSmrDate', summaryKey: 'startSmrDate', spec: KSG_START_SMR_FACT_SPEC, defaultVisible: false },
      { key: 'rv', title: 'РВ', width: '180px', filterKey: 'rvStatus', summaryKey: 'rvStatus', defaultVisible: false, isAvailable: () => hasAnyRegistryColumnSpecs_([KSG_RV_DATE_SPEC, KSG_RV_NUMBER_SPEC]) }
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
      anoSmgCode: SM_ANO_CODE_SPEC,
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
    const MGZ_AUTO_CALC_FIELD_IDS = Object.freeze({
      contractSum: 'mgz_1_5',
      financed: 'mgz_1_6',
      budgetProgress: 'mgz_1_7'
    });
    const SILENT_DATA_REFRESH_INTERVAL_MS = 25000;
    const SILENT_DATA_REFRESH_MIN_GAP_MS = 15000;
    const SILENT_DATA_REFRESH_WAKE_DELAY_MS = 180;

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

    function buildDefaultRegistryVisibleColumnKeys_() {
      return REGISTRY_COLUMN_DEFS
        .filter(def => def && def.defaultVisible !== false)
        .map(def => String(def.key || '').trim())
        .filter(Boolean);
    }

    function buildEmptyAdminRegistryFormValues_() {
      return ADMIN_REGISTRY_CREATE_FIELDS.reduce((acc, field) => {
        acc[String(field && field.fieldId || '').trim()] = '';
        return acc;
      }, {});
    }

    function normalizeStoredRegistryVisibleColumnKeys_(rawValue) {
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
        buildDefaultRegistryVisibleColumnKeys_().forEach(key => selected.add(key));
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
          { key: 'sm_1_6', dropdownLabel: 'Строительная готовность', title: 'Строительный мониторинг · Строительная готовность', subtitle: 'Строительная готовность', mode: 'all', fieldIds: ['sm_1_6'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'sm_1_7', dropdownLabel: 'Кол-во людей', title: 'Строительный мониторинг · Кол-во людей', subtitle: 'Кол-во людей', mode: 'all', fieldIds: ['sm_1_7'], collectAllMatches: true, matchGroupedTitle: true },
          { key: 'sm_1_8', dropdownLabel: 'Автослайдер', title: 'Строительный мониторинг · Автослайдер', subtitle: 'Автослайдер', mode: 'all', fieldIds: ['sm_1_8'] }
        ]
      },
      ksg_empty: {
        label: 'КСГ',
        sourceKey: '__ksg__',
        excludePinned: false,
        defaultOption: 'empty',
        options: [
          { key: 'empty', dropdownLabel: 'Незаполненные', title: 'КСГ · Незаполненные поля', subtitle: 'РВ', mode: 'empty', fieldIds: ['ksg_12_3', 'ksg_12_4'], collectAllMatches: true },
          { key: 'all', dropdownLabel: 'Все поля', title: 'КСГ', subtitle: 'РВ', mode: 'all', fieldIds: ['ksg_12_3', 'ksg_12_4'], collectAllMatches: true }
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
        return Array.from(new Set(normalized));
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

    const SIDEBAR_PANEL_KEYS = Object.freeze(['registry', 'categories', 'analytics', 'projects', 'data']);

    function normalizeSidebarPanel_(value) {
      const normalized = String(value || '').trim();
      return SIDEBAR_PANEL_KEYS.includes(normalized) ? normalized : 'registry';
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
      objectQuery: '',
      bulkUinText: '',
      registryBulkDraftText: null,
      registryBulkOpen: false,
      registryColumnsPanelOpen: false,
      registryVisibleColumnKeys: buildDefaultRegistryVisibleColumnKeys_(),
        currentView: 'registry',
        sidebarExpanded: true,
        sidebarActivePanel: 'registry',
        objectTabRowIndexes: [],
        registryFacetFilters: buildEmptyRegistryFacetFilters_(),
      registryFacetQueries: buildEmptyRegistryFacetQueries_(),
      personalRegistrySelections: [],
      sharedRegistrySelections: [],
      activeRegistrySelectionId: '',
      selectionLoadingId: '',
      selectionRemovingId: '',
      savedSelectionPanelOpen: true,
      savedSelectionGroupsOpen: buildDefaultSavedSelectionGroupsOpen_(),
      savedSelectionExpandedById: {},
      selectionComposerOpen: false,
      selectionComposerSelectionId: '',
      selectionComposerBusyState: '',
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
      lastDataLoadedAt: 0,
      lastPersistedRegistrySessionJson: ''
    };
    let registryFloatingMenuFrame = 0;
    let registryRowsRenderFrame = 0;
    let registryRowsRenderToken = 0;
    let copyToastTimer = 0;
      let sidebarBrandLogoReplayTimer = 0;
      let sidebarBrandLogoToggleTimer = 0;
    let silentDataRefreshTimer = 0;
    let silentDataRefreshWakeTimer = 0;
    const REGISTRY_INITIAL_RENDER_BATCH = 120;
    const REGISTRY_PROGRESSIVE_RENDER_BATCH = 180;
    const REGISTRY_INITIAL_RENDER_BATCH_DURING_LOGO_REPLAY = 24;
    const REGISTRY_PROGRESSIVE_RENDER_BATCH_DURING_LOGO_REPLAY = 72;

// ===== Transport/API =====

    // ===== Server bridge =====
    function runServer_(functionName, args) {
      const method = String(functionName || '').trim();
      if (!SAFE_SERVER_METHODS.has(method)) return Promise.reject(new Error(`Метод не разрешен: ${method || '(пусто)'}`));
      const payload = Array.isArray(args) ? args : [];
      const requestOptions = buildServerRequestOptions_(method, payload[0]);
      const adapter = window.SupabaseShellApi;
      if (!adapter || typeof adapter.run !== 'function') {
        return Promise.reject(new Error('SupabaseShellApi не инициализирован.'));
      }
      return Promise.resolve()
        .then(() => adapter.run(method, requestOptions))
        .catch(error => {
          throw createServerError_(error);
        });
    }

    function buildServerRequestOptions_(method, rawOptions) {
      const requestOptions = rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)
        ? { ...rawOptions }
        : {};
      if (!AUTH_FREE_SERVER_METHODS.has(method) && requestOptions.sessionToken === undefined && state.sessionToken) {
        requestOptions.sessionToken = state.sessionToken;
      }
      return requestOptions;
    }

    function createServerError_(raw) {
      const message = String(
        raw && raw.message ||
        raw && raw.error ||
        'Ошибка API'
      );
      const error = new Error(message);
      if (raw && raw.code) error.code = String(raw.code || '').trim();
      if (!error.code && /UNAUTHORIZED/i.test(message)) error.code = 'UNAUTHORIZED';
      return error;
    }

    function parseRuntimeOptions_() {
      const out = {};
      const q = new URLSearchParams(window.location.search || '');
      const spreadsheetId = String(q.get('spreadsheetId') || '').trim();
      const sheetName = String(q.get('sheetName') || '').trim();
      const headerRow = Number(q.get('headerRow'));
      const maxRows = Number(q.get('maxRows'));
      out.spreadsheetId = spreadsheetId || DEFAULT_SPREADSHEET_ID;
      out.sheetName = sheetName || DEFAULT_SHEET_NAME;
      if (Number.isFinite(headerRow) && headerRow > 0) out.headerRow = Math.floor(headerRow);
      if (Number.isFinite(maxRows) && maxRows > 0) out.maxRows = Math.floor(maxRows);
      return out;
    }

// ===== Auth =====

    // ===== Bootstrap =====
    document.addEventListener('DOMContentLoaded', () => {
      state.runtimeOptions = parseRuntimeOptions_();
      state.personalRegistrySelections = loadPersonalRegistrySelections_();
      applyRegistrySessionState_(loadRegistrySessionState_());
      state.changeHistoryByObject = loadObjectChangeHistory_();
      state.googleSyncLastAt = loadGoogleSyncLastAt_();
      populatePresetMenus_();
      bindEvents_();
      renderNavState_();
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          replaySidebarBrandLogo_();
        }, 220);
      });
      checkBackendReadiness_();
      initializeAuth_();
    });

    // ===== Top-level events =====
    function bindEvents_() {
      el('btnAuthLogin').addEventListener('click', () => doLogin_());
      el('btnLogout').addEventListener('click', () => logout_());
      initializeSidebarBrandLogo_();
      el('btnSidebarLogo').addEventListener('click', evt => {
        evt.preventDefault();
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            replaySidebarBrandLogo_();
          });
        });
      });
      el('btnSidebarCollapse').addEventListener('click', () => {
        toggleSidebarExpanded_();
      });
      el('authPassword').addEventListener('keydown', evt => {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          doLogin_();
        }
      });
      el('authPassword').addEventListener('input', () => {
        hideAuthError_();
      });
      const btnExportSummaryCsv = el('btnExportSummaryCsv');
      if (btnExportSummaryCsv) btnExportSummaryCsv.addEventListener('click', () => exportSummaryCsv_());
      const btnSyncGoogleSheet = el('btnSyncGoogleSheet');
      if (btnSyncGoogleSheet) btnSyncGoogleSheet.addEventListener('click', () => handleSyncGoogleSheetClick_());
      el('registrySearchInput').addEventListener('input', debounce_(evt => {
        state.objectQuery = String(evt.target.value || '');
        syncRegistrySelectionMatchState_();
        applyObjectFilters_();
        persistRegistrySessionState_();
        renderAll_();
      }, 120));
      el('registryBulkUinInput').addEventListener('input', evt => {
        state.registryBulkDraftText = String(evt.target.value || '');
      });
      el('btnToggleRegistryColumns').addEventListener('click', evt => {
        evt.stopPropagation();
        toggleRegistryColumnsPanel_();
      });
      el('btnAdminRegistryEditMode').addEventListener('click', () => toggleAdminRegistryEditMode_());
      el('btnAdminRegistryAdd').addEventListener('click', () => openAdminRegistryCreateDialog_());
      el('btnAdminRegistryDelete').addEventListener('click', () => deleteSelectedAdminRegistryRows_());
      el('btnRegistryFilterToggle').addEventListener('click', () => toggleRegistryFilterMode_());
      el('btnApplyRegistryBulkUin').addEventListener('click', applyRegistryBulkUinInput_);
      el('btnClearRegistryBulkUin').addEventListener('click', clearRegistryBulkUinInput_);
      const btnSaveObject = el('btnSaveObject');
      const btnTakeObjectWork = el('btnTakeObjectWork');
      const btnReleaseObjectWork = el('btnReleaseObjectWork');
      const btnPrevUndoneObject = el('btnPrevUndoneObject');
      const btnMarkObjectDone = el('btnMarkObjectDone');
      const btnNextUndoneObject = el('btnNextUndoneObject');
      if (btnSaveObject) btnSaveObject.addEventListener('click', () => saveCurrentObjectEdits_());
      if (btnTakeObjectWork) btnTakeObjectWork.addEventListener('click', () => takeCurrentObjectWork_());
      if (btnReleaseObjectWork) btnReleaseObjectWork.addEventListener('click', () => releaseCurrentObjectWork_());
      if (btnPrevUndoneObject) btnPrevUndoneObject.addEventListener('click', () => openPrevUndoneObject_());
      if (btnMarkObjectDone) btnMarkObjectDone.addEventListener('click', () => markCurrentObjectDone_());
      if (btnNextUndoneObject) btnNextUndoneObject.addEventListener('click', () => openNextUndoneObject_());
      el('registryBulkUinInput').addEventListener('keydown', evt => {
        if ((evt.ctrlKey || evt.metaKey) && evt.key === 'Enter') {
          evt.preventDefault();
          applyRegistryBulkUinInput_();
        }
      });
      el('btnReload').addEventListener('click', () => loadData_(buildCurrentDataRefreshOptions_()));
      el('btnOpenSelectionComposer').addEventListener('click', () => toggleRegistrySelectionComposer_());
      el('btnEditActiveSelection').addEventListener('click', () => editActiveRegistrySelectionOrPrompt_());
      el('btnRemoveActiveSelection').addEventListener('click', () => removeActiveRegistrySelectionOrPrompt_());
      el('btnAppendSelectionComposer').addEventListener('click', () => saveCurrentRegistrySelection_('append'));
      el('btnConfirmSelectionComposer').addEventListener('click', () => saveCurrentRegistrySelection_());
      el('btnSelectionComposerClose').addEventListener('click', () => closeRegistrySelectionComposer_());
      el('btnSelectionScopePersonal').addEventListener('click', () => setRegistrySelectionComposerScope_('personal'));
      el('btnSelectionScopeDivision').addEventListener('click', () => setRegistrySelectionComposerScope_('division'));
      el('btnSelectionScopeShared').addEventListener('click', () => setRegistrySelectionComposerScope_('shared'));
      el('selectionNameInput').addEventListener('keydown', evt => {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          saveCurrentRegistrySelection_();
        }
        if (evt.key === 'Escape') {
          evt.preventDefault();
          closeRegistrySelectionComposer_();
        }
      });
      el('btnResetSections').addEventListener('click', resetSections_);
      [
        ['btnNavRegistry', 'registry'],
        ['btnNavCategories', 'categories'],
        ['btnNavAnalytics', 'analytics'],
        ['btnNavProjects', 'projects'],
        ['btnNavData', 'data']
      ].forEach(([id, panelKey]) => {
        const button = el(id);
        if (!button) return;
        button.addEventListener('click', () => handleSidebarNavigation_(panelKey));
      });
      bindRegistryTableEvents_(el('registryTableBody'));
      document.addEventListener('click', evt => {
        if (evt.target.closest('.registry-floating-menu')) return;
        const filterTrigger = evt.target.closest('[data-registry-filter-trigger]');
        if (!filterTrigger) return;
        evt.stopPropagation();
        toggleRegistryFilterMenu_(String(filterTrigger.getAttribute('data-registry-filter-trigger') || ''));
      });

      document.querySelectorAll('[data-quick-preset]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          toggleQuickPresetMenu_(String(button.getAttribute('data-quick-preset') || ''));
        });
      });
      document.addEventListener('click', evt => {
        const copyTrigger = evt.target.closest('[data-copy-text]');
        if (!copyTrigger) return;
        evt.preventDefault();
        evt.stopPropagation();
        copyTextFromTrigger_(copyTrigger);
      }, true);
      document.addEventListener('click', evt => {
        const dialogClose = evt.target.closest('[data-admin-registry-dialog-close]');
        if (dialogClose) {
          evt.preventDefault();
          closeAdminRegistryCreateDialog_();
          return;
        }
        const dialogSubmit = evt.target.closest('[data-admin-registry-dialog-submit]');
        if (dialogSubmit) {
          evt.preventDefault();
          submitAdminRegistryCreate_();
          return;
        }
        if (!evt.target.closest('.preset-row')) closeQuickPresetMenus_();
        if (!evt.target.closest('.registry-filter') && !evt.target.closest('.registry-floating-menu')) closeRegistryFilterMenus_();
        if (!evt.target.closest('#registryColumnsPanel') && !evt.target.closest('#btnToggleRegistryColumns')) closeRegistryColumnsPanel_();
      });
      document.addEventListener('click', evt => {
        const dialog = el('adminRegistryDialog');
        if (!dialog || evt.target !== dialog) return;
        closeAdminRegistryCreateDialog_();
      });
      document.addEventListener('input', evt => {
        const target = evt.target;
        if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
        const fieldId = String(target.getAttribute('data-admin-registry-field-input') || '').trim();
        if (!fieldId) return;
        updateAdminRegistryCreateField_(fieldId, target.value);
      });
      document.addEventListener('keydown', evt => {
        if (evt.key === 'Escape') {
          if (state.adminRegistryDialogOpen) {
            evt.preventDefault();
            closeAdminRegistryCreateDialog_();
          }
          closeQuickPresetMenus_();
          closeRegistryFilterMenus_();
          closeRegistryColumnsPanel_();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          scheduleSilentDataWakeRefresh_();
        }
      });
      window.addEventListener('focus', () => scheduleSilentDataWakeRefresh_());
      window.addEventListener('pageshow', () => scheduleSilentDataWakeRefresh_({ delayMs: 0 }));
      window.addEventListener('online', () => scheduleSilentDataWakeRefresh_({ delayMs: 0 }));
      window.addEventListener('resize', () => scheduleRegistryFloatingMenuPositionUpdate_());
      window.addEventListener('scroll', () => scheduleRegistryFloatingMenuPositionUpdate_(), true);
      window.addEventListener('error', evt => {
        reportRuntimeError_(
          evt && evt.error ? evt.error : (evt && evt.message ? evt.message : 'Неожиданная ошибка интерфейса'),
          'Ошибка интерфейса'
        );
      });
      window.addEventListener('unhandledrejection', evt => {
        reportRuntimeError_(
          evt && evt.reason ? evt.reason : 'Необработанная ошибка промиса',
          'Ошибка интерфейса'
        );
      });
    }

    function bindRegistryTableEvents_(body) {
      if (!body || body.dataset.bound === '1') return;
      body.dataset.bound = '1';
      body.addEventListener('click', evt => {
        const adminSelectButton = evt.target.closest('[data-admin-registry-select]');
        if (adminSelectButton) {
          evt.preventDefault();
          evt.stopPropagation();
          toggleAdminRegistryRowSelection_(Number(adminSelectButton.getAttribute('data-admin-registry-select')));
          return;
        }
        const draftButton = evt.target.closest('[data-toggle-selection-draft]');
        if (draftButton) {
          evt.stopPropagation();
          toggleRegistrySelectionDraftRow_(Number(draftButton.getAttribute('data-toggle-selection-draft')));
          return;
        }
        const sharedWorkBatchButton = evt.target.closest('[data-shared-work-batch-select]');
        if (sharedWorkBatchButton) {
          evt.stopPropagation();
          toggleRegistryRowSharedWorkBatchSelection_(Number(sharedWorkBatchButton.getAttribute('data-shared-work-batch-select')));
          return;
        }
        const doneButton = evt.target.closest('[data-toggle-done]');
        if (doneButton) {
          evt.stopPropagation();
          toggleRegistryRowDone_(Number(doneButton.getAttribute('data-toggle-done')));
          return;
        }
        const workButton = evt.target.closest('[data-registry-work-action]');
        if (workButton) {
          evt.stopPropagation();
          const rowIndex = Number(workButton.getAttribute('data-registry-work-row'));
          const action = String(workButton.getAttribute('data-registry-work-action') || '').trim();
          if (!Number.isFinite(rowIndex) || rowIndex < 0 || !action) return;
          saveSharedSelectionWorkStateForRow_(rowIndex, action);
          return;
        }
        if (evt.target.closest('a[href]')) return;
        const row = evt.target.closest('[data-row-index]');
        if (!row) return;
        openObjectCard_(Number(row.getAttribute('data-row-index')), { addTab: true });
      });
    }

    function scrollWorkspaceToTop_() {
      const workspace = document.querySelector('.workspace');
      const objectView = el('objectView');
      const registryTableWrap = document.querySelector('.registry-table-wrap');
      if (workspace && typeof workspace.scrollTo === 'function') workspace.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (objectView && typeof objectView.scrollTo === 'function') objectView.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (registryTableWrap && typeof registryTableWrap.scrollTo === 'function') registryTableWrap.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.scrollTo(0, 0);
    }

    function switchWorkspaceView_(viewKey) {
      const nextView = String(viewKey || '').trim() === 'object' ? 'object' : 'registry';
      if (nextView === 'object' && state.selectedRowIndex < 0) {
        const tabs = normalizeStoredObjectTabRowIndexes_(state.objectTabRowIndexes)
          .filter(rowIndex => rowIndex < state.rows.length);
        if (tabs.length) state.selectedRowIndex = tabs[tabs.length - 1];
      }
      if (nextView === 'object' && state.selectedRowIndex < 0) {
        renderNavState_();
        return;
      }
      state.currentView = nextView;
      renderAll_();
      scrollWorkspaceToTop_();
    }

    function toggleSidebarExpanded_() {
      state.sidebarExpanded = !state.sidebarExpanded;
      if (!state.sidebarExpanded) {
        closeQuickPresetMenus_();
        closeRegistryFilterMenus_();
        closeRegistryColumnsPanel_();
      }
      renderNavState_();
      persistRegistrySessionState_();
    }

    function initializeSidebarBrandLogo_() {
      const logo = el('brandLogoSvg');
      const path = el('brandLogoPath');
      if (logo) logo.classList.remove('is-replaying');
      if (!path || typeof path.getTotalLength !== 'function') return;
      const length = Number(path.dataset.logoLength) || path.getTotalLength();
      path.dataset.logoLength = String(length);
      path.style.transition = '';
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    }
  
    function replaySidebarBrandLogo_(onComplete) {
      const logo = el('brandLogoSvg');
      const path = el('brandLogoPath');
      if (!path || typeof path.getTotalLength !== 'function') {
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      initializeSidebarBrandLogo_();
      const length = Number(path.dataset.logoLength) || path.getTotalLength();
      if (sidebarBrandLogoReplayTimer) {
        clearTimeout(sidebarBrandLogoReplayTimer);
        sidebarBrandLogoReplayTimer = 0;
      }
      if (sidebarBrandLogoToggleTimer) {
        clearTimeout(sidebarBrandLogoToggleTimer);
        sidebarBrandLogoToggleTimer = 0;
      }
      if (logo) logo.classList.add('is-replaying');
      path.style.transition = 'none';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = `${length}`;
      sidebarBrandLogoReplayTimer = window.setTimeout(() => {
        path.style.transition = 'stroke-dashoffset .64s cubic-bezier(.33,1,.68,1)';
        path.style.strokeDashoffset = '0';
        sidebarBrandLogoReplayTimer = 0;
        sidebarBrandLogoToggleTimer = window.setTimeout(() => {
          if (logo) logo.classList.remove('is-replaying');
          path.style.transition = '';
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
          sidebarBrandLogoToggleTimer = 0;
          if (typeof onComplete === 'function') onComplete();
        }, 640);
      }, 16);
    }

    function isSidebarBrandLogoReplaying_() {
      const logo = el('brandLogoSvg');
      return !!(logo && logo.classList.contains('is-replaying'));
    }

    function handleSidebarNavigation_(panelKey) {
      const nextPanel = normalizeSidebarPanel_(panelKey);
      const isSamePanel = nextPanel !== 'registry' && nextPanel === normalizeSidebarPanel_(state.sidebarActivePanel);
      const shouldOnlyExpand = !isCompactSidebarViewport_() && !state.sidebarExpanded;
      state.sidebarExpanded = true;
      if (shouldOnlyExpand) {
        state.sidebarActivePanel = nextPanel;
        if (nextPanel === 'registry') state.currentView = 'registry';
        renderAll_();
        if (nextPanel === 'registry') scrollWorkspaceToTop_();
        return;
      }
      state.sidebarActivePanel = isSamePanel ? 'registry' : nextPanel;
      if (nextPanel === 'registry' || isSamePanel) state.currentView = 'registry';
      renderAll_();
      if (nextPanel === 'registry' || isSamePanel) scrollWorkspaceToTop_();
    }

    function initializeAuth_() {
      const stored = readStoredSession_();
      if (stored && stored.user && stored.sessionToken) {
        setCurrentUserSession_(stored.user, stored.sessionToken, stored.expiresAt || '');
        hideAuthOverlay_();
        const hydrated = hydrateUiFromBootstrapCache_(stored.sessionToken);
        loadData_(hydrated ? { silent: true } : undefined);
        return;
      }
      clearCurrentUserSession_();
      showAuthOverlay_();
    }

    async function doLogin_() {
      const passwordInput = el('authPassword');
      const loginButton = el('btnAuthLogin');
      const password = String(passwordInput && passwordInput.value || '').trim();
      if (!password) {
        showAuthError_('Введите пароль');
        if (passwordInput) passwordInput.focus();
        return;
      }

      loginButton.disabled = true;
      loginButton.classList.add('is-loading');
      hideAuthError_();

      try {
          const authResponse = await runServer_('auth', [{
            spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
            password,
            remember: false
          }]);
        if (!authResponse || !authResponse.success || !authResponse.user || !authResponse.sessionToken) {
          throw new Error(authResponse && authResponse.error ? authResponse.error : 'Не удалось выполнить вход');
        }

        setCurrentUserSession_(authResponse.user, authResponse.sessionToken, authResponse.expiresAt || '');
        persistSession_({
          user: authResponse.user,
          sessionToken: authResponse.sessionToken,
          expiresAt: authResponse.expiresAt || ''
        });
        hideAuthOverlay_();

        if (!state.rows.length && !state.loading) {
          loadData_();
        } else {
          renderAll_();
        }
      } catch (err) {
        showAuthError_(err && err.message ? err.message.replace(/^AUTH_[A-Z_]+:\s*/i, '') : 'Ошибка авторизации');
        if (passwordInput) passwordInput.focus();
      } finally {
        loginButton.disabled = false;
        loginButton.classList.remove('is-loading');
      }
    }

    function logout_() {
      clearStoredSession_();
      clearCurrentUserSession_();
      showAuthOverlay_();
      renderAll_();
    }

    function setCurrentUserSession_(user, token, expiresAt) {
      state.currentUser = (user && typeof user === 'object') ? { ...user } : null;
      state.sessionToken = String(token || '').trim();
      state.sessionExpiresAt = String(expiresAt || '').trim();
      state.selectionDoneById = loadSelectionDoneState_();
      migrateLegacySelectionDoneState_();
      applyCurrentUserUi_();
      startSilentDataRefresh_();
    }

    function clearCurrentUserSession_() {
      stopSilentDataRefresh_();
      clearBootstrapCache_();
      clearAllObjectEditingState_();
      clearSharedSelectionWorkState_();
      state.selectionLoadingId = '';
      state.selectionRemovingId = '';
      resetRegistrySelectionComposerTransientState_();
      disableAdminRegistryEditMode_();
      state.columns = [];
      state.rows = [];
      state.filteredRowIndexes = [];
      state.objectTabRowIndexes = [];
      state.selectedRowIndex = -1;
      state.currentView = 'registry';
      state.meta = null;
      state.truncated = false;
      state.loading = false;
      state.lastDataLoadedAt = 0;
      state.currentUser = null;
      state.sessionToken = '';
      state.sessionExpiresAt = '';
      state.sharedRegistrySelections = [];
      state.selectionDoneById = {};
      invalidateRegistryDerivedCaches_();
      applyCurrentUserUi_();
    }

    function applyCurrentUserUi_() {
      const card = el('userSessionCard');
      const nameNode = el('userSessionName');
      const roleNode = el('userSessionRole');
      const logoutButton = el('btnLogout');
      const exportButton = el('btnExportSummaryCsv');
      const syncGoogleButton = el('btnSyncGoogleSheet');
      const user = state.currentUser;
      if (!card || !nameNode || !roleNode || !logoutButton) return;
      if (!user || !state.sessionToken) {
        card.classList.add('hidden');
        logoutButton.classList.add('hidden');
        if (exportButton) exportButton.classList.add('hidden');
        if (syncGoogleButton) syncGoogleButton.classList.add('hidden');
        nameNode.textContent = '';
        roleNode.textContent = '';
        syncExportSummaryButtonUi_();
        syncGoogleSheetButtonUi_();
        return;
      }
      nameNode.textContent = String(user.name || 'Пользователь');
      const role = String(user.role || '').trim();
      const division = String(user.division || '').trim();
      roleNode.textContent = [role, division].filter(Boolean).join(' · ') || 'Авторизован';
      card.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
      if (exportButton) exportButton.classList.remove('hidden');
      if (syncGoogleButton) syncGoogleButton.classList.remove('hidden');
      syncExportSummaryButtonUi_();
      syncGoogleSheetButtonUi_();
    }

    function showAuthOverlay_(message) {
      const overlay = el('authOverlay');
      if (overlay) overlay.classList.remove('hidden');
      if (message) showAuthError_(message);
      else hideAuthError_();
      const passwordInput = el('authPassword');
      if (passwordInput) {
        passwordInput.value = '';
        window.setTimeout(() => passwordInput.focus(), 20);
      }
    }

    function hideAuthOverlay_() {
      const overlay = el('authOverlay');
      if (overlay) overlay.classList.add('hidden');
      hideAuthError_();
    }

    function showAuthError_(message) {
      const node = el('authError');
      if (!node) return;
      node.textContent = String(message || 'Ошибка авторизации');
      node.classList.remove('hidden');
    }

    function hideAuthError_() {
      const node = el('authError');
      if (!node) return;
      node.textContent = '';
      node.classList.add('hidden');
    }

    function persistSession_(sessionPayload) {
      if (!sessionPayload || !sessionPayload.user || !sessionPayload.sessionToken) return;
      const payload = JSON.stringify({
        user: sessionPayload.user,
        sessionToken: String(sessionPayload.sessionToken || ''),
        expiresAt: String(sessionPayload.expiresAt || '')
      });
      try {
        window.sessionStorage.setItem(SHELL_SESSION_STORAGE_KEY, payload);
        window.localStorage.removeItem(SHELL_SESSION_PERSIST_STORAGE_KEY);
      } catch (e) {}
    }

    function clearStoredSession_() {
      try {
        window.sessionStorage.removeItem(SHELL_SESSION_STORAGE_KEY);
        window.localStorage.removeItem(SHELL_SESSION_PERSIST_STORAGE_KEY);
      } catch (e) {}
    }

    function loadGoogleSyncLastAt_() {
      try {
        return String(window.localStorage.getItem(GOOGLE_SYNC_LAST_AT_STORAGE_KEY) || '').trim();
      } catch (e) {
        return '';
      }
    }

    function persistGoogleSyncLastAt_(value) {
      const nextValue = String(value || '').trim();
      state.googleSyncLastAt = nextValue;
      try {
        if (nextValue) window.localStorage.setItem(GOOGLE_SYNC_LAST_AT_STORAGE_KEY, nextValue);
        else window.localStorage.removeItem(GOOGLE_SYNC_LAST_AT_STORAGE_KEY);
      } catch (e) {}
    }

    function formatGoogleSyncLastAt_(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      const date = new Date(text);
      if (!Number.isFinite(date.getTime())) return text;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear());
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    function clearBootstrapCache_() {
      try {
        window.sessionStorage.removeItem(SHELL_BOOTSTRAP_CACHE_STORAGE_KEY);
      } catch (e) {}
    }

    function buildCurrentSharedSelectionWorkSnapshot_() {
      const selectionId = String(state.sharedSelectionWorkSelectionId || '').trim();
      if (!selectionId) return null;
      return {
        selectionId,
        blockKey: String(state.sharedSelectionWorkBlockKey || '').trim(),
        blockName: String(state.sharedSelectionWorkBlockName || '').trim(),
        items: Object.values(state.sharedSelectionWorkItemsByKey || {})
      };
    }

    function persistBootstrapCache_(payload) {
      if (!state.sessionToken || !payload || typeof payload !== 'object') return;
      const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
      const sharedSelections = Array.isArray(payload.sharedSelections) ? payload.sharedSelections : state.sharedRegistrySelections;
      const sharedSelectionWork = payload.sharedSelectionWork && typeof payload.sharedSelectionWork === 'object'
        ? payload.sharedSelectionWork
        : buildCurrentSharedSelectionWorkSnapshot_();
      try {
        window.sessionStorage.setItem(SHELL_BOOTSTRAP_CACHE_STORAGE_KEY, JSON.stringify({
          sessionToken: state.sessionToken,
          cachedAt: new Date().toISOString(),
          data,
          sharedSelections,
          sharedSelectionWork
        }));
      } catch (e) {}
    }

    function readBootstrapCache_(sessionToken) {
      const token = String(sessionToken || '').trim();
      if (!token) return null;
      try {
        const raw = window.sessionStorage.getItem(SHELL_BOOTSTRAP_CACHE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || String(parsed.sessionToken || '').trim() !== token) return null;
        return parsed;
      } catch (e) {
        clearBootstrapCache_();
        return null;
      }
    }

    function readStoredSession_() {
      const candidates = [];
      try { candidates.push(window.sessionStorage.getItem(SHELL_SESSION_STORAGE_KEY)); } catch (e) {}
      try { window.localStorage.removeItem(SHELL_SESSION_PERSIST_STORAGE_KEY); } catch (e) {}
      try { window.localStorage.removeItem(LEGACY_AUTH_PASSWORD_STORAGE_KEY); } catch (e) {}
      for (let i = 0; i < candidates.length; i++) {
        const parsed = parseStoredSessionPayload_(candidates[i]);
        if (parsed) return parsed;
      }
      clearStoredSession_();
      return null;
    }

    function parseStoredSessionPayload_(raw) {
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.user || !parsed.sessionToken) return null;
        const expiresAt = String(parsed.expiresAt || '').trim();
        if (expiresAt) {
          const expiryMs = Date.parse(expiresAt);
          if (Number.isFinite(expiryMs) && expiryMs <= Date.now()) return null;
        }
        return {
          user: parsed.user,
          sessionToken: String(parsed.sessionToken || '').trim(),
          expiresAt
        };
      } catch (e) {
        return null;
      }
    }

    function handleUnauthorized_(message) {
      clearStoredSession_();
      clearCurrentUserSession_();
      showAuthOverlay_(message || 'Сессия истекла. Войдите снова.');
    }

    function applyDataPayloadToState_(payload) {
      const dataPayload = payload && typeof payload === 'object' ? payload : {};
      state.columns = (Array.isArray(dataPayload.columns) ? dataPayload.columns : []).map((column, idx) => makeColumnMeta_(column, idx));
      state.rows = (Array.isArray(dataPayload.rows) ? dataPayload.rows : []).map(row => (
        Array.isArray(row) ? row.map(value => String(value == null ? '' : value).trim()) : []
      ));
      invalidateRegistryDerivedCaches_();
      state.meta = dataPayload;
      if (dataPayload.currentUser) setCurrentUserSession_(dataPayload.currentUser, state.sessionToken, state.sessionExpiresAt);
      state.truncated = !!dataPayload.truncated;
      state.lastDataLoadedAt = Date.now();
    }

    function applyBootstrapPayloadToState_(payload) {
      const bootstrapPayload = payload && typeof payload === 'object' ? payload : {};
      const dataPayload = bootstrapPayload.data && typeof bootstrapPayload.data === 'object'
        ? bootstrapPayload.data
        : bootstrapPayload;
      applyDataPayloadToState_(dataPayload);

      if (Array.isArray(bootstrapPayload.sharedSelections)) {
        state.sharedRegistrySelections = normalizeSharedRegistrySelections_(bootstrapPayload.sharedSelections);
      }

      if (bootstrapPayload.sharedSelectionWork && typeof bootstrapPayload.sharedSelectionWork === 'object') {
        const workState = bootstrapPayload.sharedSelectionWork;
        const fallbackBlockName = getCurrentUserBlockName_();
        const selectionId = String(
          workState.selectionId ||
          state.activeRegistrySelectionId ||
          state.sharedSelectionWorkSelectionId ||
          ''
        ).trim();
        if (selectionId) {
          setSharedSelectionWorkState_(
            selectionId,
            workState.blockKey || fallbackBlockName,
            workState.blockName || fallbackBlockName,
            workState.items
          );
        } else {
          clearSharedSelectionWorkState_();
        }
      }
    }

    function hydrateUiFromBootstrapCache_(sessionToken) {
      const cached = readBootstrapCache_(sessionToken);
      if (!cached || !cached.data) return false;
      applyBootstrapPayloadToState_(cached);
      restoreActiveRegistrySelectionState_();
      applyObjectFilters_();
      syncObjectTabsState_();
      ensureObjectSelection_();
      syncSharedSelectionWorkStateForActiveSelection_();
      syncRegistryBulkUinUi_();
      renderAll_();
      return true;
    }

    function checkBackendReadiness_() {
      return runServer_('auth', [{ password: '' }])
        .then(() => {
          clearRuntimeError_();
        })
        .catch(err => {
          const code = String(err && err.code || '').trim().toUpperCase();
          if (code === 'AUTH_INPUT' || code === 'AUTH_INVALID') {
            clearRuntimeError_();
            return null;
          }
          if (code === 'BACKEND_NOT_DEPLOYED') {
            setRuntimeError_('Supabase backend не развернут. Выполните supabase/schema.sql, дождитесь обновления schema cache и повторите запуск.');
            return null;
          }
          if (code === 'MISSING_TABLE') {
            setRuntimeError_('В Supabase не хватает обязательных таблиц для приложения. Проверьте импорт данных и supabase/schema.sql.');
            return null;
          }
          setRuntimeError_(err && err.message ? err.message : 'Не удалось проверить готовность Supabase backend.');
          return null;
        });
    }

    function isUnauthorizedError_(err) {
      const code = String(err && err.code || '').trim().toUpperCase();
      const message = String(err && err.message || '').trim().toUpperCase();
      return code === 'UNAUTHORIZED' || message.indexOf('UNAUTHORIZED') >= 0;
    }

function buildCurrentDataRefreshOptions_(options) {
      const settings = options || {};
      return {
        ...settings,
        preserveSelectedRowIndex: Number.isFinite(settings.preserveSelectedRowIndex)
          ? Number(settings.preserveSelectedRowIndex)
          : state.selectedRowIndex,
        preserveBulkUinOrder: Array.isArray(settings.preserveBulkUinOrder)
          ? settings.preserveBulkUinOrder.slice()
          : parseRegistryBulkUinText_(state.bulkUinText),
        preserveView: String(settings.preserveView || state.currentView || '').trim()
      };
    }

    function fetchSmartFilterShellBootstrap_(requestOptions) {
      const nextOptions = {
        ...(requestOptions || {}),
        activeSelectionId: String(state.activeRegistrySelectionId || '').trim()
      };
      return runServer_('getSmartFilterShellBootstrap', [nextOptions]).then(result => (
        result && typeof result === 'object' ? { ...result } : {}
      ));
    }

    function hasFocusedInteractiveControl_() {
      const active = document.activeElement;
      if (!active || active === document.body) return false;
      if (active.isContentEditable) return true;
      const tag = String(active.tagName || '').toUpperCase();
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!active.closest('[contenteditable="true"]');
    }

    function hasPendingObjectEdits_() {
      return state.editsByRow instanceof Map && state.editsByRow.size > 0;
    }

    function hasInteractiveEditingState_() {
      return !!(
        state.headerEditing ||
        state.passportEditing ||
        state.sectionEditingId ||
        state.selectionComposerOpen ||
        state.adminRegistryEditMode ||
        state.adminRegistryDialogOpen ||
        state.adminRegistryPendingAction ||
        hasSharedSelectionWorkBatchMode_() ||
        state.openRegistryFilterKey ||
        state.openPresetMenuKey
      );
    }

    function clearAllObjectEditingState_() {
      state.headerEditing = false;
      state.passportEditing = false;
      state.sectionEditingId = '';
      state.headerEditSnapshot = new Map();
      state.passportEditSnapshot = new Map();
      state.sectionEditSnapshot = new Map();
      state.editsByRow = new Map();
      state.pendingFocusFieldKey = '';
      state.objectSaveMessage = '';
      state.objectSaveError = '';
      state.objectSaveVisual = 'idle';
    }

    function shouldSkipSilentDataRefresh_(options) {
      const settings = options || {};
      return !!(
        !state.sessionToken ||
        state.loading ||
        state.objectSaving ||
        state.pendingSharedSelectionSave ||
        hasPendingSharedSelectionWorkActions_() ||
        hasPendingObjectEdits_() ||
        hasInteractiveEditingState_() ||
        (!settings.ignoreFocusedControl && hasFocusedInteractiveControl_())
      );
    }

    function triggerSilentDataRefresh_(options) {
      const settings = options || {};
      if (!settings.allowHidden && document.visibilityState !== 'visible') return Promise.resolve(false);
      if (shouldSkipSilentDataRefresh_(settings)) return Promise.resolve(false);
      if (!settings.force && state.lastDataLoadedAt && (Date.now() - state.lastDataLoadedAt) < SILENT_DATA_REFRESH_MIN_GAP_MS) {
        return Promise.resolve(false);
      }
      return loadData_(buildCurrentDataRefreshOptions_({
        silent: true,
        preserveScroll: true
      })).then(() => true).catch(() => false);
    }

    function scheduleSilentDataWakeRefresh_(options) {
      const settings = options || {};
      if (!state.sessionToken) return;
      if (silentDataRefreshWakeTimer) window.clearTimeout(silentDataRefreshWakeTimer);
      const delayMs = Number.isFinite(Number(settings.delayMs))
        ? Math.max(0, Number(settings.delayMs))
        : SILENT_DATA_REFRESH_WAKE_DELAY_MS;
      silentDataRefreshWakeTimer = window.setTimeout(() => {
        silentDataRefreshWakeTimer = 0;
        triggerSilentDataRefresh_({
          force: true,
          ignoreFocusedControl: true
        });
      }, delayMs);
    }

    function startSilentDataRefresh_() {
      stopSilentDataRefresh_();
      if (!state.sessionToken) return;
      silentDataRefreshTimer = window.setInterval(() => {
        triggerSilentDataRefresh_();
      }, SILENT_DATA_REFRESH_INTERVAL_MS);
    }

    function stopSilentDataRefresh_() {
      if (silentDataRefreshTimer) {
        window.clearInterval(silentDataRefreshTimer);
        silentDataRefreshTimer = 0;
      }
      if (silentDataRefreshWakeTimer) {
        window.clearTimeout(silentDataRefreshWakeTimer);
        silentDataRefreshWakeTimer = 0;
      }
    }

// ===== Storage =====

    // ----- Persistence -----

function loadObjectChangeHistory_() {
      try {
        const raw = window.sessionStorage.getItem(CHANGE_HISTORY_SESSION_STORAGE_KEY);
        const parsed = JSON.parse(raw || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const out = {};
        Object.keys(parsed).forEach(key => {
          const entries = Array.isArray(parsed[key]) ? parsed[key] : [];
          out[key] = entries
            .map(item => ({
              at: Number(item && item.at),
              colIndex: Number(item && item.colIndex),
              field: String(item && item.field || '').trim(),
              from: String(item && item.from || ''),
              to: String(item && item.to || '')
            }))
            .filter(item => Number.isFinite(item.at) && item.field);
        });
        return out;
      } catch (e) {
        return {};
      }
    }

function persistObjectChangeHistory_() {
      try {
        window.sessionStorage.setItem(CHANGE_HISTORY_SESSION_STORAGE_KEY, JSON.stringify(state.changeHistoryByObject || {}));
      } catch (e) {}
    }

function getObjectChangeHistoryKey_(rowIndex) {
      return getRegistryRowWorkKey_(rowIndex);
    }

function buildObjectChangeHistoryEntries_(rowIndex, edits) {
      const row = state.rows[rowIndex] || [];
      const timestamp = Date.now();
      return (Array.isArray(edits) ? edits : [])
        .map(edit => {
          const colIndex = Number(edit && edit.colIndex);
          if (!Number.isFinite(colIndex) || colIndex < 0) return null;
          const column = state.columns[colIndex];
          const from = getCellValueFromRow_(row, colIndex);
          const to = String(edit && edit.value != null ? edit.value : '').trim();
          if (from === to) return null;
          return {
            at: timestamp,
            colIndex,
            field: String(column && column.label || `Поле ${colIndex + 1}`),
            from,
            to
          };
        })
        .filter(Boolean);
    }

function appendObjectChangeHistory_(rowIndex, entries) {
      const key = String(getObjectChangeHistoryKey_(rowIndex) || '').trim();
      if (!key) return;
      const nextEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
      if (!nextEntries.length) return;
      const current = Array.isArray(state.changeHistoryByObject[key]) ? state.changeHistoryByObject[key] : [];
      state.changeHistoryByObject[key] = nextEntries.concat(current).slice(0, 24);
      persistObjectChangeHistory_();
    }

function persistPersonalRegistrySelections_() {
      try {
        const payload = state.personalRegistrySelections.map(item => ({
          id: String(item && item.id || ''),
          scope: 'personal',
          name: String(item && item.name || ''),
          meta: String(item && item.meta || ''),
          objectQuery: String(item && item.objectQuery || ''),
          bulkUinText: String(item && item.bulkUinText || ''),
          registryFacetFilters: normalizeStoredRegistryFacetFilters_(item && item.registryFacetFilters || {}),
          createdAt: String(item && item.createdAt || ''),
          updatedAt: String(item && item.updatedAt || '')
        }));
        window.localStorage.setItem(REGISTRY_PERSONAL_SELECTIONS_STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {}
    }

function loadPersonalRegistrySelections_() {
      try {
        const raw = window.localStorage.getItem(REGISTRY_PERSONAL_SELECTIONS_STORAGE_KEY) || window.localStorage.getItem(LEGACY_REGISTRY_SELECTIONS_STORAGE_KEY) || '[]';
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed)
          ? parsed.map(item => normalizeSavedRegistrySelectionItem_(item, 'personal')).filter(Boolean)
          : [];
        return items.sort(compareSavedRegistrySelections_);
      } catch (e) {
        return [];
      }
    }

function buildRegistrySessionStatePayload_() {
        return {
          activeRegistrySelectionId: String(state.activeRegistrySelectionId || ''),
          selectionDraftSourceId: String(state.selectionDraftSourceId || ''),
          objectQuery: String(state.objectQuery || ''),
          bulkUinText: String(state.bulkUinText || ''),
          registryBulkOpen: !!state.registryBulkOpen,
          registryVisibleColumnKeys: normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys),
          currentView: String(state.currentView || '') === 'object' ? 'object' : 'registry',
          sidebarExpanded: !!state.sidebarExpanded,
          sidebarActivePanel: normalizeSidebarPanel_(state.sidebarActivePanel),
          objectTabRowIndexes: normalizeStoredObjectTabRowIndexes_(state.objectTabRowIndexes),
          selectedRowIndex: Number.isFinite(state.selectedRowIndex) && state.selectedRowIndex >= 0 ? Number(state.selectedRowIndex) : -1,
          registryFacetFilters: state.registryFacetFilters,
        passportCollapsed: !!state.passportCollapsed,
        savedSelectionPanelOpen: !!state.savedSelectionPanelOpen,
        savedSelectionGroupsOpen: normalizeSavedSelectionGroupsOpen_(state.savedSelectionGroupsOpen),
        savedSelectionExpandedById: normalizeSavedSelectionExpandedById_(state.savedSelectionExpandedById),
        presetSelections: normalizeStoredPresetSelections_(state.presetSelections),
        activePresetKeys: state.activeSections
          .filter(section => section && section.presetKey)
          .map(section => String(section.presetKey || '').trim())
          .filter(Boolean)
      };
    }

function persistRegistrySessionState_() {
      try {
        const nextJson = JSON.stringify(buildRegistrySessionStatePayload_());
        if (nextJson === state.lastPersistedRegistrySessionJson) return;
        window.localStorage.setItem(REGISTRY_SESSION_STORAGE_KEY, nextJson);
        state.lastPersistedRegistrySessionJson = nextJson;
      } catch (e) {}
    }

function loadRegistrySessionState_() {
      try {
        let shouldUseStoredRegistryColumns = false;
        try {
          const storedLayoutVersion = String(window.localStorage.getItem(REGISTRY_COLUMNS_LAYOUT_VERSION_STORAGE_KEY) || '').trim();
          shouldUseStoredRegistryColumns = storedLayoutVersion === REGISTRY_COLUMNS_LAYOUT_VERSION;
          if (!shouldUseStoredRegistryColumns) {
            window.localStorage.setItem(REGISTRY_COLUMNS_LAYOUT_VERSION_STORAGE_KEY, REGISTRY_COLUMNS_LAYOUT_VERSION);
          }
        } catch (e) {}
        const raw = window.localStorage.getItem(REGISTRY_SESSION_STORAGE_KEY);
        const parsed = JSON.parse(raw || '{}');
          return {
            activeRegistrySelectionId: String(parsed && parsed.activeRegistrySelectionId || ''),
            selectionDraftSourceId: String(parsed && parsed.selectionDraftSourceId || ''),
            objectQuery: String(parsed && parsed.objectQuery || ''),
            bulkUinText: String(parsed && parsed.bulkUinText || ''),
            registryBulkOpen: !!(parsed && parsed.registryBulkOpen),
            registryVisibleColumnKeys: shouldUseStoredRegistryColumns
              ? normalizeStoredRegistryVisibleColumnKeys_(parsed && parsed.registryVisibleColumnKeys)
              : buildDefaultRegistryVisibleColumnKeys_(),
            currentView: String(parsed && parsed.currentView || '') === 'object' ? 'object' : 'registry',
            sidebarExpanded: true,
            sidebarActivePanel: normalizeSidebarPanel_(parsed && parsed.sidebarActivePanel),
            objectTabRowIndexes: normalizeStoredObjectTabRowIndexes_(parsed && parsed.objectTabRowIndexes),
            selectedRowIndex: Number.isFinite(Number(parsed && parsed.selectedRowIndex)) && Number(parsed && parsed.selectedRowIndex) >= 0
              ? Math.floor(Number(parsed.selectedRowIndex))
              : -1,
          registryFacetFilters: normalizeStoredRegistryFacetFilters_(parsed && parsed.registryFacetFilters || {}),
          passportCollapsed: !!(parsed && parsed.passportCollapsed),
          savedSelectionPanelOpen: parsed && parsed.savedSelectionPanelOpen !== undefined ? !!parsed.savedSelectionPanelOpen : true,
          savedSelectionGroupsOpen: normalizeSavedSelectionGroupsOpen_(parsed && parsed.savedSelectionGroupsOpen),
          savedSelectionExpandedById: normalizeSavedSelectionExpandedById_(parsed && parsed.savedSelectionExpandedById),
          presetSelections: normalizeStoredPresetSelections_(parsed && parsed.presetSelections),
          activePresetKeys: normalizeStoredActivePresetKeys_(parsed && parsed.activePresetKeys)
        };
      } catch (e) {
          return {
            activeRegistrySelectionId: '',
            selectionDraftSourceId: '',
            objectQuery: '',
            bulkUinText: '',
            registryBulkOpen: false,
            registryVisibleColumnKeys: buildDefaultRegistryVisibleColumnKeys_(),
            currentView: 'registry',
            sidebarExpanded: true,
            sidebarActivePanel: 'registry',
            objectTabRowIndexes: [],
            selectedRowIndex: -1,
            registryFacetFilters: normalizeStoredRegistryFacetFilters_({}),
          passportCollapsed: false,
          savedSelectionPanelOpen: true,
          savedSelectionGroupsOpen: buildDefaultSavedSelectionGroupsOpen_(),
          savedSelectionExpandedById: {},
          presetSelections: buildDefaultPresetSelections_(),
          activePresetKeys: []
        };
      }
    }

function normalizeStoredObjectTabRowIndexes_(rawRowIndexes) {
      return Array.from(new Set(
        (Array.isArray(rawRowIndexes) ? rawRowIndexes : [])
          .map(value => Number(value))
          .filter(value => Number.isFinite(value) && value >= 0)
          .map(value => Math.floor(value))
      ));
    }

function getSelectionProgressStorageKey_() {
      const userName = normalizeText_(state.currentUser && state.currentUser.name || 'guest') || 'guest';
      const division = normalizeText_(state.currentUser && state.currentUser.division || '');
      const suffix = [userName, division].filter(Boolean).join('__');
      return `${REGISTRY_SELECTION_PROGRESS_STORAGE_PREFIX}${suffix || 'guest'}`;
    }

function loadSelectionDoneState_() {
      if (!state.currentUser) return {};
      try {
        const raw = window.localStorage.getItem(getSelectionProgressStorageKey_());
        const parsed = JSON.parse(raw || '{}');
        const out = {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
        Object.keys(parsed).forEach(selectionId => {
          const key = String(selectionId || '').trim();
          if (!key) return;
          const list = Array.isArray(parsed[selectionId])
            ? parsed[selectionId].map(value => String(value || '')).filter(Boolean)
            : [];
          if (list.length) out[key] = Array.from(new Set(list));
        });
        return out;
      } catch (e) {
        return {};
      }
    }

function persistSelectionDoneState_() {
      if (!state.currentUser) return;
      try {
        const payload = {};
        Object.keys(state.selectionDoneById || {}).forEach(selectionId => {
          const list = Array.isArray(state.selectionDoneById[selectionId])
            ? state.selectionDoneById[selectionId].map(value => String(value || '')).filter(Boolean)
            : [];
          if (list.length) payload[selectionId] = Array.from(new Set(list));
        });
        window.localStorage.setItem(getSelectionProgressStorageKey_(), JSON.stringify(payload));
      } catch (e) {}
    }

function migrateLegacySelectionDoneState_() {
      if (!state.currentUser || !Array.isArray(state.personalRegistrySelections)) return;
      let changed = false;
      state.personalRegistrySelections = state.personalRegistrySelections.map(item => {
        const legacy = Array.isArray(item && item.legacyDoneRowKeys) ? item.legacyDoneRowKeys : [];
        if (!legacy.length) return { ...item, legacyDoneRowKeys: [] };
        const current = new Set(Array.isArray(state.selectionDoneById[item.id]) ? state.selectionDoneById[item.id] : []);
        legacy.forEach(value => current.add(String(value || '').trim()));
        state.selectionDoneById[item.id] = Array.from(current).filter(Boolean);
        changed = true;
        return {
          ...item,
          legacyDoneRowKeys: []
        };
      });
      if (changed) {
        persistSelectionDoneState_();
        persistPersonalRegistrySelections_();
      }
    }

    // ----- Edit buffers -----

function getPendingEditsForRow_(rowIndex) {
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return [];
      const rowMap = state.editsByRow.get(Number(rowIndex));
      if (!rowMap || !rowMap.size) return [];
      return Array.from(rowMap.entries())
        .map(([colIndex, value]) => ({
          rowIndex: Number(rowIndex),
          colIndex: Number(colIndex),
          value: String(value == null ? '' : value)
        }))
        .sort((a, b) => a.colIndex - b.colIndex);
    }

function hasPendingEditsForRow_(rowIndex) {
      return getPendingEditsForRow_(rowIndex).length > 0;
    }

function clearTransientEditsForRow_(rowIndex) {
      const rowPrefix = `${Number(rowIndex)}:`;
      if (String(state.pendingFocusFieldKey || '').startsWith(rowPrefix)) state.pendingFocusFieldKey = '';
      if (Number(state.selectedRowIndex) === Number(rowIndex)) {
        state.headerEditing = false;
        state.headerEditSnapshot = new Map();
        state.passportEditing = false;
        state.passportEditSnapshot = new Map();
        state.sectionEditingId = '';
        state.sectionEditSnapshot = new Map();
      }
    }

function applySavedEditsLocally_(edits) {
      (Array.isArray(edits) ? edits : []).forEach(edit => {
        const rowIndex = Number(edit && edit.rowIndex);
        const colIndex = Number(edit && edit.colIndex);
        if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
        if (!Number.isFinite(colIndex) || colIndex < 0) return;
        if (!Array.isArray(state.rows[rowIndex])) return;
        state.rows[rowIndex][colIndex] = String(edit && edit.value != null ? edit.value : '');
      });
    }

function canRestoreHistoryEntry_(rowIndex, entry) {
      const colIndex = Number(entry && entry.colIndex);
      if (!Number.isFinite(colIndex) || colIndex < 0) return false;
      if (isAutoCalculatedFieldColumn_(colIndex)) return false;
      if (!hasLoadedRowDetails_(rowIndex)) return false;
      return getCellValue_(rowIndex, colIndex) !== String(entry && entry.from != null ? entry.from : '').trim();
    }

function restoreHistoryEntry_(rowIndex, historyIndex) {
      const key = getObjectChangeHistoryKey_(rowIndex);
      const entries = key && Array.isArray(state.changeHistoryByObject[key]) ? state.changeHistoryByObject[key] : [];
      const entry = entries[Number(historyIndex)];
      const colIndex = Number(entry && entry.colIndex);
      if (!entry || !Number.isFinite(colIndex) || colIndex < 0) return;
      setEditedValue_(rowIndex, colIndex, String(entry.from != null ? entry.from : ''));
      renderAll_();
    }

function clearObjectHistory_(rowIndex) {
      const key = String(getObjectChangeHistoryKey_(rowIndex) || '').trim();
      if (!key) return;
      if (!Object.prototype.hasOwnProperty.call(state.changeHistoryByObject, key)) return;
      delete state.changeHistoryByObject[key];
      persistObjectChangeHistory_();
      renderObjectHistory_();
    }

function saveCurrentObjectEdits_() {
      const rowIndex = Number(state.selectedRowIndex);
      const edits = getPendingEditsForRow_(rowIndex).filter(item => {
        const column = state.columns[Number(item && item.colIndex)];
        const fieldId = normalizeText_(column && column.fieldId || '');
        return !isGoogleOwnedHtmlFieldId_(fieldId);
      });
      if (!Number.isFinite(rowIndex) || rowIndex < 0 || !hasLoadedRowDetails_(rowIndex) || !edits.length || state.objectSaving) return Promise.resolve();
      const historyEntries = buildObjectChangeHistoryEntries_(rowIndex, edits);

      state.objectSaving = true;
      state.objectSaveError = '';
      state.objectSaveMessage = '';
      state.objectSaveVisual = 'idle';
      syncObjectSaveUi_();

      const options = {
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        sheetName: state.runtimeOptions.sheetName || DEFAULT_SHEET_NAME,
        headerRow: state.runtimeOptions.headerRow || DEFAULT_HEADER_ROW,
        edits: edits.map(item => ({
          rowIndex: item.rowIndex,
          colIndex: item.colIndex,
          value: item.value
        }))
      };

      return runServer_('saveSmartFilterShellEdits', [options])
        .then(result => {
          applySavedEditsLocally_(edits);
          appendObjectChangeHistory_(rowIndex, historyEntries);
          state.editsByRow.delete(rowIndex);
          clearTransientEditsForRow_(rowIndex);
          state.objectSaveMessage = formatObjectSaveMessage_(result, edits.length);
          state.objectSaveError = '';
          state.objectSaveVisual = 'success';
          state.objectSaving = false;
          applyObjectFilters_();
          renderAll_();
        })
        .catch(err => {
          if (isUnauthorizedError_(err)) {
            state.objectSaving = false;
            state.objectSaveVisual = 'idle';
            syncObjectSaveUi_();
            handleUnauthorized_();
            return;
          }
          state.objectSaveError = err && err.message ? err.message : String(err);
          state.objectSaveVisual = 'error';
          state.objectSaving = false;
          syncObjectSaveUi_();
        });
    }

    // ===== Registry selection persistence =====

    // ----- Selection state -----

function isRegistrySelectionEditing_() {
      return !!state.selectionComposerOpen;
    }

function isAutoSyncNewRegistrySelectionDraft_() {
      return !!(
        state.selectionComposerOpen &&
        !String(state.selectionComposerSelectionId || '').trim() &&
        state.selectionEditDraftAutoSync
      );
    }

function getRegistrySelectionEditDraftSet_() {
      return new Set((Array.isArray(state.selectionEditDraftUins) ? state.selectionEditDraftUins : []).map(normalizeText_).filter(Boolean));
    }

function getEditableRegistrySelectionUins_(item) {
      if (!item) return [];
      if (hasStoredRegistrySelectionBulkSet_(item)) return parseRegistryBulkUinText_(item.bulkUinText);
      return collectCurrentFilteredSelectionUins_();
    }

function setRegistrySelectionEditDraftUins_(items) {
      state.selectionEditDraftUins = mergeRegistrySelectionUins_(items, []);
      if (state.selectionComposerOpen) syncRegistrySelectionComposerUi_();
    }

function clearRegistrySelectionEditDraft_() {
      state.selectionEditDraftUins = [];
      state.selectionEditDraftAutoSync = false;
    }

function syncRegistrySelectionDraftFromFilteredRows_() {
      if (!isAutoSyncNewRegistrySelectionDraft_()) return;
      setRegistrySelectionEditDraftUins_(collectCurrentFilteredSelectionUins_());
    }

function getRegistryRowUin_(rowIndex) {
      return String(getRegistrySummaryValue_(rowIndex, 'uin') || '').trim();
    }

function toggleRegistrySelectionDraftRow_(rowIndex) {
      if (!isRegistrySelectionEditing_()) return;
      const uin = getRegistryRowUin_(rowIndex);
      const normUin = normalizeText_(uin);
      if (!uin || !normUin) return;
      state.selectionEditDraftAutoSync = false;
      const currentDraft = Array.isArray(state.selectionEditDraftUins) ? state.selectionEditDraftUins.slice() : [];
      const next = [];
      let removed = false;
      currentDraft.forEach(value => {
        if (normalizeText_(value) === normUin) {
          removed = true;
          return;
        }
        next.push(value);
      });
      if (!removed) next.push(uin);
      setRegistrySelectionEditDraftUins_(next);
      applyObjectFilters_();
      ensureObjectSelection_();
      renderAll_();
    }

function clearRegistryFiltersForSelectionEdit_() {
      state.objectQuery = '';
      state.bulkUinText = '';
      state.registryBulkDraftText = null;
      state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      const searchInput = el('registrySearchInput');
      if (searchInput) searchInput.value = '';
      syncRegistryBulkUinUi_();
      applyObjectFilters_();
      ensureObjectSelection_();
      renderAll_();
    }

function showOnlyRegistrySelectionDraft_() {
      state.selectionEditDraftAutoSync = false;
      state.objectQuery = '';
      state.bulkUinText = buildRegistrySelectionBulkUinText_(state.selectionEditDraftUins);
      state.registryBulkDraftText = null;
      state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      const searchInput = el('registrySearchInput');
      if (searchInput) searchInput.value = '';
      syncRegistryBulkUinUi_();
      applyObjectFilters_();
      ensureObjectSelection_();
      renderAll_();
    }

    function openRegistrySelectionComposer_(selectionId) {
      if (state.adminRegistryEditMode) disableAdminRegistryEditMode_();
      const compose = el('selectionCompose');
      const input = el('selectionNameInput');
      if (!compose || !input) return;
      const editingItem = selectionId ? findSavedRegistrySelectionById_(selectionId) : null;
      resetRegistrySelectionComposerTransientState_();
      state.selectionComposerOpen = true;
      state.selectionComposerSelectionId = editingItem && canEditSavedSelection_(editingItem)
        ? String(editingItem.id || '')
        : '';
      if (state.selectionComposerSelectionId && String(state.selectionDraftSourceId || '') !== state.selectionComposerSelectionId) {
        applySavedRegistrySelection_(state.selectionComposerSelectionId);
      }
      if (editingItem && state.selectionComposerSelectionId) {
        state.selectionEditDraftAutoSync = false;
        setRegistrySelectionEditDraftUins_(getEditableRegistrySelectionUins_(editingItem));
      } else {
        state.selectionEditDraftAutoSync = true;
        setRegistrySelectionEditDraftUins_(collectCurrentFilteredSelectionUins_());
      }
      state.savedSelectionPanelOpen = true;
      state.sidebarExpanded = true;
      state.sidebarActivePanel = 'projects';
      state.currentView = 'registry';
      compose.classList.remove('hidden');
      input.value = editingItem && state.selectionComposerSelectionId
        ? String(editingItem.name || '')
        : buildRegistrySelectionLabel_();
      setRegistrySelectionComposerScope_(
        state.selectionComposerSelectionId && editingItem
          ? String(editingItem.scope || 'personal')
          : 'personal'
      );
      syncRegistrySelectionComposerUi_();
      window.requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
      renderAll_();
    }

function closeRegistrySelectionComposer_() {
      const compose = el('selectionCompose');
      const input = el('selectionNameInput');
      if (compose) compose.classList.add('hidden');
      if (input) input.value = '';
      resetRegistrySelectionComposerTransientState_();
      state.selectionComposerOpen = false;
      state.selectionComposerSelectionId = '';
      clearRegistrySelectionEditDraft_();
      setRegistrySelectionComposerScope_('personal');
      syncRegistrySelectionComposerUi_();
      renderAll_();
    }

    function resetRegistrySelectionComposerTransientState_() {
      state.selectionComposerBusyState = '';
      clearPendingSharedRegistrySelectionSave_();
    }

    function isCurrentUserAdmin_() {
      const role = normalizeText_(state.currentUser && state.currentUser.role || '');
      const name = normalizeText_(state.currentUser && state.currentUser.name || '');
      return /admin|админ/.test(role) || /admin|админ/.test(name);
    }

    function normalizeAdminRegistrySelectedRows_(rawRows) {
      return Array.from(new Set(
        (Array.isArray(rawRows) ? rawRows : [])
          .map(value => Number(value))
          .filter(value => Number.isFinite(value) && value >= 0 && value < state.rows.length)
          .map(value => Math.floor(value))
      )).sort((a, b) => a - b);
    }

    function disableAdminRegistryEditMode_() {
      state.adminRegistryEditMode = false;
      state.adminRegistrySelectedRows = [];
      state.adminRegistryPendingAction = '';
      state.adminRegistryDialogOpen = false;
      state.adminRegistryDialogSaving = false;
      state.adminRegistryDialogError = '';
      state.adminRegistryFormValues = buildEmptyAdminRegistryFormValues_();
    }

    function syncAdminRegistryAccessState_() {
      if (isCurrentUserAdmin_()) {
        state.adminRegistrySelectedRows = normalizeAdminRegistrySelectedRows_(state.adminRegistrySelectedRows);
        if (!state.adminRegistryFormValues || typeof state.adminRegistryFormValues !== 'object') {
          state.adminRegistryFormValues = buildEmptyAdminRegistryFormValues_();
        }
        return;
      }
      disableAdminRegistryEditMode_();
    }

    function isAdminRegistryEditMode_() {
      return isCurrentUserAdmin_() && !!state.adminRegistryEditMode;
    }

    function getAdminRegistrySelectedRowIndexes_() {
      const normalized = normalizeAdminRegistrySelectedRows_(state.adminRegistrySelectedRows);
      state.adminRegistrySelectedRows = normalized;
      return normalized.slice();
    }

    function toggleAdminRegistryEditMode_() {
      syncAdminRegistryAccessState_();
      if (!isCurrentUserAdmin_()) return;
      if (state.adminRegistryPendingAction || state.adminRegistryDialogSaving || state.loading) return;
      const next = !state.adminRegistryEditMode;
      if (next && state.selectionComposerOpen) closeRegistrySelectionComposer_();
      if (!next) {
        disableAdminRegistryEditMode_();
      } else {
        state.adminRegistryEditMode = true;
        state.adminRegistrySelectedRows = [];
        state.currentView = 'registry';
      }
      renderAll_();
    }

    function toggleAdminRegistryRowSelection_(rowIndex) {
      if (!isAdminRegistryEditMode_()) return;
      const targetIndex = Number(rowIndex);
      if (!Number.isFinite(targetIndex) || targetIndex < 0 || targetIndex >= state.rows.length) return;
      const current = getAdminRegistrySelectedRowIndexes_();
      state.adminRegistrySelectedRows = current.includes(targetIndex)
        ? current.filter(value => value !== targetIndex)
        : current.concat(targetIndex);
      renderRegistryView_();
    }

    function updateAdminRegistryCreateField_(fieldId, value) {
      const key = String(fieldId || '').trim();
      if (!key) return;
      state.adminRegistryFormValues = {
        ...buildEmptyAdminRegistryFormValues_(),
        ...(state.adminRegistryFormValues || {}),
        [key]: String(value == null ? '' : value)
      };
      if (state.adminRegistryDialogError) state.adminRegistryDialogError = '';
    }

    function buildAdminRegistryCreatePayload_() {
      const source = state.adminRegistryFormValues || {};
      return ADMIN_REGISTRY_CREATE_FIELDS.reduce((acc, field) => {
        const key = String(field && field.fieldId || '').trim();
        acc[key] = String(source[key] == null ? '' : source[key]).trim();
        return acc;
      }, {});
    }

    function validateAdminRegistryCreatePayload_(payload) {
      if (!String(payload && payload.ro_1_3 || '').trim()) return 'Укажите УИН';
      if (!String(payload && payload.ro_1_4 || '').trim()) return 'Укажите Код ДС';
      if (!String(payload && payload.ro_1_5 || '').trim()) return 'Укажите наименование объекта';
      return '';
    }

    function openAdminRegistryCreateDialog_() {
      if (!isAdminRegistryEditMode_() || state.adminRegistryPendingAction || state.loading) return;
      state.adminRegistryDialogOpen = true;
      state.adminRegistryDialogSaving = false;
      state.adminRegistryDialogError = '';
      state.adminRegistryFormValues = buildEmptyAdminRegistryFormValues_();
      renderAll_();
      window.requestAnimationFrame(() => {
        const input = document.querySelector('[data-admin-registry-field-input="ro_1_3"]');
        if (input && typeof input.focus === 'function') input.focus();
      });
    }

    function closeAdminRegistryCreateDialog_() {
      if (state.adminRegistryDialogSaving) return;
      state.adminRegistryDialogOpen = false;
      state.adminRegistryDialogError = '';
      state.adminRegistryFormValues = buildEmptyAdminRegistryFormValues_();
      renderAll_();
    }

    async function submitAdminRegistryCreate_() {
      if (!isAdminRegistryEditMode_() || !state.adminRegistryDialogOpen || state.adminRegistryDialogSaving) return;
      const payload = buildAdminRegistryCreatePayload_();
      const validationError = validateAdminRegistryCreatePayload_(payload);
      if (validationError) {
        state.adminRegistryDialogError = validationError;
        renderAll_();
        return;
      }
      state.adminRegistryDialogSaving = true;
      state.adminRegistryDialogError = '';
      renderAll_();
      try {
        await runServer_('addSmartFilterShellRegistryRow', [{
          spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
          sheetName: state.runtimeOptions.sheetName || DEFAULT_SHEET_NAME,
          headerRow: state.runtimeOptions.headerRow || DEFAULT_HEADER_ROW,
          values: payload
        }]);
        state.adminRegistryDialogOpen = false;
        state.adminRegistryDialogSaving = false;
        state.adminRegistryDialogError = '';
        state.adminRegistryFormValues = buildEmptyAdminRegistryFormValues_();
        state.currentView = 'registry';
        renderAll_();
        showCopyToast_('Объект добавлен', false);
        await loadData_(buildCurrentDataRefreshOptions_({ preserveView: 'registry' }));
      } catch (err) {
        state.adminRegistryDialogSaving = false;
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return;
        }
        state.adminRegistryDialogError = err && err.message ? err.message : String(err);
        renderAll_();
      }
    }

    async function deleteSelectedAdminRegistryRows_() {
      if (!isAdminRegistryEditMode_() || state.adminRegistryPendingAction || state.loading) return;
      const rowIndexes = getAdminRegistrySelectedRowIndexes_();
      if (!rowIndexes.length) return;
      const hasPendingEdits = hasPendingObjectEdits_();
      const confirmed = window.confirm(
        `Удалить выбранные строки (${rowIndexes.length})?` +
        (hasPendingEdits ? '\n\nЕсть несохраненные изменения в карточке объекта. Они будут потеряны.' : '')
      );
      if (!confirmed) return;
      state.adminRegistryPendingAction = 'delete';
      renderRegistryView_();
      try {
        const result = await runServer_('deleteSmartFilterShellRegistryRows', [{
          spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
          sheetName: state.runtimeOptions.sheetName || DEFAULT_SHEET_NAME,
          headerRow: state.runtimeOptions.headerRow || DEFAULT_HEADER_ROW,
          rowIndexes
        }]);
        const deletedRows = Number(result && result.deletedRows) || 0;
        clearAllObjectEditingState_();
        state.selectedRowIndex = -1;
        state.currentView = 'registry';
        state.adminRegistrySelectedRows = [];
        showCopyToast_(deletedRows ? `Удалено строк: ${deletedRows}` : 'Строки не найдены', false);
        await loadData_(buildCurrentDataRefreshOptions_({
          preserveView: 'registry',
          preserveSelectedRowIndex: -1
        }));
      } catch (err) {
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return;
        }
        showCopyToast_('Не удалось удалить строки', true);
        reportRuntimeError_(err, 'Ошибка удаления строк реестра');
      } finally {
        state.adminRegistryPendingAction = '';
        renderRegistryView_();
      }
    }

function normalizeRegistrySelectionScope_(scope) {
      const mode = String(scope || 'personal').trim().toLowerCase();
      if (mode === 'division') return 'division';
      if (mode === 'shared') return 'shared';
      return 'personal';
    }

function buildDefaultSavedSelectionGroupsOpen_() {
      return {
        personal: true,
        division: true,
        shared: true
      };
    }

function normalizeSavedSelectionGroupsOpen_(rawValue) {
      const source = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? rawValue
        : {};
      const defaults = buildDefaultSavedSelectionGroupsOpen_();
      return {
        personal: source.personal === undefined ? defaults.personal : !!source.personal,
        division: source.division === undefined ? defaults.division : !!source.division,
        shared: source.shared === undefined ? defaults.shared : !!source.shared
      };
    }

function normalizeSavedSelectionExpandedById_(rawValue) {
      const source = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? rawValue
        : {};
      const out = {};
      Object.keys(source).forEach(key => {
        const normalizedKey = String(key || '').trim();
        if (!normalizedKey) return;
        out[normalizedKey] = !!source[key];
      });
      return out;
    }

function isSavedSelectionGroupOpen_(groupKey) {
      const key = normalizeRegistrySelectionScope_(groupKey);
      const groups = normalizeSavedSelectionGroupsOpen_(state.savedSelectionGroupsOpen);
      state.savedSelectionGroupsOpen = groups;
      return !!groups[key];
    }

function isSavedSelectionExpanded_(selectionId) {
      const key = String(selectionId || '').trim();
      if (!key) return false;
      const map = normalizeSavedSelectionExpandedById_(state.savedSelectionExpandedById);
      state.savedSelectionExpandedById = map;
      return !!map[key];
    }

function getCurrentUserDivisionLabel_() {
      return String(state.currentUser && state.currentUser.division || '').trim();
    }

function canUseDivisionRegistrySelectionScope_() {
      return !!getCurrentUserDivisionLabel_();
    }

function getRegistrySelectionScopeChipLabel_(scope) {
      const mode = normalizeRegistrySelectionScope_(scope);
      if (mode === 'division') return 'Блок';
      if (mode === 'shared') return 'Общая';
      return 'Личная';
    }

function getRegistrySelectionScopeTitle_(scope) {
      const mode = normalizeRegistrySelectionScope_(scope);
      if (mode === 'division') {
        const divisionLabel = getCurrentUserDivisionLabel_();
        return divisionLabel ? `Блок: ${divisionLabel}` : 'Проект блока';
      }
      return mode === 'shared' ? 'Общий проект' : 'Личный проект';
    }

function getCollaborativeSelectionDivisionMessage_(selection) {
      return isDivisionRegistrySelection_(selection)
        ? 'Для проекта блока укажите блок'
        : 'Для общего проекта укажите блок';
    }

function buildSavedSelectionsPanelSummary_() {
      const allSelections = getAllSavedRegistrySelections_();
      if (!allSelections.length) return 'Пока нет сохраненных проектов.';
      const personalCount = allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'personal').length;
      const divisionCount = allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'division').length;
      const sharedCount = allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'shared').length;
      const parts = [];
      if (personalCount) parts.push(`мои ${personalCount}`);
      if (divisionCount) parts.push(`блок ${divisionCount}`);
      if (sharedCount) parts.push(`общие ${sharedCount}`);
      return parts.join(' · ') || `${allSelections.length} проектов`;
    }

function syncSavedSelectionsPanelChrome_() {
      const panelBody = el('savedSelectionPanelBody');
      const summaryNode = el('savedSelectionPanelSummary');
      const composerToggleButton = el('btnOpenSelectionComposer');
      const panelActions = el('projectPanelGlobalActions');
      const editButton = el('btnEditActiveSelection');
      const removeButton = el('btnRemoveActiveSelection');
      const isComposerBusy = !!String(state.selectionComposerBusyState || '').trim();
      const allSelections = getAllSavedRegistrySelections_();
      const activeSelection = getActiveRegistrySelection_();
      const activeSelectionId = String(activeSelection && activeSelection.id || '').trim();
      const selectionLoadingId = String(state.selectionLoadingId || '').trim();
      const selectionRemovingId = String(state.selectionRemovingId || '').trim();
      const hasAnySelections = allSelections.length > 0;

      if (panelBody) panelBody.classList.remove('hidden');
      if (summaryNode) summaryNode.textContent = '';
      if (composerToggleButton) {
        composerToggleButton.disabled = isComposerBusy;
        composerToggleButton.classList.toggle('is-active', !!state.selectionComposerOpen);
        composerToggleButton.textContent = 'Новый проект';
        composerToggleButton.title = state.selectionComposerOpen ? 'Скрыть форму проекта' : 'Новый проект';
        composerToggleButton.setAttribute('aria-label', composerToggleButton.title);
      }
      if (panelActions) panelActions.classList.toggle('hidden', !hasAnySelections);
      if (editButton) {
        editButton.disabled = isComposerBusy || (selectionLoadingId === activeSelectionId && !!activeSelectionId);
        editButton.classList.toggle('is-loading', selectionLoadingId === activeSelectionId && !!activeSelectionId);
        editButton.title = activeSelection
          ? 'Редактировать открытый проект'
          : 'Выберите проект из списка для редактирования';
        editButton.setAttribute('aria-label', editButton.title);
      }
      if (removeButton) {
        removeButton.disabled = isComposerBusy || (selectionRemovingId === activeSelectionId && !!activeSelectionId);
        removeButton.classList.toggle('is-loading', selectionRemovingId === activeSelectionId && !!activeSelectionId);
        removeButton.title = activeSelection
          ? 'Удалить открытый проект'
          : 'Выберите проект из списка для удаления';
        removeButton.setAttribute('aria-label', removeButton.title);
      }
    }

function toggleSavedSelectionsPanel_() {
      state.savedSelectionPanelOpen = !state.savedSelectionPanelOpen;
      persistRegistrySessionState_();
      renderSavedSelectionsPanel_();
    }

function toggleSavedSelectionGroup_(groupKey, triggerNode) {
      const key = normalizeRegistrySelectionScope_(groupKey);
      const groups = normalizeSavedSelectionGroupsOpen_(state.savedSelectionGroupsOpen);
      groups[key] = !groups[key];
      state.savedSelectionGroupsOpen = groups;
      persistRegistrySessionState_();
      const nextOpen = !!groups[key];
      const toggleNode = triggerNode && typeof triggerNode.setAttribute === 'function'
        ? triggerNode
        : null;
      const groupNode = toggleNode && typeof toggleNode.closest === 'function'
        ? toggleNode.closest('.saved-selection-group')
        : null;
      const stackNode = groupNode ? groupNode.querySelector('.saved-selection-stack') : null;
      if (toggleNode) toggleNode.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      if (stackNode) {
        stackNode.classList.toggle('hidden', !nextOpen);
        return;
      }
      renderSavedSelectionsPanel_();
    }

function toggleSavedSelectionExpanded_(selectionId, nextValue) {
      const key = String(selectionId || '').trim();
      if (!key) return;
      const map = normalizeSavedSelectionExpandedById_(state.savedSelectionExpandedById);
      if (nextValue === undefined) {
        map[key] = !map[key];
      } else {
        map[key] = !!nextValue;
      }
      state.savedSelectionExpandedById = map;
      persistRegistrySessionState_();
      renderSavedSelectionsPanel_();
    }

function toggleRegistrySelectionComposer_() {
      if (state.selectionComposerOpen) {
        closeRegistrySelectionComposer_();
        return;
      }
      openRegistrySelectionComposer_();
    }

function setRegistrySelectionComposerScope_(scope) {
      const requestedMode = normalizeRegistrySelectionScope_(scope);
      const mode = (requestedMode === 'division' && !canUseDivisionRegistrySelectionScope_())
        ? 'personal'
        : requestedMode;
      el('btnSelectionScopePersonal').classList.toggle('active', mode === 'personal');
      el('btnSelectionScopeDivision').classList.toggle('active', mode === 'division');
      el('btnSelectionScopeShared').classList.toggle('active', mode === 'shared');
      syncRegistrySelectionComposerUi_();
    }

function getRegistrySelectionComposerScope_() {
      if (el('btnSelectionScopeDivision').classList.contains('active')) return 'division';
      return el('btnSelectionScopeShared').classList.contains('active') ? 'shared' : 'personal';
    }

function setRegistrySelectionComposerBusyState_(value) {
      state.selectionComposerBusyState = String(value || '').trim();
      if (state.selectionComposerOpen) syncRegistrySelectionComposerUi_();
    }

function formatRegistrySelectionObjectCount_(count) {
      const value = Math.max(0, Number(count) || 0);
      const mod10 = value % 10;
      const mod100 = value % 100;
      const label = mod10 === 1 && mod100 !== 11
        ? 'объект'
        : (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'объекта' : 'объектов');
      return `${value} ${label}`;
    }

function buildRegistrySelectionComposerSummary_() {
      const editingId = String(state.selectionComposerSelectionId || '').trim();
      const isEditing = !!editingId;
      const scope = getRegistrySelectionComposerScope_();
      const busyState = String(state.selectionComposerBusyState || '').trim();
      const objectCount = Array.isArray(state.selectionEditDraftUins) ? state.selectionEditDraftUins.length : 0;
      const scopeLabel = getRegistrySelectionScopeChipLabel_(scope).toLowerCase();
      const title = isEditing ? 'Редактирование проекта' : 'Новый проект';
      const compactMeta = [objectCount ? String(objectCount) : '0', scopeLabel].join(' · ');
      if (scope === 'division' && !canUseDivisionRegistrySelectionScope_()) {
        return {
          title,
          subtitle: 'Для режима "Блок" у пользователя должен быть указан блок.',
          meta: compactMeta
        };
      }
      if (busyState === 'checking') {
        return {
          title,
          subtitle: 'Проверяем сохранение…',
          meta: compactMeta
        };
      }
      if (busyState === 'saving') {
        return {
          title,
          subtitle: 'Сохраняем выборку…',
          meta: compactMeta
        };
      }
      return {
        title,
        subtitle: compactMeta,
        meta: compactMeta
      };
    }

function collectCurrentFilteredSelectionUins_() {
      const seen = new Set();
      const items = [];
      (Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes : []).forEach(rowIndex => {
        const text = String(getRegistrySummaryValue_(rowIndex, 'uin') || '').trim();
        const norm = normalizeText_(text);
        if (!text || !norm || seen.has(norm)) return;
        seen.add(norm);
        items.push(text);
      });
      return items;
    }

function mergeRegistrySelectionUins_(baseItems, extraItems) {
      const seen = new Set();
      const out = [];
      [baseItems, extraItems].forEach(list => {
        (Array.isArray(list) ? list : []).forEach(value => {
          const text = String(value || '').trim();
          const norm = normalizeText_(text);
          if (!text || !norm || seen.has(norm)) return;
          seen.add(norm);
          out.push(text);
        });
      });
      return out;
    }

function buildRegistrySelectionBulkUinText_(items) {
      return mergeRegistrySelectionUins_(items, []).join('\n');
    }

function buildCurrentRegistrySelectionSnapshot_(name, options) {
      const mode = options && options.mode === 'append' ? 'append' : 'replace';
      const existingItem = options && options.existingItem ? options.existingItem : null;
      const scope = normalizeRegistrySelectionScope_(
        options && options.scope
          ? options.scope
          : (existingItem && existingItem.scope ? existingItem.scope : getRegistrySelectionComposerScope_())
      );
      const explicitUins = Array.isArray(options && options.explicitUins)
        ? mergeRegistrySelectionUins_(options.explicitUins, [])
        : [];
      const currentUins = explicitUins.length ? explicitUins : collectCurrentFilteredSelectionUins_();
      const baseUins = explicitUins.length
        ? []
        : (mode === 'append' && existingItem
          ? parseRegistryBulkUinText_(existingItem.bulkUinText)
          : []);
      const selectionUins = explicitUins.length
        ? currentUins
        : mergeRegistrySelectionUins_(baseUins, currentUins);
      return {
        scope,
        name: String(name || '').trim(),
        meta: (
          explicitUins.length
            ? [selectionUins.length ? `Объектов: ${selectionUins.length}` : '']
            : [
                selectionUins.length ? `Объектов: ${selectionUins.length}` : '',
                state.objectQuery ? `поиск: ${state.objectQuery}` : '',
                ...REGISTRY_FILTER_DEFS.map(def => (
                  formatRegistryFacetMeta_(def, state.registryFacetFilters[def.key])
                ))
              ]
        ).filter(Boolean).join(' · ') || 'Без дополнительных фильтров',
        objectQuery: '',
        bulkUinText: buildRegistrySelectionBulkUinText_(selectionUins),
        registryFacetFilters: buildEmptyRegistryFacetFilters_()
      };
    }

function buildComparableRegistryFacetFiltersSignature_(rawFilters) {
      const normalized = normalizeStoredRegistryFacetFilters_(rawFilters || {});
      return REGISTRY_FILTER_DEFS.map(def => {
        const value = normalized[def.key];
        if (value === null) return `${def.key}:*`;
        if (isMonitoringDateFacetDef_(def)) {
          const current = normalizeMonitoringDateFacetFilter_(value);
          return Array.isArray(current) && current.length
            ? `${def.key}:${current.map(item => normalizeText_(item)).filter(Boolean).sort().join('\u0001')}`
            : `${def.key}:*`;
        }
        if (isNumberRangeFacetDef_(def)) {
          const current = normalizeNumberRangeFacetFilter_(value);
          return current
            ? `${def.key}:${formatNumberRangeFacetBoundary_(current.min)}:${formatNumberRangeFacetBoundary_(current.max)}`
            : `${def.key}:*`;
        }
        if (isDateRangeFacetDef_(def)) {
          const current = normalizeDateRangeFacetFilter_(value);
          return current
            ? `${def.key}:${String(current.from || '')}:${String(current.to || '')}`
            : `${def.key}:*`;
        }
        if (!Array.isArray(value) || !value.length) return `${def.key}:__empty__`;
        return `${def.key}:${value.map(item => normalizeText_(item)).filter(Boolean).sort().join('\u0001')}`;
      }).join('\u0002');
    }

function buildComparableRegistrySelectionSignature_(source) {
      const item = source || {};
      return [
        tokenize_(item.objectQuery).join('\u0001'),
        parseRegistryBulkUinText_(item.bulkUinText).map(value => normalizeText_(value)).sort().join('\u0001'),
        buildComparableRegistryFacetFiltersSignature_(item.registryFacetFilters)
      ].join('\u0003');
    }

function waitMs_(delayMs) {
      return new Promise(resolve => {
        window.setTimeout(resolve, Math.max(0, Number(delayMs) || 0));
      });
    }

function isAppsScriptApiTimeoutError_(error) {
      const message = normalizeText_(
        error && error.message ? error.message : (error && error.error ? error.error : String(error || ''))
      );
      return /таймаут запроса к apps script api|timeout/.test(message);
    }

function reloadSharedRegistrySelectionsFromServer_(options) {
      const settings = options || {};
      return runServer_('getSmartFilterShellSharedSelections', [{
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID
      }])
        .then(result => {
          const items = normalizeSharedRegistrySelections_(result);
          state.sharedRegistrySelections = items;
          if (!settings.skipRender) renderSavedSelectionsPanel_();
          return items;
        })
        .catch(error => {
          if (settings.ignoreErrors) return state.sharedRegistrySelections.slice();
          throw error;
        });
    }

function beginPendingSharedRegistrySelectionSave_(payload, editingItem, beforeIds) {
      const token = `shared_save_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      state.pendingSharedSelectionSave = {
        token,
        payload: payload && typeof payload === 'object' ? { ...payload } : {},
        editingSelectionId: String(editingItem && editingItem.id || '').trim(),
        beforeIds: Array.from(beforeIds instanceof Set ? beforeIds : new Set(
          (Array.isArray(beforeIds) ? beforeIds : []).map(value => String(value || '').trim()).filter(Boolean)
        ))
      };
      return token;
    }

function isPendingSharedRegistrySelectionSaveActive_(token) {
      return !!token && !!state.pendingSharedSelectionSave && String(state.pendingSharedSelectionSave.token || '') === String(token || '');
    }

function clearPendingSharedRegistrySelectionSave_(token) {
      if (!token) {
        state.pendingSharedSelectionSave = null;
        return;
      }
      if (isPendingSharedRegistrySelectionSaveActive_(token)) {
        state.pendingSharedSelectionSave = null;
      }
    }

function updatePendingSharedRegistrySelectionSavePayload_(token, payload) {
      if (!isPendingSharedRegistrySelectionSaveActive_(token)) return;
      state.pendingSharedSelectionSave.payload = payload && typeof payload === 'object'
        ? { ...payload }
        : {};
    }

function finalizePendingSharedRegistrySelectionSave_(token, rawItem) {
      if (!isPendingSharedRegistrySelectionSaveActive_(token)) return null;
      clearPendingSharedRegistrySelectionSave_(token);
      return finalizeSharedRegistrySelectionSave_(rawItem);
    }

function maybeFinalizePendingSharedRegistrySelectionSaveFromState_() {
      const pending = state.pendingSharedSelectionSave;
      if (!pending) return false;
      const matched = findMatchingSharedRegistrySelectionAfterSave_(
        state.sharedRegistrySelections,
        pending.payload,
        pending.editingSelectionId ? { id: pending.editingSelectionId } : null,
        { beforeIds: pending.beforeIds }
      );
      if (!matched) return false;
      return !!finalizePendingSharedRegistrySelectionSave_(pending.token, matched);
    }

function findMatchingSharedRegistrySelectionAfterSave_(items, payload, editingItem, options) {
      const list = Array.isArray(items) ? items : [];
      const settings = options || {};
      const beforeIds = settings.beforeIds instanceof Set
        ? settings.beforeIds
        : new Set((Array.isArray(settings.beforeIds) ? settings.beforeIds : []).map(value => String(value || '').trim()).filter(Boolean));
      const editingId = String(editingItem && editingItem.id || '').trim();
      const targetScope = normalizeRegistrySelectionScope_(
        payload && payload.scope
          ? payload.scope
          : (editingItem && editingItem.scope ? editingItem.scope : 'shared')
      );
      if (editingId) {
        return list.find(item => (
          String(item && item.id || '').trim() === editingId &&
          normalizeRegistrySelectionScope_(item && item.scope) === targetScope
        )) || null;
      }
      const targetName = normalizeText_(payload && payload.name || '');
      const targetSignature = buildComparableRegistrySelectionSignature_(payload || {});
      const currentUserName = normalizeText_(state.currentUser && state.currentUser.name || '');
      const currentDivisionName = normalizeText_(getCurrentUserDivisionLabel_());
      const currentOwnerName = targetScope === 'division' ? currentDivisionName : currentUserName;
      const sortByRecent_ = (a, b) => {
        const timeA = Date.parse(a && (a.updatedAt || a.createdAt) || '') || 0;
        const timeB = Date.parse(b && (b.updatedAt || b.createdAt) || '') || 0;
        return timeB - timeA;
      };
      const nameMatches = list
        .filter(item => normalizeRegistrySelectionScope_(item && item.scope) === targetScope)
        .filter(item => normalizeText_(item && item.name || '') === targetName)
        .sort(sortByRecent_);
      const ownedNameMatches = currentOwnerName
        ? nameMatches.filter(item => {
            const ownerName = normalizeText_(item && item.ownerName || '');
            return !ownerName || ownerName === currentOwnerName;
          })
        : nameMatches.slice();
      const exactOwned = ownedNameMatches.find(item => buildComparableRegistrySelectionSignature_(item) === targetSignature);
      if (exactOwned) return exactOwned;
      const exactAny = nameMatches.find(item => buildComparableRegistrySelectionSignature_(item) === targetSignature);
      if (exactAny) return exactAny;

      const freshOwned = ownedNameMatches.filter(item => !beforeIds.has(String(item && item.id || '').trim()));
      if (freshOwned.length === 1) return freshOwned[0];
      if (!freshOwned.length && ownedNameMatches.length === 1) return ownedNameMatches[0];

      const freshAny = nameMatches.filter(item => !beforeIds.has(String(item && item.id || '').trim()));
      if (freshAny.length === 1) return freshAny[0];
      return null;
    }

    async function reconcileSharedRegistrySelectionSaveAfterError_(error, payload, editingItem, options) {
      if (!isAppsScriptApiTimeoutError_(error)) return null;
      for (let attempt = 0; attempt < SHARED_SELECTION_RECONCILE_DELAYS_MS.length; attempt++) {
        if (attempt > 0) await waitMs_(SHARED_SELECTION_RECONCILE_DELAYS_MS[attempt]);
        const items = await reloadSharedRegistrySelectionsFromServer_({ skipRender: true, ignoreErrors: true });
        const matched = findMatchingSharedRegistrySelectionAfterSave_(items, payload, editingItem, options);
        if (matched) return matched;
      }
      return null;
    }

    async function reconcileSharedRegistrySelectionDeleteAfterError_(error, item) {
      if (!isAppsScriptApiTimeoutError_(error)) return false;
      const targetId = String(item && item.id || '').trim();
      if (!targetId) return false;
      for (let attempt = 0; attempt < SHARED_SELECTION_RECONCILE_DELAYS_MS.length; attempt++) {
        if (attempt > 0) await waitMs_(SHARED_SELECTION_RECONCILE_DELAYS_MS[attempt]);
        const items = await reloadSharedRegistrySelectionsFromServer_({ skipRender: true, ignoreErrors: true });
        const stillExists = items.some(entry => String(entry && entry.id || '').trim() === targetId);
        if (!stillExists) return true;
      }
      return false;
    }

function finalizeSharedRegistrySelectionSave_(rawItem) {
      const item = normalizeSavedRegistrySelectionItem_(rawItem, 'shared');
      if (!item) return null;
      state.sharedRegistrySelections = upsertSharedRegistrySelection_(item);
      clearRuntimeError_();
      closeRegistrySelectionComposer_();
      applySavedRegistrySelection_(item.id);
      return item;
    }

function deleteCollaborativeRegistrySelectionFromServer_(item) {
      if (!item || !isCollaborativeRegistrySelection_(item)) return Promise.resolve(false);
      return runServer_('deleteSmartFilterShellSharedSelection', [{
        selectionId: item.id,
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID
      }])
        .then(() => {
          clearRuntimeError_();
          return true;
        })
        .catch(err => {
          if (isUnauthorizedError_(err)) {
            handleUnauthorized_();
            return false;
          }
          return reconcileSharedRegistrySelectionDeleteAfterError_(err, item)
            .then(removed => {
              if (removed) {
                clearRuntimeError_();
                return true;
              }
              reportRuntimeError_(err, 'Ошибка выборки');
              return false;
            });
        });
    }

function removeSavedRegistrySelectionLocally_(item) {
      const target = item && typeof item === 'object'
        ? item
        : findSavedRegistrySelectionById_(item);
      if (!target) return false;
      const targetId = String(target.id || '').trim();
      if (!targetId) return false;
      if (state.activeRegistrySelectionId === targetId) clearActiveRegistrySelectionState_();
      if (String(state.selectionDraftSourceId || '') === targetId) state.selectionDraftSourceId = '';
      if (String(state.selectionComposerSelectionId || '') === targetId) closeRegistrySelectionComposer_();
      clearSelectionDoneState_(targetId);
      if (isCollaborativeRegistrySelection_(target)) {
        state.sharedRegistrySelections = state.sharedRegistrySelections.filter(entry => String(entry && entry.id || '').trim() !== targetId);
      } else {
        state.personalRegistrySelections = state.personalRegistrySelections.filter(entry => String(entry && entry.id || '').trim() !== targetId);
        persistPersonalRegistrySelections_();
      }
      persistRegistrySessionState_();
      return true;
    }

function runRegistrySelectionScopeTransitionSaveFlow_(payload, editingItem, input) {
      const sourceIsCollaborative = isCollaborativeRegistrySelection_(editingItem);
      const targetIsCollaborative = isCollaborativeRegistrySelectionScope_(payload && payload.scope);
      if (!editingItem || sourceIsCollaborative === targetIsCollaborative) {
        if (targetIsCollaborative) {
          return runSharedRegistrySelectionSaveFlow_(payload, editingItem, input).then(async item => {
            if (
              item &&
              editingItem &&
              sourceIsCollaborative &&
              String(item.id || '').trim() &&
              String(editingItem.id || '').trim() &&
              String(item.id || '').trim() !== String(editingItem.id || '').trim()
            ) {
              const removed = await deleteCollaborativeRegistrySelectionFromServer_(editingItem);
              if (removed) {
                removeSavedRegistrySelectionLocally_(editingItem);
                renderAll_();
              }
            }
            return item;
          });
        }
        const item = upsertPersonalRegistrySelection_(payload, editingItem ? editingItem.id : '');
        closeRegistrySelectionComposer_();
        applySavedRegistrySelection_(item.id);
        syncRegistrySelectionComposerUi_();
        return Promise.resolve(item);
      }

      if (!sourceIsCollaborative && targetIsCollaborative) {
        return runSharedRegistrySelectionSaveFlow_(payload, null, input).then(item => {
          if (!item) return null;
          removeSavedRegistrySelectionLocally_(editingItem);
          renderAll_();
          return item;
        });
      }

      return deleteCollaborativeRegistrySelectionFromServer_(editingItem).then(removed => {
        if (!removed) {
          if (input) input.focus();
          return null;
        }
        removeSavedRegistrySelectionLocally_(editingItem);
        const item = upsertPersonalRegistrySelection_(payload, '');
        closeRegistrySelectionComposer_();
        applySavedRegistrySelection_(item.id);
        syncRegistrySelectionComposerUi_();
        return item;
      });
    }

function matchesCurrentRegistrySelectionState_(item) {
      const editingId = String(state.selectionComposerSelectionId || '').trim();
      const itemId = String(item && item.id || '').trim();
      if (editingId && itemId && editingId === itemId) {
        return buildComparableRegistrySelectionSignature_({
          objectQuery: '',
          bulkUinText: buildRegistrySelectionBulkUinText_(state.selectionEditDraftUins),
          registryFacetFilters: buildEmptyRegistryFacetFilters_()
        }) === buildComparableRegistrySelectionSignature_(item);
      }
      return buildComparableRegistrySelectionSignature_({
        objectQuery: state.objectQuery,
        bulkUinText: state.bulkUinText,
        registryFacetFilters: state.registryFacetFilters
      }) === buildComparableRegistrySelectionSignature_(item);
    }

function getRegistrySelectionDraftSource_() {
      const key = String(state.selectionDraftSourceId || '').trim();
      if (!key) return null;
      return findSavedRegistrySelectionById_(key);
    }

function syncRegistrySelectionMatchState_() {
      const active = getActiveRegistrySelection_();
      if (active) state.selectionDraftSourceId = active.id;
      const draftSource = active || getRegistrySelectionDraftSource_();
      if (!draftSource) {
        state.activeRegistrySelectionId = '';
        return;
      }
      if (matchesCurrentRegistrySelectionState_(draftSource)) {
        state.activeRegistrySelectionId = draftSource.id;
        state.selectionDraftSourceId = draftSource.id;
        return;
      }
      state.activeRegistrySelectionId = '';
      state.selectionDraftSourceId = draftSource.id;
    }

function hasRegistrySelectionDraftChanges_(selectionId) {
      const key = String(selectionId || '').trim();
      if (!key || key !== String(state.selectionDraftSourceId || '').trim()) return false;
      const item = findSavedRegistrySelectionById_(key);
      return !!item && !matchesCurrentRegistrySelectionState_(item);
    }

function hasStoredRegistrySelectionBulkSet_(item) {
      return parseRegistryBulkUinText_(item && item.bulkUinText).length > 0;
    }

function runSharedRegistrySelectionSaveFlow_(payload, editingItem, input) {
      const sharedSelectionIdsBeforeSave = new Set(
        state.sharedRegistrySelections.map(item => String(item && item.id || '').trim()).filter(Boolean)
      );
      const sharedSaveToken = beginPendingSharedRegistrySelectionSave_(
        payload,
        editingItem,
        sharedSelectionIdsBeforeSave
      );
      updatePendingSharedRegistrySelectionSavePayload_(sharedSaveToken, payload);

      return runServer_('saveSmartFilterShellSharedSelection', [{
        ...payload,
        selectionId: editingItem ? editingItem.id : '',
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID
      }])
        .then(result => finalizePendingSharedRegistrySelectionSave_(sharedSaveToken, result && result.item))
        .catch(err => {
          if (!isPendingSharedRegistrySelectionSaveActive_(sharedSaveToken)) return null;
          if (isUnauthorizedError_(err)) {
            clearPendingSharedRegistrySelectionSave_(sharedSaveToken);
            handleUnauthorized_();
            return null;
          }
          if (isAppsScriptApiTimeoutError_(err)) setRegistrySelectionComposerBusyState_('checking');
          return reconcileSharedRegistrySelectionSaveAfterError_(err, payload, editingItem, {
            beforeIds: sharedSelectionIdsBeforeSave
          })
            .then(item => {
              if (!isPendingSharedRegistrySelectionSaveActive_(sharedSaveToken)) return null;
              if (item) return finalizePendingSharedRegistrySelectionSave_(sharedSaveToken, item);
              reportRuntimeError_(err, 'Ошибка выборки');
              if (input) input.focus();
              return null;
            });
        })
        .finally(() => {
          clearPendingSharedRegistrySelectionSave_(sharedSaveToken);
          setRegistrySelectionComposerBusyState_('');
          syncRegistrySelectionComposerUi_();
        });
    }

function saveCurrentRegistrySelection_(mode) {
      const input = el('selectionNameInput');
      const editingItem = findSavedRegistrySelectionById_(state.selectionComposerSelectionId);
      const scope = normalizeRegistrySelectionScope_(getRegistrySelectionComposerScope_());
      const name = String(input && input.value || buildRegistrySelectionLabel_()).trim();
      const saveMode = mode === 'append' ? 'append' : 'replace';
      if (!name) {
        if (input) input.focus();
        return Promise.resolve(null);
      }
      if (scope === 'division' && !canUseDivisionRegistrySelectionScope_()) {
        reportRuntimeError_('У пользователя не указан блок. Сохранить такую выборку сейчас нельзя.', 'Выборка');
        return Promise.resolve(null);
      }

      const payload = buildCurrentRegistrySelectionSnapshot_(name, {
        mode: saveMode,
        existingItem: editingItem,
        scope,
        explicitUins: isRegistrySelectionEditing_() ? state.selectionEditDraftUins : null
      });
      const objectCount = parseRegistryBulkUinText_(payload.bulkUinText).length;
      if (!objectCount) {
        reportRuntimeError_(
          saveMode === 'append'
            ? 'Нет объектов для добавления в выборку.'
            : 'Нет объектов для сохранения в выборку.',
          'Выборка'
        );
        if (input) input.focus();
        return Promise.resolve(null);
      }
      clearRuntimeError_();
      setRegistrySelectionComposerBusyState_('saving');
      return runRegistrySelectionScopeTransitionSaveFlow_(payload, editingItem, input);
    }

function buildRegistrySelectionLabel_() {
      return `Выборка ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }

function getAllSavedRegistrySelections_() {
      return state.personalRegistrySelections.concat(state.sharedRegistrySelections);
    }

function findSavedRegistrySelectionById_(id) {
      const key = String(id || '').trim();
      if (!key) return null;
      return getAllSavedRegistrySelections_().find(item => item.id === key) || null;
    }

function upsertPersonalRegistrySelection_(payload, selectionId) {
      const nowIso = new Date().toISOString();
      const nameKey = normalizeText_(payload && payload.name || '');
      const existingId = String(selectionId || '').trim();
      const existing = state.personalRegistrySelections.find(item => (
        (existingId && String(item && item.id || '') === existingId) ||
        (!existingId && normalizeText_(item && item.name || '') === nameKey)
      ));
      const item = normalizeSavedRegistrySelectionItem_({
        ...(existing || {}),
        ...(payload || {}),
        id: existing && existing.id ? existing.id : (existingId || `personal_${Date.now()}_${Math.floor(Math.random() * 100000)}`),
        scope: 'personal',
        createdAt: existing && existing.createdAt ? existing.createdAt : nowIso,
        updatedAt: nowIso
      }, 'personal');
      state.personalRegistrySelections = [item]
        .concat(state.personalRegistrySelections.filter(entry => entry.id !== item.id))
        .slice(0, 24);
      persistPersonalRegistrySelections_();
      return item;
    }

function upsertSharedRegistrySelection_(item) {
      const normalized = normalizeSavedRegistrySelectionItem_(item, 'shared');
      if (!normalized) return state.sharedRegistrySelections.slice();
      return [normalized].concat(state.sharedRegistrySelections.filter(entry => entry.id !== normalized.id));
    }

function applySavedRegistrySelection_(id) {
      const item = findSavedRegistrySelectionById_(id);
      if (!item) return Promise.resolve(null);
      const selectionId = String(item.id || '').trim();
      if (!selectionId) return Promise.resolve(null);
      if (String(state.selectionLoadingId || '') === selectionId) return Promise.resolve(item);
      state.selectionLoadingId = selectionId;
      renderSavedSelectionsPanel_();
      if (state.selectionComposerOpen && String(state.selectionComposerSelectionId || '') !== String(item.id || '')) {
        closeRegistrySelectionComposer_();
      }
      state.currentView = 'registry';
      state.activeRegistrySelectionId = item.id;
      state.selectionDraftSourceId = item.id;
      if (hasStoredRegistrySelectionBulkSet_(item)) {
        state.objectQuery = '';
        state.bulkUinText = String(item.bulkUinText || '');
        state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      } else {
        state.objectQuery = String(item.objectQuery || '');
        state.bulkUinText = String(item.bulkUinText || '');
        state.registryFacetFilters = normalizeStoredRegistryFacetFilters_(item.registryFacetFilters || {});
      }
      state.registryBulkDraftText = null;
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      el('registrySearchInput').value = state.objectQuery;
      syncRegistryBulkUinUi_();
      applyObjectFilters_();
      ensureObjectSelection_();
      persistRegistrySessionState_();
      return refreshActiveSharedSelectionWorkState_({ silent: true, skipRender: true })
        .then(() => item)
        .finally(() => {
          if (String(state.selectionLoadingId || '') === selectionId) state.selectionLoadingId = '';
          renderAll_();
        });
    }

function removeSavedRegistrySelection_(id) {
      const item = findSavedRegistrySelectionById_(id);
      if (!item) return Promise.resolve(false);
      if (!canRemoveSavedSelection_(item)) return Promise.resolve(false);
      if (!window.confirm(`Удалить выборку "${item.name || 'без названия'}"?`)) {
        return Promise.resolve(false);
      }
      clearRuntimeError_();
      state.selectionRemovingId = String(item.id || '').trim();
      renderSavedSelectionsPanel_();

      const finalizeRemoval = () => {
        removeSavedRegistrySelectionLocally_(item);
        renderAll_();
        return true;
      };

      if (isCollaborativeRegistrySelection_(item)) {
        return deleteCollaborativeRegistrySelectionFromServer_(item)
          .then(removed => (removed ? finalizeRemoval() : false))
          .finally(() => {
            if (String(state.selectionRemovingId || '') === String(item.id || '')) {
              state.selectionRemovingId = '';
            }
            renderSavedSelectionsPanel_();
          });
      }

      return Promise.resolve(finalizeRemoval()).finally(() => {
        if (String(state.selectionRemovingId || '') === String(item.id || '')) {
          state.selectionRemovingId = '';
        }
        renderSavedSelectionsPanel_();
      });
    }

function normalizeSharedRegistrySelections_(raw) {
      const list = Array.isArray(raw) ? raw : [];
      return list
        .map(item => normalizeSavedRegistrySelectionItem_(item, 'shared'))
        .filter(Boolean)
        .sort(compareSavedRegistrySelections_);
    }

function normalizeSavedRegistrySelectionItem_(rawItem, fallbackScope) {
      if (!rawItem || typeof rawItem !== 'object') return null;
      const name = String(rawItem.name || rawItem.label || '').trim();
      const id = String(rawItem.id || '').trim();
      if (!name || !id) return null;
      const scope = normalizeRegistrySelectionScope_(rawItem.scope || fallbackScope || 'personal');
      return {
        id,
        scope,
        name,
        meta: String(rawItem.meta || '').trim(),
        objectQuery: String(rawItem.objectQuery || '').trim(),
        bulkUinText: String(rawItem.bulkUinText || '').trim(),
        registryFacetFilters: normalizeStoredRegistryFacetFilters_(rawItem.registryFacetFilters || {}),
        createdAt: String(rawItem.createdAt || '').trim(),
        updatedAt: String(rawItem.updatedAt || '').trim(),
        ownerName: String(rawItem.ownerName || '').trim(),
        canDelete: scope === 'personal' ? true : !!rawItem.canDelete,
        legacyDoneRowKeys: Array.isArray(rawItem.doneRowKeys)
          ? rawItem.doneRowKeys.map(value => String(value || '')).filter(Boolean)
          : []
      };
    }

function compareSavedRegistrySelections_(a, b) {
      const timeA = Date.parse(a && (a.updatedAt || a.createdAt) || '') || 0;
      const timeB = Date.parse(b && (b.updatedAt || b.createdAt) || '') || 0;
      if (timeA !== timeB) return timeB - timeA;
      return String(a && a.name || '').localeCompare(String(b && b.name || ''), 'ru');
    }

function canEditSavedSelection_(item) {
      if (!item) return false;
      if (normalizeRegistrySelectionScope_(item.scope) !== 'personal') return !!item.canDelete;
      return true;
    }

function canRemoveSavedSelection_(item) {
      if (!item) return false;
      if (normalizeRegistrySelectionScope_(item.scope) !== 'personal') return !!item.canDelete;
      return true;
    }

function formatSavedSelectionDate_(value) {
      const timestamp = Date.parse(String(value || ''));
      if (!timestamp) return '';
      try {
        return new Date(timestamp).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return '';
      }
    }

function clearActiveRegistrySelectionState_() {
      state.activeRegistrySelectionId = '';
      state.selectionDraftSourceId = '';
      persistRegistrySessionState_();
    }

function restoreActiveRegistrySelectionState_() {
      const item = getActiveRegistrySelection_();
      const searchInput = el('registrySearchInput');
      if (!item) {
        if (state.activeRegistrySelectionId) clearActiveRegistrySelectionState_();
        if (searchInput) searchInput.value = state.objectQuery;
        state.registryBulkDraftText = null;
        syncRegistryBulkUinUi_();
        return false;
      }
      state.selectionDraftSourceId = item.id;
      if (hasStoredRegistrySelectionBulkSet_(item)) {
        state.objectQuery = '';
        state.bulkUinText = String(item.bulkUinText || '');
        state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      } else {
        state.objectQuery = String(item.objectQuery || '');
        state.bulkUinText = String(item.bulkUinText || '');
        state.registryFacetFilters = normalizeStoredRegistryFacetFilters_(item.registryFacetFilters || {});
      }
      state.registryBulkDraftText = null;
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      if (searchInput) searchInput.value = state.objectQuery;
      syncRegistryBulkUinUi_();
      return true;
    }

function applyRegistrySessionState_(session) {
      const data = session || {};
      state.activeRegistrySelectionId = String(data.activeRegistrySelectionId || '');
      state.selectionDraftSourceId = String(data.selectionDraftSourceId || data.activeRegistrySelectionId || '');
      state.objectQuery = String(data.objectQuery || '');
      state.bulkUinText = String(data.bulkUinText || '');
      state.registryBulkDraftText = null;
      state.registryBulkOpen = !!data.registryBulkOpen;
      state.registryVisibleColumnKeys = normalizeStoredRegistryVisibleColumnKeys_(data.registryVisibleColumnKeys);
      state.registryColumnsPanelOpen = false;
      state.currentView = String(data.currentView || '') === 'object' ? 'object' : 'registry';
      state.sidebarExpanded = true;
      state.sidebarActivePanel = normalizeSidebarPanel_(data.sidebarActivePanel);
      state.objectTabRowIndexes = normalizeStoredObjectTabRowIndexes_(data.objectTabRowIndexes);
      state.selectedRowIndex = Number.isFinite(Number(data.selectedRowIndex)) && Number(data.selectedRowIndex) >= 0
        ? Math.floor(Number(data.selectedRowIndex))
        : -1;
      state.registryFacetFilters = normalizeStoredRegistryFacetFilters_(data.registryFacetFilters || {});
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      syncHiddenRegistryFacetFilters_();
      state.passportCollapsed = !!data.passportCollapsed;
      state.savedSelectionPanelOpen = data.savedSelectionPanelOpen !== undefined ? !!data.savedSelectionPanelOpen : true;
      state.savedSelectionGroupsOpen = normalizeSavedSelectionGroupsOpen_(data.savedSelectionGroupsOpen);
      state.savedSelectionExpandedById = normalizeSavedSelectionExpandedById_(data.savedSelectionExpandedById);
      state.presetSelections = normalizeStoredPresetSelections_(data.presetSelections);
      state.activeSections = normalizeStoredActivePresetKeys_(data.activePresetKeys)
        .map(key => createPresetSection_(key))
        .filter(Boolean);
    }

function clearSelectionDoneState_(selectionId) {
      const key = String(selectionId || '').trim();
      if (!key) return;
      if (Object.prototype.hasOwnProperty.call(state.selectionDoneById, key)) {
        delete state.selectionDoneById[key];
        persistSelectionDoneState_();
      }
    }

    // ===== Domain =====

    // ----- Read -----

function loadData_(options) {
      if (state.loading) return;
      const preserve = options || {};
      const silent = !!preserve.silent;
      const preservedRowIndex = Number.isFinite(preserve.preserveSelectedRowIndex) ? Number(preserve.preserveSelectedRowIndex) : null;
      const preservedBulkUinOrder = Array.isArray(preserve.preserveBulkUinOrder)
        ? preserve.preserveBulkUinOrder.slice()
        : [];
      const preservedView = String(preserve.preserveView || '').trim();
      const preservedMessage = String(preserve.noticeMessage || '').trim();
      const preservedScrollY = (silent && preserve.preserveScroll) ? window.scrollY : null;
      const loadStartedView = String(state.currentView || '').trim();
      const loadStartedSelectedRowIndex = Number.isFinite(state.selectedRowIndex) ? Number(state.selectedRowIndex) : -1;
      state.loading = true;
      if (!silent) setLoading_(true);

      const requestOptions = {
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        sheetName: state.runtimeOptions.sheetName || DEFAULT_SHEET_NAME,
        headerRow: state.runtimeOptions.headerRow || DEFAULT_HEADER_ROW
      };
      if (state.runtimeOptions.maxRows) requestOptions.maxRows = state.runtimeOptions.maxRows;

      return fetchSmartFilterShellBootstrap_(requestOptions)
        .then(bootstrapPayload => {
          applyBootstrapPayloadToState_(bootstrapPayload);
          const preservedBulkDraftText = state.registryBulkDraftText === null
            ? null
            : String(state.registryBulkDraftText || '');
          const preservedBulkOpen = !!state.registryBulkOpen;
          restoreActiveRegistrySelectionState_();
          state.registryBulkDraftText = preservedBulkDraftText;
          state.registryBulkOpen = preservedBulkOpen;
          applyObjectFilters_();
          if (preservedBulkUinOrder.length) {
            state.filteredRowIndexes = sortRegistryRowIndexesByBulkUinOrder_(
              state.filteredRowIndexes,
              preservedBulkUinOrder
            );
          }
          syncObjectTabsState_();
          ensureObjectSelection_();
          const selectionChangedDuringLoad = Number(state.selectedRowIndex) !== loadStartedSelectedRowIndex;
          const viewChangedDuringLoad = String(state.currentView || '').trim() !== loadStartedView;
          if (!selectionChangedDuringLoad && preservedRowIndex !== null && preservedRowIndex >= 0 && preservedRowIndex < state.rows.length) {
            state.selectedRowIndex = preservedRowIndex;
          }
          if (!viewChangedDuringLoad && preservedView) state.currentView = preservedView;
          if (preservedMessage) {
            state.objectSaveMessage = preservedMessage;
            state.objectSaveError = '';
          }
          state.loading = false;
          syncSharedSelectionWorkStateForActiveSelection_();
          syncRegistryBulkUinUi_();
          persistBootstrapCache_(bootstrapPayload);
          renderAll_();
          if (preservedScrollY !== null) window.scrollTo(window.scrollX, preservedScrollY);
        })
        .catch(err => {
          if (isUnauthorizedError_(err)) {
            handleUnauthorized_();
            return;
          }
          if (silent) {
            warnRuntimeDiagnostic_(err, 'Silent refresh skipped');
            return;
          }
          state.loading = false;
          renderErrorState_(err && err.message ? err.message : String(err));
        })
        .finally(() => {
          state.loading = false;
          if (!silent) setLoading_(false);
        });
    }

function makeColumnMeta_(column, idx) {
      const fieldId = String(column && column.fieldId || '').trim();
      const catalogEntry = getSourceCatalogLookup_().get(normalizeText_(fieldId));
      const label = repairDisplayEncoding_(
        String(catalogEntry && catalogEntry.label || column && column.label || '').trim()
      );
      const sourceRaw = repairDisplayEncoding_(
        String(catalogEntry && catalogEntry.source || column && column.source || '').trim()
      );
      const sourceLabel = sourceRaw || 'Без источника';
      const sourceKey = sourceRaw ? `src:${normalizeText_(sourceRaw)}` : '__blank__';
      return {
        index: Number.isFinite(column && column.index) ? Number(column.index) : idx,
        label,
        fieldId,
        sourceRaw,
        sourceLabel,
        sourceKey,
        normLabel: normalizeText_(label),
        normFieldId: normalizeText_(fieldId),
        isPinned: matchesFieldSpec_(label, fieldId, PINNED_FIELDS)
      };
    }

function getRegistrySummaryValue_(rowIndex, key) {
      const summary = getRegistryRowSummary_(rowIndex);
      return summary && Object.prototype.hasOwnProperty.call(summary, key) ? String(summary[key] || '') : '';
    }

function getRegistryColumnDef_(key) {
      const wanted = String(key || '').trim();
      return REGISTRY_COLUMN_DEFS.find(def => String(def && def.key || '').trim() === wanted) || null;
    }

function getRegistryColumnSpec_(def) {
      if (!def) return null;
      if (def.spec) return def.spec;
      return def.summaryKey ? REGISTRY_SUMMARY_SPECS[def.summaryKey] || null : null;
    }

function isRegistryColumnAvailable_(def) {
      if (!def) return false;
      if (def.required) return true;
      if (typeof def.isAvailable === 'function') return !!def.isAvailable();
      if (!state.columns.length) return def.defaultVisible !== false;
      const spec = getRegistryColumnSpec_(def);
      return !spec || !!findColumnBySpec_(spec);
    }

function getAvailableRegistryColumnDefs_() {
      const selected = new Set(normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys));
      return REGISTRY_COLUMN_DEFS.filter(def => {
        const key = String(def && def.key || '').trim();
        return !!(def && (def.required || def.defaultVisible !== false || selected.has(key) || isRegistryColumnAvailable_(def)));
      });
    }

function getVisibleRegistryColumnDefs_() {
      const visible = new Set(normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys));
      return REGISTRY_COLUMN_DEFS.filter(def => visible.has(String(def && def.key || '').trim()));
    }

function getRegistryTableColumnCount_() {
      return Math.max(getVisibleRegistryColumnDefs_().length, 1);
    }

function syncHiddenRegistryFacetFilters_() {
      let changed = false;
      const visibleFilterKeys = new Set(
        getVisibleRegistryColumnDefs_()
          .map(def => String(def && def.filterKey || '').trim())
          .filter(Boolean)
      );
      REGISTRY_FILTER_DEFS.forEach(def => {
        const key = String(def && def.key || '').trim();
        if (!key || visibleFilterKeys.has(key)) return;
        if (state.registryFacetFilters[key] !== null) {
          state.registryFacetFilters[key] = null;
          changed = true;
        }
        if (state.registryFacetQueries[key]) {
          state.registryFacetQueries[key] = '';
          changed = true;
        }
        if (state.openRegistryFilterKey === key) {
          state.openRegistryFilterKey = '';
          changed = true;
        }
      });
      return changed;
    }

function getRegistryRowSummary_(rowIndex) {
      const cacheKey = Number(rowIndex);
      if (state.registryRowSummaryCache.has(cacheKey)) return state.registryRowSummaryCache.get(cacheKey);
      const rvDate = readRegistrySummaryValueByKey_(rowIndex, 'rvDate');
      const rvNumber = readRegistrySummaryValueByKey_(rowIndex, 'rvNumber');
      const summary = {
        dashboardUrl: readRegistrySummaryValueByKey_(rowIndex, 'dashboardUrl'),
        uin: readRegistrySummaryValueByKey_(rowIndex, 'uin'),
        dsCode: readRegistrySummaryValueByKey_(rowIndex, 'dsCode'),
        name: readRegistrySummaryValueByKey_(rowIndex, 'name'),
        tep: readRegistrySummaryValueByKey_(rowIndex, 'tep'),
        status: readRegistrySummaryValueByKey_(rowIndex, 'status'),
        grbs: readRegistrySummaryValueByKey_(rowIndex, 'grbs'),
        customer: readRegistrySummaryValueByKey_(rowIndex, 'customer'),
        contractor: readRegistrySummaryValueByKey_(rowIndex, 'contractor'),
        anoSmgCode: readRegistrySummaryValueByKey_(rowIndex, 'anoSmgCode'),
        checklistUrl: readRegistrySummaryValueByKey_(rowIndex, 'checklistUrl'),
        monitoringDate: readRegistrySummaryValueByKey_(rowIndex, 'monitoringDate'),
        yandexDiskUrl: readRegistrySummaryValueByKey_(rowIndex, 'yandexDiskUrl'),
        autosliderUrl: readRegistrySummaryValueByKey_(rowIndex, 'autosliderUrl'),
        constructionReadinessPlan: readRegistrySummaryValueByKey_(rowIndex, 'constructionReadinessPlan'),
        constructionReadinessFact: readRegistrySummaryValueByKey_(rowIndex, 'constructionReadinessFact'),
        peopleCountPlan: readRegistrySummaryValueByKey_(rowIndex, 'peopleCountPlan'),
        peopleCountFact: readRegistrySummaryValueByKey_(rowIndex, 'peopleCountFact'),
        deadlineRisk: readRegistrySummaryValueByKey_(rowIndex, 'deadlineRisk'),
        startSmrDate: readRegistrySummaryValueByKey_(rowIndex, 'startSmrDate'),
        rvDate,
        rvNumber
      };
      summary.constructionReadiness = summary.constructionReadinessFact;
      summary.rvStatus = hasRegistryRvValue_(summary) ? 'Есть РВ' : 'Нет РВ';
      summary.rvDisplay = formatRegistryRvDisplayText_(summary.rvDate, summary.rvNumber);
      state.registryRowSummaryCache.set(cacheKey, summary);
      return summary;
    }

function readRegistrySummaryValueByKey_(rowIndex, key) {
      const spec = REGISTRY_SUMMARY_SPECS[key];
      const column = spec ? findColumnBySpec_(spec) : null;
      return column ? getCellValue_(rowIndex, column.index) : '';
    }

function hasRegistryRvValue_(summary) {
      return !!(
        String(summary && summary.rvDate || '').trim() ||
        String(summary && summary.rvNumber || '').trim()
      );
    }

function formatRegistryDateText_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '';
      const parsed = parseMonitoringDateValue_(text);
      return parsed ? parsed.display : text;
    }

function formatRegistryRvDisplayText_(dateValue, numberValue) {
      const dateText = formatRegistryDateText_(dateValue);
      const numberText = String(numberValue == null ? '' : numberValue).trim();
      if (dateText && numberText) return `${dateText} №${numberText}`;
      if (dateText) return `${dateText} (№ не заполнен)`;
      if (numberText) return `№${numberText} (дата не заполнена)`;
      return '';
    }

function hasLoadedRowDetails_(rowIndex) {
      return Number.isFinite(rowIndex) && rowIndex >= 0 && Array.isArray(state.rows[rowIndex]);
    }

function matchesFieldSpec_(label, fieldId, specs) {
      const normLabel = normalizeText_(label);
      const normFieldId = normalizeText_(fieldId);
      return (Array.isArray(specs) ? specs : []).some(item => (
        Array.isArray(item.ids) && item.ids.some(id => normalizeText_(id) === normFieldId && normFieldId) ||
        Array.isArray(item.labels) && item.labels.some(text => normalizeText_(text) === normLabel && normLabel)
      ));
    }

function isMonitoringDateFacetDef_(defOrKey) {
      if (!defOrKey) return false;
      if (typeof defOrKey === 'string') return String(defOrKey) === 'monitoringDate';
      return String(defOrKey && defOrKey.key || '') === 'monitoringDate';
    }

function getMonitoringDateBucketOption_(key) {
      return REGISTRY_MONITORING_BUCKET_OPTIONS.find(option => String(option && option.key || '') === String(key || '')) || null;
    }

function startOfLocalDay_(value) {
      const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
      date.setHours(0, 0, 0, 0);
      return date;
    }

function createValidatedLocalDate_(year, month, day) {
      const y = Number(year);
      const m = Number(month);
      const d = Number(day);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      const date = new Date(y, m - 1, d, 12, 0, 0, 0);
      if (date.getFullYear() !== y || date.getMonth() !== (m - 1) || date.getDate() !== d) return null;
      return startOfLocalDay_(date);
    }

function formatLocalDateDisplay_(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
      try {
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (e) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear());
        return `${day}.${month}.${year}`;
      }
    }

function parseMonitoringDateValue_(value) {
      const text = String(value || '').trim();
      if (!text) return null;
      if (MONITORING_DATE_PARSE_CACHE.has(text)) {
        return MONITORING_DATE_PARSE_CACHE.get(text);
      }
      let parsed = null;
      let match = text.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
      if (match) {
        const date = createValidatedLocalDate_(match[3], match[2], match[1]);
        parsed = date ? { date, display: formatLocalDateDisplay_(date) } : null;
      } else {
        match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          const date = createValidatedLocalDate_(match[1], match[2], match[3]);
          parsed = date ? { date, display: formatLocalDateDisplay_(date) } : null;
        }
      }
      if (MONITORING_DATE_PARSE_CACHE.size >= MONITORING_DATE_PARSE_CACHE_LIMIT) {
        MONITORING_DATE_PARSE_CACHE.clear();
      }
      MONITORING_DATE_PARSE_CACHE.set(text, parsed);
      return parsed;
    }

function getMonitoringDateTimestamp_(value) {
      const parsed = parseMonitoringDateValue_(value);
      return parsed && parsed.date instanceof Date ? parsed.date.getTime() : NaN;
    }

function getMonitoringDateStatusInfo_(value) {
      const parsed = parseMonitoringDateValue_(value);
      if (!parsed) return null;
      const today = startOfLocalDay_(new Date());
      const diffMs = today.getTime() - parsed.date.getTime();
      const ageDays = Math.max(0, Math.floor(diffMs / 86400000));
      const bucket = ageDays >= 11 ? 'overdue' : (ageDays >= 7 ? 'warning' : 'fresh');
      return {
        date: parsed.date,
        display: parsed.display,
        ageDays,
        bucket,
        title: `${parsed.display} · ${ageDays} дн. назад`
      };
    }

function normalizeMonitoringDateFacetFilter_(rawValue) {
      if (rawValue == null || rawValue === '' || rawValue === '__all__') return null;
      if (Array.isArray(rawValue) && !rawValue.length) return [];
      let values = [];
      if (typeof rawValue === 'string') values = [rawValue];
      else if (Array.isArray(rawValue)) values = rawValue.slice();
      else if (typeof rawValue === 'object') values = [rawValue.bucket];
      const seen = new Set();
      const normalized = values.reduce((acc, item) => {
        const key = getMonitoringDateBucketOption_(item) ? String(item) : '';
        if (!key || seen.has(key)) return acc;
        seen.add(key);
        acc.push(key);
        return acc;
      }, []);
      if (!normalized.length) return Array.isArray(rawValue) ? [] : null;
      if (normalized.length === REGISTRY_MONITORING_BUCKET_OPTIONS.length) return null;
      return normalized;
    }

function isRegistryFacetSelectionActive_(def, selection) {
      if (isMonitoringDateFacetDef_(def)) return !!normalizeMonitoringDateFacetFilter_(selection);
      if (isNumberRangeFacetDef_(def)) return !!normalizeNumberRangeFacetFilter_(selection);
      if (isDateRangeFacetDef_(def)) return !!normalizeDateRangeFacetFilter_(selection);
      return Array.isArray(selection) ? selection.length > 0 : (selection != null && selection !== '' && selection !== '__all__');
    }

function formatMonitoringDateFacetLabel_(selection, placeholder) {
      const current = normalizeMonitoringDateFacetFilter_(selection);
      if (!current) return String(placeholder || 'Дата мониторинга');
      if (current.length === 1) {
        const option = getMonitoringDateBucketOption_(current[0]);
        return option ? option.label : 'Дата мониторинга';
      }
      return `Дата мониторинга · ${current.length}`;
    }

function formatMonitoringDateFacetMeta_(selection) {
      const current = normalizeMonitoringDateFacetFilter_(selection);
      if (!current) return '';
      const labels = current
        .map(key => getMonitoringDateBucketOption_(key))
        .filter(Boolean)
        .map(option => option.label);
      return labels.length ? `Дата мониторинга: ${labels.join(', ')}` : 'Дата мониторинга';
    }

function buildMonitoringDateFacetMenuHtml_(selection) {
      const current = normalizeMonitoringDateFacetFilter_(selection);
      const values = REGISTRY_MONITORING_BUCKET_OPTIONS.map(option => option.key);
      const allSelected = isRegistryFacetAllSelected_(current, values);
      const optionsHtml = REGISTRY_MONITORING_BUCKET_OPTIONS.map(option => (
        `<button class="registry-filter-option${isRegistryFacetOptionSelected_(current, option.key) ? ' active' : ''}" type="button" data-registry-filter-option="monitoringDate" data-registry-filter-value="${escapeHtml_(option.key)}">` +
          `<span class="registry-filter-option-mark" aria-hidden="true"></span>` +
          `<span class="registry-filter-option-text multiline">` +
            `<span class="registry-filter-option-title">${escapeHtml_(option.label)}</span>` +
            `<span class="registry-filter-option-sub">${escapeHtml_(option.hint)}</span>` +
          `</span>` +
        `</button>`
      )).join('');
      return [
        `<div class="registry-filter-tools">`,
        `<button class="registry-filter-all${allSelected ? ' active' : ''}" type="button" data-registry-filter-all="monitoringDate">`,
        `<span class="registry-filter-option-mark" aria-hidden="true"></span>`,
        `<span class="registry-filter-option-text">Выбрать все</span>`,
        `</button>`,
        `</div>`,
        `<div class="registry-filter-options">`,
        optionsHtml,
        `</div>`
      ].join('');
    }

function matchesMonitoringDateFacetFilterValue_(value, selection) {
      const current = normalizeMonitoringDateFacetFilter_(selection);
      if (!current) return true;
      const info = getMonitoringDateStatusInfo_(value);
      if (!info) return current.some(bucket => bucket === 'missing');
      return current.some(bucket => bucket === info.bucket);
    }

function isNumberRangeFacetDef_(defOrKey) {
      if (!defOrKey) return false;
      if (typeof defOrKey === 'string') return String(defOrKey) === 'constructionReadiness';
      return String(defOrKey && defOrKey.key || '') === 'constructionReadiness';
    }

function isDateRangeFacetDef_(defOrKey) {
      if (!defOrKey) return false;
      if (typeof defOrKey === 'string') return String(defOrKey) === 'startSmrDate';
      return String(defOrKey && defOrKey.key || '') === 'startSmrDate';
    }

function normalizeNumberRangeFacetFilter_(rawValue) {
      if (rawValue == null || rawValue === '' || rawValue === '__all__') return null;
      const source = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? rawValue
        : { min: rawValue };
      let min = parseLocaleNumber_(source.min);
      let max = parseLocaleNumber_(source.max);
      if (!Number.isFinite(min) && !Number.isFinite(max)) return null;
      if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
        const swap = min;
        min = max;
        max = swap;
      }
      return {
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) ? max : null
      };
    }

function formatNumberRangeFacetBoundary_(value) {
      return Number.isFinite(value) ? formatCalculatedPercentValue_(value) : '';
    }

function formatNumberRangeFacetLabel_(selection, placeholder) {
      const current = normalizeNumberRangeFacetFilter_(selection);
      if (!current) return String(placeholder || 'Диапазон');
      if (Number.isFinite(current.min) && Number.isFinite(current.max)) {
        return `${placeholder} · ${formatNumberRangeFacetBoundary_(current.min)}–${formatNumberRangeFacetBoundary_(current.max)}`;
      }
      if (Number.isFinite(current.min)) return `${placeholder} · >= ${formatNumberRangeFacetBoundary_(current.min)}`;
      return `${placeholder} · <= ${formatNumberRangeFacetBoundary_(current.max)}`;
    }

function formatNumberRangeFacetMeta_(selection, title) {
      const current = normalizeNumberRangeFacetFilter_(selection);
      if (!current) return '';
      if (Number.isFinite(current.min) && Number.isFinite(current.max)) {
        return `${title}: от ${formatNumberRangeFacetBoundary_(current.min)} до ${formatNumberRangeFacetBoundary_(current.max)}`;
      }
      if (Number.isFinite(current.min)) return `${title}: от ${formatNumberRangeFacetBoundary_(current.min)}`;
      return `${title}: до ${formatNumberRangeFacetBoundary_(current.max)}`;
    }

function matchesNumberRangeFacetFilterValue_(value, selection) {
      const current = normalizeNumberRangeFacetFilter_(selection);
      if (!current) return true;
      const parsed = parseLocaleNumber_(value);
      if (!Number.isFinite(parsed)) return false;
      if (Number.isFinite(current.min) && parsed < current.min) return false;
      if (Number.isFinite(current.max) && parsed > current.max) return false;
      return true;
    }

function formatLocalDateInputValue_(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
      const year = String(date.getFullYear());
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

function normalizeDateRangeFacetBoundary_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const parsedIso = parseMonitoringDateValue_(text);
        return parsedIso ? formatLocalDateInputValue_(parsedIso.date) : '';
      }
      const parsed = parseMonitoringDateValue_(text);
      return parsed ? formatLocalDateInputValue_(parsed.date) : '';
    }

function normalizeDateRangeFacetFilter_(rawValue) {
      if (rawValue == null || rawValue === '' || rawValue === '__all__') return null;
      const source = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? rawValue
        : {};
      let from = normalizeDateRangeFacetBoundary_(source.from);
      let to = normalizeDateRangeFacetBoundary_(source.to);
      if (!from && !to) return null;
      if (from && to && from > to) {
        const swap = from;
        from = to;
        to = swap;
      }
      return { from, to };
    }

function formatDateRangeFacetLabel_(selection, placeholder) {
      const current = normalizeDateRangeFacetFilter_(selection);
      if (!current) return String(placeholder || 'Дата');
      const fromText = current.from ? formatRegistryDateText_(current.from) : '';
      const toText = current.to ? formatRegistryDateText_(current.to) : '';
      if (fromText && toText) return `${placeholder} · ${fromText}–${toText}`;
      if (fromText) return `${placeholder} · >= ${fromText}`;
      return `${placeholder} · <= ${toText}`;
    }

function formatDateRangeFacetMeta_(selection, title) {
      const current = normalizeDateRangeFacetFilter_(selection);
      if (!current) return '';
      const fromText = current.from ? formatRegistryDateText_(current.from) : '';
      const toText = current.to ? formatRegistryDateText_(current.to) : '';
      if (fromText && toText) return `${title}: с ${fromText} по ${toText}`;
      if (fromText) return `${title}: с ${fromText}`;
      return `${title}: по ${toText}`;
    }

function getDateRangeFacetBounds_(selection) {
      const current = normalizeDateRangeFacetFilter_(selection);
      if (!current) return null;
      const key = `${String(current.from || '')}:${String(current.to || '')}`;
      if (DATE_RANGE_FACET_BOUNDS_CACHE.has(key)) {
        return DATE_RANGE_FACET_BOUNDS_CACHE.get(key);
      }
      const bounds = {
        from: String(current.from || ''),
        to: String(current.to || ''),
        fromTime: current.from ? getMonitoringDateTimestamp_(current.from) : NaN,
        toTime: current.to ? getMonitoringDateTimestamp_(current.to) : NaN
      };
      if (DATE_RANGE_FACET_BOUNDS_CACHE.size >= DATE_RANGE_FACET_BOUNDS_CACHE_LIMIT) {
        DATE_RANGE_FACET_BOUNDS_CACHE.clear();
      }
      DATE_RANGE_FACET_BOUNDS_CACHE.set(key, bounds);
      return bounds;
    }

function matchesDateRangeFacetFilterValue_(value, selection) {
      const bounds = getDateRangeFacetBounds_(selection);
      if (!bounds) return true;
      const valueTime = getMonitoringDateTimestamp_(value);
      if (!Number.isFinite(valueTime)) return false;
      if (bounds.from) {
        if (Number.isFinite(bounds.fromTime) && valueTime < bounds.fromTime) return false;
      }
      if (bounds.to) {
        if (Number.isFinite(bounds.toTime) && valueTime > bounds.toTime) return false;
      }
      return true;
    }

function normalizeRegistryFacetSelection_(rawValue, allowedValues) {
      const allowedMap = new Map();
      (Array.isArray(allowedValues) ? allowedValues : []).forEach(value => {
        const text = String(value || '').trim();
        const norm = normalizeText_(text);
        if (!text || !norm || allowedMap.has(norm)) return;
        allowedMap.set(norm, text);
      });
      if (rawValue == null || rawValue === '' || rawValue === '__all__') return null;
      if (Array.isArray(rawValue)) {
        const seen = new Set();
        const normalized = [];
        rawValue.forEach(value => {
          const text = String(value || '').trim();
          const norm = normalizeText_(text);
          const allowedValue = norm ? allowedMap.get(norm) : '';
          if (!allowedValue || seen.has(norm)) return;
          seen.add(norm);
          normalized.push(allowedValue);
        });
        if (!normalized.length) return [];
        if (allowedMap.size && normalized.length === allowedMap.size) return null;
        return normalized;
      }
      const single = String(rawValue || '').trim();
      if (!single) return null;
      const singleNorm = normalizeText_(single);
      const allowedValue = singleNorm ? allowedMap.get(singleNorm) : '';
      if (!allowedValue) return [];
      if (allowedMap.size === 1) return null;
      return [allowedValue];
    }

function formatRegistryFacetButtonLabel_(def, selection) {
      if (isMonitoringDateFacetDef_(def)) return formatMonitoringDateFacetLabel_(selection, def && def.placeholder);
      if (isNumberRangeFacetDef_(def)) return formatNumberRangeFacetLabel_(selection, def && def.placeholder);
      if (isDateRangeFacetDef_(def)) return formatDateRangeFacetLabel_(selection, def && def.placeholder);
      if (selection === null) return def.placeholder;
      if (!Array.isArray(selection) || !selection.length) return `${def.title} · 0`;
      if (selection.length === 1) return selection[0];
      return `${def.title} · ${selection.length}`;
    }

function isRegistryFacetAllSelected_(selection, allowedValues) {
      if (selection == null || selection === '' || selection === '__all__') return true;
      if (!Array.isArray(selection) || !selection.length) return false;
      const allowed = Array.isArray(allowedValues) ? allowedValues : [];
      if (!allowed.length) return false;
      const selectedNorms = new Set(selection.map(value => normalizeText_(value)).filter(Boolean));
      let allowedCount = 0;
      for (let i = 0; i < allowed.length; i++) {
        const norm = normalizeText_(allowed[i]);
        if (!norm) continue;
        allowedCount++;
        if (!selectedNorms.has(norm)) return false;
      }
      return allowedCount > 0;
    }

function isRegistryFacetOptionSelected_(selection, value) {
      if (selection === null) return true;
      if (!Array.isArray(selection)) return false;
      const expectedNorm = normalizeText_(value);
      if (!expectedNorm) return false;
      return selection.some(item => normalizeText_(item) === expectedNorm);
    }

function getRegistryFacetAvailableValues_(facetKey) {
      return getRegistryFacetAvailableValuesFast_(facetKey);
    }

function buildRegistryFacetCollectionCacheKey_(facetKey) {
      return [
        String(facetKey || ''),
        String(state.objectQuery || ''),
        String(state.bulkUinText || ''),
        REGISTRY_FILTER_DEFS
          .map(def => `${String(def.key || '')}:${serializeRegistryFacetSelection_(state.registryFacetFilters[def.key], def)}`)
          .join('\u0002')
      ].join('\u0001');
    }

function collectRegistryFacetValuesFast_(facetKey) {
      const cacheKey = buildRegistryFacetCollectionCacheKey_(facetKey);
      if (state.registryFacetValuesCache.has(cacheKey)) {
        return state.registryFacetValuesCache.get(cacheKey).slice();
      }
      const seen = new Set();
      const values = [];
      const bulkUinSet = getRegistryBulkUinSet_();
      const searchTokens = tokenize_(state.objectQuery);

      for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex++) {
        if (!matchesRegistryBulkUin_(rowIndex, bulkUinSet)) continue;
        if (!matchesRegistrySearch_(rowIndex, searchTokens)) continue;
        if (!matchesRegistryFacetFiltersExcept_(rowIndex, state.registryFacetFilters, facetKey)) continue;
        const text = String(getRegistryFacetValue_(rowIndex, facetKey) || '').trim();
        const norm = normalizeText_(text);
        if (!text || !norm || seen.has(norm)) continue;
        seen.add(norm);
        values.push(text);
      }

      const selected = state.registryFacetFilters[facetKey];
      if (Array.isArray(selected)) {
        selected.forEach(value => {
          const text = String(value || '').trim();
          const norm = normalizeText_(text);
          if (!text || !norm || seen.has(norm)) return;
          seen.add(norm);
          values.push(text);
        });
      }

      const sortedValues = values.sort((a, b) => String(a).localeCompare(String(b), 'ru'));
      if (state.registryFacetValuesCache.size >= REGISTRY_FACET_VALUES_CACHE_LIMIT) {
        state.registryFacetValuesCache.clear();
      }
      state.registryFacetValuesCache.set(cacheKey, sortedValues.slice());
      return sortedValues;
    }

function serializeRegistryFacetSelection_(selection, defOrKey) {
      if (selection == null) return '__all__';
      if (isMonitoringDateFacetDef_(defOrKey)) {
        const current = normalizeMonitoringDateFacetFilter_(selection);
        return Array.isArray(current) ? current.map(value => String(value || '')).sort().join('\u0001') : '__all__';
      }
      if (isNumberRangeFacetDef_(defOrKey)) {
        const current = normalizeNumberRangeFacetFilter_(selection);
        return current ? `${formatNumberRangeFacetBoundary_(current.min)}:${formatNumberRangeFacetBoundary_(current.max)}` : '__all__';
      }
      if (isDateRangeFacetDef_(defOrKey)) {
        const current = normalizeDateRangeFacetFilter_(selection);
        return current ? `${String(current.from || '')}:${String(current.to || '')}` : '__all__';
      }
      if (Array.isArray(selection)) return selection.map(value => String(value || '')).sort().join('\u0001');
      return String(selection || '');
    }

function getRegistryFacetAvailableValuesFast_(facetKey) {
      if (isMonitoringDateFacetDef_(facetKey)) return REGISTRY_MONITORING_BUCKET_OPTIONS.map(option => option.key);
      if (isNumberRangeFacetDef_(facetKey) || isDateRangeFacetDef_(facetKey)) return [];
      return collectRegistryFacetValuesFast_(facetKey);
    }

function getRegistryFacetDef_(facetKey) {
      return REGISTRY_FILTER_DEFS.find(def => def.key === facetKey) || null;
    }

function getRegistryFacetValue_(rowIndex, facetKey) {
      const summary = getRegistryRowSummary_(rowIndex);
      return summary && Object.prototype.hasOwnProperty.call(summary, facetKey) ? String(summary[facetKey] || '') : '';
    }

function matchesRegistrySearch_(rowIndex, tokensOverride) {
      const tokens = Array.isArray(tokensOverride) ? tokensOverride : tokenize_(state.objectQuery);
      if (!tokens.length) return true;
      const summary = getRegistryRowSummary_(rowIndex);
      const text = [
        summary.uin,
        summary.dsCode,
        summary.name,
        summary.status,
        summary.grbs,
        summary.customer,
        summary.contractor,
        summary.anoSmgCode,
        summary.monitoringDate
      ].map(normalizeText_).join(' | ');
      return tokens.every(token => text.includes(token));
    }

function parseRegistryBulkUinText_(rawValue) {
      const parts = String(rawValue || '')
        .split(/[\n,;\t]+/g)
        .map(value => String(value || '').trim())
        .filter(Boolean);
      const seen = new Set();
      return parts.filter(value => {
        const norm = normalizeText_(value);
        if (!norm || seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });
    }

function buildRegistryBulkUinOrderMap_(rawValue) {
      const orderMap = new Map();
      parseRegistryBulkUinText_(rawValue).forEach((value, index) => {
        const norm = normalizeText_(value);
        if (!norm || orderMap.has(norm)) return;
        orderMap.set(norm, index);
      });
      return orderMap;
    }

function sortRegistryRowIndexesByBulkUinOrder_(rowIndexes, rawOrder) {
      const rows = Array.isArray(rowIndexes) ? rowIndexes.slice() : [];
      if (!rows.length) return rows;
      const orderMap = new Map();
      (Array.isArray(rawOrder) ? rawOrder : []).forEach((value, index) => {
        const norm = normalizeText_(value);
        if (!norm || orderMap.has(norm)) return;
        orderMap.set(norm, index);
      });
      if (!orderMap.size) return rows;
      return rows
        .map(rowIndex => {
          const uinNorm = normalizeText_(getRegistrySummaryValue_(rowIndex, 'uin'));
          return {
            rowIndex,
            bulkOrder: orderMap.has(uinNorm)
              ? orderMap.get(uinNorm)
              : Number.MAX_SAFE_INTEGER
          };
        })
        .sort((a, b) => {
          if (a.bulkOrder !== b.bulkOrder) return a.bulkOrder - b.bulkOrder;
          return a.rowIndex - b.rowIndex;
        })
        .map(item => item.rowIndex);
    }

function getRegistryBulkUinSet_() {
      return new Set(parseRegistryBulkUinText_(state.bulkUinText).map(normalizeText_));
    }

function matchesRegistryBulkUin_(rowIndex, selectedOverride) {
      const selected = selectedOverride instanceof Set ? selectedOverride : getRegistryBulkUinSet_();
      if (!selected.size) return true;
      const currentUin = normalizeText_(getRegistrySummaryValue_(rowIndex, 'uin'));
      return currentUin ? selected.has(currentUin) : false;
    }

function matchesRegistryFacetSelectionForDef_(rowIndex, def, selection) {
      if (selection == null || selection === '' || selection === '__all__') return true;
      const currentValue = getRegistryFacetValue_(rowIndex, def.key);
      if (isMonitoringDateFacetDef_(def)) {
        return matchesMonitoringDateFacetFilterValue_(currentValue, selection);
      }
      if (isNumberRangeFacetDef_(def)) {
        return matchesNumberRangeFacetFilterValue_(currentValue, selection);
      }
      if (isDateRangeFacetDef_(def)) {
        return matchesDateRangeFacetFilterValue_(currentValue, selection);
      }
      if (Array.isArray(selection)) {
        if (!selection.length) return false;
        const currentNorm = normalizeText_(currentValue);
        return selection.some(value => normalizeText_(value) === currentNorm);
      }
      return normalizeText_(currentValue) === normalizeText_(selection);
    }

function matchesRegistryFacetFiltersCore_(rowIndex, filters, excludedFacetKey) {
      const active = filters || state.registryFacetFilters;
      const excluded = String(excludedFacetKey || '').trim();
      for (let i = 0; i < REGISTRY_FILTER_DEFS.length; i++) {
        const def = REGISTRY_FILTER_DEFS[i];
        if (excluded && String(def.key || '') === excluded) continue;
        if (!matchesRegistryFacetSelectionForDef_(rowIndex, def, active[def.key])) return false;
      }
      return true;
    }

function matchesRegistryFacetFilters_(rowIndex, filters) {
      return matchesRegistryFacetFiltersCore_(rowIndex, filters, '');
    }

function matchesRegistryFacetFiltersExcept_(rowIndex, filters, excludedFacetKey) {
      return matchesRegistryFacetFiltersCore_(rowIndex, filters, excludedFacetKey);
    }

function getRegistryLastUpdatedTimestamp_() {
      if (Number.isFinite(state.lastDataLoadedAt) && state.lastDataLoadedAt > 0) return state.lastDataLoadedAt;
      const metaTimestamp = Date.parse(String(state.meta && state.meta.fetchedAt || ''));
      return Number.isFinite(metaTimestamp) && metaTimestamp > 0 ? metaTimestamp : 0;
    }

function formatRegistryLastUpdatedText_() {
      const timestamp = getRegistryLastUpdatedTimestamp_();
      if (!timestamp) return state.loading ? 'Загрузка данных...' : '';
      try {
        return `Обновлено ${new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      } catch (e) {
        return 'Обновлено только что';
      }
    }

function buildCurrentUserWorkKey_() {
      return [
        normalizeText_(state.currentUser && state.currentUser.name || ''),
        normalizeText_(state.currentUser && state.currentUser.division || '')
      ].filter(Boolean).join('|') || 'user';
    }

function isSharedRegistrySelection_(item) {
      return !!(item && normalizeRegistrySelectionScope_(item.scope) === 'shared');
    }

function isDivisionRegistrySelection_(item) {
      return !!(item && normalizeRegistrySelectionScope_(item.scope) === 'division');
    }

function isCollaborativeRegistrySelectionScope_(scope) {
      const mode = normalizeRegistrySelectionScope_(scope);
      return mode === 'shared' || mode === 'division';
    }

function isCollaborativeRegistrySelection_(item) {
      return !!(item && (isSharedRegistrySelection_(item) || isDivisionRegistrySelection_(item)));
    }

function getCurrentUserBlockName_() {
      return getCurrentUserDivisionLabel_();
    }

function getSharedSelectionWorkPendingText_(action) {
      const mode = String(action || '').trim();
      if (mode === 'take') return 'Беру...';
      if (mode === 'done') return 'Отмечаю...';
      if (mode === 'release') return 'Возвращаю...';
      return 'Сохраняю...';
    }

function normalizeSharedSelectionWorkBatchMode_(mode) {
      const value = String(mode || '').trim().toLowerCase();
      return /^(take|release)$/.test(value) ? value : '';
    }

function getSharedSelectionWorkBatchMode_() {
      return normalizeSharedSelectionWorkBatchMode_(state.sharedSelectionWorkBatchMode);
    }

function hasSharedSelectionWorkBatchMode_() {
      return !!getSharedSelectionWorkBatchMode_();
    }

function canUseSharedSelectionWorkBatchMode_() {
      const activeSelection = getActiveRegistrySelection_();
      return !!(
        isCollaborativeRegistrySelection_(activeSelection) &&
        getCurrentUserBlockName_() &&
        !isRegistrySelectionEditing_() &&
        !isAdminRegistryEditMode_()
      );
    }

function clearSharedSelectionWorkBatchSelection_(options) {
      const settings = options || {};
      state.sharedSelectionWorkBatchSelectedByKey = {};
      if (!settings.preserveMode) state.sharedSelectionWorkBatchMode = '';
      if (!settings.preservePending) state.sharedSelectionWorkBatchPendingAction = '';
    }

function isRegistryRowSelectableForSharedWorkBatch_(rowIndex, mode, options) {
      const settings = options || {};
      const batchMode = normalizeSharedSelectionWorkBatchMode_(mode || getSharedSelectionWorkBatchMode_());
      if (!batchMode || !canUseSharedSelectionWorkBatchMode_()) return false;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return false;
      const workState = settings.workState || getRegistryRowWorkState_(rowIndex);
      if (!workState || workState.mode !== 'shared') return false;
      if (workState.pendingAction || state.sharedSelectionWorkBatchPendingAction) return false;
      return batchMode === 'take'
        ? !!workState.isFree
        : !!workState.canRelease;
    }

function isRegistryRowSelectedForSharedWorkBatch_(rowIndex) {
      const objectKeyNorm = normalizeText_(getRegistryRowWorkKey_(rowIndex));
      if (!objectKeyNorm) return false;
      return !!(state.sharedSelectionWorkBatchSelectedByKey || {})[objectKeyNorm];
    }

function getSharedSelectionWorkBatchSelectedEntries_() {
      return Object.keys(state.sharedSelectionWorkBatchSelectedByKey || {})
        .map(key => state.sharedSelectionWorkBatchSelectedByKey[key])
        .filter(Boolean);
    }

function getSharedSelectionWorkBatchSelectedCount_() {
      return getSharedSelectionWorkBatchSelectedEntries_().length;
    }

function pruneSharedSelectionWorkBatchSelection_() {
      const batchMode = getSharedSelectionWorkBatchMode_();
      if (!batchMode || state.sharedSelectionWorkBatchPendingAction) return;
      if (!canUseSharedSelectionWorkBatchMode_()) {
        clearSharedSelectionWorkBatchSelection_();
        return;
      }
      const next = {};
      const visibleRowIndexes = Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes : [];
      visibleRowIndexes.forEach(rowIndex => {
        const objectKey = String(getRegistryRowWorkKey_(rowIndex) || '').trim();
        const objectKeyNorm = normalizeText_(objectKey);
        if (!objectKeyNorm) return;
        const existing = (state.sharedSelectionWorkBatchSelectedByKey || {})[objectKeyNorm];
        if (!existing) return;
        const workState = getRegistryRowWorkState_(rowIndex);
        if (!isRegistryRowSelectableForSharedWorkBatch_(rowIndex, batchMode, { workState })) return;
        next[objectKeyNorm] = {
          objectKey,
          uin: String(getRegistryRowSummary_(rowIndex).uin || existing.uin || '').trim()
        };
      });
      state.sharedSelectionWorkBatchSelectedByKey = next;
    }

function setSharedSelectionWorkBatchMode_(mode) {
      const nextMode = normalizeSharedSelectionWorkBatchMode_(mode);
      if (!nextMode || !canUseSharedSelectionWorkBatchMode_()) {
        clearSharedSelectionWorkBatchSelection_();
        return;
      }
      if (getSharedSelectionWorkBatchMode_() === nextMode) {
        clearSharedSelectionWorkBatchSelection_();
        return;
      }
      state.sharedSelectionWorkBatchMode = nextMode;
      state.sharedSelectionWorkBatchPendingAction = '';
      state.sharedSelectionWorkBatchSelectedByKey = {};
    }

async function handleRegistrySharedWorkToolbarAction_(mode) {
      const nextMode = normalizeSharedSelectionWorkBatchMode_(mode);
      if (!nextMode || !canUseSharedSelectionWorkBatchMode_() || state.sharedSelectionWorkBatchPendingAction) return null;
      setSharedSelectionWorkBatchMode_(nextMode);
      renderRegistryView_();
      renderObjectView_();
      return null;
    }

function exitRegistrySharedWorkBatchMode_() {
      if (!getSharedSelectionWorkBatchMode_() && !getSharedSelectionWorkBatchSelectedCount_()) return;
      clearSharedSelectionWorkBatchSelection_();
      renderRegistryView_();
      renderObjectView_();
    }

async function confirmRegistrySharedWorkBatchMode_() {
      if (state.sharedSelectionWorkBatchPendingAction || !getSharedSelectionWorkBatchSelectedCount_()) return null;
      return applySharedSelectionWorkBatch_();
    }

function toggleRegistryRowSharedWorkBatchSelection_(rowIndex) {
      const batchMode = getSharedSelectionWorkBatchMode_();
      if (!batchMode || !canUseSharedSelectionWorkBatchMode_()) return;
      if (!isRegistryRowSelectableForSharedWorkBatch_(rowIndex, batchMode)) return;
      const objectKey = String(getRegistryRowWorkKey_(rowIndex) || '').trim();
      const objectKeyNorm = normalizeText_(objectKey);
      if (!objectKeyNorm) return;
      const next = { ...(state.sharedSelectionWorkBatchSelectedByKey || {}) };
      if (next[objectKeyNorm]) {
        delete next[objectKeyNorm];
      } else {
        next[objectKeyNorm] = {
          objectKey,
          uin: String(getRegistryRowSummary_(rowIndex).uin || '').trim()
        };
      }
      state.sharedSelectionWorkBatchSelectedByKey = next;
      renderRegistryView_();
    }

function buildSharedSelectionWorkBatchToastText_(result) {
      const action = normalizeSharedSelectionWorkBatchMode_(result && result.action || state.sharedSelectionWorkBatchPendingAction || getSharedSelectionWorkBatchMode_());
      const updatedCount = Number(result && result.updatedCount) || 0;
      const skippedCount = Number(result && result.skippedCount) || (Array.isArray(result && result.skipped) ? result.skipped.length : 0);
      if (action === 'take') {
        if (updatedCount && skippedCount) return `Выбрано: ${updatedCount}, пропущено: ${skippedCount}`;
        if (updatedCount) return updatedCount === 1 ? 'Объект выбран' : `Выбрано объектов: ${updatedCount}`;
        if (skippedCount) return skippedCount === 1 ? 'Выбор пропущен' : `Пропущено объектов: ${skippedCount}`;
        return 'Нечего выбирать';
      }
      if (updatedCount && skippedCount) return `Возвращено: ${updatedCount}, пропущено: ${skippedCount}`;
      if (updatedCount) return updatedCount === 1 ? 'Объект возвращен' : `Возвращено объектов: ${updatedCount}`;
      if (skippedCount) return skippedCount === 1 ? 'Отмена пропущена' : `Пропущено объектов: ${skippedCount}`;
      return 'Нечего отменять';
    }

function buildSharedSelectionWorkBatchRequestChunks_(selectionId, action, items) {
      return [{
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        selectionId: String(selectionId || '').trim(),
        action: normalizeSharedSelectionWorkBatchMode_(action),
        items: Array.isArray(items) ? items.filter(Boolean) : []
      }];
    }

function buildEmptySharedSelectionWorkBatchResult_(selectionId, action, options) {
      const settings = options || {};
      return {
        selectionId: String(selectionId || '').trim(),
        blockKey: normalizeText_(settings.blockKey || ''),
        blockName: String(settings.blockName || '').trim(),
        action: normalizeSharedSelectionWorkBatchMode_(action),
        requestedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        updatedItems: [],
        skipped: []
      };
    }

function mergeSharedSelectionWorkBatchResult_(target, incoming) {
      const out = target || buildEmptySharedSelectionWorkBatchResult_('', '');
      const result = incoming && typeof incoming === 'object' ? incoming : {};
      if (!out.selectionId) out.selectionId = String(result.selectionId || '').trim();
      if (!out.blockKey) out.blockKey = normalizeText_(result.blockKey || '');
      if (!out.blockName) out.blockName = String(result.blockName || '').trim();
      if (!out.action) out.action = normalizeSharedSelectionWorkBatchMode_(result.action);
      out.requestedCount += Number(result.requestedCount) || 0;
      out.updatedCount += Number(result.updatedCount) || 0;
      out.skippedCount += Number(result.skippedCount) || 0;
      out.updatedItems = out.updatedItems.concat(Array.isArray(result.updatedItems) ? result.updatedItems : []);
      out.skipped = out.skipped.concat(Array.isArray(result.skipped) ? result.skipped : []);
      return out;
    }

async function runSharedSelectionWorkBatchRequests_(selectionId, action, items) {
      const chunks = buildSharedSelectionWorkBatchRequestChunks_(selectionId, action, items);
      const fallbackBlockName = getCurrentUserBlockName_();
      const aggregated = buildEmptySharedSelectionWorkBatchResult_(selectionId, action, {
        blockKey: fallbackBlockName,
        blockName: fallbackBlockName
      });
      for (let i = 0; i < chunks.length; i++) {
        const result = await runServer_('saveSmartFilterShellSharedSelectionWorkBatch', [chunks[i]]);
        mergeSharedSelectionWorkBatchResult_(aggregated, result);
      }
      return aggregated;
    }

async function reconcileSharedSelectionWorkBatchAfterError_(error, options) {
      const settings = options || {};
      const selectionId = String(settings.selectionId || '').trim();
      const action = normalizeSharedSelectionWorkBatchMode_(settings.action);
      const selectedItems = Array.isArray(settings.selectedItems) ? settings.selectedItems.filter(Boolean) : [];
      if (!isAppsScriptApiTimeoutError_(error) || !selectionId || !action || !selectedItems.length) return null;

      const currentUserKey = buildCurrentUserWorkKey_();
      for (let attempt = 0; attempt < SHARED_SELECTION_RECONCILE_DELAYS_MS.length; attempt++) {
        if (attempt > 0) await waitMs_(SHARED_SELECTION_RECONCILE_DELAYS_MS[attempt]);
        await refreshActiveSharedSelectionWorkState_({ silent: true, skipRender: true });
        if (String(state.sharedSelectionWorkSelectionId || '').trim() !== selectionId) continue;

        const itemsByKey = state.sharedSelectionWorkItemsByKey || {};
        const reconciledItems = [];
        const allApplied = selectedItems.every(entry => {
          const objectKey = String(entry && entry.objectKey || '').trim();
          const objectKeyNorm = normalizeText_(objectKey);
          const item = objectKeyNorm ? itemsByKey[objectKeyNorm] || null : null;
          if (action === 'take') {
            const isMine = !!(
              item &&
              String(item.status || '').trim() === 'in_progress' &&
              String(item.assigneeKey || '').trim() === currentUserKey
            );
            if (!isMine) return false;
            reconciledItems.push(item);
            return true;
          }
          if (item) return false;
          reconciledItems.push({
            selectionId,
            blockKey: String(state.sharedSelectionWorkBlockKey || '').trim(),
            blockName: String(state.sharedSelectionWorkBlockName || '').trim(),
            objectKey,
            uin: String(entry && entry.uin || '').trim(),
            status: '',
            assigneeKey: '',
            assigneeName: '',
            updatedAt: '',
            updatedBy: ''
          });
          return true;
        });

        if (allApplied) {
          return {
            selectionId,
            blockKey: String(state.sharedSelectionWorkBlockKey || '').trim(),
            blockName: String(state.sharedSelectionWorkBlockName || '').trim(),
            action,
            requestedCount: selectedItems.length,
            updatedCount: selectedItems.length,
            skippedCount: 0,
            updatedItems: reconciledItems,
            skipped: [],
            reconciled: true
          };
        }
      }
      return null;
    }

async function applySharedSelectionWorkBatch_() {
      const activeSelection = getActiveRegistrySelection_();
      const batchMode = getSharedSelectionWorkBatchMode_();
      const selectedItems = getSharedSelectionWorkBatchSelectedEntries_();
      if (!batchMode || !isCollaborativeRegistrySelection_(activeSelection) || !getCurrentUserBlockName_() || !selectedItems.length) return null;
      if (state.sharedSelectionWorkBatchPendingAction) return null;
      const selectionId = String(activeSelection && activeSelection.id || '').trim();
      const fallbackBlockName = getCurrentUserBlockName_();
      const fallbackBlockKey = normalizeText_(fallbackBlockName);
      if (!selectionId) return null;
      state.sharedSelectionWorkBatchPendingAction = batchMode;
      renderRegistryView_();
      renderObjectView_();
      try {
        const result = await runSharedSelectionWorkBatchRequests_(selectionId, batchMode, selectedItems);
        if (String(state.activeRegistrySelectionId || '').trim() === selectionId) {
          const nextBlockKey = normalizeText_(result && result.blockKey || fallbackBlockKey);
          const nextBlockName = String(result && result.blockName || fallbackBlockName).trim();
          setSharedSelectionWorkState_(
            selectionId,
            nextBlockKey,
            nextBlockName,
            Object.values(state.sharedSelectionWorkItemsByKey || {})
          );
          (Array.isArray(result && result.updatedItems) ? result.updatedItems : []).forEach(item => {
            upsertSharedSelectionWorkItemLocally_(item);
          });
          window.setTimeout(() => {
            if (String(state.activeRegistrySelectionId || '').trim() !== selectionId) return;
            refreshActiveSharedSelectionWorkState_({ silent: true }).catch(() => null);
          }, 0);
        }
        clearSharedSelectionWorkBatchSelection_();
        showCopyToast_(buildSharedSelectionWorkBatchToastText_(result), false);
        return result;
      } catch (err) {
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return null;
        }
        const reconciled = await reconcileSharedSelectionWorkBatchAfterError_(err, {
          selectionId,
          action: batchMode,
          selectedItems
        });
        if (reconciled) {
          clearRuntimeError_();
          clearSharedSelectionWorkBatchSelection_();
          showCopyToast_(buildSharedSelectionWorkBatchToastText_(reconciled), false);
          return reconciled;
        }
        reportRuntimeError_(err, 'Ошибка пакетной работы с выборкой');
        return null;
      } finally {
        state.sharedSelectionWorkBatchPendingAction = '';
        renderSavedSelectionsPanel_();
        renderRegistryView_();
        renderObjectView_();
      }
    }

function getRegistryVisibleRowIndexes_() {
      const rows = Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes.slice() : [];
      const batchMode = getSharedSelectionWorkBatchMode_();
      if (!batchMode || !canUseSharedSelectionWorkBatchMode_()) return rows;
      return rows.filter(rowIndex => {
        const workState = getRegistryRowWorkState_(rowIndex);
        if (!workState || workState.mode !== 'shared') return false;
        return batchMode === 'take'
          ? !!workState.isFree
          : !!workState.canRelease;
      });
    }

function getRegistryRowWorkPendingAction_(rowIndex) {
      const activeSelection = getActiveRegistrySelection_();
      if (!isCollaborativeRegistrySelection_(activeSelection)) return '';
      if (String(state.sharedSelectionWorkSelectionId || '').trim() !== String(activeSelection && activeSelection.id || '').trim()) return '';
      const objectKeyNorm = normalizeText_(getRegistryRowWorkKey_(rowIndex));
      if (!objectKeyNorm) return '';
      return String((state.sharedSelectionWorkPendingByKey || {})[objectKeyNorm] || '').trim();
    }

function normalizeSharedSelectionWorkItem_(rawItem) {
      if (!rawItem || typeof rawItem !== 'object') return null;
      const objectKey = String(rawItem.objectKey || '').trim();
      if (!objectKey) return null;
      return {
        selectionId: String(rawItem.selectionId || '').trim(),
        blockKey: normalizeText_(rawItem.blockKey || ''),
        blockName: String(rawItem.blockName || '').trim(),
        objectKey,
        objectKeyNorm: normalizeText_(objectKey),
        uin: String(rawItem.uin || '').trim(),
        status: String(rawItem.status || '').trim(),
        assigneeKey: String(rawItem.assigneeKey || '').trim(),
        assigneeName: String(rawItem.assigneeName || '').trim(),
        updatedAt: String(rawItem.updatedAt || '').trim(),
        updatedBy: String(rawItem.updatedBy || '').trim()
      };
    }

function hasActiveSharedSelectionWork_() {
      const activeSelection = getActiveRegistrySelection_();
      return !!(isCollaborativeRegistrySelection_(activeSelection) && getCurrentUserBlockName_());
    }

function getActiveSharedSelectionWorkItem_(rowIndex) {
      const activeSelection = getActiveRegistrySelection_();
      if (!isCollaborativeRegistrySelection_(activeSelection)) return null;
      if (String(state.sharedSelectionWorkSelectionId || '').trim() !== String(activeSelection && activeSelection.id || '').trim()) return null;
      const objectKeyNorm = normalizeText_(getRegistryRowWorkKey_(rowIndex));
      if (!objectKeyNorm) return null;
      const itemsByKey = state.sharedSelectionWorkItemsByKey || {};
      return itemsByKey[objectKeyNorm] || null;
    }

function getRegistryRowWorkState_(rowIndex) {
      const activeSelection = getActiveRegistrySelection_();
      const activeSelectionId = String(activeSelection && activeSelection.id || '').trim();
      const userKey = buildCurrentUserWorkKey_();
      const pendingAction = getRegistryRowWorkPendingAction_(rowIndex);
      if (!activeSelectionId) {
        return { mode: 'none', status: '', isDone: false, isMine: false, isBusy: false, isFree: true, assigneeName: '', blockName: '', pendingAction: '', isPending: false, canRelease: false };
      }
      if (isCollaborativeRegistrySelection_(activeSelection)) {
        const blockName = getCurrentUserBlockName_();
        if (!blockName) {
          return { mode: 'shared-missing-block', status: '', isDone: false, isMine: false, isBusy: false, isFree: true, assigneeName: '', blockName: '', pendingAction, isPending: !!pendingAction, canRelease: false };
        }
        const item = getActiveSharedSelectionWorkItem_(rowIndex);
        const status = String(item && item.status || '').trim();
        const assigneeKey = String(item && item.assigneeKey || '').trim();
        const isOwnedByMe = !!assigneeKey && assigneeKey === userKey;
        return {
          mode: 'shared',
          status,
          item,
          assigneeName: String(item && item.assigneeName || '').trim(),
          blockName: String(state.sharedSelectionWorkBlockName || blockName).trim() || blockName,
          isDone: status === 'done',
          isMine: status === 'in_progress' && isOwnedByMe,
          isBusy: status === 'in_progress' && !!assigneeKey && assigneeKey !== userKey,
          isFree: !status,
          canRelease: !!status && (!assigneeKey || isOwnedByMe),
          pendingAction,
          isPending: !!pendingAction
        };
      }
      const done = getSelectionDoneRowKeys_(activeSelectionId).includes(getRegistryRowWorkKey_(rowIndex));
      return { mode: 'personal', status: done ? 'done' : '', isDone: done, isMine: false, isBusy: false, isFree: !done, assigneeName: '', blockName: '', pendingAction: '', isPending: false, canRelease: false };
    }

function getRegistryRowWorkNoteText_(rowIndex) {
      const stateInfo = getRegistryRowWorkState_(rowIndex);
      if (stateInfo.mode === 'shared-missing-block') return '';
      if (stateInfo.mode !== 'shared') return '';
      if (stateInfo.pendingAction) return getSharedSelectionWorkPendingText_(stateInfo.pendingAction);
      if (stateInfo.isDone) return `Выполнено${stateInfo.assigneeName ? `: ${stateInfo.assigneeName}` : ''}`;
      if (stateInfo.isMine) return 'У вас';
      if (stateInfo.isBusy) return stateInfo.assigneeName || 'Занят';
      return 'Свободен';
    }

function getRegistryRowWorkNoteClassName_(rowIndex) {
      const stateInfo = getRegistryRowWorkState_(rowIndex);
      if (stateInfo.pendingAction) return 'registry-work-note pending';
      if (stateInfo.isDone) return 'registry-work-note done';
      if (stateInfo.isMine) return 'registry-work-note mine';
      return 'registry-work-note';
    }

function getRegistryRowWorkKey_(rowIndex) {
      const summary = getRegistryRowSummary_(rowIndex);
      return String(summary.uin || summary.dsCode || summary.name || `row:${rowIndex}`).trim();
    }

function getActiveRegistrySelection_() {
      return findSavedRegistrySelectionById_(state.activeRegistrySelectionId);
    }

function hasActiveSavedSelection_() {
      return !!getActiveRegistrySelection_();
    }

function promptRegistrySelectionChoice_(message) {
      state.sidebarExpanded = true;
      state.sidebarActivePanel = 'projects';
      renderAll_();
      showCopyToast_(message || 'Выберите проект из списка', false);
    }

function editActiveRegistrySelectionOrPrompt_() {
      const active = getActiveRegistrySelection_();
      if (!active) {
        promptRegistrySelectionChoice_('Выберите проект из списка для редактирования');
        return;
      }
      if (!canEditSavedSelection_(active)) {
        showCopyToast_('Этот проект нельзя редактировать', true);
        return;
      }
      openRegistrySelectionComposer_(active.id);
    }

function removeActiveRegistrySelectionOrPrompt_() {
      const active = getActiveRegistrySelection_();
      if (!active) {
        promptRegistrySelectionChoice_('Выберите проект из списка для удаления');
        return;
      }
      if (!canRemoveSavedSelection_(active)) {
        showCopyToast_('Этот проект нельзя удалить', true);
        return;
      }
      removeSavedRegistrySelection_(active.id);
    }

function getActiveSelectionObjectPosition_(rowIndex) {
      if (!hasActiveSavedSelection_()) return null;
      const rowIndexes = Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes : [];
      if (!rowIndexes.length) return null;
      const position = rowIndexes.indexOf(Number(rowIndex));
      if (position < 0) return null;
      return {
        index: position + 1,
        total: rowIndexes.length
      };
    }

function findNextUndoneRowIndex_(currentRowIndex) {
      if (!hasActiveSavedSelection_()) return -1;
      const rowIndexes = Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes.slice() : [];
      if (!rowIndexes.length) return -1;
      const currentIndex = rowIndexes.indexOf(Number(currentRowIndex));
      const ordered = currentIndex >= 0
        ? rowIndexes.slice(currentIndex + 1).concat(rowIndexes.slice(0, currentIndex))
        : rowIndexes;
      const next = ordered.find(rowIndex => !isRegistryRowDone_(rowIndex));
      return Number.isFinite(next) ? next : -1;
    }

function findPrevUndoneRowIndex_(currentRowIndex) {
      if (!hasActiveSavedSelection_()) return -1;
      const rowIndexes = Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes.slice() : [];
      if (!rowIndexes.length) return -1;
      const currentIndex = rowIndexes.indexOf(Number(currentRowIndex));
      const ordered = currentIndex >= 0
        ? rowIndexes.slice(0, currentIndex).reverse().concat(rowIndexes.slice(currentIndex + 1).reverse())
        : rowIndexes.slice().reverse();
      const prev = ordered.find(rowIndex => !isRegistryRowDone_(rowIndex));
      return Number.isFinite(prev) ? prev : -1;
    }

function isRegistryRowDone_(rowIndex) {
      return !!getRegistryRowWorkState_(rowIndex).isDone;
    }

function getSelectionDoneRowKeys_(selectionId) {
      const key = String(selectionId || '').trim();
      if (!key) return [];
      return Array.isArray(state.selectionDoneById[key]) ? state.selectionDoneById[key].slice() : [];
    }

function countDoneRowsInActiveSelection_() {
      if (!hasActiveSavedSelection_()) return { done: 0, total: 0 };
      const rowIndexes = Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes : [];
      const done = rowIndexes.reduce((count, rowIndex) => count + (isRegistryRowDone_(rowIndex) ? 1 : 0), 0);
      return {
        done,
        total: rowIndexes.length
      };
    }

function getActiveSelectionProgressText_() {
      const progress = countDoneRowsInActiveSelection_();
      if (!progress.total) return 'Активный проект';
      const activeSelection = getActiveRegistrySelection_();
      if (isCollaborativeRegistrySelection_(activeSelection) && !getCurrentUserBlockName_()) {
        return getCollaborativeSelectionDivisionMessage_(activeSelection);
      }
      if (hasActiveSharedSelectionWork_()) return `Блок выполнил: ${progress.done} из ${progress.total}`;
      return `Выполнено: ${progress.done} из ${progress.total}`;
    }

function formatRegistryFacetMeta_(def, selection) {
      if (selection == null || selection === '' || selection === '__all__') return '';
      if (isMonitoringDateFacetDef_(def)) return formatMonitoringDateFacetMeta_(selection);
      if (isNumberRangeFacetDef_(def)) return formatNumberRangeFacetMeta_(selection, def && def.title || 'Диапазон');
      if (isDateRangeFacetDef_(def)) return formatDateRangeFacetMeta_(selection, def && def.title || 'Дата');
      if (Array.isArray(selection)) {
        if (!selection.length) return `${def.title}: ничего не выбрано`;
        if (selection.length === 1) return `${def.title}: ${selection[0]}`;
        return `${def.title}: ${selection.length} выбр.`;
      }
      return `${def.title}: ${selection}`;
    }

function normalizeStoredRegistryFacetFilters_(rawFilters) {
      const source = rawFilters || {};
      const out = buildEmptyRegistryFacetFilters_();
      REGISTRY_FILTER_DEFS.forEach(def => {
        const rawValue = source[def.key];
        if (isMonitoringDateFacetDef_(def)) {
          out[def.key] = normalizeMonitoringDateFacetFilter_(rawValue);
        } else if (isNumberRangeFacetDef_(def)) {
          out[def.key] = normalizeNumberRangeFacetFilter_(rawValue);
        } else if (isDateRangeFacetDef_(def)) {
          out[def.key] = normalizeDateRangeFacetFilter_(rawValue);
        } else if (rawValue == null || rawValue === '' || rawValue === '__all__') {
          out[def.key] = null;
        } else if (Array.isArray(rawValue)) {
          out[def.key] = rawValue.map(value => String(value || '')).filter(Boolean);
        } else {
          out[def.key] = [String(rawValue)];
        }
      });
      return out;
    }

function matchesSectionFieldSpec_(column, spec) {
      if (!column || !spec) return false;
      const wantedIds = new Set((Array.isArray(spec.fieldIds) ? spec.fieldIds : []).map(normalizeText_).filter(Boolean));
      const wantedLabels = new Set((Array.isArray(spec.labels) ? spec.labels : []).map(normalizeText_).filter(Boolean));
      const grouped = splitGroupedFieldLabel_(column.label);
      const groupedTitle = normalizeText_(grouped && grouped.title || '');
      return (
        (!!wantedIds.size && wantedIds.has(column.normFieldId)) ||
        (!!wantedLabels.size && wantedLabels.has(column.normLabel)) ||
        (!!spec.matchGroupedTitle && !!wantedLabels.size && !!groupedTitle && wantedLabels.has(groupedTitle))
      );
    }

function scoreSectionFieldSpecMatch_(column, spec) {
      if (!matchesSectionFieldSpec_(column, spec)) return -1;
      const wantedIds = new Set((Array.isArray(spec.fieldIds) ? spec.fieldIds : []).map(normalizeText_).filter(Boolean));
      const wantedLabels = new Set((Array.isArray(spec.labels) ? spec.labels : []).map(normalizeText_).filter(Boolean));
      const grouped = splitGroupedFieldLabel_(column.label);
      const groupedTitle = normalizeText_(grouped && grouped.title || '');
      const byId = wantedIds.has(column.normFieldId);
      const byLabel = wantedLabels.has(column.normLabel);
      const byGroupedTitle = !!spec.matchGroupedTitle && !!groupedTitle && wantedLabels.has(groupedTitle);
      if (byId && byGroupedTitle) return 4;
      if (byId && byLabel) return 3;
      if (byGroupedTitle) return 2;
      if (byLabel) return 2;
      if (byId) return 1;
      return 0;
    }

function pickBestSectionFieldForSpec_(fields, section, spec, usedIndexes) {
      const taken = usedIndexes instanceof Set ? usedIndexes : new Set();
      const candidates = (Array.isArray(fields) ? fields : [])
        .filter(column => !taken.has(column.index))
        .map(column => ({
          column,
          score: scoreSectionFieldSpecMatch_(column, spec),
          sourceScore: matchesSourceFilter_(column, section && section.sourceKey) ? 1 : 0
        }))
        .filter(item => item.score >= 0)
        .sort((a, b) => {
          if (a.sourceScore !== b.sourceScore) return b.sourceScore - a.sourceScore;
          if (a.score !== b.score) return b.score - a.score;
          return Number(a.column.index) - Number(b.column.index);
        });
      return candidates.length ? candidates[0].column : null;
    }

function collectSectionFieldsForSpec_(fields, section, spec, usedIndexes) {
      const taken = usedIndexes instanceof Set ? usedIndexes : new Set();
      const candidates = (Array.isArray(fields) ? fields : [])
        .filter(column => isRenderableSectionColumn_(column))
        .filter(column => !taken.has(column.index))
        .filter(column => matchesSectionFieldSpec_(column, spec));
      if (!candidates.length) return [];
      const preferred = candidates
        .filter(column => matchesSourceFilter_(column, section && section.sourceKey));
      const list = preferred.length ? preferred : candidates;
      if (!spec || !spec.collectAllMatches) {
        const single = pickBestSectionFieldForSpec_(list, section, spec, taken);
        return single ? [single] : [];
      }
      return list
        .slice()
        .sort((a, b) => Number(a.index) - Number(b.index));
    }

function hasSectionFieldSpecs_(section) {
      return !!(section && Array.isArray(section.fieldSpecs) && section.fieldSpecs.length);
    }

function isRenderableSectionColumn_(column) {
      const fieldId = String(column && column.fieldId || '').trim();
      const sourceRaw = String(column && column.sourceRaw || '').trim();
      return !!fieldId && !!sourceRaw;
    }

function getSectionSourceFields_(allColumns, section) {
      return (Array.isArray(allColumns) ? allColumns : [])
        .filter(column => isRenderableSectionColumn_(column))
        .filter(column => matchesSourceFilter_(column, section && section.sourceKey));
    }

function resolveSectionFieldsBySpecs_(allColumns, section) {
      if (!hasSectionFieldSpecs_(section)) return [];
      const orderedFields = [];
      const seenIndexes = new Set();
      section.fieldSpecs.forEach(spec => {
        const matches = collectSectionFieldsForSpec_(allColumns, section, spec, seenIndexes);
        if (!matches.length) return;
        matches.forEach(match => {
          seenIndexes.add(match.index);
          orderedFields.push(match);
        });
      });
      return orderedFields;
    }

function resolveSectionFieldsByIds_(allColumns, section) {
      const wanted = new Set(
        (Array.isArray(section && section.fieldIds) ? section.fieldIds : [])
          .map(normalizeText_)
          .filter(Boolean)
      );
      if (!wanted.size) return [];
      const sourceFields = getSectionSourceFields_(allColumns, section);
      const sourceMatches = sourceFields.filter(column => wanted.has(column.normFieldId));
      const fallbackMatches = sourceMatches.length
        ? sourceMatches
        : (Array.isArray(allColumns) ? allColumns : [])
          .filter(column => isRenderableSectionColumn_(column))
          .filter(column => wanted.has(column.normFieldId));
      const orderMap = new Map(
        (Array.isArray(section && section.fieldIds) ? section.fieldIds : [])
          .map((fieldId, index) => [normalizeText_(fieldId), index])
      );
      return fallbackMatches
        .slice()
        .sort((a, b) => (orderMap.get(a.normFieldId) ?? 9999) - (orderMap.get(b.normFieldId) ?? 9999));
    }

function applySectionFieldPostFilters_(fields, section, rowIndex) {
      let filtered = Array.isArray(fields) ? fields.slice() : [];
      filtered = filtered.filter(column => isRenderableSectionColumn_(column));
      if (section && section.excludePinned) filtered = filtered.filter(column => !column.isPinned);
      if (section && section.mode === 'filled') filtered = filtered.filter(column => !!getCellValue_(rowIndex, column.index));
      else if (section && section.mode === 'empty') filtered = filtered.filter(column => !getCellValue_(rowIndex, column.index));
      return filtered.filter(column => !shouldHideSectionField_(section, column));
    }

function getSectionFields_(section, rowIndex) {
      const allColumns = Array.isArray(state.columns) ? state.columns : [];
      let fields = [];
      if (hasSectionFieldSpecs_(section)) {
        fields = resolveSectionFieldsBySpecs_(allColumns, section);
      } else if (Array.isArray(section && section.fieldIds) && section.fieldIds.length) {
        fields = resolveSectionFieldsByIds_(allColumns, section);
      } else {
        fields = getSectionSourceFields_(allColumns, section);
      }
      return applySectionFieldPostFilters_(fields, section, rowIndex);
    }

function shouldHideSectionField_(section, column) {
      const sourceKey = String(section && section.sourceKey || '').trim();
      const labelKey = normalizeText_(column && column.label || '');
      if (!labelKey) return false;

      if (sourceKey === '__suid__') {
        return (
          /неустраненн.*замечани.*просрочен/.test(labelKey) ||
          (/дата обновлени/.test(labelKey) && /суид/.test(labelKey))
        );
      }

      return false;
    }

function matchesSourceFilter_(column, sourceKey) {
      if (!column) return false;
      if (sourceKey === '__all__') return true;
      if (sourceKey === '__objects__') return /^sm_/i.test(column.fieldId) || /^os_/i.test(column.fieldId) || /строительный мониторинг/i.test(column.sourceLabel) || /объекты строительства/i.test(column.sourceLabel);
      if (sourceKey === '__ksg__') return /^ksg_/i.test(column.fieldId) || /ксг/i.test(column.sourceLabel);
      if (sourceKey === '__suid__') return /^suid_/i.test(column.fieldId) || /суид/i.test(column.sourceLabel);
      if (sourceKey === '__lab__') return /^lb_/i.test(column.fieldId) || /лаборатор/i.test(column.sourceLabel);
      if (sourceKey === '__ppr__') return /^ppr_/i.test(column.fieldId) || /^koo_/i.test(column.fieldId) || /проблематик/i.test(column.sourceLabel) || /прогноз/i.test(column.sourceLabel) || /риск/i.test(column.sourceLabel) || /комплексн/i.test(column.sourceLabel) || /оценк/i.test(column.sourceLabel);
      if (sourceKey === '__mgz__') return /^mgz_/i.test(column.fieldId) || /мгз/i.test(column.sourceLabel);
      if (String(sourceKey || '').startsWith('src:')) return column.sourceKey === sourceKey;
      return false;
    }

function getObjectSummary_(rowIndex) {
      return {
        uin: readCurrentValueBySpec_(rowIndex, UIN_SPEC),
        dsCode: readCurrentValueBySpec_(rowIndex, DS_CODE_SPEC),
        name: readCurrentValueBySpec_(rowIndex, OBJECT_NAME_SPEC),
        status: readCurrentValueBySpec_(rowIndex, PINNED_FIELDS[0]),
        customer: readCurrentValueBySpec_(rowIndex, PINNED_FIELDS[2]),
        contractor: readCurrentValueBySpec_(rowIndex, PINNED_FIELDS[3])
      };
    }

function findColumnBySpec_(spec) {
      const ids = Array.isArray(spec && spec.ids) ? spec.ids.map(normalizeText_) : [];
      const labels = Array.isArray(spec && spec.labels) ? spec.labels.map(normalizeText_) : [];
      return state.columns.find(column => (ids.length && ids.includes(column.normFieldId)) || (labels.length && labels.includes(column.normLabel))) || null;
    }

function hasAnyRegistryColumnSpecs_(specs) {
      return (Array.isArray(specs) ? specs : []).some(spec => !!findColumnBySpec_(spec));
    }

function findColumnByFieldId_(fieldId) {
      const normFieldId = normalizeText_(fieldId);
      if (!normFieldId) return null;
      return state.columns.find(column => column.normFieldId === normFieldId) || null;
    }

function getMgzBudgetProgressColumns_() {
      const contractSum = findColumnByFieldId_(MGZ_AUTO_CALC_FIELD_IDS.contractSum);
      const financed = findColumnByFieldId_(MGZ_AUTO_CALC_FIELD_IDS.financed);
      const budgetProgress = findColumnByFieldId_(MGZ_AUTO_CALC_FIELD_IDS.budgetProgress);
      if (!budgetProgress) return null;
      return { contractSum, financed, budgetProgress };
    }

function parseLocaleNumber_(value) {
      const raw = String(value == null ? '' : value)
        .replace(/\u00A0/g, ' ')
        .trim();
      if (!raw) return null;
      let normalized = raw
        .replace(/\s+/g, '')
        .replace(/%/g, '');
      if (normalized.includes(',') && normalized.includes('.')) {
        normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
          ? normalized.replace(/\./g, '').replace(',', '.')
          : normalized.replace(/,/g, '');
      } else {
        normalized = normalized.replace(',', '.');
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

function formatCalculatedPercentValue_(value) {
      if (!Number.isFinite(value)) return '';
      const rounded = Math.round(value * 100) / 100;
      return String(rounded.toFixed(2))
        .replace(/\.?0+$/g, '')
        .replace('.', ',');
    }

function buildMgzBudgetProgressValue_(rowIndex) {
      const columns = getMgzBudgetProgressColumns_();
      if (!columns || !columns.contractSum || !columns.financed) return '';
      const contractSum = parseLocaleNumber_(getDirectCellValue_(rowIndex, columns.contractSum.index));
      const financed = parseLocaleNumber_(getDirectCellValue_(rowIndex, columns.financed.index));
      if (!Number.isFinite(contractSum) || !Number.isFinite(financed) || contractSum <= 0) return '';
      return formatCalculatedPercentValue_((financed * 100) / contractSum);
    }

function getAutoCalculatedCellValueInfo_(rowIndex, colIndex) {
      const columns = getMgzBudgetProgressColumns_();
      if (!columns || !columns.budgetProgress) return null;
      if (Number(columns.budgetProgress.index) !== Number(colIndex)) return null;
      return {
        key: MGZ_AUTO_CALC_FIELD_IDS.budgetProgress,
        value: buildMgzBudgetProgressValue_(rowIndex)
      };
    }

function isAutoCalculatedFieldColumn_(colIndex) {
      return !!getAutoCalculatedCellValueInfo_(-1, colIndex);
    }

function shouldSyncAutoCalculatedFieldsForColumn_(colIndex) {
      const columns = getMgzBudgetProgressColumns_();
      if (!columns) return false;
      return [
        columns.contractSum && Number(columns.contractSum.index),
        columns.financed && Number(columns.financed.index),
        columns.budgetProgress && Number(columns.budgetProgress.index)
      ].includes(Number(colIndex));
    }

function getCellValue_(rowIndex, colIndex) {
      const autoCalculated = getAutoCalculatedCellValueInfo_(rowIndex, colIndex);
      if (autoCalculated) return String(autoCalculated.value || '');
      return getDirectCellValue_(rowIndex, colIndex);
    }

function getDirectCellValue_(rowIndex, colIndex) {
      const row = Number.isFinite(rowIndex) && rowIndex >= 0 ? (state.rows[rowIndex] || []) : [];
      const edited = getEditedValue_(rowIndex, colIndex);
      if (edited !== null) return String(edited);
      return getCellValueFromRow_(row, colIndex);
    }

function getCellValueFromRow_(row, colIndex) {
      return String(row && row[colIndex] != null ? row[colIndex] : '').trim();
    }

function getEditedValue_(rowIndex, colIndex) {
      const rowMap = state.editsByRow.get(Number(rowIndex));
      return rowMap && rowMap.has(Number(colIndex)) ? rowMap.get(Number(colIndex)) : null;
    }

function hasEditedValue_(rowIndex, colIndex) {
      const rowMap = state.editsByRow.get(Number(rowIndex));
      return !!(rowMap && rowMap.has(Number(colIndex)));
    }

    // ----- Write -----

function saveSharedSelectionWorkStateForRow_(rowIndex, action, options) {
      const settings = options || {};
      const activeSelection = getActiveRegistrySelection_();
      if (!Number.isFinite(rowIndex) || rowIndex < 0 || !isCollaborativeRegistrySelection_(activeSelection) || !getCurrentUserBlockName_()) {
        return Promise.resolve(null);
      }
      const objectKey = String(getRegistryRowWorkKey_(rowIndex) || '').trim();
      if (!objectKey) return Promise.resolve(null);
      const pendingAction = getRegistryRowWorkPendingAction_(rowIndex);
      if (pendingAction) return Promise.resolve(null);
      const summary = getRegistryRowSummary_(rowIndex);
      setRegistryRowWorkPendingAction_(rowIndex, action);
      if (settings.showPending !== false) {
        renderSavedSelectionsPanel_();
        renderRegistryView_();
        renderObjectView_();
      }
      return runServer_('saveSmartFilterShellSharedSelectionWorkState', [{
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        selectionId: String(activeSelection.id || '').trim(),
        objectKey,
        uin: String(summary && summary.uin || '').trim(),
        action
      }])
        .then(result => {
          if (result && result.item) upsertSharedSelectionWorkItemLocally_(result.item);
          return result;
        })
        .catch(err => {
          if (isUnauthorizedError_(err)) {
            handleUnauthorized_();
            return null;
          }
          setRegistryRowWorkPendingAction_(rowIndex, '');
          if (settings.suppressError) return null;
          refreshActiveSharedSelectionWorkState_({ silent: true });
          reportRuntimeError_(err, 'Ошибка статуса выборки');
          return null;
        })
        .finally(() => {
          setRegistryRowWorkPendingAction_(rowIndex, '');
          if (!settings.skipRender) {
            renderSavedSelectionsPanel_();
            renderRegistryView_();
            renderObjectView_();
          }
        });
    }

function syncAutoCalculatedFieldsForRow_(rowIndex) {
      const columns = getMgzBudgetProgressColumns_();
      if (!columns || !columns.budgetProgress) return;
      writeEditedValueCore_(rowIndex, columns.budgetProgress.index, buildMgzBudgetProgressValue_(rowIndex));
      syncAutoCalculatedFieldUi_(rowIndex);
    }

function writeEditedValueCore_(rowIndex, colIndex, value) {
      const row = state.rows[rowIndex] || [];
      const normalized = String(value == null ? '' : value);
      const original = getCellValueFromRow_(row, colIndex);
      invalidateRegistryDerivedCaches_(rowIndex);
      state.objectSaveMessage = '';
      state.objectSaveError = '';
      state.objectSaveVisual = 'idle';
      let rowMap = state.editsByRow.get(Number(rowIndex));
      if (normalized === original) {
        if (!rowMap) return;
        rowMap.delete(Number(colIndex));
        if (!rowMap.size) state.editsByRow.delete(Number(rowIndex));
        syncObjectSaveUi_();
        return;
      }
      if (!rowMap) {
        rowMap = new Map();
        state.editsByRow.set(Number(rowIndex), rowMap);
      }
      rowMap.set(Number(colIndex), normalized);
      syncObjectSaveUi_();
    }

function setEditedValue_(rowIndex, colIndex, value, options) {
      const settings = options || {};
      const column = state.columns[Number(colIndex)];
      const fieldId = normalizeText_(column && column.fieldId || '');
      if (isGoogleOwnedHtmlFieldId_(fieldId) && !settings.allowGoogleOwnedTarget) return;
      if (isAutoCalculatedFieldColumn_(colIndex) && !settings.allowAutoCalculatedTarget) return;
      writeEditedValueCore_(rowIndex, colIndex, value);
      if (!settings.skipAutoCalculatedSync && (settings.forceAutoCalculatedSync || shouldSyncAutoCalculatedFieldsForColumn_(colIndex))) {
        syncAutoCalculatedFieldsForRow_(rowIndex);
      }
    }

    // ----- Mutate state -----

function invalidateRegistryDerivedCaches_(rowIndex) {
      state.registryFacetValuesCache.clear();
      if (Number.isFinite(rowIndex) && rowIndex >= 0) {
        state.registryRowSummaryCache.delete(Number(rowIndex));
      } else {
        state.registryRowSummaryCache = new Map();
      }
    }

function trySetInputSelectionToEnd_(input) {
      if (!input || typeof input.setSelectionRange !== 'function') return;
      const inputType = String(input.type || '').trim().toLowerCase();
      if (/^(date|datetime-local|month|time|week|color|range)$/.test(inputType)) return;
      try {
        const value = String(input.value || '');
        input.setSelectionRange(value.length, value.length);
      } catch (error) {}
    }

function updateRegistryFacetSearch_(facetKey, value) {
      const text = String(value || '');
      state.registryFacetQueries[facetKey] = text;
      renderRegistryFacetControlFast_(facetKey);
      const input = document.querySelector(`[data-registry-filter-search="${facetKey}"]`);
      if (input) {
        input.focus();
        trySetInputSelectionToEnd_(input);
      }
    }

function applyObjectFilters_() {
      const bulkUinOrder = buildRegistryBulkUinOrderMap_(state.bulkUinText);
      const bulkUinSet = bulkUinOrder.size ? new Set(Array.from(bulkUinOrder.keys())) : new Set();
      const searchTokens = tokenize_(state.objectQuery);
      const filtered = [];
      for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex++) {
        if (
          matchesRegistryBulkUin_(rowIndex, bulkUinSet) &&
          matchesRegistrySearch_(rowIndex, searchTokens) &&
          matchesRegistryFacetFilters_(rowIndex, state.registryFacetFilters)
        ) {
          if (bulkUinOrder.size) {
            const currentUinNorm = normalizeText_(getRegistrySummaryValue_(rowIndex, 'uin'));
            filtered.push({
              rowIndex,
              bulkOrder: bulkUinOrder.has(currentUinNorm)
                ? bulkUinOrder.get(currentUinNorm)
                : Number.MAX_SAFE_INTEGER
            });
          } else {
            filtered.push(rowIndex);
          }
        }
      }
      state.filteredRowIndexes = bulkUinOrder.size
        ? filtered
            .sort((a, b) => {
              if (a.bulkOrder !== b.bulkOrder) return a.bulkOrder - b.bulkOrder;
              return a.rowIndex - b.rowIndex;
            })
            .map(item => item.rowIndex)
        : filtered;
      pruneSharedSelectionWorkBatchSelection_();
      syncRegistrySelectionDraftFromFilteredRows_();
    }

function ensureObjectSelection_() {
      if (!state.filteredRowIndexes.length) {
        if (
          state.currentView === 'object' &&
          Number.isFinite(state.selectedRowIndex) &&
          state.selectedRowIndex >= 0 &&
          state.selectedRowIndex < state.rows.length
        ) return;
        state.selectedRowIndex = -1;
        return;
      }
      if (
        state.currentView === 'object' &&
        Number.isFinite(state.selectedRowIndex) &&
        state.selectedRowIndex >= 0 &&
        state.selectedRowIndex < state.rows.length
      ) return;
      if (state.selectedRowIndex >= 0 && state.filteredRowIndexes.includes(state.selectedRowIndex)) return;
      state.selectedRowIndex = state.filteredRowIndexes[0];
    }

function syncObjectTabsState_() {
      const maxRows = Array.isArray(state.rows) ? state.rows.length : 0;
      const tabs = normalizeStoredObjectTabRowIndexes_(state.objectTabRowIndexes)
        .filter(rowIndex => rowIndex < maxRows);
      const selectedRowIndex = Number(state.selectedRowIndex);
      const hasSelectedRow = Number.isFinite(selectedRowIndex) && selectedRowIndex >= 0 && selectedRowIndex < maxRows;
      if (state.currentView === 'object' && hasSelectedRow && !tabs.includes(selectedRowIndex)) tabs.push(selectedRowIndex);
      state.objectTabRowIndexes = tabs;
      if (state.currentView !== 'object') return;
      if (hasSelectedRow && tabs.includes(selectedRowIndex)) return;
      if (tabs.length) {
        state.selectedRowIndex = tabs[tabs.length - 1];
        return;
      }
      state.selectedRowIndex = hasSelectedRow ? selectedRowIndex : -1;
      state.currentView = 'registry';
    }

function updateRegistryFacetFilter_(facetKey, value) {
      const exists = REGISTRY_FILTER_DEFS.some(def => def.key === facetKey);
      if (!exists) return;
      state.registryFacetFilters[facetKey] = value;
      syncRegistrySelectionMatchState_();
      applyObjectFilters_();
      ensureObjectSelection_();
      persistRegistrySessionState_();
      renderSavedSelectionsPanel_();
      renderRegistryView_();
    }

function toggleRegistryFacetAll_(facetKey) {
      const values = getRegistryFacetAvailableValues_(facetKey);
      const current = normalizeRegistryFacetSelection_(state.registryFacetFilters[facetKey], values);
      updateRegistryFacetFilter_(facetKey, isRegistryFacetAllSelected_(current, values) ? [] : null);
    }

function toggleRegistryFacetOption_(facetKey, value) {
      const values = getRegistryFacetAvailableValues_(facetKey);
      const textNorm = normalizeText_(value);
      const text = values.find(item => normalizeText_(item) === textNorm) || '';
      if (!text) return;
      const current = normalizeRegistryFacetSelection_(state.registryFacetFilters[facetKey], values);
      let next;
      if (current === null) {
        next = values.filter(item => normalizeText_(item) !== textNorm);
      } else {
        next = current.slice();
        if (next.some(item => normalizeText_(item) === textNorm)) {
          next = next.filter(item => normalizeText_(item) !== textNorm);
        } else {
          next.push(text);
        }
      }
      next = normalizeRegistryFacetSelection_(next, values);
      if (isRegistryFacetAllSelected_(next, values)) next = null;
      updateRegistryFacetFilter_(facetKey, next);
    }

function toggleRegistryFilterMenu_(facetKey) {
      state.openRegistryFilterKey = state.openRegistryFilterKey === facetKey ? '' : facetKey;
      if (state.openRegistryFilterKey === facetKey) renderRegistryFacetControlFast_(facetKey);
      renderRegistryFilterUi_();
    }

function closeRegistryFilterMenus_() {
      if (!state.openRegistryFilterKey) return;
      state.openRegistryFilterKey = '';
      renderRegistryFilterUi_();
    }

function createPresetSection_(key) {
      const def = QUICK_PRESET_DEFS[key];
      if (!def) return null;
      const selectedKeys = normalizePresetSelectionKeys_(key, state.presetSelections[key]);
      if (!selectedKeys.length) return null;
      if (def.inDevelopment) {
        return {
          id: `preset:${key}:stub`,
          presetKey: key,
          optionKeys: selectedKeys.slice(),
          title: def.label,
          subtitle: 'В разработке',
          sourceKey: def.sourceKey,
          fieldIds: [],
          fieldSpecs: [],
          mode: 'stub',
          excludePinned: !!def.excludePinned,
          stubMessage: String(def.inDevelopmentMessage || `${def.label} в разработке.`).trim()
        };
      }
      const options = (def.options || []).filter(item => selectedKeys.includes(item.key));
      if (!options.length) return null;
      if (def.multiSelect) {
        const allSelected = selectedKeys.includes('__all__');
        const allOption = (def.options || []).find(item => item.key === '__all__');
        const title = def.label;
        const subtitle = allSelected
          ? String(allOption && allOption.subtitle || `Все позиции блока "${def.label}"`)
          : options.map(item => item.dropdownLabel).join(', ');
        const fieldIds = allSelected ? [] : buildPresetSectionFieldIds_(options);
        const fieldSpecs = allSelected ? [] : buildPresetSectionFieldSpecs_(options);
        return {
          id: `preset:${key}:${selectedKeys.slice().sort().join('|')}`,
          presetKey: key,
          optionKeys: selectedKeys.slice(),
          title,
          subtitle,
          sourceKey: def.sourceKey,
          fieldIds,
          fieldSpecs,
          mode: 'all',
          excludePinned: !!def.excludePinned
        };
      }
      const optionKey = selectedKeys[0];
      const option = options[0];
      return {
        id: `preset:${key}:${option.key}`,
        presetKey: key,
        optionKey: option.key,
        optionKeys: [option.key],
        title: option.title,
        subtitle: option.subtitle,
        sourceKey: def.sourceKey,
        fieldIds: buildPresetSectionFieldIds_([option]),
        fieldSpecs: buildPresetSectionFieldSpecs_([option]),
        mode: option.mode,
        excludePinned: !!def.excludePinned
      };
    }

function toggleQuickPresetMenu_(key) {
      if (!QUICK_PRESET_DEFS[key]) return;
      state.openPresetMenuKey = state.openPresetMenuKey === key ? '' : key;
      renderQuickPresetState_();
    }

function closeQuickPresetMenus_() {
      if (!state.openPresetMenuKey) return;
      state.openPresetMenuKey = '';
      renderQuickPresetState_();
    }

function applyQuickPresetOption_(key, optionKey) {
      const def = QUICK_PRESET_DEFS[key];
      if (!def || !(def.options || []).some(option => option.key === optionKey)) return;
      if (def.multiSelect) {
        const current = normalizePresetSelectionKeys_(key, state.presetSelections[key]);
        let next = current.slice();
        if (optionKey === '__all__') {
          next = ['__all__'];
        } else if (current.includes(optionKey)) {
          next = current.filter(item => item !== optionKey && item !== '__all__');
        } else {
          next = current.filter(item => item !== '__all__').concat(optionKey);
        }
        state.presetSelections[key] = next;
      } else {
        state.presetSelections[key] = optionKey;
      }
      const nextSection = createPresetSection_(key);
      const existingIndex = state.activeSections.findIndex(section => section && section.presetKey === key);
      if (!nextSection) {
        if (existingIndex >= 0) state.activeSections.splice(existingIndex, 1);
        renderAll_();
        return;
      }
      if (existingIndex >= 0) state.activeSections.splice(existingIndex, 1, nextSection);
      else state.activeSections.push(nextSection);
      if (!def.multiSelect) state.openPresetMenuKey = '';
      state.sidebarActivePanel = 'categories';
      if (state.selectedRowIndex >= 0) state.currentView = 'object';
      renderAll_();
    }

function removeSection_(id) {
      state.activeSections = state.activeSections.filter(section => section.id !== id);
      if (state.sectionEditingId === id) {
        state.sectionEditingId = '';
        state.sectionEditSnapshot = new Map();
      }
      renderAll_();
    }

function resetSections_() {
      state.presetSelections = buildDefaultPresetSelections_();
      state.activeSections = [];
      state.openPresetMenuKey = '';
      state.headerEditing = false;
      state.headerEditSnapshot = new Map();
      state.passportEditing = false;
      state.passportEditSnapshot = new Map();
      state.sectionEditingId = '';
      state.sectionEditSnapshot = new Map();
      state.pendingFocusFieldKey = '';
      renderAll_();
    }

function hasActiveRegistryFilters_() {
      if (String(state.objectQuery || '').trim()) return true;
      if (parseRegistryBulkUinText_(state.bulkUinText).length) return true;
      return REGISTRY_FILTER_DEFS.some(def => {
        const selection = state.registryFacetFilters[def.key];
        return isRegistryFacetSelectionActive_(def, selection);
      });
    }

function getRegistryBulkDraftText_() {
      return state.registryBulkDraftText === null
        ? String(state.bulkUinText || '')
        : String(state.registryBulkDraftText || '');
    }

function focusRegistryFilterInput_(bulkMode) {
      window.requestAnimationFrame(() => {
        const target = el(bulkMode ? 'registryBulkUinInput' : 'registrySearchInput');
        if (!target) return;
        target.focus();
        trySetInputSelectionToEnd_(target);
      });
    }

function applyRegistryBulkUinInput_() {
      const input = el('registryBulkUinInput');
      const nextValue = String(input && input.value || getRegistryBulkDraftText_());
      state.objectQuery = '';
      state.bulkUinText = nextValue;
      state.registryBulkDraftText = nextValue;
      state.registryBulkOpen = true;
      const searchInput = el('registrySearchInput');
      if (searchInput) searchInput.value = '';
      closeRegistryFilterMenus_();
      syncRegistryBulkUinUi_();
      syncRegistrySelectionMatchState_();
      applyObjectFilters_();
      ensureObjectSelection_();
      persistRegistrySessionState_();
      renderAll_();
    }

function clearRegistryBulkUinInput_() {
      state.bulkUinText = '';
      state.registryBulkDraftText = '';
      state.registryBulkOpen = true;
      syncRegistryBulkUinUi_();
      syncRegistrySelectionMatchState_();
      applyObjectFilters_();
      ensureObjectSelection_();
      persistRegistrySessionState_();
      renderAll_();
      focusRegistryFilterInput_(true);
    }

function toggleRegistryFilterMode_() {
      if (hasActiveRegistryFilters_()) {
        resetRegistryFilters_();
        return;
      }
      state.registryBulkOpen = !state.registryBulkOpen;
      if (state.registryBulkDraftText === null) state.registryBulkDraftText = String(state.bulkUinText || '');
      closeRegistryFilterMenus_();
      syncRegistryBulkUinUi_();
      persistRegistrySessionState_();
      focusRegistryFilterInput_(state.registryBulkOpen);
    }

function resetRegistryFilters_() {
      state.objectQuery = '';
      state.bulkUinText = '';
      state.registryBulkDraftText = null;
      state.registryBulkOpen = false;
      state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      const searchInput = el('registrySearchInput');
      if (searchInput) searchInput.value = '';
      const bulkInput = el('registryBulkUinInput');
      if (bulkInput) bulkInput.value = '';
      closeRegistryFilterMenus_();
      syncRegistryBulkUinUi_();
      syncRegistrySelectionMatchState_();
      applyObjectFilters_();
      ensureObjectSelection_();
      persistRegistrySessionState_();
      renderAll_();
    }

function clearSharedSelectionWorkState_() {
      state.sharedSelectionWorkSelectionId = '';
      state.sharedSelectionWorkBlockKey = '';
      state.sharedSelectionWorkBlockName = '';
      state.sharedSelectionWorkItemsByKey = {};
      state.sharedSelectionWorkPendingByKey = {};
      clearSharedSelectionWorkBatchSelection_();
    }

function hasPendingSharedSelectionWorkActions_() {
      return !!(
        Object.keys(state.sharedSelectionWorkPendingByKey || {}).length > 0 ||
        state.sharedSelectionWorkBatchPendingAction
      );
    }

function syncSharedSelectionWorkStateForActiveSelection_() {
      const activeSelection = getActiveRegistrySelection_();
      const selectionId = String(activeSelection && activeSelection.id || '').trim();
      const blockKey = normalizeText_(getCurrentUserBlockName_());
      if (!isCollaborativeRegistrySelection_(activeSelection) || !selectionId || !blockKey) {
        clearSharedSelectionWorkState_();
        return;
      }
      if (
        String(state.sharedSelectionWorkSelectionId || '').trim() === selectionId &&
        String(state.sharedSelectionWorkBlockKey || '').trim() === blockKey
      ) {
        return;
      }
      clearSharedSelectionWorkState_();
    }

function setRegistryRowWorkPendingAction_(rowIndex, action) {
      const objectKeyNorm = normalizeText_(getRegistryRowWorkKey_(rowIndex));
      if (!objectKeyNorm) return;
      const next = { ...(state.sharedSelectionWorkPendingByKey || {}) };
      const mode = String(action || '').trim();
      if (mode) next[objectKeyNorm] = mode;
      else delete next[objectKeyNorm];
      state.sharedSelectionWorkPendingByKey = next;
    }

function setSharedSelectionWorkState_(selectionId, blockKey, blockName, items) {
      const nextSelectionId = String(selectionId || '').trim();
      const nextBlockKey = normalizeText_(blockKey || '');
      const shouldResetPending = (
        String(state.sharedSelectionWorkSelectionId || '').trim() !== nextSelectionId ||
        String(state.sharedSelectionWorkBlockKey || '').trim() !== nextBlockKey
      );
      const mapped = {};
      (Array.isArray(items) ? items : []).forEach(rawItem => {
        const item = normalizeSharedSelectionWorkItem_(rawItem);
        if (!item || !item.objectKeyNorm) return;
        mapped[item.objectKeyNorm] = item;
      });
      if (shouldResetPending) state.sharedSelectionWorkPendingByKey = {};
      state.sharedSelectionWorkSelectionId = nextSelectionId;
      state.sharedSelectionWorkBlockKey = nextBlockKey;
      state.sharedSelectionWorkBlockName = String(blockName || '').trim();
      state.sharedSelectionWorkItemsByKey = mapped;
      if (shouldResetPending) clearSharedSelectionWorkBatchSelection_();
      pruneSharedSelectionWorkBatchSelection_();
    }

function upsertSharedSelectionWorkItemLocally_(rawItem) {
      const item = normalizeSharedSelectionWorkItem_(rawItem);
      if (!item) return;
      const activeSelectionId = String(state.sharedSelectionWorkSelectionId || '').trim();
      if (!activeSelectionId || activeSelectionId !== String(item.selectionId || '').trim()) return;
      const next = { ...(state.sharedSelectionWorkItemsByKey || {}) };
      if (!item.status) delete next[item.objectKeyNorm];
      else next[item.objectKeyNorm] = item;
      state.sharedSelectionWorkItemsByKey = next;
    }

function refreshActiveSharedSelectionWorkState_(options) {
      const settings = options || {};
      const activeSelection = getActiveRegistrySelection_();
      if (!isCollaborativeRegistrySelection_(activeSelection)) {
        clearSharedSelectionWorkState_();
        return Promise.resolve(null);
      }
      const blockName = getCurrentUserBlockName_();
      if (!blockName) {
        clearSharedSelectionWorkState_();
        return Promise.resolve(null);
      }
      const selectionId = String(activeSelection.id || '').trim();
      if (!selectionId) {
        clearSharedSelectionWorkState_();
        return Promise.resolve(null);
      }
      return runServer_('getSmartFilterShellSharedSelectionWorkState', [{
        spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        selectionId
      }])
        .then(result => {
          if (String(state.activeRegistrySelectionId || '').trim() !== selectionId) return null;
          setSharedSelectionWorkState_(
            selectionId,
            result && result.blockKey || blockName,
            result && result.blockName || blockName,
            result && result.items
          );
          if (!settings.skipRender) {
            renderSavedSelectionsPanel_();
            renderRegistryView_();
            renderObjectView_();
          }
          return result;
        })
        .catch(err => {
          if (isUnauthorizedError_(err)) {
            handleUnauthorized_();
            return null;
          }
          if (settings.silent) {
            warnRuntimeDiagnostic_(err, 'Shared selection work refresh skipped');
            return null;
          }
          reportRuntimeError_(err, 'Ошибка статуса выборки');
          return null;
        });
    }

function openPrevUndoneObject_() {
      openAdjacentUndoneObject_('prev');
    }

function openNextUndoneObject_() {
      openAdjacentUndoneObject_('next');
    }

async function openAdjacentUndoneObject_(direction) {
      const currentRowIndex = Number(state.selectedRowIndex);
      const targetRowIndex = direction === 'prev'
        ? findPrevUndoneRowIndex_(currentRowIndex)
        : findNextUndoneRowIndex_(currentRowIndex);
      if (targetRowIndex < 0) return;
      openObjectCard_(targetRowIndex, { addTab: false });
    }

function setRegistryRowDone_(rowIndex, done) {
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return false;
      const key = getRegistryRowWorkKey_(rowIndex);
      if (!key) return false;
      const activeSelection = getActiveRegistrySelection_();
      if (!activeSelection || isCollaborativeRegistrySelection_(activeSelection)) return false;
      const current = new Set(getSelectionDoneRowKeys_(activeSelection.id));
      const hadValue = current.has(key);
      if (done) current.add(key);
      else current.delete(key);
      const hasValue = current.has(key);
      state.selectionDoneById[activeSelection.id] = Array.from(current);
      persistSelectionDoneState_();
      return hadValue !== hasValue;
    }

function toggleRegistryRowDone_(rowIndex) {
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
      setRegistryRowDone_(rowIndex, !isRegistryRowDone_(rowIndex));
      if (state.currentView === 'object' || Number(state.selectedRowIndex) === Number(rowIndex)) {
        renderAll_();
      } else {
        renderSavedSelectionsPanel_();
        renderRegistryView_();
      }
    }

function markCurrentObjectDone_() {
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0 || !hasActiveSavedSelection_()) return;
      if (hasActiveSharedSelectionWork_()) {
        const workState = getRegistryRowWorkState_(rowIndex);
        const pendingAction = String(workState && workState.pendingAction || '').trim();
        if (!workState || pendingAction || workState.isDone || !(workState.isFree || workState.isMine)) return;
        saveSharedSelectionWorkStateForRow_(rowIndex, 'done');
        return;
      }
      toggleRegistryRowDone_(rowIndex);
    }

function takeCurrentObjectWork_() {
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
      saveSharedSelectionWorkStateForRow_(rowIndex, 'take');
    }

function releaseCurrentObjectWork_() {
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
      saveSharedSelectionWorkStateForRow_(rowIndex, 'release');
    }

function resetActiveObjectCardUiState_() {
      state.objectSaveMessage = '';
      state.objectSaveError = '';
      state.objectSaveVisual = 'idle';
      state.headerEditing = false;
      state.headerEditSnapshot = new Map();
      state.passportEditing = false;
      state.passportEditSnapshot = new Map();
      state.sectionEditingId = '';
      state.sectionEditSnapshot = new Map();
      state.pendingFocusFieldKey = '';
    }

function ensureObjectTabOpened_(rowIndex) {
      const normalizedRowIndex = Number(rowIndex);
      if (!Number.isFinite(normalizedRowIndex) || normalizedRowIndex < 0) return;
      const tabs = normalizeStoredObjectTabRowIndexes_(state.objectTabRowIndexes);
      if (!tabs.includes(normalizedRowIndex)) tabs.push(normalizedRowIndex);
      state.objectTabRowIndexes = tabs;
    }

function activateObjectTab_(rowIndex, options) {
      const settings = options || {};
      const normalizedRowIndex = Number(rowIndex);
      if (!Number.isFinite(normalizedRowIndex) || normalizedRowIndex < 0) return;
      if (settings.addTab !== false) ensureObjectTabOpened_(normalizedRowIndex);
      state.selectedRowIndex = normalizedRowIndex;
      state.currentView = 'object';
      state.sidebarActivePanel = 'categories';
      resetActiveObjectCardUiState_();
      renderAll_();
      if (settings.scroll !== false) scrollWorkspaceToTop_();
    }

function closeAllObjectTabs_() {
      const tabs = normalizeStoredObjectTabRowIndexes_(state.objectTabRowIndexes);
      if (!tabs.length) return;
      state.objectTabRowIndexes = [];
      resetActiveObjectCardUiState_();
      state.currentView = 'registry';
      ensureObjectSelection_();
      renderAll_();
      scrollWorkspaceToTop_();
    }

function closeObjectTab_(rowIndex) {
      const normalizedRowIndex = Number(rowIndex);
      if (!Number.isFinite(normalizedRowIndex) || normalizedRowIndex < 0) return;
      const tabs = normalizeStoredObjectTabRowIndexes_(state.objectTabRowIndexes);
      const tabIndex = tabs.indexOf(normalizedRowIndex);
      if (tabIndex < 0) return;
      tabs.splice(tabIndex, 1);
      state.objectTabRowIndexes = tabs;
      if (state.currentView === 'object' && Number(state.selectedRowIndex) === normalizedRowIndex) {
        resetActiveObjectCardUiState_();
        if (tabs.length) {
          state.selectedRowIndex = tabs[Math.min(tabIndex, tabs.length - 1)];
          state.currentView = 'object';
        } else {
          state.currentView = 'registry';
          ensureObjectSelection_();
        }
      }
      renderAll_();
      if (state.currentView === 'object') scrollWorkspaceToTop_();
    }

function buildObjectWorkspaceTabLabel_(rowIndex) {
      const normalizedRowIndex = Number(rowIndex);
      if (!Number.isFinite(normalizedRowIndex) || normalizedRowIndex < 0 || normalizedRowIndex >= state.rows.length) {
        return `Объект ${normalizedRowIndex + 1}`;
      }
      const summary = getObjectSummary_(normalizedRowIndex);
      const uin = String(summary && summary.uin || '').trim();
      const dsCode = String(summary && summary.dsCode || '').trim();
      const name = String(summary && summary.name || '').trim();
      if (uin && name) return `${uin} · ${name}`;
      if (name && dsCode) return `${dsCode} · ${name}`;
      return uin || name || dsCode || `Объект ${normalizedRowIndex + 1}`;
    }

function renderWorkspaceTabs_() {
      const shell = el('workspaceTabs');
      const list = el('workspaceTabsList');
      const closeAllButton = el('btnCloseAllWorkspaceTabs');
      if (!shell || !list || !closeAllButton) return;
      const tabs = normalizeStoredObjectTabRowIndexes_(state.objectTabRowIndexes)
        .filter(rowIndex => rowIndex < state.rows.length);
      state.objectTabRowIndexes = tabs;
      if (!tabs.length) {
        shell.classList.add('hidden');
        list.innerHTML = '';
        closeAllButton.disabled = true;
        closeAllButton.onclick = null;
        return;
      }
      shell.classList.remove('hidden');
      closeAllButton.disabled = false;
      closeAllButton.onclick = () => {
        closeAllObjectTabs_();
      };
      const registryActive = state.currentView !== 'object';
      list.innerHTML = (
        `<button class="workspace-tab ${registryActive ? 'active' : ''}" type="button" data-workspace-tab="registry" title="Реестр">` +
          `<span class="workspace-tab-label">Реестр</span>` +
        `</button>` +
        tabs.map(rowIndex => {
          const active = state.currentView === 'object' && Number(state.selectedRowIndex) === Number(rowIndex);
          const label = buildObjectWorkspaceTabLabel_(rowIndex);
          return (
            `<button class="workspace-tab workspace-tab-object ${active ? 'active' : ''}" type="button" data-workspace-tab-row="${rowIndex}" title="${escapeHtml_(label)}">` +
              `<span class="workspace-tab-label">${escapeHtml_(label)}</span>` +
              `<span class="workspace-tab-close" data-close-workspace-tab-row="${rowIndex}" role="button" aria-label="Закрыть вкладку">&times;</span>` +
            `</button>`
          );
        }).join('')
      );
      list.querySelectorAll('[data-workspace-tab="registry"]').forEach(button => {
        button.addEventListener('click', () => {
          state.currentView = 'registry';
          renderAll_();
          scrollWorkspaceToTop_();
        });
      });
      list.querySelectorAll('[data-workspace-tab-row]').forEach(button => {
        button.addEventListener('click', evt => {
          if (evt.target.closest('[data-close-workspace-tab-row]')) return;
          activateObjectTab_(Number(button.getAttribute('data-workspace-tab-row')), {
            addTab: false
          });
        });
      });
      list.querySelectorAll('[data-close-workspace-tab-row]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          closeObjectTab_(Number(button.getAttribute('data-close-workspace-tab-row')));
        });
      });
    }

function openObjectCard_(rowIndex, options) {
      activateObjectTab_(rowIndex, options);
    }

    // ===== UI =====

    // ----- Render -----

function renderPinnedValueHtml_(spec, value) {
      const text = String(value == null ? '' : value).trim();
      if (spec && spec.kind === 'link' && /^https?:\/\//i.test(text)) {
        return (
          `<span class="inline-action-group">` +
            `<a class="pinned-link" href="${escapeHtml_(text)}" target="_blank" rel="noopener noreferrer">Открыть дашборд</a>` +
            `${renderCopyActionButtonHtml_(text, 'Скопировать ссылку')}` +
          `</span>`
        );
      }
      if (!text) return `<span class="pinned-value">—</span>`;
      return renderCopyableTextHtml_(text, 'pinned-value', escapeHtml_(text));
    }

function renderUinValueHtml_(uin, dashboardUrl) {
      const text = String(uin == null ? '' : uin).trim();
      const url = String(dashboardUrl == null ? '' : dashboardUrl).trim();
      if (text && /^https?:\/\//i.test(url)) {
        return (
          `<span class="inline-action-group">` +
            `<a class="record-uin-link" href="${escapeHtml_(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml_(text)}</a>` +
            `${renderCopyActionButtonHtml_(text, 'Скопировать УИН')}` +
          `</span>`
        );
      }
      if (!text) return `<span class="record-uin-value">-</span>`;
      return renderCopyableTextHtml_(text, 'record-uin-value', escapeHtml_(text), { title: 'Нажмите, чтобы скопировать УИН' });
    }

    function renderAll_() {
      clearRuntimeError_();
      try {
        syncAdminRegistryAccessState_();
        renderNavState_();
        syncExportSummaryButtonUi_();
        renderQuickPresetState_();
        renderSavedSelectionsPanel_();
        renderSectionChips_();
        renderWorkspaceTabs_();
        renderRegistryView_();
        renderAdminRegistryCreateDialog_();
        renderObjectView_();
        persistRegistrySessionState_();
      } catch (error) {
        reportRuntimeError_(error, 'Ошибка интерфейса');
      }
    }

function renderQuickPresetState_() {
      const activePresetByKey = new Map(
        state.activeSections
          .filter(section => section && section.presetKey)
          .map(section => [section.presetKey, section])
      );
      document.querySelectorAll('[data-quick-preset]').forEach(button => {
        const key = String(button.getAttribute('data-quick-preset') || '');
        const active = activePresetByKey.get(key);
        button.classList.toggle('active', !!active);
        button.setAttribute('aria-expanded', state.openPresetMenuKey === key ? 'true' : 'false');
      });
      document.querySelectorAll('[data-preset-menu]').forEach(node => {
        const key = String(node.getAttribute('data-preset-menu') || '');
        node.classList.toggle('hidden', state.openPresetMenuKey !== key);
        const active = activePresetByKey.get(key);
        const activeOptionKeys = active && Array.isArray(active.optionKeys)
          ? active.optionKeys
          : normalizePresetSelectionKeys_(key, state.presetSelections[key]);
        node.querySelectorAll('[data-preset-option-key]').forEach(button => {
          button.classList.toggle('active', activeOptionKeys.includes(String(button.getAttribute('data-preset-option-key') || '')));
        });
      });
    }

function renderNavState_() {
      const activePanel = normalizeSidebarPanel_(state.sidebarActivePanel);
      const expanded = !!state.sidebarExpanded;
      const visibleExpanded = expanded || isCompactSidebarViewport_();
      const appShell = el('appShell');
      const sidebar = el('appSidebar');
      const toggleButton = el('btnSidebarCollapse');
      const buttonMap = {
        registry: el('btnNavRegistry'),
        categories: el('btnNavCategories'),
        analytics: el('btnNavAnalytics'),
        projects: el('btnNavProjects'),
        data: el('btnNavData')
      };
      const panelMap = {
        categories: el('sidebarCategoriesPanel'),
        analytics: el('sidebarAnalyticsPanel'),
        projects: el('sidebarProjectsPanel'),
        data: el('sidebarDataPanel')
      };

      state.sidebarActivePanel = activePanel;
      if (appShell) appShell.classList.toggle('sidebar-expanded', visibleExpanded);
      if (sidebar) {
        sidebar.classList.toggle('is-expanded', visibleExpanded);
        sidebar.classList.toggle('is-collapsed', !visibleExpanded);
      }
      if (toggleButton) {
        const label = visibleExpanded ? 'Свернуть меню' : 'Раскрыть меню';
        toggleButton.classList.remove('active');
        toggleButton.classList.toggle('is-expanded', visibleExpanded);
        toggleButton.title = label;
        toggleButton.setAttribute('aria-label', label);
      }

      Object.keys(buttonMap).forEach(key => {
        const button = buttonMap[key];
        if (!button) return;
        const active = key === activePanel;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (button.classList.contains('nav-button-expandable')) {
          button.setAttribute('aria-expanded', active ? 'true' : 'false');
        }
        const item = button.closest('.nav-item');
        if (item) item.classList.toggle('is-open', active);
      });
      Object.keys(panelMap).forEach(key => {
        const panel = panelMap[key];
        if (!panel) return;
        panel.classList.toggle('hidden', key !== activePanel);
      });
    }

function populatePresetMenus_() {
      document.querySelectorAll('[data-preset-menu]').forEach(node => {
        const key = String(node.getAttribute('data-preset-menu') || '');
        const def = QUICK_PRESET_DEFS[key];
        if (!def) return;
        if (def.inDevelopment) {
          node.innerHTML = `<div class="empty-state">${escapeHtml_(String(def.inDevelopmentMessage || `${def.label} в разработке.`).trim())}</div>`;
          return;
        }
        node.innerHTML = (Array.isArray(def.options) ? def.options : []).map(option => (
          `<button class="preset-option" type="button" data-preset-option="${escapeHtml_(key)}" data-preset-option-key="${escapeHtml_(option.key)}">` +
            `<span class="preset-option-mark" aria-hidden="true"></span>` +
            `<span>${escapeHtml_(option.dropdownLabel)}</span>` +
          `</button>`
        )).join('');
      });
      document.querySelectorAll('[data-preset-option]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          applyQuickPresetOption_(
            String(button.getAttribute('data-preset-option') || ''),
            String(button.getAttribute('data-preset-option-key') || '')
          );
        });
      });
    }

function buildRegistryFacetMenuHtml_(def, selection, searchQuery, values) {
      if (isMonitoringDateFacetDef_(def)) return buildMonitoringDateFacetMenuHtml_(selection);
      if (isNumberRangeFacetDef_(def)) return buildNumberRangeFacetMenuHtml_(def, selection);
      if (isDateRangeFacetDef_(def)) return buildDateRangeFacetMenuHtml_(def, selection);
      const allSelected = isRegistryFacetAllSelected_(selection, values);
      const normalizedSearch = normalizeText_(searchQuery);
      const filteredValues = normalizedSearch
        ? values.filter(value => normalizeText_(value).includes(normalizedSearch))
        : values;
      return (
        `<div class="registry-filter-tools">` +
          `<button class="registry-filter-all${allSelected ? ' active' : ''}" type="button" data-registry-filter-all="${escapeHtml_(def.key)}">` +
            `<span class="registry-filter-option-mark" aria-hidden="true"></span>` +
            `<span class="registry-filter-option-text">\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0432\u0441\u0435</span>` +
          `</button>` +
          `<input class="registry-filter-search" type="text" value="${escapeHtml_(searchQuery)}" placeholder="\u041f\u043e\u0438\u0441\u043a..." data-registry-filter-search="${escapeHtml_(def.key)}">` +
        `</div>` +
        `<div class="registry-filter-options">` +
          (
            filteredValues.length
              ? filteredValues.map(value => (
                  `<button class="registry-filter-option${isRegistryFacetOptionSelected_(selection, value) ? ' active' : ''}" type="button" data-registry-filter-option="${escapeHtml_(def.key)}" data-registry-filter-value="${escapeHtml_(value)}">` +
                    `<span class="registry-filter-option-mark" aria-hidden="true"></span>` +
                    `<span class="registry-filter-option-text">${escapeHtml_(value)}</span>` +
                  `</button>`
                )).join('')
              : `<div class="empty-state">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e \u043f\u043e \u044d\u0442\u043e\u043c\u0443 \u0444\u0438\u043b\u044c\u0442\u0440\u0443.</div>`
          ) +
        `</div>`
      );
    }

function buildNumberRangeFacetMenuHtml_(def, selection) {
      const current = normalizeNumberRangeFacetFilter_(selection);
      return (
        `<div class="registry-range-filter">` +
          `<div class="registry-range-hint">Фильтр применяется по фактическому значению строительной готовности.</div>` +
          `<div class="registry-range-grid">` +
            `<label class="registry-range-field">` +
              `<span class="registry-range-label">От</span>` +
              `<input class="registry-range-input" type="text" inputmode="decimal" value="${escapeHtml_(Number.isFinite(current && current.min) ? String(current.min) : '')}" data-registry-filter-range-input="${escapeHtml_(def.key)}" data-range-bound="min" placeholder="Например, 70">` +
            `</label>` +
            `<label class="registry-range-field">` +
              `<span class="registry-range-label">До</span>` +
              `<input class="registry-range-input" type="text" inputmode="decimal" value="${escapeHtml_(Number.isFinite(current && current.max) ? String(current.max) : '')}" data-registry-filter-range-input="${escapeHtml_(def.key)}" data-range-bound="max" placeholder="Например, 100">` +
            `</label>` +
          `</div>` +
          `<div class="registry-range-actions">` +
            `<button class="ghost" type="button" data-registry-filter-range-clear="${escapeHtml_(def.key)}">Сбросить</button>` +
            `<button class="primary" type="button" data-registry-filter-range-apply="${escapeHtml_(def.key)}">Применить</button>` +
          `</div>` +
        `</div>`
      );
    }

function buildDateRangeFacetMenuHtml_(def, selection) {
      const current = normalizeDateRangeFacetFilter_(selection);
      return (
        `<div class="registry-range-filter">` +
          `<div class="registry-range-hint">Покажем объекты, у которых дата попадает в выбранный диапазон.</div>` +
          `<div class="registry-range-grid">` +
            `<label class="registry-range-field">` +
              `<span class="registry-range-label">С</span>` +
              `<input class="registry-range-input" type="date" value="${escapeHtml_(String(current && current.from || ''))}" data-registry-filter-range-input="${escapeHtml_(def.key)}" data-range-bound="from">` +
            `</label>` +
            `<label class="registry-range-field">` +
              `<span class="registry-range-label">По</span>` +
              `<input class="registry-range-input" type="date" value="${escapeHtml_(String(current && current.to || ''))}" data-registry-filter-range-input="${escapeHtml_(def.key)}" data-range-bound="to">` +
            `</label>` +
          `</div>` +
          `<div class="registry-range-actions">` +
            `<button class="ghost" type="button" data-registry-filter-range-clear="${escapeHtml_(def.key)}">Сбросить</button>` +
            `<button class="primary" type="button" data-registry-filter-range-apply="${escapeHtml_(def.key)}">Применить</button>` +
          `</div>` +
        `</div>`
      );
    }

function getRegistryFloatingMenu_() {
      return el('registryFloatingMenu');
    }

function renderRegistryFacetControlFast_(facetKey) {
      const def = getRegistryFacetDef_(facetKey);
      if (!def) return;
      const button = el(def.buttonId);
      const menu = getRegistryFloatingMenu_();
      const monitoringDateFacet = isMonitoringDateFacetDef_(def);
      const numberRangeFacet = isNumberRangeFacetDef_(def);
      const dateRangeFacet = isDateRangeFacetDef_(def);
      const listFacet = !(monitoringDateFacet || numberRangeFacet || dateRangeFacet);
      const values = monitoringDateFacet
        ? getRegistryFacetAvailableValuesFast_(def.key)
        : (listFacet ? collectRegistryFacetValuesFast_(def.key) : []);
      const current = monitoringDateFacet
        ? normalizeMonitoringDateFacetFilter_(state.registryFacetFilters[def.key])
        : numberRangeFacet
          ? normalizeNumberRangeFacetFilter_(state.registryFacetFilters[def.key])
          : dateRangeFacet
            ? normalizeDateRangeFacetFilter_(state.registryFacetFilters[def.key])
            : normalizeRegistryFacetSelection_(state.registryFacetFilters[def.key], values);
      const searchQuery = listFacet ? String(state.registryFacetQueries[def.key] || '') : '';
      const renderSignature = listFacet
        ? [
            String(def.key || ''),
            searchQuery,
            serializeRegistryFacetSelection_(current, def),
            values.join('\u0002')
          ].join('\u0001')
        : [String(def.key || ''), serializeRegistryFacetSelection_(current, def)].join('\u0001');
      state.registryFacetFilters[def.key] = current;
      if (button) {
        const labelNode = button.querySelector('[data-role="registry-filter-label"]');
        if (labelNode) labelNode.textContent = formatRegistryFacetButtonLabel_(def, current);
      }
      if (menu && state.openRegistryFilterKey === def.key && state.currentView === 'registry') {
        if (menu.dataset.renderSignature !== renderSignature) {
          menu.innerHTML = buildRegistryFacetMenuHtml_(def, current, searchQuery, values);
          menu.dataset.renderSignature = renderSignature;
        }
        bindRegistryFacetMenuEvents_(def, menu);
        positionRegistryFloatingMenu_();
      }
    }

function populateRegistryFacetFiltersFast_() {
      REGISTRY_FILTER_DEFS.forEach(def => renderRegistryFacetControlFast_(def.key));
      renderRegistryFilterUi_();
    }

function renderRegistryFilterUi_() {
      const activeFacetKey = state.currentView === 'registry'
        ? String(state.openRegistryFilterKey || '')
        : '';
      if (activeFacetKey) renderRegistryFacetControlFast_(activeFacetKey);
      REGISTRY_FILTER_DEFS.forEach(def => {
        const wrap = document.querySelector(`[data-registry-filter="${def.key}"]`);
        const button = el(def.buttonId);
        const menuOpen = activeFacetKey === def.key;
        if (wrap) wrap.classList.toggle('open', menuOpen);
        if (button) button.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
      });
      const floatingMenu = getRegistryFloatingMenu_();
      if (!floatingMenu) return;
      if (!activeFacetKey) {
        floatingMenu.classList.remove('open');
        floatingMenu.setAttribute('aria-hidden', 'true');
        return;
      }
      const def = getRegistryFacetDef_(activeFacetKey);
      if (!def) {
        floatingMenu.classList.remove('open');
        floatingMenu.setAttribute('aria-hidden', 'true');
        return;
      }
      floatingMenu.setAttribute('role', 'listbox');
      floatingMenu.setAttribute('aria-label', `Фильтр по ${def.title}`);
      floatingMenu.setAttribute('aria-hidden', 'false');
      positionRegistryFloatingMenu_();
      floatingMenu.classList.add('open');
      const input = document.querySelector(`[data-registry-filter-search="${activeFacetKey}"]`);
      if (input && document.activeElement !== input) {
        window.requestAnimationFrame(() => {
          if (state.openRegistryFilterKey !== activeFacetKey || state.currentView !== 'registry') return;
          input.focus();
          trySetInputSelectionToEnd_(input);
        });
        return;
      }
      const rangeInput = floatingMenu.querySelector(`[data-registry-filter-range-input="${activeFacetKey}"]`);
      if (rangeInput && document.activeElement !== rangeInput) {
        window.requestAnimationFrame(() => {
          if (state.openRegistryFilterKey !== activeFacetKey || state.currentView !== 'registry') return;
          rangeInput.focus();
          trySetInputSelectionToEnd_(rangeInput);
        });
      }
    }

function renderSavedSelectionsPanel_() {
      if (maybeFinalizePendingSharedRegistrySelectionSaveFromState_()) return;
      syncSavedSelectionsPanelChrome_();
      const list = el('savedSelectionList');
      if (!list) return;
      const allSelections = getAllSavedRegistrySelections_();
      const sortByName = items => items.slice().sort((a, b) => (
        String(a && a.name || '').localeCompare(String(b && b.name || ''), 'ru')
      ));
      const personalSelections = sortByName(allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'personal'));
      const divisionSelections = sortByName(allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'division'));
      const sharedSelections = sortByName(allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'shared'));

      if (!allSelections.length) {
        list.innerHTML = '<div class="empty-state">Пока нет проектов.</div>';
      } else {
        const groups = [];
        if (personalSelections.length) groups.push(renderSavedSelectionGroupHtml_('personal', 'Личная', personalSelections));
        if (divisionSelections.length) groups.push(renderSavedSelectionGroupHtml_(
          'division',
          'Блок',
          divisionSelections
        ));
        if (sharedSelections.length) groups.push(renderSavedSelectionGroupHtml_('shared', 'Общая', sharedSelections));
        list.innerHTML = groups.join('');
      }

      list.querySelectorAll('[data-saved-selection-group-toggle]').forEach(button => {
        button.addEventListener('click', () => {
          toggleSavedSelectionGroup_(
            String(button.getAttribute('data-saved-selection-group-toggle') || ''),
            button
          );
        });
      });
      list.querySelectorAll('[data-load-selection]').forEach(button => {
        button.addEventListener('click', () => applySavedRegistrySelection_(String(button.getAttribute('data-load-selection') || '')));
      });
      syncSavedSelectionsPanelChrome_();
      if (state.selectionComposerOpen) syncRegistrySelectionComposerUi_();
    }

function renderSavedSelectionGroupHtml_(groupKey, title, items) {
      const normalizedGroupKey = normalizeRegistrySelectionScope_(groupKey);
      const heading = String(title || '').trim() || 'Проекты';
      const isOpen = isSavedSelectionGroupOpen_(normalizedGroupKey);
      return (
        `<div class="saved-selection-group">` +
          `<button class="saved-selection-group-toggle" type="button" data-saved-selection-group-toggle="${escapeHtml_(normalizedGroupKey)}" aria-expanded="${isOpen ? 'true' : 'false'}">` +
            `<span class="saved-selection-group-title-wrap">` +
              `<span class="saved-selection-group-title">${escapeHtml_(heading)}</span>` +
              `<span class="saved-selection-group-count">${items.length}</span>` +
            `</span>` +
            `<span class="saved-selection-group-arrow" aria-hidden="true"></span>` +
          `</button>` +
          `<div class="saved-selection-stack${isOpen ? '' : ' hidden'}">${items.map(item => renderSavedSelectionItemHtml_(item)).join('')}</div>` +
        `</div>`
      );
    }

function getSavedSelectionObjectCount_(item) {
      const bulkCount = parseRegistryBulkUinText_(item && item.bulkUinText).length;
      if (bulkCount) return bulkCount;
      const match = String(item && item.meta || '').match(/Объектов:\s*(\d+)/i);
      return match ? Math.max(0, Number(match[1]) || 0) : 0;
    }

function getSavedSelectionOwnerLabel_(item) {
      const ownerName = String(item && item.ownerName || '').trim();
      if (ownerName) return ownerName;
      return String(state.currentUser && state.currentUser.name || '').trim() || 'Вы';
    }

function buildSavedSelectionMetaLine_(item) {
      const parts = [];
      const objectCount = getSavedSelectionObjectCount_(item);
      if (objectCount > 0) parts.push(String(objectCount));
      const timeText = formatSavedSelectionDate_(item && (item.createdAt || item.updatedAt));
      if (timeText) parts.push(timeText);
      const ownerText = getSavedSelectionOwnerLabel_(item);
      if (ownerText) parts.push(ownerText);
      return parts.join(' · ');
    }

function renderSavedSelectionItemHtml_(item) {
      const active = String(state.activeRegistrySelectionId || '') === String(item && item.id || '');
      const loading = String(state.selectionLoadingId || '') === String(item && item.id || '');
      const busy = loading;
      const name = String(item && item.name || 'Проект').trim() || 'Проект';
      const metaLine = buildSavedSelectionMetaLine_(item);
      return (
        `<div class="saved-selection${active ? ' active' : ''}${busy ? ' is-busy' : ''}">` +
          `<button class="saved-selection-main${loading ? ' is-loading' : ''}" type="button" data-load-selection="${escapeHtml_(item.id)}"${busy ? ' disabled' : ''}>` +
            `<span class="saved-selection-name" title="${escapeHtml_(name)}">${escapeHtml_(name)}</span>` +
            `<span class="saved-selection-meta" title="${escapeHtml_(metaLine)}">${escapeHtml_(metaLine)}</span>` +
          `</button>` +
        `</div>`
      );
    }

function cancelRegistryRowsRender_() {
      registryRowsRenderToken += 1;
      if (registryRowsRenderFrame) {
        window.cancelAnimationFrame(registryRowsRenderFrame);
        registryRowsRenderFrame = 0;
      }
    }

function formatRegistryColumnsButtonText_() {
      return 'Настроить вид реестра';
    }

function closeRegistryColumnsPanel_() {
      if (!state.registryColumnsPanelOpen) return;
      state.registryColumnsPanelOpen = false;
      renderRegistryColumnsPanel_();
    }

function toggleRegistryColumnsPanel_() {
      state.registryColumnsPanelOpen = !state.registryColumnsPanelOpen;
      if (state.registryColumnsPanelOpen) closeRegistryFilterMenus_();
      renderRegistryColumnsPanel_();
    }

function toggleRegistryColumnVisibility_(key) {
      const def = getRegistryColumnDef_(key);
      if (!def || def.required) return;
      const current = new Set(normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys));
      const normalizedKey = String(def.key || '').trim();
      if (current.has(normalizedKey)) current.delete(normalizedKey);
      else current.add(normalizedKey);
      state.registryVisibleColumnKeys = normalizeStoredRegistryVisibleColumnKeys_(Array.from(current));
      if (syncHiddenRegistryFacetFilters_()) {
        applyObjectFilters_();
        ensureObjectSelection_();
      }
      persistRegistrySessionState_();
      renderAll_();
    }

function resetRegistryVisibleColumns_() {
      state.registryVisibleColumnKeys = REGISTRY_COLUMN_DEFS
        .filter(def => def && def.required)
        .map(def => String(def.key || '').trim())
        .filter(Boolean);
      if (syncHiddenRegistryFacetFilters_()) {
        applyObjectFilters_();
        ensureObjectSelection_();
      }
      persistRegistrySessionState_();
      renderAll_();
    }

function renderRegistryColumnsPanel_() {
      const button = el('btnToggleRegistryColumns');
      if (button) {
        button.title = formatRegistryColumnsButtonText_();
        button.setAttribute('aria-label', formatRegistryColumnsButtonText_());
        button.classList.toggle('active', !!state.registryColumnsPanelOpen);
      }
      const panel = el('registryColumnsPanel');
      if (!panel) return;
      if (!state.registryColumnsPanelOpen) {
        panel.classList.add('hidden');
        panel.innerHTML = '';
        return;
      }
      const availableDefs = getAvailableRegistryColumnDefs_();
      const activeKeys = new Set(normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys));
      panel.classList.remove('hidden');
      panel.innerHTML = (
        `<div class="registry-columns-head">` +
          `<div class="registry-columns-title">` +
            `<strong>Поля в реестре</strong>` +
            `<span>Оставьте только нужные поля. Дополнительные позиции из сводной можно включать по мере необходимости, выбор сохраняется на этом устройстве.</span>` +
          `</div>` +
          `<div class="registry-columns-actions">` +
            `<button class="ghost" type="button" data-registry-columns-reset="1">Сбросить все</button>` +
            `<button class="ghost icon-button registry-columns-close-button" type="button" data-registry-columns-close="1" aria-label="Закрыть настройки полей" title="Закрыть настройки полей">×</button>` +
          `</div>` +
        `</div>` +
        `<div class="registry-columns-list">` +
          availableDefs.map(def => {
            const key = String(def && def.key || '').trim();
            const active = activeKeys.has(key);
            const meta = def.required
              ? 'Всегда включено'
              : (def.defaultVisible === false ? 'Дополнительное поле' : 'Можно скрыть');
            return (
              `<button class="registry-column-option${active ? ' active' : ''}" type="button" data-registry-column-toggle="${escapeHtml_(key)}"${def.required ? ' disabled' : ''}>` +
                `<span class="registry-column-option-mark" aria-hidden="true"></span>` +
                `<span class="registry-column-option-main">` +
                  `<span class="registry-column-option-text">${escapeHtml_(def.title || 'Поле')}</span>` +
                  `<span class="registry-column-option-meta">${escapeHtml_(meta)}</span>` +
                `</span>` +
              `</button>`
            );
          }).join('') +
        `</div>`
      );
      panel.querySelectorAll('[data-registry-column-toggle]').forEach(node => {
        node.addEventListener('click', evt => {
          evt.stopPropagation();
          toggleRegistryColumnVisibility_(String(node.getAttribute('data-registry-column-toggle') || ''));
        });
      });
      const resetButton = panel.querySelector('[data-registry-columns-reset]');
      if (resetButton) {
        resetButton.addEventListener('click', evt => {
          evt.stopPropagation();
          resetRegistryVisibleColumns_();
        });
      }
      const closeButton = panel.querySelector('[data-registry-columns-close]');
      if (closeButton) {
        closeButton.addEventListener('click', evt => {
          evt.stopPropagation();
          closeRegistryColumnsPanel_();
        });
      }
    }

function buildRegistryFilterHeaderHtml_(filterKey) {
      const def = getRegistryFacetDef_(filterKey);
      if (!def) return `<span class="registry-column-title">Поле</span>`;
      return (
        `<div class="registry-filter registry-filter--${escapeHtml_(def.key)}" data-registry-filter="${escapeHtml_(def.key)}">` +
          `<button id="${escapeHtml_(def.buttonId)}" class="registry-filter-trigger" type="button" data-registry-filter-trigger="${escapeHtml_(def.key)}" aria-expanded="false" aria-haspopup="listbox">` +
            `<span class="registry-filter-label" data-role="registry-filter-label">${escapeHtml_(def.title)}</span>` +
            `<span class="registry-filter-arrow" aria-hidden="true"></span>` +
          `</button>` +
          `<div id="${escapeHtml_(def.menuId)}" class="registry-filter-menu" role="listbox" aria-label="${escapeHtml_(`Фильтр по ${def.title}`)}"></div>` +
        `</div>`
      );
    }

function buildRegistryColumnHeaderHtml_(def) {
      if (def && def.key === 'anoSmgCode') {
        return `<span class="registry-column-title centered">${escapeHtml_(def.title || 'Поле')}</span>`;
      }
      return def && def.filterKey
        ? buildRegistryFilterHeaderHtml_(def.filterKey)
        : `<span class="registry-column-title">${escapeHtml_(def && def.title || 'Поле')}</span>`;
    }

function renderRegistryTableStructure_() {
      const visibleDefs = getVisibleRegistryColumnDefs_();
      const colgroup = el('registryTableColgroup');
      const head = el('registryTableHead');
      if (colgroup) {
        colgroup.innerHTML = visibleDefs.map(def => {
          const width = String(def && def.width || '').trim();
          return `<col${width ? ` style="width:${escapeHtml_(width)}"` : ''}>`;
        }).join('');
      }
      if (head) {
        head.innerHTML = `<tr>${visibleDefs.map(def => `<th>${buildRegistryColumnHeaderHtml_(def)}</th>`).join('')}</tr>`;
      }
    }

function renderRegistryTextCellHtml_(value, options) {
      const settings = options || {};
      const className = settings.className ? ` ${settings.className}` : '';
      const text = String(value == null ? '' : value).trim();
      const displayText = text || '—';
      return `<span class="registry-cell-clip${className}" title="${escapeHtml_(displayText)}">${escapeHtml_(displayText)}</span>`;
    }

function renderRegistryLinkedTextCellHtml_(value, href, options) {
      const settings = options || {};
      const className = settings.className ? ` ${settings.className}` : '';
      const text = String(value == null ? '' : value).trim();
      const link = String(href == null ? '' : href).trim();
      const displayText = text || '—';
      if (text && isHttpUrl_(link)) {
        return `<a class="registry-cell-link${className}" href="${escapeHtml_(link)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml_(settings.title || displayText)}">${escapeHtml_(displayText)}</a>`;
      }
      return `<span class="registry-cell-clip${className}" title="${escapeHtml_(displayText)}">${escapeHtml_(displayText)}</span>`;
    }

function renderRegistryMonitoringDateCellHtml_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) {
        return `<span class="registry-monitoring-indicator missing" title="Дата мониторинга не указана">Без даты</span>`;
      }
      const info = getMonitoringDateStatusInfo_(text);
      if (!info) return renderRegistryTextCellHtml_(text);
      return `<span class="registry-monitoring-indicator ${escapeHtml_(info.bucket)}" title="${escapeHtml_(info.title)}">${escapeHtml_(info.display)}</span>`;
    }

function renderRegistryActionButtonCellHtml_(url, label, title) {
      const href = String(url == null ? '' : url).trim();
      if (!isHttpUrl_(href)) return renderRegistryTextCellHtml_('');
      return `<a class="registry-action-link" href="${escapeHtml_(href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml_(title || label || 'Открыть ссылку')}">${escapeHtml_(label || 'Открыть')}</a>`;
    }

function renderRegistryMetricCellHtml_(planValue, factValue) {
      const planText = String(planValue == null ? '' : planValue).trim();
      const factText = String(factValue == null ? '' : factValue).trim();
      return (
        `<div class="registry-metric-stack">` +
          renderRegistryMetricLineHtml_('План', planText) +
          renderRegistryMetricLineHtml_('Факт', factText) +
        `</div>`
      );
    }

function renderRegistryMetricLineHtml_(label, value) {
      const text = String(value == null ? '' : value).trim();
      return (
        `<div class="registry-metric-line">` +
          `<span class="registry-metric-label">${escapeHtml_(label || '')}</span>` +
          `<span class="registry-metric-value${text ? '' : ' is-empty'}" title="${escapeHtml_(text || '—')}">${escapeHtml_(text || '—')}</span>` +
        `</div>`
      );
    }

    function renderRegistryUinCellHtml_(rowIndex, context) {
      const rowState = context || {};
      const summary = rowState.summary || {};
      const isAdminEditing = !!rowState.isAdminEditing;
      const isAdminSelected = !!rowState.isAdminSelected;
      const isSelectionEditing = !!rowState.isSelectionEditing;
      const isSelectionMember = !!rowState.isSelectionMember;
      const sharedWorkBatchMode = normalizeSharedSelectionWorkBatchMode_(rowState.sharedWorkBatchMode);
      const isSharedWorkBatchSelected = !!rowState.isSharedWorkBatchSelected;
      const canSelectSharedWorkBatch = !!rowState.canSelectSharedWorkBatch;
      const hasSavedSelection = !!rowState.hasSavedSelection;
      const sharedSelectionActive = !!rowState.sharedSelectionActive;
      const isDone = !!rowState.isDone;
      const uinText = String(summary.uin || '').trim();
      const dashboardUrl = String(summary.dashboardUrl || '').trim();
      const uinLabelHtml = uinText
        ? (
          isHttpUrl_(dashboardUrl)
            ? `<a class="pill accent registry-uin-link" href="${escapeHtml_(dashboardUrl)}" target="_blank" rel="noopener noreferrer" title="Открыть дашборд">${escapeHtml_(uinText)}</a>`
            : `<span class="pill accent" title="${escapeHtml_(uinText)}">${escapeHtml_(uinText)}</span>`
        )
        : `<span class="pill accent">—</span>`;
      return (
        `<td>` +
          `<div class="registry-uin-wrap">` +
            (
              isAdminEditing
                ? (
                  `<button class="registry-row-check${isAdminSelected ? ' checked' : ''}" type="button" data-admin-registry-select="${rowIndex}" aria-pressed="${isAdminSelected ? 'true' : 'false'}" title="${isAdminSelected ? 'Снять выбор строки' : 'Выбрать строку'}">` +
                    `<span class="registry-row-check-mark" aria-hidden="true"></span>` +
                  `</button>`
                )
                : isSelectionEditing
                ? (
                  `<button class="registry-row-check${isSelectionMember ? ' checked' : ''}" type="button" data-toggle-selection-draft="${rowIndex}" aria-pressed="${isSelectionMember ? 'true' : 'false'}" title="${isSelectionMember ? 'Убрать объект из редактируемой выборки' : 'Добавить объект в редактируемую выборку'}">` +
                    `<span class="registry-row-check-mark" aria-hidden="true"></span>` +
                  `</button>`
                )
                : sharedWorkBatchMode
                ? (
                  `<button class="registry-row-check${isSharedWorkBatchSelected ? ' checked' : ''}" type="button" data-shared-work-batch-select="${rowIndex}" aria-pressed="${isSharedWorkBatchSelected ? 'true' : 'false'}"${canSelectSharedWorkBatch ? '' : ' disabled'} title="${
                    escapeHtml_(
                      canSelectSharedWorkBatch
                        ? (sharedWorkBatchMode === 'take' ? 'Выбрать объект для пакетного взятия' : 'Выбрать объект для пакетного возврата')
                        : (sharedWorkBatchMode === 'take' ? 'Сейчас можно выбирать только свободные объекты' : 'Сейчас можно отменять только свои объекты')
                    )
                  }">` +
                    `<span class="registry-row-check-mark" aria-hidden="true"></span>` +
                  `</button>`
                )
                : (
                  hasSavedSelection && !sharedSelectionActive
                    ? (
                      `<button class="registry-row-check${isDone ? ' checked' : ''}" type="button" data-toggle-done="${rowIndex}" aria-pressed="${isDone ? 'true' : 'false'}" title="${isDone ? 'Снять отметку &quot;выполнено&quot;' : 'Отметить как выполненный'}">` +
                        `<span class="registry-row-check-mark" aria-hidden="true"></span>` +
                      `</button>`
                    )
                    : ''
                )
            ) +
            uinLabelHtml +
            `${uinText ? renderCopyActionButtonHtml_(uinText, 'Скопировать УИН', 'registry-copy-button') : ''}` +
          `</div>` +
        `</td>`
      );
    }

function renderRegistryRowCellHtml_(rowIndex, def, context) {
      const rowState = context || {};
      const summary = rowState.summary || {};
      if (!def) return '<td></td>';
      if (def.key === 'uin') return renderRegistryUinCellHtml_(rowIndex, rowState);
      if (def.key === 'name') {
        return (
          `<td>` +
            `<div class="registry-name" title="${escapeHtml_(summary.name || 'Без названия')}">${escapeHtml_(summary.name || 'Без названия')}</div>` +
            (rowState.workNote ? `<div class="${escapeHtml_(rowState.workNoteClass)}" title="${escapeHtml_(rowState.workNote)}">${escapeHtml_(rowState.workNote)}</div>` : '') +
            (rowState.workActionsHtml || '') +
          `</td>`
        );
      }
      if (def.key === 'anoSmgCode') {
        return `<td class="registry-cell-center">${renderRegistryLinkedTextCellHtml_(summary.anoSmgCode, summary.checklistUrl, { title: 'Открыть чек-лист' })}</td>`;
      }
      if (def.key === 'monitoringDate') {
        return `<td class="registry-cell-center">${renderRegistryMonitoringDateCellHtml_(summary.monitoringDate)}</td>`;
      }
      if (def.key === 'yandexDisk') {
        return `<td class="registry-cell-center">${renderRegistryActionButtonCellHtml_(summary.yandexDiskUrl, 'Я.Диск', 'Открыть Я.Диск')}</td>`;
      }
      if (def.key === 'autoslider') {
        return `<td class="registry-cell-center">${renderRegistryActionButtonCellHtml_(summary.autosliderUrl, 'Автослайдер', 'Открыть Автослайдер')}</td>`;
      }
      if (def.key === 'constructionReadiness') {
        return `<td>${renderRegistryMetricCellHtml_(summary.constructionReadinessPlan, summary.constructionReadinessFact)}</td>`;
      }
      if (def.key === 'peopleCount') {
        return `<td>${renderRegistryMetricCellHtml_(summary.peopleCountPlan, summary.peopleCountFact)}</td>`;
      }
      if (def.key === 'startSmrDate') {
        return `<td>${renderRegistryTextCellHtml_(formatRegistryDateText_(summary.startSmrDate))}</td>`;
      }
      if (def.key === 'rv') {
        return `<td>${renderRegistryTextCellHtml_(summary.rvDisplay)}</td>`;
      }
      return `<td>${renderRegistryTextCellHtml_(summary[def.summaryKey])}</td>`;
    }

function buildRegistryRowHtml_(rowIndex, viewState) {
      const context = viewState || {};
      const summary = getRegistryRowSummary_(rowIndex);
      const workState = getRegistryRowWorkState_(rowIndex);
      const isDone = !!workState.isDone;
      const workNote = getRegistryRowWorkNoteText_(rowIndex);
      const workNoteClass = getRegistryRowWorkNoteClassName_(rowIndex);
      const workActionsHtml = renderRegistryRowWorkActionsHtml_(rowIndex, workState);
      const isAdminEditing = !!context.isAdminEditing;
      const adminSelectionSet = context.adminSelectionSet || null;
      const isAdminSelected = isAdminEditing && adminSelectionSet ? adminSelectionSet.has(Number(rowIndex)) : false;
      const isSelectionEditing = !!context.isSelectionEditing;
      const selectionEditSet = context.selectionEditSet || null;
      const isSelectionMember = isSelectionEditing && selectionEditSet ? selectionEditSet.has(normalizeText_(summary.uin)) : false;
      const sharedWorkBatchMode = normalizeSharedSelectionWorkBatchMode_(context.sharedWorkBatchMode);
      const isSharedWorkBatchSelected = sharedWorkBatchMode ? isRegistryRowSelectedForSharedWorkBatch_(rowIndex) : false;
      const canSelectSharedWorkBatch = sharedWorkBatchMode ? isRegistryRowSelectableForSharedWorkBatch_(rowIndex, sharedWorkBatchMode, { workState }) : false;
      const rowClasses = [
        rowIndex === state.selectedRowIndex ? 'active' : '',
        isDone ? 'done' : '',
        isAdminSelected ? 'admin-selected' : '',
        isSelectionMember ? 'selection-member' : '',
        isSharedWorkBatchSelected ? 'work-batch-selected' : ''
      ].filter(Boolean).join(' ');
      const active = rowClasses ? ` class="${rowClasses}"` : '';
      const hasSavedSelection = !!context.hasSavedSelection;
      const sharedSelectionActive = !!context.sharedSelectionActive;
      const visibleDefs = Array.isArray(context.visibleColumnDefs) && context.visibleColumnDefs.length
        ? context.visibleColumnDefs
        : getVisibleRegistryColumnDefs_();
      return (
        `<tr${active} data-row-index="${rowIndex}">` +
          visibleDefs.map(def => renderRegistryRowCellHtml_(rowIndex, def, {
            summary,
            isAdminEditing,
            isAdminSelected,
            isDone,
            workNote,
            workNoteClass,
            workActionsHtml,
            isSelectionEditing,
            isSelectionMember,
            sharedWorkBatchMode,
            isSharedWorkBatchSelected,
            canSelectSharedWorkBatch,
            hasSavedSelection,
            sharedSelectionActive
          })).join('') +
        `</tr>`
      );
    }

    function renderRegistryRowsProgressively_(body, rowIndexes, viewState) {
      const rows = Array.isArray(rowIndexes) ? rowIndexes : [];
      const context = viewState || {};
      cancelRegistryRowsRender_();
      if (!body) return;
      if (!rows.length) {
        body.innerHTML = '';
        return;
      }

      const renderToken = registryRowsRenderToken;
      const total = rows.length;
      let offset = 0;

      function getRegistryRenderBatchSize_(initial) {
        if (isSidebarBrandLogoReplaying_()) {
          return initial
            ? REGISTRY_INITIAL_RENDER_BATCH_DURING_LOGO_REPLAY
            : REGISTRY_PROGRESSIVE_RENDER_BATCH_DURING_LOGO_REPLAY;
        }
        return initial
          ? REGISTRY_INITIAL_RENDER_BATCH
          : REGISTRY_PROGRESSIVE_RENDER_BATCH;
      }

      function renderChunk_(batchSize, replace) {
        if (renderToken !== registryRowsRenderToken) return;
        const end = Math.min(offset + batchSize, total);
        const chunkHtml = rows.slice(offset, end).map(rowIndex => buildRegistryRowHtml_(rowIndex, context)).join('');
        if (replace) body.innerHTML = chunkHtml;
        else body.insertAdjacentHTML('beforeend', chunkHtml);
        offset = end;
        const hasMore = offset < total;
        if (!hasMore) return;
        registryRowsRenderFrame = window.requestAnimationFrame(() => {
          registryRowsRenderFrame = 0;
          renderChunk_(getRegistryRenderBatchSize_(false), false);
        });
      }

      renderChunk_(Math.min(getRegistryRenderBatchSize_(true), total), true);
    }

    function renderRegistryView_() {
      const registryView = el('registryView');
      const isRegistryViewActive = state.currentView === 'registry';
      renderAdminRegistryUi_();
      registryView.classList.toggle('hidden', !isRegistryViewActive);
      if (!isRegistryViewActive) {
        cancelRegistryRowsRender_();
        renderRegistryColumnsPanel_();
        renderAdminRegistryEditBar_();
        return;
      }
      renderRegistryColumnsPanel_();
      renderRegistryTableStructure_();
      syncRegistryBulkUinUi_();
      populateRegistryFacetFiltersFast_();
      renderRegistrySelectionEditBar_();
      renderRegistrySharedWorkBar_();
      renderAdminRegistryEditBar_();
      const refreshNote = el('registryRefreshNote');
      if (refreshNote) {
        const refreshText = formatRegistryLastUpdatedText_();
        refreshNote.textContent = refreshText;
        refreshNote.classList.toggle('hidden', !refreshText);
      }
      const activeSelection = getActiveRegistrySelection_();
      const hasSavedSelection = !!activeSelection;
      const sharedSelectionActive = isCollaborativeRegistrySelection_(activeSelection);
      const sharedWorkBatchMode = sharedSelectionActive ? getSharedSelectionWorkBatchMode_() : '';
      const isAdminEditing = isAdminRegistryEditMode_();
      const adminSelectionSet = isAdminEditing ? new Set(getAdminRegistrySelectedRowIndexes_()) : null;
      const isSelectionEditing = isRegistrySelectionEditing_();
      const selectionEditSet = isSelectionEditing ? getRegistrySelectionEditDraftSet_() : null;

      const body = el('registryTableBody');
      const visibleColumnDefs = getVisibleRegistryColumnDefs_();
      const colCount = Math.max(visibleColumnDefs.length, 1);
      if (!state.rows.length) {
        el('objectCountBadge').textContent = '0 объектов';
        cancelRegistryRowsRender_();
        body.innerHTML = `<tr><td colspan="${colCount}"><div class="empty-state">Данные еще не загружены.</div></td></tr>`;
        return;
      }
      if (!state.filteredRowIndexes.length) {
        el('objectCountBadge').textContent = '0 объектов';
        cancelRegistryRowsRender_();
        body.innerHTML = `<tr><td colspan="${colCount}"><div class="empty-state">По текущим фильтрам ничего не найдено.</div></td></tr>`;
        return;
      }

      const visibleRowIndexes = getRegistryVisibleRowIndexes_();
      el('objectCountBadge').textContent = `${visibleRowIndexes.length} объектов`;
      if (!visibleRowIndexes.length) {
        const emptyMessage = sharedWorkBatchMode === 'take'
          ? 'Свободные объекты не найдены.'
          : sharedWorkBatchMode === 'release'
            ? 'У вас нет объектов для отмены.'
            : 'По текущим фильтрам ничего не найдено.';
        cancelRegistryRowsRender_();
        body.innerHTML = `<tr><td colspan="${colCount}"><div class="empty-state">${escapeHtml_(emptyMessage)}</div></td></tr>`;
        return;
      }
      renderRegistryRowsProgressively_(body, visibleRowIndexes, {
        hasSavedSelection,
        sharedSelectionActive,
        isAdminEditing,
        adminSelectionSet,
        isSelectionEditing,
        selectionEditSet,
        sharedWorkBatchMode,
        visibleColumnDefs
      });
    }

    function renderAdminRegistryUi_() {
      const editButton = el('btnAdminRegistryEditMode');
      const addButton = el('btnAdminRegistryAdd');
      const deleteButton = el('btnAdminRegistryDelete');
      if (!editButton || !addButton || !deleteButton) return;
      const isAdmin = isCurrentUserAdmin_();
      const isActive = isAdminRegistryEditMode_();
      const selectedCount = getAdminRegistrySelectedRowIndexes_().length;
      const isDeletePending = state.adminRegistryPendingAction === 'delete';
      editButton.classList.toggle('hidden', !isAdmin);
      addButton.classList.toggle('hidden', !isAdmin || !isActive);
      deleteButton.classList.toggle('hidden', !isAdmin || !isActive);
      editButton.classList.toggle('active', isActive);
      editButton.textContent = isActive ? 'Готово' : 'Режим редактирования';
      editButton.disabled = !isAdmin || state.loading || state.adminRegistryDialogSaving || isDeletePending;
      addButton.disabled = state.loading || state.adminRegistryDialogSaving || isDeletePending;
      deleteButton.disabled = state.loading || state.adminRegistryDialogSaving || isDeletePending || !selectedCount;
      addButton.title = state.adminRegistryDialogSaving ? 'Идет сохранение объекта' : 'Добавить объект';
      deleteButton.title = selectedCount
        ? `Удалить выбранные строки (${selectedCount})`
        : 'Сначала выберите строки';
    }

    function renderAdminRegistryEditBar_() {
      const node = el('adminRegistryEditBar');
      if (!node) return;
      if (!isAdminRegistryEditMode_()) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }
      const selectedCount = getAdminRegistrySelectedRowIndexes_().length;
      const note = state.adminRegistryPendingAction === 'delete'
        ? 'Удаляем выбранные строки…'
        : (state.adminRegistryDialogSaving ? 'Сохраняем новый объект…' : 'Отмечайте строки чекбоксами и удаляйте их корзиной или добавляйте новые объекты через +.');
      node.classList.remove('hidden');
      node.innerHTML = (
        `<div class="registry-admin-edit-main">` +
          `<div class="registry-admin-edit-title">Администратор: режим редактирования реестра</div>` +
          `<div class="registry-admin-edit-sub">${escapeHtml_(note)}</div>` +
        `</div>` +
        `<div class="registry-admin-edit-badge">Выбрано: ${selectedCount}</div>`
      );
    }

    function renderAdminRegistryCreateDialog_() {
      const node = el('adminRegistryDialog');
      if (!node) return;
      const isOpen = isCurrentUserAdmin_() && !!state.adminRegistryDialogOpen;
      node.classList.toggle('hidden', !isOpen);
      node.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      if (!isOpen) {
        node.innerHTML = '';
        return;
      }
      const values = state.adminRegistryFormValues || {};
      const saving = !!state.adminRegistryDialogSaving;
      const error = String(state.adminRegistryDialogError || '').trim();
      node.innerHTML = (
        `<div class="surface admin-registry-card" role="dialog" aria-modal="true" aria-labelledby="adminRegistryDialogTitle">` +
          `<div class="admin-registry-card-head">` +
            `<div class="admin-registry-card-title">` +
              `<strong id="adminRegistryDialogTitle">Новый объект</strong>` +
              `<span>Заполните поля объекта, и строка будет добавлена в конец таблицы.</span>` +
            `</div>` +
            `<button class="ghost icon-button" type="button" data-admin-registry-dialog-close="1" aria-label="Закрыть" title="Закрыть"${saving ? ' disabled' : ''}>×</button>` +
          `</div>` +
          (error ? `<div class="admin-registry-error">${escapeHtml_(error)}</div>` : '') +
          `<div class="admin-registry-grid">` +
            ADMIN_REGISTRY_CREATE_FIELDS.map(field => {
              const fieldId = String(field && field.fieldId || '').trim();
              const label = String(field && field.label || fieldId).trim();
              const value = String(values[fieldId] == null ? '' : values[fieldId]);
              const type = String(field && field.type || 'text').trim() || 'text';
              return (
                `<div class="admin-registry-field${field && field.wide ? ' wide' : ''}">` +
                  `<label for="adminRegistryField_${escapeHtml_(fieldId)}">${escapeHtml_(label)}${field && field.required ? ' *' : ''}</label>` +
                  `<input id="adminRegistryField_${escapeHtml_(fieldId)}" type="${escapeHtml_(type)}" value="${escapeHtml_(value)}" data-admin-registry-field-input="${escapeHtml_(fieldId)}"${saving ? ' disabled' : ''}>` +
                `</div>`
              );
            }).join('') +
          `</div>` +
          `<div class="admin-registry-actions">` +
            `<button class="ghost" type="button" data-admin-registry-dialog-close="1"${saving ? ' disabled' : ''}>Отмена</button>` +
            `<button class="primary" type="button" data-admin-registry-dialog-submit="1"${saving ? ' disabled' : ''}>${saving ? 'Сохраняем…' : 'Добавить объект'}</button>` +
          `</div>` +
        `</div>`
      );
    }

    function renderRegistrySelectionEditBar_() {
      const node = el('registrySelectionEditBar');
      if (!node) return;
      const editingId = String(state.selectionComposerSelectionId || '').trim();
      const item = editingId ? findSavedRegistrySelectionById_(editingId) : null;
      const count = Array.isArray(state.selectionEditDraftUins) ? state.selectionEditDraftUins.length : 0;
      const autoSyncDraft = isAutoSyncNewRegistrySelectionDraft_();
      if (!state.selectionComposerOpen) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }
      node.classList.remove('hidden');
      node.innerHTML = (
        `<div class="registry-selection-edit-main">` +
          `<div class="registry-selection-edit-kicker">Черновик проекта</div>` +
          `<div class="registry-selection-edit-title">${
            item
              ? `Редактируется "${escapeHtml_(item.name || 'Проект')}"`
              : 'Собираете новую выборку'
          }</div>` +
          `<div class="registry-selection-edit-sub">${count} · ${
            autoSyncDraft
              ? 'следует текущим фильтрам'
              : 'редактируется вручную'
          }</div>` +
        `</div>` +
        `<div class="registry-selection-edit-actions">` +
          `<button class="ghost" type="button" data-selection-edit-show-only="1">Показать только выборку</button>` +
          `<button class="ghost" type="button" data-selection-edit-clear-filters="1">Сбросить фильтры</button>` +
          `<button class="ghost" type="button" data-selection-edit-close="1">Закрыть режим</button>` +
        `</div>`
      );
      node.querySelectorAll('[data-selection-edit-show-only]').forEach(button => {
        button.addEventListener('click', () => showOnlyRegistrySelectionDraft_());
      });
      node.querySelectorAll('[data-selection-edit-clear-filters]').forEach(button => {
        button.addEventListener('click', () => clearRegistryFiltersForSelectionEdit_());
      });
      node.querySelectorAll('[data-selection-edit-close]').forEach(button => {
        button.addEventListener('click', () => closeRegistrySelectionComposer_());
      });
    }

function renderRegistrySharedWorkBar_() {
      const node = el('registrySharedWorkInlineActions');
      if (!node) return;
      const activeSelection = getActiveRegistrySelection_();
      const canUse = !!getCurrentUserBlockName_();
      const visible = !!(
        activeSelection &&
        canUse &&
        isCollaborativeRegistrySelection_(activeSelection) &&
        !isRegistrySelectionEditing_() &&
        !isAdminRegistryEditMode_()
      );
      if (!visible) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }

      const batchMode = getSharedSelectionWorkBatchMode_();
      const pendingAction = normalizeSharedSelectionWorkBatchMode_(state.sharedSelectionWorkBatchPendingAction);
      const selectedCount = getSharedSelectionWorkBatchSelectedCount_();
      const isTakeMode = batchMode === 'take';
      const isReleaseMode = batchMode === 'release';
      const activeMode = isTakeMode ? 'take' : (isReleaseMode ? 'release' : '');
      const isPending = !!pendingAction;
      const confirmTitle = activeMode === 'take'
        ? (selectedCount ? `Подтвердить выбор (${selectedCount})` : 'Сначала отметьте объекты для выбора')
        : (selectedCount ? `Подтвердить отмену (${selectedCount})` : 'Сначала отметьте объекты для отмены');
      const exitTitle = activeMode === 'take'
        ? 'Выйти из режима "Выбрать"'
        : 'Выйти из режима "Отменить"';
      node.classList.remove('hidden');
      if (!activeMode) {
        const takeTitle = 'Включить режим "Выбрать"';
        const releaseTitle = 'Включить режим "Отменить"';
        node.innerHTML = (
          `<button class="ghost registry-shared-work-mode-button" type="button" data-shared-work-batch-mode="take" title="${escapeHtml_(takeTitle)}" aria-label="${escapeHtml_(takeTitle)}">Выбрать</button>` +
          `<button class="ghost registry-shared-work-mode-button" type="button" data-shared-work-batch-mode="release" title="${escapeHtml_(releaseTitle)}" aria-label="${escapeHtml_(releaseTitle)}">Отменить</button>`
        );
        node.querySelectorAll('[data-shared-work-batch-mode]').forEach(button => {
          button.addEventListener('click', evt => {
            evt.stopPropagation();
            handleRegistrySharedWorkToolbarAction_(String(button.getAttribute('data-shared-work-batch-mode') || ''));
          });
        });
        return;
      }

      node.innerHTML = (
        `<button class="ghost registry-shared-work-icon-button registry-shared-work-confirm${isPending ? ' is-loading' : ''}" type="button" data-shared-work-batch-confirm="1"${isPending || !selectedCount ? ' disabled' : ''} title="${escapeHtml_(isPending ? 'Применяю...' : confirmTitle)}" aria-label="${escapeHtml_(isPending ? 'Применяю...' : confirmTitle)}">` +
          `<svg class="registry-shared-work-icon-svg" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-10"></path></svg>` +
        `</button>` +
        `<button class="ghost registry-shared-work-icon-button registry-shared-work-exit" type="button" data-shared-work-batch-exit="1"${isPending ? ' disabled' : ''} title="${escapeHtml_(exitTitle)}" aria-label="${escapeHtml_(exitTitle)}">` +
          `<svg class="registry-shared-work-icon-svg" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10"></path><path d="M15 5L5 15"></path></svg>` +
        `</button>`
      );

      const confirmButton = node.querySelector('[data-shared-work-batch-confirm]');
      const exitButton = node.querySelector('[data-shared-work-batch-exit]');
      if (confirmButton) {
        confirmButton.addEventListener('click', evt => {
          evt.stopPropagation();
          confirmRegistrySharedWorkBatchMode_();
        });
      }
      if (exitButton) {
        exitButton.addEventListener('click', evt => {
          evt.stopPropagation();
          exitButton.classList.add('is-loading');
          exitButton.disabled = true;
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              exitRegistrySharedWorkBatchMode_();
            });
          });
        });
      }
    }

function renderRegistryRowWorkActionsHtml_(rowIndex, stateInfo) {
      return '';
    }

function renderObjectView_() {
      const objectView = el('objectView');
      objectView.classList.toggle('hidden', state.currentView !== 'object');
      if (state.currentView !== 'object') return;
      renderHeader_();
      renderPassport_();
      renderSectionStack_();
      renderObjectHistory_();
      syncObjectWorkflowUi_();
      syncObjectSaveUi_();
    }

function getEditBadgeSvgHtml_(className) {
      const iconClass = String(className || 'edit-badge-icon-svg').trim() || 'edit-badge-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M4.25 15.75l2.85-.72 7.37-7.37-2.13-2.13-7.37 7.37-.72 2.85Z"></path>` +
          `<path d="M11.85 5.55l2.13 2.13"></path>` +
        `</svg>`
      );
    }

function getTrashIconSvgHtml_(className) {
      const iconClass = String(className || 'saved-selection-action-icon-svg').trim() || 'saved-selection-action-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M6.5 6.5h7"></path>` +
          `<path d="M8 6.5V5.2c0-.44.36-.8.8-.8h2.4c.44 0 .8.36.8.8v1.3"></path>` +
          `<path d="M6.9 6.5l.55 8.1c.03.51.46.9.97.9h3.16c.51 0 .94-.39.97-.9l.55-8.1"></path>` +
          `<path d="M9.1 8.8v4.5"></path>` +
          `<path d="M10.9 8.8v4.5"></path>` +
        `</svg>`
      );
    }

function renderObjectHistory_() {
      const node = el('objectHistorySection');
      const rowIndex = Number(state.selectedRowIndex);
      if (!node) return;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }
      if (!hasLoadedRowDetails_(rowIndex)) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }

      const key = getObjectChangeHistoryKey_(rowIndex);
      const entries = key && Array.isArray(state.changeHistoryByObject[key]) ? state.changeHistoryByObject[key] : [];
      if (!entries.length) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }

      node.classList.remove('hidden');
      node.innerHTML = (
        `<div class="section-card-top">` +
          `<div><h3>История изменений</h3></div>` +
          `<div class="section-card-actions">` +
            `<button class="object-history-clear ghost" type="button" data-clear-history="1">Очистить историю</button>` +
          `</div>` +
        `</div>` +
        `<div class="object-history-list">` +
          `${entries.map((entry, index) => (
            `<article class="object-history-item">` +
              `<div class="object-history-meta">` +
                `<div class="object-history-meta-main">` +
                  `<div class="object-history-field">${escapeHtml_(entry.field)}</div>` +
                  (
                    Number.isFinite(Number(entry.colIndex)) && Number(entry.colIndex) >= 0
                      ? `<button class="object-history-restore ghost" type="button" data-restore-history="${index}" ${canRestoreHistoryEntry_(rowIndex, entry) ? '' : 'disabled'}>Вернуть</button>`
                      : ''
                  ) +
                `</div>` +
                `<div class="object-history-time">${escapeHtml_(formatHistoryTime_(entry.at))}</div>` +
              `</div>` +
              `<div class="object-history-diff">` +
                `<div class="object-history-value old">${renderHistoryValueHtml_(entry.from)}</div>` +
                `<div class="object-history-arrow" aria-hidden="true">→</div>` +
                `<div class="object-history-value">${renderHistoryValueHtml_(entry.to)}</div>` +
              `</div>` +
            `</article>`
          )).join('')}` +
        `</div>`
      );

      node.querySelectorAll('[data-restore-history]').forEach(button => {
        button.addEventListener('click', () => {
          restoreHistoryEntry_(rowIndex, Number(button.getAttribute('data-restore-history')));
        });
      });
      node.querySelectorAll('[data-clear-history]').forEach(button => {
        button.addEventListener('click', () => {
          clearObjectHistory_(rowIndex);
        });
      });
    }

function formatHistoryTime_(timestamp) {
      if (!Number.isFinite(Number(timestamp))) return 'Сейчас';
      try {
        return new Date(Number(timestamp)).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (e) {
        return 'Сейчас';
      }
    }

function renderHistoryValueHtml_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '<span class="field-display-placeholder">Пусто</span>';
      return escapeHtmlWithBreaks_(text);
    }

function renderHeader_() {
      const rowIndex = state.selectedRowIndex;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        el('recordTitle').textContent = 'Выберите объект';
        el('btnHeaderEdit').classList.add('hidden');
        el('recordTitleMetaLine').classList.add('hidden');
        el('recordTitleMetaLine').innerHTML = '';
        el('pinnedGrid').innerHTML = '<div class="empty-state">Карточка объекта появится здесь после выбора строки в реестре.</div>';
        return;
      }

      const summary = getObjectSummary_(rowIndex);
      el('recordTitle').textContent = summary.name || summary.uin || 'Без названия';
      const rowReady = hasLoadedRowDetails_(rowIndex);
      el('btnHeaderEdit').classList.toggle('hidden', state.headerEditing || !rowReady);

      if (state.headerEditing && rowReady) {
        el('recordTitleMetaLine').classList.add('hidden');
        el('recordTitleMetaLine').innerHTML = '';
        el('pinnedGrid').classList.remove('hidden');
        el('pinnedGrid').innerHTML = renderHeaderEditorHtml_(rowIndex);
        bindHeaderEditorEvents_(rowIndex);
        return;
      }

      const dashboardUrl = readCurrentValueBySpec_(rowIndex, DASHBOARD_SPEC);
      const titleItems = getHeaderTitleFieldsForRow_(rowIndex)
        .map(item => renderHeaderMetaItemHtml_(rowIndex, item, dashboardUrl))
        .filter(Boolean);

      el('recordTitleMetaLine').classList.toggle('hidden', !titleItems.length);
      el('recordTitleMetaLine').innerHTML = titleItems.join('');
      el('pinnedGrid').classList.add('hidden');
      el('pinnedGrid').innerHTML = '';

      bindHeaderEditorEvents_(rowIndex);
    }

function renderHeaderMetaItemHtml_(rowIndex, item, dashboardUrl) {
      if (!item) return '';
      if (item.kind === 'status') {
        const value = readCurrentValueBySpec_(rowIndex, item.spec);
        if (!String(value || '').trim()) return '';
        return (
          `<div class="record-meta-item${item.className ? ` ${escapeHtml_(item.className)}` : ''}">` +
            `<button class="status-pill copy-inline-chip" type="button" data-copy-text="${escapeHtml_(value)}" title="Нажмите, чтобы скопировать" aria-label="Скопировать статус">${escapeHtml_(value)}</button>` +
          `</div>`
        );
      }
      if (item.kind === 'done-rv') {
        const valueHtml = renderStatusDoneRvValueHtml_(rowIndex, item);
        if (!valueHtml) return '';
        return (
          `<div class="record-meta-item${item.className ? ` ${escapeHtml_(item.className)}` : ''}">` +
            `<span class="pill accent">${escapeHtml_(item.title || 'Поле')}</span>` +
            valueHtml +
          `</div>`
        );
      }
      if (!item.spec) return '';
      const valueHtml = renderHeaderFieldValueHtml_(rowIndex, item, dashboardUrl);
      if (!valueHtml) return '';
      return (
        `<div class="record-meta-item${item.className ? ` ${escapeHtml_(item.className)}` : ''}">` +
          `<span class="pill accent">${escapeHtml_(item.title || 'Поле')}</span>` +
          valueHtml +
        `</div>`
      );
    }

function renderHeaderFieldValueHtml_(rowIndex, item, dashboardUrl) {
      const value = readCurrentValueBySpec_(rowIndex, item.spec);
      if (item.kind === 'uin') return renderUinValueHtml_(value, dashboardUrl);
      return renderPinnedValueHtml_(item.spec, value);
    }

function getHeaderTitleFieldsForRow_(rowIndex) {
      return HEADER_TITLE_FIELDS.concat(buildStatusDoneHeaderFields_(rowIndex));
    }

function buildStatusDoneHeaderFields_(rowIndex) {
      if (!isStatusDoneForHeader_(rowIndex)) return [];
      return [{
        title: 'РВ',
        kind: 'done-rv',
        dateFieldId: STATUS_DONE_RV_HEADER_FIELDS.date,
        numberFieldId: STATUS_DONE_RV_HEADER_FIELDS.number
      }];
    }

function isStatusDoneForHeader_(rowIndex) {
      const statusValue = normalizeText_(readCurrentValueBySpec_(rowIndex, PINNED_FIELDS[0]));
      return statusValue === 'сдан' || statusValue.startsWith('сдан ');
    }

function renderStatusDoneRvValueHtml_(rowIndex, item) {
      const text = buildStatusDoneRvText_(rowIndex, item);
      if (!text) return '';
      return renderCopyableTextHtml_(text, 'pinned-value', escapeHtml_(text), { title: 'Нажмите, чтобы скопировать РВ' });
    }

    function buildStatusDoneRvText_(rowIndex, item) {
      const dateColumn = findColumnByFieldId_(item && item.dateFieldId);
      const numberColumn = findColumnByFieldId_(item && item.numberFieldId);
      const dateValue = dateColumn ? String(getCellValue_(rowIndex, dateColumn.index) || '').trim() : '';
      const numberValue = numberColumn ? String(getCellValue_(rowIndex, numberColumn.index) || '').trim() : '';
      return buildRvDisplayText_(dateValue, numberValue);
    }

    function buildRvDisplayText_(dateValue, numberValue) {
      if (!dateValue && !numberValue) return '';
      if (dateValue && numberValue) return `${dateValue} (№ ${numberValue})`;
      if (dateValue) return `${dateValue} (№ не заполнен)`;
      return `№ ${numberValue}`;
    }

    function getSectionFieldDisplayLabel_(field) {
      const fieldId = normalizeText_(field && field.fieldId || '');
      if (fieldId && Object.prototype.hasOwnProperty.call(SECTION_FIELD_LABEL_OVERRIDES, fieldId)) {
        return SECTION_FIELD_LABEL_OVERRIDES[fieldId];
      }
      return String(field && field.label || '').trim();
    }

function readCurrentValueBySpec_(rowIndex, spec) {
      const column = findColumnBySpec_(spec);
      return column ? getCellValue_(rowIndex, column.index) : '';
    }

function renderHeaderEditorHtml_(rowIndex) {
      const primaryFields = HEADER_EDIT_FIELDS_COMPACT.slice(0, 4);
      const secondaryFields = HEADER_EDIT_FIELDS_COMPACT.slice(4);
      return (
        `<div class="header-edit-shell">` +
          `<div class="header-edit-grid primary">` +
            `${primaryFields.map(item => renderHeaderEditorFieldHtml_(rowIndex, item, item.spec === OBJECT_NAME_SPEC)).join('')}` +
          `</div>` +
          (secondaryFields.length
            ? `<div class="header-edit-grid secondary">${secondaryFields.map(item => renderHeaderEditorFieldHtml_(rowIndex, item, false)).join('')}</div>`
            : '') +
          `<div class="header-edit-actions">` +
            `<button class="primary" type="button" data-header-finish="1">Готово</button>` +
            `<button class="ghost" type="button" data-header-cancel="1">Отмена</button>` +
          `</div>` +
        `</div>`
      );
    }

function renderHeaderEditorFieldHtml_(rowIndex, item, wide) {
      const column = findColumnBySpec_(item.spec);
      const value = column ? getCellValue_(rowIndex, column.index) : '';
      const textAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_(item && item.title), false);
      return (
        `<label class="header-edit-field${wide ? ' wide' : ''}">` +
          `<span class="header-edit-label">${escapeHtml_(item.title || 'Поле')}</span>` +
          `<input class="field-input" type="text"${textAssistAttrs} data-role="header-input" data-field-index="${column ? column.index : -1}" value="${escapeHtml_(value)}">` +
        `</label>`
      );
    }

function renderPassport_() {
      const node = el('passportSection');
      const rowIndex = state.selectedRowIndex;
      if (!node) return;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }

      const editing = !!state.passportEditing;
      node.classList.remove('hidden');
      node.innerHTML = (
        `<div class="passport-head">` +
          `<div>` +
            `<h3>Паспорт объекта</h3>` +
          `</div>` +
          `<div class="passport-actions">` +
            (
              editing
                ? (
                  `<button class="primary passport-toggle" type="button" data-passport-finish="1">Готово</button>` +
                  `<button class="ghost passport-toggle" type="button" data-passport-cancel="1">Отмена</button>`
                )
                : `<button class="ghost icon-button passport-edit-button" type="button" data-passport-edit="1" title="Редактировать паспорт" aria-label="Редактировать паспорт">${getEditBadgeSvgHtml_()}</button>`
            ) +
            `<button class="ghost passport-toggle" type="button" data-toggle-passport="1">${state.passportCollapsed ? 'Показать' : 'Скрыть'}</button>` +
          `</div>` +
        `</div>` +
        (
          state.passportCollapsed
            ? ''
            : `<div class="passport-rows${editing ? ' is-editing' : ''}">${renderPassportRowsHtml_(rowIndex, editing)}</div>`
        )
      );

      bindPassportEvents_(node, rowIndex);

      if (!state.passportCollapsed && editing && state.pendingFocusFieldKey) {
        const target = node.querySelector(`[data-edit-key="${state.pendingFocusFieldKey}"]`);
        if (target) {
          target.focus();
          trySetInputSelectionToEnd_(target);
        }
        state.pendingFocusFieldKey = '';
      }
    }

function renderPassportRowsHtml_(rowIndex, editing) {
      const items = PASSPORT_ITEM_DEFS;
      return items.map(item => (
        `<div class="passport-row">` +
          `${renderPassportItemHtml_(rowIndex, item, editing)}` +
        `</div>`
      )).join('');
    }

function renderPassportItemHtml_(rowIndex, item, editing) {
      if (!item) return '';
      if (item.type === 'contacts') return renderPassportContactHtml_(rowIndex, item, editing);
      return renderPassportFieldHtml_(rowIndex, item, editing);
    }

function renderPassportFieldHtml_(rowIndex, item, editing) {
      const column = findColumnBySpec_(item.spec);
      const colIndex = column ? column.index : -1;
      const value = column ? getCellValue_(rowIndex, colIndex) : '';
      const changed = column ? hasEditedValue_(rowIndex, colIndex) : false;
      const multiline = shouldUseTextareaForField_(item && item.title, value);
      const stacked = shouldUseStackedFieldDisplay_(item.title, value);
      return (
        `<article class="passport-item${stacked ? ' stacked' : ''}${changed ? ' changed' : ''}${editing ? ' is-editing' : ''}">` +
          `<div class="passport-item-label">${escapeHtml_(item.title || 'Поле')}</div>` +
          (
            editing && column
              ? renderPassportFieldEditorHtml_(rowIndex, colIndex, value, multiline, item && item.title)
              : renderPassportFieldDisplayHtml_(value, stacked)
          ) +
        `</article>`
      );
    }

function renderPassportFieldEditorHtml_(rowIndex, colIndex, value, multiline, label) {
      const inputId = `passport_${rowIndex}_${colIndex}`;
      const editKey = fieldEditKey_(rowIndex, colIndex);
      const textAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_(label, { multiline }), multiline);
      return multiline
        ? `<textarea id="${escapeHtml_(inputId)}" class="field-input"${textAssistAttrs} data-role="passport-input" data-field-index="${colIndex}" data-edit-key="${escapeHtml_(editKey)}">${escapeHtml_(value || '')}</textarea>`
        : `<input id="${escapeHtml_(inputId)}" class="field-input" type="text"${textAssistAttrs} data-role="passport-input" data-field-index="${colIndex}" data-edit-key="${escapeHtml_(editKey)}" value="${escapeHtml_(value || '')}">`;
    }

function renderPassportFieldDisplayHtml_(value, stacked) {
      const text = normalizeInlineDisplayText_(value);
      if (!text) return `<div class="passport-item-placeholder">Пока пусто</div>`;
      return renderCopyableTextHtml_(
        text,
        'passport-item-value',
        stacked ? escapeHtmlWithBreaks_(String(value == null ? '' : value).trim()) : escapeHtml_(text),
        { stacked: !!stacked }
      );
    }

function renderPassportContactHtml_(rowIndex, item, editing) {
      const indexes = getPassportContactIndexes_(item);
      const personValue = indexes.person >= 0 ? getCellValue_(rowIndex, indexes.person) : '';
      const detailsValue = indexes.details >= 0 ? getCellValue_(rowIndex, indexes.details) : '';
      const changed = hasPassportContactChanges_(rowIndex, indexes);
      return (
        `<article class="passport-item${changed ? ' changed' : ''}${editing ? ' is-editing' : ''}">` +
          `<div class="passport-item-label">${escapeHtml_(item.title || 'Контакты')}</div>` +
          (
            editing
              ? renderPassportContactEditorHtml_(rowIndex, indexes, personValue, detailsValue)
              : renderPassportContactDisplayHtml_(personValue, detailsValue)
          ) +
        `</article>`
      );
    }

function renderPassportContactDisplayHtml_(personValue, detailsValue) {
      const person = normalizeInlineDisplayText_(personValue);
      const details = normalizeInlineDisplayText_(detailsValue);
      if (!person && !details) return `<div class="passport-item-placeholder">Пока пусто</div>`;
      return (
        `<div class="passport-contact-display">` +
          `<div class="passport-contact-line">` +
            (person ? renderCopyableTextHtml_(person, 'passport-contact-person', escapeHtml_(person)) : '') +
            (person && details ? `<span class="passport-contact-separator"> / </span>` : '') +
            (details ? renderCopyableTextHtml_(details, 'passport-contact-details', escapeHtml_(details)) : '') +
          `</div>` +
        `</div>`
      );
    }

function renderPassportContactEditorHtml_(rowIndex, indexes, personValue, detailsValue) {
      const personTextAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_('', { placeholder: 'Руководитель проекта (Заказчик)' }), false);
      const detailsTextAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_('', { placeholder: 'Контактные данные' }), false);
      return (
        `<div class="passport-contact-edit">` +
          (
            indexes.person >= 0
              ? `<input class="field-input" type="text"${personTextAssistAttrs} data-role="passport-input" data-field-index="${indexes.person}" data-edit-key="${escapeHtml_(fieldEditKey_(rowIndex, indexes.person))}" placeholder="Руководитель проекта (Заказчик)" value="${escapeHtml_(personValue || '')}">`
              : ''
          ) +
          (
            indexes.details >= 0
              ? `<input class="field-input" type="text"${detailsTextAssistAttrs} data-role="passport-input" data-field-index="${indexes.details}" data-edit-key="${escapeHtml_(fieldEditKey_(rowIndex, indexes.details))}" placeholder="Контактные данные" value="${escapeHtml_(detailsValue || '')}">`
              : ''
          ) +
        `</div>`
      );
    }

function getPassportContactIndexes_(item) {
      const personColumn = item && item.personSpec ? findColumnBySpec_(item.personSpec) : null;
      const detailsColumn = item && item.detailsSpec ? findColumnBySpec_(item.detailsSpec) : null;
      return {
        person: personColumn ? personColumn.index : -1,
        details: detailsColumn ? detailsColumn.index : -1
      };
    }

function hasPassportContactChanges_(rowIndex, indexes) {
      return (
        (Number.isFinite(indexes.person) && indexes.person >= 0 && hasEditedValue_(rowIndex, indexes.person)) ||
        (Number.isFinite(indexes.details) && indexes.details >= 0 && hasEditedValue_(rowIndex, indexes.details))
      );
    }

function renderSectionChips_() {
      const node = el('sectionChips');
      const panel = el('selectedSectionsPanel');
      if (!state.activeSections.length) {
        node.innerHTML = '';
        if (panel) panel.classList.add('hidden');
        return;
      }
      if (panel) panel.classList.remove('hidden');
      node.innerHTML = state.activeSections.map(section => (
        `<span class="section-chip">` +
          `${escapeHtml_(section.title)}` +
          `<button type="button" data-remove-section="${escapeHtml_(section.id)}">×</button>` +
        `</span>`
      )).join('');

      node.querySelectorAll('[data-remove-section]').forEach(button => {
        button.addEventListener('click', () => removeSection_(String(button.getAttribute('data-remove-section') || '')));
      });
    }

function getSectionPlaceholderMessage_(section) {
      return String(section && section.stubMessage || '').trim();
    }

function isGoogleOwnedHtmlFieldId_(fieldId) {
      const normalizedFieldId = normalizeText_(fieldId);
      if (!normalizedFieldId) return false;
      if (GOOGLE_OWNED_HTML_FIELD_IDS.has(normalizedFieldId)) return true;
      return GOOGLE_OWNED_HTML_FIELD_PREFIXES.some(prefix => normalizedFieldId.startsWith(prefix));
    }

function canEditSectionField_(field) {
      const fieldId = normalizeText_(field && field.fieldId || '');
      if (!fieldId) return false;
      return !isGoogleOwnedHtmlFieldId_(fieldId);
    }

function sectionHasEditableFields_(section, rowIndex) {
      const fields = getSectionFields_(section, rowIndex);
      return fields.some(field => canEditSectionField_(field));
    }

function canEditSection_(section) {
      if (!section) return false;
      if (getSectionPlaceholderMessage_(section)) return false;
      const rowIndex = Number.isFinite(state.selectedRowIndex) ? state.selectedRowIndex : -1;
      if (rowIndex < 0) return false;
      return sectionHasEditableFields_(section, rowIndex);
    }

function renderSectionStack_() {
      const stack = el('sectionStack');
      const rowIndex = state.selectedRowIndex;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        stack.innerHTML = '<div class="empty-state">Сначала выберите объект в реестре.</div>';
        return;
      }
      if (!state.activeSections.length) {
        stack.innerHTML = '';
        return;
      }
      if (state.sectionEditingId && !state.activeSections.some(section => section.id === state.sectionEditingId && canEditSection_(section))) {
        state.sectionEditingId = '';
        state.sectionEditSnapshot = new Map();
      }

      stack.innerHTML = state.activeSections.map(section => {
        const placeholderMessage = getSectionPlaceholderMessage_(section);
        const fields = placeholderMessage ? [] : getSectionFields_(section, rowIndex);
        const editable = canEditSection_(section);
        const editing = editable && state.sectionEditingId === section.id;
        const renderItems = buildSectionRenderItems_(fields, section, editing);
        const rows = buildSectionRows_(renderItems);
        return (
          `<section class="surface section-card" id="${escapeHtml_(sectionDomId_(section.id))}">` +
            `<div class="section-card-top">` +
              `<div>` +
                `<h3>${escapeHtml_(section.title)}</h3>` +
              `</div>` +
              `<div class="section-card-actions">` +
                (
                  editing
                    ? (
                      `<button class="primary passport-toggle" type="button" data-section-finish="${escapeHtml_(section.id)}">Готово</button>` +
                      `<button class="ghost passport-toggle" type="button" data-section-cancel="${escapeHtml_(section.id)}">Отмена</button>`
                    )
                    : (
                      editable
                        ? `<button class="ghost icon-button section-edit-button" type="button" data-section-edit="${escapeHtml_(section.id)}" title="Редактировать раздел" aria-label="Редактировать раздел">${getEditBadgeSvgHtml_()}</button>`
                        : ''
                    )
                ) +
                `<button class="ghost passport-toggle" type="button" data-remove-section="${escapeHtml_(section.id)}">Убрать</button>` +
              `</div>` +
            `</div>` +
            (
              rows.length
                ? `<div class="section-rows${editing ? ' is-editing' : ''}">${rows.map(items => renderSectionRowHtml_(items, rowIndex, editing)).join('')}</div>`
                : `<div class="empty-state">${escapeHtml_(placeholderMessage || 'Для текущего объекта в этой секции пока нет подходящих полей.')}</div>`
            ) +
          `</section>`
        );
      }).join('');

      stack.querySelectorAll('[data-remove-section]').forEach(button => {
        button.addEventListener('click', () => removeSection_(String(button.getAttribute('data-remove-section') || '')));
      });
      stack.querySelectorAll('[data-section-edit]').forEach(button => {
        button.addEventListener('click', () => {
          const sectionId = String(button.getAttribute('data-section-edit') || '');
          const section = state.activeSections.find(item => item.id === sectionId);
          if (!section) return;
          startSectionEdit_(section, rowIndex);
          renderSectionStack_();
          syncObjectSaveUi_();
        });
      });
      stack.querySelectorAll('[data-section-finish]').forEach(button => {
        button.addEventListener('click', () => {
          finishSectionEdit_();
          renderSectionStack_();
          syncObjectSaveUi_();
        });
      });
      stack.querySelectorAll('[data-section-cancel]').forEach(button => {
        button.addEventListener('click', () => {
          cancelSectionEdit_(rowIndex);
          renderSectionStack_();
          syncObjectSaveUi_();
        });
      });
      bindEditableFieldContainerEvents_(stack);

      if (state.pendingFocusFieldKey) {
        const target = stack.querySelector(`[data-edit-key="${state.pendingFocusFieldKey}"]`);
        if (target) {
          target.focus();
          trySetInputSelectionToEnd_(target);
        }
        state.pendingFocusFieldKey = '';
      }
    }

function renderSectionRowHtml_(items, rowIndex, editing) {
      return (
        `<div class="section-row">` +
          `${(Array.isArray(items) ? items : []).map(item => renderSectionItemHtml_(item, rowIndex, editing)).join('')}` +
        `</div>`
      );
    }

    function renderSectionFieldItemHtml_(field, rowIndex, editing) {
      const value = getCellValue_(rowIndex, field.index);
      const changed = hasEditedValue_(rowIndex, field.index) ? ' changed' : '';
      const fieldLabel = getSectionFieldDisplayLabel_(field) || `Поле ${field.index + 1}`;
      const multiline = shouldUseTextareaForField_(fieldLabel, value);
      const linkKind = getFieldLinkKind_(field);
      const inputId = `field_${rowIndex}_${field.index}`;
      const stacked = linkKind ? false : shouldUseStackedFieldDisplay_(fieldLabel, value);
      const inlineLink = !editing && linkKind && isHttpUrl_(value);
      const editable = canEditSectionField_(field);
      return (
        `<article class="section-item${stacked ? ' stacked' : ''}${inlineLink ? ' link-inline' : ''}${changed}${editing ? ' is-editing' : ''}">` +
          `<div class="section-item-label">${escapeHtml_(fieldLabel)}</div>` +
          (
            editing
              ? renderSectionFieldEditorHtml_(field, value, multiline, inputId, linkKind, rowIndex, field.index, editable)
              : renderSectionFieldDisplayHtml_(value, linkKind, stacked)
          ) +
        `</article>`
      );
    }

    function renderSectionLinkedFieldItemHtml_(item, rowIndex, editing) {
      const field = item && item.field;
      const linkField = item && item.linkField;
      if (!field || !linkField) return '';
      const value = getCellValue_(rowIndex, field.index);
      const href = getCellValue_(rowIndex, linkField.index);
      const changed = (hasEditedValue_(rowIndex, field.index) || hasEditedValue_(rowIndex, linkField.index)) ? ' changed' : '';
      if (String(item && item.linkKind || '') === 'checklist') {
        if (editing) {
          return (
            `<article class="section-item${changed} is-editing">` +
              `<div class="section-item-label">${escapeHtml_(getSectionFieldDisplayLabel_(field) || field.label || `Поле ${field.index + 1}`)}</div>` +
              `${renderSectionLinkedChecklistEditorHtml_(field, linkField, rowIndex)}` +
            `</article>`
          );
        }
        return (
          `<article class="section-item${changed}">` +
            `<div class="section-item-label">${escapeHtml_(getSectionFieldDisplayLabel_(field) || field.label || `Поле ${field.index + 1}`)}</div>` +
            `<div class="section-item-main">` +
              `<div class="section-item-link-stack">` +
                `<div class="section-item-display">` +
                  `${renderSectionLinkedValueHtml_(value, href, item && item.linkKind)}` +
                `</div>` +
                `${renderFieldLinkActionHtml_(href, item && item.linkKind)}` +
              `</div>` +
            `</div>` +
          `</article>`
        );
      }
      return (
        `<article class="section-item${changed}">` +
          `<div class="section-item-label">${escapeHtml_(field.label || `Поле ${field.index + 1}`)}</div>` +
          `<div class="section-item-main">` +
            `<div class="section-item-link-stack">` +
              `<div class="section-item-display">` +
                `${renderSectionLinkedValueHtml_(value, href, item && item.linkKind)}` +
                `${renderFieldLinkActionHtml_(href, item && item.linkKind)}` +
              `</div>` +
              `<div class="field-display-placeholder">Ссылка подключена</div>` +
            `</div>` +
          `</div>` +
        `</article>`
      );
    }

    function renderSectionItemHtml_(item, rowIndex, editing) {
      if (!item) return '';
      if (item.type === 'group') return renderSectionGroupHtml_(item, rowIndex, editing);
      if (item.type === 'rv-field') return renderSectionRvFieldItemHtml_(item, rowIndex);
      if (item.type === 'linked-field') return renderSectionLinkedFieldItemHtml_(item, rowIndex, editing);
      return renderSectionFieldItemHtml_(item.field, rowIndex, editing);
    }

    function renderSectionRvFieldItemHtml_(item, rowIndex) {
      const dateField = item && item.dateField;
      const numberField = item && item.numberField;
      const changed = (
        (dateField && hasEditedValue_(rowIndex, dateField.index)) ||
        (numberField && hasEditedValue_(rowIndex, numberField.index))
      ) ? ' changed' : '';
      const text = buildRvDisplayText_(
        dateField ? String(getCellValue_(rowIndex, dateField.index) || '').trim() : '',
        numberField ? String(getCellValue_(rowIndex, numberField.index) || '').trim() : ''
      );
      return (
        `<article class="section-item${changed}">` +
          `<div class="section-item-label">${escapeHtml_(String(item && item.title || 'РВ'))}</div>` +
          `<div class="section-item-main">` +
            `<div class="section-item-display">` +
              (
                text
                  ? renderCopyableTextHtml_(text, 'field-display-text', escapeHtml_(text), { title: 'Нажмите, чтобы скопировать РВ' })
                  : `<div class="field-display-placeholder">Пока пусто</div>`
              ) +
            `</div>` +
          `</div>` +
        `</article>`
      );
    }

function renderSectionGroupHtml_(group, rowIndex, editing) {
      const changed = (Array.isArray(group.items) ? group.items : []).some(item => hasEditedValue_(rowIndex, item.field.index));
      return (
        `<article class="section-item section-item-wide section-group-item${changed ? ' changed' : ''}${editing ? ' is-editing' : ''}">` +
          `<div class="section-item-label">${escapeHtml_(group.title)}</div>` +
          `<div class="section-group-grid">` +
            `${group.items.map(item => renderSectionGroupSubitemHtml_(item, rowIndex, editing)).join('')}` +
          `</div>` +
        `</article>`
      );
    }

function renderSectionGroupSubitemHtml_(item, rowIndex, editing) {
      const field = item.field;
      const value = getCellValue_(rowIndex, field.index);
      const changed = hasEditedValue_(rowIndex, field.index) ? ' changed' : '';
      const multiline = shouldUseTextareaForField_(field && (field.label || item.shortLabel), value);
      const linkKind = getFieldLinkKind_(field);
      const inputId = `field_${rowIndex}_${field.index}`;
      const stacked = linkKind ? false : shouldUseStackedGroupSubitemDisplay_(item, value);
      const inlineLink = !editing && linkKind && isHttpUrl_(value);
      const editable = canEditSectionField_(field);
      return (
        `<div class="section-subitem${stacked ? ' stacked' : ''}${inlineLink ? ' link-inline' : ''}${changed}${editing ? ' is-editing' : ''}">` +
          `<div class="section-subitem-label">${escapeHtml_(item.shortLabel)}</div>` +
          (
            editing
              ? renderSectionFieldEditorHtml_(field, value, multiline, inputId, linkKind, rowIndex, field.index, editable)
              : renderSectionFieldDisplayHtml_(value, linkKind, stacked)
          ) +
        `</div>`
      );
    }

function shouldUseStackedGroupSubitemDisplay_(item, value) {
      const shortLabelKey = normalizeText_(item && item.shortLabel || '');
      const text = String(value == null ? '' : value).trim();
      if (/^(план|факт)$/.test(shortLabelKey) && text.length <= 40 && !shouldUseTextarea_(value)) {
        return false;
      }
      return shouldUseStackedFieldDisplay_(item && item.shortLabel || '', value);
    }

    function renderSectionFieldEditorHtml_(field, value, multiline, inputId, linkKind, rowIndex, colIndex, editable) {
      const editKey = fieldEditKey_(rowIndex, colIndex);
      const useTextarea = multiline && !linkKind;
      const fieldLabel = getSectionFieldDisplayLabel_(field);
      const canEdit = editable !== false;
      const textAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_(fieldLabel || (field && field.label), {
        multiline: useTextarea,
        linkKind
      }), useTextarea);
      const autoCalculated = getAutoCalculatedCellValueInfo_(rowIndex, colIndex);
      if (autoCalculated) {
        return (
          `<div class="section-item-main">` +
            `<input id="${escapeHtml_(inputId)}" class="field-input field-input-readonly" type="text" value="${escapeHtml_(autoCalculated.value || '')}" readonly tabindex="-1" aria-readonly="true" data-auto-calculated-field-index="${colIndex}" title="Рассчитывается автоматически по формуле Профинансировано x 100 / Сумма контракта">` +
          `</div>`
        );
      }
      if (!canEdit) {
        return (
          `<div class="section-item-main">` +
            (
              useTextarea
                ? `<textarea id="${escapeHtml_(inputId)}" class="field-input field-input-readonly" readonly tabindex="-1" aria-readonly="true" data-google-owned-field-index="${colIndex}" title="Поле обновляется из Google Sheets">${escapeHtml_(value || '')}</textarea>`
                : `<input id="${escapeHtml_(inputId)}" class="field-input field-input-readonly" type="text" value="${escapeHtml_(value || '')}" readonly tabindex="-1" aria-readonly="true" data-google-owned-field-index="${colIndex}" title="Поле обновляется из Google Sheets">`
            ) +
            `<div class="field-display-placeholder">Обновляется из Google</div>` +
          `</div>`
        );
      }
      return (
        `<div class="section-item-main">` +
          (
            useTextarea
              ? `<textarea id="${escapeHtml_(inputId)}" class="field-input"${textAssistAttrs} data-role="field-input" data-field-index="${colIndex}" data-link-kind="${escapeHtml_(linkKind)}" data-edit-key="${escapeHtml_(editKey)}">${escapeHtml_(value || '')}</textarea>`
              : `<input id="${escapeHtml_(inputId)}" class="field-input"${textAssistAttrs} data-role="field-input" data-field-index="${colIndex}" data-link-kind="${escapeHtml_(linkKind)}" data-edit-key="${escapeHtml_(editKey)}" value="${escapeHtml_(value || '')}">`
          ) +
          `${linkKind ? renderFieldLinkActionHtml_(value, linkKind) : ''}` +
        `</div>`
      );
    }

    function renderSectionLinkedChecklistEditorHtml_(field, linkField, rowIndex) {
      const fieldLabel = getSectionFieldDisplayLabel_(field) || String(field && field.label || `Поле ${Number(field && field.index) + 1}`).trim();
      const linkLabel = getSectionFieldDisplayLabel_(linkField) || String(linkField && linkField.label || `Поле ${Number(linkField && linkField.index) + 1}`).trim();
      const value = getCellValue_(rowIndex, field.index);
      const href = getCellValue_(rowIndex, linkField.index);
      const fieldInputId = `field_${rowIndex}_${field.index}`;
      const linkInputId = `field_${rowIndex}_${linkField.index}`;
      const fieldEditKey = fieldEditKey_(rowIndex, field.index);
      const linkEditKey = fieldEditKey_(rowIndex, linkField.index);
      const fieldTextAssistAttrs = buildTextAssistAttrs_(
        shouldEnableTextAssist_(fieldLabel, { multiline: false, linkKind: '' }),
        false
      );
      const linkTextAssistAttrs = buildTextAssistAttrs_(
        shouldEnableTextAssist_(linkLabel, { multiline: false, linkKind: 'checklist' }),
        false
      );
      return (
        `<div class="section-item-main section-linked-editor">` +
          `<label class="section-linked-editor-row">` +
            `<span class="section-linked-editor-label">${escapeHtml_(fieldLabel)}</span>` +
            `<input id="${escapeHtml_(fieldInputId)}" class="field-input"${fieldTextAssistAttrs} data-role="field-input" data-field-index="${field.index}" data-link-kind="" data-edit-key="${escapeHtml_(fieldEditKey)}" value="${escapeHtml_(value || '')}">` +
          `</label>` +
          `<div class="section-linked-editor-row">` +
            `<label class="section-linked-editor-input">` +
              `<span class="section-linked-editor-label">${escapeHtml_(linkLabel)}</span>` +
              `<input id="${escapeHtml_(linkInputId)}" class="field-input"${linkTextAssistAttrs} data-role="field-input" data-field-index="${linkField.index}" data-link-kind="checklist" data-edit-key="${escapeHtml_(linkEditKey)}" value="${escapeHtml_(href || '')}">` +
            `</label>` +
            `${renderFieldLinkActionHtml_(href, 'checklist')}` +
          `</div>` +
        `</div>`
      );
    }

function renderSectionFieldDisplayHtml_(value, linkKind, stacked) {
      if (linkKind && isHttpUrl_(value)) {
        return (
          `<div class="section-item-main">` +
            `<div class="section-item-link-stack">` +
              `<div class="section-item-display">${renderFieldLinkActionHtml_(value, linkKind)}</div>` +
              `<div class="field-display-placeholder">Ссылка подключена</div>` +
            `</div>` +
          `</div>`
        );
      }
      return (
        `<div class="section-item-main">` +
          `<div class="section-item-display">` +
            `${renderFieldDisplayTextHtml_(value, linkKind, stacked)}` +
            `${linkKind ? renderFieldLinkActionHtml_(value, linkKind) : ''}` +
          `</div>` +
        `</div>`
      );
    }

function renderCopyableTextHtml_(text, className, displayHtml, options) {
      const value = String(text == null ? '' : text).trim();
      if (!value) return '';
      const settings = options || {};
      const title = String(settings.title || 'Нажмите, чтобы скопировать').trim() || 'Нажмите, чтобы скопировать';
      const classes = [
        String(className || '').trim(),
        'copy-inline-text',
        settings.stacked ? 'copy-inline-text--stacked' : ''
      ].filter(Boolean).join(' ');
      return (
        `<button class="${escapeHtml_(classes)}" type="button" data-copy-text="${escapeHtml_(value)}" title="${escapeHtml_(title)}" aria-label="${escapeHtml_(title)}">` +
          `${displayHtml}` +
        `</button>`
      );
    }

function renderCopyActionButtonHtml_(text, title, extraClass) {
      const value = String(text == null ? '' : text).trim();
      if (!value) return '';
      const label = String(title || 'Скопировать').trim() || 'Скопировать';
      const classes = ['copy-action-button', String(extraClass || '').trim()].filter(Boolean).join(' ');
      return (
        `<button class="${escapeHtml_(classes)}" type="button" data-copy-text="${escapeHtml_(value)}" title="${escapeHtml_(label)}" aria-label="${escapeHtml_(label)}">` +
          `<svg class="copy-action-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">` +
            `<rect x="5.25" y="2.25" width="8.5" height="8.5" rx="1.75"></rect>` +
            `<path d="M10.75 13.75H4.5a2.25 2.25 0 0 1-2.25-2.25V5.25"></path>` +
          `</svg>` +
        `</button>`
      );
    }

function buildSectionRows_(items) {
      return (Array.isArray(items) ? items : []).map(item => [item]);
    }

function renderFieldDisplayTextHtml_(value, linkKind, stacked) {
      const text = normalizeInlineDisplayText_(value);
      if (!text) return `<div class="field-display-placeholder">Пока пусто</div>`;
      if (linkKind && isHttpUrl_(text)) return `<div class="field-display-placeholder">Ссылка подключена</div>`;
      return renderCopyableTextHtml_(
        text,
        'field-display-text',
        stacked ? escapeHtmlWithBreaks_(String(value == null ? '' : value).trim()) : escapeHtml_(text),
        { stacked: !!stacked }
      );
    }

function buildSectionRenderItems_(fields, section, editing) {
      const out = [];
      const groupIndexByKey = new Map();
      const compoundMap = buildSpecialSectionCompoundMap_(fields, section, editing);
      const consumedIndexes = new Set();

      (Array.isArray(fields) ? fields : []).forEach(field => {
        if (!field || consumedIndexes.has(field.index)) return;
        const compoundItem = compoundMap.get(field.index);
        if (compoundItem) {
          out.push(compoundItem);
          const compoundIndexes = Array.isArray(compoundItem.fieldIndexes)
            ? compoundItem.fieldIndexes
            : [field.index];
          compoundIndexes.forEach(index => {
            const normalizedIndex = Number(index);
            if (Number.isFinite(normalizedIndex)) consumedIndexes.add(normalizedIndex);
          });
          if (compoundItem.linkField) consumedIndexes.add(compoundItem.linkField.index);
          return;
        }
        const grouped = splitGroupedFieldLabel_(field && field.label);
        if (!grouped) {
          out.push({ type: 'field', field });
          return;
        }

        const groupKey = normalizeText_(grouped.title);
        if (!groupKey) {
          out.push({ type: 'field', field });
          return;
        }

        if (!groupIndexByKey.has(groupKey)) {
          out.push({
            type: 'group',
            title: grouped.title,
            items: [{ field, shortLabel: grouped.shortLabel }]
          });
          groupIndexByKey.set(groupKey, out.length - 1);
          return;
        }

        out[groupIndexByKey.get(groupKey)].items.push({ field, shortLabel: grouped.shortLabel });
      });

      return out.flatMap(item => (
        item.type === 'group' && item.items.length < 2
          ? [{ type: 'field', field: item.items[0].field }]
          : [item]
      )).map(item => (
        item && item.type === 'group'
          ? { ...item, items: sortSectionGroupItems_(item.items) }
          : item
      ));
    }

function sortSectionGroupItems_(items) {
      const list = Array.isArray(items) ? items.slice() : [];
      const priorityByLabel = { 'план': 0, 'факт': 1 };
      return list.sort((a, b) => {
        const labelA = normalizeText_(a && a.shortLabel || '');
        const labelB = normalizeText_(b && b.shortLabel || '');
        const priorityA = Object.prototype.hasOwnProperty.call(priorityByLabel, labelA) ? priorityByLabel[labelA] : 99;
        const priorityB = Object.prototype.hasOwnProperty.call(priorityByLabel, labelB) ? priorityByLabel[labelB] : 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return Number(a && a.field && a.field.index) - Number(b && b.field && b.field.index);
      });
    }

    function buildSpecialSectionCompoundMap_(fields, section, editing) {
      const map = new Map();
      if (!section) return map;
      const list = Array.isArray(fields) ? fields : [];
      const sourceKey = String(section.sourceKey || '').trim();
      if (sourceKey === '__objects__') {
        const anoField = list.find(field => normalizeText_(field && field.fieldId || '') === 'sm_1_1') || null;
        const checklistField = list.find(field => normalizeText_(field && field.fieldId || '') === 'sm_1_2') || null;
        if (anoField && checklistField) {
          map.set(anoField.index, {
            type: 'linked-field',
            field: anoField,
            linkField: checklistField,
            linkKind: 'checklist'
          });
        }
      }
      if (sourceKey === '__ksg__') {
        const dateField = list.find(field => normalizeText_(field && field.fieldId || '') === 'ksg_12_3') || null;
        const numberField = list.find(field => normalizeText_(field && field.fieldId || '') === 'ksg_12_4') || null;
        const fieldIndexes = [dateField && dateField.index, numberField && numberField.index]
          .map(value => Number(value))
          .filter(value => Number.isFinite(value));
        if (fieldIndexes.length) {
          const rvItem = {
            type: 'rv-field',
            title: 'РВ',
            field: dateField || numberField,
            dateField,
            numberField,
            fieldIndexes
          };
          fieldIndexes.forEach(index => map.set(index, rvItem));
        }
      }
      return map;
    }

    function renderSectionLinkedValueHtml_(value, href, linkKind) {
      const text = normalizeInlineDisplayText_(value);
      const url = String(href == null ? '' : href).trim();
      if (isHttpUrl_(url)) {
        if (String(linkKind || '') === 'checklist') {
          return `<a class="field-link-text" data-role="field-link" href="${escapeHtml_(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml_(text || 'Пусто')}</a>`;
        }
        return '';
      }
      if (!text) return `<div class="field-display-placeholder">Пока пусто</div>`;
      return `<span class="field-display-text">${escapeHtml_(text)}</span>`;
    }

function splitGroupedFieldLabel_(label) {
      const text = String(label == null ? '' : label).trim();
      const match = text.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      if (!match) return null;

      const title = String(match[1] || '').trim();
      const shortLabel = formatGroupedFieldLabel_(match[2]);
      if (!title || !shortLabel) return null;

      return { title, shortLabel };
    }

function formatGroupedFieldLabel_(value) {
      const text = String(value == null ? '' : value).trim().toLowerCase();
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

function renderFieldLinkActionHtml_(value, linkKind) {
      if (!linkKind) return '';
      const text = String(value == null ? '' : value).trim();
      const href = isHttpUrl_(text) ? text : '';
      if (!href) return '';
      return (
        `<span class="inline-action-group">` +
          `<a class="field-link-action" data-role="field-link" href="${escapeHtml_(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml_(getFieldLinkActionText_(linkKind))}</a>` +
          `${renderCopyActionButtonHtml_(href, 'Скопировать ссылку')}` +
        `</span>`
      );
    }

function applyRegistryRangeFacetFilterFromMenu_(facetKey, menu) {
      const key = String(facetKey || '').trim();
      if (!key || !menu) return;
      if (isNumberRangeFacetDef_(key)) {
        updateRegistryFacetFilter_(key, normalizeNumberRangeFacetFilter_({
          min: getRegistryRangeFacetMenuValue_(menu, 'min'),
          max: getRegistryRangeFacetMenuValue_(menu, 'max')
        }));
        return;
      }
      if (isDateRangeFacetDef_(key)) {
        updateRegistryFacetFilter_(key, normalizeDateRangeFacetFilter_({
          from: getRegistryRangeFacetMenuValue_(menu, 'from'),
          to: getRegistryRangeFacetMenuValue_(menu, 'to')
        }));
      }
    }

function getRegistryRangeFacetMenuValue_(menu, bound) {
      const input = menu.querySelector(`[data-range-bound="${String(bound || '').trim()}"]`);
      return input ? String(input.value || '') : '';
    }

    // ----- Bind -----

function bindRegistryFacetMenuEvents_(def, menu) {
      if (!menu || menu.dataset.bound === '1') return;
      menu.dataset.bound = '1';
      menu.addEventListener('click', evt => {
        const input = evt.target.closest('[data-registry-filter-search]');
        if (input) {
          evt.stopPropagation();
          return;
        }
        const allButton = evt.target.closest('[data-registry-filter-all]');
        if (allButton) {
          evt.stopPropagation();
          toggleRegistryFacetAll_(String(allButton.getAttribute('data-registry-filter-all') || ''));
          return;
        }
        const rangeClearButton = evt.target.closest('[data-registry-filter-range-clear]');
        if (rangeClearButton) {
          evt.stopPropagation();
          updateRegistryFacetFilter_(String(rangeClearButton.getAttribute('data-registry-filter-range-clear') || ''), null);
          return;
        }
        const rangeApplyButton = evt.target.closest('[data-registry-filter-range-apply]');
        if (rangeApplyButton) {
          evt.stopPropagation();
          applyRegistryRangeFacetFilterFromMenu_(
            String(rangeApplyButton.getAttribute('data-registry-filter-range-apply') || ''),
            menu
          );
          closeRegistryFilterMenus_();
          return;
        }
        const optionButton = evt.target.closest('[data-registry-filter-option]');
        if (!optionButton) return;
        evt.stopPropagation();
        toggleRegistryFacetOption_(
          String(optionButton.getAttribute('data-registry-filter-option') || ''),
          String(optionButton.getAttribute('data-registry-filter-value') || '')
        );
      });
      menu.addEventListener('input', evt => {
        const input = evt.target.closest('[data-registry-filter-search]');
        if (!input) return;
        updateRegistryFacetSearch_(
          String(input.getAttribute('data-registry-filter-search') || ''),
          String(evt.target.value || '')
        );
      });
      menu.addEventListener('keydown', evt => {
        const input = evt.target.closest('[data-registry-filter-range-input]');
        if (!input || evt.key !== 'Enter') return;
        evt.preventDefault();
        evt.stopPropagation();
        applyRegistryRangeFacetFilterFromMenu_(
          String(input.getAttribute('data-registry-filter-range-input') || ''),
          menu
        );
        closeRegistryFilterMenus_();
      });
    }

function bindHeaderEditorEvents_(rowIndex) {
      const editButton = el('btnHeaderEdit');
      if (editButton) {
        editButton.onclick = () => {
          startHeaderEdit_(rowIndex);
          renderHeader_();
        };
      }

      el('pinnedGrid').querySelectorAll('[data-role="header-input"]').forEach(input => {
        input.addEventListener('input', () => {
          const colIndex = Number(input.getAttribute('data-field-index'));
          if (!Number.isFinite(colIndex) || colIndex < 0) return;
          setEditedValue_(rowIndex, colIndex, String(input.value || ''));
        });
      });

      el('pinnedGrid').querySelectorAll('[data-header-finish]').forEach(button => {
        button.addEventListener('click', () => {
          finishHeaderEdit_();
          renderHeader_();
          syncObjectSaveUi_();
        });
      });

      el('pinnedGrid').querySelectorAll('[data-header-cancel]').forEach(button => {
        button.addEventListener('click', () => {
          cancelHeaderEdit_(rowIndex);
          renderHeader_();
          syncObjectSaveUi_();
        });
      });
    }

function bindPassportEvents_(container, rowIndex) {
      const toggle = container.querySelector('[data-toggle-passport]');
      if (toggle) {
        toggle.addEventListener('click', () => {
          state.passportCollapsed = !state.passportCollapsed;
          persistRegistrySessionState_();
          renderPassport_();
        });
      }

      container.querySelectorAll('[data-passport-edit]').forEach(button => {
        button.addEventListener('click', () => {
          startPassportEdit_(rowIndex);
          renderPassport_();
          syncObjectSaveUi_();
        });
      });

      container.querySelectorAll('[data-passport-finish]').forEach(button => {
        button.addEventListener('click', () => {
          finishPassportEdit_();
          renderPassport_();
          syncObjectSaveUi_();
        });
      });

      container.querySelectorAll('[data-passport-cancel]').forEach(button => {
        button.addEventListener('click', () => {
          cancelPassportEdit_(rowIndex);
          renderPassport_();
          syncObjectSaveUi_();
        });
      });

      container.querySelectorAll('[data-role="passport-input"]').forEach(input => {
        input.addEventListener('input', () => {
          const colIndex = Number(input.getAttribute('data-field-index'));
          if (!Number.isFinite(colIndex) || colIndex < 0) return;
          setEditedValue_(rowIndex, colIndex, String(input.value || ''));
          const fieldCard = input.closest('.passport-item');
          if (fieldCard) fieldCard.classList.toggle('changed', true);
          syncObjectSaveUi_();
        });
      });
    }

function bindEditableFieldContainerEvents_(container) {
      if (!container) return;
      container.querySelectorAll('[data-role="field-input"]').forEach(input => {
        input.addEventListener('input', () => {
          const colIndex = Number(input.getAttribute('data-field-index'));
          if (!Number.isFinite(colIndex) || state.selectedRowIndex < 0) return;
          setEditedValue_(state.selectedRowIndex, colIndex, String(input.value || ''));
          const fieldCard = input.closest('.passport-item, .section-item, .section-subitem');
          if (fieldCard) fieldCard.classList.toggle('changed', true);
          syncFieldLinkPreview_(input);
        });
      });
    }

    // ----- Sync -----

function formatObjectSaveMessage_(result, fallbackCount) {
      const count = Number(result && result.updatedCells);
      const updatedCells = Number.isFinite(count) && count > 0 ? count : Number(fallbackCount) || 0;
      if (updatedCells <= 0) return 'Изменения сохранены в лист "Сводная".';
      const suffix = updatedCells % 10 === 1 && updatedCells % 100 !== 11
        ? 'ячейка'
        : ([2, 3, 4].includes(updatedCells % 10) && ![12, 13, 14].includes(updatedCells % 100) ? 'ячейки' : 'ячеек');
      return `Сохранено в "Сводная": ${updatedCells} ${suffix}.`;
    }

function syncObjectSaveUi_() {
      const button = el('btnSaveObject');
      const resetButton = el('btnResetObjectChanges');
      const status = el('objectSaveStatus');
      if (!button || !status) return;
      const rowIndex = state.selectedRowIndex;
      const hasObject = Number.isFinite(rowIndex) && rowIndex >= 0;
      const rowReady = hasObject && hasLoadedRowDetails_(rowIndex);
      const pendingEdits = hasPendingEditsForRow_(rowIndex);
      const labelNode = button.querySelector('.object-save-button-text');
      const visualState = state.objectSaving
        ? 'saving'
        : (state.objectSaveVisual === 'success' ? 'success' : (state.objectSaveVisual === 'error' ? 'error' : 'idle'));

      button.disabled = !rowReady || (!pendingEdits && !state.objectSaving && !state.objectSaveError);
      if (resetButton) {
        resetButton.disabled = !rowReady || !pendingEdits || state.objectSaving;
        resetButton.classList.toggle('hidden', !rowReady || (!pendingEdits && !state.objectSaving));
        resetButton.title = pendingEdits
          ? 'Сбросить все несохраненные изменения текущего объекта.'
          : 'Несохраненных изменений нет.';
      }
      button.classList.toggle('is-saving', state.objectSaving);
      button.classList.toggle('is-success', !state.objectSaving && state.objectSaveVisual === 'success');
      button.classList.toggle('is-error', !state.objectSaving && state.objectSaveVisual === 'error');
      button.setAttribute('data-visual-state', visualState);
      if (labelNode) {
        labelNode.textContent = visualState === 'idle' ? 'Сохранить' : '';
      }

      let text = '0 изм.';
      let title = 'Изменений нет.';
      let statusClass = 'object-save-status idle';
      if (!hasObject) {
        text = 'Нет объекта';
        title = 'Выберите объект в реестре.';
      } else if (state.objectSaving) {
        text = 'Сохраняю...';
        title = 'Сохраняю изменения в лист "Сводная"...';
        statusClass = 'object-save-status saving';
      } else if (state.objectSaveError) {
        text = 'Ошибка';
        title = state.objectSaveError;
        statusClass = 'object-save-status error';
      } else if (pendingEdits) {
        const count = getPendingEditsForRow_(rowIndex).length;
        text = `${count} изм.`;
        title = `К сохранению подготовлено изменений: ${count}.`;
        statusClass = 'object-save-status pending';
      } else if (state.objectSaveMessage) {
        text = 'Сохранено';
        title = state.objectSaveMessage;
        statusClass = 'object-save-status success';
      }

      status.className = statusClass;
      status.textContent = text;
      status.title = title;
    }

function syncObjectWorkflowUi_() {
      const indexNode = el('objectSelectionIndex');
      const workBadge = el('objectWorkStatusBadge');
      const prevButton = el('btnPrevUndoneObject');
      const nextButton = el('btnNextUndoneObject');
      const takeButton = el('btnTakeObjectWork');
      const doneButton = el('btnMarkObjectDone');
      const releaseButton = el('btnReleaseObjectWork');
      const rowIndex = Number(state.selectedRowIndex);
      const hasObject = Number.isFinite(rowIndex) && rowIndex >= 0;
      const activeSelection = getActiveRegistrySelection_();
      const hasSavedSelection = !!activeSelection;
      const sharedSelectionActive = isCollaborativeRegistrySelection_(activeSelection);
      const sharedWorkEnabled = hasActiveSharedSelectionWork_();
      const workState = hasObject ? getRegistryRowWorkState_(rowIndex) : null;
      const pendingAction = hasObject ? String(workState && workState.pendingAction || '') : '';
      const hasPendingAction = !!pendingAction || !!state.sharedSelectionWorkBatchPendingAction;
      const isDone = hasSavedSelection && hasObject ? !!(workState && workState.isDone) : false;
      const position = hasSavedSelection && hasObject ? getActiveSelectionObjectPosition_(rowIndex) : null;
      const prevRowIndex = hasSavedSelection && hasObject ? findPrevUndoneRowIndex_(rowIndex) : -1;
      const nextRowIndex = hasSavedSelection && hasObject ? findNextUndoneRowIndex_(rowIndex) : -1;

      if (indexNode) {
        indexNode.classList.toggle('hidden', !position);
        if (position) {
          indexNode.textContent = `Объект ${position.index} из ${position.total}`;
          indexNode.title = `Текущий объект: ${position.index} из ${position.total} в активной сохраненной выборке.`;
        } else {
          indexNode.textContent = 'Объект 0 из 0';
          indexNode.title = '';
        }
      }

      if (workBadge) {
        let badgeText = '';
        let badgeClass = 'object-work-badge';
        if (hasSavedSelection && isCollaborativeRegistrySelection_(activeSelection) && !getCurrentUserBlockName_()) {
          badgeText = getCollaborativeSelectionDivisionMessage_(activeSelection);
        } else if (sharedWorkEnabled && pendingAction) {
          badgeText = getSharedSelectionWorkPendingText_(pendingAction);
          badgeClass += ' mine';
        } else if (sharedWorkEnabled && workState) {
          if (workState.isDone) {
            badgeText = `Выполнено${workState.assigneeName ? `: ${workState.assigneeName}` : ''}`;
            badgeClass += ' done';
          } else if (workState.isMine) {
            badgeText = 'У вас';
            badgeClass += ' mine';
          } else if (workState.isBusy) {
            badgeText = workState.assigneeName || 'Занят';
          } else {
            badgeText = 'Свободен';
          }
        }
        workBadge.className = badgeClass;
        workBadge.textContent = badgeText;
        workBadge.classList.toggle('hidden', !badgeText);
        workBadge.title = badgeText;
      }

      if (prevButton) {
        prevButton.classList.toggle('hidden', !hasSavedSelection || !hasObject);
        prevButton.disabled = prevRowIndex < 0;
        prevButton.title = prevRowIndex >= 0
          ? 'Открыть предыдущий невыполненный объект из текущей выборки'
          : 'В текущей выборке больше нет невыполненных объектов до текущего';
      }

      if (nextButton) {
        nextButton.classList.toggle('hidden', !hasSavedSelection || !hasObject);
        nextButton.disabled = nextRowIndex < 0;
        nextButton.title = nextRowIndex >= 0
          ? 'Открыть следующий невыполненный объект из текущей выборки'
          : 'В текущей выборке больше нет невыполненных объектов';
      }

      if (takeButton) {
        takeButton.classList.add('hidden');
        takeButton.classList.remove('is-loading');
        takeButton.disabled = true;
        takeButton.title = '';
      }

      if (doneButton) {
        if (sharedSelectionActive) {
          const isDonePending = pendingAction === 'done';
          const showDone = !!(sharedWorkEnabled && hasObject && workState && (workState.isFree || workState.isMine || isDonePending));
          doneButton.classList.toggle('hidden', !showDone);
          doneButton.classList.remove('is-done');
          doneButton.classList.toggle('is-loading', isDonePending);
          doneButton.disabled = !showDone || hasPendingAction;
          doneButton.textContent = isDonePending ? 'Отмечаю...' : 'Выполнить';
          doneButton.title = showDone
            ? 'Пометить текущий объект как выполненный для вашего блока'
            : '';
        } else {
          doneButton.classList.toggle('hidden', !hasSavedSelection || !hasObject);
          doneButton.classList.toggle('is-done', !!isDone);
          doneButton.classList.remove('is-loading');
          doneButton.disabled = !hasSavedSelection || !hasObject;
          doneButton.textContent = isDone ? 'Снять выполнение' : 'Выполнить';
          doneButton.title = isDone
            ? 'Снять личную отметку "выполнено" для текущего объекта'
            : 'Пометить текущий объект как выполненный в активной выборке';
        }
      }

      if (releaseButton) {
        releaseButton.classList.add('hidden');
        releaseButton.classList.remove('is-loading');
        releaseButton.disabled = true;
        releaseButton.title = '';
      }
    }

function syncRegistrySelectionComposerUi_() {
      const editingId = String(state.selectionComposerSelectionId || '').trim();
      const isEditing = !!editingId;
      const editingItem = isEditing ? findSavedRegistrySelectionById_(editingId) : null;
      const busyState = String(state.selectionComposerBusyState || '').trim();
      const isBusy = !!busyState;
      const compose = el('selectionCompose');
      const input = el('selectionNameInput');
      const saveButton = el('btnConfirmSelectionComposer');
      const appendButton = el('btnAppendSelectionComposer');
      const personalButton = el('btnSelectionScopePersonal');
      const divisionButton = el('btnSelectionScopeDivision');
      const sharedButton = el('btnSelectionScopeShared');
      const titleNode = el('selectionComposerTitle');
      const summaryNode = el('selectionComposerSummary');
      const closeButton = el('btnSelectionComposerClose');
      const summary = buildRegistrySelectionComposerSummary_();
      const scope = getRegistrySelectionComposerScope_();
      const divisionScopeBlocked = scope === 'division' && !canUseDivisionRegistrySelectionScope_();
      if (compose) compose.classList.toggle('is-busy', isBusy);
      if (titleNode) titleNode.textContent = summary.title;
      if (summaryNode) summaryNode.textContent = summary.subtitle || '';
      if (input) input.disabled = isBusy;
      if (saveButton) {
        saveButton.disabled = isBusy || divisionScopeBlocked;
        saveButton.classList.toggle('is-loading', isBusy);
        saveButton.setAttribute('title', busyState === 'checking'
          ? 'Проверяю сохранение'
          : (busyState === 'saving'
            ? 'Сохраняю проект'
            : (isEditing ? 'Сохранить состав проекта' : 'Сохранить проект')));
        saveButton.setAttribute('aria-label', saveButton.getAttribute('title') || 'Сохранить проект');
      }
      if (closeButton) {
        closeButton.disabled = isBusy;
        closeButton.classList.toggle('is-loading', false);
      }
      if (appendButton) {
        appendButton.classList.add('hidden');
        appendButton.disabled = true;
        appendButton.classList.remove('is-loading');
      }
      if (personalButton) {
        personalButton.disabled = isBusy;
      }
      if (divisionButton) {
        divisionButton.disabled = isBusy || !canUseDivisionRegistrySelectionScope_();
      }
      if (sharedButton) {
        sharedButton.disabled = isBusy;
      }
      syncSavedSelectionsPanelChrome_();
    }

function syncRegistryBulkUinUi_() {
      const toolbar = el('registryToolbar');
      const searchInput = el('registrySearchInput');
      const bulkInput = el('registryBulkUinInput');
      const bulkActions = el('registryBulkActions');
      const toggleButton = el('btnRegistryFilterToggle');
      const filtersActive = hasActiveRegistryFilters_();
      const count = parseRegistryBulkUinText_(state.bulkUinText).length;
      const showBulkMode = count > 0 || (!!state.registryBulkOpen && !filtersActive);
      const bulkDraftText = getRegistryBulkDraftText_();
      if (searchInput && searchInput.value !== state.objectQuery) searchInput.value = state.objectQuery;
      if (bulkInput && bulkInput.value !== bulkDraftText) bulkInput.value = bulkDraftText;
      if (toolbar) toolbar.classList.toggle('is-bulk-mode', showBulkMode);
      if (searchInput) searchInput.classList.toggle('hidden', showBulkMode);
      if (bulkInput) bulkInput.classList.toggle('hidden', !showBulkMode);
      if (bulkActions) bulkActions.classList.toggle('hidden', !showBulkMode);
      if (toggleButton) {
        const title = filtersActive
          ? 'Сбросить фильтры'
          : (showBulkMode ? 'Скрыть список УИНов' : 'Список УИНов');
        toggleButton.classList.toggle('is-active', filtersActive);
        toggleButton.setAttribute('aria-pressed', filtersActive ? 'true' : 'false');
        toggleButton.setAttribute('title', title);
        toggleButton.setAttribute('aria-label', title);
      }
      const meta = el('registryBulkUinMeta');
      if (!meta) return;
      meta.textContent = '';
      meta.classList.add('hidden');
    }

function scheduleRegistryFloatingMenuPositionUpdate_() {
      if (!state.openRegistryFilterKey || state.currentView !== 'registry') return;
      if (registryFloatingMenuFrame) return;
      registryFloatingMenuFrame = window.requestAnimationFrame(() => {
        registryFloatingMenuFrame = 0;
        positionRegistryFloatingMenu_();
      });
    }

function positionRegistryFloatingMenu_() {
      const facetKey = state.currentView === 'registry' ? String(state.openRegistryFilterKey || '') : '';
      const def = getRegistryFacetDef_(facetKey);
      const menu = getRegistryFloatingMenu_();
      const button = def ? el(def.buttonId) : null;
      if (!menu || !def || !button) return;

      const rect = button.getBoundingClientRect();
      const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const margin = 8;
      const gap = 6;
      const requestedWidth = Number(def.menuWidth) || 320;
      const width = Math.max(240, Math.min(requestedWidth, viewportWidth - margin * 2));
      const availableBelow = Math.max(0, viewportHeight - rect.bottom - gap - margin);
      const availableAbove = Math.max(0, rect.top - gap - margin);
      const estimatedChromeHeight = 96;
      const openUp = availableBelow < 220 && availableAbove > availableBelow;
      const availableHeight = openUp ? availableAbove : availableBelow;
      const optionsMaxHeight = Math.max(120, Math.min(250, availableHeight - estimatedChromeHeight));
      const totalHeight = estimatedChromeHeight + optionsMaxHeight;
      let left = (def.menuAlign === 'end') ? (rect.right - width) : rect.left;
      left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
      const top = openUp
        ? Math.max(margin, rect.top - gap - totalHeight)
        : Math.max(margin, rect.bottom + gap);

      menu.dataset.facetKey = def.key;
      menu.dataset.vertical = openUp ? 'up' : 'down';
      menu.style.width = `${Math.round(width)}px`;
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
      menu.style.setProperty('--registry-floating-options-max-height', `${Math.round(optionsMaxHeight)}px`);
    }

function syncAutoCalculatedFieldUi_(rowIndex) {
      if (Number(state.selectedRowIndex) !== Number(rowIndex)) return;
      const columns = getMgzBudgetProgressColumns_();
      if (!columns || !columns.budgetProgress) return;
      const colIndex = Number(columns.budgetProgress.index);
      const value = getCellValue_(rowIndex, colIndex);
      document.querySelectorAll(`[data-auto-calculated-field-index="${colIndex}"]`).forEach(input => {
        if (String(input.value || '') !== value) input.value = value;
        const fieldCard = input.closest('.passport-item, .section-item, .section-subitem');
        if (fieldCard) fieldCard.classList.toggle('changed', hasEditedValue_(rowIndex, colIndex));
      });
    }

function syncFieldLinkPreview_(input) {
      if (!input) return;
      const linkKind = String(input.getAttribute('data-link-kind') || '').trim();
      if (!linkKind) return;
      const fieldRow = input.closest('.section-item, .section-subitem');
      const link = fieldRow ? fieldRow.querySelector('[data-role="field-link"]') : null;
      if (!link) return;
      const value = String(input.value || '').trim();
      if (isHttpUrl_(value)) {
        link.setAttribute('href', value);
        link.classList.remove('hidden');
      } else {
        link.setAttribute('href', '#');
        link.classList.add('hidden');
      }
    }

    // ----- Interaction -----

function startHeaderEdit_(rowIndex) {
      state.headerEditSnapshot = new Map();
      HEADER_EDIT_FIELDS_COMPACT.forEach(item => {
        const column = findColumnBySpec_(item.spec);
        if (column) state.headerEditSnapshot.set(column.index, getCellValue_(rowIndex, column.index));
      });
      state.headerEditing = true;
    }

function finishHeaderEdit_() {
      state.headerEditing = false;
      state.headerEditSnapshot = new Map();
      syncObjectSaveUi_();
    }

function cancelHeaderEdit_(rowIndex) {
      state.headerEditSnapshot.forEach((value, colIndex) => {
        setEditedValue_(rowIndex, colIndex, value);
      });
      state.headerEditing = false;
      state.headerEditSnapshot = new Map();
      syncObjectSaveUi_();
    }

function getPassportEditableColumnIndexes_() {
      const indexes = [];
      PASSPORT_ITEM_DEFS.forEach(item => {
        if (item.type === 'field' && item.spec) {
          const column = findColumnBySpec_(item.spec);
          if (column) indexes.push(column.index);
        }
        if (item.type === 'contacts') {
          const contactIndexes = getPassportContactIndexes_(item);
          if (Number.isFinite(contactIndexes.person) && contactIndexes.person >= 0) indexes.push(contactIndexes.person);
          if (Number.isFinite(contactIndexes.details) && contactIndexes.details >= 0) indexes.push(contactIndexes.details);
        }
      });
      return Array.from(new Set(indexes));
    }

function startPassportEdit_(rowIndex) {
      state.passportCollapsed = false;
      state.passportEditing = true;
      state.passportEditSnapshot = new Map();
      const indexes = getPassportEditableColumnIndexes_();
      indexes.forEach(colIndex => {
        state.passportEditSnapshot.set(colIndex, getCellValue_(rowIndex, colIndex));
      });
      if (indexes.length) state.pendingFocusFieldKey = fieldEditKey_(rowIndex, indexes[0]);
    }

function finishPassportEdit_() {
      state.passportEditing = false;
      state.passportEditSnapshot = new Map();
    }

function cancelPassportEdit_(rowIndex) {
      state.passportEditSnapshot.forEach((value, colIndex) => {
        setEditedValue_(rowIndex, colIndex, value);
      });
      state.passportEditing = false;
      state.passportEditSnapshot = new Map();
    }

function getSectionEditableColumnIndexes_(section, rowIndex) {
      const fields = getSectionFields_(section, rowIndex);
      const items = buildSectionRenderItems_(fields);
      const indexes = [];
      items.forEach(item => {
        if (!item) return;
        if (item.type === 'group') {
          (Array.isArray(item.items) ? item.items : []).forEach(groupItem => {
            if (groupItem && groupItem.field && canEditSectionField_(groupItem.field) && Number.isFinite(groupItem.field.index)) indexes.push(groupItem.field.index);
          });
          return;
        }
        if (item.field && canEditSectionField_(item.field) && Number.isFinite(item.field.index)) indexes.push(item.field.index);
      });
      return Array.from(new Set(indexes));
    }

function startSectionEdit_(section, rowIndex) {
      if (!section || !canEditSection_(section)) return;
      if (state.sectionEditingId && state.sectionEditingId !== section.id) finishSectionEdit_();
      state.sectionEditingId = section.id;
      state.sectionEditSnapshot = new Map();
      const indexes = getSectionEditableColumnIndexes_(section, rowIndex);
      indexes.forEach(colIndex => {
        state.sectionEditSnapshot.set(colIndex, getCellValue_(rowIndex, colIndex));
      });
      if (indexes.length) state.pendingFocusFieldKey = fieldEditKey_(rowIndex, indexes[0]);
    }

function finishSectionEdit_() {
      state.sectionEditingId = '';
      state.sectionEditSnapshot = new Map();
      syncObjectSaveUi_();
    }

function cancelSectionEdit_(rowIndex) {
      state.sectionEditSnapshot.forEach((value, colIndex) => {
        setEditedValue_(rowIndex, colIndex, value);
      });
      state.sectionEditingId = '';
      state.sectionEditSnapshot = new Map();
      syncObjectSaveUi_();
    }

    // ===== Diagnostics =====

    // ----- Runtime -----

function fieldEditKey_(rowIndex, colIndex) {
      return `${Number(rowIndex)}:${Number(colIndex)}`;
    }

function formatRuntimeErrorMessage_(error, context) {
      const base = error && error.message ? error.message : String(error || 'Неизвестная ошибка');
      const text = String(base || 'Неизвестная ошибка').trim();
      return context ? `${context}: ${text}` : text;
    }

function setRuntimeError_(message) {
      const text = String(message || '').trim();
      state.runtimeErrorMessage = text;
      const node = el('runtimeErrorBanner');
      if (!node) return;
      node.textContent = text;
      node.classList.toggle('hidden', !text);
    }

function clearRuntimeError_() {
      state.runtimeErrorMessage = '';
      const node = el('runtimeErrorBanner');
      if (!node) return;
      node.textContent = '';
      node.classList.add('hidden');
    }

function writeRuntimeDiagnostic_(level, error, context) {
      const normalizedLevel = String(level || '').trim().toLowerCase() === 'warn' ? 'warn' : 'error';
      const logger = normalizedLevel === 'warn' ? console.warn : console.error;
      const label = context ? `[mpro ss] ${context}` : '[mpro ss]';
      try {
        if (typeof logger === 'function') {
          if (error === undefined) {
            logger.call(console, label);
          } else {
            logger.call(console, label, error);
          }
        }
      } catch (loggingError) {}
    }

function warnRuntimeDiagnostic_(error, context) {
      writeRuntimeDiagnostic_('warn', error, context);
    }

function reportRuntimeError_(error, context) {
      const message = formatRuntimeErrorMessage_(error, context);
      writeRuntimeDiagnostic_('error', error, context || 'Runtime error');
      setRuntimeError_(message);
      state.objectSaving = false;
      state.objectSaveVisual = 'error';
      state.objectSaveMessage = '';
      state.objectSaveError = message;
      try {
        syncObjectSaveUi_();
      } catch (syncError) {
        writeRuntimeDiagnostic_('error', syncError, 'Failed to sync error UI');
      }
    }

function renderErrorState_(message) {
      cancelRegistryRowsRender_();
      setRuntimeError_(message || 'Ошибка');
      el('savedSelectionList').innerHTML = `<div class="empty-state">${escapeHtml_(message || 'Ошибка')}</div>`;
      el('registryTableBody').innerHTML = `<tr><td colspan="${getRegistryTableColumnCount_()}"><div class="empty-state">${escapeHtml_(message || 'Ошибка')}</div></td></tr>`;
      el('recordTitle').textContent = 'Ошибка загрузки';
      el('btnHeaderEdit').classList.add('hidden');
      el('recordTitleMetaLine').classList.add('hidden');
      el('recordTitleMetaLine').innerHTML = '';
      el('pinnedGrid').classList.add('hidden');
      el('pinnedGrid').innerHTML = '';
      el('passportSection').classList.add('hidden');
      el('passportSection').innerHTML = '';
      el('sectionChips').innerHTML = '';
      el('sectionStack').innerHTML = `<div class="empty-state">${escapeHtml_(message || 'Ошибка')}</div>`;
    }

function syncExportSummaryButtonUi_() {
      const button = el('btnExportSummaryCsv');
      if (!button) return;
      const hasSession = !!state.currentUser && !!state.sessionToken;
      button.classList.toggle('hidden', !hasSession);
      const ready = hasSession && !state.loading && Array.isArray(state.columns) && state.columns.length > 0 && Array.isArray(state.rows) && state.rows.length > 0;
      button.disabled = !ready || !!state.summaryExportPending;
      const title = state.summaryExportPending
        ? 'Экспортируем CSV...'
        : (ready ? 'Экспортировать актуальную сводную в CSV' : 'Данные еще не готовы для экспорта');
      button.title = title;
      button.setAttribute('aria-label', title);
    }

function syncGoogleSheetButtonUi_() {
      const button = el('btnSyncGoogleSheet');
      const statusNode = el('syncGoogleStatus');
      if (!button) return;
      const hasSession = !!state.currentUser && !!state.sessionToken;
      button.classList.toggle('hidden', !hasSession);
      const ready = hasSession && !state.googleSyncPending;
      button.disabled = !ready;
      button.classList.toggle('is-loading', !!state.googleSyncPending);
      const formattedLastAt = formatGoogleSyncLastAt_(state.googleSyncLastAt);
      if (statusNode) {
        const statusText = state.googleSyncPending ? 'идет sync' : formattedLastAt;
        statusNode.textContent = statusText;
        statusNode.classList.toggle('hidden', !statusText);
      }
      const title = !hasSession
        ? 'Авторизуйтесь, чтобы управлять синхронизацией Google'
        : (state.googleSyncPending
          ? 'Синхронизируем Google...'
          : (formattedLastAt ? `sync Google · ${formattedLastAt}` : 'sync Google'));
      button.title = title;
      button.setAttribute('aria-label', title);
    }

function getSummaryExportCatalogLookup_() {
      return getSourceCatalogLookup_();
    }

function buildSummaryExportColumnsFrom_(rawColumns) {
      const catalogLookup = getSummaryExportCatalogLookup_();
      const baseColumns = (Array.isArray(rawColumns) ? rawColumns : []).map((column, sourceIndex) => {
        const fieldId = String(column && column.fieldId || '').trim();
        const catalogEntry = catalogLookup.get(normalizeText_(fieldId));
        return {
          fieldId,
          source: String(catalogEntry && catalogEntry.source || column && column.sourceRaw || '').trim(),
          label: String(catalogEntry && catalogEntry.label || column && column.label || '').trim(),
          sourceIndex
        };
      });
      const existingFieldIds = new Set(baseColumns.map(column => normalizeText_(column.fieldId)).filter(Boolean));
      const existingLabels = new Set(baseColumns.map(column => normalizeText_(column.label)).filter(Boolean));
      const extraColumns = SUMMARY_EXPORT_EXTRA_COLUMNS
        .filter(column => {
          const fieldId = normalizeText_(column && column.fieldId || '');
          const label = normalizeText_(column && column.label || '');
          if (fieldId && existingFieldIds.has(fieldId)) return false;
          if (label && existingLabels.has(label)) return false;
          return true;
        })
        .map(column => ({
          fieldId: String(column && column.fieldId || '').trim(),
          source: String(column && column.source || '').trim(),
          label: String(column && column.label || '').trim(),
          sourceIndex: -1
        }));
      return baseColumns.concat(extraColumns);
    }

function buildSummaryExportColumns_() {
      return buildSummaryExportColumnsFrom_(state.columns);
    }

function buildSummaryExportMatrixFrom_(rawColumns, rawRows) {
      const columns = buildSummaryExportColumnsFrom_(rawColumns);
      const fieldIdRow = columns.map(column => String(column && column.fieldId || '').trim());
      const sourceRow = columns.map(column => String(column && column.source || '').trim());
      const labelRow = columns.map(column => String(column && column.label || '').trim());
      const dataRows = (Array.isArray(rawRows) ? rawRows : []).map(row => (
        columns.map(column => (
          Number.isFinite(column && column.sourceIndex) && column.sourceIndex >= 0
            ? String(row && row[column.sourceIndex] != null ? row[column.sourceIndex] : '')
            : ''
        ))
      ));
      return [fieldIdRow, sourceRow, labelRow].concat(dataRows);
    }

function buildSummaryExportMatrix_() {
      return buildSummaryExportMatrixFrom_(state.columns, state.rows);
    }

async function loadSummarySyncPayload_() {
      const response = await runServer_('getSmartFilterShellData', [{
        force: true
      }]);
      const columns = Array.isArray(response && response.columns) ? response.columns : [];
      const rows = Array.isArray(response && response.rows) ? response.rows : [];
      if (!columns.length || !rows.length) {
        throw new Error('Нет данных для синхронизации Google');
      }
      if (response && response.truncated) {
        throw new Error('Сводная загружена не полностью. Уберите ограничение maxRows и повторите.');
      }
      return {
        matrix: buildSummaryExportMatrixFrom_(columns, rows),
        rowCount: rows.length,
        sheetName: String(
          response && response.sheetName ||
          state.runtimeOptions.sheetName ||
          DEFAULT_SHEET_NAME ||
          'Сводная'
        ).trim() || 'Сводная'
      };
    }

function getSupabaseFunctionUrl_(functionName) {
      const baseUrl = String(
        window.SUPABASE_MPRO_CONFIG &&
        window.SUPABASE_MPRO_CONFIG.supabaseUrl ||
        ''
      ).trim().replace(/\/+$/g, '');
      const name = String(functionName || '').trim().replace(/^\/+/g, '');
      if (!baseUrl) throw new Error('Не настроен SUPABASE_URL');
      if (!name) throw new Error('Не указано имя Supabase function');
      return `${baseUrl}/functions/v1/${name}`;
    }

function extractGoogleSyncErrorMessage_(payload, fallbackMessage) {
      const direct = String(payload && (payload.error || payload.message) || '').trim();
      if (direct) return direct;
      const details = payload && typeof payload === 'object'
        ? (payload.details && typeof payload.details === 'object'
          ? payload.details
          : (payload.upstream && typeof payload.upstream === 'object' ? payload.upstream : null))
        : null;
      const nested = String(details && (details.error || details.message) || '').trim();
      return nested || String(fallbackMessage || 'Не удалось обновить Google').trim() || 'Не удалось обновить Google';
    }

async function invokeGoogleSheetSync_(payload) {
      const response = await fetch(getSupabaseFunctionUrl_('google-sheet-sync'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload || {})
      });
      const responseText = await response.text();
      let responsePayload = {};
      try {
        responsePayload = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        responsePayload = { error: responseText || (response.statusText || 'Не удалось обновить Google') };
      }
      if (!response.ok || !responsePayload || responsePayload.ok === false) {
        throw new Error(extractGoogleSyncErrorMessage_(responsePayload, response.statusText || 'Не удалось обновить Google'));
      }
      return responsePayload;
    }

function buildGoogleSyncSuccessMessage_(result) {
      const upstream = result && result.upstream && typeof result.upstream === 'object'
        ? result.upstream
        : {};
      const writtenRows = Number(upstream && upstream.writtenRows || result && result.rowsSent || 0);
      const targetSheetName = String(
        upstream && upstream.sheetName ||
        result && result.sheetName ||
        state.runtimeOptions.sheetName ||
        DEFAULT_SHEET_NAME ||
        'Сводная'
      ).trim() || 'Сводная';
      return writtenRows > 0
        ? `Google обновлен: ${writtenRows} строк -> "${targetSheetName}"`
        : `Google обновлен -> "${targetSheetName}"`;
    }

async function handleSyncGoogleSheetClick_() {
      if (state.googleSyncPending) return;
      if (!state.sessionToken || !state.currentUser) {
        showCopyToast_('Авторизуйтесь для синхронизации Google', true);
        return;
      }
      if (state.loading) {
        showCopyToast_('Дождитесь завершения загрузки данных', false);
        return;
      }
      if (hasPendingObjectEdits_()) {
        showCopyToast_('Сначала сохраните изменения в карточке объекта', true);
        return;
      }
      state.googleSyncPending = true;
      syncGoogleSheetButtonUi_();
      try {
        const summary = await loadSummarySyncPayload_();
        const result = await invokeGoogleSheetSync_({
          sessionToken: state.sessionToken,
          spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
          sheetName: summary.sheetName,
          fieldIdRow: 1,
          blockRow: 2,
          labelRow: 3,
          dataStartRow: DEFAULT_DATA_START_ROW,
          rows: summary.matrix
        });
        persistGoogleSyncLastAt_(
          String(
            result && result.upstream && result.upstream.updatedAt ||
            result && result.updatedAt ||
            new Date().toISOString()
          ).trim()
        );
        syncGoogleSheetButtonUi_();
        showCopyToast_(buildGoogleSyncSuccessMessage_(result), false);
      } catch (error) {
        writeRuntimeDiagnostic_('error', error, 'Ошибка обратной синхронизации Google');
        showCopyToast_(
          error && error.message ? error.message : 'Не удалось обновить Google',
          true
        );
      } finally {
        state.googleSyncPending = false;
        syncGoogleSheetButtonUi_();
      }
    }

function escapeCsvCell_(value) {
      const text = String(value == null ? '' : value);
      if (!/[",\r\n]/.test(text)) return text;
      return `"${text.replace(/"/g, '""')}"`;
    }

function stringifyCsvRows_(rows) {
      return (Array.isArray(rows) ? rows : [])
        .map(row => (Array.isArray(row) ? row : []).map(escapeCsvCell_).join(','))
        .join('\r\n');
    }

function sanitizeFileNameFragment_(value) {
      const text = String(value == null ? '' : value).trim();
      return (text || 'summary').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    }

function buildSummaryExportFileName_() {
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const sheetName = sanitizeFileNameFragment_(state.runtimeOptions.sheetName || DEFAULT_SHEET_NAME || 'Сводная');
      return `${sheetName}_актуальная_${year}-${month}-${day}_${hours}-${minutes}.csv`;
    }

function downloadBlobAsFile_(blob, filename) {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }

function exportSummaryCsv_() {
      if (state.summaryExportPending) return;
      if (!Array.isArray(state.columns) || !state.columns.length || !Array.isArray(state.rows) || !state.rows.length) {
        showCopyToast_('Нет данных для экспорта', true);
        return;
      }
      state.summaryExportPending = true;
      syncExportSummaryButtonUi_();
      try {
        const csvText = stringifyCsvRows_(buildSummaryExportMatrix_());
        const blob = new Blob(['\ufeff', csvText], { type: 'text/csv;charset=utf-8;' });
        downloadBlobAsFile_(blob, buildSummaryExportFileName_());
        showCopyToast_(
          state.truncated
            ? 'CSV выгружен, но данные в приложении были усечены'
            : `CSV выгружен: ${state.rows.length} строк`,
          !!state.truncated
        );
      } catch (error) {
        writeRuntimeDiagnostic_('error', error, 'Ошибка экспорта сводной');
        showCopyToast_('Не удалось выгрузить CSV', true);
      } finally {
        state.summaryExportPending = false;
        syncExportSummaryButtonUi_();
      }
    }

function showCopyToast_(message, isError) {
      const node = el('copyToast');
      if (!node) return;
      node.textContent = String(message || '').trim() || (isError ? 'Не удалось скопировать' : 'Скопировано');
      node.classList.toggle('error', !!isError);
      node.classList.add('show');
      if (copyToastTimer) clearTimeout(copyToastTimer);
      copyToastTimer = setTimeout(() => {
        node.classList.remove('show');
        node.classList.remove('error');
      }, 1400);
    }

function copyTextLegacy_(text) {
      return new Promise((resolve, reject) => {
        const value = String(text == null ? '' : text);
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        textarea.style.left = '-1000px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (!ok) {
            reject(new Error('copy_failed'));
            return;
          }
          resolve();
        } catch (error) {
          document.body.removeChild(textarea);
          reject(error);
        }
      });
    }

function copyTextToClipboard_(text) {
      const value = String(text == null ? '' : text);
      if (!value.trim()) return Promise.reject(new Error('empty_copy_text'));
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(value).catch(() => copyTextLegacy_(value));
      }
      return copyTextLegacy_(value);
    }

function copyTextFromTrigger_(node) {
      const text = String(node && node.getAttribute('data-copy-text') || '').trim();
      if (!text) return;
      copyTextToClipboard_(text)
        .then(() => showCopyToast_('Скопировано', false))
        .catch(() => showCopyToast_('Не удалось скопировать', true));
    }

function setLoading_(flag) {
      const button = el('btnReload');
      button.disabled = !!flag;
      button.classList.toggle('is-loading', !!flag);
      button.title = flag ? 'Обновление данных...' : 'Обновить данные';
      button.setAttribute('aria-label', button.title);
      syncExportSummaryButtonUi_();
      syncGoogleSheetButtonUi_();
    }

    // ----- Field helpers -----

function shouldUseTextarea_(value) {
      const text = String(value == null ? '' : value);
      return text.length > 90 || /\r?\n/.test(text);
    }

function shouldUseTextareaForField_(label, value) {
      const labelKey = normalizeText_(label || '');
      return (
        shouldUseTextarea_(value) ||
        /проблемные вопросы|проблематика|описание|примеч|комментар|обоснован|вывод/.test(labelKey)
      );
    }

function shouldEnableTextAssist_(label, options) {
      const settings = options || {};
      if (settings.linkKind) return false;
      const text = [label, settings.placeholder]
        .map(value => normalizeText_(value || ''))
        .filter(Boolean)
        .join(' ');
      if (!text) return !!settings.multiline;
      if (/уин|код|телефон|e-?mail|email|почт|сайт|url|инн|кпп|окпо|октмо/.test(text)) return false;
      return true;
    }

function buildTextAssistAttrs_(enabled, multiline) {
      return enabled
        ? ` spellcheck="true" autocorrect="on" autocapitalize="${multiline ? 'sentences' : 'words'}" lang="ru"`
        : ' spellcheck="false" autocorrect="off" autocapitalize="off"';
    }

function shouldUseStackedFieldDisplay_(label, value) {
      const labelKey = normalizeText_(label || '');
      const text = String(value == null ? '' : value).trim();
      return (
        shouldUseTextarea_(value) ||
        text.length > 140 ||
        /проблемные вопросы|факт|состояние|описание|примеч|комментар|обоснован|вывод|контакты/.test(labelKey)
      );
    }

function getFieldLinkKind_(field) {
      const label = normalizeText_(field && field.label || '');
      if (/чек-лист/.test(label)) return 'checklist';
      if (/я\.диск|ядиск/.test(label)) return 'ydisk';
      if (/автослайдер/.test(label)) return 'autoslider';
      return '';
    }

function getFieldLinkActionText_(linkKind) {
      if (linkKind === 'checklist') return 'Открыть чек-лист';
      if (linkKind === 'ydisk' || linkKind === 'autoslider') return 'Открыть';
      return 'Открыть ссылку';
    }

function isHttpUrl_(value) {
      return /^https?:\/\//i.test(String(value == null ? '' : value).trim());
    }

function sectionDomId_(id) {
      return `section_${String(id || '').replace(/[^\w-]+/g, '_')}`;
    }

    // ----- Text helpers -----

function tokenize_(value) {
      const normalized = normalizeText_(value);
      return normalized ? normalized.split(' ').filter(Boolean) : [];
    }

const CP1251_SPECIAL_BYTE_BY_CHAR_ = Object.freeze({
      '\u0402': 0x80,
      '\u0403': 0x81,
      '\u201A': 0x82,
      '\u0453': 0x83,
      '\u201E': 0x84,
      '\u2026': 0x85,
      '\u2020': 0x86,
      '\u2021': 0x87,
      '\u20AC': 0x88,
      '\u2030': 0x89,
      '\u0409': 0x8A,
      '\u2039': 0x8B,
      '\u040A': 0x8C,
      '\u040C': 0x8D,
      '\u040B': 0x8E,
      '\u040F': 0x8F,
      '\u0452': 0x90,
      '\u2018': 0x91,
      '\u2019': 0x92,
      '\u201C': 0x93,
      '\u201D': 0x94,
      '\u2022': 0x95,
      '\u2013': 0x96,
      '\u2014': 0x97,
      '\u2122': 0x99,
      '\u0459': 0x9A,
      '\u203A': 0x9B,
      '\u045A': 0x9C,
      '\u045C': 0x9D,
      '\u045B': 0x9E,
      '\u045F': 0x9F,
      '\u040E': 0xA1,
      '\u045E': 0xA2,
      '\u0408': 0xA3,
      '\u00A4': 0xA4,
      '\u0490': 0xA5,
      '\u00A6': 0xA6,
      '\u00A7': 0xA7,
      '\u0401': 0xA8,
      '\u00A9': 0xA9,
      '\u0404': 0xAA,
      '\u00AB': 0xAB,
      '\u00AC': 0xAC,
      '\u00AD': 0xAD,
      '\u00AE': 0xAE,
      '\u0407': 0xAF,
      '\u00B0': 0xB0,
      '\u00B1': 0xB1,
      '\u0406': 0xB2,
      '\u0456': 0xB3,
      '\u0491': 0xB4,
      '\u00B5': 0xB5,
      '\u00B6': 0xB6,
      '\u00B7': 0xB7,
      '\u0451': 0xB8,
      '\u2116': 0xB9,
      '\u0454': 0xBA,
      '\u00BB': 0xBB,
      '\u0458': 0xBC,
      '\u0405': 0xBD,
      '\u0455': 0xBE,
      '\u0457': 0xBF
    });

function countMatches_(value, pattern) {
      const text = String(value == null ? '' : value);
      const matches = text.match(pattern);
      return matches ? matches.length : 0;
    }

function looksLikeBrokenEncoding_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return false;
      const cyrillicCount = countMatches_(text, /[А-Яа-яЁё]/g);
      if (!cyrillicCount) return false;
      const suspiciousLetterCount = countMatches_(text, /[РС]/g);
      const suspiciousCharCount = countMatches_(text, /[\u0402\u0403\u0453\u0409\u040A\u040B\u040F\u0452\u0459\u045A\u045B\u045C\u045F\u040E\u045E\u0408\u0490\u0404\u0407\u0406\u0456\u0491\u0454\u0458\u0405\u0455\u0457\u201A\u201E\u2026\u2020\u2021\u20AC\u2030\u2039\u203A\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u2122]/g);
      return suspiciousCharCount > 0 || (cyrillicCount >= 6 && suspiciousLetterCount / cyrillicCount >= 0.34);
    }

function cp1251ByteForChar_(char) {
      const code = String(char || '').charCodeAt(0);
      if (!Number.isFinite(code)) return -1;
      if (code <= 0x7F) return code;
      if (code >= 0x0410 && code <= 0x044F) return code - 0x350;
      if (code === 0x0401) return 0xA8;
      if (code === 0x0451) return 0xB8;
      if (Object.prototype.hasOwnProperty.call(CP1251_SPECIAL_BYTE_BY_CHAR_, char)) {
        return CP1251_SPECIAL_BYTE_BY_CHAR_[char];
      }
      return -1;
    }

function tryRepairCp1251Utf8Mojibake_(value) {
      const text = String(value == null ? '' : value);
      if (!looksLikeBrokenEncoding_(text) || typeof TextDecoder !== 'function') return text;
      const bytes = [];
      for (const char of text) {
        const byte = cp1251ByteForChar_(char);
        if (!Number.isFinite(byte) || byte < 0) return text;
        bytes.push(byte);
      }
      try {
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)).trim();
        return decoded || text;
      } catch (error) {
        return text;
      }
    }

function repairDisplayEncoding_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '';
      const repaired = tryRepairCp1251Utf8Mojibake_(text);
      if (!repaired || repaired === text) return text;
      if (!looksLikeBrokenEncoding_(repaired)) return repaired;
      return text;
    }

function getSourceCatalogLookup_() {
      if (getSourceCatalogLookup_._cache instanceof Map) return getSourceCatalogLookup_._cache;
      const catalog = window.MPRO_SOURCE_CATALOG && typeof window.MPRO_SOURCE_CATALOG === 'object'
        ? window.MPRO_SOURCE_CATALOG
        : {};
      const map = new Map();
      Object.keys(catalog).forEach(sourceKey => {
        const entries = Array.isArray(catalog[sourceKey]) ? catalog[sourceKey] : [];
        entries.forEach(entry => {
          const fieldId = normalizeText_(entry && entry.fieldId || '');
          if (!fieldId || map.has(fieldId)) return;
          map.set(fieldId, {
            source: repairDisplayEncoding_(String(entry && entry.source || '').trim()),
            label: repairDisplayEncoding_(String(entry && entry.label || '').trim())
          });
        });
      });
      getSourceCatalogLookup_._cache = map;
      return map;
    }

function normalizeText_(value) {
      return String(value == null ? '' : value).replace(/\u00A0/g, ' ').replace(/ё/g, 'е').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    }

function normalizeInlineDisplayText_(value) {
      return String(value == null ? '' : value)
        .replace(/\r?\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

function escapeHtml_(value) {
      return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

function escapeHtmlWithBreaks_(value) {
      return escapeHtml_(value).replace(/\r?\n/g, '<br>');
    }

function debounce_(fn, waitMs) {
      let timer = null;
      return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), Number(waitMs) || 0);
      };
    }

function el(id) {
      return document.getElementById(id);
    }


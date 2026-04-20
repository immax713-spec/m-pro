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
        headerRow: state.runtimeOptions.headerRow || DEFAULT_HEADER_ROW,
        dataset: normalizeRegistryDataMode_(state.registryDataMode),
        force: !!preserve.force
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
          if (
            (state.currentView === 'analytics' || normalizeSidebarPanel_(state.sidebarActivePanel) === 'analytics')
          ) {
            const ensureAnalytics = typeof ensureAnalyticsFeatureReady_ === 'function'
              ? ensureAnalyticsFeatureReady_()
              : Promise.resolve();
            Promise.resolve(ensureAnalytics)
              .then(() => {
                if (!state.analyticsLoadedOnce && normalizeAnalyticsSection_(state.analyticsSection) !== 'ksg') {
                  return ensureAnalyticsDashboardLoaded_({ silent: false });
                }
                renderAll_();
                return state.analyticsDashboard;
              })
              .catch(() => {
                renderAll_();
              });
          }
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


// Analytics domain is loaded on demand.
function ensureAnalyticsFeatureReady_() {
  const loader = window.__ensureSiteSliceGroupLoaded__;
  if (typeof loader !== 'function') {
    return Promise.reject(new Error('Analytics slice loader is unavailable.'));
  }
  return Promise.resolve(loader('analytics'));
}

function callDeferredAnalyticsMethod_(methodName, fallbackMethod, args) {
  const method = window[methodName];
  if (typeof method !== 'function' || method === fallbackMethod) {
    throw new Error('Analytics method is not ready: ' + String(methodName || ''));
  }
  return method.apply(window, Array.isArray(args) ? args : []);
}

function openAnalyticsRegistryDrilldown_(rowIndexes) {
  return ensureAnalyticsFeatureReady_().then(() => callDeferredAnalyticsMethod_('openAnalyticsRegistryDrilldown_', openAnalyticsRegistryDrilldown_, [rowIndexes]));
}

function ensureAnalyticsDashboardLoaded_(options) {
  return ensureAnalyticsFeatureReady_().then(() => callDeferredAnalyticsMethod_('ensureAnalyticsDashboardLoaded_', ensureAnalyticsDashboardLoaded_, [options]));
}

function loadAnalyticsDashboard_(options) {
  return ensureAnalyticsFeatureReady_().then(() => callDeferredAnalyticsMethod_('loadAnalyticsDashboard_', loadAnalyticsDashboard_, [options]));
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

    function getSelectedObjectKey_() {
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return '';
      return String(getRegistryRowObjectId_(rowIndex) || readCurrentValueBySpec_(rowIndex, UIN_SPEC) || '').trim();
    }

    function getRegistryRowObjectId_(rowIndex) {
      const targetIndex = Number(rowIndex);
      if (!Number.isFinite(targetIndex) || targetIndex < 0) return '';
      return String(state.rowObjectIds && state.rowObjectIds[targetIndex] || '').trim();
    }

    function getMonitoringOverlayForObjectKey_(objectKey) {
      const key = normalizeMonitoringObjectKey_(objectKey);
      if (!key) return null;
      return state.monitoringOverlayByObjectKey && state.monitoringOverlayByObjectKey[key]
        ? state.monitoringOverlayByObjectKey[key]
        : null;
    }

    function getMonitoringOverlayForRow_(rowIndex) {
      const objectKey = String(getRegistryRowObjectId_(rowIndex) || readRegistrySummaryValueByKey_(rowIndex, 'uin') || '').trim();
      return getMonitoringOverlayForObjectKey_(objectKey);
    }

    function getRegistryMapOverlayEntriesForObjectKey_(objectKey, options) {
      const key = normalizeMonitoringObjectKey_(objectKey);
      if (!key) return [];
      const settings = options || {};
      const allEntries = normalizeRegistryMapOverlayEntries_(
        state.registryMapOverlayByObjectKey && state.registryMapOverlayByObjectKey[key]
      );
      if (settings.includeAllDivisions) return allEntries;
      const targetDivisionCode = normalizeMproDivisionCode_(
        Object.prototype.hasOwnProperty.call(settings, 'divisionCode')
          ? settings.divisionCode
          : getCurrentUserMproDivisionCode_()
      );
      if (!targetDivisionCode) return allEntries;
      return allEntries.filter(entry => normalizeMproDivisionCode_(entry && entry.divisionCode || '') === targetDivisionCode);
    }

    function getRegistryMapOverlayEntriesForRow_(rowIndex, options) {
      return getRegistryMapOverlayEntriesForObjectKey_(getRegistryRowObjectId_(rowIndex), options);
    }

    function getRegistryMapOverlayForObjectKey_(objectKey, options) {
      return getRegistryMapOverlayEntriesForObjectKey_(objectKey, options)[0] || null;
    }

    function getRegistryMapOverlayForRow_(rowIndex, options) {
      return getRegistryMapOverlayForObjectKey_(getRegistryRowObjectId_(rowIndex), options);
    }

    function getRegistryMapOverlayVisitCountForRow_(rowIndex, options) {
      return getRegistryMapOverlayEntriesForRow_(rowIndex, options).length;
    }

    function getRegistryMapPlacementDisplayText_(rowIndex, options) {
      const entry = getRegistryMapOverlayForRow_(rowIndex, options);
      if (!entry) return '';
      const activeSelection = typeof getActiveRegistrySelection_ === 'function'
        ? getActiveRegistrySelection_()
        : null;
      const activeSelectionNameNorm = normalizeText_(activeSelection && activeSelection.name || '');
      const ownerProjectNameNorm = normalizeText_(entry && entry.routeListName || '');
      if (!activeSelectionNameNorm || !ownerProjectNameNorm) return 'На карте';
      return activeSelectionNameNorm === ownerProjectNameNorm
        ? 'На карте'
        : 'На карте в другом проекте';
    }

    function getRegistryMapPlacementTitleText_(rowIndex, options) {
      const entry = getRegistryMapOverlayForRow_(rowIndex, options);
      if (!entry) return '';
      const ownerProjectName = String(entry && entry.routeListName || '').trim();
      const inspectorName = String(entry && entry.inspector || '').trim();
      if (ownerProjectName && inspectorName) return `На карте в проекте ${ownerProjectName} · ${inspectorName}`;
      if (ownerProjectName) return `На карте в проекте ${ownerProjectName}`;
      if (inspectorName) return `На карте · ${inspectorName}`;
      return 'На карте';
    }

    function isRegistryRowPlacedOnMap_(rowIndex, options) {
      return getRegistryMapOverlayVisitCountForRow_(rowIndex, options) > 0;
    }

    function canRegistryRowBeRemovedFromMap_(rowIndex) {
      return !!(getRegistryRowObjectId_(rowIndex) && isRegistryRowPlacedOnMap_(rowIndex));
    }

function getRegistryColumnSpec_(def) {
      if (!def) return null;
      if (def.spec) return def.spec;
      return def.summaryKey ? REGISTRY_SUMMARY_SPECS[def.summaryKey] || null : null;
    }

function isRegistryColumnAvailable_(def) {
      if (!def) return false;
      if (def.required) return true;
      if (String(def && def.key || '').trim() === 'inspector') {
        return true;
      }
      if (typeof def.isAvailable === 'function') return !!def.isAvailable();
      if (!state.columns.length) return def.defaultVisible !== false;
      const spec = getRegistryColumnSpec_(def);
      return !spec || !!findColumnBySpec_(spec);
    }

function getAvailableRegistryColumnDefs_() {
      const selected = new Set(normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys));
      return REGISTRY_COLUMN_DEFS.filter(def => {
        const key = String(def && def.key || '').trim();
        return !!(def && (def.required || selected.has(key) || isRegistryColumnAvailable_(def)));
      });
    }

function getVisibleRegistryColumnDefs_() {
      const visible = new Set(normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys));
      const defs = REGISTRY_COLUMN_DEFS.filter(def => visible.has(String(def && def.key || '').trim()));
      if (
        (
          isRegistrySelectionEditing_() ||
          (
            hasActiveSavedSelection_() &&
            !isRegistryMapRemovalMode_()
          )
        ) &&
        canCurrentUserManageMproMap_() &&
        isCurrentRegistryDatasetEditable_() &&
        !defs.some(def => String(def && def.key || '').trim() === 'inspector')
      ) {
        const inspectorDef = getRegistryColumnDef_('inspector');
        if (inspectorDef) defs.push(inspectorDef);
      }
      return defs;
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
      const monitoringOverlay = getMonitoringOverlayForRow_(rowIndex);
      const mapOverlay = getRegistryMapOverlayForRow_(rowIndex);
      const summary = {
        objectId: getRegistryRowObjectId_(rowIndex),
        dashboardUrl: readRegistrySummaryValueByKey_(rowIndex, 'dashboardUrl'),
        uin: readRegistrySummaryValueByKey_(rowIndex, 'uin'),
        dsCode: readRegistrySummaryValueByKey_(rowIndex, 'dsCode'),
        name: readRegistrySummaryValueByKey_(rowIndex, 'name'),
        tep: readRegistrySummaryValueByKey_(rowIndex, 'tep'),
        status: readRegistrySummaryValueByKey_(rowIndex, 'status'),
        grbs: readRegistrySummaryValueByKey_(rowIndex, 'grbs'),
        customer: readRegistrySummaryValueByKey_(rowIndex, 'customer'),
        evvYear: readRegistrySummaryValueByKey_(rowIndex, 'evvYear'),
        contractor: readRegistrySummaryValueByKey_(rowIndex, 'contractor'),
        anoSmgCode: String(readRegistrySummaryValueByKey_(rowIndex, 'anoSmgCode') || monitoringOverlay && monitoringOverlay.anoSmgCode || '').trim(),
        coordinates: String(readRegistrySummaryValueByKey_(rowIndex, 'coordinates') || '').trim(),
        inspector: String(monitoringOverlay && monitoringOverlay.inspector || readRegistrySummaryValueByKey_(rowIndex, 'inspector') || '').trim(),
        checklistUrl: String(readRegistrySummaryValueByKey_(rowIndex, 'checklistUrl') || monitoringOverlay && monitoringOverlay.checklistUrl || '').trim(),
        monitoringDate: String(monitoringOverlay && monitoringOverlay.monitoringDate || readRegistrySummaryValueByKey_(rowIndex, 'monitoringDate') || '').trim(),
        yandexDiskUrl: String(readRegistrySummaryValueByKey_(rowIndex, 'yandexDiskUrl') || monitoringOverlay && monitoringOverlay.yandexDiskUrl || '').trim(),
        lastDeniedAccessDate: String(monitoringOverlay && monitoringOverlay.lastDeniedAccessDate || '').trim(),
        lastDeniedAccessInspector: String(monitoringOverlay && monitoringOverlay.lastDeniedAccessInspector || '').trim(),
        hasLaterDeniedAccess: !!(monitoringOverlay && monitoringOverlay.hasLaterDeniedAccess),
        autosliderUrl: readRegistrySummaryValueByKey_(rowIndex, 'autosliderUrl'),
        constructionReadinessPlan: readRegistrySummaryValueByKey_(rowIndex, 'constructionReadinessPlan'),
        constructionReadinessFact: readRegistrySummaryValueByKey_(rowIndex, 'constructionReadinessFact'),
        peopleCountPlan: readRegistrySummaryValueByKey_(rowIndex, 'peopleCountPlan'),
        peopleCountFact: readRegistrySummaryValueByKey_(rowIndex, 'peopleCountFact'),
        deadlineRisk: readRegistrySummaryValueByKey_(rowIndex, 'deadlineRisk'),
        startSmrDate: readRegistrySummaryValueByKey_(rowIndex, 'startSmrDate'),
        mapPlacement: mapOverlay ? 'На карте' : '',
        mapPlacementDisplay: getRegistryMapPlacementDisplayText_(rowIndex),
        mapPlacementTitle: getRegistryMapPlacementTitleText_(rowIndex),
        rvDate,
        rvNumber
      };
      summary.constructionReadiness = summary.constructionReadinessFact;
      summary.rvStatus = hasRegistryRvValue_(summary) ? 'Есть РВ' : 'Нет РВ';
      summary.rvDisplay = formatRegistryRvDisplayText_(summary.rvDate, summary.rvNumber);
      summary.uinNorm = normalizeText_(summary.uin);
      summary.searchBlob = buildRegistrySearchBlob_(summary);
      summary.facetNormValues = {
        status: normalizeText_(summary.status),
        grbs: normalizeText_(summary.grbs),
        customer: normalizeText_(summary.customer),
        contractor: normalizeText_(summary.contractor),
        mapPlacement: normalizeText_(summary.mapPlacement),
        inspector: normalizeText_(summary.inspector),
        rvStatus: normalizeText_(summary.rvStatus)
      };
      state.registryRowSummaryCache.set(cacheKey, summary);
      return summary;
    }

function buildRegistrySearchBlob_(summary) {
      const item = summary && typeof summary === 'object' ? summary : {};
      return [
        item.uin,
        item.dsCode,
        item.name,
        item.status,
        item.grbs,
        item.customer,
        item.evvYear,
        item.contractor,
        item.anoSmgCode,
        item.inspector,
        item.monitoringDate
      ].map(normalizeText_).filter(Boolean).join(' | ');
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
      if (typeof defOrKey === 'string') {
        const def = getRegistryFacetDef_(defOrKey);
        return !!(def && String(def.kind || '').trim() === 'monitoring-date');
      }
      return String(defOrKey && defOrKey.kind || '').trim() === 'monitoring-date';
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

function normalizeMonitoringVisitStatus_(value) {
      const normalized = normalizeText_(value);
      return normalized === 'denied_access' ? 'denied_access' : 'completed';
    }

function getMonitoringHistoryStatusLabel_(status, fallbackLabel) {
      const normalized = normalizeMonitoringVisitStatus_(status);
      if (normalized === 'denied_access') return 'Недопуск';
      return String(fallbackLabel || '').trim() || 'Мониторинг выполнен';
    }

    function buildMonitoringLaterDeniedAccessTitle_(monitoringDate, deniedDate) {
      const successText = formatRegistryDateText_(monitoringDate);
      const deniedText = formatRegistryDateText_(deniedDate) || String(deniedDate || '').trim();
      if (!deniedText) return '';
      if (successText) {
        return `Последний успешный мониторинг: ${successText}. ${deniedText} - недопуск на объект.`;
      }
      return `Успешный мониторинг не найден. ${deniedText} - недопуск на объект.`;
    }

    function buildMonitoringRetainedMetricAlertTitle_(summaryOrValue, metricLabel) {
      const summary = summaryOrValue && typeof summaryOrValue === 'object' && !Array.isArray(summaryOrValue)
        ? summaryOrValue
        : null;
      if (!summary || !summary.hasLaterDeniedAccess) return '';
      const baseTitle = buildMonitoringLaterDeniedAccessTitle_(summary.monitoringDate, summary.lastDeniedAccessDate);
      const metricText = String(metricLabel || 'Показатель').trim();
      return [
        metricText ? `${metricText}: используется значение последнего успешного мониторинга.` : '',
        baseTitle
      ].filter(Boolean).join(' ');
    }

    function buildMonitoringDatePresentation_(summaryOrValue) {
      const summary = summaryOrValue && typeof summaryOrValue === 'object' && !Array.isArray(summaryOrValue)
        ? summaryOrValue
        : { monitoringDate: summaryOrValue };
      const text = String(summary && summary.monitoringDate || '').trim();
      const warningTitle = summary && summary.hasLaterDeniedAccess
        ? buildMonitoringLaterDeniedAccessTitle_(text, summary.lastDeniedAccessDate)
        : '';
      const info = getMonitoringDateStatusInfo_(text);
      const bucket = info ? info.bucket : 'missing';
      const displayText = info ? info.display : (text || 'Без даты');
      const title = [
        info ? info.title : (text || 'Дата мониторинга не указана'),
        warningTitle
      ].filter(Boolean).join(' ');
      return {
        text,
        warningTitle,
        info,
        bucket,
        displayText,
        title
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
      if (typeof defOrKey === 'string') {
        const def = getRegistryFacetDef_(defOrKey);
        return !!(def && String(def.kind || '').trim() === 'date-range');
      }
      return String(defOrKey && defOrKey.kind || '').trim() === 'date-range';
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
        if (allowedMap.size && normalized.length === allowedMap.size) {
          return allowedMap.size === 1 ? normalized : null;
        }
        return normalized;
      }
      const single = String(rawValue || '').trim();
      if (!single) return null;
      const singleNorm = normalizeText_(single);
      const allowedValue = singleNorm ? allowedMap.get(singleNorm) : '';
      if (!allowedValue) return [];
      if (allowedMap.size === 1) return [allowedValue];
      return [allowedValue];
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
        normalizeAnalyticsRegistryDrilldownRowIndexes_(state.analyticsRegistryDrilldownRowIndexes).join('\u0002'),
        REGISTRY_FILTER_DEFS
          .map(def => `${String(def.key || '')}:${serializeRegistryFacetSelection_(state.registryFacetFilters[def.key], def)}`)
          .join('\u0002')
      ].join('\u0001');
    }

function getRegistryBaseFilteredRowIndexes_() {
      const rowsLength = Array.isArray(state.rows) ? state.rows.length : 0;
      const cached = Array.isArray(state.registryBaseFilteredRowIndexes)
        ? state.registryBaseFilteredRowIndexes
        : [];
      if (!rowsLength) return [];
      const safeCached = cached.filter(rowIndex => Number.isFinite(rowIndex) && rowIndex >= 0 && rowIndex < rowsLength);
      if (safeCached.length) return safeCached;
      const hasScopedFilters = !!(
        String(state.objectQuery || '').trim() ||
        String(state.bulkUinText || '').trim() ||
        normalizeAnalyticsRegistryDrilldownRowIndexes_(state.analyticsRegistryDrilldownRowIndexes).length
      );
      if (hasScopedFilters) return safeCached;
      return state.rows.map((_row, rowIndex) => rowIndex);
    }

function collectRegistryFacetValuesFast_(facetKey) {
      const cacheKey = buildRegistryFacetCollectionCacheKey_(facetKey);
      if (state.registryFacetValuesCache.has(cacheKey)) {
        return state.registryFacetValuesCache.get(cacheKey).slice();
      }
      const seen = new Set();
      const values = [];
      const baseRows = getRegistryBaseFilteredRowIndexes_();

      for (let index = 0; index < baseRows.length; index++) {
        const rowIndex = Number(baseRows[index]);
        if (!Number.isFinite(rowIndex) || rowIndex < 0) continue;
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

    function getRegistryMapPlacementFacetCountFast_() {
      const baseRows = getRegistryBaseFilteredRowIndexes_();
      const seenObjectKeys = new Set();
      let total = 0;
      for (let index = 0; index < baseRows.length; index += 1) {
        const rowIndex = Number(baseRows[index]);
        if (!Number.isFinite(rowIndex) || rowIndex < 0) continue;
        if (!matchesRegistryFacetFiltersExcept_(rowIndex, state.registryFacetFilters, 'mapPlacement')) continue;
        if (!isRegistryRowPlacedOnMap_(rowIndex)) continue;
        const objectKey = normalizeMonitoringObjectKey_(
          getRegistryRowObjectId_(rowIndex) ||
          getRegistrySummaryValue_(rowIndex, 'uin') ||
          `row:${rowIndex}`
        );
        const safeObjectKey = objectKey || `row:${rowIndex}`;
        if (seenObjectKeys.has(safeObjectKey)) continue;
        seenObjectKeys.add(safeObjectKey);
        total += 1;
      }
      return total;
    }

function getRegistryFacetDef_(facetKey) {
      return REGISTRY_FILTER_DEFS.find(def => def.key === facetKey) || null;
    }

function getRegistryFacetValue_(rowIndex, facetKey) {
      const summary = getRegistryRowSummary_(rowIndex);
      return summary && Object.prototype.hasOwnProperty.call(summary, facetKey) ? String(summary[facetKey] || '') : '';
    }

function getRegistryFacetNormalizedValue_(rowIndex, facetKey) {
      const summary = getRegistryRowSummary_(rowIndex);
      if (!summary) return '';
      if (!summary.facetNormValues || typeof summary.facetNormValues !== 'object') {
        summary.facetNormValues = {};
      }
      if (Object.prototype.hasOwnProperty.call(summary.facetNormValues, facetKey)) {
        return String(summary.facetNormValues[facetKey] || '');
      }
      const normalized = normalizeText_(getRegistryFacetValue_(rowIndex, facetKey));
      summary.facetNormValues[facetKey] = normalized;
      return normalized;
    }

function getRegistryMapPlacementFacetTargetValue_() {
      const values = getRegistryFacetAvailableValues_('mapPlacement');
      return values.find(value => normalizeText_(value) === normalizeText_('На карте')) || 'На карте';
    }

function isRegistryMapPlacementFilterActive_() {
      const values = getRegistryFacetAvailableValues_('mapPlacement');
      const current = normalizeRegistryFacetSelection_(state.registryFacetFilters.mapPlacement, values);
      const targetValue = getRegistryMapPlacementFacetTargetValue_();
      return !!(
        Array.isArray(current) &&
        current.length === 1 &&
        normalizeText_(current[0]) === normalizeText_(targetValue)
      );
    }

function toggleRegistryMapPlacementFilter_() {
      const values = getRegistryFacetAvailableValues_('mapPlacement');
      const targetValue = getRegistryMapPlacementFacetTargetValue_();
      const current = normalizeRegistryFacetSelection_(state.registryFacetFilters.mapPlacement, values);
      const next = (
        Array.isArray(current) &&
        current.length === 1 &&
        normalizeText_(current[0]) === normalizeText_(targetValue)
      )
        ? null
        : [targetValue];
      state.registryFacetQueries.mapPlacement = '';
      updateRegistryFacetFilter_('mapPlacement', next);
      renderRegistryColumnsPanel_();
    }

function matchesRegistrySearch_(rowIndex, tokensOverride) {
      const tokens = Array.isArray(tokensOverride) ? tokensOverride : tokenize_(state.objectQuery);
      if (!tokens.length) return true;
      const summary = getRegistryRowSummary_(rowIndex);
      const text = String(summary && summary.searchBlob || '');
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
          const summary = getRegistryRowSummary_(rowIndex);
          const uinNorm = String(summary && summary.uinNorm || '');
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
      const summary = getRegistryRowSummary_(rowIndex);
      const currentUin = String(summary && summary.uinNorm || '');
      return currentUin ? selected.has(currentUin) : false;
    }

function matchesRegistryFacetSelectionForDef_(rowIndex, def, selection) {
      if (selection == null || selection === '' || selection === '__all__') return true;
      if (isMonitoringDateFacetDef_(def)) {
        const currentValue = getRegistryFacetValue_(rowIndex, def.key);
        return matchesMonitoringDateFacetFilterValue_(currentValue, selection);
      }
      if (isNumberRangeFacetDef_(def)) {
        const currentValue = getRegistryFacetValue_(rowIndex, def.key);
        return matchesNumberRangeFacetFilterValue_(currentValue, selection);
      }
      if (isDateRangeFacetDef_(def)) {
        const currentValue = getRegistryFacetValue_(rowIndex, def.key);
        return matchesDateRangeFacetFilterValue_(currentValue, selection);
      }
      const currentNorm = getRegistryFacetNormalizedValue_(rowIndex, def.key);
      if (Array.isArray(selection)) {
        if (!selection.length) return false;
        return selection.some(value => normalizeText_(value) === currentNorm);
      }
      return currentNorm === normalizeText_(selection);
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

function getSharedSelectionWorkBatchVisibleState_() {
      const batchMode = getSharedSelectionWorkBatchMode_();
      if (!batchMode || !canUseSharedSelectionWorkBatchMode_()) {
        return {
          visibleEntries: [],
          visibleCount: 0,
          selectedVisibleCount: 0,
          allVisibleSelected: false
        };
      }
      const visibleEntries = [];
      const seen = {};
      const selectedByKey = state.sharedSelectionWorkBatchSelectedByKey || {};
      let selectedVisibleCount = 0;
      getRegistryVisibleRowIndexes_().forEach(rowIndex => {
        if (!isRegistryRowSelectableForSharedWorkBatch_(rowIndex, batchMode)) return;
        const objectKey = String(getRegistryRowWorkKey_(rowIndex) || '').trim();
        const objectKeyNorm = normalizeText_(objectKey);
        if (!objectKeyNorm || seen[objectKeyNorm]) return;
        seen[objectKeyNorm] = true;
        visibleEntries.push({
          objectKey,
          objectKeyNorm,
          rowIndex,
          uin: String(getRegistryRowSummary_(rowIndex).uin || '').trim()
        });
        if (selectedByKey[objectKeyNorm]) selectedVisibleCount += 1;
      });
      const visibleCount = visibleEntries.length;
      return {
        visibleEntries,
        visibleCount,
        selectedVisibleCount,
        allVisibleSelected: !!visibleCount && selectedVisibleCount === visibleCount
      };
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
      if (isRegistryMapRemovalMode_()) exitRegistryMapRemovalMode_({ silent: true });
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

function toggleSharedSelectionWorkBatchVisibleRows_() {
      const batchMode = getSharedSelectionWorkBatchMode_();
      if (!batchMode || !canUseSharedSelectionWorkBatchMode_() || state.sharedSelectionWorkBatchPendingAction) return;
      const visibleState = getSharedSelectionWorkBatchVisibleState_();
      if (!visibleState.visibleCount) {
        showToast_(batchMode === 'take'
          ? 'В текущем реестре нет свободных объектов для пакетного взятия'
          : 'В текущем реестре нет ваших объектов для пакетной отдачи');
        return;
      }
      const next = { ...(state.sharedSelectionWorkBatchSelectedByKey || {}) };
      if (visibleState.allVisibleSelected) {
        visibleState.visibleEntries.forEach(entry => {
          delete next[entry.objectKeyNorm];
        });
      } else {
        visibleState.visibleEntries.forEach(entry => {
          next[entry.objectKeyNorm] = {
            objectKey: entry.objectKey,
            uin: entry.uin
          };
        });
      }
      state.sharedSelectionWorkBatchSelectedByKey = next;
      renderRegistryView_();
    }

function isRegistryMapRemovalMode_() {
      return canCurrentUserManageMproMap_() && isCurrentRegistryDatasetEditable_() && String(state.registryMapRemovalMode || '').trim() === 'remove';
    }

function getRegistryMapRemovalSelectedEntries_() {
      return Object.keys(state.registryMapRemovalSelectedByKey || {})
        .map(key => state.registryMapRemovalSelectedByKey[key])
        .filter(Boolean)
        .sort((left, right) => Number(left && left.rowIndex) - Number(right && right.rowIndex));
    }

function getRegistryMapRemovalSelectedCount_() {
      return getRegistryMapRemovalSelectedEntries_().length;
    }

function getVisibleRegistryMapRemovalCandidateRows_() {
      return (Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes : [])
        .filter(rowIndex => canRegistryRowBeRemovedFromMap_(rowIndex));
    }

function getRegistryMapRemovalVisibleState_() {
      const visibleRowIndexes = getVisibleRegistryMapRemovalCandidateRows_();
      const selectedByKey = state.registryMapRemovalSelectedByKey || {};
      const selectedVisibleCount = visibleRowIndexes.reduce((count, rowIndex) => {
        const objectKeyNorm = normalizeText_(getRegistryRowObjectId_(rowIndex));
        return objectKeyNorm && selectedByKey[objectKeyNorm] ? count + 1 : count;
      }, 0);
      return {
        visibleCount: visibleRowIndexes.length,
        selectedVisibleCount,
        allVisibleSelected: visibleRowIndexes.length > 0 && selectedVisibleCount === visibleRowIndexes.length
      };
    }

function clearRegistryMapRemovalState_(options) {
      const settings = options || {};
      state.registryMapRemovalSelectedByKey = {};
      if (!settings.preserveMode) state.registryMapRemovalMode = '';
      if (!settings.preservePending) state.registryMapRemovalPendingAction = '';
    }

function exitRegistryMapRemovalMode_(options) {
      if (!isRegistryMapRemovalMode_() && !getRegistryMapRemovalSelectedCount_()) return;
      clearRegistryMapRemovalState_();
      const settings = options || {};
      if (!settings.silent) {
        renderRegistryView_();
        renderObjectView_();
      }
    }

function pruneRegistryMapRemovalSelection_() {
      if (!isRegistryMapRemovalMode_() || state.registryMapRemovalPendingAction) return;
      const next = {};
      getVisibleRegistryMapRemovalCandidateRows_().forEach(rowIndex => {
        const objectId = String(getRegistryRowObjectId_(rowIndex) || '').trim();
        const objectKeyNorm = normalizeText_(objectId);
        const existing = objectKeyNorm ? (state.registryMapRemovalSelectedByKey || {})[objectKeyNorm] : null;
        if (!objectKeyNorm || !existing) return;
        const overlayEntries = getRegistryMapOverlayEntriesForRow_(rowIndex);
        next[objectKeyNorm] = {
          objectId,
          rowIndex: Number(rowIndex),
          uin: String(getRegistryRowSummary_(rowIndex).uin || existing.uin || '').trim(),
          divisionCode: normalizeMproDivisionCode_(existing.divisionCode || getCurrentUserMproDivisionCode_() || overlayEntries[0] && overlayEntries[0].divisionCode || ''),
          visitIds: overlayEntries.map(entry => String(entry && entry.visitId || '').trim()).filter(Boolean)
        };
      });
      state.registryMapRemovalSelectedByKey = next;
    }

function isRegistryRowSelectedForMapRemoval_(rowIndex) {
      const objectKeyNorm = normalizeText_(getRegistryRowObjectId_(rowIndex));
      if (!objectKeyNorm) return false;
      return !!(state.registryMapRemovalSelectedByKey || {})[objectKeyNorm];
    }

function toggleRegistryRowMapRemovalSelection_(rowIndex) {
      if (!isRegistryMapRemovalMode_() || state.registryMapRemovalPendingAction) return;
      const targetIndex = Number(rowIndex);
      if (!Number.isFinite(targetIndex) || targetIndex < 0 || !canRegistryRowBeRemovedFromMap_(targetIndex)) return;
      const objectId = String(getRegistryRowObjectId_(targetIndex) || '').trim();
      const objectKeyNorm = normalizeText_(objectId);
      if (!objectKeyNorm) return;
      const next = { ...(state.registryMapRemovalSelectedByKey || {}) };
      if (next[objectKeyNorm]) {
        delete next[objectKeyNorm];
      } else {
        const overlayEntries = getRegistryMapOverlayEntriesForRow_(targetIndex);
        next[objectKeyNorm] = {
          objectId,
          rowIndex: targetIndex,
          uin: String(getRegistryRowSummary_(targetIndex).uin || '').trim(),
          divisionCode: normalizeMproDivisionCode_(getCurrentUserMproDivisionCode_() || overlayEntries[0] && overlayEntries[0].divisionCode || ''),
          visitIds: overlayEntries.map(entry => String(entry && entry.visitId || '').trim()).filter(Boolean)
        };
      }
      state.registryMapRemovalSelectedByKey = next;
      renderRegistryView_();
    }

function toggleRegistryMapRemovalVisibleRows_() {
      if (!isRegistryMapRemovalMode_() || state.registryMapRemovalPendingAction) return;
      const visibleRowIndexes = getVisibleRegistryMapRemovalCandidateRows_();
      if (!visibleRowIndexes.length) return;
      const visibleState = getRegistryMapRemovalVisibleState_();
      if (visibleState.allVisibleSelected) {
        state.registryMapRemovalSelectedByKey = {};
      } else {
        const next = {};
        visibleRowIndexes.forEach(rowIndex => {
          const objectId = String(getRegistryRowObjectId_(rowIndex) || '').trim();
          const objectKeyNorm = normalizeText_(objectId);
          if (!objectKeyNorm) return;
          const overlayEntries = getRegistryMapOverlayEntriesForRow_(rowIndex);
          next[objectKeyNorm] = {
            objectId,
            rowIndex: Number(rowIndex),
            uin: String(getRegistryRowSummary_(rowIndex).uin || '').trim(),
            divisionCode: normalizeMproDivisionCode_(getCurrentUserMproDivisionCode_() || overlayEntries[0] && overlayEntries[0].divisionCode || ''),
            visitIds: overlayEntries.map(entry => String(entry && entry.visitId || '').trim()).filter(Boolean)
          };
        });
        state.registryMapRemovalSelectedByKey = next;
      }
      renderRegistryView_();
    }

function enterRegistryMapRemovalMode_() {
      if (!canCurrentUserManageMproMap_() || !isCurrentRegistryDatasetEditable_()) return;
      if (state.loading || state.adminRegistryPendingAction || state.adminRegistryDialogSaving) return;
      closeSelectionPublishMenu_();
      if (isRegistrySelectionEditing_()) closeRegistrySelectionEditing_();
      if (hasSharedSelectionWorkBatchMode_()) clearSharedSelectionWorkBatchSelection_();
      if (isAdminRegistryEditMode_()) disableAdminRegistryEditMode_();
      const visibleRowIndexes = getVisibleRegistryMapRemovalCandidateRows_();
      if (!visibleRowIndexes.length) {
        showCopyToast_('По текущим фильтрам нет объектов на карте', true);
        return;
      }
      state.registryMapRemovalMode = 'remove';
      state.registryMapRemovalPendingAction = '';
      state.registryMapRemovalSelectedByKey = {};
      state.currentView = 'registry';
      renderRegistryView_();
      renderObjectView_();
    }

function buildRegistryMapRemovalToastText_(result) {
      const removed = Number(result && result.removedObjects) || 0;
      const archivedVisits = Number(result && result.archivedVisits) || 0;
      const archivedToHistory = Number(result && result.archivedToHistoryCount) || 0;
      if (!removed) return 'На карте ничего не изменилось';
      const parts = [removed === 1 ? 'Объект снят с карты' : `Снято с карты: ${removed}`];
      if (archivedVisits > removed) parts.push(`архивировано записей: ${archivedVisits}`);
      if (archivedToHistory) parts.push(`в истории: ${archivedToHistory}`);
      return parts.join(' · ');
    }

async function removeSelectedRegistryMapObjects_() {
      if (!isRegistryMapRemovalMode_() || state.registryMapRemovalPendingAction) return null;
      const entries = getRegistryMapRemovalSelectedEntries_();
      if (!entries.length) {
        showCopyToast_('Сначала выберите объекты на карте', true);
        return null;
      }
      const confirmed = window.confirm(`Снять с карты выбранные объекты (${entries.length})?`);
      if (!confirmed) return null;
      state.registryMapRemovalPendingAction = 'remove';
      renderRegistryView_();
      try {
        const result = await runServer_('removeSmartFilterShellRegistryObjectsFromMproMap', [{
          spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
          sheetName: state.runtimeOptions.sheetName || DEFAULT_SHEET_NAME,
          headerRow: state.runtimeOptions.headerRow || DEFAULT_HEADER_ROW,
          divisionCode: normalizeMproDivisionCode_(getCurrentUserMproDivisionCode_() || ''),
          rowIndexes: entries.map(entry => Number(entry && entry.rowIndex)).filter(value => Number.isFinite(value) && value >= 0),
          visitIds: entries.flatMap(entry => (
            Array.isArray(entry && entry.visitIds)
              ? entry.visitIds.map(value => String(value || '').trim()).filter(Boolean)
              : []
          ))
        }]);
        const removed = Number(result && result.removedObjects) || 0;
        clearRegistryMapRemovalState_();
        if (removed > 0) {
          notifyMproDataChanged_({
            event: 'points-removed'
          });
          await loadData_(buildCurrentDataRefreshOptions_({
            silent: true,
            preserveView: 'registry'
          }));
        }
        showCopyToast_(buildRegistryMapRemovalToastText_(result), removed <= 0);
        return result;
      } catch (err) {
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return null;
        }
        showCopyToast_('Не удалось снять объекты с карты', true);
        reportRuntimeError_(err, 'Ошибка снятия объектов с карты');
        return null;
      } finally {
        state.registryMapRemovalPendingAction = '';
        renderRegistryView_();
        renderObjectView_();
      }
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
      if (isRegistryMapRemovalMode_()) {
        return rows.filter(rowIndex => canRegistryRowBeRemovedFromMap_(rowIndex));
      }
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

function editRegistrySelectionById_(selectionId) {
      const item = findSavedRegistrySelectionById_(selectionId);
      if (!item) return;
      if (!canEditSavedSelection_(item)) {
        showCopyToast_('Этот проект нельзя редактировать', true);
        return;
      }
      openRegistrySelectionComposer_(item.id);
    }

function removeRegistrySelectionById_(selectionId) {
      const item = findSavedRegistrySelectionById_(selectionId);
      if (!item) return;
      if (!canRemoveSavedSelection_(item)) {
        showCopyToast_('Этот проект нельзя удалить', true);
        return;
      }
      removeSavedRegistrySelection_(item.id);
    }

function canPublishSelectionToMap_(item) {
      const selection = item || getActiveRegistrySelection_();
      if (!selection) return false;
      if (!canCurrentUserManageMproMap_() || !isCurrentRegistryDatasetEditable_()) return false;
      return String(state.activeRegistrySelectionId || '').trim() === String(selection.id || '').trim();
    }

function getSelectionPublishModeLabel_(mode) {
      return String(mode || '').trim() === 'replace'
        ? 'Заменить текущий список блока'
        : 'Добавить к текущему';
    }

function getRegistrySelectionPublishRowIndexes_(selectionId) {
      const targetId = String(selectionId || '').trim();
      const editingId = getRegistrySelectionEditTargetId_();
      const useDraftSelection = isRegistrySelectionEditing_() && (
        (targetId && editingId && targetId === editingId) ||
        (!targetId && !editingId)
      );
      if (useDraftSelection) {
        const draftSet = getRegistrySelectionEditDraftSet_();
        if (!draftSet.size) return [];
        return state.rows.reduce((acc, row, rowIndex) => {
          const uin = normalizeText_(getRegistrySummaryValue_(rowIndex, 'uin'));
          if (uin && draftSet.has(uin)) acc.push(rowIndex);
          return acc;
        }, []);
      }
      return Array.isArray(state.filteredRowIndexes) ? state.filteredRowIndexes.slice() : [];
    }

function getRegistrySelectionPublishContext_(selectionId) {
      const rowIndexes = getRegistrySelectionPublishRowIndexes_(selectionId);
      const seenObjectKeys = new Set();
      const objects = [];
      rowIndexes.forEach(rowIndex => {
        const normalizedRowIndex = Number(rowIndex);
        if (!Number.isFinite(normalizedRowIndex) || normalizedRowIndex < 0) return;
        const objectId = String(getRegistryRowObjectId_(normalizedRowIndex) || '').trim();
        const objectKey = normalizeText_(objectId);
        if (!objectId || !objectKey || seenObjectKeys.has(objectKey)) return;
        seenObjectKeys.add(objectKey);
        objects.push({
          rowIndex: normalizedRowIndex,
          objectId,
          summary: getRegistryRowSummary_(normalizedRowIndex)
        });
      });
      const primaryObject = objects[0] || null;
      const divisionCode = normalizeMproDivisionCode_(getCurrentUserMproDivisionCode_() || '');
      const currentDivisionEntries = primaryObject
        ? getRegistryMapOverlayEntriesForObjectKey_(primaryObject.objectId, { divisionCode })
        : [];
      const selectedOnMapCount = objects.reduce((total, item) => (
        total + (getRegistryMapOverlayVisitCountForRow_(item.rowIndex, { divisionCode }) > 0 ? 1 : 0)
      ), 0);
      return {
        rowIndexes,
        objects,
        uniqueObjectCount: objects.length,
        isSingleObject: objects.length === 1,
        primaryObject,
        divisionCode,
        currentDivisionEntries,
        currentDivisionVisitCount: currentDivisionEntries.length,
        selectedOnMapCount
      };
    }

function buildRegistrySelectionPublishVisitRequests_(publishContext) {
      const context = publishContext && typeof publishContext === 'object' ? publishContext : null;
      if (!context || !Array.isArray(context.objects) || !context.objects.length) return [];
      const divisionCode = normalizeMproDivisionCode_(context.divisionCode || getCurrentUserMproDivisionCode_() || '') || 'map';
      const fallbackInspectorNames = getSelectionPublishInspectorNames_();
      let hasExplicitAssignments = false;
      const requests = [];
      context.objects.forEach(item => {
        const objectId = String(item && item.objectId || '').trim();
        if (!objectId) return;
        const baseRequest = {
          rowIndex: Number(item && item.rowIndex),
          objectId,
          divisionCode
        };
        const inspectorNames = typeof getSelectionPublishInspectorNamesForObject_ === 'function'
          ? getSelectionPublishInspectorNamesForObject_(objectId)
          : [];
        const resolvedInspectorNames = inspectorNames.length ? inspectorNames : fallbackInspectorNames;
        const resolvedInspectorName = String(resolvedInspectorNames[0] || '').trim();
        if (resolvedInspectorName) {
          hasExplicitAssignments = true;
          requests.push({
            ...baseRequest,
            inspectorName: resolvedInspectorName
          });
          return;
        }
        requests.push(baseRequest);
      });
      return hasExplicitAssignments ? requests : [];
    }

function getMproFiltersStorageKey_() {
      const baseKey = 'mpro_filters';
      const userNorm = normalizeText_(state.currentUser && state.currentUser.name || '');
      return userNorm ? `${baseKey}:${userNorm}` : baseKey;
    }

function clearPersistedMproFilters_() {
      try {
        window.localStorage.removeItem(getMproFiltersStorageKey_());
      } catch (_) {
        // no-op
      }
    }

function notifyMproDataChanged_(payload) {
      const detail = payload && typeof payload === 'object' ? payload : {};
      const signal = {
        at: Date.now(),
        source: 'site',
        event: String(detail.event || 'points-published').trim() || 'points-published',
        selectionId: String(detail.selectionId || '').trim(),
        publishMode: String(detail.publishMode || '').trim()
      };
      try {
        window.localStorage.setItem(MPRO_SYNC_SIGNAL_STORAGE_KEY, JSON.stringify(signal));
      } catch (_) {
        // no-op
      }
      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('mpro-sync');
          channel.postMessage(signal);
          window.setTimeout(() => channel.close(), 0);
        }
      } catch (_) {
        // no-op
      }
    }

function buildSelectionPublishToastText_(result) {
      const publishMode = String(result && result.publishMode || '').trim() === 'replace' ? 'replace' : 'append';
      const resolved = Number(result && result.resolvedObjects) || 0;
      const created = Number(result && result.createdVisits) || 0;
      const refreshed = Number(result && result.refreshedVisits) || 0;
      const busy = Number(result && result.busyVisits) || 0;
      const withoutCoordinates = Number(result && result.objectsWithoutCoordinates) || 0;
      const replacedPlanned = Number(result && result.replacedPlanned) || 0;
      const replacedStaleInProgress = Number(result && result.replacedStaleInProgress) || 0;
      const replacedCompleted = Number(result && result.replacedCompleted) || 0;
      const replacedDenied = Number(result && result.replacedDenied) || 0;
      const skippedInProgress = Number(result && result.skippedInProgress) || 0;
      const archivedToHistory = Number(result && result.archivedToHistoryCount) || 0;
      const transferred = Number(result && result.transferredOwnershipCount) || 0;
      const keptOtherProject = Number(result && result.keptOtherProjectCount) || 0;
      const conflicts = Number(result && result.conflictAssignedCount) || 0;
      const parts = [
        publishMode === 'replace'
          ? `На карту отправлено: ${resolved} · режим "${getSelectionPublishModeLabel_('replace')}"`
          : `На карту отправлено: ${resolved}`
      ];
      if (created) parts.push(`новых ${created}`);
      if (refreshed) parts.push(`обновлено ${refreshed}`);
      if (transferred) parts.push(`перенесено ${transferred}`);
      if (keptOtherProject) parts.push(`в другом проекте ${keptOtherProject}`);
      if (conflicts) parts.push(`конфликтов ${conflicts}`);
      if (replacedPlanned) parts.push(`снято новых ${replacedPlanned}`);
      if (replacedStaleInProgress) parts.push(`снято зависших "в работе" ${replacedStaleInProgress}`);
      if (replacedCompleted) parts.push(`снято выполненных ${replacedCompleted}`);
      if (replacedDenied) parts.push(`снято недопусков ${replacedDenied}`);
      if (archivedToHistory) parts.push(`в истории ${archivedToHistory}`);
      if (skippedInProgress) parts.push(`в работе оставлено ${skippedInProgress}`);
      if (busy) parts.push(`не перезаписано ${busy}`);
      if (withoutCoordinates) parts.push(`без координат ${withoutCoordinates}`);
      return parts.join(' · ');
    }

function buildSelectionPublishAlertText_(result) {
      const transferred = Number(result && result.transferredOwnershipCount) || 0;
      const keptOtherProject = Number(result && result.keptOtherProjectCount) || 0;
      const conflicts = Number(result && result.conflictAssignedCount) || 0;
      const busy = Number(result && result.busyVisits) || 0;
      const details = Array.isArray(result && result.details) ? result.details : [];
      if (!(transferred || keptOtherProject || conflicts || busy || details.length)) return '';
      const lines = ['Результат публикации на карту'];
      if (transferred) lines.push(`Перенесено из других проектов: ${transferred}`);
      if (keptOtherProject) lines.push(`Уже на карте в другом проекте: ${keptOtherProject}`);
      if (conflicts) lines.push(`Конфликты назначения: ${conflicts}`);
      if (busy) lines.push(`Занятые точки без изменений: ${busy}`);
      const detailLines = details
        .slice(0, 12)
        .map(item => {
          const objectId = String(item && item.objectId || '').trim() || 'Объект';
          const routeListName = String(item && item.routeListName || '').trim();
          const inspectorName = String(item && item.inspector || '').trim();
          const visitStatus = String(item && item.visitStatus || '').trim();
          const status = String(item && item.status || '').trim();
          if (status === 'transferred') {
            return `${objectId}: перенесено в проект ${routeListName}${inspectorName ? ` · ${inspectorName}` : ''}`;
          }
          if (status === 'kept_other_project') {
            return `${objectId}: уже на карте в проекте ${routeListName}${inspectorName ? ` · ${inspectorName}` : ''}`;
          }
          if (status === 'conflict_assigned') {
            return `${objectId}: конфликт с проектом ${routeListName}${inspectorName ? ` · ${inspectorName}` : ''}`;
          }
          if (status === 'busy') {
            return `${objectId}: занято (${visitStatus || 'активный выезд'})`;
          }
          return '';
        })
        .filter(Boolean);
      if (detailLines.length) {
        lines.push('');
        lines.push(...detailLines);
        if (details.length > detailLines.length) {
          lines.push(`... и ещё ${details.length - detailLines.length}`);
        }
      }
      return lines.join('\n');
    }

function maybeShowSelectionPublishAlert_(result) {
      const text = buildSelectionPublishAlertText_(result);
      if (!text || typeof window === 'undefined' || typeof window.alert !== 'function') return;
      window.setTimeout(() => {
        window.alert(text);
      }, 0);
    }

async function publishRegistrySelectionById_(selectionId, requestedMode) {
      const item = findSavedRegistrySelectionById_(selectionId);
      if (!item) return;
      if (!canPublishSelectionToMap_(item)) {
        showCopyToast_('Сначала откройте сохраненный проект без черновых изменений', true);
        return;
      }
      if (state.selectionPublishingId || state.selectionLoadingId || state.selectionRemovingId || state.loading) return;
      const publishContext = getRegistrySelectionPublishContext_(item.id);
      const rowIndexes = Array.isArray(publishContext && publishContext.rowIndexes) ? publishContext.rowIndexes : [];
      if (!rowIndexes.length) {
        showCopyToast_(
          isRegistrySelectionPublishDraftOpen_()
            ? 'Выберите объекты проекта для публикации на карту'
            : 'В проекте нет объектов для публикации',
          true
        );
        return;
      }
      const requestedModeKey = String(requestedMode || '').trim();
      const publishMode = requestedModeKey === 'replace'
        ? 'replace'
        : (requestedModeKey === 'append' ? 'append' : '');
      if (!publishMode) {
        toggleSelectionPublishMenu_(item.id);
        return;
      }
      clearRuntimeError_();
      closeSelectionPublishMenu_();
      state.selectionPublishingId = String(item.id || '').trim();
      renderSavedSelectionsPanel_();
      renderRegistrySelectionEditBar_();
      try {
        const visitRequests = buildRegistrySelectionPublishVisitRequests_(publishContext);
        const result = await publishSelectionToMpro_(item, rowIndexes, publishMode, {
          divisionCode: normalizeMproDivisionCode_(publishContext && publishContext.divisionCode || ''),
          visitRequests
        });
        const resolved = Number(result && result.resolvedObjects) || 0;
        if (resolved > 0) {
          if (publishMode === 'replace') clearPersistedMproFilters_();
          notifyMproDataChanged_({
            event: 'points-published',
            selectionId: item.id,
            publishMode
          });
          if (
            state.selectionPublishDraftOpen &&
            String(state.selectionPublishDraftSelectionId || '').trim() === String(item.id || '').trim()
          ) {
            resetRegistrySelectionPublishDraftState_();
          } else {
            resetSelectionPublishDraftOptions_();
          }
          await loadData_(buildCurrentDataRefreshOptions_({
            silent: true,
            preserveView: 'registry'
          }));
        }
        showCopyToast_(
          resolved > 0
            ? buildSelectionPublishToastText_(result)
            : 'Не удалось подобрать объекты для публикации',
          resolved <= 0
        );
        maybeShowSelectionPublishAlert_(result);
      } catch (err) {
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return;
        }
        showCopyToast_('Не удалось отправить проект на карту', true);
        reportRuntimeError_(err, 'Ошибка публикации на карту');
      } finally {
        if (String(state.selectionPublishingId || '').trim() === String(item.id || '').trim()) {
          state.selectionPublishingId = '';
        }
        renderSavedSelectionsPanel_();
        renderRegistrySelectionEditBar_();
      }
    }

async function publishRegistryToolbarDraftToMap_() {
      const draftId = getRegistrySelectionEditTargetId_();
      if (!isRegistrySelectionPublishDraftOpen_() || !isRegistryToolbarMapDraftId_(draftId)) return;
      if (!canCurrentUserManageMproMap_() || !isCurrentRegistryDatasetEditable_()) return;
      if (state.selectionPublishingId || state.selectionLoadingId || state.selectionRemovingId || state.loading) return;
      const publishContext = getRegistrySelectionPublishContext_(draftId);
      const rowIndexes = Array.isArray(publishContext && publishContext.rowIndexes) ? publishContext.rowIndexes : [];
      if (!rowIndexes.length) {
        showCopyToast_('Выберите объекты в реестре для публикации на карту', true);
        return;
      }
      const publishToken = getRegistryToolbarMapDraftId_();
      clearRuntimeError_();
      closeSelectionPublishMenu_();
      state.selectionPublishingId = publishToken;
      renderRegistrySelectionEditBar_();
      if (typeof renderRegistryMapToolbarActions_ === 'function') renderRegistryMapToolbarActions_();
      try {
        const visitRequests = buildRegistrySelectionPublishVisitRequests_(publishContext);
        const result = await publishSelectionToMpro_({
          id: publishToken,
          name: 'Реестр объектов'
        }, rowIndexes, 'append', {
          divisionCode: normalizeMproDivisionCode_(publishContext && publishContext.divisionCode || ''),
          visitRequests
        });
        const resolved = Number(result && result.resolvedObjects) || 0;
        if (resolved > 0) {
          notifyMproDataChanged_({
            event: 'points-published',
            selectionId: publishToken,
            publishMode: 'append'
          });
          resetRegistrySelectionPublishDraftState_();
          await loadData_(buildCurrentDataRefreshOptions_({
            silent: true,
            preserveView: 'registry'
          }));
        }
        showCopyToast_(
          resolved > 0
            ? buildSelectionPublishToastText_(result)
            : 'Не удалось подобрать объекты для публикации',
          resolved <= 0
        );
        maybeShowSelectionPublishAlert_(result);
      } catch (err) {
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return;
        }
        showCopyToast_('Не удалось отправить объекты из реестра на карту', true);
        reportRuntimeError_(err, 'Ошибка публикации реестра на карту');
      } finally {
        if (String(state.selectionPublishingId || '').trim() === publishToken) {
          state.selectionPublishingId = '';
        }
        renderRegistrySelectionEditBar_();
        if (typeof renderRegistryMapToolbarActions_ === 'function') renderRegistryMapToolbarActions_();
      }
    }

async function publishRegistrySelectionComposerDraft_(requestedMode) {
      if (!state.selectionComposerOpen || getRegistrySelectionComposerViewMode_() !== 'registry') return;
      if (!canCurrentUserManageMproMap_() || !isCurrentRegistryDatasetEditable_()) return;
      if (state.selectionPublishingId || state.selectionLoadingId || state.selectionRemovingId || state.loading) return;
      const publishContext = getRegistrySelectionPublishContext_(getRegistrySelectionEditTargetId_());
      const rowIndexes = Array.isArray(publishContext && publishContext.rowIndexes) ? publishContext.rowIndexes : [];
      if (!rowIndexes.length) {
        showCopyToast_('Выберите объекты в реестре для публикации на карту', true);
        return;
      }
      const requestedModeKey = String(requestedMode || '').trim();
      const publishMode = requestedModeKey === 'replace'
        ? 'replace'
        : (requestedModeKey === 'append' ? 'append' : 'append');
      const draftSelectionId = String(state.selectionComposerSelectionId || '').trim();
      const draftSelectionName = String(state.selectionComposerDraftName || '').trim() || buildRegistrySelectionLabel_();
      const publishToken = '__composer__';
      clearRuntimeError_();
      closeSelectionPublishMenu_();
      state.selectionPublishingId = publishToken;
      renderSavedSelectionsPanel_();
      renderRegistrySelectionEditBar_();
      try {
        const visitRequests = buildRegistrySelectionPublishVisitRequests_(publishContext);
        const result = await publishSelectionToMpro_({
          id: draftSelectionId,
          name: draftSelectionName
        }, rowIndexes, publishMode, {
          divisionCode: normalizeMproDivisionCode_(publishContext && publishContext.divisionCode || ''),
          visitRequests
        });
        const resolved = Number(result && result.resolvedObjects) || 0;
        if (resolved > 0) {
          if (publishMode === 'replace') clearPersistedMproFilters_();
          notifyMproDataChanged_({
            event: 'points-published',
            selectionId: draftSelectionId,
            publishMode
          });
          await loadData_(buildCurrentDataRefreshOptions_({
            silent: true,
            preserveView: 'registry'
          }));
        }
        showCopyToast_(
          resolved > 0
            ? buildSelectionPublishToastText_(result)
            : 'Не удалось подобрать объекты для публикации',
          resolved <= 0
        );
        maybeShowSelectionPublishAlert_(result);
      } catch (err) {
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return;
        }
        showCopyToast_('Не удалось отправить выборку на карту', true);
        reportRuntimeError_(err, 'Ошибка публикации на карту');
      } finally {
        if (String(state.selectionPublishingId || '').trim() === publishToken) {
          state.selectionPublishingId = '';
        }
        renderSavedSelectionsPanel_();
        renderRegistrySelectionEditBar_();
      }
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
      if (section && section.disableSourceFallback) return [];
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
      const fieldId = normalizeText_(column && column.fieldId || '');
      const labelKey = normalizeText_(column && column.label || '');

      if (sourceKey === '__lab__') {
        return /^lb_1_(5|6|7|8|9|10|11|12)$/i.test(fieldId);
      }

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
      state.registryBaseFilteredRowIndexes = [];
      state.registryTableStructureSignature = '';
      state.registryRowsSignature = '';
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
      const useActiveSelectionBase = shouldUseActiveRegistrySelectionBase_();
      const activeSelectionBaseRowIndexes = useActiveSelectionBase && Array.isArray(state.activeRegistrySelectionBaseRowIndexes)
        ? state.activeRegistrySelectionBaseRowIndexes
        : null;
      const bulkUinOrder = buildRegistryBulkUinOrderMap_(state.bulkUinText);
      const bulkUinSet = bulkUinOrder.size ? new Set(Array.from(bulkUinOrder.keys())) : new Set();
      const searchTokens = tokenize_(state.objectQuery);
      const analyticsDrilldownSet = new Set(normalizeAnalyticsRegistryDrilldownRowIndexes_(state.analyticsRegistryDrilldownRowIndexes));
      const baseFiltered = [];
      const filtered = [];
      const candidateRowIndexes = activeSelectionBaseRowIndexes || Array.from({ length: state.rows.length }, (_, rowIndex) => rowIndex);
      for (let idx = 0; idx < candidateRowIndexes.length; idx++) {
        const rowIndex = candidateRowIndexes[idx];
        if (analyticsDrilldownSet.size && !analyticsDrilldownSet.has(rowIndex)) continue;
        if (!matchesRegistryBulkUin_(rowIndex, bulkUinSet)) continue;
        if (!matchesRegistrySearch_(rowIndex, searchTokens)) continue;
        baseFiltered.push(rowIndex);
        if (matchesRegistryFacetFilters_(rowIndex, state.registryFacetFilters)) filtered.push(rowIndex);
      }
      state.registryBaseFilteredRowIndexes = baseFiltered;
      state.filteredRowIndexes = bulkUinOrder.size
        ? sortRegistryRowIndexesByBulkUinOrder_(filtered, Array.from(bulkUinOrder.keys()))
        : filtered;
      if (useActiveSelectionBase && state.activeRegistrySelectionBaseRowIndexes === null) {
        setActiveRegistrySelectionBaseRowIndexes_(state.filteredRowIndexes);
      }
      pruneSharedSelectionWorkBatchSelection_();
      pruneRegistryMapRemovalSelection_();
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
      if (values.length === 1) {
        const singleSelected = Array.isArray(current)
          ? current.some(item => normalizeText_(item) === textNorm)
          : normalizeText_(current) === textNorm;
        next = singleSelected ? null : [text];
        updateRegistryFacetFilter_(facetKey, next);
        return;
      }
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
        const disableSourceFallback = !allSelected && !fieldIds.length && !fieldSpecs.length;
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
          excludePinned: !!def.excludePinned,
          disableSourceFallback
        };
      }
      const optionKey = selectedKeys[0];
      const option = options[0];
      const fieldIds = buildPresetSectionFieldIds_([option]);
      const fieldSpecs = buildPresetSectionFieldSpecs_([option]);
      return {
        id: `preset:${key}:${option.key}`,
        presetKey: key,
        optionKey: option.key,
        optionKeys: [option.key],
        title: option.title,
        subtitle: option.subtitle,
        sourceKey: def.sourceKey,
        fieldIds,
        fieldSpecs,
        mode: option.mode,
        excludePinned: !!def.excludePinned,
        disableSourceFallback: !fieldIds.length && !fieldSpecs.length
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
      if (normalizeAnalyticsRegistryDrilldownRowIndexes_(state.analyticsRegistryDrilldownRowIndexes).length) return true;
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
      renderRegistryInteraction_({
        includeWorkspaceTabs: true,
        includeObjectView: state.currentView === 'object'
      });
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
      renderRegistryInteraction_({
        includeWorkspaceTabs: true,
        includeObjectView: state.currentView === 'object'
      });
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
      const activeSelection = getActiveRegistrySelection_();
      if (activeSelection && !isRegistrySelectionEditing_() && !state.adminRegistryEditMode) {
        applySavedRegistrySelection_(String(activeSelection.id || ''));
        return;
      }
      state.analyticsRegistryDrilldownRowIndexes = [];
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
      renderRegistryInteraction_({
        includeWorkspaceTabs: true,
        includeObjectView: state.currentView === 'object'
      });
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


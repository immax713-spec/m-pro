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

function getSelectionPublishAssignmentsStorageKey_() {
      const userName = normalizeText_(state.currentUser && state.currentUser.name || 'guest') || 'guest';
      const division = normalizeText_(state.currentUser && state.currentUser.division || '');
      const suffix = [userName, division].filter(Boolean).join('__');
      return `${REGISTRY_SELECTION_PUBLISH_ASSIGNMENTS_STORAGE_PREFIX}${suffix || 'guest'}`;
    }

function normalizeSavedSelectionPublishAssignmentsStore_(rawValue) {
      const source = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? rawValue
        : {};
      const out = {};
      Object.keys(source).forEach(rawSelectionId => {
        const selectionId = String(rawSelectionId || '').trim();
        if (!selectionId) return;
        const assignments = normalizeSelectionPublishInspectorNamesByObjectKey_(source[rawSelectionId]);
        if (Object.keys(assignments).length) out[selectionId] = assignments;
      });
      return out;
    }

function loadSavedSelectionPublishAssignments_() {
      if (!state.currentUser) return {};
      try {
        const raw = window.localStorage.getItem(getSelectionPublishAssignmentsStorageKey_());
        const parsed = JSON.parse(raw || '{}');
        return normalizeSavedSelectionPublishAssignmentsStore_(parsed);
      } catch (e) {
        return {};
      }
    }

function persistSavedSelectionPublishAssignments_() {
      if (!state.currentUser) return;
      try {
        const payload = normalizeSavedSelectionPublishAssignmentsStore_(state.savedSelectionPublishAssignmentsById);
        if (Object.keys(payload).length) {
          window.localStorage.setItem(getSelectionPublishAssignmentsStorageKey_(), JSON.stringify(payload));
        } else {
          window.localStorage.removeItem(getSelectionPublishAssignmentsStorageKey_());
        }
      } catch (e) {}
    }

function getSavedSelectionPublishAssignmentsForSelection_(selectionId) {
      const key = String(selectionId || '').trim();
      if (!key) return {};
      const store = normalizeSavedSelectionPublishAssignmentsStore_(state.savedSelectionPublishAssignmentsById);
      state.savedSelectionPublishAssignmentsById = store;
      return store[key] ? { ...store[key] } : {};
    }

function setSavedSelectionPublishAssignmentsForSelection_(selectionId, assignments) {
      const key = String(selectionId || '').trim();
      if (!key) return {};
      const store = normalizeSavedSelectionPublishAssignmentsStore_(state.savedSelectionPublishAssignmentsById);
      const normalizedAssignments = normalizeSelectionPublishInspectorNamesByObjectKey_(assignments);
      if (Object.keys(normalizedAssignments).length) store[key] = normalizedAssignments;
      else delete store[key];
      state.savedSelectionPublishAssignmentsById = store;
      persistSavedSelectionPublishAssignments_();
      return normalizedAssignments;
    }

function removeSavedSelectionPublishAssignmentsForSelection_(selectionId) {
      const key = String(selectionId || '').trim();
      if (!key) return;
      const store = normalizeSavedSelectionPublishAssignmentsStore_(state.savedSelectionPublishAssignmentsById);
      if (!Object.prototype.hasOwnProperty.call(store, key)) return;
      delete store[key];
      state.savedSelectionPublishAssignmentsById = store;
      persistSavedSelectionPublishAssignments_();
    }

function moveSavedSelectionPublishAssignments_(fromSelectionId, toSelectionId) {
      const sourceId = String(fromSelectionId || '').trim();
      const targetId = String(toSelectionId || '').trim();
      if (!sourceId || !targetId || sourceId === targetId) return;
      const assignments = getSavedSelectionPublishAssignmentsForSelection_(sourceId);
      if (!Object.keys(assignments).length) return;
      setSavedSelectionPublishAssignmentsForSelection_(targetId, assignments);
      removeSavedSelectionPublishAssignmentsForSelection_(sourceId);
    }

function buildRegistrySessionStatePayload_() {
        return {
          registryDataMode: normalizeRegistryDataMode_(state.registryDataMode),
          activeRegistrySelectionId: String(state.activeRegistrySelectionId || ''),
          selectionDraftSourceId: String(state.selectionDraftSourceId || ''),
          objectQuery: String(state.objectQuery || ''),
          bulkUinText: String(state.bulkUinText || ''),
          registryBulkOpen: !!state.registryBulkOpen,
          registryVisibleColumnKeys: normalizeStoredRegistryVisibleColumnKeys_(state.registryVisibleColumnKeys),
          currentView: normalizeWorkspaceView_(state.currentView),
          analyticsSection: normalizeAnalyticsSection_(state.analyticsSection),
          analyticsKsgContractors: normalizeAnalyticsKsgContractorFilters_(state.analyticsKsgContractors),
          analyticsArchiveFilterVersion: ANALYTICS_ARCHIVE_FILTER_STATE_VERSION,
          analyticsArchiveGrbs: normalizeAnalyticsArchiveGrbsFilters_(state.analyticsArchiveGrbs),
          analyticsArchiveDateFrom: normalizeAnalyticsArchiveDateValue_(state.analyticsArchiveDateFrom),
          analyticsArchiveDateTo: normalizeAnalyticsArchiveDateValue_(state.analyticsArchiveDateTo),
          sidebarExpanded: !!state.sidebarExpanded,
          sidebarActivePanel: normalizeSidebarPanel_(state.sidebarActivePanel),
          registrySidebarPanelOpen: state.registrySidebarPanelOpen !== false,
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
        const registryDataMode = normalizeRegistryDataMode_(parsed && parsed.registryDataMode);
        const hasCurrentAnalyticsArchiveFilterVersion = String(parsed && parsed.analyticsArchiveFilterVersion || '').trim() === ANALYTICS_ARCHIVE_FILTER_STATE_VERSION;
          return {
            registryDataMode,
            activeRegistrySelectionId: String(parsed && parsed.activeRegistrySelectionId || ''),
            selectionDraftSourceId: String(parsed && parsed.selectionDraftSourceId || ''),
            objectQuery: String(parsed && parsed.objectQuery || ''),
            bulkUinText: String(parsed && parsed.bulkUinText || ''),
            registryBulkOpen: !!(parsed && parsed.registryBulkOpen),
            registryVisibleColumnKeys: shouldUseStoredRegistryColumns
              ? normalizeStoredRegistryVisibleColumnKeys_(parsed && parsed.registryVisibleColumnKeys, registryDataMode)
              : buildDefaultRegistryVisibleColumnKeys_(registryDataMode),
            currentView: normalizeWorkspaceView_(parsed && parsed.currentView),
            analyticsSection: normalizeAnalyticsSection_(parsed && parsed.analyticsSection),
            analyticsKsgContractors: normalizeAnalyticsKsgContractorFilters_(parsed && parsed.analyticsKsgContractors),
            analyticsArchiveGrbs: normalizeAnalyticsArchiveGrbsFilters_(parsed && parsed.analyticsArchiveGrbs),
            analyticsArchiveDateFrom: hasCurrentAnalyticsArchiveFilterVersion ? normalizeAnalyticsArchiveDateValue_(parsed && parsed.analyticsArchiveDateFrom) : '',
            analyticsArchiveDateTo: hasCurrentAnalyticsArchiveFilterVersion ? normalizeAnalyticsArchiveDateValue_(parsed && parsed.analyticsArchiveDateTo) : '',
            sidebarExpanded: parsed && parsed.sidebarExpanded !== undefined ? !!parsed.sidebarExpanded : true,
            sidebarActivePanel: normalizeSidebarPanel_(parsed && parsed.sidebarActivePanel),
            registrySidebarPanelOpen: parsed && parsed.registrySidebarPanelOpen !== undefined ? !!parsed.registrySidebarPanelOpen : true,
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
            registryDataMode: REGISTRY_DATASET_MODES.registry,
            activeRegistrySelectionId: '',
            selectionDraftSourceId: '',
            objectQuery: '',
            bulkUinText: '',
            registryBulkOpen: false,
            registryVisibleColumnKeys: buildDefaultRegistryVisibleColumnKeys_(REGISTRY_DATASET_MODES.registry),
            currentView: 'registry',
            analyticsSection: 'quarter',
            analyticsKsgContractors: [],
            analyticsArchiveGrbs: [],
            analyticsArchiveDateFrom: '',
            analyticsArchiveDateTo: '',
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
      renderRegistryInteraction_({
        includeSavedSelections: false,
        includeWorkspaceTabs: true,
        includeObjectView: state.currentView === 'object'
      });
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
      if (!isCurrentRegistryDatasetEditable_()) {
        showCopyToast_('Архив доступен только для просмотра', true);
        return Promise.resolve();
      }
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
          renderRegistryInteraction_({
            includeWorkspaceTabs: true,
            includeObjectView: state.currentView === 'object'
          });
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

function getRegistrySelectionEditMode_() {
      if (state.selectionComposerOpen) return 'composer';
      if (state.selectionPublishDraftOpen) return 'publish';
      return '';
    }

function isRegistrySelectionEditing_() {
      return !!getRegistrySelectionEditMode_();
    }

function isRegistrySelectionPublishDraftOpen_() {
      return getRegistrySelectionEditMode_() === 'publish';
    }

function getRegistryToolbarMapDraftId_() {
      return '__registry_toolbar__';
    }

function isRegistryToolbarMapDraftId_(selectionId) {
      return String(selectionId || '').trim() === getRegistryToolbarMapDraftId_();
    }

function getRegistrySelectionEditTargetId_() {
      if (state.selectionComposerOpen) return String(state.selectionComposerSelectionId || '').trim();
      if (state.selectionPublishDraftOpen) return String(state.selectionPublishDraftSelectionId || '').trim();
      return '';
    }

function getRegistrySelectionDraftToggleTitle_(selected) {
      const isSelected = !!selected;
      if (isRegistrySelectionPublishDraftOpen_()) {
        return isSelected
          ? 'Убрать объект из выборки для карты'
          : 'Добавить объект в выборку для карты';
      }
      return isSelected
        ? 'Убрать объект из редактируемой выборки'
        : 'Добавить объект в редактируемую выборку';
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

function normalizeSelectionPublishInspectorNames_(rawValue) {
      return Array.from(new Set(
        (Array.isArray(rawValue) ? rawValue : [])
          .map(value => String(value || '').trim())
          .filter(Boolean)
      )).sort((left, right) => left.localeCompare(right, 'ru'));
    }

function resetSelectionPublishDraftOptions_() {
      state.selectionPublishInspectorNames = [];
      state.selectionPublishInspectorPickerOpen = false;
      state.selectionPublishInspectorNamesByObjectKey = {};
      state.selectionPublishRowInspectorPickerKey = '';
      state.selectionPublishExtraVisits = '0';
    }

function resetMapPublishInspectorsState_() {
      state.mapPublishInspectors = [];
      state.mapPublishInspectorsLoaded = false;
      state.mapPublishInspectorsLoading = false;
      state.mapPublishInspectorsError = '';
      state.mapPublishInspectorsDivisionCode = '';
    }

function getSelectionPublishInspectorNames_() {
      return normalizeSelectionPublishInspectorNames_(state.selectionPublishInspectorNames);
    }

function setSelectionPublishInspectorNames_(items) {
      state.selectionPublishInspectorNames = normalizeSelectionPublishInspectorNames_(items);
    }

function normalizeSelectionPublishInspectorNamesByObjectKey_(rawValue) {
      const source = rawValue && typeof rawValue === 'object' ? rawValue : {};
      const next = {};
      Object.keys(source).forEach(rawKey => {
        const key = normalizeText_(rawKey);
        const names = normalizeSelectionPublishInspectorNames_(source[rawKey]);
        if (!key || !names.length) return;
        next[key] = names;
      });
      return next;
    }

function getSelectionPublishInspectorObjectKey_(objectId) {
      return normalizeText_(objectId);
    }

function getSelectionPublishAssignmentOwnerSelectionId_() {
      const draftId = isRegistrySelectionPublishDraftOpen_()
        ? String(state.selectionPublishDraftSelectionId || '').trim()
        : '';
      if (draftId && !isRegistryToolbarMapDraftId_(draftId)) return draftId;
      const composerId = state.selectionComposerOpen
        ? String(state.selectionComposerSelectionId || '').trim()
        : '';
      if (composerId) return composerId;
      const activeId = String(state.activeRegistrySelectionId || '').trim();
      return activeId && !isRegistryToolbarMapDraftId_(activeId) ? activeId : '';
    }

function getEffectiveSelectionPublishInspectorNamesByObjectKey_(selectionId) {
      const ownerSelectionId = String(selectionId || getSelectionPublishAssignmentOwnerSelectionId_() || '').trim();
      const persisted = ownerSelectionId
        ? getSavedSelectionPublishAssignmentsForSelection_(ownerSelectionId)
        : {};
      const current = normalizeSelectionPublishInspectorNamesByObjectKey_(state.selectionPublishInspectorNamesByObjectKey);
      if (!Object.keys(current).length) return persisted;
      return {
        ...persisted,
        ...current
      };
    }

function getSelectionPublishInspectorNamesFromMapForObject_(objectId, options) {
      const targetObjectId = String(objectId || '').trim();
      if (!targetObjectId || typeof getRegistryMapOverlayEntriesForObjectKey_ !== 'function') return [];
      const settings = options && typeof options === 'object' ? options : {};
      return Array.from(new Set(
        getRegistryMapOverlayEntriesForObjectKey_(targetObjectId, settings)
          .map(entry => String(entry && (entry.inspector || entry.inspectorName) || '').trim())
          .filter(Boolean)
      ));
    }

function getSelectionPublishAssignmentsSyncRowIndexes_(selectionId, options) {
      const settings = options && typeof options === 'object' ? options : {};
      const explicitRows = Array.isArray(settings.rowIndexes) ? settings.rowIndexes : null;
      const activeSelectionId = String(state.activeRegistrySelectionId || '').trim();
      const ownerSelectionId = String(selectionId || '').trim();
      const sourceRows = explicitRows || (
        ownerSelectionId && ownerSelectionId === activeSelectionId && Array.isArray(state.activeRegistrySelectionBaseRowIndexes)
          ? state.activeRegistrySelectionBaseRowIndexes
          : state.filteredRowIndexes
      );
      return (Array.isArray(sourceRows) ? sourceRows : [])
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value >= 0)
        .map(value => Math.floor(value));
    }

function syncSavedSelectionPublishAssignmentsFromMapOverlay_(selectionId, options) {
      const ownerSelectionId = String(selectionId || getSelectionPublishAssignmentOwnerSelectionId_() || '').trim();
      if (!ownerSelectionId || isRegistryToolbarMapDraftId_(ownerSelectionId)) return false;
      if (!canCurrentUserManageMproMap_() || !isCurrentRegistryDatasetEditable_()) return false;
      const settings = options && typeof options === 'object' ? options : {};
      const rowIndexes = getSelectionPublishAssignmentsSyncRowIndexes_(ownerSelectionId, settings);
      if (!rowIndexes.length) return false;
      const nextMap = getEffectiveSelectionPublishInspectorNamesByObjectKey_(ownerSelectionId);
      const mapOptions = Object.prototype.hasOwnProperty.call(settings, 'divisionCode')
        ? { divisionCode: settings.divisionCode }
        : {};
      let changed = false;
      rowIndexes.forEach(rowIndex => {
        const objectId = String(getRegistryRowObjectId_(rowIndex) || '').trim();
        const objectKey = getSelectionPublishInspectorObjectKey_(objectId);
        if (!objectKey) return;
        const currentNames = Array.isArray(nextMap[objectKey]) ? nextMap[objectKey].slice() : [];
        if (currentNames.length && !settings.overwriteExisting) return;
        const mapNames = getSelectionPublishInspectorNamesFromMapForObject_(objectId, mapOptions);
        if (!mapNames.length) return;
        if (currentNames.join('\n') === mapNames.join('\n')) return;
        nextMap[objectKey] = mapNames;
        changed = true;
      });
      if (!changed) return false;
      state.selectionPublishInspectorNamesByObjectKey = nextMap;
      setSavedSelectionPublishAssignmentsForSelection_(ownerSelectionId, nextMap);
      return true;
    }

function getSelectionPublishInspectorNamesByObjectKey_() {
      return normalizeSelectionPublishInspectorNamesByObjectKey_(state.selectionPublishInspectorNamesByObjectKey);
    }

function getSelectionPublishInspectorNamesForObject_(objectId) {
      const key = getSelectionPublishInspectorObjectKey_(objectId);
      if (!key) return [];
      const map = getEffectiveSelectionPublishInspectorNamesByObjectKey_();
      if (Array.isArray(map[key]) && map[key].length) return map[key].slice();
      return getSelectionPublishInspectorNamesFromMapForObject_(objectId);
    }

function setSelectionPublishInspectorNamesForObject_(objectId, items, options) {
      const key = getSelectionPublishInspectorObjectKey_(objectId);
      if (!key) return;
      const settings = options && typeof options === 'object' ? options : {};
      const ownerSelectionId = getSelectionPublishAssignmentOwnerSelectionId_();
      const nextMap = ownerSelectionId
        ? getEffectiveSelectionPublishInspectorNamesByObjectKey_(ownerSelectionId)
        : getSelectionPublishInspectorNamesByObjectKey_();
      const nextValues = normalizeSelectionPublishInspectorNames_(items);
      if (nextValues.length) nextMap[key] = nextValues;
      else delete nextMap[key];
      state.selectionPublishInspectorNamesByObjectKey = nextMap;
      if (ownerSelectionId) {
        setSavedSelectionPublishAssignmentsForSelection_(ownerSelectionId, nextMap);
      }
      if (settings.closePicker) {
        state.selectionPublishRowInspectorPickerKey = '';
      }
    }

function toggleSelectionPublishInspectorNameForObject_(objectId, name) {
      const inspectorName = String(name || '').trim();
      if (!inspectorName) return;
      const current = getSelectionPublishInspectorNamesForObject_(objectId);
      const nextValues = current.includes(inspectorName)
        ? current.filter(value => value !== inspectorName)
        : current.concat(inspectorName);
      setSelectionPublishInspectorNamesForObject_(objectId, nextValues);
      renderRegistryView_();
    }

function isSelectionPublishRowInspectorPickerOpen_(objectId) {
      const key = getSelectionPublishInspectorObjectKey_(objectId);
      return !!key && String(state.selectionPublishRowInspectorPickerKey || '').trim() === key;
    }

function toggleSelectionPublishRowInspectorPicker_(objectId) {
      const key = getSelectionPublishInspectorObjectKey_(objectId);
      if (!key) return;
      state.selectionPublishRowInspectorPickerKey = isSelectionPublishRowInspectorPickerOpen_(objectId) ? '' : key;
      renderRegistryView_();
    }

function closeSelectionPublishRowInspectorPicker_() {
      if (!String(state.selectionPublishRowInspectorPickerKey || '').trim()) return;
      state.selectionPublishRowInspectorPickerKey = '';
      renderRegistryView_();
    }

function getSelectionPublishInspectorAssignmentsSignature_() {
      const ownerSelectionId = getSelectionPublishAssignmentOwnerSelectionId_();
      const map = getEffectiveSelectionPublishInspectorNamesByObjectKey_(ownerSelectionId);
      const body = Object.keys(map)
        .sort()
        .map(key => `${key}:${map[key].join('|')}`)
        .join(';');
      return `${String(ownerSelectionId || '').trim()}::${body}::${String(state.selectionPublishRowInspectorPickerKey || '').trim()}`;
    }

function isSelectionPublishInspectorPickerOpen_() {
      return !!state.selectionPublishInspectorPickerOpen;
    }

function toggleSelectionPublishInspectorPicker_() {
      state.selectionPublishInspectorPickerOpen = !state.selectionPublishInspectorPickerOpen;
      renderRegistrySelectionEditBar_();
    }

function closeSelectionPublishInspectorPicker_() {
      if (!state.selectionPublishInspectorPickerOpen) return;
      state.selectionPublishInspectorPickerOpen = false;
      renderRegistrySelectionEditBar_();
    }

function toggleSelectionPublishInspectorName_(name, options) {
      const settings = options && typeof options === 'object' ? options : null;
      const inspectorName = String(name || '').trim();
      if (!inspectorName) return;
      const current = getSelectionPublishInspectorNames_();
      const nextValues = settings && settings.single
        ? (
          current.length === 1 && current[0] === inspectorName
            ? []
            : [inspectorName]
        )
        : (
          current.includes(inspectorName)
            ? current.filter(value => value !== inspectorName)
            : current.concat(inspectorName)
        );
      setSelectionPublishInspectorNames_(nextValues);
      if (settings && settings.closePicker) {
        state.selectionPublishInspectorPickerOpen = false;
      }
      renderRegistrySelectionEditBar_();
    }

function getSelectionPublishAssignedVisitCount_() {
      return getSelectionPublishInspectorNames_().length;
    }

function getSelectionPublishExtraVisitsCount_() {
      const rawValue = String(state.selectionPublishExtraVisits == null ? '' : state.selectionPublishExtraVisits).trim();
      if (!rawValue) return 0;
      const numeric = Number(rawValue.replace(',', '.'));
      if (!Number.isFinite(numeric) || numeric <= 0) return 0;
      return Math.max(0, Math.floor(numeric));
    }

function updateSelectionPublishExtraVisits_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) {
        state.selectionPublishExtraVisits = '';
        renderRegistrySelectionEditBar_();
        return;
      }
      const normalized = text.replace(/[^\d]/g, '');
      state.selectionPublishExtraVisits = normalized ? String(Math.max(0, Math.floor(Number(normalized) || 0))) : '';
      renderRegistrySelectionEditBar_();
    }

function getCurrentDivisionMapPublishInspectors_() {
      return Array.isArray(state.mapPublishInspectors) ? state.mapPublishInspectors.slice() : [];
    }

function normalizeMapPublishInspectorDirectoryRows_(rows, divisionCode) {
      const targetDivisionCode = normalizeMproDivisionCode_(divisionCode);
      const allRows = (Array.isArray(rows) ? rows : [])
        .map(item => ({
          name: String(item && item.name || '').trim(),
          role: String(item && item.role || '').trim(),
          divisionCode: normalizeMproDivisionCode_(item && (item.divisionCode || item.division) || '')
        }))
        .filter(item => item.name && !/admin|админ/i.test(item.role))
        .sort((left, right) => String(left && left.name || '').localeCompare(String(right && right.name || ''), 'ru'));
      if (!targetDivisionCode) return allRows;
      // The backend already scopes visible inspectors for the current mpro session.
      // If the local session division is stale or missing, do not blank the entire picker.
      const matchedRows = allRows.filter(item => !item.divisionCode || item.divisionCode === targetDivisionCode);
      return matchedRows.length ? matchedRows : allRows;
    }

function pruneSelectionPublishInspectorNames_() {
      const allowedNames = new Set(getCurrentDivisionMapPublishInspectors_().map(item => String(item && item.name || '').trim()).filter(Boolean));
      const ownerSelectionId = getSelectionPublishAssignmentOwnerSelectionId_();
      if (!allowedNames.size) {
        setSelectionPublishInspectorNames_([]);
        state.selectionPublishInspectorNamesByObjectKey = {};
        state.selectionPublishRowInspectorPickerKey = '';
        if (ownerSelectionId) removeSavedSelectionPublishAssignmentsForSelection_(ownerSelectionId);
        return;
      }
      setSelectionPublishInspectorNames_(
        getSelectionPublishInspectorNames_().filter(name => allowedNames.has(name))
      );
      const nextMap = {};
      const sourceMap = ownerSelectionId
        ? getEffectiveSelectionPublishInspectorNamesByObjectKey_(ownerSelectionId)
        : getSelectionPublishInspectorNamesByObjectKey_();
      Object.keys(sourceMap).forEach(key => {
        const nextNames = sourceMap[key].filter(name => allowedNames.has(name));
        if (nextNames.length) nextMap[key] = nextNames;
      });
      state.selectionPublishInspectorNamesByObjectKey = nextMap;
      if (ownerSelectionId) setSavedSelectionPublishAssignmentsForSelection_(ownerSelectionId, nextMap);
      if (
        String(state.selectionPublishRowInspectorPickerKey || '').trim() &&
        !Object.prototype.hasOwnProperty.call(nextMap, String(state.selectionPublishRowInspectorPickerKey || '').trim())
      ) {
        state.selectionPublishRowInspectorPickerKey = '';
      }
    }

function resetRegistrySelectionPublishDraftState_(options) {
      const settings = options || {};
      state.selectionPublishDraftOpen = false;
      state.selectionPublishDraftSelectionId = '';
      resetSelectionPublishDraftOptions_();
      if (!settings.preserveDraft) clearRegistrySelectionEditDraft_();
    }

function clearActiveRegistrySelectionBaseState_() {
      state.activeRegistrySelectionBaseRowIndexes = null;
    }

function setActiveRegistrySelectionBaseRowIndexes_(rowIndexes) {
      if (!Array.isArray(rowIndexes)) {
        state.activeRegistrySelectionBaseRowIndexes = [];
        return;
      }
      state.activeRegistrySelectionBaseRowIndexes = rowIndexes
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value >= 0)
        .map(value => Math.floor(value));
    }

function shouldUseActiveRegistrySelectionBase_() {
      const contextId = String(state.activeRegistrySelectionId || state.selectionDraftSourceId || '').trim();
      if (!contextId) return false;
      if (isRegistryMapRemovalMode_()) return false;
      if (state.selectionComposerOpen && getRegistrySelectionComposerViewMode_() === 'registry') return false;
      return true;
    }

function closeRegistrySelectionEditing_(options) {
      if (state.selectionComposerOpen) {
        closeRegistrySelectionComposer_();
        return;
      }
      if (state.selectionPublishDraftOpen) {
        closeRegistrySelectionPublishDraft_(options);
      }
    }

function getRegistrySelectionEditVisibleUins_() {
      const seen = new Set();
      const items = [];
      getRegistryVisibleRowIndexes_().forEach(rowIndex => {
        const text = getRegistryRowUin_(rowIndex);
        const norm = normalizeText_(text);
        if (!text || !norm || seen.has(norm)) return;
        seen.add(norm);
        items.push(text);
      });
      return items;
    }

function getRegistrySelectionEditVisibleState_() {
      const visibleUins = getRegistrySelectionEditVisibleUins_();
      const draftSet = getRegistrySelectionEditDraftSet_();
      const selectedVisibleCount = visibleUins.reduce((count, value) => (
        draftSet.has(normalizeText_(value)) ? count + 1 : count
      ), 0);
      const visibleCount = visibleUins.length;
      return {
        visibleUins,
        visibleCount,
        selectedVisibleCount,
        allVisibleSelected: visibleCount > 0 && selectedVisibleCount === visibleCount
      };
    }

function toggleRegistrySelectionDraftVisibleRows_() {
      if (!isRegistrySelectionEditing_()) return;
      const visibleState = getRegistrySelectionEditVisibleState_();
      if (!visibleState.visibleCount) {
        showCopyToast_('В текущем реестре нет объектов для выбора', true);
        return;
      }
      state.selectionEditDraftAutoSync = false;
      const currentDraft = Array.isArray(state.selectionEditDraftUins) ? state.selectionEditDraftUins.slice() : [];
      const visibleNorms = new Set(visibleState.visibleUins.map(normalizeText_));
      const next = visibleState.allVisibleSelected
        ? currentDraft.filter(value => !visibleNorms.has(normalizeText_(value)))
        : mergeRegistrySelectionUins_(currentDraft, visibleState.visibleUins);
      setRegistrySelectionEditDraftUins_(next);
      renderAll_();
    }

function collectRegistryRowUinsFromIndexes_(rowIndexes) {
      const seen = new Set();
      const items = [];
      (Array.isArray(rowIndexes) ? rowIndexes : []).forEach(rowIndex => {
        const text = String(getRegistryRowUin_(rowIndex) || '').trim();
        const norm = normalizeText_(text);
        if (!text || !norm || seen.has(norm)) return;
        seen.add(norm);
        items.push(text);
      });
      return items;
    }

function getCurrentRegistryHeaderCopyUins_() {
      if (isRegistrySelectionEditing_()) {
        return mergeRegistrySelectionUins_(state.selectionEditDraftUins, []);
      }
      if (isAdminRegistryEditMode_()) {
        return collectRegistryRowUinsFromIndexes_(getAdminRegistrySelectedRowIndexes_());
      }
      if (isRegistryMapRemovalMode_()) {
        return mergeRegistrySelectionUins_(
          getRegistryMapRemovalSelectedEntries_().map(entry => String(entry && entry.uin || '').trim()),
          []
        );
      }
      if (getSharedSelectionWorkBatchMode_()) {
        return mergeRegistrySelectionUins_(
          getSharedSelectionWorkBatchSelectedEntries_().map(entry => String(entry && entry.uin || '').trim()),
          []
        );
      }
      const activeSelection = getActiveRegistrySelection_();
      if (activeSelection) return getEditableRegistrySelectionUins_(activeSelection);
      return [];
    }

function copyCurrentRegistryHeaderUins_() {
      const items = getCurrentRegistryHeaderCopyUins_();
      if (!items.length) {
        showCopyToast_('Нет выбранных УИНов', true);
        return;
      }
      copyTextToClipboard_(buildRegistrySelectionBulkUinText_(items))
        .then(() => showCopyToast_(`Скопировано УИНов: ${items.length}`, false))
        .catch(() => showCopyToast_('Не удалось скопировать УИНы', true));
    }

function getRegistryFilterIconSvgHtml_(className) {
      const iconClass = String(className || 'registry-filter-trigger-icon-svg').trim() || 'registry-filter-trigger-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">` +
          `<path d="M4.5 6.25 8 9.75l3.5-3.5"></path>` +
        `</svg>`
      );
    }

function restoreRegistrySelectionView_(selectionId) {
      const targetId = String(selectionId || '').trim();
      if (!targetId) return;
      applySavedRegistrySelection_(targetId);
    }

function closeSelectionPublishMenu_() {
      if (!state.selectionPublishMenuId) return;
      state.selectionPublishMenuId = '';
      renderSavedSelectionsPanel_();
      renderRegistrySelectionEditBar_();
      if (typeof renderRegistryMapToolbarActions_ === 'function') renderRegistryMapToolbarActions_();
    }

function isSelectionPublishMenuOpen_(selectionId) {
      return String(state.selectionPublishMenuId || '').trim() === String(selectionId || '').trim();
    }

function toggleSelectionPublishMenu_(selectionId) {
      const nextId = String(selectionId || '').trim();
      if (!nextId) return;
      const open = isSelectionPublishMenuOpen_(nextId);
      if (open) {
        state.selectionPublishMenuId = '';
      } else {
        resetSelectionPublishDraftOptions_();
        state.selectionPublishMenuId = nextId;
        ensureMapPublishInspectorsLoaded_();
      }
      renderSavedSelectionsPanel_();
      renderRegistrySelectionEditBar_();
      if (typeof renderRegistryMapToolbarActions_ === 'function') renderRegistryMapToolbarActions_();
    }

function renderSelectionPublishMenuHtml_(selectionId, options) {
      const itemId = String(selectionId || '').trim();
      if (!itemId) return '';
      const settings = options || {};
      const compact = !!settings.compact;
      const busy = !!settings.busy;
      const loading = !!settings.loading;
      const allowManualPick = !!settings.allowManualPick;
      const allowMapRemoval = !!settings.allowMapRemoval;
      const mapRemovalMode = !!settings.mapRemovalMode;
      const mapRemovalPending = !!settings.mapRemovalPending;
      const mapRemovalVisibleCount = Math.max(0, Number(settings.mapRemovalVisibleCount) || 0);
      const mapRemovalSelectedCount = Math.max(0, Number(settings.mapRemovalSelectedCount) || 0);
      const mapRemovalAllVisibleSelected = !!settings.mapRemovalAllVisibleSelected;
      const open = isSelectionPublishMenuOpen_(itemId);
      const triggerBaseClassName = String(settings.triggerBaseClassName || '').trim();
      const triggerButtonClassName = String(settings.triggerButtonClassName || '').trim();
      const triggerIconClassName = String(settings.triggerIconClassName || '').trim() || 'saved-selection-action-icon-svg';
      const triggerLabel = String(settings.triggerLabel || 'На карту').trim() || 'На карту';
      const triggerTitle = String(
        settings.triggerTitle || (mapRemovalMode ? 'Управление объектами на карте' : 'Отправить на карту')
      ).trim() || (mapRemovalMode ? 'Управление объектами на карте' : 'Отправить на карту');
      const wrapClassName = compact ? 'selection-publish-menu-wrap compact' : 'selection-publish-menu-wrap';
      const triggerClassName = [
        triggerBaseClassName || (compact ? 'saved-selection-action-button' : 'ghost'),
        'selection-publish-trigger',
        open ? 'is-open' : '',
        loading ? 'is-loading' : '',
        triggerButtonClassName
      ].filter(Boolean).join(' ');
      const triggerContent = compact
        ? getMapPublishIconSvgHtml_(triggerIconClassName)
        : (
          `<span class="selection-publish-trigger-label">${escapeHtml_(triggerLabel)}</span>` +
          `<span class="selection-publish-trigger-caret" aria-hidden="true"></span>`
        );
      const menuHtml = mapRemovalMode
        ? (
          `<button class="selection-publish-menu-option" type="button" data-registry-map-removal-toggle-all="1"${mapRemovalVisibleCount && !mapRemovalPending ? '' : ' disabled'}>${escapeHtml_(mapRemovalAllVisibleSelected ? 'Снять выбор' : 'Выбрать все')}</button>` +
          `<button class="selection-publish-menu-option" type="button" data-registry-map-removal-confirm="1"${mapRemovalSelectedCount && !mapRemovalPending ? '' : ' disabled'}>${escapeHtml_(mapRemovalPending ? 'Снимаю...' : (mapRemovalSelectedCount ? `Снять выбранные (${mapRemovalSelectedCount})` : 'Снять выбранные'))}</button>` +
          `<button class="selection-publish-menu-option" type="button" data-registry-map-removal-exit="1"${mapRemovalPending ? ' disabled' : ''}>Выйти из режима</button>`
        )
        : (
          (
            allowManualPick
              ? `<button class="selection-publish-menu-option" type="button" data-open-selection-publish-draft="${escapeHtml_(itemId)}">Выбрать объекты</button>`
              : ''
          ) +
          (
            allowMapRemoval
              ? `<button class="selection-publish-menu-option" type="button" data-registry-map-removal-start="1"${mapRemovalVisibleCount ? '' : ' disabled'}>Снять с карты</button>`
              : ''
          )
        );
      return (
        `<div class="${wrapClassName}">` +
          `<button class="${escapeHtml_(triggerClassName)}" type="button" data-toggle-selection-publish-menu="${escapeHtml_(itemId)}"${busy ? ' disabled' : ''} title="${escapeHtml_(triggerTitle)}" aria-label="${escapeHtml_(triggerTitle)}" aria-expanded="${open ? 'true' : 'false'}">` +
            triggerContent +
          `</button>` +
          `<div class="selection-publish-menu${open ? '' : ' hidden'}" data-selection-publish-menu="${escapeHtml_(itemId)}">` +
            menuHtml +
          `</div>` +
        `</div>`
      );
    }

function openRegistryToolbarMapPublishDraft_() {
      if (!canCurrentUserManageMproMap_() || !isCurrentRegistryDatasetEditable_()) return;
      if (isRegistryMapRemovalMode_()) exitRegistryMapRemovalMode_({ silent: true });
      if (state.adminRegistryEditMode) disableAdminRegistryEditMode_();
      closeSelectionPublishMenu_();
      resetRegistrySelectionComposerTransientState_();
      state.selectionComposerOpen = false;
      state.selectionComposerSelectionId = '';
      state.selectionComposerDraftName = '';
      state.selectionPublishDraftOpen = true;
      state.selectionPublishDraftSelectionId = getRegistryToolbarMapDraftId_();
      resetSelectionPublishDraftOptions_();
      state.selectionEditDraftAutoSync = false;
      setRegistrySelectionEditDraftUins_(collectCurrentFilteredSelectionUins_());
      state.currentView = 'registry';
      renderAll_();
      ensureMapPublishInspectorsLoaded_();
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
      if (state.selectionComposerOpen) state.selectionComposerViewMode = 'registry';
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
      if (state.selectionComposerOpen) state.selectionComposerViewMode = 'draft';
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

function getRegistrySelectionComposerViewMode_() {
      return String(state.selectionComposerViewMode || '').trim() === 'registry' ? 'registry' : 'draft';
    }

function toggleRegistrySelectionComposerViewMode_() {
      if (!state.selectionComposerOpen || !String(state.selectionComposerSelectionId || '').trim()) return;
      switchRegistrySelectionComposerViewMode_(getRegistrySelectionComposerViewMode_() === 'registry' ? 'draft' : 'registry');
    }

function switchRegistrySelectionComposerViewMode_(mode) {
      const nextMode = String(mode || '').trim() === 'registry' ? 'registry' : 'draft';
      if (nextMode === 'registry') {
        clearRegistryFiltersForSelectionEdit_();
        return;
      }
      showOnlyRegistrySelectionDraft_();
    }

function openRegistrySelectionPublishDraft_(selectionId) {
      if (isRegistryToolbarMapDraftId_(selectionId)) {
        openRegistryToolbarMapPublishDraft_();
        return;
      }
      const item = findSavedRegistrySelectionById_(selectionId);
      if (!item) return;
      if (!canPublishSelectionToMap_(item)) {
        showCopyToast_('Сначала откройте сохраненную выборку без черновых изменений', true);
        return;
      }
      if (isRegistryMapRemovalMode_()) exitRegistryMapRemovalMode_({ silent: true });
      if (state.adminRegistryEditMode) disableAdminRegistryEditMode_();
      closeSelectionPublishMenu_();
      resetRegistrySelectionComposerTransientState_();
      state.selectionComposerOpen = false;
      state.selectionComposerSelectionId = '';
      state.selectionComposerDraftName = '';
      setRegistrySelectionComposerScope_('personal');
      state.selectionPublishDraftOpen = true;
      state.selectionPublishDraftSelectionId = String(item.id || '').trim();
      resetSelectionPublishDraftOptions_();
      state.selectionEditDraftAutoSync = false;
      setRegistrySelectionEditDraftUins_([]);
      state.savedSelectionPanelOpen = true;
      state.sidebarExpanded = true;
      state.sidebarActivePanel = 'projects';
      state.currentView = 'registry';
      renderAll_();
      ensureMapPublishInspectorsLoaded_();
    }

function closeRegistrySelectionPublishDraft_(options) {
      closeSelectionPublishMenu_();
      resetRegistrySelectionPublishDraftState_(options);
      renderAll_();
    }

    function openRegistrySelectionComposer_(selectionId) {
      if (isRegistryMapRemovalMode_()) exitRegistryMapRemovalMode_({ silent: true });
      if (state.adminRegistryEditMode) disableAdminRegistryEditMode_();
      const editingItem = selectionId ? findSavedRegistrySelectionById_(selectionId) : null;
      resetRegistrySelectionPublishDraftState_();
      resetRegistrySelectionComposerTransientState_();
      state.selectionComposerOpen = true;
      state.selectionComposerSelectionId = editingItem && canEditSavedSelection_(editingItem)
        ? String(editingItem.id || '')
        : '';
      if (state.selectionComposerSelectionId && String(state.selectionDraftSourceId || '') !== state.selectionComposerSelectionId) {
        applySavedRegistrySelection_(state.selectionComposerSelectionId);
      }
      if (editingItem && state.selectionComposerSelectionId) {
        state.selectionComposerViewMode = 'draft';
        state.selectionEditDraftAutoSync = false;
        setRegistrySelectionEditDraftUins_(getEditableRegistrySelectionUins_(editingItem));
      } else {
        state.selectionComposerViewMode = 'registry';
        state.selectionEditDraftAutoSync = true;
        setRegistrySelectionEditDraftUins_(collectCurrentFilteredSelectionUins_());
      }
      state.savedSelectionPanelOpen = true;
      state.sidebarExpanded = true;
      state.sidebarActivePanel = 'projects';
      state.currentView = 'registry';
      state.selectionComposerDraftName = editingItem && state.selectionComposerSelectionId
        ? String(editingItem.name || '')
        : buildRegistrySelectionLabel_();
      setRegistrySelectionComposerScope_(
        state.selectionComposerSelectionId && editingItem
          ? String(editingItem.scope || 'personal')
          : 'personal'
      );
      syncRegistrySelectionComposerUi_();
      if (canCurrentUserManageMproMap_() && isCurrentRegistryDatasetEditable_()) {
        ensureMapPublishInspectorsLoaded_();
      }
      window.requestAnimationFrame(() => {
        const input = el('selectionNameInput');
        if (!input) return;
        input.focus();
        input.select();
      });
      renderAll_();
    }

    function closeRegistrySelectionComposer_() {
      closeSelectionPublishMenu_();
      resetRegistrySelectionComposerTransientState_();
      state.selectionComposerOpen = false;
      state.selectionComposerSelectionId = '';
      state.selectionComposerDraftName = '';
      state.selectionPublishDraftOpen = false;
      state.selectionPublishDraftSelectionId = '';
      resetSelectionPublishDraftOptions_();
      clearRegistrySelectionEditDraft_();
      setRegistrySelectionComposerScope_('personal');
      syncRegistrySelectionComposerUi_();
      renderAll_();
    }

    function resetRegistrySelectionComposerTransientState_() {
      state.selectionComposerBusyState = '';
      state.selectionComposerViewMode = 'draft';
      clearPendingSharedRegistrySelectionSave_();
    }

    function isCurrentUserAdmin_() {
      const siteProfile = typeof getCurrentUserAppProfile_ === 'function'
        ? getCurrentUserAppProfile_('site')
        : null;
      const role = normalizeText_(
        (siteProfile && siteProfile.role) ||
        (state.currentUser && state.currentUser.role) ||
        ''
      );
      return /admin|админ/.test(role);
    }

    function canCurrentUserUseMpro_() {
      return typeof hasCurrentUserAppAccess_ === 'function' && hasCurrentUserAppAccess_('mpro');
    }

    function isCurrentUserMproAdmin_() {
      const mproProfile = typeof getCurrentUserAppProfile_ === 'function'
        ? getCurrentUserAppProfile_('mpro')
        : null;
      const role = normalizeText_(mproProfile && mproProfile.role || '');
      return /admin|админ/.test(role);
    }

    function normalizeMproDivisionCode_(value) {
      const normalized = normalizeText_(value).toLowerCase();
      const compact = normalized.replace(/[\s_-]+/g, '');
      if (!normalized) return '';
      if (normalized === 'laboratory' || compact === 'laboratory' || normalized === 'lab' || compact === 'lab' || normalized === 'лаборатория' || compact === 'лаборатория') return 'laboratory';
      if (
        normalized === 'map' ||
        compact === 'map' ||
        normalized === 'гс' ||
        compact === 'гс' ||
        normalized === 'гражданское строительство' ||
        compact === 'гражданскоестроительство' ||
        normalized === 'строймониторинг' ||
        compact === 'строймониторинг' ||
        normalized === 'строительный мониторинг' ||
        compact === 'строительныймониторинг' ||
        normalized === 'construction monitoring' ||
        compact === 'constructionmonitoring'
      ) return 'map';
      if (normalized === 'dms' || compact === 'dms' || normalized === 'дмс' || compact === 'дмс') return 'dms';
      if (
        normalized === 'constructioncontrol' ||
        compact === 'constructioncontrol' ||
        normalized === 'construction-control' ||
        normalized === 'construction control' ||
        normalized === 'ск' ||
        compact === 'ск' ||
        normalized === 'строительный контроль' ||
        compact === 'строительныйконтроль' ||
        normalized === 'стройконтроль' ||
        compact === 'стройконтроль'
      ) return 'constructioncontrol';
      if (
        normalized === 'metro' ||
        compact === 'metro' ||
        normalized === 'метро' ||
        compact === 'метро' ||
        normalized === 'метрополитен' ||
        compact === 'метрополитен' ||
        normalized === 'mip' ||
        compact === 'mip' ||
        normalized === 'мип' ||
        compact === 'мип'
      ) return 'metro';
      return '';
    }

    function getCurrentUserMproDivisionValue_() {
      const mproProfile = typeof getCurrentUserAppProfile_ === 'function'
        ? getCurrentUserAppProfile_('mpro')
        : null;
      return normalizeText_(
        (mproProfile && mproProfile.division) ||
        (state.currentUser && state.currentUser.division) ||
        ''
      );
    }

    function getCurrentUserMproDivisionCode_() {
      return normalizeMproDivisionCode_(getCurrentUserMproDivisionValue_());
    }

    function getMproDivisionLabel_(value) {
      const divisionCode = normalizeMproDivisionCode_(value);
      if (divisionCode === 'laboratory') return 'Лаборатория';
      if (divisionCode === 'map') return 'Гражданское строительство';
      if (divisionCode === 'dms') return 'ДМС';
      if (divisionCode === 'constructioncontrol') return 'Строительный контроль';
      if (divisionCode === 'metro') return 'Метро';
      return String(value || '').trim();
    }

    function canCurrentUserManageMproMap_() {
      return canCurrentUserUseMpro_() && isCurrentUserMproAdmin_();
    }

    function canCurrentUserManageLabStudies_() {
      return canCurrentUserUseMpro_() && getCurrentUserMproDivisionCode_() === 'laboratory';
    }

    function syncRegistryMapAccessState_() {
      if (canCurrentUserManageMproMap_() && isCurrentRegistryDatasetEditable_()) return;
      closeSelectionPublishMenu_();
      resetSelectionPublishDraftOptions_();
      resetMapPublishInspectorsState_();
      if (state.selectionPublishDraftOpen) resetRegistrySelectionPublishDraftState_();
      if (isRegistryMapRemovalMode_() || getRegistryMapRemovalSelectedCount_()) {
        exitRegistryMapRemovalMode_({ silent: true });
      }
    }

    function ensureMapPublishInspectorsLoaded_(options) {
      const settings = options || {};
      const divisionCode = getCurrentUserMproDivisionCode_();
      if (!canCurrentUserManageMproMap_() || !state.currentUser || !state.sessionToken) {
        resetMapPublishInspectorsState_();
        return Promise.resolve([]);
      }
      if (!settings.force && state.mapPublishInspectorsLoaded && state.mapPublishInspectorsDivisionCode === divisionCode) {
        return Promise.resolve(getCurrentDivisionMapPublishInspectors_());
      }
      if (state.mapPublishInspectorsLoading && state.mapPublishInspectorsDivisionCode === divisionCode) {
        return Promise.resolve(getCurrentDivisionMapPublishInspectors_());
      }
      state.mapPublishInspectorsLoading = true;
      state.mapPublishInspectorsLoaded = false;
      state.mapPublishInspectorsError = '';
      state.mapPublishInspectorsDivisionCode = divisionCode;
      renderRegistrySelectionEditBar_();
      renderRegistryView_();
      return fetchMproInspectorDirectory_()
        .then(result => {
          const rows = Array.isArray(result && result.inspectorsList) ? result.inspectorsList : [];
          state.mapPublishInspectors = normalizeMapPublishInspectorDirectoryRows_(rows, divisionCode);
          state.mapPublishInspectorsLoaded = true;
          pruneSelectionPublishInspectorNames_();
          return getCurrentDivisionMapPublishInspectors_();
        })
        .catch(error => {
          state.mapPublishInspectors = [];
          state.mapPublishInspectorsLoaded = false;
          state.mapPublishInspectorsError = error && error.message ? error.message : String(error || 'Ошибка загрузки инспекторов');
          pruneSelectionPublishInspectorNames_();
          return [];
        })
        .finally(() => {
          state.mapPublishInspectorsLoading = false;
          renderRegistrySelectionEditBar_();
          renderRegistryView_();
        });
    }

    function syncLabStudyCreateAccessState_() {
      if (canCurrentUserManageLabStudies_() && isCurrentRegistryDatasetEditable_()) return;
      state.labStudyInspectorsLoading = false;
      state.labStudyInspectorsError = '';
      if (!state.labStudyCreateDialogOpen) return;
      state.labStudyCreateDialogOpen = false;
      state.labStudyCreateDialogSaving = false;
      state.labStudyCreateDialogError = '';
      state.labStudyCreateDialogObjectId = '';
      state.labStudyCreateDialogObjectTitle = '';
      state.labStudyCreateFormValues = buildEmptyLabStudyCreateFormValues_();
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
      if (isCurrentUserAdmin_() && isCurrentRegistryDatasetEditable_()) {
        state.adminRegistrySelectedRows = normalizeAdminRegistrySelectedRows_(state.adminRegistrySelectedRows);
        if (!state.adminRegistryFormValues || typeof state.adminRegistryFormValues !== 'object') {
          state.adminRegistryFormValues = buildEmptyAdminRegistryFormValues_();
        }
        return;
      }
      disableAdminRegistryEditMode_();
    }

    function isAdminRegistryEditMode_() {
      return isCurrentUserAdmin_() && isCurrentRegistryDatasetEditable_() && !!state.adminRegistryEditMode;
    }

    function getAdminRegistrySelectedRowIndexes_() {
      const normalized = normalizeAdminRegistrySelectedRows_(state.adminRegistrySelectedRows);
      state.adminRegistrySelectedRows = normalized;
      return normalized.slice();
    }

    function toggleAdminRegistryEditMode_() {
      syncAdminRegistryAccessState_();
      if (!isCurrentUserAdmin_() || !isCurrentRegistryDatasetEditable_()) return;
      if (state.adminRegistryPendingAction || state.adminRegistryDialogSaving || state.loading) return;
      const next = !state.adminRegistryEditMode;
      if (next && isRegistrySelectionEditing_()) closeRegistrySelectionEditing_();
      if (next && isRegistryMapRemovalMode_()) exitRegistryMapRemovalMode_({ silent: true });
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
      if (mode === 'division') return 'Команда';
      if (mode === 'shared') return 'Все';
      return 'Мои';
    }

function getRegistrySelectionScopeTitle_(scope) {
      const mode = normalizeRegistrySelectionScope_(scope);
      if (mode === 'division') {
        const divisionLabel = getCurrentUserDivisionLabel_();
        return divisionLabel ? `Команда: ${divisionLabel}` : 'Командная';
      }
      return mode === 'shared' ? 'Для всех' : 'Моя выборка';
    }

function getCollaborativeSelectionDivisionMessage_(selection) {
      return isDivisionRegistrySelection_(selection)
        ? 'Для командной выборки укажите блок'
        : 'Для общей выборки укажите блок';
    }

function buildSavedSelectionsPanelSummary_() {
      const allSelections = getAllSavedRegistrySelections_();
      if (!allSelections.length) return 'Пока нет сохраненных выборок.';
      const personalCount = allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'personal').length;
      const divisionCount = allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'division').length;
      const sharedCount = allSelections.filter(item => normalizeRegistrySelectionScope_(item && item.scope) === 'shared').length;
      const parts = [];
      if (personalCount) parts.push(`мои ${personalCount}`);
      if (divisionCount) parts.push(`команда ${divisionCount}`);
      if (sharedCount) parts.push(`все ${sharedCount}`);
      return parts.join(' · ') || `${allSelections.length} выборок`;
    }

function syncSavedSelectionsPanelChrome_() {
      const panelBody = el('savedSelectionPanelBody');
      const summaryNode = el('savedSelectionPanelSummary');
      const composerToggleButton = el('btnOpenSelectionComposer');
      const isComposerBusy = !!String(state.selectionComposerBusyState || '').trim();

      if (panelBody) panelBody.classList.remove('hidden');
      if (summaryNode) summaryNode.textContent = '';
      if (composerToggleButton) {
        composerToggleButton.disabled = isComposerBusy;
        composerToggleButton.classList.toggle('is-active', !!state.selectionComposerOpen);
        composerToggleButton.title = state.selectionComposerOpen ? 'Закрыть редактор' : 'Создать выборку';
        composerToggleButton.setAttribute('aria-label', composerToggleButton.title);
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
          setCollapsibleOpenState_(stackNode, nextOpen, { duration: 150, translateY: 6, mode: 'size' });
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
      state.selectionComposerScope = mode;
      const personalButton = el('btnSelectionScopePersonal');
      const divisionButton = el('btnSelectionScopeDivision');
      const sharedButton = el('btnSelectionScopeShared');
      if (personalButton) personalButton.classList.toggle('active', mode === 'personal');
      if (divisionButton) divisionButton.classList.toggle('active', mode === 'division');
      if (sharedButton) sharedButton.classList.toggle('active', mode === 'shared');
      syncRegistrySelectionComposerUi_();
    }

function getRegistrySelectionComposerScope_() {
      return normalizeRegistrySelectionScope_(state.selectionComposerScope || 'personal');
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
      if (String(state.selectionComposerSelectionId || '') === targetId) closeRegistrySelectionComposer_();
      if (state.activeRegistrySelectionId === targetId) {
        resetActiveRegistrySelectionViewState_();
      } else if (String(state.selectionDraftSourceId || '') === targetId) {
        state.selectionDraftSourceId = '';
      }
      clearSelectionDoneState_(targetId);
      removeSavedSelectionPublishAssignmentsForSelection_(targetId);
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
            if (item && editingItem) {
              moveSavedSelectionPublishAssignments_(editingItem.id, item.id);
            }
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
        if (item && editingItem) moveSavedSelectionPublishAssignments_(editingItem.id, item.id);
        closeRegistrySelectionComposer_();
        applySavedRegistrySelection_(item.id);
        syncRegistrySelectionComposerUi_();
        return Promise.resolve(item);
      }

      if (!sourceIsCollaborative && targetIsCollaborative) {
        return runSharedRegistrySelectionSaveFlow_(payload, null, input).then(item => {
          if (!item) return null;
          moveSavedSelectionPublishAssignments_(editingItem && editingItem.id, item.id);
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
        if (item && editingItem) moveSavedSelectionPublishAssignments_(editingItem.id, item.id);
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
        clearActiveRegistrySelectionBaseState_();
        return;
      }
      state.activeRegistrySelectionId = draftSource.id;
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
      const name = String(input && input.value || state.selectionComposerDraftName || buildRegistrySelectionLabel_()).trim();
      state.selectionComposerDraftName = name;
      const saveMode = mode === 'append' ? 'append' : 'replace';
      if (!name) {
        if (input) input.focus();
        return Promise.resolve(null);
      }
      if (scope === 'division' && !canUseDivisionRegistrySelectionScope_()) {
        reportRuntimeError_('У пользователя не указан блок. Сохранить такую командную выборку сейчас нельзя.', 'Выборка');
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
      resetSelectionPublishDraftOptions_();
      renderSavedSelectionsPanel_();
      if (state.selectionComposerOpen) closeRegistrySelectionComposer_();
      if (state.selectionPublishDraftOpen) resetRegistrySelectionPublishDraftState_();
      if (isRegistryMapRemovalMode_()) exitRegistryMapRemovalMode_({ silent: true });
      state.currentView = 'registry';
      state.analyticsRegistryDrilldownRowIndexes = [];
      state.activeRegistrySelectionId = item.id;
      state.selectionDraftSourceId = item.id;
      clearActiveRegistrySelectionBaseState_();
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
      state.registryBulkOpen = false;
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      el('registrySearchInput').value = state.objectQuery;
      syncRegistryBulkUinUi_();
      applyObjectFilters_();
      setActiveRegistrySelectionBaseRowIndexes_(state.filteredRowIndexes);
      syncSavedSelectionPublishAssignmentsFromMapOverlay_(selectionId, {
        rowIndexes: state.activeRegistrySelectionBaseRowIndexes
      });
      ensureObjectSelection_();
      persistRegistrySessionState_();
      if (canCurrentUserManageMproMap_() && isCurrentRegistryDatasetEditable_()) {
        ensureMapPublishInspectorsLoaded_();
      }
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
      renderRegistrySelectionEditBar_();

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
            renderRegistrySelectionEditBar_();
          });
      }

      return Promise.resolve(finalizeRemoval()).finally(() => {
        if (String(state.selectionRemovingId || '') === String(item.id || '')) {
          state.selectionRemovingId = '';
        }
        renderSavedSelectionsPanel_();
        renderRegistrySelectionEditBar_();
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
      clearActiveRegistrySelectionBaseState_();
      persistRegistrySessionState_();
    }

function resetActiveRegistrySelectionViewState_() {
      state.selectionPublishMenuId = '';
      state.activeRegistrySelectionId = '';
      state.selectionDraftSourceId = '';
      clearActiveRegistrySelectionBaseState_();
      state.currentView = 'registry';
      state.analyticsRegistryDrilldownRowIndexes = [];
      state.objectQuery = '';
      state.bulkUinText = '';
      state.registryBulkDraftText = null;
      state.registryBulkOpen = false;
      state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      state.openRegistryFilterKey = '';
      const searchInput = el('registrySearchInput');
      if (searchInput) searchInput.value = '';
      const bulkInput = el('registryBulkUinInput');
      if (bulkInput) bulkInput.value = '';
      syncRegistryBulkUinUi_();
      syncRegistrySelectionMatchState_();
      applyObjectFilters_();
      syncObjectTabsState_();
      ensureObjectSelection_();
      persistRegistrySessionState_();
    }

function closeActiveRegistrySelectionView_() {
      resetActiveRegistrySelectionViewState_();
      renderAll_();
      scrollWorkspaceToTop_();
    }

function restoreActiveRegistrySelectionState_() {
      const item = getActiveRegistrySelection_();
      const searchInput = el('registrySearchInput');
      if (!item) {
        if (state.activeRegistrySelectionId) clearActiveRegistrySelectionState_();
        clearActiveRegistrySelectionBaseState_();
        if (searchInput) searchInput.value = state.objectQuery;
        state.registryBulkDraftText = null;
        syncRegistryBulkUinUi_();
        return false;
      }
      state.selectionDraftSourceId = item.id;
      clearActiveRegistrySelectionBaseState_();
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
      state.registryBulkOpen = false;
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      if (searchInput) searchInput.value = state.objectQuery;
      syncRegistryBulkUinUi_();
      return true;
    }

function applyRegistrySessionState_(session) {
      const data = session || {};
      state.registryDataMode = normalizeRegistryDataMode_(data.registryDataMode);
      state.activeRegistrySelectionId = String(data.activeRegistrySelectionId || '');
      state.selectionDraftSourceId = String(data.selectionDraftSourceId || data.activeRegistrySelectionId || '');
      state.objectQuery = String(data.objectQuery || '');
      state.bulkUinText = String(data.bulkUinText || '');
      state.registryBulkDraftText = null;
      state.registryBulkOpen = !!data.registryBulkOpen;
      state.registryVisibleColumnKeys = normalizeStoredRegistryVisibleColumnKeys_(data.registryVisibleColumnKeys, state.registryDataMode);
      state.registryColumnsPanelOpen = false;
      state.currentView = normalizeWorkspaceView_(data.currentView);
      state.analyticsSection = normalizeAnalyticsSection_(data.analyticsSection);
      state.analyticsKsgContractors = normalizeAnalyticsKsgContractorFilters_(data.analyticsKsgContractors);
      state.analyticsArchiveGrbs = normalizeAnalyticsArchiveGrbsFilters_(data.analyticsArchiveGrbs);
      state.analyticsArchiveDateFrom = normalizeAnalyticsArchiveDateValue_(data.analyticsArchiveDateFrom);
      state.analyticsArchiveDateTo = normalizeAnalyticsArchiveDateValue_(data.analyticsArchiveDateTo);
      state.sidebarExpanded = data.sidebarExpanded !== undefined ? !!data.sidebarExpanded : true;
      state.sidebarActivePanel = normalizeSidebarPanel_(data.sidebarActivePanel);
      state.registrySidebarPanelOpen = data.registrySidebarPanelOpen !== undefined ? !!data.registrySidebarPanelOpen : true;
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


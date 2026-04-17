    // ===== Object Domain =====

    // ----- Object workspace -----

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
      state.labStudySchemeStudyId = '';
      if (typeof closeLabStudySchemeModal_ === 'function') closeLabStudySchemeModal_();
    }

    function loadObjectMonitoringHistory_(objectId, options) {
      const objectKey = normalizeMonitoringObjectKey_(objectId);
      if (!objectKey) return Promise.resolve([]);
      const settings = options || {};
      if (!settings.force && Array.isArray(state.monitoringHistoryByObjectKey[objectKey])) {
        return Promise.resolve(state.monitoringHistoryByObjectKey[objectKey]);
      }
      state.monitoringHistoryLoadingObjectKey = objectKey;
      if (Object.prototype.hasOwnProperty.call(state.monitoringHistoryErrorsByObjectKey, objectKey)) {
        delete state.monitoringHistoryErrorsByObjectKey[objectKey];
      }
      renderSectionStack_();
      return fetchObjectMonitoringHistory_(objectId)
        .then(result => {
          const rows = Array.isArray(result && result.rows) ? result.rows : [];
          state.monitoringHistoryByObjectKey[objectKey] = rows.map(item => ({
            monitoringDate: String(item && item.monitoringDate || '').trim(),
            visitStatus: String(item && item.visitStatus || '').trim(),
            statusLabel: String(item && item.statusLabel || '').trim(),
            inspector: String(item && item.inspector || '').trim(),
            photosUrl: String(item && item.photosUrl || '').trim()
          }));
          const nextOverlayEntry = buildMonitoringOverlayEntryFromHistoryRows_(
            objectId,
            state.monitoringHistoryByObjectKey[objectKey],
            getMonitoringOverlayForObjectKey_(objectKey)
          );
          if (nextOverlayEntry) {
            state.monitoringOverlayByObjectKey[objectKey] = nextOverlayEntry;
            invalidateRegistryDerivedCaches_();
          }
          return state.monitoringHistoryByObjectKey[objectKey];
        })
        .catch(error => {
          state.monitoringHistoryErrorsByObjectKey[objectKey] = error && error.message ? error.message : String(error || 'Ошибка загрузки');
          return [];
        })
        .finally(() => {
          if (state.monitoringHistoryLoadingObjectKey === objectKey) state.monitoringHistoryLoadingObjectKey = '';
          renderSectionStack_();
        });
    }

    function ensureSelectedObjectMonitoringHistoryLoaded_() {
      if (!state.activeSections.some(isMonitoringHistoryHostSection_)) return;
      const objectId = getSelectedObjectKey_();
      if (!objectId || !state.currentUser || !state.sessionToken) return;
      const objectKey = normalizeMonitoringObjectKey_(objectId);
      if (Array.isArray(state.monitoringHistoryByObjectKey[objectKey]) || state.monitoringHistoryLoadingObjectKey === objectKey) return;
      loadObjectMonitoringHistory_(objectId);
    }

    function loadObjectLabStudiesHistory_(objectId, options) {
      const objectKey = normalizeMonitoringObjectKey_(objectId);
      if (!objectKey) return Promise.resolve([]);
      const settings = options || {};
      if (!settings.force && Array.isArray(state.labStudiesHistoryByObjectKey[objectKey])) {
        return Promise.resolve(state.labStudiesHistoryByObjectKey[objectKey]);
      }
      state.labStudiesHistoryLoadingObjectKey = objectKey;
      if (Object.prototype.hasOwnProperty.call(state.labStudiesHistoryErrorsByObjectKey, objectKey)) {
        delete state.labStudiesHistoryErrorsByObjectKey[objectKey];
      }
      renderSectionStack_();
      return fetchObjectLabStudiesHistory_(objectId)
        .then(result => {
          const rows = Array.isArray(result && result.rows) ? result.rows : [];
          state.labStudiesHistoryByObjectKey[objectKey] = rows.map(item => ({
            id: String(item && item.id || '').trim(),
            visitId: String(item && item.visitId || '').trim(),
            createdAt: String(item && item.createdAt || '').trim(),
            updatedAt: String(item && item.updatedAt || '').trim(),
            completedAt: String(item && item.completedAt || '').trim(),
            status: String(item && item.status || '').trim(),
            statusLabel: String(item && item.statusLabel || '').trim(),
            studyType: String(item && item.studyType || '').trim(),
            randomTask: String(item && item.randomTask || '').trim(),
            inspectorName: String(item && item.inspectorName || '').trim(),
            generatedByName: String(item && item.generatedByName || '').trim(),
            completedByName: String(item && item.completedByName || '').trim(),
            inspectorComment: String(item && item.inspectorComment || '').trim(),
            routeUrl: String(item && item.routeUrl || '').trim(),
            coordinateStartLatLon: String(item && item.coordinateStartLatLon || '').trim(),
            studyLatLon: String(item && item.studyLatLon || '').trim(),
            coordinateFinishLatLon: String(item && item.coordinateFinishLatLon || '').trim(),
            legacyResultRaw: String(item && item.legacyResultRaw || '').trim(),
            objectLengthM: Number.isFinite(Number(item && item.objectLengthM)) ? Number(item.objectLengthM) : null,
            objectWidthM: Number.isFinite(Number(item && item.objectWidthM)) ? Number(item.objectWidthM) : null,
            hasScheme: !!(item && item.hasScheme)
          }));
          return state.labStudiesHistoryByObjectKey[objectKey];
        })
        .catch(error => {
          state.labStudiesHistoryErrorsByObjectKey[objectKey] = error && error.message ? error.message : String(error || 'Ошибка загрузки');
          return [];
        })
        .finally(() => {
          if (state.labStudiesHistoryLoadingObjectKey === objectKey) state.labStudiesHistoryLoadingObjectKey = '';
          renderSectionStack_();
        });
    }

    function formatLabStudyCreateNumberValue_(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '';
      if (Math.abs(numeric - Math.round(numeric)) < 0.000001) return String(Math.round(numeric));
      return String(Math.round(numeric * 100) / 100).replace('.', ',');
    }

    function formatLabStudyCreateAxisValue_(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '';
      const rounded = Math.round(numeric * 10) / 10;
      if (Math.abs(rounded - Math.round(rounded)) < 0.000001) return String(Math.round(rounded));
      return String(rounded).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    }

    function parseLabStudyCreateNumberInput_(value) {
      const text = String(value == null ? '' : value).trim().replace(',', '.');
      if (!text) return null;
      const numeric = Number(text);
      return Number.isFinite(numeric) ? numeric : null;
    }

    function parseLabStudyRandomTaskText_(value) {
      const text = String(value || '').trim();
      if (!text) return null;
      const match = text.match(/Y\s*=\s*([+-]?\d+(?:[.,]\d+)?)\s*;\s*X\s*=\s*([+-]?\d+(?:[.,]\d+)?)/i);
      if (!match) return null;
      const taskY = parseLabStudyCreateNumberInput_(match[1]);
      const taskX = parseLabStudyCreateNumberInput_(match[2]);
      if (!Number.isFinite(taskY) || !Number.isFinite(taskX)) return null;
      return { taskY, taskX };
    }

    function buildGeneratedLabStudyTaskValues_(widthValue, lengthValue) {
      const objectWidthM = Number(widthValue);
      const objectLengthM = Number(lengthValue);
      if (!(objectWidthM > 0) || !(objectLengthM > 0)) return null;
      return {
        // Сохраняем механику legacy-лаборатории: Y идет вдоль объекта, X - поперек от оси дороги.
        taskY: formatLabStudyCreateAxisValue_(Math.random() * objectLengthM),
        taskX: formatLabStudyCreateAxisValue_((Math.random() * objectWidthM) - (objectWidthM / 2))
      };
    }

    function buildSelectedLabStudyCreateDefaults_() {
      const defaults = buildEmptyLabStudyCreateFormValues_();
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return defaults;
      const summary = getRegistryRowSummary_(rowIndex) || {};
      const historyRows = typeof getSelectedLabStudiesHistoryRows_ === 'function'
        ? getSelectedLabStudiesHistoryRows_()
        : [];
      const latest = Array.isArray(historyRows) && historyRows.length ? historyRows[0] : null;
      const taskValues = parseLabStudyRandomTaskText_(latest && latest.randomTask);
      return {
        inspectorName: String(latest && latest.inspectorName || '').trim(),
        studyType: String(latest && latest.studyType || LAB_STUDY_TYPE_OPTIONS[0] || '').trim() || (LAB_STUDY_TYPE_OPTIONS[0] || ''),
        coordinateStartLatLon: String(latest && latest.coordinateStartLatLon || '').trim(),
        studyLatLon: String(latest && latest.studyLatLon || summary.coordinates || '').trim(),
        coordinateFinishLatLon: String(latest && latest.coordinateFinishLatLon || '').trim(),
        taskY: formatLabStudyCreateAxisValue_(taskValues && taskValues.taskY),
        taskX: formatLabStudyCreateAxisValue_(taskValues && taskValues.taskX),
        objectLengthM: formatLabStudyCreateNumberValue_(latest && latest.objectLengthM),
        objectWidthM: formatLabStudyCreateNumberValue_(latest && latest.objectWidthM)
      };
    }

    function ensureLabStudyInspectorsLoaded_(options) {
      const settings = options || {};
      if (!canCurrentUserManageLabStudies_() || !state.currentUser || !state.sessionToken) {
        state.labStudyInspectors = [];
        state.labStudyInspectorsLoaded = false;
        state.labStudyInspectorsLoading = false;
        state.labStudyInspectorsError = '';
        return Promise.resolve([]);
      }
      if (!settings.force && state.labStudyInspectorsLoaded) {
        return Promise.resolve(Array.isArray(state.labStudyInspectors) ? state.labStudyInspectors : []);
      }
      if (state.labStudyInspectorsLoading) {
        return Promise.resolve(Array.isArray(state.labStudyInspectors) ? state.labStudyInspectors : []);
      }
      state.labStudyInspectorsLoading = true;
      state.labStudyInspectorsError = '';
      renderAll_();
      return fetchLabStudyInspectors_()
        .then(result => {
          const rows = Array.isArray(result && result.rows) ? result.rows : [];
          state.labStudyInspectors = rows
            .map(item => ({
              name: String(item && item.name || '').trim(),
              role: String(item && item.role || '').trim(),
              divisionCode: String(item && item.divisionCode || '').trim()
            }))
            .filter(item => item.name);
          state.labStudyInspectorsLoaded = true;
          return state.labStudyInspectors;
        })
        .catch(error => {
          state.labStudyInspectorsLoaded = false;
          state.labStudyInspectorsError = error && error.message ? error.message : String(error || 'Ошибка загрузки инспекторов');
          return [];
        })
        .finally(() => {
          state.labStudyInspectorsLoading = false;
          renderAll_();
        });
    }

    function updateLabStudyCreateField_(fieldId, value) {
      const key = String(fieldId || '').trim();
      if (!key) return;
      state.labStudyCreateFormValues = {
        ...buildEmptyLabStudyCreateFormValues_(),
        ...(state.labStudyCreateFormValues || {}),
        [key]: String(value == null ? '' : value)
      };
      if (state.labStudyCreateDialogError) state.labStudyCreateDialogError = '';
    }

    function generateLabStudyTask_() {
      if (!state.labStudyCreateDialogOpen || state.labStudyCreateDialogSaving) return;
      const values = {
        ...buildEmptyLabStudyCreateFormValues_(),
        ...(state.labStudyCreateFormValues || {})
      };
      const widthValue = parseLabStudyCreateNumberInput_(values.objectWidthM);
      const lengthValue = parseLabStudyCreateNumberInput_(values.objectLengthM);
      const generated = buildGeneratedLabStudyTaskValues_(widthValue, lengthValue);
      if (!generated) {
        state.labStudyCreateDialogError = 'Сначала укажите корректные ширину и длину';
        renderAll_();
        return;
      }
      state.labStudyCreateDialogError = '';
      state.labStudyCreateFormValues = {
        ...values,
        taskY: generated.taskY,
        taskX: generated.taskX
      };
      renderAll_();
    }


    function openLabStudyCreateDialog_() {
      if (!canCurrentUserManageLabStudies_() || !isCurrentRegistryDatasetEditable_() || state.labStudyCreateDialogSaving) return;
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0) return;
      const objectId = getSelectedObjectKey_();
      if (!objectId) return;
      const summary = getRegistryRowSummary_(rowIndex) || {};
      state.labStudyCreateDialogOpen = true;
      state.labStudyCreateDialogSaving = false;
      state.labStudyCreateDialogError = '';
      state.labStudyCreateDialogObjectId = String(objectId || '').trim();
      state.labStudyCreateDialogObjectTitle = [String(summary.uin || '').trim(), String(summary.name || '').trim()]
        .filter(Boolean)
        .join(' · ') || String(summary.name || '').trim() || String(objectId || '').trim();
      state.labStudyCreateFormValues = buildSelectedLabStudyCreateDefaults_();
      renderAll_();
      ensureLabStudyInspectorsLoaded_();
      window.requestAnimationFrame(() => {
        const input = document.querySelector('[data-lab-study-create-field-input="inspectorName"]');
        if (input && typeof input.focus === 'function') input.focus();
      });
    }

    function closeLabStudyCreateDialog_() {
      if (state.labStudyCreateDialogSaving) return;
      state.labStudyCreateDialogOpen = false;
      state.labStudyCreateDialogError = '';
      state.labStudyCreateDialogObjectId = '';
      state.labStudyCreateDialogObjectTitle = '';
      state.labStudyCreateFormValues = buildEmptyLabStudyCreateFormValues_();
      renderAll_();
    }

    async function submitLabStudyCreate_() {
      if (!state.labStudyCreateDialogOpen || state.labStudyCreateDialogSaving) return;
      const objectId = String(state.labStudyCreateDialogObjectId || '').trim();
      if (!objectId) {
        state.labStudyCreateDialogError = 'Не выбран объект';
        renderAll_();
        return;
      }
      const values = {
        ...buildEmptyLabStudyCreateFormValues_(),
        ...(state.labStudyCreateFormValues || {})
      };
      const payload = {
        objectId,
        inspectorName: String(values.inspectorName || '').trim(),
        studyType: String(values.studyType || '').trim(),
        coordinateStartLatLon: String(values.coordinateStartLatLon || '').trim(),
        studyLatLon: String(values.studyLatLon || '').trim(),
        coordinateFinishLatLon: String(values.coordinateFinishLatLon || '').trim(),
        taskY: String(values.taskY || '').trim(),
        taskX: String(values.taskX || '').trim(),
        objectLengthM: String(values.objectLengthM || '').trim(),
        objectWidthM: String(values.objectWidthM || '').trim()
      };
      if (!payload.inspectorName) {
        state.labStudyCreateDialogError = 'Укажите инспектора';
        renderAll_();
        return;
      }
      if (!payload.studyType) {
        state.labStudyCreateDialogError = 'Укажите тип исследования';
        renderAll_();
        return;
      }
      if (!payload.coordinateStartLatLon || !payload.coordinateFinishLatLon || !payload.studyLatLon) {
        state.labStudyCreateDialogError = 'Заполните координаты начала, точки исследования и конца';
        renderAll_();
        return;
      }
      const lengthValue = parseLabStudyCreateNumberInput_(payload.objectLengthM);
      const widthValue = parseLabStudyCreateNumberInput_(payload.objectWidthM);
      if (!(lengthValue > 0) || !(widthValue > 0)) {
        state.labStudyCreateDialogError = 'Заполните длину и ширину объекта';
        renderAll_();
        return;
      }
      if (!payload.taskY || !payload.taskX) {
        state.labStudyCreateDialogError = 'Сгенерируйте или заполните Y и X';
        renderAll_();
        return;
      }
      const taskYValue = parseLabStudyCreateNumberInput_(payload.taskY);
      const taskXValue = parseLabStudyCreateNumberInput_(payload.taskX);
      if (!Number.isFinite(taskYValue) || !Number.isFinite(taskXValue)) {
        state.labStudyCreateDialogError = 'Укажите корректные значения Y и X';
        renderAll_();
        return;
      }
      if (taskYValue < 0 || taskYValue > lengthValue) {
        state.labStudyCreateDialogError = 'Y должен быть в пределах длины объекта';
        renderAll_();
        return;
      }
      if (taskXValue < (0 - (widthValue / 2)) || taskXValue > (widthValue / 2)) {
        state.labStudyCreateDialogError = 'X должен быть в пределах ширины объекта относительно оси дороги';
        renderAll_();
        return;
      }
      state.labStudyCreateDialogSaving = true;
      state.labStudyCreateDialogError = '';
      renderAll_();
      try {
        const result = await createLabStudy_(payload);
        if (!result || !result.success) {
          throw new Error(result && result.error ? result.error : 'Не удалось назначить исследование');
        }
        upsertRegistryMapOverlayEntry_({
          objectId,
          divisionCode: String(result && result.divisionCode || 'laboratory').trim(),
          visitId: String(result && result.visitId || '').trim(),
          visitStatus: String(result && result.visitStatus || 'planned').trim(),
          inspector: String(result && result.inspectorName || payload.inspectorName).trim(),
          routeListName: String(result && result.routeListName || '').trim(),
          visitDate: String(result && result.visitDate || '').trim()
        });
        state.labStudyCreateDialogOpen = false;
        state.labStudyCreateDialogSaving = false;
        state.labStudyCreateDialogError = '';
        state.labStudyCreateDialogObjectId = '';
        state.labStudyCreateDialogObjectTitle = '';
        state.labStudyCreateFormValues = buildEmptyLabStudyCreateFormValues_();
        renderAll_();
        notifyMproDataChanged_({ event: 'lab-study-created' });
        showCopyToast_(`Исследование назначено: ${String(result && result.inspectorName || payload.inspectorName).trim() || 'инспектор выбран'}`, false);
        await loadObjectLabStudiesHistory_(objectId, { force: true });
      } catch (err) {
        state.labStudyCreateDialogSaving = false;
        if (isUnauthorizedError_(err)) {
          handleUnauthorized_();
          return;
        }
        state.labStudyCreateDialogError = err && err.message ? err.message : String(err || 'Ошибка назначения исследования');
        renderAll_();
      }
    }

    function ensureSelectedObjectLabStudiesHistoryLoaded_() {
      if (!state.activeSections.some(isLabStudiesHistoryHostSection_)) return;
      const objectId = getSelectedObjectKey_();
      if (!objectId || !state.currentUser || !state.sessionToken) return;
      const objectKey = normalizeMonitoringObjectKey_(objectId);
      if (Array.isArray(state.labStudiesHistoryByObjectKey[objectKey]) || state.labStudiesHistoryLoadingObjectKey === objectKey) return;
      loadObjectLabStudiesHistory_(objectId);
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
      ensureSelectedObjectMonitoringHistoryLoaded_();
      ensureSelectedObjectLabStudiesHistoryLoaded_();
      if (settings.scroll !== false) scrollWorkspaceToTop_();
    }

function returnToRegistryFromWorkspace_() {
      if (state.currentView !== 'object') return;
      state.currentView = 'registry';
      state.sidebarActivePanel = 'registry';
      ensureObjectSelection_();
      renderAll_();
      scrollWorkspaceToTop_();
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
      closeAllButton.disabled = !tabs.length;
      closeAllButton.classList.toggle('hidden', !tabs.length);
      closeAllButton.onclick = tabs.length
        ? (() => {
            closeAllObjectTabs_();
          })
        : null;
      list.innerHTML = (
        (
          `<button class="workspace-tab workspace-tab-back" type="button" data-workspace-back-registry="1" title="Назад в реестр" aria-label="Назад в реестр">` +
            `<span class="workspace-tab-back-icon" aria-hidden="true">←</span>` +
          `</button>`
        ) +
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
      list.querySelectorAll('[data-workspace-back-registry]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          returnToRegistryFromWorkspace_();
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


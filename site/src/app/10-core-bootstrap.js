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

    function markSiteShellReady_() {
      try {
        if (document && document.body) {
          document.body.classList.remove('site-shell-booting');
        }
      } catch (e) {}
    }

    function isSiteNavHydrating_() {
      try {
        return !!(document && document.body && document.body.classList.contains('site-nav-hydrating'));
      } catch (e) {
        return false;
      }
    }

    function finishSiteNavHydration_() {
      try {
        if (!document || !document.body || !document.body.classList.contains('site-nav-hydrating')) return;
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            try {
              if (document && document.body) {
                document.body.classList.remove('site-nav-hydrating');
              }
            } catch (e) {}
          });
        });
      } catch (e) {}
    }

    let siteBootstrapStarted_ = false;

    function startSiteBootstrap_() {
      if (siteBootstrapStarted_) return;
      siteBootstrapStarted_ = true;
      state.runtimeOptions = parseRuntimeOptions_();
      state.personalRegistrySelections = loadPersonalRegistrySelections_();
      applyRegistrySessionState_(loadRegistrySessionState_());
      state.changeHistoryByObject = loadObjectChangeHistory_();
      state.googleSyncLastAt = loadGoogleSyncLastAt_();
      populatePresetMenus_();
      bindEvents_();
      renderNavState_();
      checkBackendReadiness_();
      initializeAuth_();
      finishSiteNavHydration_();
    }

    // ===== Bootstrap =====
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startSiteBootstrap_, { once: true });
    } else {
      startSiteBootstrap_();
    }

    // ===== Top-level events =====
    function bindEvents_() {
      el('authForm').addEventListener('submit', evt => {
        evt.preventDefault();
        doLogin_();
      });
      el('btnLogout').addEventListener('click', () => logout_());
      const btnNavMpro = el('btnNavMpro');
      if (btnNavMpro) btnNavMpro.addEventListener('click', () => openCrossAppView_('mpro'));
      initializeSidebarBrandLogo_();
      initializeAuthBrandLogo_();
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
      el('authLogin').addEventListener('keydown', evt => {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          doLogin_();
        }
      });
      el('authLogin').addEventListener('input', () => {
        hideAuthError_();
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
        renderRegistryInteraction_();
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
      const btnOpenSelectionComposer = el('btnOpenSelectionComposer');
      const btnConfirmSelectionComposer = el('btnConfirmSelectionComposer');
      const btnSelectionComposerClose = el('btnSelectionComposerClose');
      const btnSelectionScopePersonal = el('btnSelectionScopePersonal');
      const btnSelectionScopeDivision = el('btnSelectionScopeDivision');
      const btnSelectionScopeShared = el('btnSelectionScopeShared');
      const selectionNameInput = el('selectionNameInput');
      if (btnOpenSelectionComposer) btnOpenSelectionComposer.addEventListener('click', () => toggleRegistrySelectionComposer_());
      if (btnConfirmSelectionComposer) btnConfirmSelectionComposer.addEventListener('click', () => saveCurrentRegistrySelection_());
      if (btnSelectionComposerClose) btnSelectionComposerClose.addEventListener('click', () => closeRegistrySelectionComposer_());
      if (btnSelectionScopePersonal) btnSelectionScopePersonal.addEventListener('click', () => setRegistrySelectionComposerScope_('personal'));
      if (btnSelectionScopeDivision) btnSelectionScopeDivision.addEventListener('click', () => setRegistrySelectionComposerScope_('division'));
      if (btnSelectionScopeShared) btnSelectionScopeShared.addEventListener('click', () => setRegistrySelectionComposerScope_('shared'));
      if (selectionNameInput) selectionNameInput.addEventListener('keydown', evt => {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          saveCurrentRegistrySelection_();
        }
        if (evt.key === 'Escape') {
          evt.preventDefault();
          closeRegistrySelectionComposer_();
        }
      });
      const btnResetSections = el('btnResetSections');
      if (btnResetSections) btnResetSections.addEventListener('click', resetSections_);
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
      bindRegistryTableWrapEvents_(getRegistryTableWrap_());
      document.addEventListener('click', evt => {
        if (evt.target.closest('[data-row-publish-inspector-cell]')) return;
        if (String(state.selectionPublishRowInspectorPickerKey || '').trim()) {
          closeSelectionPublishRowInspectorPicker_();
        }
      });
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
        const labStudySchemeClose = evt.target.closest('[data-lab-study-scheme-close]');
        if (labStudySchemeClose) {
          evt.preventDefault();
          closeLabStudySchemeModal_();
          return;
        }
        const labStudyCreateClose = evt.target.closest('[data-lab-study-create-close]');
        if (labStudyCreateClose) {
          evt.preventDefault();
          closeLabStudyCreateDialog_();
          return;
        }
        const labStudyCreateSubmit = evt.target.closest('[data-lab-study-create-submit]');
        if (labStudyCreateSubmit) {
          evt.preventDefault();
          submitLabStudyCreate_();
          return;
        }
        const labStudyCreateGenerate = evt.target.closest('[data-lab-study-create-generate]');
        if (labStudyCreateGenerate) {
          evt.preventDefault();
          generateLabStudyTask_();
          return;
        }
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
        if (!evt.target.closest('[data-selection-publish-menu]') && !evt.target.closest('[data-toggle-selection-publish-menu]')) closeSelectionPublishMenu_();
      });
      document.addEventListener('click', evt => {
        const dialog = el('adminRegistryDialog');
        if (!dialog || evt.target !== dialog) return;
        closeAdminRegistryCreateDialog_();
      });
      document.addEventListener('click', evt => {
        const dialog = el('labStudyCreateOverlay');
        if (!dialog || evt.target !== dialog) return;
        closeLabStudyCreateDialog_();
      });
      document.addEventListener('input', evt => {
        const target = evt.target;
        if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
        const fieldId = String(target.getAttribute('data-admin-registry-field-input') || '').trim();
        if (fieldId) {
          updateAdminRegistryCreateField_(fieldId, target.value);
          return;
        }
        const labStudyFieldId = String(target.getAttribute('data-lab-study-create-field-input') || '').trim();
        if (!labStudyFieldId) return;
        updateLabStudyCreateField_(labStudyFieldId, target.value);
      });
      document.addEventListener('change', evt => {
        const target = evt.target;
        if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement) && !(target instanceof HTMLTextAreaElement)) return;
        const labStudyFieldId = String(target.getAttribute('data-lab-study-create-field-input') || '').trim();
        if (!labStudyFieldId) return;
        updateLabStudyCreateField_(labStudyFieldId, target.value);
      });
      document.addEventListener('keydown', evt => {
        if (evt.key === 'Escape') {
          if (isLabStudySchemeModalOpen_()) {
            evt.preventDefault();
            closeLabStudySchemeModal_();
            return;
          }
          if (state.labStudyCreateDialogOpen) {
            evt.preventDefault();
            closeLabStudyCreateDialog_();
            return;
          }
          if (state.adminRegistryDialogOpen) {
            evt.preventDefault();
            closeAdminRegistryCreateDialog_();
          }
          if (isRegistryMapRemovalMode_()) {
            evt.preventDefault();
            exitRegistryMapRemovalMode_();
          }
          closeQuickPresetMenus_();
          closeRegistryFilterMenus_();
          closeRegistryColumnsPanel_();
          closeSelectionPublishMenu_();
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
        const mapRemovalButton = evt.target.closest('[data-map-removal-select]');
        if (mapRemovalButton) {
          evt.stopPropagation();
          toggleRegistryRowMapRemovalSelection_(Number(mapRemovalButton.getAttribute('data-map-removal-select')));
          return;
        }
        const sharedWorkBatchButton = evt.target.closest('[data-shared-work-batch-select]');
        if (sharedWorkBatchButton) {
          evt.stopPropagation();
          toggleRegistryRowSharedWorkBatchSelection_(Number(sharedWorkBatchButton.getAttribute('data-shared-work-batch-select')));
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
        const publishInspectorToggle = evt.target.closest('[data-row-publish-inspector-toggle]');
        if (publishInspectorToggle) {
          evt.preventDefault();
          evt.stopPropagation();
          toggleSelectionPublishRowInspectorPicker_(String(publishInspectorToggle.getAttribute('data-row-publish-inspector-toggle') || ''));
          return;
        }
        const publishInspectorClose = evt.target.closest('[data-row-publish-inspector-close]');
        if (publishInspectorClose) {
          evt.preventDefault();
          evt.stopPropagation();
          closeSelectionPublishRowInspectorPicker_();
          return;
        }
        const publishInspectorOption = evt.target.closest('[data-row-publish-inspector-option]');
        if (publishInspectorOption) {
          evt.preventDefault();
          evt.stopPropagation();
          toggleSelectionPublishInspectorNameForObject_(
            String(publishInspectorOption.getAttribute('data-row-publish-inspector-option') || ''),
            String(publishInspectorOption.getAttribute('data-row-publish-inspector-name') || '')
          );
          return;
        }
        if (evt.target.closest('[data-row-publish-inspector-cell]')) {
          evt.stopPropagation();
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
      const analyticsView = el('analyticsView');
      const objectView = el('objectView');
      const registryTableWrap = document.querySelector('.registry-table-wrap');
      if (workspace && typeof workspace.scrollTo === 'function') workspace.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (analyticsView && typeof analyticsView.scrollTo === 'function') analyticsView.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (objectView && typeof objectView.scrollTo === 'function') objectView.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (registryTableWrap && typeof registryTableWrap.scrollTo === 'function') registryTableWrap.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      window.scrollTo(0, 0);
    }

    function openAnalyticsDashboardView_(options) {
      const settings = options || {};
      state.analyticsSection = normalizeAnalyticsSection_(settings.section || state.analyticsSection);
      state.sidebarExpanded = true;
      state.sidebarActivePanel = 'analytics';
      state.currentView = 'analytics';
      renderAll_();
      scrollWorkspaceToTop_();
      const ready = typeof ensureAnalyticsFeatureReady_ === 'function'
        ? ensureAnalyticsFeatureReady_()
        : Promise.resolve();
      const loader = Promise.resolve(ready).then(() => {
        renderAll_();
        scrollWorkspaceToTop_();
        if (state.analyticsSection === 'ksg') return state.analyticsDashboard;
        const shouldLoad = !!settings.force || !state.analyticsLoadedOnce;
        return !shouldLoad
          ? Promise.resolve(state.analyticsDashboard)
          : (
              settings.force
                ? loadAnalyticsDashboard_({ force: true, silent: !!settings.silent })
                : ensureAnalyticsDashboardLoaded_({ silent: !!settings.silent })
            );
      });
      return loader.catch(() => {
        renderAll_();
      });
    }

    function switchWorkspaceView_(viewKey) {
      const nextView = normalizeWorkspaceView_(viewKey);
      if (nextView === 'analytics') {
        openAnalyticsDashboardView_({ section: state.analyticsSection });
        return;
      }
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
      if (nextView === 'registry') state.sidebarActivePanel = 'registry';
      renderAll_();
      scrollWorkspaceToTop_();
    }

    function toggleSidebarExpanded_() {
        const sidebar = el('appSidebar');
        if (sidebar && sidebar.__sidebarShellTimer) {
          clearTimeout(sidebar.__sidebarShellTimer);
          sidebar.__sidebarShellTimer = 0;
        }
        if (sidebar) {
          sidebar.classList.remove('is-shell-collapsing');
          sidebar.classList.remove('is-shell-expanding');
        }
        const nextExpanded = !state.sidebarExpanded;
        if (!nextExpanded) {
          closeQuickPresetMenus_();
          closeRegistryFilterMenus_();
          closeRegistryColumnsPanel_();
        }
        state.sidebarExpanded = nextExpanded;
        renderNavState_();
        persistRegistrySessionState_();
        if (sidebar && !prefersReducedMotion_()) {
          const animationClass = nextExpanded ? 'is-shell-expanding' : 'is-shell-collapsing';
          sidebar.classList.add(animationClass);
          sidebar.__sidebarShellTimer = window.setTimeout(() => {
            sidebar.classList.remove('is-shell-collapsing');
            sidebar.classList.remove('is-shell-expanding');
            sidebar.__sidebarShellTimer = 0;
          }, nextExpanded ? 150 : 130);
        }
      }

    function prefersReducedMotion_() {
      try {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      } catch (e) {
        return false;
      }
    }

    function finishCollapsibleAnimation_(node, keepOpen, hiddenClass) {
      if (!node) return;
      if (node.__collapsibleTimer) {
        clearTimeout(node.__collapsibleTimer);
        node.__collapsibleTimer = 0;
      }
      node.style.transition = '';
      node.style.overflow = '';
      node.style.willChange = '';
      node.style.maxHeight = '';
      node.style.opacity = '';
      node.style.transform = '';
      node.dataset.collapsibleState = keepOpen ? 'open' : 'closed';
      node.classList.toggle(hiddenClass, !keepOpen);
    }

    function setCollapsibleOpenState_(node, shouldOpen, options) {
      if (!node) return;
      const settings = options && typeof options === 'object' ? options : {};
      const hiddenClass = String(settings.hiddenClass || 'hidden');
      const duration = Math.max(120, Number(settings.duration) || 180);
      const translateY = Math.max(0, Number(settings.translateY) || 8);
      const requestedMode = String(settings.mode || 'auto').trim().toLowerCase();
      const isHidden = node.classList.contains(hiddenClass);
      const currentState = String(node.dataset.collapsibleState || '');

      if (prefersReducedMotion_()) {
        finishCollapsibleAnimation_(node, !!shouldOpen, hiddenClass);
        return;
      }

      if (requestedMode === 'instant') {
        finishCollapsibleAnimation_(node, !!shouldOpen, hiddenClass);
        return;
      }

      if (shouldOpen) {
        if (!isHidden && currentState !== 'closing') {
          node.dataset.collapsibleState = 'open';
          return;
        }
      } else if (isHidden && currentState !== 'opening') {
        node.dataset.collapsibleState = 'closed';
        return;
      }

      if (node.__collapsibleTimer) {
        clearTimeout(node.__collapsibleTimer);
        node.__collapsibleTimer = 0;
      }

      const scrollHeight = Math.max(node.scrollHeight || 0, 0);
      const mode = requestedMode === 'fade'
        ? 'fade'
        : requestedMode === 'size'
          ? 'size'
          : (scrollHeight > 260 ? 'fade' : 'size');

      if (shouldOpen) {
        node.classList.remove(hiddenClass);
        node.dataset.collapsibleState = 'opening';
        node.style.transition = 'none';
        node.style.overflow = 'hidden';
        node.style.willChange = mode === 'fade'
          ? 'opacity, transform'
          : 'max-height, opacity, transform';
        node.style.opacity = '0';
        node.style.transform = `translateY(-${translateY}px)`;
        if (mode === 'size') {
          node.style.maxHeight = '0px';
        } else {
          node.style.maxHeight = '';
        }
        node.getBoundingClientRect();
        node.style.transition = mode === 'fade'
          ? `opacity ${Math.min(duration, 160)}ms ease, transform ${duration}ms cubic-bezier(.33,1,.68,1)`
          : `max-height ${duration}ms cubic-bezier(.33,1,.68,1), opacity ${Math.min(duration, 170)}ms ease, transform ${duration}ms cubic-bezier(.33,1,.68,1)`;
        if (mode === 'size') {
          node.style.maxHeight = `${Math.max(scrollHeight, 1)}px`;
        }
        node.style.opacity = '1';
        node.style.transform = 'translateY(0)';
        node.__collapsibleTimer = window.setTimeout(() => {
          finishCollapsibleAnimation_(node, true, hiddenClass);
        }, duration);
        return;
      }

      node.dataset.collapsibleState = 'closing';
      node.style.transition = 'none';
      node.style.overflow = 'hidden';
      node.style.willChange = mode === 'fade'
        ? 'opacity, transform'
        : 'max-height, opacity, transform';
      if (mode === 'size') {
        node.style.maxHeight = `${Math.max(scrollHeight, 1)}px`;
      } else {
        node.style.maxHeight = '';
      }
      node.style.opacity = '1';
      node.style.transform = 'translateY(0)';
      node.getBoundingClientRect();
      node.style.transition = mode === 'fade'
        ? `opacity ${Math.min(duration, 150)}ms ease, transform ${duration}ms cubic-bezier(.33,1,.68,1)`
        : `max-height ${duration}ms cubic-bezier(.33,1,.68,1), opacity ${Math.min(duration, 150)}ms ease, transform ${duration}ms cubic-bezier(.33,1,.68,1)`;
      if (mode === 'size') {
        node.style.maxHeight = '0px';
      }
      node.style.opacity = '0';
      node.style.transform = `translateY(-${translateY}px)`;
      node.__collapsibleTimer = window.setTimeout(() => {
        finishCollapsibleAnimation_(node, false, hiddenClass);
      }, duration);
    }

    function initializeSidebarBrandLogo_() {
      const logo = el('brandLogoSvg');
      const path = el('brandLogoPath');
      if (logo) logo.classList.remove('is-replaying');
      if (!path || typeof path.getTotalLength !== 'function') return;
      const length = Number(path.dataset.logoLength) || path.getTotalLength();
      path.dataset.logoLength = String(length);
      path.style.transition = '';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = '0';
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
      const snakeLength = Math.max(72, Math.round(length * 0.14));
      const eraseDuration = 520;
      const drawDuration = 640;
      path.style.transition = 'none';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = '0';
      path.getBoundingClientRect();
      sidebarBrandLogoReplayTimer = window.setTimeout(() => {
        path.style.transition = `stroke-dasharray ${eraseDuration}ms cubic-bezier(.65,0,.35,1), stroke-dashoffset ${eraseDuration}ms cubic-bezier(.65,0,.35,1)`;
        path.style.strokeDasharray = `${snakeLength} ${length}`;
        path.style.strokeDashoffset = `-${Math.max(0, length - snakeLength)}`;
        sidebarBrandLogoReplayTimer = 0;
        sidebarBrandLogoToggleTimer = window.setTimeout(() => {
          path.style.transition = 'none';
          path.style.strokeDasharray = `${length} ${length}`;
          path.style.strokeDashoffset = `${length}`;
          path.getBoundingClientRect();
          window.requestAnimationFrame(() => {
            path.style.transition = `stroke-dashoffset ${drawDuration}ms cubic-bezier(.33,1,.68,1)`;
            path.style.strokeDashoffset = '0';
          });
          sidebarBrandLogoToggleTimer = window.setTimeout(() => {
            if (logo) logo.classList.remove('is-replaying');
            path.style.transition = '';
            path.style.strokeDasharray = `${length} ${length}`;
            path.style.strokeDashoffset = '0';
            sidebarBrandLogoToggleTimer = 0;
            if (typeof onComplete === 'function') onComplete();
          }, drawDuration);
        }, eraseDuration);
      }, 16);
    }

    function isSidebarBrandLogoReplaying_() {
      const logo = el('brandLogoSvg');
      return !!(logo && logo.classList.contains('is-replaying'));
    }

    function initializeAuthBrandLogo_() {
      const logo = el('authBrandLogoSvg');
      const path = el('authBrandLogoPath');
      if (authBrandLogoReplayTimer) {
        clearTimeout(authBrandLogoReplayTimer);
        authBrandLogoReplayTimer = 0;
      }
      if (authBrandLogoToggleTimer) {
        clearTimeout(authBrandLogoToggleTimer);
        authBrandLogoToggleTimer = 0;
      }
      if (logo) logo.classList.remove('is-replaying');
      if (!path || typeof path.getTotalLength !== 'function') return;
      const length = Number(path.dataset.logoLength) || path.getTotalLength();
      path.dataset.logoLength = String(length);
      path.style.transition = '';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = '0';
    }

    function replayAuthBrandLogo_(onComplete) {
      const logo = el('authBrandLogoSvg');
      const path = el('authBrandLogoPath');
      if (!path || typeof path.getTotalLength !== 'function') {
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      initializeAuthBrandLogo_();
      const length = Number(path.dataset.logoLength) || path.getTotalLength();
      if (authBrandLogoReplayTimer) {
        clearTimeout(authBrandLogoReplayTimer);
        authBrandLogoReplayTimer = 0;
      }
      if (authBrandLogoToggleTimer) {
        clearTimeout(authBrandLogoToggleTimer);
        authBrandLogoToggleTimer = 0;
      }
      if (logo) logo.classList.add('is-replaying');
      const snakeLength = Math.max(72, Math.round(length * 0.14));
      const eraseDuration = 520;
      const drawDuration = 640;
      path.style.transition = 'none';
      path.style.strokeDasharray = `${length} ${length}`;
      path.style.strokeDashoffset = '0';
      path.getBoundingClientRect();
      authBrandLogoReplayTimer = window.setTimeout(() => {
        path.style.transition = `stroke-dasharray ${eraseDuration}ms cubic-bezier(.65,0,.35,1), stroke-dashoffset ${eraseDuration}ms cubic-bezier(.65,0,.35,1)`;
        path.style.strokeDasharray = `${snakeLength} ${length}`;
        path.style.strokeDashoffset = `-${Math.max(0, length - snakeLength)}`;
        authBrandLogoReplayTimer = 0;
        authBrandLogoToggleTimer = window.setTimeout(() => {
          path.style.transition = 'none';
          path.style.strokeDasharray = `${length} ${length}`;
          path.style.strokeDashoffset = `${length}`;
          path.getBoundingClientRect();
          window.requestAnimationFrame(() => {
            path.style.transition = `stroke-dashoffset ${drawDuration}ms cubic-bezier(.33,1,.68,1)`;
            path.style.strokeDashoffset = '0';
          });
          authBrandLogoToggleTimer = window.setTimeout(() => {
            if (logo) logo.classList.remove('is-replaying');
            path.style.transition = '';
            path.style.strokeDasharray = `${length} ${length}`;
            path.style.strokeDashoffset = '0';
            authBrandLogoToggleTimer = 0;
            if (typeof onComplete === 'function') onComplete();
          }, drawDuration);
        }, eraseDuration);
      }, 16);
    }

    function setAuthLoadingUi_(isLoading) {
      const card = el('authCard');
      const button = el('btnAuthLogin');
      if (card) card.classList.toggle('is-loading', !!isLoading);
      if (button) button.classList.toggle('is-loading', !!isLoading);
      if (isLoading) replayAuthBrandLogo_();
      else initializeAuthBrandLogo_();
    }

    function handleSidebarNavigation_(panelKey) {
      const nextPanel = normalizeSidebarPanel_(panelKey);
      if (nextPanel === 'analytics') {
        openAnalyticsDashboardView_({ section: state.analyticsSection });
        return;
      }
      const activePanel = normalizeSidebarPanel_(state.sidebarActivePanel);
      const isSamePanel = nextPanel === activePanel;
      const shouldOnlyExpand = !isCompactSidebarViewport_() && !state.sidebarExpanded;
      state.sidebarExpanded = true;
      if (shouldOnlyExpand) {
        state.sidebarActivePanel = nextPanel;
        if (nextPanel === 'registry') state.registrySidebarPanelOpen = true;
        if (nextPanel === 'registry') state.currentView = 'registry';
        renderAll_();
        if (nextPanel === 'registry') scrollWorkspaceToTop_();
        return;
      }
      if (nextPanel === 'registry') {
        state.sidebarActivePanel = 'registry';
        if (state.currentView === 'registry' && isSamePanel) {
          state.registrySidebarPanelOpen = !state.registrySidebarPanelOpen;
        } else {
          state.registrySidebarPanelOpen = true;
        }
        state.currentView = 'registry';
      } else {
        state.sidebarActivePanel = isSamePanel ? 'registry' : nextPanel;
      }
      renderAll_();
      if (nextPanel === 'registry') scrollWorkspaceToTop_();
    }

    function switchRegistryDataMode_(mode) {
      const nextMode = normalizeRegistryDataMode_(mode);
      if (nextMode === normalizeRegistryDataMode_(state.registryDataMode) && !state.runtimeErrorMessage) return;
      clearAllObjectEditingState_();
      disableAdminRegistryEditMode_();
      state.registryDataMode = nextMode;
      state.selectedRowIndex = -1;
      state.objectTabRowIndexes = [];
      state.activeRegistrySelectionId = '';
      state.activeRegistrySelectionBaseRowIndexes = null;
      state.selectionDraftSourceId = '';
      state.columns = [];
      state.rows = [];
      state.rowObjectIds = [];
      state.monitoringOverlayByObjectKey = {};
      state.registryMapOverlayByObjectKey = {};
      state.monitoringHistoryByObjectKey = {};
      state.monitoringHistoryLoadingObjectKey = '';
      state.monitoringHistoryErrorsByObjectKey = {};
      state.selectionPublishingId = '';
      state.selectionPublishDraftOpen = false;
      state.selectionPublishDraftSelectionId = '';
      state.selectionPublishInspectorNames = [];
      state.selectionPublishInspectorPickerOpen = false;
      state.selectionPublishInspectorNamesByObjectKey = {};
      state.selectionPublishRowInspectorPickerKey = '';
      state.selectionPublishExtraVisits = '0';
      state.mapPublishInspectors = [];
      state.mapPublishInspectorsLoaded = false;
      state.mapPublishInspectorsLoading = false;
      state.mapPublishInspectorsError = '';
      state.mapPublishInspectorsDivisionCode = '';
      state.registryMapRemovalMode = '';
      state.registryMapRemovalPendingAction = '';
      state.registryMapRemovalSelectedByKey = {};
      state.filteredRowIndexes = [];
      state.meta = { dataset: nextMode, sheetName: 'Summary' };
      invalidateRegistryDerivedCaches_();
      state.lastDataLoadedAt = 0;
      state.registryVisibleColumnKeys = buildDefaultRegistryVisibleColumnKeys_(nextMode);
      state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      state.objectQuery = '';
      state.bulkUinText = '';
      state.registryBulkDraftText = null;
      state.registryBulkOpen = false;
      state.openRegistryFilterKey = '';
      state.registryColumnsPanelOpen = false;
      const searchInput = el('registrySearchInput');
      if (searchInput) searchInput.value = '';
      const bulkInput = el('registryBulkUinInput');
      if (bulkInput) bulkInput.value = '';
      persistRegistrySessionState_();
      loadData_({
        force: true,
        preserveSelectedRowIndex: -1,
        preserveView: 'registry'
      });
    }

    function initializeAuth_() {
      const stored = readStoredSession_();
      if (stored && stored.user && stored.sessionToken) {
        const allowedApps = Array.isArray(stored.user.allowedApps) ? stored.user.allowedApps : [];
        if (allowedApps.indexOf('site') === -1 && allowedApps.indexOf('mpro') !== -1) {
          clearCurrentUserSession_();
          clearStoredSession_();
          persistMproSessionForSwitch_(stored);
          window.location.replace(MPRO_APP_ENTRY_URL);
          return;
        }
        setCurrentUserSession_(stored.user, stored.sessionToken, stored.expiresAt || '');
        markSiteShellReady_();
        hideAuthOverlay_();
        renderAll_();
        const hydrated = hydrateUiFromBootstrapCache_(stored.sessionToken);
        loadData_(hydrated ? { silent: true } : undefined);
        return;
      }
      clearCurrentUserSession_();
      markSiteShellReady_();
      showAuthOverlay_();
    }

    function normalizeAuthIdentityInput_(value) {
      try {
        return String(value == null ? '' : value)
          .normalize('NFKC')
          .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
          .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (_error) {
        return String(value == null ? '' : value)
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    function normalizeAuthPasswordInput_(value) {
      try {
        return String(value == null ? '' : value)
          .normalize('NFKC')
          .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
          .trim();
      } catch (_error) {
        return String(value == null ? '' : value).trim();
      }
    }

    function sanitizeSessionUserMetaText_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '';
      const meaningful = text.replace(/[\?\uFFFD\s·._-]+/g, '');
      return meaningful ? text : '';
    }

    function normalizeSessionAllowedApps_(rawValue, apps) {
      const allowed = new Set(['site', 'mpro']);
      const source = Array.isArray(rawValue)
        ? rawValue
        : (typeof rawValue === 'string' ? rawValue.split(/[,\s;|]+/) : []);
      const out = [];
      source.forEach(item => {
        const code = String(item || '').trim().toLowerCase();
        if (!code || !allowed.has(code) || out.indexOf(code) !== -1) return;
        out.push(code);
      });
      if (!out.length && apps && typeof apps === 'object') {
        Object.keys(apps).forEach(key => {
          const code = String(key || '').trim().toLowerCase();
          if (!code || !allowed.has(code) || out.indexOf(code) !== -1) return;
          out.push(code);
        });
      }
      return out;
    }

    function normalizeSessionApps_(apps) {
      const source = apps && typeof apps === 'object' && !Array.isArray(apps) ? apps : {};
      const out = {};
      Object.keys(source).forEach(key => {
        const appCode = String(key || '').trim().toLowerCase();
        if (!appCode) return;
        const profile = source[key] && typeof source[key] === 'object' ? source[key] : {};
        out[appCode] = {
          role: sanitizeSessionUserMetaText_(profile.role),
          division: sanitizeSessionUserMetaText_(profile.division),
          isDefault: !!(profile.default || profile.isDefault)
        };
      });
      return out;
    }

    function normalizeSessionUser_(user) {
      if (!user || typeof user !== 'object') return null;
      const fallbackRole = sanitizeSessionUserMetaText_(user.role);
      const fallbackDivision = sanitizeSessionUserMetaText_(user.division);
      const apps = normalizeSessionApps_(user.apps);
      const allowedApps = normalizeSessionAllowedApps_(user.allowedApps || user.allowed_apps, apps);
      const defaultAppRaw = sanitizeSessionUserMetaText_(user.defaultApp || user.default_app).toLowerCase();
      const defaultApp = allowedApps.includes(defaultAppRaw) ? defaultAppRaw : (allowedApps[0] || '');
      const siteProfile = allowedApps.includes('site')
        ? (apps.site || { role: fallbackRole, division: fallbackDivision })
        : null;
      const role = siteProfile ? (siteProfile.role || fallbackRole) : fallbackRole;
      const division = siteProfile ? (siteProfile.division || fallbackDivision) : fallbackDivision;
      return {
        ...user,
        name: String(user.name || '').trim(),
        login: String(user.login || '').trim(),
        role,
        division,
        apps,
        allowedApps,
        allowed_apps: allowedApps,
        defaultApp,
        default_app: defaultApp
      };
    }

    function mergeSessionAccessMeta_(user, previousUser) {
      if (!user || typeof user !== 'object') return null;
      const previous = previousUser && typeof previousUser === 'object' ? previousUser : null;
      if (!previous) return user;
      const allowedApps = Array.isArray(user.allowedApps)
        ? user.allowedApps
        : (Array.isArray(user.allowed_apps) ? user.allowed_apps : []);
      const apps = user.apps && typeof user.apps === 'object' && !Array.isArray(user.apps)
        ? user.apps
        : null;
      if (allowedApps.length || (apps && Object.keys(apps).length)) return user;

      const previousAllowedApps = Array.isArray(previous.allowedApps)
        ? previous.allowedApps.slice()
        : (Array.isArray(previous.allowed_apps) ? previous.allowed_apps.slice() : []);
      const previousApps = previous.apps && typeof previous.apps === 'object' && !Array.isArray(previous.apps)
        ? normalizeSessionApps_(previous.apps)
        : {};
      const previousDefaultAppRaw = sanitizeSessionUserMetaText_(previous.defaultApp || previous.default_app).toLowerCase();
      const previousDefaultApp = previousAllowedApps.includes(previousDefaultAppRaw)
        ? previousDefaultAppRaw
        : (previousAllowedApps[0] || '');
      const mergedApps = { ...previousApps };
      const userRole = sanitizeSessionUserMetaText_(user.role);
      const userDivision = sanitizeSessionUserMetaText_(user.division);
      const siteAppKey = Object.keys(mergedApps).find(key => String(key || '').trim().toLowerCase() === 'site');
      if (siteAppKey) {
        const siteProfile = mergedApps[siteAppKey] && typeof mergedApps[siteAppKey] === 'object'
          ? mergedApps[siteAppKey]
          : {};
        mergedApps[siteAppKey] = {
          ...siteProfile,
          role: userRole || sanitizeSessionUserMetaText_(siteProfile.role),
          division: userDivision || sanitizeSessionUserMetaText_(siteProfile.division),
          isDefault: !!siteProfile.isDefault
        };
      }

      return {
        ...user,
        apps: mergedApps,
        allowedApps: previousAllowedApps,
        allowed_apps: previousAllowedApps.slice(),
        defaultApp: previousDefaultApp,
        default_app: previousDefaultApp
      };
    }

    async function doLogin_() {
      const loginInput = el('authLogin');
      const passwordInput = el('authPassword');
      const loginButton = el('btnAuthLogin');
      const identity = normalizeAuthIdentityInput_(loginInput && loginInput.value);
      const password = normalizeAuthPasswordInput_(passwordInput && passwordInput.value);
      if (!identity) {
        showAuthError_('Введите логин или имя');
        if (loginInput) loginInput.focus();
        return;
      }
      if (!password) {
        showAuthError_('Введите пароль');
        if (passwordInput) passwordInput.focus();
        return;
      }

      loginButton.disabled = true;
      setAuthLoadingUi_(true);
      hideAuthError_();

      try {
          const authResponse = await runServer_('auth', [{
            spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
            name: identity,
            password,
            remember: false
          }]);
        if (!authResponse || !authResponse.success || !authResponse.user || !authResponse.sessionToken) {
          throw new Error(authResponse && authResponse.error ? authResponse.error : 'Не удалось выполнить вход');
        }

        const normalizedUser = normalizeSessionUser_(authResponse.user);
        if (!normalizedUser || !Array.isArray(normalizedUser.allowedApps) || !normalizedUser.allowedApps.length) {
          throw new Error('У вас нет доступа к приложениям');
        }

        if (normalizedUser.allowedApps.indexOf('site') === -1) {
          if (normalizedUser.allowedApps.indexOf('mpro') !== -1) {
            clearStoredSession_();
            persistMproSessionForSwitch_({
              user: normalizedUser,
              sessionToken: authResponse.sessionToken,
              expiresAt: authResponse.expiresAt || ''
            });
            hideAuthOverlay_();
            window.location.replace(MPRO_APP_ENTRY_URL);
            return;
          }
          throw new Error(
            'У вас нет доступа к Portal'
          );
        }
        setCurrentUserSession_(normalizedUser, authResponse.sessionToken, authResponse.expiresAt || '');
        persistSession_({
          user: normalizedUser,
          sessionToken: authResponse.sessionToken,
          expiresAt: authResponse.expiresAt || ''
        });
        hideAuthOverlay_();
        renderAll_();

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
        setAuthLoadingUi_(false);
      }
    }

    function logout_() {
      clearStoredSession_();
      clearCurrentUserSession_();
      showAuthOverlay_();
      renderAll_();
    }

    function setCurrentUserSession_(user, token, expiresAt) {
      const nextToken = String(token || '').trim();
      const normalizedUser = normalizeSessionUser_(user);
      const effectiveUser = normalizedUser && nextToken && nextToken === state.sessionToken
        ? mergeSessionAccessMeta_(normalizedUser, state.currentUser)
        : normalizedUser;
      state.currentUser = effectiveUser ? { ...effectiveUser } : null;
      state.sessionToken = nextToken;
      state.sessionExpiresAt = String(expiresAt || '').trim();
      state.selectionDoneById = loadSelectionDoneState_();
      migrateLegacySelectionDoneState_();
      if (state.currentUser && state.sessionToken) {
        persistSession_({
          user: state.currentUser,
          sessionToken: state.sessionToken,
          expiresAt: state.sessionExpiresAt || ''
        });
      }
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
      state.selectionPublishingId = '';
      resetRegistrySelectionComposerTransientState_();
      disableAdminRegistryEditMode_();
      state.columns = [];
      state.rows = [];
      state.rowObjectIds = [];
      state.monitoringOverlayByObjectKey = {};
      state.registryMapOverlayByObjectKey = {};
      state.registryMapRemovalMode = '';
      state.registryMapRemovalPendingAction = '';
      state.registryMapRemovalSelectedByKey = {};
      state.selectionPublishInspectorNames = [];
      state.selectionPublishInspectorPickerOpen = false;
      state.selectionPublishInspectorNamesByObjectKey = {};
      state.selectionPublishRowInspectorPickerKey = '';
      state.selectionPublishExtraVisits = '0';
      state.mapPublishInspectors = [];
      state.mapPublishInspectorsLoaded = false;
      state.mapPublishInspectorsLoading = false;
      state.mapPublishInspectorsError = '';
      state.mapPublishInspectorsDivisionCode = '';
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
        syncMproNavButtonUi_();
        syncExportSummaryButtonUi_();
        syncGoogleSheetButtonUi_();
        return;
      }
      nameNode.textContent = String(user.name || 'Пользователь');
      const role = sanitizeSessionUserMetaText_(user.role) || 'Пользователь';
      const division = sanitizeSessionUserMetaText_(user.division);
      roleNode.textContent = division ? `${role} · ${division}` : role;
      card.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
      syncMproNavButtonUi_();
      if (exportButton) exportButton.classList.remove('hidden');
      if (syncGoogleButton) syncGoogleButton.classList.remove('hidden');
      syncExportSummaryButtonUi_();
      syncGoogleSheetButtonUi_();
    }

    function getCurrentUserAllowedApps_() {
      const user = state.currentUser;
      const source = Array.isArray(user && user.allowedApps)
        ? user.allowedApps
        : (Array.isArray(user && user.allowed_apps) ? user.allowed_apps : []);
      return source
        .map(code => String(code || '').trim().toLowerCase())
        .filter((code, index, all) => code && all.indexOf(code) === index);
    }

    function getCurrentUserAppProfile_(appCode) {
      const code = String(appCode || '').trim().toLowerCase();
      if (!code) return null;
      const apps = state.currentUser && state.currentUser.apps && typeof state.currentUser.apps === 'object'
        ? state.currentUser.apps
        : null;
      if (!apps) return null;
      if (apps[code] && typeof apps[code] === 'object') return apps[code];
      const matchedKey = Object.keys(apps).find(key => String(key || '').trim().toLowerCase() === code);
      return matchedKey ? apps[matchedKey] : null;
    }

    function hasCurrentUserAppAccess_(appCode) {
      const code = String(appCode || '').trim().toLowerCase();
      if (!code || !state.currentUser || !state.sessionToken) return false;
      if (getCurrentUserAllowedApps_().includes(code)) return true;
      return !!getCurrentUserAppProfile_(code);
    }

    function syncMproNavButtonUi_() {
      const button = el('btnNavMpro');
      if (!button) return;
      const navItem = button.closest('.nav-item');
      const hasSession = !!(state.currentUser && state.sessionToken);
      const canOpenMpro = hasSession && hasCurrentUserAppAccess_('mpro');
      const title = !hasSession
        ? 'Войдите в систему'
        : canOpenMpro
          ? 'Открыть карту'
          : 'Нет доступа к карте';
      if (navItem) navItem.classList.toggle('hidden', !canOpenMpro);
      else button.classList.toggle('hidden', !canOpenMpro);
      button.disabled = !canOpenMpro;
      button.title = title;
      button.setAttribute('aria-label', title);
    }

    function buildCrossAppSessionPayload_() {
      if (!state.currentUser || !state.sessionToken) return null;
      return {
        user: state.currentUser,
        sessionToken: state.sessionToken,
        expiresAt: state.sessionExpiresAt || ''
      };
    }

    function persistMproSessionForSwitch_(sessionPayload) {
      if (!sessionPayload || !sessionPayload.user || !sessionPayload.sessionToken) return;
      const payload = JSON.stringify({
        user: sessionPayload.user,
        sessionToken: String(sessionPayload.sessionToken || ''),
        expiresAt: String(sessionPayload.expiresAt || '')
      });
      try {
        window.sessionStorage.setItem(MPRO_SESSION_STORAGE_KEY, payload);
        window.localStorage.removeItem(MPRO_SESSION_PERSIST_STORAGE_KEY);
      } catch (e) {}
    }

    function openCrossAppView_(appCode) {
      const code = String(appCode || '').trim().toLowerCase();
      if (!code || code === 'site') return;

      if (code === 'mpro') {
        if (!hasCurrentUserAppAccess_('mpro')) {
          showCopyToast_('Нет доступа к карте', true);
          return;
        }
        const sessionPayload = buildCrossAppSessionPayload_();
        if (!sessionPayload) {
          showCopyToast_('Не удалось подготовить сессию для перехода', true);
          return;
        }
        persistMproSessionForSwitch_(sessionPayload);
        window.location.href = MPRO_APP_ENTRY_URL;
      }
    }

    function showAuthOverlay_(message) {
      const overlay = el('authOverlay');
      if (overlay) overlay.classList.remove('hidden');
      if (message) showAuthError_(message);
      else hideAuthError_();
      setAuthLoadingUi_(false);
      const loginInput = el('authLogin');
      if (loginInput) loginInput.value = '';
      const passwordInput = el('authPassword');
      if (passwordInput) passwordInput.value = '';
      window.setTimeout(() => {
        if (loginInput) loginInput.focus();
      }, 20);
    }

    function hideAuthOverlay_() {
      const overlay = el('authOverlay');
      if (overlay) overlay.classList.add('hidden');
      setAuthLoadingUi_(false);
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
      const monitoringOverlay = payload.monitoringOverlay && typeof payload.monitoringOverlay === 'object'
        ? payload.monitoringOverlay
        : { rows: [] };
      const mapOverlay = payload.mapOverlay && typeof payload.mapOverlay === 'object'
        ? payload.mapOverlay
        : { rows: [] };
      const sharedSelections = Array.isArray(payload.sharedSelections) ? payload.sharedSelections : state.sharedRegistrySelections;
      const sharedSelectionWork = payload.sharedSelectionWork && typeof payload.sharedSelectionWork === 'object'
        ? payload.sharedSelectionWork
        : buildCurrentSharedSelectionWorkSnapshot_();
      try {
        window.sessionStorage.setItem(SHELL_BOOTSTRAP_CACHE_STORAGE_KEY, JSON.stringify({
          sessionToken: state.sessionToken,
          dataset: normalizeRegistryDataMode_(state.registryDataMode),
          cachedAt: new Date().toISOString(),
          monitoringOverlay,
          mapOverlay,
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
        const normalizedUser = normalizeSessionUser_(parsed.user);
        if (!normalizedUser || !Array.isArray(normalizedUser.allowedApps) || !normalizedUser.allowedApps.length) {
          return null;
        }
        return {
          user: normalizedUser,
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
      state.registryDataMode = normalizeRegistryDataMode_(dataPayload.dataset || state.registryDataMode);
      state.columns = (Array.isArray(dataPayload.columns) ? dataPayload.columns : []).map((column, idx) => makeColumnMeta_(column, idx));
      state.rows = (Array.isArray(dataPayload.rows) ? dataPayload.rows : []).map(row => (
        Array.isArray(row) ? row.map(value => String(value == null ? '' : value).trim()) : []
      ));
      state.rowObjectIds = (Array.isArray(dataPayload.objectIds) ? dataPayload.objectIds : []).map(value => String(value == null ? '' : value).trim());
      invalidateRegistryDerivedCaches_();
      state.meta = dataPayload;
      if (dataPayload.currentUser) setCurrentUserSession_(dataPayload.currentUser, state.sessionToken, state.sessionExpiresAt);
      state.truncated = !!dataPayload.truncated;
      state.lastDataLoadedAt = Date.now();
    }

    function normalizeMonitoringObjectKey_(value) {
      return normalizeText_(String(value == null ? '' : value).trim());
    }

    function normalizeMonitoringOverlayPayload_(payload) {
      const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
      const map = {};
      rows.forEach(item => {
        const objectId = String(item && item.objectId || '').trim();
        const objectKey = normalizeMonitoringObjectKey_(objectId);
        if (!objectKey) return;
        map[objectKey] = {
          objectId,
          monitoringDate: String(item && item.monitoringDate || '').trim(),
          inspector: String(item && item.inspector || '').trim(),
          anoSmgCode: String(item && item.anoSmgCode || '').trim(),
          checklistUrl: String(item && item.checklistUrl || '').trim(),
          yandexDiskUrl: String(item && item.yandexDiskUrl || '').trim(),
          photosUrl: String(item && item.photosUrl || '').trim(),
          monitoringCount: Number(item && item.monitoringCount) || 0,
          lastDeniedAccessDate: String(item && item.lastDeniedAccessDate || '').trim(),
          lastDeniedAccessInspector: String(item && item.lastDeniedAccessInspector || '').trim(),
          hasLaterDeniedAccess: !!(item && item.hasLaterDeniedAccess)
        };
      });
      return map;
    }

function applyMonitoringOverlayPayload_(payload) {
      state.monitoringOverlayByObjectKey = normalizeMonitoringOverlayPayload_(payload);
      invalidateRegistryDerivedCaches_();
    }

    function normalizeRegistryMapOverlayEntry_(item) {
      const objectId = String(item && item.objectId || '').trim();
      if (!objectId) return null;
      const normalizeDivision = typeof normalizeMproDivisionCode_ === 'function'
        ? normalizeMproDivisionCode_
        : value => String(value || '').trim();
      return {
        objectId,
        divisionCode: normalizeDivision(item && item.divisionCode || ''),
        visitId: String(item && item.visitId || '').trim(),
        visitStatus: String(item && item.visitStatus || '').trim(),
        inspector: String(item && item.inspector || item && item.inspectorName || '').trim(),
        routeListName: String(item && item.routeListName || '').trim(),
        visitDate: String(item && item.visitDate || '').trim()
      };
    }

    function normalizeRegistryMapOverlayEntries_(rawValue) {
      return (
        Array.isArray(rawValue)
          ? rawValue
          : (rawValue && typeof rawValue === 'object' ? [rawValue] : [])
      )
        .map(normalizeRegistryMapOverlayEntry_)
        .filter(Boolean)
        .sort(compareRegistryMapOverlayEntries_);
    }

    function getRegistryMapOverlayEntrySortTime_(entry) {
      const time = Date.parse(String(entry && entry.visitDate || '').trim());
      return Number.isFinite(time) ? time : 0;
    }

    function compareRegistryMapOverlayEntries_(left, right) {
      const leftEntry = left && typeof left === 'object' ? left : {};
      const rightEntry = right && typeof right === 'object' ? right : {};
      const divisionCompare = String(leftEntry.divisionCode || '').localeCompare(String(rightEntry.divisionCode || ''), 'ru');
      if (divisionCompare) return divisionCompare;
      const timeCompare = getRegistryMapOverlayEntrySortTime_(rightEntry) - getRegistryMapOverlayEntrySortTime_(leftEntry);
      if (timeCompare) return timeCompare;
      const inspectorCompare = String(leftEntry.inspector || '').localeCompare(String(rightEntry.inspector || ''), 'ru');
      if (inspectorCompare) return inspectorCompare;
      return String(leftEntry.visitId || '').localeCompare(String(rightEntry.visitId || ''), 'ru');
    }

    function buildRegistryMapOverlayEntryKey_(entry) {
      const item = normalizeRegistryMapOverlayEntry_(entry);
      if (!item) return '';
      if (item.visitId) return `visit:${item.visitId}`;
      return [
        normalizeMonitoringObjectKey_(item.objectId),
        String(item.divisionCode || ''),
        normalizeText_(item.inspector || ''),
        String(item.visitDate || ''),
        normalizeText_(item.routeListName || ''),
        normalizeText_(item.visitStatus || '')
      ].join('|');
    }

    function mergeRegistryMapOverlayEntryIntoMap_(targetMap, entry) {
      const normalizedEntry = normalizeRegistryMapOverlayEntry_(entry);
      if (!normalizedEntry) return targetMap;
      const objectKey = normalizeMonitoringObjectKey_(normalizedEntry.objectId);
      if (!objectKey) return targetMap;
      const currentEntries = normalizeRegistryMapOverlayEntries_(targetMap && targetMap[objectKey]);
      const nextEntryKey = buildRegistryMapOverlayEntryKey_(normalizedEntry);
      let replaced = false;
      const nextEntries = currentEntries.map(currentEntry => {
        if (!nextEntryKey || buildRegistryMapOverlayEntryKey_(currentEntry) !== nextEntryKey) return currentEntry;
        replaced = true;
        return normalizedEntry;
      });
      if (!replaced) nextEntries.push(normalizedEntry);
      targetMap[objectKey] = nextEntries.sort(compareRegistryMapOverlayEntries_);
      return targetMap;
    }

    function upsertRegistryMapOverlayEntry_(entry) {
      mergeRegistryMapOverlayEntryIntoMap_(state.registryMapOverlayByObjectKey, entry);
      invalidateRegistryDerivedCaches_();
    }

    function normalizeRegistryMapOverlayPayload_(payload) {
      const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
      const map = {};
      rows.forEach(item => {
        mergeRegistryMapOverlayEntryIntoMap_(map, item);
      });
      return map;
    }

    function applyRegistryMapOverlayPayload_(payload) {
      state.registryMapOverlayByObjectKey = normalizeRegistryMapOverlayPayload_(payload);
      invalidateRegistryDerivedCaches_();
    }

    function buildMonitoringOverlayEntryFromHistoryRows_(objectId, rows, fallbackOverlay) {
      const historyRows = Array.isArray(rows) ? rows : [];
      const fallback = fallbackOverlay && typeof fallbackOverlay === 'object' ? fallbackOverlay : {};
      const objectIdText = String(objectId || fallback.objectId || '').trim();
      if (!objectIdText && !historyRows.length) return null;

      let latestSuccess = null;
      let latestDenied = null;

      historyRows.forEach(item => {
        const row = item && typeof item === 'object' ? item : {};
        const status = normalizeMonitoringVisitStatus_(row.visitStatus);
        const rowTime = getMonitoringDateTimestamp_(row.monitoringDate);
        const target = status === 'denied_access' ? latestDenied : latestSuccess;
        const targetTime = target ? getMonitoringDateTimestamp_(target.monitoringDate) : NaN;
        if (!target || (Number.isFinite(rowTime) && (!Number.isFinite(targetTime) || rowTime > targetTime))) {
          if (status === 'denied_access') latestDenied = row;
          else latestSuccess = row;
        }
      });

      const latestEvent = historyRows.length ? historyRows[0] : null;
      const latestEventStatus = normalizeMonitoringVisitStatus_(latestEvent && latestEvent.visitStatus);
      const successDate = String(latestSuccess && latestSuccess.monitoringDate || fallback.monitoringDate || '').trim();
      const deniedDate = String(latestDenied && latestDenied.monitoringDate || fallback.lastDeniedAccessDate || '').trim();
      const successTime = getMonitoringDateTimestamp_(successDate);
      const deniedTime = getMonitoringDateTimestamp_(deniedDate);
      const sameDayDeniedAfterSuccess = !!deniedDate && !!successDate &&
        Number.isFinite(deniedTime) &&
        Number.isFinite(successTime) &&
        deniedTime === successTime &&
        latestEventStatus === 'denied_access';
      const hasLaterDeniedAccess = !!deniedDate && (
        (!successDate && latestEventStatus === 'denied_access') ||
        (Number.isFinite(deniedTime) && (!Number.isFinite(successTime) || deniedTime > successTime)) ||
        sameDayDeniedAfterSuccess
      );

      return {
        objectId: objectIdText,
        monitoringDate: successDate,
        inspector: String(latestSuccess && latestSuccess.inspector || fallback.inspector || '').trim(),
        anoSmgCode: String(fallback.anoSmgCode || '').trim(),
        checklistUrl: String(fallback.checklistUrl || '').trim(),
        yandexDiskUrl: String(fallback.yandexDiskUrl || '').trim(),
        photosUrl: String(latestSuccess && latestSuccess.photosUrl || fallback.photosUrl || '').trim(),
        monitoringCount: historyRows.length || Number(fallback.monitoringCount) || 0,
        lastDeniedAccessDate: deniedDate,
        lastDeniedAccessInspector: String(latestDenied && latestDenied.inspector || fallback.lastDeniedAccessInspector || '').trim(),
        hasLaterDeniedAccess
      };
    }

    function applyBootstrapPayloadToState_(payload) {
      const bootstrapPayload = payload && typeof payload === 'object' ? payload : {};
      const dataPayload = bootstrapPayload.data && typeof bootstrapPayload.data === 'object'
        ? bootstrapPayload.data
        : bootstrapPayload;
      applyDataPayloadToState_(dataPayload);
      applyMonitoringOverlayPayload_(bootstrapPayload.monitoringOverlay);
      applyRegistryMapOverlayPayload_(bootstrapPayload.mapOverlay);

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
      if (!cached) return false;
      const cachedDataset = normalizeRegistryDataMode_(
        cached.dataset ||
        cached.data && cached.data.dataset
      );
      if (cachedDataset !== normalizeRegistryDataMode_(state.registryDataMode)) return false;
      const cachedData = cached.data && typeof cached.data === 'object'
        ? cached.data
        : (
            window.SupabaseShellApi &&
            typeof window.SupabaseShellApi.peekBundleCache === 'function'
              ? window.SupabaseShellApi.peekBundleCache({
                  sessionToken,
                  dataset: cachedDataset
                })
              : null
          );
      if (!cachedData) return false;
      applyBootstrapPayloadToState_({
        ...cached,
        data: cachedData
      });
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
      const config = window.SUPABASE_MPRO_CONFIG && typeof window.SUPABASE_MPRO_CONFIG === 'object'
        ? window.SUPABASE_MPRO_CONFIG
        : {};
      const baseUrl = String(config.supabaseUrl || '').trim();
      const anonKey = String(config.supabaseAnonKey || '').trim();
      if (!baseUrl || !anonKey) {
        setRuntimeError_('Не настроено подключение к Supabase.');
        return Promise.resolve(null);
      }
      clearRuntimeError_();
      return Promise.resolve(null);
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

    function fetchObjectMonitoringHistory_(objectId) {
      return runServer_('getSmartFilterShellObjectMonitoringHistory', [{
        objectId: String(objectId || '').trim()
      }]).then(result => (result && typeof result === 'object' ? result : { rows: [] }));
    }

    function fetchObjectLabStudiesHistory_(objectId) {
      return runServer_('getSmartFilterShellObjectLabStudiesHistory', [{
        objectId: String(objectId || '').trim()
      }]).then(result => (result && typeof result === 'object' ? result : { rows: [] }));
    }

    function fetchLabStudyInspectors_() {
      return runServer_('getSmartFilterShellLabStudyInspectors', [{}]).then(result => (
        result && typeof result === 'object' ? result : { rows: [] }
      ));
    }

    function fetchMproInspectorDirectory_() {
      return runServer_('getSmartFilterShellMproInspectorDirectory', [{}]).then(result => (
        result && typeof result === 'object'
          ? result
          : { inspectorsList: [], inspectorsConfig: {}, inspectorsHomes: {} }
      ));
    }

    function createLabStudy_(payload) {
      return runServer_('createSmartFilterShellLabStudy', [payload && typeof payload === 'object' ? payload : {}]).then(result => (
        result && typeof result === 'object' ? result : { success: false }
      ));
    }

    function publishSelectionToMpro_(selection, rowIndexes, mode, publishOptions) {
      const item = selection || getActiveRegistrySelection_();
      const rows = Array.isArray(rowIndexes) ? rowIndexes.slice() : [];
      const mproProfile = typeof getCurrentUserAppProfile_ === 'function'
        ? getCurrentUserAppProfile_('mpro')
        : null;
      const rawTargetDivision = String(
        (mproProfile && mproProfile.division) ||
        (state.currentUser && state.currentUser.division) ||
        ''
      ).trim() || 'map';
      const targetDivision = typeof normalizeMproDivisionCode_ === 'function'
        ? (normalizeMproDivisionCode_(rawTargetDivision) || rawTargetDivision)
        : rawTargetDivision;
      const extraOptions = publishOptions && typeof publishOptions === 'object'
        ? { ...publishOptions }
        : {};
      return runServer_('publishSmartFilterShellSelectionToMpro', [{
        selectionId: String(item && item.id || '').trim(),
        selectionName: String(item && item.name || '').trim(),
        targetDivision,
        divisionCode: targetDivision,
        mode: String(mode || 'append').trim() || 'append',
        rowIndexes: rows,
        ...extraOptions
      }]).then(result => (result && typeof result === 'object' ? result : { success: true }));
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
        isRegistrySelectionEditing_() ||
        isRegistryMapRemovalMode_() ||
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


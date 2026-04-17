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
        syncRegistryMapAccessState_();
        syncLabStudyCreateAccessState_();
        renderNavState_();
        if (typeof window.renderAnalyticsPanel_ === 'function') window.renderAnalyticsPanel_();
        syncRegistryDatasetButtonsUi_();
        syncExportSummaryButtonUi_();
        syncGoogleSheetButtonUi_();
        renderQuickPresetState_();
        renderSavedSelectionsPanel_();
        renderWorkspaceTabs_();
        renderRegistryView_();
        if (typeof window.renderAnalyticsView_ === 'function') window.renderAnalyticsView_();
        renderAdminRegistryCreateDialog_();
        renderObjectView_();
        renderLabStudyCreateDialog_();
        persistRegistrySessionState_();
      } catch (error) {
        reportRuntimeError_(error, 'Ошибка интерфейса');
      }
    }

function renderRegistryInteraction_(options) {
      const settings = options && typeof options === 'object' ? options : {};
      clearRuntimeError_();
      try {
        if (settings.includeSavedSelections !== false) renderSavedSelectionsPanel_();
        if (settings.includeWorkspaceTabs) renderWorkspaceTabs_();
        renderRegistryView_();
        if (settings.includeObjectView) renderObjectView_();
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
        setCollapsibleOpenState_(node, state.openPresetMenuKey === key, { duration: 170, translateY: 6 });
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
      const activePanelForUi = state.currentView === 'object' && activePanel === 'registry' ? '' : activePanel;
      const isRegistryPanelOpen = activePanelForUi === 'registry' && state.registrySidebarPanelOpen !== false;
      const expanded = !!state.sidebarExpanded;
      const visibleExpanded = expanded || isCompactSidebarViewport_();
      const panelAnimationMode = isSiteNavHydrating_() ? 'instant' : 'fade';
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
        registry: el('sidebarRegistryPanel'),
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
        const active = key === activePanelForUi;
        const expandedForButton = key === 'registry' ? isRegistryPanelOpen : active;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (button.classList.contains('nav-button-expandable')) {
          button.setAttribute('aria-expanded', expandedForButton ? 'true' : 'false');
        }
        const item = button.closest('.nav-item');
        if (item) item.classList.toggle('is-open', expandedForButton);
        });
        Object.keys(panelMap).forEach(key => {
          const panel = panelMap[key];
          if (!panel) return;
          const shouldOpen = key === 'registry' ? isRegistryPanelOpen : key === activePanelForUi;
          setCollapsibleOpenState_(panel, shouldOpen, { mode: panelAnimationMode, duration: 180, translateY: 8 });
        });
      }


// Analytics UI is loaded on demand.
function bindAnalyticsPanelEvents_() {
  document.querySelectorAll('[data-open-analytics-section]').forEach(button => {
    button.onclick = evt => {
      evt.preventDefault();
      evt.stopPropagation();
      openAnalyticsDashboardView_({
        section: String(button.getAttribute('data-open-analytics-section') || '').trim()
      });
    };
  });
}

function renderAnalyticsPanel_() {
  const panel = el('sidebarAnalyticsPanel');
  if (!panel) return;
  const analyticsActive = state.currentView === 'analytics';
  const analyticsSection = normalizeAnalyticsSection_(state.analyticsSection);
  panel.innerHTML = (
    `<section class="sidebar-section analytics-panel analytics-panel--compact">` +
      `<div class="quick-preset-grid analytics-panel-nav">` +
        `<div class="preset-row">` +
          `<button class="quick-preset${analyticsActive && analyticsSection === 'quarter1' ? ' active' : ''}" type="button" data-open-analytics-section="quarter1" aria-pressed="${analyticsActive && analyticsSection === 'quarter1' ? 'true' : 'false'}">` +
            `<span class="preset-trigger-main"><span class="preset-trigger-title">1 квартал 2026</span></span>` +
          `</button>` +
        `</div>` +
        `<div class="preset-row">` +
          `<button class="quick-preset${analyticsActive && analyticsSection === 'quarter' ? ' active' : ''}" type="button" data-open-analytics-section="quarter" aria-pressed="${analyticsActive && analyticsSection === 'quarter' ? 'true' : 'false'}">` +
            `<span class="preset-trigger-main"><span class="preset-trigger-title">2 квартал 2026</span></span>` +
          `</button>` +
        `</div>` +
        `<div class="preset-row">` +
          `<button class="quick-preset${analyticsActive && analyticsSection === 'ksg' ? ' active' : ''}" type="button" data-open-analytics-section="ksg" aria-pressed="${analyticsActive && analyticsSection === 'ksg' ? 'true' : 'false'}">` +
            `<span class="preset-trigger-main"><span class="preset-trigger-title">КСГ</span></span>` +
          `</button>` +
        `</div>` +
        `<div class="preset-row">` +
          `<button class="quick-preset${analyticsActive && analyticsSection === 'archive' ? ' active' : ''}" type="button" data-open-analytics-section="archive" aria-pressed="${analyticsActive && analyticsSection === 'archive' ? 'true' : 'false'}">` +
            `<span class="preset-trigger-main"><span class="preset-trigger-title">Архив мониторинга</span></span>` +
          `</button>` +
        `</div>` +
      `</div>` +
    `</section>`
  );
  bindAnalyticsPanelEvents_();
}

function renderAnalyticsView_() {
  const view = el('analyticsView');
  if (!view) return;
  const isActive = state.currentView === 'analytics';
  view.classList.toggle('hidden', !isActive);
  if (!isActive) return;
  const readStatus = window.__getSiteSliceGroupStatus__;
  const status = typeof readStatus === 'function' ? readStatus('analytics') : null;
  const errorText = status && status.error ? String(status.error || '') : '';
  const message = errorText || ((status && status.loading) ? 'Загрузка аналитики...' : 'Подготовка аналитики...');
  view.innerHTML = `<div class="analytics-view-message${errorText ? ' analytics-view-message--error' : ''}">${escapeHtml_(message)}</div>`;
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
      const hasSingleValue = values.length <= 1;
      const normalizedSearch = normalizeText_(searchQuery);
      const filteredValues = normalizedSearch
        ? values.filter(value => normalizeText_(value).includes(normalizedSearch))
        : values;
      return (
        (
          hasSingleValue
            ? ''
            : (
              `<div class="registry-filter-tools">` +
                `<button class="registry-filter-all${allSelected ? ' active' : ''}" type="button" data-registry-filter-all="${escapeHtml_(def.key)}">` +
                  `<span class="registry-filter-option-mark" aria-hidden="true"></span>` +
                  `<span class="registry-filter-option-text">\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0432\u0441\u0435</span>` +
                `</button>` +
                `<input class="registry-filter-search" type="text" value="${escapeHtml_(searchQuery)}" placeholder="\u041f\u043e\u0438\u0441\u043a..." data-registry-filter-search="${escapeHtml_(def.key)}">` +
              `</div>`
            )
        ) +
        `<div class="registry-filter-options">` +
          (
            filteredValues.length
              ? filteredValues.map(value => (
                  `<button class="registry-filter-option${
                    (
                      hasSingleValue
                        ? (
                          Array.isArray(selection)
                            ? selection.some(item => normalizeText_(item) === normalizeText_(value))
                            : normalizeText_(selection) === normalizeText_(value)
                        )
                        : isRegistryFacetOptionSelected_(selection, value)
                    )
                      ? ' active'
                      : ''
                  }" type="button" data-registry-filter-option="${escapeHtml_(def.key)}" data-registry-filter-value="${escapeHtml_(value)}">` +
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
      const wrap = document.querySelector(`[data-registry-filter="${String(def.key || '').trim()}"]`);
      const titleNode = wrap ? wrap.querySelector('[data-role="registry-filter-title"]') : null;
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
      const isActive = isRegistryFacetSelectionActive_(def, current);
      const renderSignature = listFacet
        ? [
            String(def.key || ''),
            searchQuery,
            serializeRegistryFacetSelection_(current, def),
            values.join('\u0002')
          ].join('\u0001')
        : [String(def.key || ''), serializeRegistryFacetSelection_(current, def)].join('\u0001');
      state.registryFacetFilters[def.key] = current;
      const titleText = formatRegistryFacetHeaderText_(def);
      if (titleNode && titleNode.textContent !== titleText) {
        titleNode.textContent = titleText;
      }
      if (button) {
        const buttonTitle = isActive
          ? formatRegistryFacetActiveChipText_(def, current)
          : `Фильтр по ${def.title}`;
        button.title = buttonTitle;
        button.setAttribute('aria-label', buttonTitle);
        button.classList.toggle('has-active', isActive);
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
        if (button) {
          button.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
          button.classList.toggle('is-open', menuOpen);
        }
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

function bindSelectionPublishMenuEvents_(root) {
      const node = root;
      if (!node) return;
      node.querySelectorAll('[data-toggle-selection-publish-menu]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          toggleSelectionPublishMenu_(String(button.getAttribute('data-toggle-selection-publish-menu') || ''));
        });
      });
      node.querySelectorAll('[data-open-selection-publish-draft]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          openRegistrySelectionPublishDraft_(String(button.getAttribute('data-open-selection-publish-draft') || ''));
        });
      });
      node.querySelectorAll('[data-publish-selection-mode]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          publishRegistrySelectionById_(
            String(button.getAttribute('data-publish-selection-id') || ''),
            String(button.getAttribute('data-publish-selection-mode') || '')
          );
        });
      });
      node.querySelectorAll('[data-registry-map-removal-start]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          enterRegistryMapRemovalMode_();
        });
      });
      node.querySelectorAll('[data-registry-map-removal-toggle-all]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          closeSelectionPublishMenu_();
          toggleRegistryMapRemovalVisibleRows_();
        });
      });
      node.querySelectorAll('[data-registry-map-removal-confirm]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          closeSelectionPublishMenu_();
          removeSelectedRegistryMapObjects_();
        });
      });
      node.querySelectorAll('[data-registry-map-removal-exit]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          closeSelectionPublishMenu_();
          exitRegistryMapRemovalMode_();
        });
      });
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
        list.innerHTML = '<div class="empty-state">Пока нет выборок.</div>';
      } else {
        const groups = [];
        if (personalSelections.length) groups.push(renderSavedSelectionGroupHtml_('personal', 'Мои', personalSelections));
        if (divisionSelections.length) groups.push(renderSavedSelectionGroupHtml_(
          'division',
          'Команда',
          divisionSelections
        ));
        if (sharedSelections.length) groups.push(renderSavedSelectionGroupHtml_('shared', 'Все', sharedSelections));
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
      list.querySelectorAll('[data-edit-selection]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          editRegistrySelectionById_(String(button.getAttribute('data-edit-selection') || ''));
        });
      });
      bindSelectionPublishMenuEvents_(list);
      list.querySelectorAll('[data-remove-selection]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          removeRegistrySelectionById_(String(button.getAttribute('data-remove-selection') || ''));
        });
      });
      syncSavedSelectionsPanelChrome_();
      if (state.selectionComposerOpen) syncRegistrySelectionComposerUi_();
    }

function renderSavedSelectionGroupHtml_(groupKey, title, items) {
      const normalizedGroupKey = normalizeRegistrySelectionScope_(groupKey);
      const heading = String(title || '').trim() || 'Выборки';
      const isOpen = isSavedSelectionGroupOpen_(normalizedGroupKey);
      return (
        `<div class="saved-selection-group">` +
          `<button class="saved-selection-group-toggle" type="button" data-saved-selection-group-toggle="${escapeHtml_(normalizedGroupKey)}" aria-expanded="${isOpen ? 'true' : 'false'}">` +
            `<span class="saved-selection-group-title-wrap">` +
              `<span class="saved-selection-group-title">${escapeHtml_(heading)}</span>` +
              `<span class="saved-selection-group-count">${items.length}</span>` +
            `</span>` +
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

function renderSavedSelectionActionsHtml_(item, active, busy) {
      return '';
    }

function renderSavedSelectionItemHtml_(item) {
      const active = String(state.activeRegistrySelectionId || '') === String(item && item.id || '');
      const loading = String(state.selectionLoadingId || '') === String(item && item.id || '');
      const removing = String(state.selectionRemovingId || '') === String(item && item.id || '');
      const publishing = String(state.selectionPublishingId || '') === String(item && item.id || '');
      const busy = loading || removing || publishing;
      const name = String(item && item.name || 'Выборка').trim() || 'Выборка';
      const metaLine = buildSavedSelectionMetaLine_(item);
      const actionsHtml = renderSavedSelectionActionsHtml_(item, active, busy);
      return (
        `<div class="saved-selection${active ? ' active' : ''}${busy ? ' is-busy' : ''}${actionsHtml ? ' has-actions' : ''}">` +
          `<button class="saved-selection-main${loading ? ' is-loading' : ''}" type="button" data-load-selection="${escapeHtml_(item.id)}"${busy ? ' disabled' : ''}>` +
            `<span class="saved-selection-name" title="${escapeHtml_(name)}">${escapeHtml_(name)}</span>` +
            `<span class="saved-selection-meta" title="${escapeHtml_(metaLine)}">${escapeHtml_(metaLine)}</span>` +
          `</button>` +
          `${actionsHtml}` +
        `</div>`
      );
    }

function cancelRegistryRowsRender_() {
      registryRowsRenderToken += 1;
      if (registryRowsRenderFrame) {
        window.cancelAnimationFrame(registryRowsRenderFrame);
        registryRowsRenderFrame = 0;
      }
      const body = el('registryTableBody');
      if (body) body.__registryLoadingMore = false;
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
      state.registryVisibleColumnKeys = buildDefaultRegistryVisibleColumnKeys_(state.registryDataMode);
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
        button.title = 'Вид реестра';
        button.setAttribute('aria-label', 'Вид реестра');
        button.setAttribute('aria-pressed', state.registryColumnsPanelOpen ? 'true' : 'false');
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
        `<div class="sidebar-registry-columns-head">` +
          `<button class="ghost sidebar-registry-columns-reset" type="button" data-registry-columns-reset="1">Сбросить</button>` +
        `</div>` +
        `<div class="sidebar-registry-columns-list">` +
          availableDefs.map(def => {
            const key = String(def && def.key || '').trim();
            const active = activeKeys.has(key);
            const meta = def.required ? 'Обязательное поле' : '';
            return (
              `<button class="sidebar-registry-column-option${active ? ' active' : ''}" type="button" data-registry-column-toggle="${escapeHtml_(key)}"${def.required ? ' disabled' : ''}>` +
                `<span class="sidebar-registry-column-option-mark" aria-hidden="true"></span>` +
                `<span class="sidebar-registry-column-option-main">` +
                  `<span class="sidebar-registry-column-option-text">${escapeHtml_(def.title || 'Поле')}</span>` +
                  `${meta ? `<span class="sidebar-registry-column-option-meta">${escapeHtml_(meta)}</span>` : ''}` +
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
    }

function buildRegistryFilterHeaderHtml_(filterKey) {
      const def = getRegistryFacetDef_(filterKey);
      if (!def) return `<span class="registry-column-title">Поле</span>`;
      return (
        `<div class="registry-filter registry-filter--${escapeHtml_(def.key)}" data-registry-filter="${escapeHtml_(def.key)}">` +
          `<div class="registry-column-title-row registry-column-title-row--filter">` +
            `<span class="registry-column-title registry-filter-title" data-role="registry-filter-title">${escapeHtml_(formatRegistryFacetHeaderText_(def))}</span>` +
            `<button id="${escapeHtml_(def.buttonId)}" class="registry-filter-trigger registry-filter-trigger--compact" type="button" data-registry-filter-trigger="${escapeHtml_(def.key)}" aria-expanded="false" aria-haspopup="listbox" title="${escapeHtml_(`Фильтр по ${def.title}`)}" aria-label="${escapeHtml_(`Фильтр по ${def.title}`)}">` +
              `${getRegistryFilterIconSvgHtml_()}` +
            `</button>` +
          `</div>` +
          `<div id="${escapeHtml_(def.menuId)}" class="registry-filter-menu" role="listbox" aria-label="${escapeHtml_(`Фильтр по ${def.title}`)}"></div>` +
        `</div>`
      );
    }

function buildRegistryColumnHeaderHtml_(def) {
      if (def && def.key === 'anoSmgCode') {
        return `<span class="registry-column-title centered">${escapeHtml_(def.title || 'Поле')}</span>`;
      }
      if (def && def.key === 'uin') {
        return (
          `<div class="registry-column-title-row registry-column-title-row--uin">` +
            `<span class="registry-column-title">${escapeHtml_(def.title || 'Поле')}</span>` +
            `<button id="btnCopySelectedRegistryUins" class="ghost registry-column-copy-button" type="button" title="Скопировать выбранные УИНы" aria-label="Скопировать выбранные УИНы">` +
              `<svg class="copy-action-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">` +
                `<rect x="5.25" y="2.25" width="8.5" height="8.5" rx="1.75"></rect>` +
                `<path d="M10.75 13.75H4.5a2.25 2.25 0 0 1-2.25-2.25V5.25"></path>` +
              `</svg>` +
            `</button>` +
          `</div>`
        );
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

function syncRegistryTableHeadActions_() {
      const copyButton = el('btnCopySelectedRegistryUins');
      if (!copyButton) return;
      const items = getCurrentRegistryHeaderCopyUins_();
      const count = items.length;
      const label = count
        ? `Скопировать выбранные УИНы (${count})`
        : 'Нет выбранных УИНов для копирования';
      copyButton.disabled = !count;
      copyButton.title = label;
      copyButton.setAttribute('aria-label', label);
      copyButton.onclick = evt => {
        evt.preventDefault();
        evt.stopPropagation();
        copyCurrentRegistryHeaderUins_();
      };
    }

function getRegistryFacetCurrentSelection_(def) {
      if (!def) return null;
      if (isMonitoringDateFacetDef_(def)) {
        return normalizeMonitoringDateFacetFilter_(state.registryFacetFilters[def.key]);
      }
      if (isNumberRangeFacetDef_(def)) {
        return normalizeNumberRangeFacetFilter_(state.registryFacetFilters[def.key]);
      }
      if (isDateRangeFacetDef_(def)) {
        return normalizeDateRangeFacetFilter_(state.registryFacetFilters[def.key]);
      }
      return normalizeRegistryFacetSelection_(state.registryFacetFilters[def.key], collectRegistryFacetValuesFast_(def.key));
    }

function formatRegistryFacetActiveChipText_(def, selection) {
      if (!isRegistryFacetSelectionActive_(def, selection)) return '';
      if (isMonitoringDateFacetDef_(def)) return formatMonitoringDateFacetMeta_(selection);
      if (isNumberRangeFacetDef_(def)) return formatNumberRangeFacetMeta_(selection, def.title);
      if (isDateRangeFacetDef_(def)) return formatDateRangeFacetMeta_(selection, def.title);
      const current = Array.isArray(selection) ? selection.filter(value => String(value || '').trim()) : [];
      if (!current.length) return '';
      if (current.length === 1) return `${def.title}: ${current[0]}`;
      if (current.length === 2) return `${def.title}: ${current[0]}, ${current[1]}`;
      return `${def.title}: ${current[0]}, ${current[1]} +${current.length - 2}`;
    }

    function formatRegistryFacetHeaderText_(def) {
      if (!def) return '';
      if (String(def.key || '').trim() === 'mapPlacement') {
        const count = typeof getRegistryMapPlacementFacetCountFast_ === 'function'
          ? Math.max(0, Number(getRegistryMapPlacementFacetCountFast_()) || 0)
          : 0;
        return `${String(def.title || 'На карте').trim() || 'На карте'}: ${count ? count : '-'}`;
      }
      return String(def.title || '').trim();
    }

function buildRegistryTableStructureSignature_(visibleDefs) {
      return (Array.isArray(visibleDefs) ? visibleDefs : [])
        .map(def => [String(def && def.key || ''), String(def && def.width || ''), String(def && def.summaryKey || '')].join(':'))
        .join('|');
    }

function buildRegistryRowsRenderSignature_(rowIndexes, viewState) {
      const context = viewState || {};
      const visibleDefs = Array.isArray(context.visibleColumnDefs) ? context.visibleColumnDefs : [];
      const adminSelected = context.adminSelectionSet
        ? Array.from(context.adminSelectionSet).sort((a, b) => a - b).join(',')
        : '';
      const selectionDraft = context.selectionEditSet
        ? Array.from(context.selectionEditSet).sort().join('|')
        : '';
      const doneKeys = getSelectionDoneRowKeys_(state.activeRegistrySelectionId).join('|');
      const sharedItems = context.sharedSelectionActive
        ? Object.values(state.sharedSelectionWorkItemsByKey || {})
            .map(item => [
              normalizeText_(item && item.objectKey || ''),
              String(item && item.status || ''),
              normalizeText_(item && item.assigneeKey || ''),
              String(item && item.updatedAt || '')
            ].join(':'))
            .sort()
            .join('|')
        : '';
      const sharedPending = context.sharedSelectionActive
        ? Object.keys(state.sharedSelectionWorkPendingByKey || {})
            .sort()
            .map(key => `${key}:${state.sharedSelectionWorkPendingByKey[key]}`)
            .join('|')
        : '';
      const sharedBatch = context.sharedWorkBatchMode
        ? Object.keys(state.sharedSelectionWorkBatchSelectedByKey || {})
            .sort()
            .map(key => {
              const entry = state.sharedSelectionWorkBatchSelectedByKey[key] || {};
              return `${key}:${normalizeText_(entry.objectKey || '')}:${normalizeText_(entry.uin || '')}`;
            })
            .join('|')
        : '';
      const mapRemovalSelected = context.mapRemovalMode
        ? Object.keys(state.registryMapRemovalSelectedByKey || {})
            .sort()
            .map(key => {
              const entry = state.registryMapRemovalSelectedByKey[key] || {};
              return `${key}:${Number(entry && entry.rowIndex)}:${normalizeText_(entry && entry.uin || '')}`;
            })
            .join('|')
        : '';
      const publishAssignments = typeof getSelectionPublishInspectorAssignmentsSignature_ === 'function'
        ? String(getSelectionPublishInspectorAssignmentsSignature_() || '')
        : '';
      return [
        normalizeRegistryDataMode_(state.registryDataMode),
        String(state.lastDataLoadedAt || 0),
        String(state.activeRegistrySelectionId || ''),
        context.hasSavedSelection ? '1' : '0',
        context.sharedSelectionActive ? '1' : '0',
        context.isAdminEditing ? '1' : '0',
        context.isSelectionEditing ? '1' : '0',
        context.mapRemovalMode ? '1' : '0',
        String(context.sharedWorkBatchMode || ''),
        visibleDefs.map(def => String(def && def.key || '')).join('|'),
        (Array.isArray(rowIndexes) ? rowIndexes : []).join(','),
        adminSelected,
        selectionDraft,
        doneKeys,
        mapRemovalSelected,
        sharedItems,
        sharedPending,
        sharedBatch,
        publishAssignments,
        String(state.registryMapRemovalPendingAction || ''),
        String(state.sharedSelectionWorkBatchPendingAction || '')
      ].join('::');
    }

function syncRegistryActiveRowState_() {
      const body = el('registryTableBody');
      if (!body) return;
      const selectedRowIndex = Number(state.selectedRowIndex);
      body.querySelectorAll('tr[data-row-index]').forEach(row => {
        const rowIndex = Number(row.getAttribute('data-row-index'));
        row.classList.toggle('active', Number.isFinite(selectedRowIndex) && rowIndex === selectedRowIndex);
      });
    }

function getRegistryTableWrap_() {
      return document.querySelector('.registry-table-wrap');
    }

function bindRegistryTableWrapEvents_(wrap) {
      if (!wrap || wrap.dataset.registryLazyBound === '1') return;
      wrap.dataset.registryLazyBound = '1';
      wrap.addEventListener('scroll', () => {
        maybeRenderMoreRegistryRows_(wrap);
      }, { passive: true });
    }

function resetRegistryLazyRowsState_(body) {
      if (!body) return;
      body.__registryAllRows = [];
      body.__registryRenderContext = null;
      body.__registryRenderedCount = 0;
      body.__registryRenderToken = 0;
      body.__registryLoadingMore = false;
    }

function getRegistryInitialRenderLimit_(wrap, totalRows) {
      const total = Math.max(0, Number(totalRows) || 0);
      if (!total) return 0;
      const viewportHeight = wrap ? Math.max(320, Number(wrap.clientHeight) || 0) : 720;
      const estimatedRowHeight = 48;
      const visibleRows = Math.max(12, Math.ceil(viewportHeight / estimatedRowHeight));
      return Math.min(total, Math.max(REGISTRY_LAZY_RENDER_MIN_ROWS, visibleRows + REGISTRY_LAZY_RENDER_BUFFER_ROWS));
    }

function appendRegistryRowsRange_(body, rows, context, fromIndex, toIndex, replace) {
      if (!body) return;
      const safeRows = Array.isArray(rows) ? rows : [];
      const start = Math.max(0, Number(fromIndex) || 0);
      const end = Math.max(start, Math.min(Number(toIndex) || 0, safeRows.length));
      const chunkHtml = safeRows.slice(start, end).map(rowIndex => buildRegistryRowHtml_(rowIndex, context)).join('');
      if (replace || start === 0) body.innerHTML = chunkHtml;
      else if (chunkHtml) body.insertAdjacentHTML('beforeend', chunkHtml);
      body.__registryAllRows = safeRows;
      body.__registryRenderContext = context || {};
      body.__registryRenderedCount = end;
    }

function maybeRenderMoreRegistryRows_(wrap, options) {
      const container = wrap || getRegistryTableWrap_();
      const body = el('registryTableBody');
      if (!container || !body) return;
      const rows = Array.isArray(body.__registryAllRows) ? body.__registryAllRows : [];
      const renderedCount = Math.max(0, Number(body.__registryRenderedCount) || 0);
      if (!rows.length || renderedCount >= rows.length || body.__registryLoadingMore) return;
      const settings = options && typeof options === 'object' ? options : {};
      const remainingPixels = container.scrollHeight - (container.scrollTop + container.clientHeight);
      const needsViewportFill = container.scrollHeight <= (container.clientHeight + 32);
      const threshold = Math.max(320, Math.round(container.clientHeight * 0.9));
      if (!settings.force && !needsViewportFill && remainingPixels > threshold) return;
      const renderToken = Number(body.__registryRenderToken) || 0;
      body.__registryLoadingMore = true;
      registryRowsRenderFrame = window.requestAnimationFrame(() => {
        registryRowsRenderFrame = 0;
        if (renderToken !== registryRowsRenderToken) {
          body.__registryLoadingMore = false;
          return;
        }
        const nextCount = Math.min(rows.length, renderedCount + REGISTRY_LAZY_RENDER_BATCH);
        appendRegistryRowsRange_(body, rows, body.__registryRenderContext || {}, renderedCount, nextCount, false);
        body.__registryLoadingMore = false;
        if (nextCount < rows.length && container.scrollHeight <= (container.clientHeight + 32)) {
          maybeRenderMoreRegistryRows_(container, { force: true });
        }
      });
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
      const presentation = buildMonitoringDatePresentation_(value);
      return (
        `<span class="registry-monitoring-indicator ${escapeHtml_(presentation.bucket)}${presentation.warningTitle ? ' has-alert' : ''}" title="${escapeHtml_(presentation.title)}">` +
          `<span class="registry-monitoring-indicator-text">${escapeHtml_(presentation.displayText)}</span>` +
          (
            presentation.warningTitle
              ? `<span class="registry-monitoring-alert-mark" aria-hidden="true">!</span>`
              : ''
          ) +
        `</span>`
      );
    }

function renderRegistryCoordinatesCellHtml_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) {
        return `<span class="registry-coordinate-missing" title="Координаты не заполнены">Нет координат</span>`;
      }
      return `<span class="registry-cell-clip registry-coordinates-text" title="${escapeHtml_(text)}">${escapeHtml_(text)}</span>`;
    }

function renderMonitoringDateFieldDisplayHtml_(summaryOrValue) {
      const presentation = buildMonitoringDatePresentation_(summaryOrValue);
      if (!presentation.text) {
        return (
          `<div class="section-item-main">` +
            `<div class="section-item-display">` +
              `<div class="field-display-placeholder">Пока пусто</div>` +
            `</div>` +
          `</div>`
        );
      }
      const classes = [
        'copy-inline-text',
        'monitoring-date-field',
        presentation.warningTitle ? 'has-alert' : ''
      ].filter(Boolean).join(' ');
      return (
        `<div class="section-item-main">` +
          `<div class="section-item-display">` +
            `<button class="${escapeHtml_(classes)}" type="button" data-copy-text="${escapeHtml_(presentation.displayText)}" title="${escapeHtml_(presentation.title)}" aria-label="${escapeHtml_(presentation.title || 'Дата мониторинга')}">` +
              `<span class="field-display-text monitoring-date-field-text">${escapeHtml_(presentation.displayText)}</span>` +
              (
                presentation.warningTitle
                  ? `<span class="monitoring-date-field-alert" aria-hidden="true">!</span>`
                  : ''
              ) +
            `</button>` +
          `</div>` +
        `</div>`
      );
    }

function renderMonitoringAlertFieldDisplayHtml_(value, alertTitle) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return renderSectionFieldDisplayHtml_(value);
      const title = [text, String(alertTitle || '').trim()].filter(Boolean).join(' ');
      return (
        `<div class="section-item-main">` +
          `<div class="section-item-display">` +
            `<button class="copy-inline-text monitoring-date-field has-alert" type="button" data-copy-text="${escapeHtml_(text)}" title="${escapeHtml_(title)}" aria-label="${escapeHtml_(title || text)}">` +
              `<span class="field-display-text monitoring-date-field-text">${escapeHtml_(text)}</span>` +
              `<span class="monitoring-date-field-alert" aria-hidden="true">!</span>` +
            `</button>` +
          `</div>` +
        `</div>`
      );
    }

function renderRegistryActionButtonCellHtml_(url, label, title) {
      const href = String(url == null ? '' : url).trim();
      if (!isHttpUrl_(href)) return renderRegistryTextCellHtml_('');
      return `<a class="registry-action-link" href="${escapeHtml_(href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml_(title || label || 'Открыть ссылку')}">${escapeHtml_(label || 'Открыть')}</a>`;
    }

function renderRegistryMetricCellHtml_(planValue, factValue, options) {
      const settings = options && typeof options === 'object' ? options : {};
      const planText = String(planValue == null ? '' : planValue).trim();
      const factText = String(factValue == null ? '' : factValue).trim();
      return (
        `<div class="registry-metric-stack">` +
          renderRegistryMetricLineHtml_('План', planText) +
          renderRegistryMetricLineHtml_('Факт', factText, { alertTitle: settings.factAlertTitle }) +
        `</div>`
      );
    }

 function renderRegistryMetricLineHtml_(label, value, options) {
      const settings = options && typeof options === 'object' ? options : {};
      const alertTitle = String(settings.alertTitle || '').trim();
      const text = String(value == null ? '' : value).trim();
      const hasAlert = !!(alertTitle && text);
      const title = [text || '—', alertTitle].filter(Boolean).join(' ');
      return (
        `<div class="registry-metric-line">` +
          `<span class="registry-metric-label">${escapeHtml_(label || '')}</span>` +
          `<span class="registry-metric-value-wrap${hasAlert ? ' has-alert' : ''}" title="${escapeHtml_(title)}">` +
            `<span class="registry-metric-value${text ? '' : ' is-empty'}">${escapeHtml_(text || '—')}</span>` +
            (
              hasAlert
                ? `<span class="registry-monitoring-alert-mark registry-metric-alert-mark" aria-hidden="true">!</span>`
                : ''
            ) +
          `</span>` +
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
      const mapRemovalMode = !!rowState.mapRemovalMode;
      const isMapRemovalSelected = !!rowState.isMapRemovalSelected;
      const canSelectMapRemoval = !!rowState.canSelectMapRemoval;
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
                  `<button class="registry-row-check${isSelectionMember ? ' checked' : ''}" type="button" data-toggle-selection-draft="${rowIndex}" aria-pressed="${isSelectionMember ? 'true' : 'false'}" title="${escapeHtml_(getRegistrySelectionDraftToggleTitle_(isSelectionMember))}">` +
                    `<span class="registry-row-check-mark" aria-hidden="true"></span>` +
                  `</button>`
                )
                : mapRemovalMode
                ? (
                  `<button class="registry-row-check${isMapRemovalSelected ? ' checked' : ''}" type="button" data-map-removal-select="${rowIndex}" aria-pressed="${isMapRemovalSelected ? 'true' : 'false'}"${canSelectMapRemoval ? '' : ' disabled'} title="${
                    escapeHtml_(canSelectMapRemoval ? 'Выбрать объект для снятия с карты' : 'Этот объект сейчас не размещен на карте')
                  }">` +
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

function isRegistryCenterAlignedColumnKey_(key) {
      const normalized = String(key || '').trim();
      return [
        'dsCode',
        'status',
        'grbs',
        'customer',
        'evvYear',
        'contractor',
        'anoSmgCode',
        'coordinates',
        'inspector',
        'monitoringDate',
        'mapPlacement',
        'yandexDisk',
        'autoslider',
        'startSmrDate',
        'rv'
      ].includes(normalized);
    }

function buildRegistryInspectorPreviewText_(items) {
      const names = Array.isArray(items)
        ? items.map(value => String(value || '').trim()).filter(Boolean)
        : [];
      if (!names.length) return '';
      const preview = names.slice(0, 2).join(', ');
      return names.length > 2 ? `${preview} +${names.length - 2}` : preview;
    }

function getRegistryRowCurrentInspectorNames_(rowIndex) {
      const namesFromMap = Array.from(new Set(
        getRegistryMapOverlayEntriesForRow_(rowIndex)
          .map(entry => String(entry && (entry.inspector || entry.inspectorName) || '').trim())
          .filter(Boolean)
      ));
      if (namesFromMap.length) return namesFromMap;
      const summaryInspector = String(getRegistrySummaryValue_(rowIndex, 'inspector') || '').trim();
      return summaryInspector ? [summaryInspector] : [];
    }

function renderRegistryPublishInspectorCellHtml_(rowIndex, rowState) {
      const summary = rowState && rowState.summary ? rowState.summary : {};
      const text = String(summary.inspector || '').trim();
      return `<td class="registry-cell-center"><span class="registry-row-publish-inspector-text${text ? '' : ' is-empty'}" title="${escapeHtml_(text || 'Не назначено')}">${escapeHtml_(text || '—')}</span></td>`;
    }

function renderRegistryRowCellHtml_(rowIndex, def, context) {
      const rowState = context || {};
      const summary = rowState.summary || {};
      const centeredCellClass = def && isRegistryCenterAlignedColumnKey_(def.key) ? ' class="registry-cell-center"' : '';
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
      if (def.key === 'coordinates') {
        return `<td class="registry-cell-center">${renderRegistryCoordinatesCellHtml_(summary.coordinates)}</td>`;
      }
      if (def.key === 'monitoringDate') {
        return `<td class="registry-cell-center">${renderRegistryMonitoringDateCellHtml_(summary)}</td>`;
      }
      if (def.key === 'inspector') {
        return renderRegistryPublishInspectorCellHtml_(rowIndex, rowState);
      }
      if (def.key === 'yandexDisk') {
        return `<td class="registry-cell-center">${renderRegistryActionButtonCellHtml_(summary.yandexDiskUrl, 'Я.Диск', 'Открыть Я.Диск')}</td>`;
      }
      if (def.key === 'autoslider') {
        return `<td class="registry-cell-center">${renderRegistryActionButtonCellHtml_(summary.autosliderUrl, 'Автослайдер', 'Открыть Автослайдер')}</td>`;
      }
      if (def.key === 'constructionReadiness') {
        return `<td>${renderRegistryMetricCellHtml_(summary.constructionReadinessPlan, summary.constructionReadinessFact, { factAlertTitle: buildMonitoringRetainedMetricAlertTitle_(summary, 'Строительная готовность') })}</td>`;
      }
      if (def.key === 'peopleCount') {
        return `<td>${renderRegistryMetricCellHtml_(summary.peopleCountPlan, summary.peopleCountFact, { factAlertTitle: buildMonitoringRetainedMetricAlertTitle_(summary, 'Кол-во людей') })}</td>`;
      }
      if (def.key === 'startSmrDate') {
        return `<td${centeredCellClass}>${renderRegistryTextCellHtml_(formatRegistryDateText_(summary.startSmrDate))}</td>`;
      }
      if (def.key === 'rv') {
        return `<td${centeredCellClass}>${renderRegistryTextCellHtml_(summary.rvDisplay)}</td>`;
      }
      return `<td${centeredCellClass}>${renderRegistryTextCellHtml_(summary[def.summaryKey])}</td>`;
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
      const mapRemovalMode = !!context.mapRemovalMode;
      const isMapRemovalSelected = mapRemovalMode ? isRegistryRowSelectedForMapRemoval_(rowIndex) : false;
      const canSelectMapRemoval = mapRemovalMode ? canRegistryRowBeRemovedFromMap_(rowIndex) : false;
      const sharedWorkBatchMode = normalizeSharedSelectionWorkBatchMode_(context.sharedWorkBatchMode);
      const isSharedWorkBatchSelected = sharedWorkBatchMode ? isRegistryRowSelectedForSharedWorkBatch_(rowIndex) : false;
      const canSelectSharedWorkBatch = sharedWorkBatchMode ? isRegistryRowSelectableForSharedWorkBatch_(rowIndex, sharedWorkBatchMode, { workState }) : false;
      const rowClasses = [
        rowIndex === state.selectedRowIndex ? 'active' : '',
        isDone ? 'done' : '',
        isAdminSelected ? 'admin-selected' : '',
        isSelectionMember ? 'selection-member' : '',
        isMapRemovalSelected ? 'map-removal-selected' : '',
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
            mapRemovalMode,
            isMapRemovalSelected,
            canSelectMapRemoval,
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
        resetRegistryLazyRowsState_(body);
        body.innerHTML = '';
        return;
      }

      const wrap = getRegistryTableWrap_();
      const initialLimit = getRegistryInitialRenderLimit_(wrap, rows.length);
      const renderToken = registryRowsRenderToken;
      const total = Math.min(rows.length, initialLimit);
      let offset = 0;
      resetRegistryLazyRowsState_(body);
      body.__registryAllRows = rows;
      body.__registryRenderContext = context;
      body.__registryRenderToken = renderToken;

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
        appendRegistryRowsRange_(body, rows, context, offset, end, replace);
        offset = end;
        const hasMore = offset < total;
        if (!hasMore) {
          maybeRenderMoreRegistryRows_(wrap, { force: true });
          return;
        }
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
      bindRegistryTableWrapEvents_(getRegistryTableWrap_());
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
      const mapRemovalMode = isRegistryMapRemovalMode_();

      const body = el('registryTableBody');
      const visibleColumnDefs = getVisibleRegistryColumnDefs_();
      const structureSignature = buildRegistryTableStructureSignature_(visibleColumnDefs);
      const colCount = Math.max(visibleColumnDefs.length, 1);
      if (state.registryTableStructureSignature !== structureSignature) {
        renderRegistryTableStructure_();
        state.registryTableStructureSignature = structureSignature;
      }
      syncRegistryTableHeadActions_();
      if (!state.rows.length) {
        el('objectCountBadge').textContent = `0 ${getRegistryDatasetRowNoun_(0)}`;
        cancelRegistryRowsRender_();
        resetRegistryLazyRowsState_(body);
        state.registryRowsSignature = 'empty:data';
        body.innerHTML = `<tr><td colspan="${colCount}"><div class="empty-state">${escapeHtml_('Данные еще не загружены.')}</div></td></tr>`;
        return;
      }
      if (!state.filteredRowIndexes.length) {
        el('objectCountBadge').textContent = `0 ${getRegistryDatasetRowNoun_(0)}`;
        cancelRegistryRowsRender_();
        resetRegistryLazyRowsState_(body);
        state.registryRowsSignature = 'empty:filters';
        body.innerHTML = `<tr><td colspan="${colCount}"><div class="empty-state">${escapeHtml_('По текущим фильтрам ничего не найдено.')}</div></td></tr>`;
        return;
      }

      const visibleRowIndexes = getRegistryVisibleRowIndexes_();
      el('objectCountBadge').textContent = `${visibleRowIndexes.length} ${getRegistryDatasetRowNoun_(visibleRowIndexes.length)}`;
      if (!visibleRowIndexes.length) {
        const emptyMessage = mapRemovalMode
          ? 'По текущим фильтрам на карте нет объектов для снятия.'
          : sharedWorkBatchMode === 'take'
          ? 'Свободные объекты не найдены.'
          : sharedWorkBatchMode === 'release'
            ? 'У вас нет объектов для отмены.'
            : 'По текущим фильтрам ничего не найдено.';
        cancelRegistryRowsRender_();
        resetRegistryLazyRowsState_(body);
        state.registryRowsSignature = `empty:${mapRemovalMode ? 'map-removal' : (sharedWorkBatchMode || 'default')}`;
        body.innerHTML = `<tr><td colspan="${colCount}"><div class="empty-state">${escapeHtml_(emptyMessage)}</div></td></tr>`;
        return;
      }
      const renderContext = {
        hasSavedSelection,
        sharedSelectionActive,
        isAdminEditing,
        adminSelectionSet,
        isSelectionEditing,
        selectionEditSet,
        mapRemovalMode,
        sharedWorkBatchMode,
        visibleColumnDefs
      };
      const rowsSignature = buildRegistryRowsRenderSignature_(visibleRowIndexes, renderContext);
      if (state.registryRowsSignature !== rowsSignature) {
        renderRegistryRowsProgressively_(body, visibleRowIndexes, renderContext);
        state.registryRowsSignature = rowsSignature;
      } else {
        maybeRenderMoreRegistryRows_(getRegistryTableWrap_(), { force: false });
      }
      syncRegistryActiveRowState_();
    }

function renderAdminRegistryUi_() {
      const editButton = el('btnAdminRegistryEditMode');
      const addButton = el('btnAdminRegistryAdd');
      const deleteButton = el('btnAdminRegistryDelete');
      const actions = el('sidebarRegistryAdminActions');
      const note = el('sidebarRegistryAdminState');
      if (!editButton || !addButton || !deleteButton) return;
      const isAdmin = isCurrentUserAdmin_() && isCurrentRegistryDatasetEditable_();
      const isActive = isAdminRegistryEditMode_();
      const selectedCount = getAdminRegistrySelectedRowIndexes_().length;
      const isDeletePending = state.adminRegistryPendingAction === 'delete';
      editButton.classList.toggle('hidden', !isAdmin);
      addButton.classList.toggle('hidden', !isAdmin || !isActive);
      deleteButton.classList.toggle('hidden', !isAdmin || !isActive);
      if (actions) actions.classList.toggle('hidden', !isAdmin || !isActive);
      if (note) {
        const noteText = isDeletePending
          ? 'Удаляем выбранные объекты...'
          : (selectedCount ? `Выбрано: ${selectedCount}` : 'Можно добавлять новые объекты и удалять отмеченные строки.');
        note.classList.toggle('hidden', !isAdmin || !isActive);
        note.textContent = noteText;
      }
      editButton.classList.toggle('active', isActive);
      editButton.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      editButton.disabled = !isAdmin || state.loading || state.adminRegistryDialogSaving || isDeletePending;
      addButton.disabled = state.loading || state.adminRegistryDialogSaving || isDeletePending;
      deleteButton.disabled = state.loading || state.adminRegistryDialogSaving || isDeletePending || !selectedCount;
      addButton.title = state.adminRegistryDialogSaving ? 'Идет сохранение объекта' : 'Добавить объект';
      addButton.textContent = 'Добавить объект';
      deleteButton.textContent = selectedCount ? `Удалить выбранные (${selectedCount})` : 'Удалить выбранные строки';
      deleteButton.title = selectedCount
        ? `Удалить выбранные строки (${selectedCount})`
        : 'Сначала выберите строки';
    }

    function renderAdminRegistryEditBar_() {
      const node = el('adminRegistryEditBar');
      if (!node) return;
      node.classList.add('hidden');
      node.innerHTML = '';
    }

    function renderAdminRegistryCreateDialog_() {
      const node = el('adminRegistryDialog');
      if (!node) return;
      const isOpen = isCurrentUserAdmin_() && isCurrentRegistryDatasetEditable_() && !!state.adminRegistryDialogOpen;
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
            `<button class="ghost icon-button action-icon-button action-icon-button--danger" type="button" data-admin-registry-dialog-close="1" aria-label="Закрыть" title="Закрыть"${saving ? ' disabled' : ''}>${getCloseIconSvgHtml_('action-icon-svg')}</button>` +
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
            `<button class="ghost action-icon-button action-icon-button--danger" type="button" data-admin-registry-dialog-close="1" title="Отменить создание объекта" aria-label="Отменить создание объекта"${saving ? ' disabled' : ''}>${getCloseIconSvgHtml_('action-icon-svg')}</button>` +
            `<button class="ghost action-icon-button action-icon-button--success admin-registry-submit-button${saving ? ' is-loading' : ''}" type="button" data-admin-registry-dialog-submit="1" title="${escapeHtml_(saving ? 'Добавляю объект...' : 'Добавить объект')}" aria-label="${escapeHtml_(saving ? 'Добавляю объект...' : 'Добавить объект')}"${saving ? ' disabled' : ''}>${getCheckIconSvgHtml_('action-icon-svg')}</button>` +
          `</div>` +
        `</div>`
      );
    }

    function renderLabStudyCreateDialog_() {
      const node = el('labStudyCreateOverlay');
      if (!node) return;
      const isOpen = canCurrentUserManageLabStudies_() && isCurrentRegistryDatasetEditable_() && !!state.labStudyCreateDialogOpen;
      node.classList.toggle('hidden', !isOpen);
      node.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      if (!isOpen) {
        node.innerHTML = '';
        return;
      }
      const values = {
        ...buildEmptyLabStudyCreateFormValues_(),
        ...(state.labStudyCreateFormValues || {})
      };
      const saving = !!state.labStudyCreateDialogSaving;
      const loadingInspectors = !!state.labStudyInspectorsLoading;
      const error = String(state.labStudyCreateDialogError || '').trim();
      const inspectorsError = String(state.labStudyInspectorsError || '').trim();
      const objectTitle = String(state.labStudyCreateDialogObjectTitle || '').trim() || 'Объект';
      const inspectorOptions = Array.isArray(state.labStudyInspectors) ? state.labStudyInspectors : [];
      const selectedInspectorName = String(values.inspectorName || '').trim();
      const inspectorOptionNames = new Set(
        inspectorOptions
          .map(item => String(item && item.name || '').trim())
          .filter(Boolean)
      );
      const inspectorSelectOptions = selectedInspectorName && !inspectorOptionNames.has(selectedInspectorName)
        ? [{ name: selectedInspectorName }].concat(inspectorOptions)
        : inspectorOptions.slice();
      const inspectorPlaceholder = loadingInspectors
        ? 'Загружаю инспекторов...'
        : (inspectorsError ? 'Не удалось загрузить инспекторов' : 'Выберите инспектора');
      node.innerHTML = (
        `<div class="surface lab-study-create-dialog" role="dialog" aria-modal="true" aria-labelledby="labStudyCreateDialogTitle">` +
          `<div class="lab-study-create-head">` +
            `<div class="lab-study-create-title">` +
              `<strong id="labStudyCreateDialogTitle">Новое исследование</strong>` +
              `<span>${escapeHtml_(objectTitle)}</span>` +
            `</div>` +
            `<button class="ghost action-icon-button action-icon-button--danger" type="button" data-lab-study-create-close="1" aria-label="Закрыть" title="Закрыть"${saving ? ' disabled' : ''}>${getCloseIconSvgHtml_('action-icon-svg')}</button>` +
          `</div>` +
          (error ? `<div class="lab-study-create-error">${escapeHtml_(error)}</div>` : '') +
          `<div class="lab-study-create-grid">` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateInspector">Инспектор</label>` +
              `<select id="labStudyCreateInspector" class="field-input" data-lab-study-create-field-input="inspectorName"${saving || loadingInspectors ? ' disabled' : ''}>` +
                `<option value="">${escapeHtml_(inspectorPlaceholder)}</option>` +
                inspectorSelectOptions.map(item => {
                  const value = String(item && item.name || '').trim();
                  const selected = value === selectedInspectorName ? ' selected' : '';
                  return `<option value="${escapeHtml_(value)}"${selected}>${escapeHtml_(value)}</option>`;
                }).join('') +
              `</select>` +
            `</div>` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateType">Тип</label>` +
              `<select id="labStudyCreateType" class="field-input" data-lab-study-create-field-input="studyType"${saving ? ' disabled' : ''}>` +
                LAB_STUDY_TYPE_OPTIONS.map(item => {
                  const value = String(item || '').trim();
                  const selected = value === String(values.studyType || '').trim() ? ' selected' : '';
                  return `<option value="${escapeHtml_(value)}"${selected}>${escapeHtml_(value)}</option>`;
                }).join('') +
              `</select>` +
            `</div>` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateStart">Начало объекта</label>` +
              `<input id="labStudyCreateStart" class="field-input" type="text" placeholder="55.123456, 37.123456" value="${escapeHtml_(String(values.coordinateStartLatLon || ''))}" data-lab-study-create-field-input="coordinateStartLatLon"${saving ? ' disabled' : ''}>` +
            `</div>` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateFinish">Конец объекта</label>` +
              `<input id="labStudyCreateFinish" class="field-input" type="text" placeholder="55.123456, 37.123456" value="${escapeHtml_(String(values.coordinateFinishLatLon || ''))}" data-lab-study-create-field-input="coordinateFinishLatLon"${saving ? ' disabled' : ''}>` +
            `</div>` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateWidth">Ширина</label>` +
              `<input id="labStudyCreateWidth" class="field-input" type="text" inputmode="decimal" placeholder="14" value="${escapeHtml_(String(values.objectWidthM || ''))}" data-lab-study-create-field-input="objectWidthM"${saving ? ' disabled' : ''}>` +
            `</div>` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateLength">Длина</label>` +
              `<input id="labStudyCreateLength" class="field-input" type="text" inputmode="decimal" placeholder="420" value="${escapeHtml_(String(values.objectLengthM || ''))}" data-lab-study-create-field-input="objectLengthM"${saving ? ' disabled' : ''}>` +
            `</div>` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateTaskY">Y</label>` +
              `<input id="labStudyCreateTaskY" class="field-input" type="text" inputmode="decimal" placeholder="117" value="${escapeHtml_(String(values.taskY || ''))}" data-lab-study-create-field-input="taskY"${saving ? ' disabled' : ''}>` +
            `</div>` +
            `<div class="lab-study-create-field">` +
              `<label for="labStudyCreateTaskX">X</label>` +
              `<input id="labStudyCreateTaskX" class="field-input" type="text" inputmode="decimal" placeholder="-5.4" value="${escapeHtml_(String(values.taskX || ''))}" data-lab-study-create-field-input="taskX"${saving ? ' disabled' : ''}>` +
            `</div>` +
            `<div class="lab-study-create-field wide">` +
              `<label for="labStudyCreatePoint">Точка исследования</label>` +
              `<input id="labStudyCreatePoint" class="field-input" type="text" placeholder="55.123456, 37.123456" value="${escapeHtml_(String(values.studyLatLon || ''))}" data-lab-study-create-field-input="studyLatLon"${saving ? ' disabled' : ''}>` +
            `</div>` +
          `</div>` +
          `<div class="lab-study-create-actions">` +
            `<button class="ghost" type="button" data-lab-study-create-generate="1"${saving ? ' disabled' : ''}>Сгенерировать</button>` +
            `<div class="lab-study-create-actions-right">` +
              `<button class="ghost" type="button" data-lab-study-create-close="1"${saving ? ' disabled' : ''}>Отмена</button>` +
              `<button class="primary lab-study-create-submit${saving ? ' is-loading' : ''}" type="button" data-lab-study-create-submit="1"${saving ? ' disabled' : ''}>${escapeHtml_(saving ? 'Назначаю...' : 'Назначить')}</button>` +
            `</div>` +
          `</div>` +
        `</div>`
      );
    }

    function renderRegistrySelectionPublishPlanHtmlLegacy_(publishContext) {
      const context = publishContext && typeof publishContext === 'object' ? publishContext : null;
      if (!context) return '';
      const rawDivisionValue = typeof getCurrentUserMproDivisionValue_ === 'function'
        ? getCurrentUserMproDivisionValue_()
        : '';
      const divisionCode = normalizeMproDivisionCode_(context.divisionCode || rawDivisionValue || '');
      const divisionLabel = getMproDivisionLabel_(divisionCode || rawDivisionValue || '') || 'Без division';
      const inspectors = getCurrentDivisionMapPublishInspectors_();
      const selectedInspectorNames = getSelectionPublishInspectorNames_();
      const assignedVisitsCount = getSelectionPublishAssignedVisitCount_();
      const inspectorPickerOpen = isSelectionPublishInspectorPickerOpen_();
      const selectionPublishSingleInspectorMode = !context.isSingleObject;
      const selectedInspectorPreview = selectedInspectorNames.length
        ? `${selectedInspectorNames.slice(0, 2).join(', ')}${selectedInspectorNames.length > 2 ? ` +${selectedInspectorNames.length - 2}` : ''}`
        : 'Можно выбрать сразу нескольких инспекторов.';
      const existingInspectors = Array.from(new Set(
        (Array.isArray(context.currentDivisionEntries) ? context.currentDivisionEntries : [])
          .map(entry => String(entry && entry.inspector || '').trim())
          .filter(Boolean)
      ));
      const headerSummaryHtml = (
        `<div class="registry-selection-publish-summary">` +
          `<span class="registry-selection-publish-summary-chip">division: ${escapeHtml_(divisionLabel)}</span>` +
          (
            !context.isSingleObject
              ? `<span class="registry-selection-publish-summary-chip">выбрано объектов: ${escapeHtml_(String(context.uniqueObjectCount || 0))}</span>`
              : (
                context.primaryObject && context.primaryObject.summary && context.primaryObject.summary.name
                  ? `<span class="registry-selection-publish-summary-chip">${escapeHtml_(String(context.primaryObject.summary.name || '').trim())}</span>`
                  : ''
              )
          ) +
          `<span class="registry-selection-publish-summary-chip">${escapeHtml_(context.isSingleObject ? `уже выездов на карте: ${String(context.currentDivisionVisitCount || 0)}` : `точек на карте: ${String(context.selectedOnMapCount || 0)}`)}</span>` +
        `</div>`
      );
      if (!context.isSingleObject && !context.uniqueObjectCount) return '';
      const existingVisitsNote = context.currentDivisionVisitCount
        ? (
          existingInspectors.length
            ? `Уже есть выезды в этом division: ${context.currentDivisionVisitCount}. Инспекторы: ${existingInspectors.join(', ')}.`
            : `Уже есть выезды в этом division: ${context.currentDivisionVisitCount}.`
        )
        : 'В текущем division эта точка еще не публиковалась.';
      const pickerTriggerLabel = selectedInspectorNames.length
        ? `Выбрано инспекторов: ${selectedInspectorNames.length}`
        : 'Выбрать инспекторов';
      const inspectorsHtml = state.mapPublishInspectorsLoading
        ? `<div class="registry-selection-publish-note">Загружаем список инспекторов division...</div>`
        : state.mapPublishInspectorsError
          ? `<div class="registry-selection-publish-note registry-selection-publish-note--error">${escapeHtml_(state.mapPublishInspectorsError)}</div>`
          : inspectors.length
            ? (
              `<div class="registry-selection-publish-picker${inspectorPickerOpen ? ' is-open' : ''}">` +
                `<button class="registry-selection-publish-picker-trigger${inspectorPickerOpen ? ' is-open' : ''}" type="button" data-selection-publish-picker-toggle="1" aria-expanded="${inspectorPickerOpen ? 'true' : 'false'}">` +
                  `<span class="registry-selection-publish-picker-trigger-main">` +
                    `<span class="registry-selection-publish-picker-trigger-label">${escapeHtml_(pickerTriggerLabel)}</span>` +
                    (
                      selectedInspectorNames.length
                        ? `<span class="registry-selection-publish-picker-trigger-meta">${escapeHtml_(selectedInspectorPreview)}</span>`
                        : ''
                    ) +
                  `</span>` +
                  `<span class="registry-selection-publish-picker-caret" aria-hidden="true"></span>` +
                `</button>` +
                (
                  inspectorPickerOpen
                    ? (
                      `<div class="registry-selection-publish-picker-popover">` +
                        `<div class="registry-selection-publish-picker-head">` +
                          `<div class="registry-selection-publish-picker-title">Инспекторы «${escapeHtml_(divisionLabel)}»</div>` +
                          `<button class="registry-selection-publish-picker-close" type="button" data-selection-publish-picker-close="1">Готово</button>` +
                        `</div>` +
                        `<div class="registry-selection-publish-picker-list">` +
                          inspectors.map(item => {
                            const inspectorName = String(item && item.name || '').trim();
                            const active = selectedInspectorNames.includes(inspectorName);
                            return (
                              `<label class="registry-selection-publish-picker-option${active ? ' is-active' : ''}">` +
                                `<input class="registry-selection-publish-picker-checkbox" type="checkbox"${active ? ' checked' : ''} data-selection-publish-inspector-checkbox="${escapeHtml_(inspectorName)}">` +
                                `<span class="registry-selection-publish-picker-option-name">${escapeHtml_(inspectorName)}</span>` +
                              `</label>`
                            );
                          }).join('') +
                        `</div>` +
                      `</div>`
                    )
                    : ''
                ) +
              `</div>`
            )
            : `<div class="registry-selection-publish-note">В этом division не найдено инспекторов для назначения.</div>`;
      return (
        `<div class="registry-selection-publish-plan">` +
          headerSummaryHtml +
          `<div class="registry-selection-publish-grid">` +
            `<div class="registry-selection-publish-field">` +
              `<div class="registry-selection-publish-label">Назначенные инспекторы</div>` +
              `${inspectorsHtml}` +
            `</div>` +
            `<label class="registry-selection-publish-field">` +
              `<span class="registry-selection-publish-label">Еще выездов без назначения</span>` +
              `<input class="registry-selection-publish-number" type="number" min="0" step="1" inputmode="numeric" value="${escapeHtml_(String(state.selectionPublishExtraVisits == null ? '' : state.selectionPublishExtraVisits))}" placeholder="0" data-selection-publish-extra-visits="1">` +
            `</label>` +
          `</div>` +
          `<div class="registry-selection-publish-note">` +
            (
              totalVisits
                ? `Будет создано дополнительных выездов: ${totalVisits}.`
                : ''
            ) +
          `</div>` +
        `</div>`
      );
    }

    function renderRegistrySelectionPublishPlanHtml_(publishContext) {
      const context = publishContext && typeof publishContext === 'object' ? publishContext : null;
      if (!context) return '';
      const rawDivisionValue = typeof getCurrentUserMproDivisionValue_ === 'function'
        ? getCurrentUserMproDivisionValue_()
        : '';
      const divisionCode = normalizeMproDivisionCode_(context.divisionCode || rawDivisionValue || '');
      const divisionLabel = getMproDivisionLabel_(divisionCode || rawDivisionValue || '') || 'Без division';
      const inspectors = getCurrentDivisionMapPublishInspectors_();
      const selectedInspectorNames = getSelectionPublishInspectorNames_();
      const assignedVisitsCount = getSelectionPublishAssignedVisitCount_();
      const inspectorPickerOpen = isSelectionPublishInspectorPickerOpen_();
      const selectedInspectorPreview = selectedInspectorNames.length
        ? `${selectedInspectorNames.slice(0, 2).join(', ')}${selectedInspectorNames.length > 2 ? ` +${selectedInspectorNames.length - 2}` : ''}`
        : 'Можно выбрать сразу нескольких инспекторов.';
      const existingInspectors = Array.from(new Set(
        (Array.isArray(context.currentDivisionEntries) ? context.currentDivisionEntries : [])
          .map(entry => String(entry && entry.inspector || '').trim())
          .filter(Boolean)
      ));
      const headerSummaryHtml = (
        `<div class="registry-selection-publish-summary">` +
          `<span class="registry-selection-publish-summary-chip">division: ${escapeHtml_(divisionLabel)}</span>` +
          (
            !context.isSingleObject
              ? `<span class="registry-selection-publish-summary-chip">выбрано объектов: ${escapeHtml_(String(context.uniqueObjectCount || 0))}</span>`
              : (
                context.primaryObject && context.primaryObject.summary && context.primaryObject.summary.name
                  ? `<span class="registry-selection-publish-summary-chip">${escapeHtml_(String(context.primaryObject.summary.name || '').trim())}</span>`
                  : ''
              )
          ) +
          `<span class="registry-selection-publish-summary-chip">${escapeHtml_(context.isSingleObject ? `уже выездов на карте: ${String(context.currentDivisionVisitCount || 0)}` : `точек на карте: ${String(context.selectedOnMapCount || 0)}`)}</span>` +
        `</div>`
      );
      if (!context.isSingleObject) {
        return (
          `<div class="registry-selection-publish-plan">` +
            headerSummaryHtml +
          `</div>`
        );
      }
      const existingVisitsNote = context.currentDivisionVisitCount
        ? (
          existingInspectors.length
            ? `Уже есть выезды в этом division: ${context.currentDivisionVisitCount}. Инспекторы: ${existingInspectors.join(', ')}.`
            : `Уже есть выезды в этом division: ${context.currentDivisionVisitCount}.`
        )
        : 'В текущем division эта точка еще не публиковалась.';
      const pickerTriggerLabel = selectedInspectorNames.length
        ? `Выбрано инспекторов: ${selectedInspectorNames.length}`
        : 'Выбрать инспекторов';
      const inspectorsHtml = state.mapPublishInspectorsLoading
        ? `<div class="registry-selection-publish-note">Загружаем список инспекторов division...</div>`
        : state.mapPublishInspectorsError
          ? `<div class="registry-selection-publish-note registry-selection-publish-note--error">${escapeHtml_(state.mapPublishInspectorsError)}</div>`
          : inspectors.length
            ? (
              `<div class="registry-selection-publish-picker${inspectorPickerOpen ? ' is-open' : ''}">` +
                `<button class="registry-selection-publish-picker-trigger${inspectorPickerOpen ? ' is-open' : ''}" type="button" data-selection-publish-picker-toggle="1" aria-expanded="${inspectorPickerOpen ? 'true' : 'false'}">` +
                  `<span class="registry-selection-publish-picker-trigger-main">` +
                    `<span class="registry-selection-publish-picker-trigger-label">${escapeHtml_(pickerTriggerLabel)}</span>` +
                    (
                      selectedInspectorNames.length
                        ? `<span class="registry-selection-publish-picker-trigger-meta">${escapeHtml_(selectedInspectorPreview)}</span>`
                        : ''
                    ) +
                  `</span>` +
                  `<span class="registry-selection-publish-picker-caret" aria-hidden="true"></span>` +
                `</button>` +
                (
                  inspectorPickerOpen
                    ? (
                      `<div class="registry-selection-publish-picker-popover">` +
                        `<div class="registry-selection-publish-picker-head">` +
                          `<div class="registry-selection-publish-picker-title">Инспекторы «${escapeHtml_(divisionLabel)}»</div>` +
                          `<button class="registry-selection-publish-picker-close" type="button" data-selection-publish-picker-close="1">Готово</button>` +
                        `</div>` +
                        `<div class="registry-selection-publish-picker-list">` +
                          inspectors.map(item => {
                            const inspectorName = String(item && item.name || '').trim();
                            const active = selectedInspectorNames.includes(inspectorName);
                            return (
                              `<label class="registry-selection-publish-picker-option${active ? ' is-active' : ''}">` +
                                `<input class="registry-selection-publish-picker-checkbox" type="checkbox"${active ? ' checked' : ''} data-selection-publish-inspector-checkbox="${escapeHtml_(inspectorName)}">` +
                                `<span class="registry-selection-publish-picker-option-name">${escapeHtml_(inspectorName)}</span>` +
                              `</label>`
                            );
                          }).join('') +
                        `</div>` +
                      `</div>`
                    )
                    : ''
                ) +
              `</div>`
            )
            : `<div class="registry-selection-publish-note">В этом division не найдено инспекторов для назначения.</div>`;
      return (
        `<div class="registry-selection-publish-plan">` +
          headerSummaryHtml +
          `<div class="registry-selection-publish-grid">` +
            `<div class="registry-selection-publish-field">` +
              `${inspectorsHtml}` +
            `</div>` +
          `</div>` +
        `</div>`
      );
    }

    function renderRegistrySelectionPublishPlanHtml_(publishContext) {
      const context = publishContext && typeof publishContext === 'object' ? publishContext : null;
      if (!context || !context.uniqueObjectCount) return '';
      const rawDivisionValue = typeof getCurrentUserMproDivisionValue_ === 'function'
        ? getCurrentUserMproDivisionValue_()
        : '';
      const divisionCode = normalizeMproDivisionCode_(context.divisionCode || rawDivisionValue || '');
      const divisionLabel = getMproDivisionLabel_(divisionCode || rawDivisionValue || '') || 'Без division';
      const inspectors = getCurrentDivisionMapPublishInspectors_();
      const selectedInspectorNames = getSelectionPublishInspectorNames_();
      const inspectorPickerOpen = isSelectionPublishInspectorPickerOpen_();
      const singleInspectorMode = !context.isSingleObject;
      const selectedInspectorPreview = selectedInspectorNames.length
        ? `${selectedInspectorNames.slice(0, 2).join(', ')}${selectedInspectorNames.length > 2 ? ` +${selectedInspectorNames.length - 2}` : ''}`
        : '';
      const headerSummaryHtml = (
        `<div class="registry-selection-publish-summary">` +
          `<span class="registry-selection-publish-summary-chip">division: ${escapeHtml_(divisionLabel)}</span>` +
          (
            !context.isSingleObject
              ? `<span class="registry-selection-publish-summary-chip">выбрано объектов: ${escapeHtml_(String(context.uniqueObjectCount || 0))}</span>`
              : (
                context.primaryObject && context.primaryObject.summary && context.primaryObject.summary.name
                  ? `<span class="registry-selection-publish-summary-chip">${escapeHtml_(String(context.primaryObject.summary.name || '').trim())}</span>`
                  : ''
              )
          ) +
          `<span class="registry-selection-publish-summary-chip">${escapeHtml_(context.isSingleObject ? `уже выездов на карте: ${String(context.currentDivisionVisitCount || 0)}` : `точек на карте: ${String(context.selectedOnMapCount || 0)}`)}</span>` +
        `</div>`
      );
      const pickerTriggerLabel = singleInspectorMode
        ? (
          selectedInspectorNames[0]
            ? `Инспектор: ${selectedInspectorNames[0]}`
            : 'Назначить инспектора'
        )
        : (
          selectedInspectorNames.length
            ? `Выбрано инспекторов: ${selectedInspectorNames.length}`
            : 'Выбрать инспекторов'
        );
      const pickerTitle = singleInspectorMode
        ? 'Инспектор для выбранных точек'
        : `Инспекторы «${divisionLabel}»`;
      const inspectorsHtml = state.mapPublishInspectorsLoading
        ? `<div class="registry-selection-publish-note">Загружаем список инспекторов division...</div>`
        : state.mapPublishInspectorsError
          ? `<div class="registry-selection-publish-note registry-selection-publish-note--error">${escapeHtml_(state.mapPublishInspectorsError)}</div>`
          : inspectors.length
            ? (
              `<div class="registry-selection-publish-picker${inspectorPickerOpen ? ' is-open' : ''}">` +
                `<button class="registry-selection-publish-picker-trigger${inspectorPickerOpen ? ' is-open' : ''}" type="button" data-selection-publish-picker-toggle="1" aria-expanded="${inspectorPickerOpen ? 'true' : 'false'}">` +
                  `<span class="registry-selection-publish-picker-trigger-main">` +
                    `<span class="registry-selection-publish-picker-trigger-label">${escapeHtml_(pickerTriggerLabel)}</span>` +
                    (
                      selectedInspectorPreview
                        ? `<span class="registry-selection-publish-picker-trigger-meta">${escapeHtml_(selectedInspectorPreview)}</span>`
                        : ''
                    ) +
                  `</span>` +
                  `<span class="registry-selection-publish-picker-caret" aria-hidden="true"></span>` +
                `</button>` +
                (
                  inspectorPickerOpen
                    ? (
                      `<div class="registry-selection-publish-picker-popover">` +
                        `<div class="registry-selection-publish-picker-head">` +
                          `<div class="registry-selection-publish-picker-title">${escapeHtml_(pickerTitle)}</div>` +
                          `<button class="registry-selection-publish-picker-close" type="button" data-selection-publish-picker-close="1">Готово</button>` +
                        `</div>` +
                        `<div class="registry-selection-publish-picker-list">` +
                          inspectors.map(item => {
                            const inspectorName = String(item && item.name || '').trim();
                            const active = selectedInspectorNames.includes(inspectorName);
                            return (
                              `<label class="registry-selection-publish-picker-option${active ? ' is-active' : ''}">` +
                                `<input class="registry-selection-publish-picker-checkbox" type="checkbox"${active ? ' checked' : ''} data-selection-publish-inspector-checkbox="${escapeHtml_(inspectorName)}">` +
                                `<span class="registry-selection-publish-picker-option-name">${escapeHtml_(inspectorName)}</span>` +
                              `</label>`
                            );
                          }).join('') +
                        `</div>` +
                      `</div>`
                    )
                    : ''
                ) +
              `</div>`
            )
            : `<div class="registry-selection-publish-note">В этом division не найдено инспекторов для назначения.</div>`;
      return (
        `<div class="registry-selection-publish-plan">` +
          headerSummaryHtml +
          `<div class="registry-selection-publish-grid">` +
            `<div class="registry-selection-publish-field">` +
              `${inspectorsHtml}` +
            `</div>` +
          `</div>` +
        `</div>`
      );
    }

    function renderRegistrySelectionEditBar_() {
      const node = el('registrySelectionEditBar');
      if (!node) return;
      const isComposerEditing = !!state.selectionComposerOpen;
      const isPublishDraftEditing = isRegistrySelectionPublishDraftOpen_();
      const isMapRemovalEditing = isRegistryMapRemovalMode_();
      const editingId = getRegistrySelectionEditTargetId_();
      const item = editingId ? findSavedRegistrySelectionById_(editingId) : null;
      const activeItem = getActiveRegistrySelection_();
      const currentItem = item || activeItem;
      const count = Array.isArray(state.selectionEditDraftUins) ? state.selectionEditDraftUins.length : 0;
      const visibleState = getRegistrySelectionEditVisibleState_();
      const mapRemovalVisibleState = getRegistryMapRemovalVisibleState_();
      const mapRemovalSelectedCount = getRegistryMapRemovalSelectedCount_();
      const mapRemovalPending = String(state.registryMapRemovalPendingAction || '').trim() === 'remove';
      const canPublish = !!currentItem && canPublishSelectionToMap_(currentItem);
      const canEditCurrent = !isRegistrySelectionEditing_() && !!activeItem && canEditSavedSelection_(activeItem);
      const canRemoveCurrent = !isRegistrySelectionEditing_() && !!activeItem && canRemoveSavedSelection_(activeItem);
      const currentSelectionId = String(currentItem && currentItem.id || '').trim();
      const activeSelectionId = String(activeItem && activeItem.id || '').trim();
      const publishContext = (isComposerEditing || currentSelectionId)
        ? getRegistrySelectionPublishContext_(isComposerEditing ? editingId : currentSelectionId)
        : null;
      const isPublishingCurrent = canPublish && currentSelectionId && String(state.selectionPublishingId || '').trim() === currentSelectionId;
      const isPublishingComposer = isComposerEditing && String(state.selectionPublishingId || '').trim() === '__composer__';
      const isRemovingCurrent = canRemoveCurrent && activeSelectionId && String(state.selectionRemovingId || '').trim() === activeSelectionId;
      const canUseSharedWorkBatch = !!(
        activeItem &&
        activeSelectionId &&
        activeSelectionId === currentSelectionId &&
        isCollaborativeRegistrySelection_(activeItem) &&
        canUseSharedSelectionWorkBatchMode_() &&
        !isComposerEditing &&
        !isPublishDraftEditing &&
        !isMapRemovalEditing
      );
      const sharedWorkBatchMode = canUseSharedWorkBatch ? getSharedSelectionWorkBatchMode_() : '';
      const sharedWorkVisibleState = sharedWorkBatchMode
        ? getSharedSelectionWorkBatchVisibleState_()
        : {
            visibleEntries: [],
            visibleCount: 0,
            selectedVisibleCount: 0,
            allVisibleSelected: false
          };
      const sharedWorkSelectedCount = sharedWorkBatchMode ? getSharedSelectionWorkBatchSelectedCount_() : 0;
      const sharedWorkPendingAction = normalizeSharedSelectionWorkBatchMode_(state.sharedSelectionWorkBatchPendingAction);
      const sharedWorkPending = !!sharedWorkPendingAction;
      const headerKicker = isPublishDraftEditing
        ? 'На карту'
        : (isMapRemovalEditing ? 'На карте' : 'Проект');
      const headerKickerHtml = (
        `<div class="registry-selection-edit-kicker-row">` +
          `<div class="registry-selection-edit-kicker">${escapeHtml_(headerKicker)}</div>` +
        `</div>`
      );
      const toggleAllLabel = visibleState.allVisibleSelected ? 'Снять выбор' : 'Выбрать все';
      const subtitle = isPublishDraftEditing
        ? 'Отметьте нужные объекты выборки, затем снова нажмите кнопку карты.'
        : (
          isMapRemovalEditing
            ? 'Отметьте объекты на карте в реестре, затем снова нажмите кнопку карты.'
            : (
              sharedWorkBatchMode === 'take'
                ? 'Отметьте свободные объекты и нажмите «Взять себе».'
                : (
                  sharedWorkBatchMode === 'release'
                    ? 'Отметьте свои объекты и нажмите «Отдать».'
                    : ''
                )
            )
        );
      const headerSubtitle = (sharedWorkBatchMode || isPublishDraftEditing || isMapRemovalEditing || isComposerEditing) ? '' : subtitle;
      const composeName = String(
        state.selectionComposerDraftName ||
        (item ? (item.name || '') : buildRegistrySelectionLabel_())
      ).trim() || buildRegistrySelectionLabel_();
      const composerViewMode = getRegistrySelectionComposerViewMode_();
      const composerRegistryPublishEnabled = !!(
        isComposerEditing &&
        composerViewMode === 'registry' &&
        canCurrentUserManageMproMap_() &&
        isCurrentRegistryDatasetEditable_()
      );
      const composerViewMenuHtml = isComposerEditing && String(state.selectionComposerSelectionId || '').trim()
        ? (
          `<button class="ghost registry-shared-work-batch-button registry-selection-compose-view-toggle" type="button" data-toggle-selection-compose-view="1" title="${escapeHtml_(composerViewMode === 'registry' ? 'Показать только текущий проект' : 'Показать общий реестр')}" aria-label="${escapeHtml_(composerViewMode === 'registry' ? 'Показать только текущий проект' : 'Показать общий реестр')}">` +
            `${escapeHtml_(composerViewMode === 'registry' ? 'Общий реестр' : 'В проекте')}` +
          `</button>`
        )
        : '';
      const headerModeChipHtml = !isComposerEditing && activeItem && !isMapRemovalEditing && !isPublishDraftEditing
        ? `<span class="registry-selection-edit-kicker-scope">${escapeHtml_(getRegistrySelectionScopeChipLabel_(activeItem.scope))}</span>`
        : (
          isPublishDraftEditing
            ? `<span class="registry-selection-edit-scope registry-selection-edit-scope--pick">Выбор объектов</span>`
            : (
              isMapRemovalEditing
                ? `<span class="registry-selection-edit-scope registry-selection-edit-scope--remove">Снятие объектов</span>`
                : ''
            )
        );
      const headerTitleHtml = isComposerEditing
        ? (
          `<div id="selectionCompose" class="saved-selection-compose registry-selection-compose-inline">` +
            `<div class="saved-selection-compose-row registry-selection-compose-inline-row">` +
              `<div class="registry-selection-compose-main-row">` +
                `${headerKickerHtml}` +
              `<input id="selectionNameInput" type="text" value="${escapeHtml_(composeName)}" placeholder="Название" maxlength="120">` +
                `<div class="saved-selection-scope saved-selection-scope-list registry-selection-compose-scope">` +
                `<button id="btnSelectionScopePersonal" class="${getRegistrySelectionComposerScope_() === 'personal' ? 'active' : ''}" type="button" title="Моя выборка">` +
                  `<span class="saved-selection-scope-label">Мои</span>` +
                `</button>` +
                `<button id="btnSelectionScopeDivision" class="${getRegistrySelectionComposerScope_() === 'division' ? 'active' : ''}" type="button" title="${escapeHtml_(getRegistrySelectionScopeTitle_('division'))}">` +
                  `<span class="saved-selection-scope-label">Команда</span>` +
                `</button>` +
                `<button id="btnSelectionScopeShared" class="${getRegistrySelectionComposerScope_() === 'shared' ? 'active' : ''}" type="button" title="Для всех">` +
                  `<span class="saved-selection-scope-label">Все</span>` +
                `</button>` +
                `</div>` +
              `</div>` +
            `</div>` +
          `</div>`
        )
        : (
          `<div class="registry-selection-edit-title-row">` +
            `<div class="registry-selection-edit-title-meta">` +
              `${headerKickerHtml}` +
              `<span class="registry-selection-edit-title">${escapeHtml_(currentItem ? (currentItem.name || 'Выборка') : (isMapRemovalEditing ? 'Снятие с карты' : 'Выборка'))}</span>` +
            `</div>` +
            `${headerModeChipHtml}` +
          `</div>`
        );
      const isPublishMenuExpanded = !!(
        !isComposerEditing &&
        !isPublishDraftEditing &&
        !isMapRemovalEditing &&
        !sharedWorkBatchMode &&
        canPublish &&
        currentSelectionId &&
        isSelectionPublishMenuOpen_(currentSelectionId)
      );
      const publishMenuHtml = canPublish && !isPublishMenuExpanded
        ? renderSelectionPublishMenuHtml_(currentSelectionId, {
            compact: true,
            busy: isPublishingCurrent || isRemovingCurrent || mapRemovalPending,
            loading: isPublishingCurrent || mapRemovalPending,
            triggerTitle: isPublishDraftEditing
              ? 'Отправить выбранные объекты на карту'
              : (isMapRemovalEditing ? 'Управление объектами на карте' : 'Отправить на карту'),
            allowManualPick: !isPublishDraftEditing && !isMapRemovalEditing,
            allowMapRemoval: !isPublishDraftEditing && !isMapRemovalEditing,
            mapRemovalMode: isMapRemovalEditing,
            mapRemovalPending,
            mapRemovalVisibleCount: mapRemovalVisibleState.visibleCount,
            mapRemovalSelectedCount,
            mapRemovalAllVisibleSelected: mapRemovalVisibleState.allVisibleSelected
          })
        : '';
      const publishMenuHeaderActionsHtml = isPublishMenuExpanded
        ? (
          `<span class="registry-header-action-group registry-header-action-group--secondary">` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--take" type="button" data-open-selection-publish-draft="${escapeHtml_(currentSelectionId)}">Добавить на карту</button>` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--release" type="button" data-registry-map-removal-start="1"${mapRemovalVisibleState.visibleCount ? '' : ' disabled'}>Снять с карты</button>` +
          `</span>` +
          `<span class="registry-header-action-group registry-header-action-group--primary">` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--primary registry-shared-work-batch-button--take" type="button" data-publish-selection-id="${escapeHtml_(currentSelectionId)}" data-publish-selection-mode="append"${isPublishingCurrent || !count ? ' disabled' : ''}>${escapeHtml_(isPublishingCurrent ? 'Добавляю...' : 'Добавить на карту')}</button>` +
          `</span>`
        )
        : '';
      const sharedWorkHeaderActionsHtml = canUseSharedWorkBatch && !sharedWorkBatchMode
        ? (
          `<span class="registry-shared-work-mode-group registry-shared-work-mode-group--header">` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--take" type="button" data-shared-work-batch-mode="take">Взять себе</button>` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--release" type="button" data-shared-work-batch-mode="release">Отдать</button>` +
          `</span>`
        )
        : '';
      const sharedModeLabel = sharedWorkBatchMode === 'release' ? 'К отдаче' : 'К взятию';
      const sharedToggleAllLabel = sharedWorkVisibleState.allVisibleSelected ? 'Снять выбор' : 'Выбрать все';
      const sharedWorkBatchHeaderActionsHtml = canUseSharedWorkBatch && sharedWorkBatchMode
        ? (
          `<span class="registry-header-action-group registry-header-action-group--secondary">` +
            `<button class="ghost registry-selection-toggle-all registry-shared-work-batch-button registry-shared-work-batch-button--toggle-all${sharedWorkVisibleState.allVisibleSelected ? ' is-active' : ''}" type="button" data-shared-work-batch-toggle-all="1"${sharedWorkVisibleState.visibleCount && !sharedWorkPending ? '' : ' disabled'} aria-pressed="${sharedWorkVisibleState.allVisibleSelected ? 'true' : 'false'}" title="${escapeHtml_(sharedToggleAllLabel)}">` +
              `<span class="registry-selection-toggle-all-mark" aria-hidden="true"></span>` +
              `<span>${escapeHtml_(sharedToggleAllLabel)}</span>` +
            `</button>` +
            `<span class="registry-selection-edit-count-badge registry-selection-edit-count-badge--header">${escapeHtml_(sharedWorkSelectedCount ? `${sharedModeLabel}: ${sharedWorkSelectedCount}` : 'Ничего не выбрано')}</span>` +
          `</span>` +
          `<span class="registry-header-action-group registry-header-action-group--primary">` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--primary registry-shared-work-batch-button--${sharedWorkBatchMode}" type="button" data-shared-work-batch-confirm="1"${sharedWorkPending || !sharedWorkSelectedCount ? ' disabled' : ''}>${escapeHtml_(sharedWorkPending ? (sharedWorkBatchMode === 'take' ? 'Беру...' : 'Отдаю...') : (sharedWorkBatchMode === 'take' ? 'Взять себе' : 'Отдать'))}</button>` +
          `</span>`
        )
        : '';
      const publishDraftHeaderActionsHtml = isPublishDraftEditing
        ? (
          `<span class="registry-header-action-group registry-header-action-group--secondary">` +
            `<button class="ghost registry-selection-toggle-all registry-shared-work-batch-button registry-shared-work-batch-button--toggle-all registry-shared-work-batch-button--selection-draft${visibleState.allVisibleSelected ? ' is-active' : ''}" type="button" data-selection-edit-toggle-all="1"${visibleState.visibleCount ? '' : ' disabled'} aria-pressed="${visibleState.allVisibleSelected ? 'true' : 'false'}" title="${escapeHtml_(toggleAllLabel)}">` +
              `<span class="registry-selection-toggle-all-mark" aria-hidden="true"></span>` +
              `<span>${escapeHtml_(toggleAllLabel)}</span>` +
            `</button>` +
            `<span class="registry-selection-edit-count-badge registry-selection-edit-count-badge--header registry-selection-edit-count-badge--pick">${escapeHtml_(count ? `${count} для карты` : 'Ничего не выбрано')}</span>` +
          `</span>` +
          `<span class="registry-header-action-group registry-header-action-group--primary">` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--primary registry-shared-work-batch-button--take" type="button" data-publish-selection-id="${escapeHtml_(currentSelectionId)}" data-publish-selection-mode="append"${isPublishingCurrent || !count ? ' disabled' : ''}>${escapeHtml_(isPublishingCurrent ? 'Добавляю...' : 'Добавить на карту')}</button>` +
          `</span>`
        )
        : '';
      const mapRemovalHeaderActionsHtml = isMapRemovalEditing
        ? (
          `<span class="registry-header-action-group registry-header-action-group--secondary">` +
            `<button class="ghost registry-selection-toggle-all registry-shared-work-batch-button registry-shared-work-batch-button--toggle-all registry-shared-work-batch-button--map-removal${mapRemovalVisibleState.allVisibleSelected ? ' is-active' : ''}" type="button" data-registry-map-removal-toggle-all="1"${mapRemovalVisibleState.visibleCount && !mapRemovalPending ? '' : ' disabled'} aria-pressed="${mapRemovalVisibleState.allVisibleSelected ? 'true' : 'false'}" title="${escapeHtml_(mapRemovalVisibleState.allVisibleSelected ? 'Снять выбор' : 'Выбрать все')}">` +
              `<span class="registry-selection-toggle-all-mark" aria-hidden="true"></span>` +
              `<span>${escapeHtml_(mapRemovalVisibleState.allVisibleSelected ? 'Снять выбор' : 'Выбрать все')}</span>` +
            `</button>` +
            `<span class="registry-selection-edit-count-badge registry-selection-edit-count-badge--header registry-selection-edit-count-badge--remove">${escapeHtml_(mapRemovalSelectedCount ? `${mapRemovalSelectedCount} к снятию` : 'Ничего не выбрано')}</span>` +
          `</span>` +
          `<span class="registry-header-action-group registry-header-action-group--primary">` +
            `<button class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--primary registry-shared-work-batch-button--release" type="button" data-registry-map-removal-confirm="1"${mapRemovalPending || !mapRemovalSelectedCount ? ' disabled' : ''}>${escapeHtml_(mapRemovalPending ? 'Снимаю...' : 'Снять с карты')}</button>` +
          `</span>`
        )
        : '';
      const headerActionsHtml = isComposerEditing
        ? (
          `<button id="btnSelectionComposerClose" class="ghost registry-selection-edit-icon-button saved-selection-compose-icon-button saved-selection-close-button action-icon-button action-icon-button--danger" type="button" title="Закрыть редактор" aria-label="Закрыть редактор">` +
            `<svg class="saved-selection-compose-icon-svg" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
              `<path d="M5 5l10 10"></path>` +
              `<path d="M15 5L5 15"></path>` +
            `</svg>` +
          `</button>`
        )
        : isPublishDraftEditing
        ? (
          publishDraftHeaderActionsHtml +
          `<button class="ghost registry-selection-edit-icon-button registry-selection-edit-close action-icon-button action-icon-button--danger" type="button" data-selection-publish-draft-close="1" title="Выйти из выбора для карты" aria-label="Выйти из выбора для карты">${getCloseIconSvgHtml_('edit-badge-icon-svg')}</button>`
        )
        : isMapRemovalEditing
        ? (
          mapRemovalHeaderActionsHtml +
          `<button class="ghost registry-selection-edit-icon-button registry-selection-edit-close action-icon-button action-icon-button--danger" type="button" data-registry-map-removal-exit="1"${mapRemovalPending ? ' disabled' : ''} title="Выйти из режима снятия с карты" aria-label="Выйти из режима снятия с карты">${getCloseIconSvgHtml_('edit-badge-icon-svg')}</button>`
        )
        : isPublishMenuExpanded
        ? (
          publishMenuHeaderActionsHtml +
          `<button class="ghost registry-selection-edit-icon-button registry-selection-edit-close action-icon-button action-icon-button--danger" type="button" data-selection-publish-menu-close="1" title="Отменить действия карты" aria-label="Отменить действия карты">${getCloseIconSvgHtml_('edit-badge-icon-svg')}</button>`
        )
        : (
          (
            !sharedWorkBatchMode && canEditCurrent
              ? `<button class="ghost registry-selection-edit-icon-button action-icon-button action-icon-button--success" type="button" data-selection-edit-open="${escapeHtml_(activeSelectionId)}" title="Редактировать выборку" aria-label="Редактировать выборку">${getEditBadgeSvgHtml_('edit-badge-icon-svg')}</button>`
              : ''
          ) +
          (
            !sharedWorkBatchMode && canRemoveCurrent
              ? `<button class="ghost registry-selection-edit-icon-button registry-selection-edit-danger action-icon-button action-icon-button--danger${isRemovingCurrent ? ' is-loading' : ''}" type="button" data-selection-edit-remove="${escapeHtml_(activeSelectionId)}"${isRemovingCurrent ? ' disabled' : ''} title="Удалить выборку" aria-label="Удалить выборку">${getTrashIconSvgHtml_('edit-badge-icon-svg')}</button>`
              : ''
          ) +
          (
            !sharedWorkBatchMode ? publishMenuHtml : ''
          ) +
          (sharedWorkBatchMode ? sharedWorkBatchHeaderActionsHtml : sharedWorkHeaderActionsHtml) +
          (
            sharedWorkBatchMode
              ? `<button class="ghost registry-selection-edit-icon-button registry-selection-edit-close action-icon-button action-icon-button--danger" type="button" data-shared-work-batch-exit="1"${sharedWorkPending ? ' disabled' : ''} title="Отменить выбор объектов" aria-label="Отменить выбор объектов">${getCloseIconSvgHtml_('edit-badge-icon-svg')}</button>`
              : (activeSelectionId
                ? `<button class="ghost registry-selection-edit-icon-button registry-selection-edit-close action-icon-button action-icon-button--danger" type="button" data-selection-close-active="${escapeHtml_(activeSelectionId)}" title="Закрыть выборку" aria-label="Закрыть выборку">${getCloseIconSvgHtml_('edit-badge-icon-svg')}</button>`
                : '')
          )
        );
      const toolButtons = isComposerEditing
        ? [
            `<button class="ghost registry-selection-toggle-all registry-shared-work-batch-button registry-shared-work-batch-button--toggle-all${visibleState.allVisibleSelected ? ' is-active' : ''}" type="button" data-selection-edit-toggle-all="1"${visibleState.visibleCount ? '' : ' disabled'} aria-pressed="${visibleState.allVisibleSelected ? 'true' : 'false'}" title="${escapeHtml_(toggleAllLabel)}">` +
              `<span class="registry-selection-toggle-all-mark" aria-hidden="true"></span>` +
              `<span>${escapeHtml_(toggleAllLabel)}</span>` +
            `</button>`,
            `<span class="registry-selection-edit-count-badge registry-selection-edit-count-badge--header">${escapeHtml_(count ? `${count} выбрано` : 'Ничего не выбрано')}</span>`,
            composerViewMenuHtml,
            `<button id="btnConfirmSelectionComposer" class="ghost registry-shared-work-batch-button registry-shared-work-batch-button--primary registry-shared-work-batch-button--take" type="button"${count ? '' : ' disabled'}>Сохранить</button>`
          ].filter(Boolean)
        : [];
      const publishPlanHtml = '';
      if (!isRegistrySelectionEditing_() && !isMapRemovalEditing && !activeItem) {
        node.classList.add('hidden');
        node.classList.remove('is-editing');
        node.classList.remove('registry-selection-edit--publish-draft', 'registry-selection-edit--map-removal');
        node.innerHTML = '';
        return;
      }
      node.classList.remove('hidden');
      node.classList.toggle('is-editing', isComposerEditing || isPublishDraftEditing || isMapRemovalEditing || !!sharedWorkBatchMode);
      node.classList.toggle('registry-selection-edit--publish-draft', isPublishDraftEditing);
      node.classList.toggle('registry-selection-edit--map-removal', isMapRemovalEditing);
      node.innerHTML = (
        `<div class="registry-selection-edit-header">` +
          `<div class="registry-selection-edit-main">` +
            `${headerTitleHtml}` +
            (
              headerSubtitle
                ? `<div class="registry-selection-edit-sub">${escapeHtml_(headerSubtitle)}</div>`
                : ''
            ) +
            (
              publishPlanHtml
                ? `<div class="registry-selection-edit-publish-inline">${publishPlanHtml}</div>`
                : ''
            ) +
          `</div>` +
          (
            headerActionsHtml
              ? `<div class="registry-selection-edit-header-actions">${headerActionsHtml}</div>`
              : ''
          ) +
        `</div>` +
        (
          toolButtons.length
            ? `<div class="registry-selection-edit-actions">${toolButtons.join('')}</div>`
            : ''
        )
      );
      node.querySelectorAll('[data-selection-edit-open]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          openRegistrySelectionComposer_(String(button.getAttribute('data-selection-edit-open') || ''));
        });
      });
      node.querySelectorAll('[data-selection-edit-remove]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          removeRegistrySelectionById_(String(button.getAttribute('data-selection-edit-remove') || ''));
        });
      });
      node.querySelectorAll('[data-selection-close-active]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          closeActiveRegistrySelectionView_();
        });
      });
      node.querySelectorAll('[data-selection-edit-toggle-all]').forEach(button => {
        button.addEventListener('click', () => toggleRegistrySelectionDraftVisibleRows_());
      });
      node.querySelectorAll('[data-toggle-selection-compose-view]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          toggleRegistrySelectionComposerViewMode_();
        });
      });
      node.querySelectorAll('[data-selection-edit-restore]').forEach(button => {
        button.addEventListener('click', () => restoreRegistrySelectionView_(String(button.getAttribute('data-selection-edit-restore') || '')));
      });
      node.querySelectorAll('[data-shared-work-batch-mode]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          handleRegistrySharedWorkToolbarAction_(String(button.getAttribute('data-shared-work-batch-mode') || ''));
        });
      });
      node.querySelectorAll('[data-shared-work-batch-toggle-all]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          toggleSharedSelectionWorkBatchVisibleRows_();
        });
      });
      node.querySelectorAll('[data-shared-work-batch-confirm]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          confirmRegistrySharedWorkBatchMode_();
        });
      });
      node.querySelectorAll('[data-shared-work-batch-exit]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          exitRegistrySharedWorkBatchMode_();
        });
      });
      bindSelectionPublishMenuEvents_(node);
      node.querySelectorAll('[data-selection-publish-menu-close]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          closeSelectionPublishMenu_();
        });
      });
      node.querySelectorAll('[data-selection-publish-draft-close]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.stopPropagation();
          closeRegistrySelectionPublishDraft_();
        });
      });
      node.querySelectorAll('[data-selection-publish-inspector]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.preventDefault();
          evt.stopPropagation();
          toggleSelectionPublishInspectorName_(String(button.getAttribute('data-selection-publish-inspector') || ''), {
            single: !!(publishContext && !publishContext.isSingleObject),
            closePicker: !!(publishContext && !publishContext.isSingleObject)
          });
        });
      });
      node.querySelectorAll('[data-selection-publish-extra-visits]').forEach(input => {
        input.addEventListener('change', evt => {
          updateSelectionPublishExtraVisits_(evt.target && evt.target.value);
        });
      });
      node.querySelectorAll('[data-selection-publish-picker-toggle]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.preventDefault();
          evt.stopPropagation();
          toggleSelectionPublishInspectorPicker_();
        });
      });
      node.querySelectorAll('[data-selection-publish-picker-close]').forEach(button => {
        button.addEventListener('click', evt => {
          evt.preventDefault();
          evt.stopPropagation();
          closeSelectionPublishInspectorPicker_();
        });
      });
      node.querySelectorAll('[data-selection-publish-inspector-checkbox]').forEach(input => {
        input.addEventListener('change', evt => {
          evt.stopPropagation();
          toggleSelectionPublishInspectorName_(String(input.getAttribute('data-selection-publish-inspector-checkbox') || ''), {
            single: !!(publishContext && !publishContext.isSingleObject),
            closePicker: !!(publishContext && !publishContext.isSingleObject)
          });
        });
      });
      const nameInput = el('selectionNameInput');
      if (nameInput) {
        nameInput.addEventListener('input', evt => {
          state.selectionComposerDraftName = String(evt.target && evt.target.value || '');
        });
        nameInput.addEventListener('keydown', evt => {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            saveCurrentRegistrySelection_();
          }
          if (evt.key === 'Escape') {
            evt.preventDefault();
            closeRegistrySelectionComposer_();
          }
        });
      }
      const saveButton = el('btnConfirmSelectionComposer');
      if (saveButton) saveButton.addEventListener('click', () => saveCurrentRegistrySelection_());
      const publishComposerButton = el('btnPublishSelectionComposer');
      if (publishComposerButton) publishComposerButton.addEventListener('click', () => publishRegistrySelectionComposerDraft_('append'));
      const closeButton = el('btnSelectionComposerClose');
      if (closeButton) closeButton.addEventListener('click', () => closeRegistrySelectionComposer_());
      const personalButton = el('btnSelectionScopePersonal');
      const divisionButton = el('btnSelectionScopeDivision');
      const sharedButton = el('btnSelectionScopeShared');
      if (personalButton) personalButton.addEventListener('click', () => setRegistrySelectionComposerScope_('personal'));
      if (divisionButton) divisionButton.addEventListener('click', () => setRegistrySelectionComposerScope_('division'));
      if (sharedButton) sharedButton.addEventListener('click', () => setRegistrySelectionComposerScope_('shared'));
    }

function renderRegistrySharedWorkBar_() {
      const node = el('registrySharedWorkInlineActions');
      if (!node) return;
      node.classList.add('hidden');
      node.innerHTML = '';
      return;
      const activeSelection = getActiveRegistrySelection_();
      const canUse = !!getCurrentUserBlockName_();
      const visible = !!(
        activeSelection &&
        canUse &&
        isCollaborativeRegistrySelection_(activeSelection) &&
        !isRegistrySelectionEditing_() &&
        !isRegistryMapRemovalMode_() &&
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
        `<button class="ghost registry-shared-work-icon-button registry-shared-work-confirm action-icon-button action-icon-button--success${isPending ? ' is-loading' : ''}" type="button" data-shared-work-batch-confirm="1"${isPending || !selectedCount ? ' disabled' : ''} title="${escapeHtml_(isPending ? 'Применяю...' : confirmTitle)}" aria-label="${escapeHtml_(isPending ? 'Применяю...' : confirmTitle)}">` +
          `<svg class="registry-shared-work-icon-svg" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-10"></path></svg>` +
        `</button>` +
        `<button class="ghost registry-shared-work-icon-button registry-shared-work-exit action-icon-button action-icon-button--danger" type="button" data-shared-work-batch-exit="1"${isPending ? ' disabled' : ''} title="${escapeHtml_(exitTitle)}" aria-label="${escapeHtml_(exitTitle)}">` +
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


function syncRegistrySelectionComposerUi_() {
      const editingId = String(state.selectionComposerSelectionId || '').trim();
      const isEditing = !!editingId;
      const busyState = String(state.selectionComposerBusyState || '').trim();
      const isBusy = !!busyState;
      const compose = el('selectionCompose');
      const input = el('selectionNameInput');
      const saveButton = el('btnConfirmSelectionComposer');
      const publishButton = el('btnPublishSelectionComposer');
      const personalButton = el('btnSelectionScopePersonal');
      const divisionButton = el('btnSelectionScopeDivision');
      const sharedButton = el('btnSelectionScopeShared');
      const closeButton = el('btnSelectionComposerClose');
      const scope = getRegistrySelectionComposerScope_();
      const divisionScopeBlocked = scope === 'division' && !canUseDivisionRegistrySelectionScope_();
      const draftCount = Array.isArray(state.selectionEditDraftUins) ? state.selectionEditDraftUins.length : 0;
      if (compose) compose.classList.toggle('is-busy', isBusy);
      if (input) {
        if (String(input.value || '') !== String(state.selectionComposerDraftName || '')) {
          input.value = String(state.selectionComposerDraftName || '');
        }
        input.disabled = isBusy;
      }
      if (saveButton) {
        saveButton.disabled = isBusy || divisionScopeBlocked;
        saveButton.classList.toggle('is-loading', isBusy);
        saveButton.setAttribute('title', busyState === 'checking'
          ? 'Проверяю сохранение'
          : (busyState === 'saving'
            ? 'Сохраняю'
            : (isEditing ? 'Сохранить изменения' : 'Сохранить')));
        saveButton.setAttribute('aria-label', saveButton.getAttribute('title') || 'Сохранить');
      }
      if (publishButton) {
        publishButton.disabled = isBusy || !draftCount;
        publishButton.classList.toggle('is-loading', String(state.selectionPublishingId || '').trim() === '__composer__');
      }
      if (closeButton) {
        closeButton.disabled = isBusy;
        closeButton.classList.toggle('is-loading', false);
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
      const filterHintActions = el('registryFilterHintActions');
      const filtersActive = hasActiveRegistryFilters_();
      const showSelectionFilterReset = false;
      const showBulkMode = !!state.registryBulkOpen;
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
      if (filterHintActions) {
        if (showSelectionFilterReset) {
          filterHintActions.classList.remove('hidden');
          filterHintActions.innerHTML = `<button class="ghost registry-filter-action-chip" type="button" data-registry-clear-selection-filters="1">Сбросить фильтры</button>`;
          filterHintActions.querySelectorAll('[data-registry-clear-selection-filters]').forEach(button => {
            button.addEventListener('click', evt => {
              evt.preventDefault();
              evt.stopPropagation();
              clearRegistryFiltersForSelectionEdit_();
            });
          });
        } else {
          filterHintActions.classList.add('hidden');
          filterHintActions.innerHTML = '';
        }
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


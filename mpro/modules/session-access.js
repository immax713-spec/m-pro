// Session UI routing module.
// Owns delegated UI events. Access policy lives in access-policy.js.

        // Auth/session orchestration extracted to mpro/modules/auth-session.js.
        // Access policy extracted to mpro/modules/access-policy.js.

        function initDelegatedEvents_() {
            if (UIState.isDelegatedEventsInitialized()) return;
            UIState.markDelegatedEventsInitialized();

            document.addEventListener('pointerdown', (event) => {
                if (!(event.target instanceof Element)) return;
                if (!event.target.closest('.object-card__dropdown')) {
                    closeReassignDropdowns_();
                }
            });

            document.addEventListener('click', (event) => {
                if (!(event.target instanceof Element)) return;

                const stopPropagationNode = event.target.closest('[data-stop-propagation="true"]');
                if (stopPropagationNode) {
                    event.stopPropagation();
                    return;
                }

                const fabMenu = document.getElementById('mobileFabMenu');
                if (fabMenu && (isMobileFabExpanded_() || isMapInlineSearchOpen_()) && !event.target.closest('#mobileFabMenu')) {
                    setMobileFabExpanded_(false);
                    setMapInlineSearchOpen_(false);
                }

                const actionNode = event.target.closest('[data-action]');
                if (!actionNode) return;

                const action = actionNode.dataset.action;
                if (!isActionAllowedForCurrentRole_(action, 'click')) return;
                switch (action) {
                    case 'close-object-details':
                        closeObjectDetails();
                        break;
                    case 'open-lab-study-scheme':
                        if (actionNode.dataset.objectId) openLabStudySchemeModal_(actionNode.dataset.objectId);
                        break;
                    case 'close-lab-study-scheme':
                        closeLabStudySchemeModal_();
                        break;
                    case 'login':
                        doLogin();
                        break;
                    case 'show-homes':
                        AppModules.Map.showHomes();
                        break;
                    case 'show-inspector-management':
                        AppModules.Customization.showInspectorManagement();
                        break;
                    case 'archive-completed':
                        archiveCompletedObjects();
                        break;
                    case 'toggle-filter':
                        if (actionNode.dataset.filterId) {
                            toggleFilter(actionNode.dataset.filterId);
                        }
                        break;
                    case 'toggle-accordion':
                        toggleAccordion(actionNode);
                        break;
                    case 'switch-nav':
                        if (actionNode.dataset.tab) {
                            AppModules.Objects.switchNav(actionNode.dataset.tab);
                        }
                        break;
                    case 'open-app':
                        openApp_(actionNode.dataset.app);
                        break;
                    case 'toggle-mobile-fab':
                        toggleMobileFabMenu_();
                        break;
                    case 'mobile-fab-open-menu':
                        openMobileSidebarFromFab_('lists');
                        break;
                    case 'mobile-fab-search':
                        toggleMapInlineSearch_();
                        break;
                    case 'map-inline-search-submit':
                        submitMapInlineSearch_();
                        break;
                    case 'map-inline-search-close':
                        setMapInlineSearchOpen_(false);
                        setMobileFabExpanded_(true);
                        break;
                    case 'close-inspector-management':
                        AppModules.Customization.closeInspectorManagement();
                        break;
                    case 'toggle-inspector-card': {
                        const card = actionNode.closest('.inspector-card');
                        if (card) AppModules.Customization.toggleInspectorCard(card);
                        break;
                    }
                    case 'toggle-picker':
                        if (actionNode.dataset.pickerType && actionNode.dataset.cardId) {
                            AppModules.Customization.togglePicker(actionNode.dataset.pickerType, actionNode.dataset.cardId);
                        }
                        break;
                    case 'toggle-reassign-dropdown':
                        toggleReassignDropdown_(actionNode);
                        break;
                    case 'select-reassign-inspector':
                        selectReassignInspectorOption_(actionNode);
                        break;
                    case 'select-color':
                        if (actionNode.dataset.cardId && actionNode.dataset.color) {
                            AppModules.Customization.selectColor(actionNode.dataset.cardId, actionNode.dataset.color);
                        }
                        break;
                    case 'apply-inspector-changes':
                        if (actionNode.dataset.inspector && actionNode.dataset.cardId) {
                            AppModules.Customization.applyInspectorChanges(actionNode.dataset.inspector, actionNode.dataset.cardId);
                        }
                        break;
                    case 'mark-entry':
                        if (actionNode.dataset.objectId) markEntry(actionNode.dataset.objectId);
                        break;
                    case 'mark-exit':
                        if (actionNode.dataset.objectId) markExit(actionNode.dataset.objectId);
                        break;
                    case 'cancel-entry':
                        if (actionNode.dataset.objectId) cancelEntry(actionNode.dataset.objectId);
                        break;
                    case 'mark-denied':
                        if (actionNode.dataset.objectId) markDenied(actionNode.dataset.objectId);
                        break;
                    case 'save-object-facts':
                        if (actionNode.dataset.objectId) saveObjectFacts(actionNode.dataset.objectId);
                        break;
                    case 'copy-coordinates':
                        if (actionNode.dataset.coordinates) copyCoordinates(actionNode.dataset.coordinates);
                        break;
                    case 'focus-object-from-list':
                        if (actionNode.dataset.objectId) focusObjectFromObjectsTabById_(actionNode.dataset.objectId);
                        break;
                    case 'yandex-disk':
                        handleYandexDiskAction_(actionNode);
                        break;
                    default:
                        break;
                }
            });

            document.addEventListener('change', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const action = target.dataset?.changeAction;
                if (!action) return;

                switch (action) {
                    case 'toggle-workday':
                        handleWorkDayToggleChange_(target);
                        break;
                    case 'toggle-only-active-mode':
                        AppModules.Filters.toggleOnlyActiveMode(!!target.checked);
                        break;
                    case 'toggle-show-completed-on-map':
                        AppModules.Filters.toggleShowCompletedOnMap(!!target.checked);
                        break;
                    case 'update-map-filters':
                        AppModules.Filters.updateMapFilters();
                        break;
                    case 'toggle-division-filters':
                        if (target.dataset.division && target.dataset.filterType) {
                            AppModules.Filters.toggleDivisionFilters(target.dataset.division, target.dataset.filterType, !!target.checked);
                        }
                        break;
                    case 'reassign-inspector':
                        if (target.dataset.objectId) {
                            reassignInspector(target.dataset.objectId, target.value);
                        }
                        break;
                    case 'custom-inspector-color':
                        if (target.dataset.cardId && target.value) {
                            selectColor(target.dataset.cardId, target.value);
                        }
                        break;
                    default:
                        break;
                }
            });

            document.addEventListener('input', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const action = target.dataset?.inputAction;
                if (!action) return;
                if (!isActionAllowedForCurrentRole_(action, 'input')) return;

                switch (action) {
                    case 'objects-search':
                        handleObjectsSearchInput_(target);
                        break;
                    case 'map-inline-search-input':
                        handleMapInlineSearchInput_(target);
                        break;
                    case 'filter-reassign-options':
                        filterReassignOptions_(target);
                        break;
                    case 'update-object-fact':
                        handleObjectFactInput_(target);
                        break;
                    case 'filter-management-inspectors':
                        AppModules.Customization.filterManagementInspectors();
                        break;
                    default:
                        break;
                }
            });

            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                closeReassignDropdowns_();
            });
        }

        // Boot/runtime shell extracted to mpro/modules/boot-runtime.js.
        // Workday module extracted to mpro/modules/workday.js.

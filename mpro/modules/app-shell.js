// Notifications shell extracted to mpro/modules/notifications-shell.js.

        // Shared utilities extracted to mpro/modules/shared-utils.js.

        const AppModules = Object.freeze({
            Filters: Object.freeze({
                renderFilterLists,
                updateMapFilters,
                toggleDivisionFilters,
                toggleOnlyActiveMode,
                toggleShowCompletedOnMap,
                applyStoredFiltersToUI: applyStoredFiltersToUI_,
                syncGroupCheckboxes: syncGroupCheckboxes_
            }),
            Map: Object.freeze({
                initMap,
                updateMap,
                showHomes,
                openObjectDetails,
                closeObjectDetails
            }),
            Objects: Object.freeze({
                switchNav,
                updateObjectsList,
                scheduleObjectsListUpdate: scheduleObjectsListUpdate_,
                refreshObjectsTabIfVisible: refreshObjectsTabIfVisible_,
                focusObjectFromObjectsTab: focusObjectFromObjectsTab_
            }),
            Customization: Object.freeze({
                showInspectorManagement,
                closeInspectorManagement,
                renderInspectorManagement,
                filterManagementInspectors,
                toggleInspectorCard,
                togglePicker,
                selectColor,
                applyInspectorChanges
            })
        });
        window.AppModules = AppModules;

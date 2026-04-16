// Access policy module.
// Owns role checks, scoped datasets, UI visibility, and interaction guards.

        const INSPECTOR_BLOCKED_CLICK_ACTIONS = new Set([
            'show-homes',
            'show-inspector-management',
            'archive-completed',
            'close-inspector-management',
            'toggle-inspector-card',
            'toggle-picker',
            'toggle-reassign-dropdown',
            'select-reassign-inspector',
            'select-color',
            'apply-inspector-changes',
            'cancel-entry'
        ]);
        const INSPECTOR_BLOCKED_INPUT_ACTIONS = new Set([
            'filter-management-inspectors',
            'filter-reassign-options',
            'reassign-inspector'
        ]);

        function getCurrentUserRoleNorm_() {
            return String(RuntimeState.getCurrentUser()?.role || '')
                .replace(/\u00A0/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/[\u0451\u0401]/g, '\u0435')
                .trim()
                .toLowerCase();
        }

        function isInspectorRole_() {
            const role = getCurrentUserRoleNorm_();
            return role.indexOf('\u0438\u043d\u0441\u043f\u0435\u043a\u0442') !== -1 || role.indexOf('inspector') !== -1;
        }

        function hasResolvedCurrentUserRole_() {
            return !!(
                sanitizeSessionUserMetaText_(RuntimeState.getCurrentUser()?.name) ||
                sanitizeSessionUserMetaText_(RuntimeState.getCurrentUser()?.login) ||
                sanitizeSessionUserMetaText_(RuntimeState.getCurrentUser()?.role)
            );
        }

        function getCurrentUserDivisionNorms_() {
            const raw = String(RuntimeState.getCurrentUser()?.division || '')
                .replace(/\u00A0/g, ' ')
                .trim();
            if (!raw) return [];

            const seen = new Set();
            const result = [];
            const tryAdd = (value) => {
                const normalized = normalizeDivisionName_(value);
                if (!normalized || seen.has(normalized)) return;
                seen.add(normalized);
                result.push(normalized);
            };

            tryAdd(raw);
            raw.split(/[;,/|]+/).forEach(tryAdd);
            raw.split(/\s{2,}/).forEach(tryAdd);

            return result;
        }

        function isActionAllowedForCurrentRole_(action, channel = 'click') {
            if (!action) return false;
            if (!isInspectorRole_()) return true;
            if (channel === 'input') return !INSPECTOR_BLOCKED_INPUT_ACTIONS.has(action);
            return !INSPECTOR_BLOCKED_CLICK_ACTIONS.has(action);
        }

        function applyRoleVisibility_() {
            const hasResolvedUser = hasResolvedCurrentUserRole_();
            const hideAdmin = !hasResolvedUser || isInspectorRole_();
            const adminSection = UIState.getDomById('adminFunctionsSection');
            const managementPanel = UIState.getDomById('inspectorManagementPanel');
            const workDaySection = UIState.getDomById('workDaySection');
            if (adminSection) adminSection.style.display = hideAdmin ? 'none' : '';
            if (managementPanel && hideAdmin) managementPanel.classList.add('hidden');
            if (workDaySection) workDaySection.style.display = hasResolvedUser && isInspectorRole_() ? '' : 'none';
        }

        function getRoleScopedObjects_(objectsData) {
            const source = Array.isArray(objectsData) ? objectsData : [];
            if (!isInspectorRole_()) return source;
            const myInspectorNorm = normalizeInspectorName_(RuntimeState.getCurrentUserName(''));
            if (!myInspectorNorm) return [];
            return source.filter(obj => normalizeInspectorName_(obj?.inspector) === myInspectorNorm);
        }

        function getRoleScopedInspectors_(inspectorsList) {
            const source = Array.isArray(inspectorsList) ? inspectorsList : [];
            if (!isInspectorRole_()) return source;
            const myInspectorNorm = normalizeInspectorName_(RuntimeState.getCurrentUserName(''));
            if (!myInspectorNorm) return [];
            return source.filter(insp => normalizeInspectorName_(insp?.name) === myInspectorNorm);
        }

        function canCurrentUserInteractWithObjects_() {
            if (!isInspectorRole_()) return true;
            return WorkDayRuntimeState.isOpen();
        }

        function ensureCurrentUserCanInteractWithObjects_(message = 'Сначала открой рабочий день') {
            if (canCurrentUserInteractWithObjects_()) return true;
            showNotification(message, 'error');
            return false;
        }

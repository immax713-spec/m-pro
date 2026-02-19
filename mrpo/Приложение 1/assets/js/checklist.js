/**
 * Checklist Module
 * Объединенный модуль: логика (ChecklistManager) и интерфейс (openChecklistForm)
 */

// ============================================================================
// ЧАСТЬ 1: ChecklistManager (Логика и расчеты)
// ============================================================================

// Глобальный кэш схемы чек-листа
let _checklistSchemaCache = null;

const ChecklistManager = {
    /**
     * Загрузить базовую схему чек-листа из Google Sheets
     */
    async loadChecklistSchema() {
        if (_checklistSchemaCache) return _checklistSchemaCache;
        try {
            const url = window.REPORTS_URL || '/exec';
            const params = window.getExtraParams ? window.getExtraParams() : '';
            const response = await fetch(url + '?action=getChecklistSchema' + params, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-store'
            });
            const text = await response.text();
            let data = JSON.parse(text);
            if (data && data.success && data.schema) {
                _checklistSchemaCache = data.schema;
                return data.schema;
            }
            return null;
        } catch (error) {
            console.error('Error loading checklist schema:', error);
            return null;
        }
    },

    /**
     * Загрузить конфигурацию чек-листа для конкретного объекта
     */
    async loadObjectChecklistConfig(objectId) {
        const localData = this.loadFromLocalStorage(objectId);
        if (localData.length > 0) return localData;

        try {
            const url = window.REPORTS_URL || '/exec';
            const params = window.getExtraParams ? window.getExtraParams() : '';
            const response = await fetch(
                url + '?action=getObjectChecklistConfig&objectId=' + encodeURIComponent(objectId) + params,
                { method: 'GET', mode: 'cors', cache: 'no-store' }
            );
            const text = await response.text();
            let data = JSON.parse(text);
            if (data && data.success && Array.isArray(data.disabled_keys)) {
                return data.disabled_keys;
            }
            return [];
        } catch (error) {
            console.error('Error loading config:', error);
            return [];
        }
    },

    loadFromLocalStorage(objectId) {
        try {
            const key = `checklist_config_${objectId}`;
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    },

    async saveObjectChecklistConfig(objectId, disabledKeys) {
        this.saveToLocalStorage(objectId, disabledKeys);
        try {
            const url = window.REPORTS_URL || '/exec';
            const params = window.getExtraParams ? window.getExtraParams() : '';
            const response = await fetch(url + '?action=saveObjectChecklistConfig' + params, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ object_id: objectId, disabled_keys: disabledKeys }),
                mode: 'cors'
            });
            const text = await response.text();
            const data = JSON.parse(text);
            return data && data.success;
        } catch (error) {
            return true; // Already saved to local
        }
    },

    saveToLocalStorage(objectId, disabledKeys) {
        try {
            localStorage.setItem(`checklist_config_${objectId}`, JSON.stringify(disabledKeys));
        } catch (e) { }
    },

    recalculateWeights(schema, disabledKeys) {
        if (!schema || !schema.items) return schema;
        const items = JSON.parse(JSON.stringify(schema.items));
        const disabledSet = new Set(disabledKeys);

        const itemsByParent = {};
        items.forEach(item => {
            const parent = item.parent || 'root';
            if (!itemsByParent[parent]) itemsByParent[parent] = [];
            itemsByParent[parent].push(item);
        });

        Object.keys(itemsByParent).forEach(parent => {
            const siblings = itemsByParent[parent];
            const activeSiblings = siblings.filter(s => !disabledSet.has(s.key));
            const disabledSiblings = siblings.filter(s => disabledSet.has(s.key));

            if (disabledSiblings.length > 0 && activeSiblings.length > 0) {
                const totalDisabledWeight = disabledSiblings.reduce((sum, s) => sum + (s.weight || 0), 0);
                const additionalWeight = totalDisabledWeight / activeSiblings.length;
                activeSiblings.forEach(sibling => {
                    sibling.weight = (sibling.weight || 0) + additionalWeight;
                });
            }
        });

        return { ...schema, items };
    },

    calculateParentValue(itemKey, schema, values) {
        if (!schema || !schema.items) return 0;
        const item = schema.items.find(i => i.key === itemKey);
        if (!item) return 0;

        const children = schema.items.filter(i => i.parent === itemKey);
        if (children.length === 0) {
            return parseFloat(values[itemKey] || 0) || 0;
        }

        let totalValue = 0;
        children.forEach(child => {
            let childValue = child.auto_calculated ?
                this.calculateParentValue(child.key, schema, values) :
                parseFloat(values[child.key] || 0) || 0;
            totalValue += childValue * (child.weight || 0);
        });
        return totalValue;
    }
};

window.ChecklistManager = ChecklistManager;

// ============================================================================
// ЧАСТЬ 2: openChecklistForm (Интерфейс)
// ============================================================================

function openChecklistForm(objectId) {
    const object = objectsData.find(obj => obj.id == objectId);
    const container = document.getElementById('objectDetailsContent');
    if (!object || !container) return;
    const target = container;

    let checklistItems = [];
    const expandedCategories = new Set();
    const expandedSubcategories = new Set();

    if (window._isAdaptMode === undefined) window._isAdaptMode = false;
    let isAdaptMode = window._isAdaptMode;
    let markedForDeletion = new Set();
    let disabledKeys = [];

    window.specialFieldsData = { skud: '', mob: '', grunt: '' };

    window.setSpecialField = function (field, value) {
        window.specialFieldsData[field] = value;
        const container = document.getElementById(`sf_${field}`);
        if (!container) return;
        container.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const textValue = String(value).trim();
        if (field === 'skud') {
            if (textValue === 'Работает') container.querySelector('.toggle-good').classList.add('active');
            if (textValue === 'Не работает') container.querySelector('.toggle-bad').classList.add('active');
        } else if (field === 'grunt') {
            if (textValue === 'Отсутствуют') container.querySelector('.toggle-good').classList.add('active');
            if (textValue === 'Навалы') container.querySelector('.toggle-bad').classList.add('active');
        }
    };

    if (window.showNotification) {
        window.showNotification('⏳ Загрузка чек-листа', 'info', { persistent: true, showDots: true });
    }

    (async () => {
        try {
            const loadedDisabledKeys = await window.ChecklistManager.loadObjectChecklistConfig(objectId);
            disabledKeys = loadedDisabledKeys || [];
            markedForDeletion = new Set(disabledKeys);

            const baseSchema = await window.ChecklistManager.loadChecklistSchema();
            let schema = window.ChecklistManager.recalculateWeights(baseSchema, disabledKeys);
            checklistItems = schema.items || [];

            // Load Existing Data
            try {
                const baseUrl = window.REPORTS_URL || '/exec';
                const params = window.getExtraParams ? window.getExtraParams() : '';
                const cacheBuster = Date.now();
                const fetchUrl = baseUrl + (baseUrl.includes('?') ? '&' : '?') +
                    `action=getObjectHistory&object_id=${encodeURIComponent(objectId)}&target=database&limit=1&_=${cacheBuster}` +
                    (params.startsWith('&') ? params : '&' + params);

                console.log('🔍 [Checklist] Loading history via GET from:', fetchUrl);
                const historyResp = await fetch(fetchUrl, { method: 'GET', mode: 'cors', cache: 'no-store' });
                const historyData = JSON.parse(await historyResp.text());

                if (historyData.success && historyData.rows && historyData.rows.length > 0) {
                    const latestRow = historyData.rows[historyData.rows.length - 1];
                    console.log('✅ [Checklist] Latest row received:', latestRow);

                    if (latestRow.monitoring_date) {
                        window._loadedMonitoringDate = latestRow.monitoring_date;
                    }

                    // 1. Identify all disabled keys (from config + history)
                    const historyDisabledKeys = [];
                    Object.keys(latestRow).forEach(k => {
                        if (latestRow[k] === '-') {
                            // Try to find the item key for this header
                            const item = baseSchema.items.find(it => it.label === k || it.key === k);
                            if (item) historyDisabledKeys.push(item.key);
                        }
                    });

                    const allDisabledKeys = Array.from(new Set([...disabledKeys, ...historyDisabledKeys]));

                    // 2. Perform ONE final weight recalculation
                    const finalSchema = window.ChecklistManager.recalculateWeights(baseSchema, allDisabledKeys);
                    checklistItems = finalSchema.items || [];
                    markedForDeletion = new Set(allDisabledKeys);

                    // 3. Map values to THE FINAL items
                    checklistItems.forEach(item => {
                        const cleanLabel = item.label.replace(/^\d+(\.\d+)*\s*/, '').trim().toLowerCase();
                        let savedValue = latestRow[item.label];
                        if (savedValue === undefined) savedValue = latestRow[item.label.trim()];

                        // Fuzzy Match if header is contained in clean label
                        if (savedValue === undefined) {
                            const matchKey = Object.keys(latestRow).find(header => {
                                const h = header.trim().toLowerCase();
                                return h === cleanLabel || cleanLabel.startsWith(h) || h.startsWith(cleanLabel);
                            });
                            if (matchKey) savedValue = latestRow[matchKey];
                        }

                        if (savedValue === undefined) savedValue = latestRow[item.key];

                        if (savedValue !== undefined && savedValue !== null && savedValue !== '' && savedValue !== '-') {
                            const numValue = parseFloat(String(savedValue).replace(',', '.'));
                            if (!isNaN(numValue)) {
                                item.value = numValue;
                                item.minValue = numValue; // For validation
                                console.log(`   Mapped ${item.key} (${item.label}) -> ${numValue}%`);
                            }
                        }
                    });

                    // 4. Special fields
                    const skud = latestRow['SPECIAL_SKUD'] || latestRow['СКУД'];
                    const grunt = latestRow['SPECIAL_GRUNT'] || latestRow['ГРУНТ'];
                    const mob = latestRow['SPECIAL_MOB'] || latestRow['Мобилизация трудового ресурса'] || latestRow['Мобилизация трудовых резервов'];
                    if (skud) window._loadedSkud = skud;
                    if (grunt) window._loadedGrunt = grunt;
                    if (mob) window.specialFieldsData.mob = mob;

                    // 5. Recalculate Parent Totals BOTTOM-UP (Level 2 -> Level 1 -> Level 0)
                    const values = {};
                    checklistItems.forEach(it => { values[it.key] = it.value || 0; });

                    for (let l = 2; l >= 0; l--) {
                        checklistItems.filter(it => Number(it.level) === l).forEach(parentItem => {
                            const newValue = window.ChecklistManager.calculateParentValue(parentItem.key, { items: checklistItems }, values);
                            parentItem.value = newValue;
                            values[parentItem.key] = newValue; // Pass result to higher level
                            console.log(`   Recalculated Parent ${parentItem.key} (${parentItem.label}) -> ${newValue}%`);
                        });
                    }
                } else {
                    console.warn('⚠️ [Checklist] No history found');
                }
            } catch (e) {
                console.error('❌ [Checklist] History load ERROR:', e);
            }

            const level1Items = checklistItems.filter(item => item.level === 1);
            const level2Items = checklistItems.filter(item => item.level === 2);

            const renderItem = (item) => {
                const isMarked = markedForDeletion.has(item.key);
                const val = item.value || 0;
                const minVal = item.minValue || 0;
                return `
                    <div class="checklist-item ${isMarked ? 'deleted-item marked-for-deletion' : ''}" data-key="${item.key}">
                        <label class="delete-checkbox">
                            <input type="checkbox" ${isMarked ? 'checked' : ''} onchange="window.toggleItemDeletion('${item.key}', this.checked)">
                            <span class="checkbox-label">${isMarked ? 'Восстановить' : 'Удалить'}</span>
                        </label>
                        <div class="item-content">
                            <div class="item-label">${item.label}</div>
                            <div class="item-controls">
                                <input type="range" min="0" max="100" value="${val}" data-key="${item.key}" data-min-value="${minVal}" oninput="window.updateItemValue(this)" class="item-slider">
                                <div class="item-input-group">
                                    <input type="number" min="0" max="100" value="${val}" data-key="${item.key}" data-min-value="${minVal}" oninput="window.updateItemValue(this)" class="item-number-input">
                                    <span class="item-unit">%</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            };

            const renderSubcategory = (item) => {
                const isMarked = markedForDeletion.has(item.key);
                const isExpanded = expandedSubcategories.has(item.key);
                const children = checklistItems.filter(child => child.parent === item.key);
                return `
                    <div class="checklist-subcategory ${isMarked ? 'deleted-item marked-for-deletion' : ''}" data-key="${item.key}">
                        <div class="checklist-subcategory-header">
                            <label class="delete-checkbox" onclick="event.stopPropagation()">
                                <input type="checkbox" ${isMarked ? 'checked' : ''} onchange="window.toggleItemDeletion('${item.key}', this.checked)">
                                <span class="checkbox-label">${isMarked ? 'Восстановить' : 'Удалить'}</span>
                            </label>
                            <div class="subcategory-header-content" onclick="window.toggleSubcategory('${item.key}')">
                                <span class="expand-icon ${isExpanded ? 'expanded' : ''}">▶</span>
                                <span class="subcategory-title">${item.label}</span>
                                <span class="subcategory-badge">${Math.round(item.value || 0)}%</span>
                            </div>
                        </div>
                        <div class="checklist-subcategory-content" style="display: ${isExpanded ? 'block' : 'none'}">
                            ${children.length ? children.map(c => renderItem(c)).join('') : '<div class="empty-subcategory">Нет пунктов</div>'}
                        </div>
                    </div>`;
            };

            const renderCategory = (item) => {
                const isMarked = markedForDeletion.has(item.key);
                const isExpanded = expandedCategories.has(item.key);
                const children = checklistItems.filter(child => child.parent === item.key);

                let content = '';
                if (children.length) {
                    const hasSubs = children.some(c => checklistItems.some(gc => gc.parent === c.key));
                    content = hasSubs ? children.map(s => renderSubcategory(s)).join('') : children.map(c => renderItem(c)).join('');
                }

                return `
                    <div class="checklist-category ${isMarked ? 'deleted-item marked-for-deletion' : ''}" data-key="${item.key}">
                        <div class="checklist-category-header">
                            <label class="delete-checkbox" onclick="event.stopPropagation()">
                                <input type="checkbox" ${isMarked ? 'checked' : ''} onchange="window.toggleItemDeletion('${item.key}', this.checked)">
                                <span class="checkbox-label">${isMarked ? 'Восстановить' : 'Удалить'}</span>
                            </label>
                            <div class="category-header-content" onclick="window.toggleCategory('${item.key}')">
                                <span class="expand-icon ${isExpanded ? 'expanded' : ''}">▶</span>
                                <span class="category-title">${item.label}</span>
                                <span class="category-badge">${Math.round(item.value || 0)}%</span>
                            </div>
                        </div>
                        <div class="checklist-category-content" style="display: ${isExpanded ? 'block' : 'none'}">
                            ${content || '<div class="empty-category">Нет пунктов</div>'}
                        </div>
                    </div>`;
            };

            const rootItem = checklistItems.find(it => it.key === '1');
            const mainCategories = level1Items.filter(it => it.parent === '1');

            target.innerHTML = `
                <div class="checklist-form">
                    <div class="checklist-header">
                        <label class="checklist-date-label">
                            <span>Дата мониторинга:</span>
                            <input id="cl_date" type="text" value="${window._loadedMonitoringDate || formatDateOnly(new Date())}" class="checklist-date-input">
                        </label>
                    </div>
                    <div class="special-fields-section">
                        <div class="special-field"><label>СКУД</label><div class="toggle-group" id="sf_skud"><button class="toggle-btn toggle-good" onclick="window.setSpecialField('skud', 'Работает')">Работает</button><button class="toggle-btn toggle-bad" onclick="window.setSpecialField('skud', 'Не работает')">Не работает</button></div></div>
                        <div class="special-field"><label>ГРУНТ</label><div class="toggle-group" id="sf_grunt"><button class="toggle-btn toggle-good" onclick="window.setSpecialField('grunt', 'Отсутствуют')">Отсутствуют</button><button class="toggle-btn toggle-bad" onclick="window.setSpecialField('grunt', 'Навалы')">Навалы</button></div></div>
                        <div class="special-field"><label>Мобилизация</label><input type="number" id="sf_mob" placeholder="0" value="${window.specialFieldsData.mob || ''}" onchange="window.specialFieldsData.mob = this.value" style="width: 80px; padding: 6px; text-align: center; border: 1px solid #ddd; border-radius: 6px;"></div>
                    </div>
                    ${rootItem ? `
                    <div class="checklist-root-header" data-key="${rootItem.key}" style="background:#fff; padding:12px 16px; margin-bottom:20px; border-radius:8px; border:2px solid #2ecc71; display:flex; align-items:center; justify-content:space-between; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <span style="display:flex; align-items:center; gap:10px;"><span style="font-size:18px;">🏗️</span><span>${rootItem.label}</span></span>
                        <span class="category-badge" style="background:#2ecc71; color:white;">${Math.round(rootItem.value || 0)}%</span>
                    </div>` : ''}
                    <div class="accordion-controls"><button id="cl_toggle_all" onclick="window.toggleAllAccordions()" class="btn-secondary">Развернуть все</button></div>
                    <div class="checklist-accordion ${isAdaptMode ? 'adapt-mode' : ''}">${mainCategories.map(cat => renderCategory(cat)).join('')}</div>
                    <div class="checklist-actions"><button id="cl_submit" class="btn-primary">Завершить мониторинг</button><button id="cl_adapt" class="btn-secondary">Режим адаптации</button></div>
                </div>`;

            // Restore special fields if loaded
            if (window._loadedSkud) window.setSpecialField('skud', window._loadedSkud);
            if (window._loadedGrunt) window.setSpecialField('grunt', window._loadedGrunt);
            if (window.specialFieldsData.mob) {
                const el = document.getElementById('sf_mob');
                if (el) el.value = window.specialFieldsData.mob;
            }
            // Clear temporary load variables
            delete window._loadedMonitoringDate;
            delete window._loadedSkud;
            delete window._loadedGrunt;

            if (window.dismissNotification) window.dismissNotification();
            setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

            // Handlers
            window.toggleCategory = k => {
                const el = document.querySelector(`.checklist-category[data-key="${k}"]`);
                const content = el.querySelector('.checklist-category-content');
                const isExp = content.style.display !== 'none';
                content.style.display = isExp ? 'none' : 'block';
                el.querySelector('.expand-icon').classList.toggle('expanded', !isExp);
                isExp ? expandedCategories.delete(k) : expandedCategories.add(k);
            };

            window.toggleSubcategory = k => {
                const el = document.querySelector(`.checklist-subcategory[data-key="${k}"]`);
                const content = el.querySelector('.checklist-subcategory-content');
                const isExp = content.style.display !== 'none';
                content.style.display = isExp ? 'none' : 'block';
                el.querySelector('.expand-icon').classList.toggle('expanded', !isExp);
                isExp ? expandedSubcategories.delete(k) : expandedSubcategories.add(k);
            };

            let allExpanded = false;
            window.toggleAllAccordions = () => {
                allExpanded = !allExpanded;
                document.getElementById('cl_toggle_all').textContent = allExpanded ? 'Свернуть все' : 'Развернуть все';
                if (allExpanded) {
                    level1Items.forEach(it => {
                        expandedCategories.add(it.key);
                        const c = document.querySelector(`.checklist-category[data-key="${it.key}"]`);
                        if (c) {
                            c.querySelector('.checklist-category-content').style.display = 'block';
                            c.querySelector('.expand-icon').classList.add('expanded');
                        }
                    });
                    level2Items.forEach(it => {
                        expandedSubcategories.add(it.key);
                        const s = document.querySelector(`.checklist-subcategory[data-key="${it.key}"]`);
                        if (s) {
                            s.querySelector('.checklist-subcategory-content').style.display = 'block';
                            s.querySelector('.expand-icon').classList.add('expanded');
                        }
                    });
                } else {
                    expandedCategories.clear(); expandedSubcategories.clear();
                    document.querySelectorAll('.checklist-category-content, .checklist-subcategory-content').forEach(e => e.style.display = 'none');
                    document.querySelectorAll('.expand-icon').forEach(i => i.classList.remove('expanded'));
                }
            };

            window.updateItemValue = input => {
                const key = input.dataset.key;
                let val = parseFloat(input.value) || 0;
                const minVal = parseFloat(input.dataset.minValue) || 0;

                // Validation for Inspectors
                const userRole = window.userAccessRights || (document.getElementById('currentUser')?.textContent.match(/\(([^)]+)\)/)?.[1] || '');
                if (userRole === 'Инспектор' && minVal > 0 && val < minVal) {
                    val = minVal;
                    if (window.showNotification) {
                        window.showNotification(`⚠️ Инспекторы не могут снижать процент ниже ${minVal}%`, 'warning');
                    }
                }

                const item = checklistItems.find(it => it.key === key);
                if (item) item.value = val;
                document.querySelectorAll(`[data-key="${key}"].item-slider, [data-key="${key}"].item-number-input`).forEach(el => el.value = val);

                // Recalculate
                const values = {};
                checklistItems.forEach(it => { values[it.key] = it.value || 0; });
                const updateDisp = (k) => {
                    const v = window.ChecklistManager.calculateParentValue(k, { items: checklistItems }, values);
                    const it = checklistItems.find(i => i.key === k);
                    if (it) it.value = v;
                    const r = Math.round(v);
                    document.querySelectorAll(`.checklist-category[data-key="${k}"] .category-badge, .checklist-root-header[data-key="${k}"] .category-badge, .checklist-subcategory[data-key="${k}"] .subcategory-badge`).forEach(b => b.textContent = `${r}%`);
                    if (it.parent) updateDisp(it.parent);
                };
                if (item.parent) updateDisp(item.parent);
            };

            window.toggleItemDeletion = (key, isChecked) => {
                markedForDeletion.has(key) ? !isChecked && markedForDeletion.delete(key) : isChecked && markedForDeletion.add(key);
                const isDel = markedForDeletion.has(key);
                const el = document.querySelector(`[data-key="${key}"].checklist-category, [data-key="${key}"].checklist-subcategory, [data-key="${key}"].checklist-item`);
                if (el) {
                    el.classList.toggle('marked-for-deletion', isDel);
                    el.classList.toggle('deleted-item', isDel);
                    el.querySelector('.checkbox-label').textContent = isDel ? 'Восстановить' : 'Удалить';
                }
            };

            document.getElementById('cl_adapt').addEventListener('click', async function () {
                window._isAdaptMode = !window._isAdaptMode;
                isAdaptMode = window._isAdaptMode;
                if (isAdaptMode) {
                    this.textContent = 'Выйти из режима';
                    this.className = 'btn-warning';
                    document.querySelector('.checklist-accordion').classList.add('adapt-mode');
                } else {
                    this.disabled = true; this.textContent = 'Сохранение...';
                    await window.ChecklistManager.saveObjectChecklistConfig(objectId, Array.from(markedForDeletion));
                    window.showNotification('✅ Адаптация сохранена', 'success');
                    openChecklistForm(objectId);
                }
            });

            document.getElementById('cl_submit').addEventListener('click', async () => {
                if (window.showNotification) window.showNotification('⏳ Сохранение...', 'info');
                const rawName = document.getElementById('currentUser')?.textContent.trim() || '';
                const payload = {
                    action: 'submitChecklist',
                    object_id: String(object.id),
                    monitoring_date: document.getElementById('cl_date')?.value || '',
                    inspector: rawName.split('(')[0].trim(),
                    address: object.address || '',
                    list: object.list || ''
                };

                const isEffectivelyDisabled = (k) => {
                    let c = checklistItems.find(it => it.key === k);
                    while (c) { if (markedForDeletion.has(c.key)) return true; c = checklistItems.find(it => it.key === c.parent); }
                    return false;
                };

                checklistItems.forEach(it => { payload[it.key] = isEffectivelyDisabled(it.key) ? '-' : (it.value || 0); });
                payload['SPECIAL_SKUD'] = window.specialFieldsData.skud || '';
                payload['SPECIAL_MOB'] = document.getElementById('sf_mob')?.value || '';
                payload['SPECIAL_GRUNT'] = window.specialFieldsData.grunt || '';

                try {
                    const GAS_URL = window.REPORTS_URL || '/exec';
                    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain' } });
                    const result = JSON.parse(await res.text());
                    if (result.success) {
                        window.showNotification('✅ Сохранено', 'success');
                        if (window.updateMapStatus) window.updateMapStatus(payload.object_id, payload['1'] || 0);
                        setTimeout(() => window.refreshData?.(), 500);
                    }
                } catch (e) { alert('Ошибка: ' + e.message); }
            });

            // Removed redundant historical data load block that was causing "zeros flash"

        } catch (error) {
            console.error(error);
            target.innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
        }
    })();
}

window.openChecklistForm = openChecklistForm;

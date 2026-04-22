// ===== Analytics UI (lazy) =====

function formatAnalyticsTimestampText_(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      const parsed = new Date(text);
      if (!Number.isFinite(parsed.getTime())) return text;
      try {
        return parsed.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return text;
      }
    }

function formatAnalyticsPercentText_(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return '0%';
      const rounded = Math.round(numeric * 10) / 10;
      return `${String(Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)).replace('.', ',')}%`;
    }

function formatAnalyticsDeltaDaysText_(value) {
      const numeric = Math.round(Number(value));
      if (!Number.isFinite(numeric) || numeric <= 0) return '0 д';
      return `${formatAnalyticsCountText_(numeric)} д`;
    }

function getAnalyticsTrackToneClass_(track) {
      const percent = Number(track && track.percent);
      if (!Number.isFinite(percent)) return 'analytics-card--idle';
      if (percent >= 75) return 'analytics-card--strong';
      if (percent >= 35) return 'analytics-card--medium';
      return 'analytics-card--soft';
    }

function formatAnalyticsCountText_(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '0';
      try {
        return Math.round(numeric).toLocaleString('ru-RU');
      } catch (e) {
        return String(Math.round(numeric));
      }
    }

function formatAnalyticsOverPlanText_(factValue, planValue) {
      const fact = Math.max(0, Number(factValue) || 0);
      const plan = Math.max(0, Number(planValue) || 0);
      const overCount = Math.max(0, fact - plan);
      if (!overCount) return '';
      if (!plan) return `+${formatAnalyticsCountText_(overCount)} к плану`;
      return `+${formatAnalyticsCountText_(overCount)} к плану · ${formatAnalyticsPercentText_((overCount / plan) * 100)}`;
    }

function formatAnalyticsShortDateText_(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      const parsedInfo = typeof parseMonitoringDateValue_ === 'function' ? parseMonitoringDateValue_(text) : null;
      const parsed = parsedInfo && parsedInfo.date instanceof Date ? parsedInfo.date : new Date(text);
      if (!Number.isFinite(parsed.getTime())) return text;
      try {
        return parsed.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      } catch (e) {
        return text;
      }
    }

function formatAnalyticsFullDateText_(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      if (typeof formatRegistryDateText_ === 'function') {
        const formatted = String(formatRegistryDateText_(text) || '').trim();
        if (formatted) return formatted;
      }
      return text;
    }

function formatAnalyticsDateInputParts_(value) {
      const normalized = String(value || '').trim();
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
      return {
        day: match ? match[3] : '',
        month: match ? match[2] : '',
        year: match ? match[1] : ''
      };
    }

function formatAnalyticsRangeText_(fromValue, toValue) {
      const fromText = formatAnalyticsShortDateText_(fromValue);
      const toText = formatAnalyticsShortDateText_(toValue);
      if (fromText && toText) return `${fromText} - ${toText}`;
      return fromText || toText || '';
    }

function formatAnalyticsDecimalText_(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '0';
      const rounded = Math.round(numeric * 10) / 10;
      return String(Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)).replace('.', ',');
    }

function formatAnalyticsMinutesText_(value) {
      const numeric = Math.round(Number(value));
      if (!Number.isFinite(numeric) || numeric <= 0) return '—';
      const hours = Math.floor(numeric / 60);
      const minutes = Math.abs(numeric % 60);
      return `${hours}:${String(minutes).padStart(2, '0')}`;
    }

function resetAnalyticsDrilldowns_() {
      state.analyticsDrilldowns = new Map();
      state.analyticsDrilldownSeq = 0;
    }

function registerAnalyticsDrilldown_(rowIndexes) {
      const normalizedRowIndexes = normalizeAnalyticsRegistryDrilldownRowIndexes_(rowIndexes);
      if (!normalizedRowIndexes.length) return '';
      state.analyticsDrilldownSeq = Math.max(0, Number(state.analyticsDrilldownSeq) || 0) + 1;
      const id = `analytics-drilldown-${state.analyticsDrilldownSeq}`;
      state.analyticsDrilldowns.set(id, normalizedRowIndexes);
      return id;
    }

function buildAnalyticsDrilldownAttrs_(rowIndexes, label) {
      const drilldownId = registerAnalyticsDrilldown_(rowIndexes);
      if (!drilldownId) return '';
      const title = String(label || '').trim() || 'Открыть в реестре';
      return (
        ` data-analytics-drilldown="${escapeHtml_(drilldownId)}"` +
        ` tabindex="0"` +
        ` role="button"` +
        ` aria-label="${escapeHtml_(title)}"` +
        ` title="${escapeHtml_(title)}"`
      );
    }

function buildAnalyticsDashboardTrackCardHtml_(track, index) {
      const item = track || {};
      const percent = Math.max(0, Number(item.percent) || 0);
      const progressPercent = Math.max(0, Math.min(Number(item.progressPercent) || percent, 100));
      const plan = formatAnalyticsCountText_(item.plan);
      const fact = formatAnalyticsCountText_(item.fact);
      const overPlanText = formatAnalyticsOverPlanText_(item.fact, item.plan);
      const ratioLabel = String(item.ratioLabel || 'Факт').trim() || 'Факт';
      const rowDelay = 0.08 + (Math.max(0, Number(index) || 0) * 0.08);
      const barDelay = rowDelay + 0.08;
      const title = String(item.title || 'Направление').trim() || 'Направление';
      const drilldownAttrs = buildAnalyticsDrilldownAttrs_(item.planRowIndexes, `${title}: открыть в реестре`);
      return (
        `<article class="analytics-breakdown-row${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs} style="--analytics-row-delay:${escapeHtml_(rowDelay.toFixed(2))}s;--analytics-bar-delay:${escapeHtml_(barDelay.toFixed(2))}s;">` +
          `<div class="analytics-breakdown-row-head">` +
            `<div class="analytics-breakdown-row-title">${escapeHtml_(title)}</div>` +
            `<div class="analytics-breakdown-row-head-meta">` +
              (overPlanText ? `<div class="analytics-breakdown-row-overflow">${escapeHtml_(overPlanText)}</div>` : '') +
              `<div class="analytics-breakdown-row-percent${overPlanText ? ' analytics-breakdown-row-percent--over' : ''}">${escapeHtml_(formatAnalyticsPercentText_(percent))}</div>` +
            `</div>` +
          `</div>` +
          `<div class="analytics-breakdown-row-bar${overPlanText ? ' analytics-breakdown-row-bar--over' : ''}" aria-hidden="true">` +
            `<span style="width:${escapeHtml_(String(progressPercent))}%"></span>` +
          `</div>` +
          `<div class="analytics-breakdown-row-ratio">${escapeHtml_(ratioLabel)} ${escapeHtml_(fact)} из ${escapeHtml_(plan)}</div>` +
        `</article>`
      );
    }

function buildAnalyticsControlSummaryCardHtml_(label, valueText, metaText, tone) {
      return (
        `<article class="analytics-control-summary-card${tone ? ` analytics-control-summary-card--${escapeHtml_(tone)}` : ''}">` +
          `<div class="analytics-control-summary-label">${escapeHtml_(label)}</div>` +
          `<div class="analytics-control-summary-value">${escapeHtml_(valueText)}</div>` +
          `<div class="analytics-control-summary-meta">${escapeHtml_(metaText || ' ')}</div>` +
        `</article>`
      );
    }

function buildAnalyticsControlDivisionFilterHtml_(dashboard) {
      const data = dashboard || {};
      const activeDivision = String(data.activeDivision || '').trim();
      const options = Array.isArray(data.divisionOptions) ? data.divisionOptions : [];
      const totalCount = options.reduce((sum, item) => sum + Math.max(0, Number(item && item.count) || 0), 0);
      const triggerText = activeDivision || 'Все управления';
      const menuHtml = (
        `<div class="analytics-filter-menu analytics-control-filter-menu">` +
          `<div class="analytics-filter-options">` +
            `<button class="analytics-filter-option${!activeDivision ? ' active' : ''}" type="button" data-analytics-control-division-option="__all">` +
              `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
              `<span class="analytics-filter-option-label">Все управления</span>` +
              `<span class="analytics-filter-option-count">${escapeHtml_(formatAnalyticsCountText_(totalCount))}</span>` +
            `</button>` +
            options.map(item => {
              const label = String(item && item.label || '').trim();
              if (!label) return '';
              const active = activeDivision && normalizeText_(activeDivision) === normalizeText_(label);
              const countText = formatAnalyticsCountText_(item && item.count);
              return (
                `<button class="analytics-filter-option${active ? ' active' : ''}" type="button" data-analytics-control-division-option="${escapeHtml_(label)}" data-analytics-filter-label="${escapeHtml_(label)}">` +
                  `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
                  `<span class="analytics-filter-option-label">${escapeHtml_(label)}</span>` +
                  `<span class="analytics-filter-option-count">${escapeHtml_(countText)}</span>` +
                `</button>`
              );
            }).join('') +
          `</div>` +
        `</div>`
      );
      return (
        `<div class="analytics-control-filter-row">` +
          `<details class="analytics-filter-dropdown analytics-control-filter-dropdown">` +
            `<summary class="analytics-filter-trigger analytics-control-filter-trigger" title="${escapeHtml_(triggerText)}" aria-label="${escapeHtml_(`Управление: ${triggerText}`)}">` +
              `<span class="analytics-filter-trigger-text">${escapeHtml_(triggerText)}</span>` +
              `<span class="analytics-filter-trigger-caret" aria-hidden="true"></span>` +
            `</summary>` +
            `${menuHtml}` +
          `</details>` +
        `</div>`
      );
    }

function buildAnalyticsControlDivisionRowHtml_(item, maxMonitorings) {
      const division = item || {};
      const monitorings = Math.max(0, Number(division.monitorings) || 0);
      const violations = Math.max(0, Number(division.violations) || 0);
      const width = maxMonitorings > 0 ? Math.max(6, (monitorings / maxMonitorings) * 100) : 0;
      const active = normalizeText_(state.analyticsControlDivision || '') === normalizeText_(division.division || '');
      return (
        `<button class="analytics-control-bar-row${active ? ' active' : ''}" type="button" data-analytics-control-division="${escapeHtml_(String(division.division || '').trim())}">` +
          `<span class="analytics-control-bar-copy">` +
            `<span class="analytics-control-bar-title">${escapeHtml_(String(division.division || 'Не указано').trim() || 'Не указано')}</span>` +
            `<span class="analytics-control-bar-meta">Инспекторов: ${escapeHtml_(formatAnalyticsCountText_(division.inspectorCount))}</span>` +
          `</span>` +
          `<span class="analytics-control-bar-track" aria-hidden="true"><span style="width:${escapeHtml_(String(width.toFixed(1)))}%"></span></span>` +
          `<span class="analytics-control-bar-values">` +
            `<span class="analytics-control-bar-value">${escapeHtml_(formatAnalyticsCountText_(monitorings))} мон.</span>` +
            `<span class="analytics-control-bar-badge">${escapeHtml_(formatAnalyticsCountText_(violations))} наруш.</span>` +
          `</span>` +
        `</button>`
      );
    }

function buildAnalyticsControlInspectorBarRowHtml_(item, maxMonitorings) {
      const inspector = item || {};
      const monitorings = Math.max(0, Number(inspector.monitorings) || 0);
      const width = maxMonitorings > 0 ? Math.max(6, (monitorings / maxMonitorings) * 100) : 0;
      const active = normalizeText_(state.analyticsControlSelectedInspector || '') === normalizeText_(inspector.inspectorKey || '');
      return (
        `<button class="analytics-control-bar-row analytics-control-bar-row--inspector${active ? ' active' : ''}" type="button" data-analytics-control-inspector="${escapeHtml_(String(inspector.inspectorKey || '').trim())}">` +
          `<span class="analytics-control-bar-copy">` +
            `<span class="analytics-control-bar-title">${escapeHtml_(String(inspector.inspector || '').trim() || 'Инспектор')}</span>` +
            `<span class="analytics-control-bar-meta">${escapeHtml_(String(inspector.division || '').trim() || 'Не указано')}</span>` +
          `</span>` +
          `<span class="analytics-control-bar-track" aria-hidden="true"><span style="width:${escapeHtml_(String(width.toFixed(1)))}%"></span></span>` +
          `<span class="analytics-control-bar-values">` +
            `<span class="analytics-control-bar-value">${escapeHtml_(formatAnalyticsCountText_(monitorings))} мон.</span>` +
            `<span class="analytics-control-bar-badge">${escapeHtml_(formatAnalyticsCountText_(inspector.violations))} наруш.</span>` +
          `</span>` +
        `</button>`
      );
    }

function buildAnalyticsControlInspectorTableHtml_(dashboard) {
      const inspectors = Array.isArray(dashboard && dashboard.filteredInspectors) ? dashboard.filteredInspectors : [];
      if (!inspectors.length) return `<div class="analytics-view-message">Нет инспекторов в выбранном управлении.</div>`;
      return (
        `<div class="analytics-control-table-shell">` +
          `<table class="analytics-control-table">` +
            `<thead>` +
              `<tr>` +
                `<th>Инспектор</th>` +
                `<th>Управление</th>` +
                `<th>Мониторинги</th>` +
                `<th>Среднее рабочее время</th>` +
                `<th>Нарушения</th>` +
              `</tr>` +
            `</thead>` +
            `<tbody>` +
              inspectors.map(item => {
                const active = normalizeText_(state.analyticsControlSelectedInspector || '') === normalizeText_(item.inspectorKey || '');
                return (
                  `<tr class="${active ? 'active' : ''}" data-analytics-control-inspector="${escapeHtml_(String(item.inspectorKey || '').trim())}" tabindex="0">` +
                    `<td>${escapeHtml_(String(item.inspector || '').trim() || 'Инспектор')}</td>` +
                    `<td>${escapeHtml_(String(item.division || '').trim() || 'Не указано')}</td>` +
                    `<td>${escapeHtml_(formatAnalyticsCountText_(item.monitorings))}</td>` +
                    `<td>${escapeHtml_(formatAnalyticsMinutesText_(item.averageWorkMinutes))}</td>` +
                    `<td><span class="analytics-control-violation-pill${Number(item.violations || 0) > 0 ? ' analytics-control-violation-pill--alert' : ''}">${escapeHtml_(formatAnalyticsCountText_(item.violations))}</span></td>` +
                  `</tr>`
                );
              }).join('') +
            `</tbody>` +
          `</table>` +
        `</div>`
      );
    }

function buildAnalyticsControlDailyTableHtml_(inspectorRecord) {
      const inspector = inspectorRecord || {};
      const days = Array.isArray(inspector.dailyRows) ? inspector.dailyRows : [];
      if (!days.length) return `<div class="analytics-view-message">По этому инспектору пока нет строк контроля.</div>`;
      return (
        `<div class="analytics-control-detail-shell">` +
          `<div class="analytics-control-detail-head">` +
            `<div>` +
              `<div class="analytics-control-detail-title">${escapeHtml_(String(inspector.inspector || '').trim() || 'Инспектор')}</div>` +
              `<div class="analytics-control-detail-subtitle">${escapeHtml_(String(inspector.division || '').trim() || 'Не указано')}</div>` +
            `</div>` +
            `<button class="ghost analytics-refresh-button" type="button" data-analytics-control-clear-inspector="1">Скрыть</button>` +
          `</div>` +
          `<div class="analytics-control-table-shell analytics-control-table-shell--detail">` +
            `<table class="analytics-control-table analytics-control-table--detail">` +
              `<thead>` +
                `<tr>` +
                  `<th>День</th>` +
                  `<th>Мониторинги</th>` +
                  `<th>Открытие дня</th>` +
                  `<th>Закрытие дня</th>` +
                  `<th>Рабочее время</th>` +
                  `<th>СКУД</th>` +
                  `<th>Нарушение</th>` +
                  `<th>Комментарий</th>` +
                `</tr>` +
              `</thead>` +
              `<tbody>` +
                days.map(item => (
                  `<tr>` +
                    `<td>${escapeHtml_(formatAnalyticsShortDateText_(item.date) || item.dateDisplay || item.date || '—')}</td>` +
                    `<td>${escapeHtml_(formatAnalyticsCountText_(item.monitorings))}</td>` +
                    `<td>${escapeHtml_(item.openingText || '—')}</td>` +
                    `<td>${escapeHtml_(item.closingText || '—')}</td>` +
                    `<td>${escapeHtml_(formatAnalyticsMinutesText_(item.workMinutes))}</td>` +
                    `<td>${escapeHtml_(String(item.skudLabel || 'Нет данных').trim() || 'Нет данных')}</td>` +
                    `<td><span class="analytics-control-violation-pill${item.hasViolation ? ' analytics-control-violation-pill--alert' : ''}">${item.hasViolation ? 'Да' : 'Нет'}</span></td>` +
                    `<td>${escapeHtml_(String(item.commentText || '—').trim() || '—')}</td>` +
                  `</tr>`
                )).join('') +
              `</tbody>` +
            `</table>` +
          `</div>` +
        `</div>`
      );
    }

function buildAnalyticsControlStatusBadgeHtml_(title, statusRecord, fallbackLabel) {
      const data = statusRecord && typeof statusRecord === 'object' ? statusRecord : {};
      const hasData = (
        Number(data.loadedDays || 0) > 0
        || (Array.isArray(data.loadedDates) && data.loadedDates.length > 0)
        || String(data.status || '').trim() === 'ok'
        || String(data.status || '').trim() === 'partial'
      );
      const status = hasData ? 'ok' : 'missing';
      const label = hasData ? 'Есть данные за период' : (String(fallbackLabel || 'Нет данных').trim() || 'Нет данных');
      return (
        `<div class="analytics-control-status-badge analytics-control-status-badge--${escapeHtml_(status)}">` +
          `<span class="analytics-control-status-badge-title">${escapeHtml_(title)}</span>` +
          `<span class="analytics-control-status-badge-label">${escapeHtml_(label)}</span>` +
        `</div>`
      );
    }

function buildAnalyticsControlCompactStatusBadgeHtml_(title, statusRecord, fallbackLabel) {
      const data = statusRecord && typeof statusRecord === 'object' ? statusRecord : {};
      const hasData = (
        Number(data.loadedDays || 0) > 0
        || (Array.isArray(data.loadedDates) && data.loadedDates.length > 0)
        || String(data.status || '').trim() === 'ok'
        || String(data.status || '').trim() === 'partial'
      );
      const status = hasData ? 'ok' : 'missing';
      const label = hasData ? 'Есть данные' : (String(fallbackLabel || 'Нет данных').trim() || 'Нет данных');
      return (
        `<div class="analytics-control-status-badge analytics-control-status-badge--${escapeHtml_(status)}">` +
          `<span class="analytics-control-status-badge-dot" aria-hidden="true"></span>` +
          `<span class="analytics-control-status-badge-title">${escapeHtml_(title)}</span>` +
          `<span class="analytics-control-status-badge-separator" aria-hidden="true">•</span>` +
          `<span class="analytics-control-status-badge-label">${escapeHtml_(label)}</span>` +
        `</div>`
      );
    }

function buildAnalyticsControlToolbarHtml_(dashboard) {
      const dateFrom = normalizeAnalyticsArchiveDateValue_(state.analyticsControlDateFrom || dashboard && dashboard.periodFrom);
      const dateTo = normalizeAnalyticsArchiveDateValue_(state.analyticsControlDateTo || dashboard && dashboard.periodTo);
      const uploadNotice = String(state.analyticsControlUploadNotice || '').trim();
      const uploadError = String(state.analyticsControlUploadError || '').trim();
      const skudUploading = !!state.analyticsControlSkudUploading;
      return (
        `<section class="analytics-control-toolbar">` +
          `<div class="analytics-control-toolbar-main">` +
            `<label class="analytics-control-date-field">` +
              `<span>С</span>` +
              `<input type="date" value="${escapeHtml_(dateFrom)}" data-analytics-control-date="from">` +
            `</label>` +
            `<label class="analytics-control-date-field">` +
              `<span>По</span>` +
              `<input type="date" value="${escapeHtml_(dateTo)}" data-analytics-control-date="to">` +
            `</label>` +
            `<button class="analytics-refresh-button analytics-control-toolbar-button analytics-control-toolbar-button--primary" type="button" data-analytics-control-apply-period="1"${state.analyticsLoading ? ' disabled' : ''}>Показать</button>` +
            `${buildAnalyticsControlCompactStatusBadgeHtml_('СКУД', dashboard && dashboard.skudStatus, 'Нет СКУД')}` +
          `</div>` +
          (
            uploadError
              ? `<div class="analytics-view-message analytics-view-message--error">${escapeHtml_(uploadError)}</div>`
              : (
                  uploadNotice
                    ? `<div class="analytics-view-message">${escapeHtml_(uploadNotice)}</div>`
                    : ''
                )
          ) +
        `</section>`
      );
    }

function buildAnalyticsWorkControlDashboardHtml_() {
      const dashboard = typeof getAnalyticsWorkControlViewModel_ === 'function'
        ? getAnalyticsWorkControlViewModel_(state.analyticsDashboard && state.analyticsDashboard.workControl)
        : (
            state.analyticsDashboard && state.analyticsDashboard.workControl
              ? state.analyticsDashboard.workControl
              : buildEmptyAnalyticsWorkControlDashboard_()
          );
      const inspectors = Array.isArray(dashboard.filteredInspectors) ? dashboard.filteredInspectors : [];
      const divisions = Array.isArray(dashboard.divisions) ? dashboard.divisions : [];
      const activeDivisionLabel = String(dashboard.activeDivision || '').trim();
      const hasActiveDivision = !!activeDivisionLabel;
      const maxDivisionMonitorings = divisions.reduce((max, item) => Math.max(max, Number(item && item.monitorings) || 0), 0);
      const controlRangeMeta = dashboard.available
        ? `${String(dashboard.sourceLabel || 'База данных').trim()} · ${formatAnalyticsRangeText_(dashboard.periodFrom, dashboard.periodTo) || 'Период не выбран'}`
        : 'База данных';
      const controlEmptyState = dashboard.errorText
        ? `<div class="analytics-view-message analytics-view-message--error">${escapeHtml_(dashboard.errorText)}</div>`
        : `<div class="analytics-view-message">За выбранный период пока нет данных.</div>`;
      const summaryCardsHtml = [
        buildAnalyticsControlSummaryCardHtml_('Мониторинги', formatAnalyticsCountText_(dashboard.displayMonitorings), 'По архиву за период', ''),
        buildAnalyticsControlSummaryCardHtml_('Инспекторы', formatAnalyticsCountText_(dashboard.displayInspectors), 'В текущем срезе', ''),
        buildAnalyticsControlSummaryCardHtml_('Нарушения', formatAnalyticsCountText_(dashboard.displayViolations), 'Только серьёзные случаи', 'alert'),
        buildAnalyticsControlSummaryCardHtml_('Среднее рабочее время', formatAnalyticsMinutesText_(dashboard.displayAverageWorkMinutes), 'Только по полным дням 9ч+', '')
      ].join('');
      const skudUploading = !!state.analyticsControlSkudUploading;
      if (!dashboard.available) {
        return (
          `<div class="analytics-dashboard analytics-dashboard--control">` +
            `<section class="analytics-dashboard-header">` +
              `<div class="analytics-dashboard-header-main">` +
                `<div class="analytics-dashboard-kicker">Аналитика</div>` +
                `<h2>Контроль работы</h2>` +
                `<div class="analytics-dashboard-meta-line">${escapeHtml_(controlRangeMeta)}</div>` +
              `</div>` +
              `<div class="analytics-dashboard-header-actions">` +
                `<button id="btnRefreshAnalyticsDashboardView" class="ghost analytics-refresh-button" type="button"${state.analyticsLoading ? ' disabled' : ''}>Обновить</button>` +
                `<button class="ghost analytics-refresh-button" type="button" data-analytics-control-upload-skud="1"${skudUploading ? ' disabled' : ''}>${skudUploading ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0421\u041a\u0423\u0414\u2026' : '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0421\u041a\u0423\u0414'}</button>` +
                `<input type="file" hidden accept=".csv,text/csv" data-analytics-control-skud-input="1">` +
              `</div>` +
            `</section>` +
            `${buildAnalyticsControlToolbarHtml_(dashboard)}` +
            `${controlEmptyState}` +
          `</div>`
        );
      }
      return (
        `<div class="analytics-dashboard analytics-dashboard--control">` +
          `<section class="analytics-dashboard-header">` +
            `<div class="analytics-dashboard-header-main">` +
              `<div class="analytics-dashboard-kicker">Аналитика</div>` +
              `<h2>Контроль работы</h2>` +
              `<div class="analytics-dashboard-meta-line">${escapeHtml_(controlRangeMeta)}</div>` +
            `</div>` +
            `<div class="analytics-dashboard-header-actions">` +
              `<button id="btnRefreshAnalyticsDashboardView" class="ghost analytics-refresh-button" type="button"${state.analyticsLoading ? ' disabled' : ''}>Обновить</button>` +
                `<button class="ghost analytics-refresh-button" type="button" data-analytics-control-upload-skud="1"${skudUploading ? ' disabled' : ''}>${skudUploading ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0421\u041a\u0423\u0414\u2026' : '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0421\u041a\u0423\u0414'}</button>` +
                `<input type="file" hidden accept=".csv,text/csv" data-analytics-control-skud-input="1">` +
              `</div>` +
          `</section>` +
          `${buildAnalyticsControlToolbarHtml_(dashboard)}` +
          `${buildAnalyticsControlDivisionFilterHtml_(dashboard)}` +
          `<section class="analytics-control-summary-grid">${summaryCardsHtml}</section>` +
          (
            hasActiveDivision
              ? ''
              : (
                  `<section class="analytics-control-visual-grid analytics-control-visual-grid--wide">` +
                    `<article class="analytics-control-card">` +
                      `<div class="analytics-control-card-title">Нарушения по управлениям</div>` +
                      `<div class="analytics-control-card-subtitle">Выберите управление сверху, чтобы перейти к инспекторам. Бэйдж справа показывает количество дней с нарушением.</div>` +
                      `<div class="analytics-control-bar-list">${divisions.map(item => buildAnalyticsControlDivisionRowHtml_(item, maxDivisionMonitorings)).join('')}</div>` +
                    `</article>` +
                  `</section>`
                )
          ) +
          `<section class="analytics-control-card analytics-control-card--table">` +
            `<div class="analytics-control-card-title">${escapeHtml_(hasActiveDivision ? `Сводка по инспекторам · ${activeDivisionLabel}` : 'Сводка по инспекторам')}</div>` +
            `<div class="analytics-control-card-subtitle">${escapeHtml_(hasActiveDivision ? 'Только инспекторы выбранного управления. Кликните по строке, чтобы открыть разбор по дням.' : 'Все инспекторы за выбранный период. Сортировка по убыванию нарушений, затем по мониторингам.')}</div>` +
            `${buildAnalyticsControlInspectorTableHtml_(dashboard)}` +
          `</section>` +
          `<section class="analytics-control-card analytics-control-card--detail">` +
            `<div class="analytics-control-card-title">Разбор по дням</div>` +
            `<div class="analytics-control-card-subtitle">Без третьего уровня: всё важное сразу в строке дня</div>` +
            (
              dashboard.selectedInspectorRecord
                ? buildAnalyticsControlDailyTableHtml_(dashboard.selectedInspectorRecord)
                : `<div class="analytics-view-message">Выберите инспектора в графике или в таблице, чтобы увидеть дни.</div>`
            ) +
          `</section>` +
        `</div>`
      );
    }

function buildAnalyticsPanelNavHtml_() {
      const analyticsActive = state.currentView === 'analytics';
      const analyticsSection = normalizeAnalyticsSection_(state.analyticsSection);
      const sectionDefs = Array.isArray(ANALYTICS_PANEL_SECTION_DEFS)
        ? ANALYTICS_PANEL_SECTION_DEFS.filter(item => item && String(item.key || '').trim())
        : [];
      return (
        `<section class="sidebar-section analytics-panel analytics-panel--compact">` +
          `<div class="quick-preset-grid analytics-panel-nav">` +
            sectionDefs.map(item => {
              const key = String(item.key || '').trim();
              const title = String(item.title || '').trim() || key;
              const active = analyticsActive && analyticsSection === key;
              return (
                `<div class="preset-row">` +
                  `<button class="quick-preset${active ? ' active' : ''}" type="button" data-open-analytics-section="${escapeHtml_(key)}" aria-pressed="${active ? 'true' : 'false'}">` +
                    `<span class="preset-trigger-main"><span class="preset-trigger-title">${escapeHtml_(title)}</span></span>` +
                  `</button>` +
                `</div>`
              );
            }).join('') +
          `</div>` +
        `</section>`
      );
    }

function bindAnalyticsPanelEvents_(root) {
      const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
      scope.querySelectorAll('[data-open-analytics-section]').forEach(button => {
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
      panel.innerHTML = buildAnalyticsPanelNavHtml_();
      bindAnalyticsPanelEvents_(panel);
    }

function bindAnalyticsViewEvents_() {
      const view = el('analyticsView');
      const refreshButton = el('btnRefreshAnalyticsDashboardView');
      if (refreshButton) {
        refreshButton.onclick = evt => {
          evt.preventDefault();
          evt.stopPropagation();
          if (normalizeAnalyticsSection_(state.analyticsSection) === 'ksg') {
            loadData_({ force: true, preserveView: 'analytics' }).catch(() => {});
            return;
          }
          loadAnalyticsDashboard_({ force: true }).catch(() => {});
        };
      }
      if (view) {
        view.querySelectorAll('[data-analytics-drilldown]').forEach(node => {
          const activate = evt => {
            if (evt) {
              evt.preventDefault();
              evt.stopPropagation();
            }
            const drilldownId = String(node.getAttribute('data-analytics-drilldown') || '').trim();
            if (!drilldownId) return;
            const drilldowns = state.analyticsDrilldowns instanceof Map ? state.analyticsDrilldowns : new Map();
            openAnalyticsRegistryDrilldown_(drilldowns.get(drilldownId));
          };
          node.onclick = activate;
          node.onkeydown = evt => {
            if (evt.key !== 'Enter' && evt.key !== ' ') return;
            activate(evt);
          };
        });
      }
      if (!view) return;
      const analyticsSection = normalizeAnalyticsSection_(state.analyticsSection);
      if (typeof isAnalyticsControlSection_ === 'function' && isAnalyticsControlSection_(analyticsSection)) {
        const commitControlDateRange = (nextFromValue, nextToValue) => {
          let nextFrom = normalizeAnalyticsArchiveDateValue_(nextFromValue);
          let nextTo = normalizeAnalyticsArchiveDateValue_(nextToValue);
          if (nextFrom && nextTo && nextFrom > nextTo) {
            const swap = nextFrom;
            nextFrom = nextTo;
            nextTo = swap;
          }
          state.analyticsControlDateFrom = nextFrom;
          state.analyticsControlDateTo = nextTo;
          persistRegistrySessionState_();
        };
        const readControlDateValue = key => normalizeAnalyticsArchiveDateValue_(
          (view.querySelector(`[data-analytics-control-date="${key}"]`) || {}).value
        );
        const controlSkudInput = view.querySelector('[data-analytics-control-skud-input="1"]');
        const rerenderControlViewPreservingScroll = () => {
          const nextScrollTop = Number(view && view.scrollTop) || 0;
          renderAnalyticsView_();
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
              if (view) view.scrollTop = nextScrollTop;
            });
            return;
          }
          if (view) view.scrollTop = nextScrollTop;
        };
        const applyAnalyticsControlDivisionFilter = value => {
          state.analyticsControlDivision = value === '__all' ? '' : String(value || '').trim();
          state.analyticsControlSelectedInspector = '';
          persistRegistrySessionState_();
          renderAnalyticsView_();
        };
        view.querySelectorAll('[data-analytics-control-division]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            applyAnalyticsControlDivisionFilter(String(button.getAttribute('data-analytics-control-division') || '').trim());
          };
        });
        view.querySelectorAll('[data-analytics-control-division-option]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            const dropdown = button.closest('details');
            if (dropdown) dropdown.removeAttribute('open');
            applyAnalyticsControlDivisionFilter(String(button.getAttribute('data-analytics-control-division-option') || '').trim());
          };
        });
        view.querySelectorAll('[data-analytics-control-inspector]').forEach(node => {
          const activate = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            const nextValue = String(node.getAttribute('data-analytics-control-inspector') || '').trim();
            if (!nextValue) return;
            state.analyticsControlSelectedInspector = normalizeText_(state.analyticsControlSelectedInspector || '') === normalizeText_(nextValue)
              ? ''
              : nextValue;
            persistRegistrySessionState_();
            renderAnalyticsView_();
          };
          node.onclick = activate;
          node.onkeydown = evt => {
            if (evt.key !== 'Enter' && evt.key !== ' ') return;
            activate(evt);
          };
        });
        view.querySelectorAll('[data-analytics-control-clear-inspector]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            state.analyticsControlSelectedInspector = '';
            persistRegistrySessionState_();
            renderAnalyticsView_();
          };
        });
        view.querySelectorAll('[data-analytics-control-apply-period]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            commitControlDateRange(
              readControlDateValue('from'),
              readControlDateValue('to')
            );
            state.analyticsControlSelectedInspector = '';
            state.analyticsControlUploadError = '';
            state.analyticsControlUploadNotice = '';
            loadAnalyticsDashboard_({ force: true }).catch(() => {});
          };
        });
        view.querySelectorAll('[data-analytics-control-date]').forEach(input => {
          input.onkeydown = evt => {
            if (evt.key !== 'Enter') return;
            evt.preventDefault();
            evt.stopPropagation();
            commitControlDateRange(
              readControlDateValue('from'),
              readControlDateValue('to')
            );
            state.analyticsControlSelectedInspector = '';
            state.analyticsControlUploadError = '';
            state.analyticsControlUploadNotice = '';
            loadAnalyticsDashboard_({ force: true }).catch(() => {});
          };
        });
        view.querySelectorAll('[data-analytics-control-upload-skud]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            if (controlSkudInput) controlSkudInput.click();
          };
        });
        if (controlSkudInput) {
          controlSkudInput.onchange = async () => {
            const file = controlSkudInput.files && controlSkudInput.files[0];
            controlSkudInput.value = '';
            if (!file) return;
            state.analyticsControlSkudUploading = true;
            state.analyticsControlUploadError = '';
            state.analyticsControlUploadNotice = '';
            rerenderControlViewPreservingScroll();
            try {
              const result = await importAnalyticsControlSkudFile_(file);
              state.analyticsControlUploadNotice = result && result.periodFrom && result.periodTo
                ? `СКУД загружен: ${formatAnalyticsRangeText_(result.periodFrom, result.periodTo)}`
                : 'СКУД загружен';
              await loadAnalyticsDashboard_({ force: true, silent: true });
            } catch (error) {
              state.analyticsControlUploadError = error && error.message ? error.message : 'Не удалось загрузить СКУД';
            } finally {
              state.analyticsControlSkudUploading = false;
              rerenderControlViewPreservingScroll();
            }
          };
        }
        return;
      }
      if (analyticsSection !== 'ksg') {
        return;
      }
      view.querySelectorAll('[data-analytics-ksg-date]').forEach(input => {
        const applyValue = () => {
          const key = String(input.getAttribute('data-analytics-ksg-date') || '').trim();
          const value = normalizeAnalyticsArchiveDateValue_(String(input.value || ''));
          if (key === 'from') state.analyticsKsgDateFrom = value;
          if (key === 'to') state.analyticsKsgDateTo = value;
        };
        input.oninput = applyValue;
        input.onchange = applyValue;
        input.onkeydown = evt => {
          if (evt.key !== 'Enter') return;
          evt.preventDefault();
          applyValue();
          const applyButton = view.querySelector('[data-analytics-ksg-apply-period]');
          if (applyButton) applyButton.click();
        };
      });
      view.querySelectorAll('[data-analytics-ksg-apply-period]').forEach(button => {
        button.onclick = evt => {
          evt.preventDefault();
          evt.stopPropagation();
          const dateFromInput = view.querySelector('[data-analytics-ksg-date="from"]');
          const dateToInput = view.querySelector('[data-analytics-ksg-date="to"]');
          state.analyticsKsgDateFrom = normalizeAnalyticsArchiveDateValue_(dateFromInput && dateFromInput.value);
          state.analyticsKsgDateTo = normalizeAnalyticsArchiveDateValue_(dateToInput && dateToInput.value);
          if (state.analyticsKsgDateFrom && state.analyticsKsgDateTo && state.analyticsKsgDateFrom > state.analyticsKsgDateTo) {
            const swap = state.analyticsKsgDateFrom;
            state.analyticsKsgDateFrom = state.analyticsKsgDateTo;
            state.analyticsKsgDateTo = swap;
          }
          persistRegistrySessionState_();
          renderAnalyticsView_();
        };
      });
      view.querySelectorAll('[data-analytics-ksg-contractor-search]').forEach(input => {
        input.oninput = () => {
          const query = normalizeText_(String(input.value || ''));
          const menu = input.closest('.analytics-filter-menu');
          if (!menu) return;
          menu.querySelectorAll('[data-analytics-ksg-contractor]').forEach(button => {
            const value = String(button.getAttribute('data-analytics-ksg-contractor') || '').trim();
            if (value === '__all') {
              button.hidden = false;
              return;
            }
            const label = normalizeText_(String(button.getAttribute('data-analytics-filter-label') || value));
            button.hidden = !!query && !label.includes(query);
          });
        };
      });
      view.querySelectorAll('[data-analytics-ksg-filter]').forEach(node => {
        node.ontoggle = () => {
          const key = String(node.getAttribute('data-analytics-ksg-filter') || '').trim();
          if (!key) return;
          if (node.open) {
            state.analyticsKsgOpenFilter = key;
            return;
          }
          if (state.analyticsKsgOpenFilter === key) state.analyticsKsgOpenFilter = '';
        };
      });
      view.querySelectorAll('[data-analytics-ksg-contractor]').forEach(button => {
        button.onclick = evt => {
          evt.preventDefault();
          evt.stopPropagation();
          const value = String(button.getAttribute('data-analytics-ksg-contractor') || '').trim();
          if (!value) return;
          state.analyticsKsgOpenFilter = 'contractor';
          if (value === '__all') {
            state.analyticsKsgContractors = [];
          } else {
            const next = new Set(normalizeAnalyticsKsgContractorFilters_(state.analyticsKsgContractors));
            if (next.has(value)) next.delete(value);
            else next.add(value);
            const availableValues = Array.from(view.querySelectorAll('[data-analytics-ksg-contractor]'))
              .map(node => String(node.getAttribute('data-analytics-ksg-contractor') || '').trim())
              .filter(item => item && item !== '__all');
            if (!next.size || (availableValues.length && next.size >= availableValues.length)) {
              state.analyticsKsgContractors = [];
            } else {
              state.analyticsKsgContractors = Array.from(next);
            }
          }
          persistRegistrySessionState_();
          renderAnalyticsView_();
        };
      });
      view.querySelectorAll('[data-analytics-ksg-grbs-search]').forEach(input => {
        input.oninput = () => {
          const query = normalizeText_(String(input.value || ''));
          const menu = input.closest('.analytics-filter-menu');
          if (!menu) return;
          menu.querySelectorAll('[data-analytics-ksg-grbs]').forEach(button => {
            const value = String(button.getAttribute('data-analytics-ksg-grbs') || '').trim();
            if (value === '__all') {
              button.hidden = false;
              return;
            }
            const label = normalizeText_(String(button.getAttribute('data-analytics-filter-label') || value));
            button.hidden = !!query && !label.includes(query);
          });
        };
      });
      view.querySelectorAll('[data-analytics-ksg-grbs]').forEach(button => {
        button.onclick = evt => {
          evt.preventDefault();
          evt.stopPropagation();
          const value = String(button.getAttribute('data-analytics-ksg-grbs') || '').trim();
          if (!value) return;
          state.analyticsKsgOpenFilter = 'grbs';
          if (value === '__all') {
            state.analyticsKsgGrbs = [];
          } else {
            const next = new Set(normalizeAnalyticsKsgGrbsFilters_(state.analyticsKsgGrbs));
            if (next.has(value)) next.delete(value);
            else next.add(value);
            const availableValues = Array.from(view.querySelectorAll('[data-analytics-ksg-grbs]'))
              .map(node => String(node.getAttribute('data-analytics-ksg-grbs') || '').trim())
              .filter(item => item && item !== '__all');
            if (!next.size || (availableValues.length && next.size >= availableValues.length)) {
              state.analyticsKsgGrbs = [];
            } else {
              state.analyticsKsgGrbs = Array.from(next);
            }
          }
          persistRegistrySessionState_();
          renderAnalyticsView_();
        };
      });
    }

function buildAnalyticsGaugeHtml_(options) {
      const settings = options || {};
      const dashValue = Math.max(0, Math.min(Number(settings.gaugePercent) || 0, 100));
      const valueText = String(settings.valueText || '').trim();
      const ratioText = String(settings.ratioText || '').trim();
      const overflowText = String(settings.overflowText || '').trim();
      const ariaLabel = String(settings.ariaLabel || `${valueText}${ratioText ? `, ${ratioText}` : ''}`).trim();
      const wrapperClass = String(settings.wrapperClass || '').trim();
      const wrapperAttrs = String(settings.wrapperAttrs || '');
      const minSegmentLength = Math.max(0, Number(settings.minSegmentLength) || 0);
      const rawSegments = Array.isArray(settings.segments) ? settings.segments : [];
      const segmentTotal = Math.max(0, Number(settings.segmentTotal) || 0);
      const segments = segmentTotal > 0
        ? rawSegments
          .map(segment => ({
            key: String(segment && segment.key || '').trim(),
            value: Math.max(0, Number(segment && segment.value) || 0)
          }))
          .filter(segment => segment.key && segment.value > 0)
        : [];
      let segmentOffset = 0;
      const segmentPaths = segments.map(segment => {
        const remaining = Math.max(0, 100 - segmentOffset);
        const actualLength = (segment.value / segmentTotal) * 100;
        const displayLength = Math.max(actualLength, minSegmentLength);
        const segmentLength = Math.max(0, Math.min(displayLength, remaining));
        const pathHtml = (
          `<path class="analytics-total-gauge-segment analytics-total-gauge-segment--${escapeHtml_(segment.key)}" d="M30 110 A80 80 0 0 1 190 110" pathLength="100" style="stroke-dasharray:${escapeHtml_(segmentLength.toFixed(2))} 100;stroke-dashoffset:-${escapeHtml_(segmentOffset.toFixed(2))};"></path>`
        );
        segmentOffset += segmentLength;
        return pathHtml;
      }).join('');
      const firstSegmentKey = segments.length ? segments[0].key : '';
      const segmentCaps = firstSegmentKey
        ? (
            `<path class="analytics-total-gauge-cap analytics-total-gauge-cap--${escapeHtml_(firstSegmentKey)}" d="M30 110 A80 80 0 0 1 190 110" pathLength="100" style="stroke-dasharray:0.18 100;stroke-dashoffset:0;"></path>`
          )
        : '';
      const gaugeClass = [
        'analytics-total-gauge',
        settings.inverted ? 'analytics-total-gauge--inverted' : '',
        settings.secondary ? 'analytics-total-gauge--secondary' : '',
        settings.compact ? 'analytics-total-gauge--compact' : '',
        overflowText ? 'analytics-total-gauge--over' : '',
        segmentPaths ? 'analytics-total-gauge--segmented' : '',
        wrapperClass
      ].filter(Boolean).join(' ');
      return (
        `<div class="${escapeHtml_(gaugeClass)}"${wrapperAttrs} style="--analytics-gauge-value:${escapeHtml_(dashValue.toFixed(2))};">` +
          `<svg class="analytics-total-gauge-svg" viewBox="0 0 220 140" aria-hidden="true" focusable="false">` +
            `<path class="analytics-total-gauge-track" d="M30 110 A80 80 0 0 1 190 110" pathLength="100"></path>` +
            (
              (segmentPaths ? `${segmentPaths}${segmentCaps}` : '') ||
              `<path class="analytics-total-gauge-value" d="M30 110 A80 80 0 0 1 190 110" pathLength="100"></path>`
            ) +
          `</svg>` +
          `<div class="analytics-total-gauge-inner" role="img" aria-label="${escapeHtml_(ariaLabel)}">` +
            `<div class="analytics-total-gauge-percent">${escapeHtml_(valueText)}</div>` +
            `<div class="analytics-total-gauge-ratio">${escapeHtml_(ratioText)}</div>` +
            (overflowText ? `<div class="analytics-total-gauge-overflow">${escapeHtml_(overflowText)}</div>` : '') +
          `</div>` +
        `</div>`
      );
    }

function buildAnalyticsKsgSummaryCardHtml_(label, value, tone, meta, rowIndexes) {
      const toneClass = tone ? ` analytics-ksg-summary-card--${tone}` : '';
      const drilldownAttrs = buildAnalyticsDrilldownAttrs_(rowIndexes, `${label}: открыть объекты в реестре`);
      return (
        `<article class="analytics-ksg-summary-card${toneClass}${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs}>` +
          `<div class="analytics-ksg-summary-card-label">${escapeHtml_(label)}</div>` +
          `<div class="analytics-ksg-summary-card-value">${escapeHtml_(formatAnalyticsCountText_(value))}</div>` +
          `<div class="analytics-ksg-summary-card-meta">${escapeHtml_(meta || ' ')}</div>` +
        `</article>`
      );
    }

function buildAnalyticsKsgPeriodControlsHtml_(dashboard) {
      const data = dashboard || {};
      const dateFrom = normalizeAnalyticsArchiveDateValue_(data.activeDateFrom || state.analyticsKsgDateFrom);
      const dateTo = normalizeAnalyticsArchiveDateValue_(data.activeDateTo || state.analyticsKsgDateTo);
      return (
        `<div class="analytics-ksg-period-controls">` +
          `<label class="analytics-control-date-field analytics-ksg-date-field">` +
            `<span>С</span>` +
            `<input type="date" value="${escapeHtml_(dateFrom)}" data-analytics-ksg-date="from">` +
          `</label>` +
          `<label class="analytics-control-date-field analytics-ksg-date-field">` +
            `<span>По</span>` +
            `<input type="date" value="${escapeHtml_(dateTo)}" data-analytics-ksg-date="to">` +
          `</label>` +
          `<button class="analytics-control-toolbar-button analytics-control-toolbar-button--primary" type="button" data-analytics-ksg-apply-period="1">Показать</button>` +
        `</div>`
      );
    }

function buildAnalyticsKsgContractorFilterHtml_(dashboard) {
      const data = dashboard || {};
      const options = Array.isArray(data.contractorOptions) ? data.contractorOptions : [];
      const activeContractors = normalizeAnalyticsKsgContractorFilters_(data.activeContractors);
      const totalObjects = options.reduce((sum, option) => sum + Math.max(0, Number(option && option.count) || 0), 0);
      const menuHtml = options.length
        ? (
            `<div class="analytics-filter-menu">` +
              `<div class="analytics-filter-search-shell">` +
                `<input class="analytics-filter-search-input" type="search" placeholder="Поиск генподрядчика" autocomplete="off" data-analytics-ksg-contractor-search>` +
              `</div>` +
              `<div class="analytics-filter-options">` +
              `<button class="analytics-filter-option${activeContractors.length === 0 ? ' active' : ''}" type="button" data-analytics-ksg-contractor="__all">` +
                `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
                `<span class="analytics-filter-option-label">Все генподрядчики</span>` +
                `<span class="analytics-filter-option-count">${escapeHtml_(formatAnalyticsCountText_(totalObjects))}</span>` +
              `</button>` +
              options.map(option => {
                const label = String(option && option.label || '').trim();
                const active = activeContractors.includes(label);
                return (
                  `<button class="analytics-filter-option${active ? ' active' : ''}" type="button" data-analytics-ksg-contractor="${escapeHtml_(label)}" data-analytics-filter-label="${escapeHtml_(label)}">` +
                    `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
                    `<span class="analytics-filter-option-label">${escapeHtml_(label)}</span>` +
                    `<span class="analytics-filter-option-count">${escapeHtml_(formatAnalyticsCountText_(option && option.count))}</span>` +
                  `</button>`
                );
              }).join('') +
              `</div>` +
            `</div>`
          )
        : `<div class="analytics-filter-menu"><div class="analytics-filter-empty">Нет данных по генподрядчикам</div></div>`;
      return (
        `<details class="analytics-filter-dropdown analytics-filter-dropdown--contractor">` +
          `<summary class="analytics-filter-trigger">` +
            `<span class="analytics-filter-trigger-text">Генподрядчик</span>` +
            `<span class="analytics-filter-trigger-caret" aria-hidden="true"></span>` +
          `</summary>` +
          `${menuHtml}` +
        `</details>`
      );
    }

function buildAnalyticsKsgStageRowHtml_(stage) {
      const item = stage || {};
      const totalPlan = Math.max(0, Number(item.totalPlan) || 0);
      const segments = [
        { key: 'on-time', label: 'В срок', value: Math.max(0, Number(item.onTime) || 0), rowIndexes: item.onTimeRowIndexes },
        { key: 'late', label: 'Опоздание', value: Math.max(0, Number(item.late) || 0), rowIndexes: item.lateRowIndexes },
        { key: 'missing', label: 'Нет факта', value: Math.max(0, Number(item.missingPast) || 0), rowIndexes: item.missingPastRowIndexes },
        { key: 'upcoming', label: 'Впереди', value: Math.max(0, Number(item.upcoming) || 0), rowIndexes: item.upcomingRowIndexes }
      ];
      const stageDrilldownAttrs = buildAnalyticsDrilldownAttrs_(item.totalPlanRowIndexes, `${item.title || 'Этап'}: открыть объекты в реестре`);
      const segmentsHtml = totalPlan > 0
        ? segments.map(segment => {
            if (!segment.value) return '';
            const width = Math.max(0, Math.min((segment.value / totalPlan) * 100, 100));
            return `<span class="analytics-ksg-stage-bar-segment analytics-ksg-stage-bar-segment--${escapeHtml_(segment.key)}" style="width:${escapeHtml_(width.toFixed(2))}%"></span>`;
          }).join('')
        : '';
      return (
        `<article class="analytics-ksg-stage-row${stageDrilldownAttrs ? ' analytics-drilldown-target' : ''}"${stageDrilldownAttrs}>` +
          `<div class="analytics-ksg-stage-head">` +
            `<div class="analytics-ksg-stage-title">${escapeHtml_(item.title || 'КСГ')}</div>` +
            `<div class="analytics-ksg-stage-ratio">${escapeHtml_(formatAnalyticsCountText_(totalPlan))} с планом</div>` +
            `<div class="analytics-ksg-stage-percent">${escapeHtml_(formatAnalyticsPercentText_(item.okPercent))}</div>` +
          `</div>` +
          `<div class="analytics-ksg-stage-bar" aria-hidden="true">${segmentsHtml}</div>` +
          `<div class="analytics-ksg-stage-stats">` +
            segments.map(segment => {
              const drilldownAttrs = buildAnalyticsDrilldownAttrs_(segment.rowIndexes, `${item.title || 'Этап'} · ${segment.label}`);
              return (
                `<span class="analytics-ksg-stage-stat analytics-ksg-stage-stat--${escapeHtml_(segment.key)}${drilldownAttrs ? ' analytics-drilldown-target analytics-drilldown-target--inline' : ''}"${drilldownAttrs}>${escapeHtml_(segment.label)}: ${escapeHtml_(formatAnalyticsCountText_(segment.value))}</span>`
              );
            }).join('') +
          `</div>` +
        `</article>`
      );
    }

function buildAnalyticsKsgProblemRowHtml_(item) {
      const problem = item || {};
      const title = String(problem.objectName || '').trim() || String(problem.uin || '').trim() || 'Объект без названия';
      const meta = [
        String(problem.stageTitle || '').trim(),
        String(problem.uin || '').trim() ? `УИН ${String(problem.uin || '').trim()}` : ''
      ].filter(Boolean).join(' · ');
      const planText = String(problem.planText || '').trim() || '—';
      const factText = String(problem.factText || '').trim() || '—';
      let statusText = String(problem.statusLabel || '').trim();
      if (problem.status === 'late') statusText = `${statusText} · +${formatAnalyticsDeltaDaysText_(problem.deltaDays)}`;
      else if (problem.status === 'missing') statusText = `${statusText} · ${formatAnalyticsDeltaDaysText_(problem.deltaDays)}`;
      const drilldownAttrs = buildAnalyticsDrilldownAttrs_([problem.rowIndex], `${title}: открыть объект в реестре`);
      return (
        `<article class="analytics-ksg-problem-row analytics-ksg-problem-row--${escapeHtml_(String(problem.status || '').trim() || 'neutral')}${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs}>` +
          `<div class="analytics-ksg-problem-main">` +
            `<div class="analytics-ksg-problem-title">${escapeHtml_(title)}</div>` +
            `<div class="analytics-ksg-problem-meta">${escapeHtml_(meta)}</div>` +
          `</div>` +
          `<div class="analytics-ksg-problem-dates">` +
            `<span>План ${escapeHtml_(planText)}</span>` +
            `<span>Факт ${escapeHtml_(factText)}</span>` +
          `</div>` +
          `<div class="analytics-ksg-problem-status">${escapeHtml_(statusText)}</div>` +
        `</article>`
      );
    }

function buildAnalyticsKsgDashboardHtml_() {
      const dashboard = buildAnalyticsKsgDashboard_();
      const totalPlan = Math.max(0, Number(dashboard.totalPlan) || 0);
      const onTime = Math.max(0, Number(dashboard.onTime) || 0);
      const late = Math.max(0, Number(dashboard.late) || 0);
      const missingPast = Math.max(0, Number(dashboard.missingPast) || 0);
      const upcoming = Math.max(0, Number(dashboard.upcoming) || 0);
      const withoutPlan = Math.max(0, Number(dashboard.withoutPlan) || 0);
      const gaugePercent = Math.max(0, Math.min(Number(dashboard.okPercent) || 0, 100));
      const summaryCardsHtml = [
        buildAnalyticsKsgSummaryCardHtml_('С планом', totalPlan, '', 'Объекты с датой плана', dashboard.totalPlanRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('В срок', onTime, 'good', formatAnalyticsPercentText_(totalPlan > 0 ? (onTime / totalPlan) * 100 : 0), dashboard.onTimeRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('С опозданием', late, 'late', formatAnalyticsPercentText_(totalPlan > 0 ? (late / totalPlan) * 100 : 0), dashboard.lateRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('Нет факта', missingPast, 'missing', 'План уже прошел', dashboard.missingPastRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('Впереди', upcoming, 'upcoming', 'План еще не наступил', dashboard.upcomingRowIndexes)
      ].join('');
      const gaugeHtml = buildAnalyticsGaugeHtml_({
        valueText: formatAnalyticsPercentText_(gaugePercent),
        ratioText: `${formatAnalyticsCountText_(onTime)} из ${formatAnalyticsCountText_(totalPlan)}`,
        gaugePercent,
        ariaLabel: `КСГ в срок: ${formatAnalyticsPercentText_(gaugePercent)}, ${formatAnalyticsCountText_(onTime)} из ${formatAnalyticsCountText_(totalPlan)}`,
        wrapperClass: dashboard.onTimeRowIndexes.length ? 'analytics-drilldown-target' : '',
        wrapperAttrs: buildAnalyticsDrilldownAttrs_(dashboard.onTimeRowIndexes, 'КСГ · В срок'),
        segmentTotal: totalPlan + withoutPlan,
        minSegmentLength: 1.4,
        segments: [
          { key: 'on-time', value: onTime },
          { key: 'late', value: late },
          { key: 'missing', value: missingPast },
          { key: 'without-plan', value: withoutPlan }
        ]
      });
      return (
        `<div class="analytics-dashboard analytics-dashboard--ksg">` +
          `<section class="analytics-dashboard-header">` +
            `<div class="analytics-dashboard-header-main">` +
              `<div class="analytics-dashboard-kicker">Аналитика</div>` +
              `<h2>КСГ</h2>` +
            `</div>` +
            `<div class="analytics-dashboard-header-actions">` +
              `${buildAnalyticsKsgContractorFilterHtml_(dashboard)}` +
              `<button id="btnRefreshAnalyticsDashboardView" class="ghost analytics-refresh-button" type="button"${state.loading ? ' disabled' : ''}>Обновить</button>` +
            `</div>` +
          `</section>` +
          `<section class="analytics-ksg-summary-grid">${summaryCardsHtml}</section>` +
          `<section class="analytics-overview-grid analytics-overview-grid--ksg">` +
            `<div class="analytics-breakdown-card analytics-ksg-stage-card">` +
              `<div class="analytics-breakdown-card-title">План / факт по этапам</div>` +
              `<div class="analytics-ksg-stage-list">${(Array.isArray(dashboard.stages) ? dashboard.stages : []).map(buildAnalyticsKsgStageRowHtml_).join('')}</div>` +
            `</div>` +
            `<div class="analytics-total-card analytics-ksg-total-card">` +
              `<div class="analytics-total-card-title">В срок</div>` +
              `${gaugeHtml}` +
              `<div class="analytics-ksg-total-stats">` +
                `<div class="analytics-ksg-total-stat analytics-ksg-total-stat--late${dashboard.lateRowIndexes.length ? ' analytics-drilldown-target' : ''}"${buildAnalyticsDrilldownAttrs_(dashboard.lateRowIndexes, 'КСГ · С опозданием')}><span>С опозданием</span><strong>${escapeHtml_(formatAnalyticsCountText_(late))}</strong></div>` +
                `<div class="analytics-ksg-total-stat analytics-ksg-total-stat--missing${dashboard.missingPastRowIndexes.length ? ' analytics-drilldown-target' : ''}"${buildAnalyticsDrilldownAttrs_(dashboard.missingPastRowIndexes, 'КСГ · Нет факта')}><span>Нет факта</span><strong>${escapeHtml_(formatAnalyticsCountText_(missingPast))}</strong></div>` +
                `<div class="analytics-ksg-total-stat analytics-ksg-total-stat--without-plan${dashboard.withoutPlanRowIndexes.length ? ' analytics-drilldown-target' : ''}"${buildAnalyticsDrilldownAttrs_(dashboard.withoutPlanRowIndexes, 'КСГ · Без плана')}><span>Без плана</span><strong>${escapeHtml_(formatAnalyticsCountText_(withoutPlan))}</strong></div>` +
              `</div>` +
            `</div>` +
          `</section>` +
        `</div>`
      );
    }

function buildAnalyticsKsgFilterHtml_(options) {
      const settings = options || {};
      const optionKey = String(settings.optionKey || '').trim();
      const searchKey = String(settings.searchKey || '').trim();
      const title = String(settings.title || '').trim() || 'Фильтр';
      const searchPlaceholder = String(settings.searchPlaceholder || '').trim() || 'Поиск';
      const emptyLabel = String(settings.emptyLabel || '').trim() || 'Все';
      const emptyMessage = String(settings.emptyMessage || '').trim() || 'Нет данных';
      const allValue = String(settings.allValue || '__all').trim() || '__all';
      const optionAttr = `data-analytics-ksg-${optionKey}`;
      const searchAttr = `data-analytics-ksg-${searchKey}`;
      const optionsList = Array.isArray(settings.options) ? settings.options : [];
      const activeValues = Array.isArray(settings.activeValues) ? settings.activeValues : [];
      const activeLabelSet = new Set(activeValues.map(value => normalizeText_(String(value || '').trim())));
      const orderedActiveLabels = optionsList
        .map(option => String(option && option.label || '').trim())
        .filter(label => label && activeLabelSet.has(normalizeText_(label)));
      const triggerText = orderedActiveLabels.length
        ? (orderedActiveLabels.length === 1 ? orderedActiveLabels[0] : `${orderedActiveLabels[0]} +${orderedActiveLabels.length - 1}`)
        : title;
      const triggerTitle = orderedActiveLabels.length
        ? orderedActiveLabels.join(', ')
        : title;
      const totalObjects = optionsList.reduce((sum, option) => sum + Math.max(0, Number(option && option.count) || 0), 0);
      const menuHtml = optionsList.length
        ? (
            `<div class="analytics-filter-menu">` +
              `<div class="analytics-filter-search-shell">` +
                `<input class="analytics-filter-search-input" type="search" placeholder="${escapeHtml_(searchPlaceholder)}" autocomplete="off" ${searchAttr}>` +
              `</div>` +
              `<div class="analytics-filter-options">` +
                `<button class="analytics-filter-option${activeValues.length === 0 ? ' active' : ''}" type="button" ${optionAttr}="${escapeHtml_(allValue)}">` +
                  `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
                  `<span class="analytics-filter-option-label">${escapeHtml_(emptyLabel)}</span>` +
                  `<span class="analytics-filter-option-count">${escapeHtml_(formatAnalyticsCountText_(totalObjects))}</span>` +
                `</button>` +
                optionsList.map(option => {
                  const label = String(option && option.label || '').trim();
                  const active = activeValues.includes(label);
                  return (
                    `<button class="analytics-filter-option${active ? ' active' : ''}" type="button" ${optionAttr}="${escapeHtml_(label)}" data-analytics-filter-label="${escapeHtml_(label)}">` +
                      `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
                      `<span class="analytics-filter-option-label">${escapeHtml_(label)}</span>` +
                      `<span class="analytics-filter-option-count">${escapeHtml_(formatAnalyticsCountText_(option && option.count))}</span>` +
                    `</button>`
                  );
                }).join('') +
              `</div>` +
            `</div>`
          )
        : `<div class="analytics-filter-menu"><div class="analytics-filter-empty">${escapeHtml_(emptyMessage)}</div></div>`;
      return (
        `<details class="analytics-filter-dropdown analytics-filter-dropdown--contractor"${state.analyticsKsgOpenFilter === optionKey ? ' open' : ''} data-analytics-ksg-filter="${escapeHtml_(optionKey)}">` +
          `<summary class="analytics-filter-trigger" title="${escapeHtml_(triggerTitle)}" aria-label="${escapeHtml_(triggerTitle)}">` +
            `<span class="analytics-filter-trigger-text">${escapeHtml_(triggerText)}</span>` +
            `<span class="analytics-filter-trigger-caret" aria-hidden="true"></span>` +
          `</summary>` +
          `${menuHtml}` +
        `</details>`
      );
    }

function buildAnalyticsKsgContractorFilterHtml_(dashboard) {
      const data = dashboard || {};
      return buildAnalyticsKsgFilterHtml_({
        optionKey: 'contractor',
        searchKey: 'contractor-search',
        title: 'Генподрядчик',
        searchPlaceholder: 'Поиск генподрядчика',
        emptyLabel: 'Все генподрядчики',
        emptyMessage: 'Нет данных по генподрядчикам',
        options: data.contractorOptions,
        activeValues: normalizeAnalyticsKsgContractorFilters_(data.activeContractors)
      });
    }

function buildAnalyticsKsgGrbsFilterHtml_(dashboard) {
      const data = dashboard || {};
      return buildAnalyticsKsgFilterHtml_({
        optionKey: 'grbs',
        searchKey: 'grbs-search',
        title: 'ГРБС',
        searchPlaceholder: 'Поиск ГРБС',
        emptyLabel: 'Все ГРБС',
        emptyMessage: 'Нет данных по ГРБС',
        options: data.grbsOptions,
        activeValues: normalizeAnalyticsKsgGrbsFilters_(data.activeGrbs)
      });
    }

function buildAnalyticsKsgSelectionSummaryPart_(label, values) {
      const items = Array.isArray(values)
        ? values.map(value => String(value || '').trim()).filter(Boolean)
        : [];
      if (!items.length) return '';
      const valueText = items.length === 1
        ? items[0]
        : `${items[0]} +${items.length - 1}`;
      return `${label}: ${valueText}`;
    }

function buildAnalyticsKsgSelectionSummaryText_(dashboard) {
      const data = dashboard || {};
      const parts = [
        buildAnalyticsKsgSelectionSummaryPart_('ГРБС', normalizeAnalyticsKsgGrbsFilters_(data.activeGrbs)),
        buildAnalyticsKsgSelectionSummaryPart_('Генподрядчик', normalizeAnalyticsKsgContractorFilters_(data.activeContractors))
      ].filter(Boolean);
      return parts.join(' • ');
    }

function buildAnalyticsKsgStageRowHtml_(stage) {
      const item = stage || {};
      const totalPlan = Math.max(0, Number(item.totalPlan) || 0);
      const segments = [
        { key: 'on-time', label: 'В срок', value: Math.max(0, Number(item.onTime) || 0), rowIndexes: item.onTimeRowIndexes },
        { key: 'late', label: 'Выполнен с отставанием', value: Math.max(0, Number(item.late) || 0), rowIndexes: item.lateRowIndexes },
        { key: 'missing', label: 'Нет факта', value: Math.max(0, Number(item.missingPast) || 0), rowIndexes: item.missingPastRowIndexes },
        { key: 'upcoming', label: 'Впереди', value: Math.max(0, Number(item.upcoming) || 0), rowIndexes: item.upcomingRowIndexes }
      ];
      const stageDrilldownAttrs = buildAnalyticsDrilldownAttrs_(item.totalPlanRowIndexes, `${item.title || 'Этап'}: открыть объекты в реестре`);
      const segmentsHtml = totalPlan > 0
        ? segments.map(segment => {
            if (!segment.value) return '';
            const width = Math.max(0, Math.min((segment.value / totalPlan) * 100, 100));
            return `<span class="analytics-ksg-stage-bar-segment analytics-ksg-stage-bar-segment--${escapeHtml_(segment.key)}" style="width:${escapeHtml_(width.toFixed(2))}%"></span>`;
          }).join('')
        : '';
      return (
        `<article class="analytics-ksg-stage-row${stageDrilldownAttrs ? ' analytics-drilldown-target' : ''}"${stageDrilldownAttrs}>` +
          `<div class="analytics-ksg-stage-head">` +
            `<div class="analytics-ksg-stage-title">${escapeHtml_(item.title || 'КСГ')}</div>` +
            `<div class="analytics-ksg-stage-ratio">${escapeHtml_(formatAnalyticsCountText_(totalPlan))} с планом</div>` +
            `<div class="analytics-ksg-stage-percent">${escapeHtml_(formatAnalyticsPercentText_(item.okPercent))}</div>` +
          `</div>` +
          `<div class="analytics-ksg-stage-bar" aria-hidden="true">${segmentsHtml}</div>` +
          `<div class="analytics-ksg-stage-stats">` +
            segments.map(segment => {
              const drilldownAttrs = buildAnalyticsDrilldownAttrs_(segment.rowIndexes, `${item.title || 'Этап'} · ${segment.label}`);
              return (
                `<span class="analytics-ksg-stage-stat analytics-ksg-stage-stat--${escapeHtml_(segment.key)}${drilldownAttrs ? ' analytics-drilldown-target analytics-drilldown-target--inline' : ''}"${drilldownAttrs}>${escapeHtml_(segment.label)}: ${escapeHtml_(formatAnalyticsCountText_(segment.value))}</span>`
              );
            }).join('') +
          `</div>` +
        `</article>`
      );
    }

function buildAnalyticsKsgDashboardHtml_() {
      const dashboard = buildAnalyticsKsgDashboard_();
      const totalObjects = Math.max(0, Number(dashboard.totalObjects) || 0);
      const totalPlan = Math.max(0, Number(dashboard.totalPlan) || 0);
      const onTime = Math.max(0, Number(dashboard.onTime) || 0);
      const late = Math.max(0, Number(dashboard.late) || 0);
      const missingPast = Math.max(0, Number(dashboard.missingPast) || 0);
      const upcoming = Math.max(0, Number(dashboard.upcoming) || 0);
      const withoutPlan = Math.max(0, Number(dashboard.withoutPlan) || 0);
      const gaugePercent = Math.max(0, Math.min(Number(dashboard.okPercent) || 0, 100));
      const selectionSummary = buildAnalyticsKsgSelectionSummaryText_(dashboard);
      const totalObjectsMeta = selectionSummary
        ? `Текущая выборка · ${selectionSummary}`
        : 'Текущая выборка КСГ';
      const summaryCardsHtml = [
        buildAnalyticsKsgSummaryCardHtml_('Всего объектов', totalObjects, '', totalObjectsMeta, dashboard.totalObjectRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('В срок', onTime, 'good', formatAnalyticsPercentText_(totalPlan > 0 ? (onTime / totalPlan) * 100 : 0), dashboard.onTimeRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('Выполнен с отставанием', late, 'late', formatAnalyticsPercentText_(totalPlan > 0 ? (late / totalPlan) * 100 : 0), dashboard.lateRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('Нет факта', missingPast, 'missing', 'План уже прошёл', dashboard.missingPastRowIndexes),
        buildAnalyticsKsgSummaryCardHtml_('Впереди', upcoming, 'upcoming', 'План ещё не наступил', dashboard.upcomingRowIndexes)
      ].join('');
      const gaugeHtml = buildAnalyticsGaugeHtml_({
        valueText: formatAnalyticsPercentText_(gaugePercent),
        ratioText: `${formatAnalyticsCountText_(onTime)} из ${formatAnalyticsCountText_(totalPlan)}`,
        gaugePercent,
        ariaLabel: `КСГ в срок: ${formatAnalyticsPercentText_(gaugePercent)}, ${formatAnalyticsCountText_(onTime)} из ${formatAnalyticsCountText_(totalPlan)}`,
        wrapperClass: dashboard.onTimeRowIndexes.length ? 'analytics-drilldown-target' : '',
        wrapperAttrs: buildAnalyticsDrilldownAttrs_(dashboard.onTimeRowIndexes, 'КСГ · В срок'),
        segmentTotal: totalPlan + withoutPlan,
        minSegmentLength: 1.4,
        segments: [
          { key: 'on-time', value: onTime },
          { key: 'late', value: late },
          { key: 'missing', value: missingPast },
          { key: 'without-plan', value: withoutPlan }
        ]
      });
      return (
        `<div class="analytics-dashboard analytics-dashboard--ksg">` +
          `<section class="analytics-dashboard-header">` +
            `<div class="analytics-dashboard-header-main">` +
              `<div class="analytics-dashboard-kicker">Аналитика</div>` +
              `<h2>КСГ</h2>` +
            `</div>` +
            `<div class="analytics-dashboard-header-actions">` +
              `${buildAnalyticsKsgPeriodControlsHtml_(dashboard)}` +
              `${buildAnalyticsKsgGrbsFilterHtml_(dashboard)}` +
              `${buildAnalyticsKsgContractorFilterHtml_(dashboard)}` +
              `<button id="btnRefreshAnalyticsDashboardView" class="ghost analytics-refresh-button" type="button"${state.loading ? ' disabled' : ''}>Обновить</button>` +
            `</div>` +
          `</section>` +
          `<section class="analytics-ksg-summary-grid">${summaryCardsHtml}</section>` +
          `<section class="analytics-overview-grid analytics-overview-grid--ksg">` +
            `<div class="analytics-breakdown-card analytics-ksg-stage-card">` +
              `<div class="analytics-breakdown-card-title">План / факт по этапам</div>` +
              `<div class="analytics-ksg-stage-list">${(Array.isArray(dashboard.stages) ? dashboard.stages : []).map(buildAnalyticsKsgStageRowHtml_).join('')}</div>` +
            `</div>` +
            `<div class="analytics-total-card analytics-ksg-total-card">` +
              `<div class="analytics-total-card-title">В срок</div>` +
              `${gaugeHtml}` +
              `<div class="analytics-ksg-total-stats">` +
                `<div class="analytics-ksg-total-stat analytics-ksg-total-stat--late${dashboard.lateRowIndexes.length ? ' analytics-drilldown-target' : ''}"${buildAnalyticsDrilldownAttrs_(dashboard.lateRowIndexes, 'КСГ · Выполнен с отставанием')}><span>Выполнен с отставанием</span><strong>${escapeHtml_(formatAnalyticsCountText_(late))}</strong></div>` +
                `<div class="analytics-ksg-total-stat analytics-ksg-total-stat--missing${dashboard.missingPastRowIndexes.length ? ' analytics-drilldown-target' : ''}"${buildAnalyticsDrilldownAttrs_(dashboard.missingPastRowIndexes, 'КСГ · Нет факта')}><span>Нет факта</span><strong>${escapeHtml_(formatAnalyticsCountText_(missingPast))}</strong></div>` +
                `<div class="analytics-ksg-total-stat analytics-ksg-total-stat--without-plan${dashboard.withoutPlanRowIndexes.length ? ' analytics-drilldown-target' : ''}"${buildAnalyticsDrilldownAttrs_(dashboard.withoutPlanRowIndexes, 'КСГ · Без плана')}><span>Без плана</span><strong>${escapeHtml_(formatAnalyticsCountText_(withoutPlan))}</strong></div>` +
              `</div>` +
            `</div>` +
          `</section>` +
        `</div>`
      );
    }

function buildAnalyticsQuarterMetricHtml_(label, value, tone) {
      const toneClass = tone ? ` analytics-quarter-metric--${tone}` : '';
      return (
        `<div class="analytics-quarter-metric${toneClass}">` +
          `<span class="analytics-quarter-metric-label">${escapeHtml_(label)}</span>` +
          `<strong class="analytics-quarter-metric-value">${escapeHtml_(formatAnalyticsCountText_(value))}</strong>` +
        `</div>`
      );
    }

function renderAnalyticsView_() {
      const view = el('analyticsView');
      if (!view) return;
      resetAnalyticsDrilldowns_();
      const isActive = state.currentView === 'analytics';
      view.classList.toggle('hidden', !isActive);
      if (!isActive) return;

      const analyticsSection = normalizeAnalyticsSection_(state.analyticsSection);
      if (typeof isAnalyticsControlSection_ === 'function' && isAnalyticsControlSection_(analyticsSection)) {
        view.innerHTML = buildAnalyticsWorkControlDashboardHtml_();
        bindAnalyticsViewEvents_();
        return;
      }

      if (typeof isAnalyticsKsgSection_ === 'function' && isAnalyticsKsgSection_(analyticsSection)) {
        view.innerHTML = buildAnalyticsKsgDashboardHtml_();
        bindAnalyticsViewEvents_();
        return;
      }

      const dashboard = state.analyticsDashboard || buildEmptyAnalyticsDashboard_();
      const errorText = state.analyticsError
        ? `<div class="analytics-view-message analytics-view-message--error">${escapeHtml_(state.analyticsError)}</div>`
        : '';
      const emptyText = state.analyticsLoading
        ? 'Подтягиваю план и архив мониторинга…'
        : 'Данные появятся здесь после загрузки аналитики.';
      const statusText = state.analyticsLoading ? 'Обновляем данные…' : '';
      const sectionDef = typeof getAnalyticsSectionDef_ === 'function'
        ? getAnalyticsSectionDef_(analyticsSection)
        : null;
      const quarterDashboardBuilder = sectionDef && sectionDef.dashboardDefKey === 'q1'
        ? buildAnalyticsQuarterOneDashboard_
        : buildAnalyticsQuarterTwoDashboard_;
      view.innerHTML = buildAnalyticsQuarterDashboardHtml_(
        quarterDashboardBuilder(dashboard),
        buildAnalyticsQuarterSectionViewOptions_(analyticsSection, {
          statusText,
          errorText,
          emptyText,
          refreshDisabled: state.analyticsLoading
        })
      );
      bindAnalyticsViewEvents_();
    }


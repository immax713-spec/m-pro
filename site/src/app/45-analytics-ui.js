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
                `<span class="preset-trigger-main">` +
                  `<span class="preset-trigger-title">1 квартал 2026</span>` +
                `</span>` +
              `</button>` +
            `</div>` +
            `<div class="preset-row">` +
              `<button class="quick-preset${analyticsActive && analyticsSection === 'quarter' ? ' active' : ''}" type="button" data-open-analytics-section="quarter" aria-pressed="${analyticsActive && analyticsSection === 'quarter' ? 'true' : 'false'}">` +
                `<span class="preset-trigger-main">` +
                  `<span class="preset-trigger-title">2 квартал 2026</span>` +
                `</span>` +
              `</button>` +
            `</div>` +
            `<div class="preset-row">` +
              `<button class="quick-preset${analyticsActive && analyticsSection === 'ksg' ? ' active' : ''}" type="button" data-open-analytics-section="ksg" aria-pressed="${analyticsActive && analyticsSection === 'ksg' ? 'true' : 'false'}">` +
                `<span class="preset-trigger-main">` +
                  `<span class="preset-trigger-title">КСГ</span>` +
                `</span>` +
              `</button>` +
            `</div>` +
            `<div class="preset-row">` +
              `<button class="quick-preset${analyticsActive && analyticsSection === 'archive' ? ' active' : ''}" type="button" data-open-analytics-section="archive" aria-pressed="${analyticsActive && analyticsSection === 'archive' ? 'true' : 'false'}">` +
                `<span class="preset-trigger-main">` +
                  `<span class="preset-trigger-title">Архив мониторинга</span>` +
                `</span>` +
              `</button>` +
            `</div>` +
          `</div>` +
        `</section>`
      );
      bindAnalyticsPanelEvents_();
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
      if (analyticsSection === 'archive') {
        const commitArchiveDateRange = (nextFromValue, nextToValue) => {
          let nextFrom = normalizeAnalyticsArchiveDateValue_(nextFromValue);
          let nextTo = normalizeAnalyticsArchiveDateValue_(nextToValue);
          if (nextFrom && nextTo && nextFrom > nextTo) {
            const swap = nextFrom;
            nextFrom = nextTo;
            nextTo = swap;
          }
          state.analyticsArchiveDateFrom = nextFrom;
          state.analyticsArchiveDateTo = nextTo;
          persistRegistrySessionState_();
          renderAnalyticsView_();
        };
        view.querySelectorAll('[data-analytics-archive-grbs-search]').forEach(input => {
          input.oninput = () => {
            const query = normalizeText_(String(input.value || ''));
            const menu = input.closest('.analytics-filter-menu');
            if (!menu) return;
            menu.querySelectorAll('[data-analytics-archive-grbs]').forEach(button => {
              const value = String(button.getAttribute('data-analytics-archive-grbs') || '').trim();
              if (value === '__all') {
                button.hidden = false;
                return;
              }
              const label = normalizeText_(String(button.getAttribute('data-analytics-filter-label') || value));
              button.hidden = !!query && !label.includes(query);
            });
          };
        });
        view.querySelectorAll('[data-analytics-archive-grbs]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            const value = String(button.getAttribute('data-analytics-archive-grbs') || '').trim();
            if (!value) return;
            if (value === '__all') {
              state.analyticsArchiveGrbs = [];
            } else {
              const next = new Set(normalizeAnalyticsArchiveGrbsFilters_(state.analyticsArchiveGrbs));
              if (next.has(value)) next.delete(value);
              else next.add(value);
              const availableValues = Array.from(view.querySelectorAll('[data-analytics-archive-grbs]'))
                .map(node => String(node.getAttribute('data-analytics-archive-grbs') || '').trim())
                .filter(item => item && item !== '__all');
              state.analyticsArchiveGrbs = (!next.size || (availableValues.length && next.size >= availableValues.length))
                ? []
                : Array.from(next);
            }
            persistRegistrySessionState_();
            renderAnalyticsView_();
          };
        });
        const readArchiveDateMenuValue = key => normalizeAnalyticsArchiveDateValue_(
          (view.querySelector(`[data-analytics-archive-date-input="${key}"]`) || {}).value
        );
        const applyArchiveDateMenu = () => {
          commitArchiveDateRange(
            readArchiveDateMenuValue('from'),
            readArchiveDateMenuValue('to')
          );
        };
        view.querySelectorAll('[data-analytics-archive-date-clear]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            commitArchiveDateRange('', '');
          };
        });
        view.querySelectorAll('[data-analytics-archive-date-apply]').forEach(button => {
          button.onclick = evt => {
            evt.preventDefault();
            evt.stopPropagation();
            applyArchiveDateMenu();
          };
        });
        view.querySelectorAll('[data-analytics-archive-date-input]').forEach(input => {
          input.onkeydown = evt => {
            if (evt.key === 'Enter') {
              evt.preventDefault();
              evt.stopPropagation();
              applyArchiveDateMenu();
              return;
            }
            if (evt.key === 'Escape') {
              evt.preventDefault();
              evt.stopPropagation();
              const dropdown = input.closest('[data-analytics-archive-date-dropdown]');
              if (dropdown instanceof HTMLDetailsElement) dropdown.open = false;
            }
          };
        });
        return;
      }
      if (analyticsSection !== 'ksg') return;
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
      view.querySelectorAll('[data-analytics-ksg-contractor]').forEach(button => {
        button.onclick = evt => {
          evt.preventDefault();
          evt.stopPropagation();
          const value = String(button.getAttribute('data-analytics-ksg-contractor') || '').trim();
          if (!value) return;
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

function buildAnalyticsQuarterMetricHtml_(label, value, tone) {
      const toneClass = tone ? ` analytics-quarter-metric--${tone}` : '';
      return (
        `<div class="analytics-quarter-metric${toneClass}">` +
          `<span class="analytics-quarter-metric-label">${escapeHtml_(label)}</span>` +
          `<strong class="analytics-quarter-metric-value">${escapeHtml_(formatAnalyticsCountText_(value))}</strong>` +
        `</div>`
      );
    }

function buildAnalyticsQuarterCardIconHtml_(key) {
      const iconClass = `analytics-quarter-card-icon analytics-quarter-card-icon--${String(key || '').trim() || 'default'}`;
      if (key === 'on-time') {
        return (
          `<span class="${iconClass}" aria-hidden="true">` +
            `<svg viewBox="0 0 20 20" focusable="false">` +
              `<circle cx="10" cy="10" r="8" fill="currentColor" opacity="0.18"></circle>` +
              `<path d="M6.4 10.2 8.8 12.6 13.8 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>` +
            `</svg>` +
          `</span>`
        );
      }
      if (key === 'late') {
        return (
          `<span class="${iconClass}" aria-hidden="true">` +
            `<svg viewBox="0 0 20 20" focusable="false">` +
              `<path d="M10 2.6 16.2 6.2V13.8L10 17.4 3.8 13.8V6.2Z" fill="currentColor" opacity="0.18"></path>` +
              `<path d="M10 6.5V10.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>` +
              `<circle cx="10" cy="13.2" r="1" fill="currentColor"></circle>` +
            `</svg>` +
          `</span>`
        );
      }
      if (key === 'in-window') {
        return (
          `<span class="${iconClass}" aria-hidden="true">` +
            `<svg viewBox="0 0 20 20" focusable="false">` +
              `<path d="M6 3.5H14L12.2 8.2L14 13H6L7.8 8.2Z" fill="currentColor" opacity="0.18"></path>` +
              `<path d="M6 3.5H14L12.2 8.2L14 13H6L7.8 8.2Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path>` +
              `<path d="M8.2 8.2H11.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>` +
            `</svg>` +
          `</span>`
        );
      }
      if (key === 'future') {
        return (
          `<span class="${iconClass}" aria-hidden="true">` +
            `<svg viewBox="0 0 20 20" focusable="false">` +
              `<rect x="3.5" y="5.5" width="13" height="11" rx="2" fill="currentColor" opacity="0.14"></rect>` +
              `<rect x="3.5" y="5.5" width="13" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"></rect>` +
              `<path d="M6.5 3.5V7M13.5 3.5V7M3.5 8.2H16.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>` +
            `</svg>` +
          `</span>`
        );
      }
      return '';
    }

function buildAnalyticsStartSmrQuarterHtml_(quarter) {
      const data = quarter || buildEmptyAnalyticsStartSmrQuarter_();
      const total = Math.max(0, Number(data.total) || 0);
      const elapsed = Math.max(0, Number(data.elapsed) || 0);
      const cards = [
        { key: 'on-time', label: 'В срок', value: Math.max(0, Number(data.onTime) || 0), rowIndexes: data.onTimeRowIndexes, metaLabel: 'подтверждено вовремя' },
        { key: 'late', label: 'Просрочено', value: Math.max(0, Number(data.late) || 0), rowIndexes: data.lateRowIndexes, metaLabel: 'срок реакции истек' },
        { key: 'in-window', label: 'В процессе', value: Math.max(0, Number(data.inWindow) || 0), rowIndexes: data.inWindowRowIndexes, metaLabel: 'ждем подтверждение' },
        { key: 'future', label: 'Впереди', value: Math.max(0, Number(data.upcoming) || 0), rowIndexes: data.upcomingRowIndexes, metaLabel: 'старт еще не наступил' },
        { key: 'total', label: 'Всего', value: total, isTotal: true, rowIndexes: data.rowIndexes, metaLabel: elapsed > 0 ? `${formatAnalyticsCountText_(elapsed)} уже стартовали` : 'объекты внутри периода' }
      ];
      const cardsHtml = total > 0
        ? (
            `<div class="analytics-quarter-cards">` +
              cards.map(card => {
                const share = !card.isTotal && total > 0 ? (card.value / total) * 100 : null;
                const iconHtml = card.isTotal ? '' : buildAnalyticsQuarterCardIconHtml_(card.key);
                const drilldownAttrs = buildAnalyticsDrilldownAttrs_(card.rowIndexes, `${card.label}: открыть объекты в реестре`);
                const metaText = card.isTotal
                  ? String(card.metaLabel || '').trim()
                  : `${formatAnalyticsPercentText_(share)} · ${String(card.metaLabel || '').trim()}`;
                return (
                  `<article class="analytics-quarter-card analytics-quarter-card--${escapeHtml_(card.key)}${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs}>` +
                    `<div class="analytics-quarter-card-head${iconHtml ? '' : ' analytics-quarter-card-head--plain'}">` +
                      iconHtml +
                      `<div class="analytics-quarter-card-label">${escapeHtml_(card.label)}</div>` +
                    `</div>` +
                    `<div class="analytics-quarter-card-value">${escapeHtml_(formatAnalyticsCountText_(card.value))}</div>` +
                    `<div class="analytics-quarter-card-meta">${escapeHtml_(metaText)}</div>` +
                  `</article>`
                );
              }).join('') +
            `</div>`
          )
        : '';

      return (
        `<section class="analytics-quarter-section analytics-quarter-section--summary">` +
          `<div class="analytics-quarter-head analytics-quarter-head--summary">` +
            `<div class="analytics-quarter-title">График начала СМР</div>` +
          `</div>` +
          (
            total > 0
              ? cardsHtml
              : `<div class="analytics-quarter-note">В этом диапазоне нет объектов с заполненной датой начала СМР.</div>`
          ) +
        `</section>`
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

function buildAnalyticsArchiveGrbsFilterHtml_(dashboard) {
      const data = dashboard || {};
      const options = Array.isArray(data.grbsOptions) ? data.grbsOptions : [];
      const activeGrbs = normalizeAnalyticsArchiveGrbsFilters_(data.activeGrbs);
      const totalObjects = options.reduce((sum, option) => sum + Math.max(0, Number(option && option.count) || 0), 0);
      const triggerText = activeGrbs.length === 1
        ? activeGrbs[0]
        : (activeGrbs.length > 1 ? `${activeGrbs[0]} +${activeGrbs.length - 1}` : 'ГРБС');
      const menuHtml = options.length
        ? (
            `<div class="analytics-filter-menu">` +
              `<div class="analytics-filter-search-shell">` +
                `<input class="analytics-filter-search-input" type="search" placeholder="Поиск ГРБС" autocomplete="off" data-analytics-archive-grbs-search>` +
              `</div>` +
              `<div class="analytics-filter-options">` +
                `<button class="analytics-filter-option${activeGrbs.length === 0 ? ' active' : ''}" type="button" data-analytics-archive-grbs="__all">` +
                  `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
                  `<span class="analytics-filter-option-label">Все ГРБС</span>` +
                  `<span class="analytics-filter-option-count">${escapeHtml_(formatAnalyticsCountText_(totalObjects))}</span>` +
                `</button>` +
                options.map(option => {
                  const label = String(option && option.label || '').trim();
                  const active = activeGrbs.includes(label);
                  return (
                    `<button class="analytics-filter-option${active ? ' active' : ''}" type="button" data-analytics-archive-grbs="${escapeHtml_(label)}" data-analytics-filter-label="${escapeHtml_(label)}">` +
                      `<span class="analytics-filter-option-mark" aria-hidden="true"></span>` +
                      `<span class="analytics-filter-option-label">${escapeHtml_(label)}</span>` +
                      `<span class="analytics-filter-option-count">${escapeHtml_(formatAnalyticsCountText_(option && option.count))}</span>` +
                    `</button>`
                  );
                }).join('') +
              `</div>` +
            `</div>`
          )
        : `<div class="analytics-filter-menu"><div class="analytics-filter-empty">Нет данных по ГРБС</div></div>`;
      return (
        `<details class="analytics-filter-dropdown analytics-filter-dropdown--archive-grbs">` +
          `<summary class="analytics-filter-trigger" title="${escapeHtml_(triggerText)}" aria-label="${escapeHtml_(`Фильтр ГРБС: ${triggerText}`)}">` +
            `<span class="analytics-filter-trigger-text">${escapeHtml_(triggerText)}</span>` +
            `<span class="analytics-filter-trigger-caret" aria-hidden="true"></span>` +
          `</summary>` +
          `${menuHtml}` +
        `</details>`
      );
    }

function buildAnalyticsArchiveDateFilterHtml_(fromValue, toValue, min, max) {
      const rangeText = formatAnalyticsRangeText_(fromValue, toValue);
      return (
        `<details class="analytics-filter-dropdown analytics-filter-dropdown--archive-date" data-analytics-archive-date-dropdown>` +
          `<summary class="analytics-filter-trigger analytics-filter-trigger--stacked">` +
            `<span class="analytics-filter-trigger-copy">` +
              `<span class="analytics-filter-trigger-text">Дата мониторинга</span>` +
              `<span class="analytics-filter-trigger-meta">${escapeHtml_(rangeText || 'Выберите диапазон')}</span>` +
            `</span>` +
            `<span class="analytics-filter-trigger-caret" aria-hidden="true"></span>` +
          `</summary>` +
          `<div class="analytics-filter-menu analytics-filter-menu--archive-date">` +
            `<div class="analytics-archive-date-menu">` +
              `<div class="analytics-archive-date-hint">Покажем записи архива в выбранном диапазоне.</div>` +
              `<div class="analytics-archive-date-grid">` +
                `<label class="analytics-archive-date-field">` +
                  `<span class="analytics-archive-date-label">С</span>` +
                  `<input class="analytics-archive-date-input" type="date" value="${escapeHtml_(fromValue || '')}"${min ? ` min="${escapeHtml_(min)}"` : ''}${max ? ` max="${escapeHtml_(max)}"` : ''} data-analytics-archive-date-input="from">` +
                `</label>` +
                `<label class="analytics-archive-date-field">` +
                  `<span class="analytics-archive-date-label">По</span>` +
                  `<input class="analytics-archive-date-input" type="date" value="${escapeHtml_(toValue || '')}"${min ? ` min="${escapeHtml_(min)}"` : ''}${max ? ` max="${escapeHtml_(max)}"` : ''} data-analytics-archive-date-input="to">` +
                `</label>` +
              `</div>` +
              `<div class="analytics-archive-date-actions">` +
                `<button class="ghost" type="button" data-analytics-archive-date-clear>Сбросить</button>` +
                `<button class="primary" type="button" data-analytics-archive-date-apply>Применить</button>` +
              `</div>` +
            `</div>` +
          `</div>` +
        `</details>`
      );
    }

function buildAnalyticsArchiveSummaryCardHtml_(label, value, meta, tone, rowIndexes) {
      const toneClass = tone ? ` analytics-archive-summary-card--${tone}` : '';
      const drilldownAttrs = buildAnalyticsDrilldownAttrs_(rowIndexes, `${label}: открыть объекты в реестре`);
      return (
        `<article class="analytics-archive-summary-card${toneClass}${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs}>` +
          `<div class="analytics-archive-summary-card-label">${escapeHtml_(label)}</div>` +
          `<div class="analytics-archive-summary-card-value">${escapeHtml_(value)}</div>` +
          `<div class="analytics-archive-summary-card-meta">${escapeHtml_(meta || ' ')}</div>` +
        `</article>`
      );
    }

function buildAnalyticsArchiveCompositionHtml_(dashboard) {
      const totalCount = Math.max(0, Number(dashboard && dashboard.totalMonitorings) || 0);
      const segments = [
        {
          key: 'unique',
          label: 'Уникальные объекты',
          value: Math.max(0, Number(dashboard && dashboard.uniqueObjects) || 0),
          rowIndexes: dashboard && dashboard.uniqueRowIndexes
        },
        {
          key: 'repeat',
          label: 'Повторные выезды',
          value: Math.max(0, Number(dashboard && dashboard.repeatedMonitorings) || 0),
          rowIndexes: dashboard && dashboard.repeatedRowIndexes
        }
      ];
      const totalDrilldownAttrs = buildAnalyticsDrilldownAttrs_(dashboard && dashboard.totalRowIndexes, 'Архив мониторинга · Все выезды за период');
      const segmentsHtml = totalCount > 0
        ? segments.map(segment => {
            if (!segment.value) return '';
            const width = Math.max(0, Math.min((segment.value / totalCount) * 100, 100));
            return `<span class="analytics-archive-composition-segment analytics-archive-composition-segment--${escapeHtml_(segment.key)}" style="width:${escapeHtml_(width.toFixed(2))}%"></span>`;
          }).join('')
        : '';
      const statsHtml = segments.map(segment => {
        const share = totalCount > 0 ? (segment.value / totalCount) * 100 : 0;
        const drilldownAttrs = buildAnalyticsDrilldownAttrs_(segment.rowIndexes, `${segment.label}: открыть объекты в реестре`);
        return (
          `<article class="analytics-archive-composition-stat analytics-archive-composition-stat--${escapeHtml_(segment.key)}${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs}>` +
            `<div class="analytics-archive-composition-stat-main">` +
              `<span class="analytics-archive-composition-dot analytics-archive-composition-dot--${escapeHtml_(segment.key)}" aria-hidden="true"></span>` +
              `<span class="analytics-archive-composition-stat-label">${escapeHtml_(segment.label)}</span>` +
            `</div>` +
            `<div class="analytics-archive-composition-stat-values">` +
              `<span>${escapeHtml_(formatAnalyticsPercentText_(share))}</span>` +
              `<strong>${escapeHtml_(formatAnalyticsCountText_(segment.value))}</strong>` +
            `</div>` +
          `</article>`
        );
      }).join('');
      return (
        `<div class="analytics-archive-composition-card">` +
          `<div class="analytics-archive-composition-main${totalDrilldownAttrs ? ' analytics-drilldown-target' : ''}"${totalDrilldownAttrs}>` +
            `<div class="analytics-archive-composition-kicker">Объездов всего</div>` +
            `<div class="analytics-archive-composition-total">${escapeHtml_(formatAnalyticsCountText_(totalCount))}</div>` +
            `<div class="analytics-archive-composition-caption">Уникальные объекты и повторные выезды за выбранный диапазон</div>` +
            `<div class="analytics-archive-composition-bar" aria-hidden="true">${segmentsHtml}</div>` +
          `</div>` +
          `<div class="analytics-archive-composition-stats">${statsHtml}</div>` +
        `</div>`
      );
    }

function buildAnalyticsArchiveRvMetricsHtml_(dashboard) {
      const postRvVisits = Math.max(0, Number(dashboard && dashboard.visitsAfterRv) || 0);
      const postRvObjects = Math.max(0, Number(dashboard && dashboard.objectsWithPostRvVisits) || 0);
      const postRvShare = Math.max(0, Number(dashboard && dashboard.postRvShare) || 0);
      const visitsAttrs = buildAnalyticsDrilldownAttrs_(dashboard && dashboard.afterRvRowIndexes, 'Выезды после РВ: открыть объекты в реестре');
      const objectsAttrs = buildAnalyticsDrilldownAttrs_(dashboard && dashboard.postRvObjectRowIndexes, 'Объекты с выездом после РВ: открыть объекты в реестре');
      const shareAttrs = buildAnalyticsDrilldownAttrs_(dashboard && dashboard.afterRvRowIndexes, 'Доля выездов после РВ: открыть объекты в реестре');
      return (
        `<div class="analytics-archive-rv-card">` +
          `<div class="analytics-archive-rv-head${visitsAttrs ? ' analytics-drilldown-target' : ''}"${visitsAttrs}>` +
            `<div class="analytics-archive-rv-kicker">После РВ</div>` +
            `<div class="analytics-archive-rv-value">${escapeHtml_(formatAnalyticsCountText_(postRvVisits))}</div>` +
          `</div>` +
          `<div class="analytics-archive-rv-stats">` +
            `<article class="analytics-archive-rv-stat${objectsAttrs ? ' analytics-drilldown-target' : ''}"${objectsAttrs}>` +
              `<span>Объектов с выездом после РВ</span>` +
              `<strong>${escapeHtml_(formatAnalyticsCountText_(postRvObjects))}</strong>` +
            `</article>` +
            `<article class="analytics-archive-rv-stat${shareAttrs ? ' analytics-drilldown-target' : ''}"${shareAttrs}>` +
              `<span>Доля от всех выездов</span>` +
              `<strong>${escapeHtml_(formatAnalyticsPercentText_(postRvShare))}</strong>` +
            `</article>` +
          `</div>` +
        `</div>`
      );
    }

function buildAnalyticsArchiveTimelineHtml_(dashboard) {
      const items = Array.isArray(dashboard && dashboard.timeline) ? dashboard.timeline : [];
      if (!items.length) {
        return `<div class="analytics-quarter-note">В выбранном диапазоне нет записей архива.</div>`;
      }
      const maxTotal = Math.max(1, ...items.map(item => Math.max(0, Number(item && item.total) || 0)));
      return (
        `<div class="analytics-archive-timeline-shell">` +
          `<div class="analytics-archive-timeline">` +
            items.map(item => {
              const total = Math.max(0, Number(item && item.total) || 0);
              const uniqueCount = Math.max(0, Number(item && item.uniqueCount) || 0);
              const repeatCount = Math.max(0, Number(item && item.repeatCount) || 0);
              const deniedCount = Math.max(0, Number(item && item.deniedCount) || 0);
              const uniqueHeight = (uniqueCount / maxTotal) * 100;
              const repeatHeight = (repeatCount / maxTotal) * 100;
              const drilldownAttrs = buildAnalyticsDrilldownAttrs_(item && item.rowIndexes, `${item && item.date || 'Дата'}: открыть объекты в реестре`);
              return (
                `<article class="analytics-archive-timeline-item${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs}>` +
                  `<div class="analytics-archive-timeline-item-head">` +
                    `<span class="analytics-archive-timeline-item-total">${escapeHtml_(formatAnalyticsCountText_(total))}</span>` +
                    (deniedCount > 0 ? `<span class="analytics-archive-timeline-item-denied">${escapeHtml_(formatAnalyticsCountText_(deniedCount))}</span>` : '') +
                  `</div>` +
                  `<div class="analytics-archive-timeline-track">` +
                    `<span class="analytics-archive-timeline-segment analytics-archive-timeline-segment--repeat" style="height:${escapeHtml_(repeatHeight.toFixed(2))}%"></span>` +
                    `<span class="analytics-archive-timeline-segment analytics-archive-timeline-segment--unique" style="height:${escapeHtml_(uniqueHeight.toFixed(2))}%"></span>` +
                  `</div>` +
                  `<div class="analytics-archive-timeline-item-meta">${escapeHtml_(formatAnalyticsShortDateText_(item && item.date))}</div>` +
                `</article>`
              );
            }).join('') +
          `</div>` +
        `</div>`
      );
    }

function buildAnalyticsArchiveTopObjectRowHtml_(item) {
      const data = item || {};
      const title = String(data.objectName || '').trim() || String(data.uin || '').trim() || 'Объект без названия';
      const meta = [
        String(data.uin || '').trim() ? `УИН ${String(data.uin || '').trim()}` : '',
        String(data.grbs || '').trim(),
        String(data.contractor || '').trim()
      ].filter(Boolean).join(' · ');
      const drilldownAttrs = buildAnalyticsDrilldownAttrs_(data.rowIndexes, `${title}: открыть объект в реестре`);
      return (
        `<article class="analytics-archive-top-row${drilldownAttrs ? ' analytics-drilldown-target' : ''}"${drilldownAttrs}>` +
          `<div class="analytics-archive-top-row-main">` +
            `<div class="analytics-archive-top-row-title">${escapeHtml_(title)}</div>` +
            `<div class="analytics-archive-top-row-meta">${escapeHtml_(meta)}</div>` +
          `</div>` +
          `<div class="analytics-archive-top-row-stats">` +
            `<span>${escapeHtml_(formatAnalyticsCountText_(data.total))} выездов</span>` +
            `<span>${escapeHtml_(formatAnalyticsShortDateText_(data.lastDate))}</span>` +
            (Number(data.denied) > 0 ? `<span class="analytics-archive-top-row-stats--denied">${escapeHtml_(formatAnalyticsCountText_(data.denied))} недопуска</span>` : '') +
          `</div>` +
        `</article>`
      );
    }

function buildAnalyticsArchiveDashboardHtml_() {
      const base = state.analyticsDashboard && state.analyticsDashboard.archiveMonitoring
        ? state.analyticsDashboard.archiveMonitoring
        : buildEmptyAnalyticsArchiveMonitoring_();
      const dashboard = buildAnalyticsArchiveMonitoringDashboard_(base);
      const summaryCardsHtml = [
        buildAnalyticsArchiveSummaryCardHtml_('Объездов всего', formatAnalyticsCountText_(dashboard.totalMonitorings), 'Все записи архива', '', dashboard.totalRowIndexes),
        buildAnalyticsArchiveSummaryCardHtml_('Уникальные объекты', formatAnalyticsCountText_(dashboard.uniqueObjects), 'Без повторов в периоде', 'good', dashboard.uniqueRowIndexes),
        buildAnalyticsArchiveSummaryCardHtml_('Повторных выездов', formatAnalyticsCountText_(dashboard.repeatedMonitorings), 'Дополнительные визиты по тем же объектам', 'repeat', dashboard.repeatedRowIndexes),
        buildAnalyticsArchiveSummaryCardHtml_('Недопуски', formatAnalyticsCountText_(dashboard.deniedAccess), 'Записи со статусом недопуска', 'denied', dashboard.deniedRowIndexes),
        buildAnalyticsArchiveSummaryCardHtml_('Среднее на объект', `${formatAnalyticsDecimalText_(dashboard.averagePerObject)}x`, 'Объекты с 2+ выездами', 'neutral', dashboard.repeatedRowIndexes)
      ].join('');
      const compositionHtml = buildAnalyticsArchiveCompositionHtml_(dashboard);
      const rvMetricsHtml = buildAnalyticsArchiveRvMetricsHtml_(dashboard);

      return (
        `<div class="analytics-dashboard analytics-dashboard--archive">` +
          `<section class="analytics-dashboard-header">` +
            `<div class="analytics-dashboard-header-main">` +
              `<div class="analytics-dashboard-kicker">Аналитика</div>` +
              `<h2>Архив мониторинга</h2>` +
            `</div>` +
            `<div class="analytics-dashboard-header-actions">` +
              `${buildAnalyticsArchiveGrbsFilterHtml_(dashboard)}` +
              `${buildAnalyticsArchiveDateFilterHtml_(dashboard.dateFrom, dashboard.dateTo, dashboard.minDate, dashboard.maxDate)}` +
              `<button id="btnRefreshAnalyticsDashboardView" class="ghost analytics-refresh-button" type="button"${state.analyticsLoading ? ' disabled' : ''}>Обновить</button>` +
            `</div>` +
          `</section>` +
          `<section class="analytics-archive-summary-grid">${summaryCardsHtml}</section>` +
          `<section class="analytics-quarter-section analytics-archive-focus-section">` +
            `<div class="analytics-quarter-head analytics-quarter-head--summary analytics-archive-focus-head">` +
              `<div class="analytics-quarter-title">Выезды</div>` +
            `</div>` +
            `<div class="analytics-archive-focus-layout">` +
              `${compositionHtml}` +
              `${rvMetricsHtml}` +
            `</div>` +
          `</section>` +
        `</div>`
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

function buildAnalyticsQuarterDashboardHtml_(dashboard, options) {
      const data = dashboard || buildEmptyAnalyticsDashboard_();
      const settings = options || {};
      const tracks = Array.isArray(data.tracks) ? data.tracks : [];
      const overallPlan = Math.max(0, Number(data.overallUniquePlan) || Number(data.trackedRows) || 0);
      const overallFact = Math.max(0, Number(data.overallUniqueFact) || 0);
      const rawOverallPercent = Number.isFinite(Number(data.overallUniquePercent))
        ? Number(data.overallUniquePercent)
        : (overallPlan > 0 ? (overallFact / overallPlan) * 100 : 0);
      const startSmrQuarterHtml = buildAnalyticsStartSmrQuarterHtml_(settings.startSmrQuarter || data.startSmrQuarter);
      const titleText = String(settings.title || 'Квартальная аналитика').trim() || 'Квартальная аналитика';
      const statusText = String(settings.statusText || '').trim();
      const errorText = String(settings.errorText || '').trim();
      const emptyText = String(settings.emptyText || '').trim() || 'Данные появятся здесь после загрузки аналитики.';
      const uniqueFactText = `${formatAnalyticsCountText_(overallFact)} из ${formatAnalyticsCountText_(overallPlan)}`;
      const gaugeHtml = buildAnalyticsGaugeHtml_({
        valueText: formatAnalyticsPercentText_(rawOverallPercent),
        ratioText: uniqueFactText,
        overflowText: rawOverallPercent > 100 ? formatAnalyticsOverPlanText_(overallFact, overallPlan) : '',
        gaugePercent: Math.max(0, Math.min(rawOverallPercent, 100)),
        ariaLabel: `Общий итог: ${formatAnalyticsPercentText_(rawOverallPercent)}, ${uniqueFactText}`,
        wrapperClass: (Array.isArray(data.overallPlanRowIndexes) && data.overallPlanRowIndexes.length) ? 'analytics-drilldown-target' : '',
        wrapperAttrs: buildAnalyticsDrilldownAttrs_(data.overallPlanRowIndexes, 'Общий итог: открыть объекты в реестре')
      });
      return (
        `<div class="analytics-dashboard analytics-dashboard--quarter">` +
          `<section class="analytics-dashboard-header">` +
            `<div class="analytics-dashboard-header-main">` +
              `<div class="analytics-dashboard-kicker">Аналитика</div>` +
              `<h2>${escapeHtml_(titleText)}</h2>` +
              (statusText ? `<div class="analytics-dashboard-meta-line">${escapeHtml_(statusText)}</div>` : '') +
            `</div>` +
            `<button id="btnRefreshAnalyticsDashboardView" class="ghost analytics-refresh-button" type="button"${settings.refreshDisabled ? ' disabled' : ''}>Обновить</button>` +
          `</section>` +
          `${errorText}` +
          (
            tracks.length
              ? (
                  `${startSmrQuarterHtml}` +
                  `<section class="analytics-overview-grid analytics-overview-grid--quarter">` +
                    `<div class="analytics-breakdown-card">` +
                      `<div class="analytics-breakdown-card-title">${escapeHtml_(String(settings.breakdownTitle || 'Управление').trim() || 'Управление')}</div>` +
                      `<div class="analytics-breakdown-card-subtitle">${escapeHtml_(String(settings.breakdownSubtitle || 'Факт к плану по направлениям').trim() || 'Факт к плану по направлениям')}</div>` +
                      `<div class="analytics-breakdown-list">${tracks.map((track, index) => buildAnalyticsDashboardTrackCardHtml_(track, index)).join('')}</div>` +
                    `</div>` +
                    `<div class="analytics-total-card">` +
                      `<div class="analytics-total-card-title">${escapeHtml_(String(settings.totalTitle || 'Общий итог').trim() || 'Общий итог')}</div>` +
                      `<div class="analytics-total-card-subtitle">${escapeHtml_(String(settings.totalSubtitle || 'Факт к плану квартала').trim() || 'Факт к плану квартала')}</div>` +
                      `${gaugeHtml}` +
                    `</div>` +
                  `</section>`
                )
              : `<div class="analytics-view-message">${escapeHtml_(emptyText)}</div>`
          ) +
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
      if (analyticsSection === 'ksg') {
        view.innerHTML = buildAnalyticsKsgDashboardHtml_();
        bindAnalyticsViewEvents_();
        return;
      }
      if (analyticsSection === 'archive') {
        view.innerHTML = buildAnalyticsArchiveDashboardHtml_();
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
      if (analyticsSection === 'quarter1') {
        view.innerHTML = buildAnalyticsQuarterDashboardHtml_(buildAnalyticsQuarterOneDashboard_(dashboard), {
          title: ANALYTICS_Q1_DASHBOARD_DEF && ANALYTICS_Q1_DASHBOARD_DEF.title || '1 квартал 2026',
          statusText,
          errorText,
          emptyText,
          refreshDisabled: state.analyticsLoading,
          breakdownTitle: 'Управление',
          breakdownSubtitle: 'Факт к плану по направлениям за 1 квартал 2026',
          totalTitle: 'Общий итог',
          totalSubtitle: 'Факт выездов относительно плана квартала'
        });
        bindAnalyticsViewEvents_();
        return;
      }

      view.innerHTML = buildAnalyticsQuarterDashboardHtml_(buildAnalyticsQuarterTwoDashboard_(dashboard), {
        title: ANALYTICS_Q2_DASHBOARD_DEF && ANALYTICS_Q2_DASHBOARD_DEF.title || '2 квартал 2026',
        statusText,
        errorText,
        emptyText,
        refreshDisabled: state.analyticsLoading,
        breakdownTitle: 'Управление',
        breakdownSubtitle: 'Факт мониторинга к плану по направлениям',
        totalTitle: 'Общий итог',
        totalSubtitle: 'Факт выездов относительно плана квартала'
      });
      bindAnalyticsViewEvents_();
    }

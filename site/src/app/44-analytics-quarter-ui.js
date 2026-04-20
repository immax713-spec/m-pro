// ===== Analytics Quarter UI =====

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

function buildAnalyticsQuarterSectionViewOptions_(analyticsSection, statePayload) {
      const section = normalizeAnalyticsSection_(analyticsSection);
      const settings = statePayload && typeof statePayload === 'object' ? statePayload : {};
      const sectionDef = typeof getAnalyticsSectionDef_ === 'function'
        ? getAnalyticsSectionDef_(section)
        : null;
      if (sectionDef && sectionDef.dashboardDefKey === 'q1') {
        return {
          title: sectionDef && sectionDef.title || ANALYTICS_Q1_DASHBOARD_DEF && ANALYTICS_Q1_DASHBOARD_DEF.title || '1 квартал 2026',
          statusText: settings.statusText,
          errorText: settings.errorText,
          emptyText: settings.emptyText,
          refreshDisabled: settings.refreshDisabled,
          breakdownTitle: 'Управление',
          breakdownSubtitle: 'Факт к плану по направлениям за 1 квартал 2026',
          totalTitle: 'Общий итог',
          totalSubtitle: 'Факт выездов относительно плана квартала'
        };
      }
      return {
        title: sectionDef && sectionDef.title || ANALYTICS_Q2_DASHBOARD_DEF && ANALYTICS_Q2_DASHBOARD_DEF.title || '2 квартал 2026',
        statusText: settings.statusText,
        errorText: settings.errorText,
        emptyText: settings.emptyText,
        refreshDisabled: settings.refreshDisabled,
        breakdownTitle: 'Управление',
        breakdownSubtitle: 'Факт мониторинга к плану по направлениям',
        totalTitle: 'Общий итог',
        totalSubtitle: 'Факт выездов относительно плана квартала'
      };
    }

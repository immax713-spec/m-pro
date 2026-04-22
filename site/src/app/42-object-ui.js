    // ===== Object UI =====

    // ----- Render -----

function renderObjectView_() {
      const objectView = el('objectView');
      objectView.classList.toggle('hidden', state.currentView !== 'object');
      if (state.currentView !== 'object') return;
      ensureSelectedObjectMonitoringHistoryLoaded_();
      ensureSelectedObjectKsgStateLoaded_();
      ensureSelectedObjectLabStudiesHistoryLoaded_();
      renderHeader_();
      renderPassport_();
      renderSectionStack_();
      renderObjectHistory_();
      syncObjectWorkflowUi_();
      syncObjectSaveUi_();
    }

    function renderMonitoringHistoryLinkHtml_(url, label, title) {
      const href = String(url || '').trim();
      if (!isHttpUrl_(href)) return '';
      return `<a class="monitoring-history-link" href="${escapeHtml_(href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml_(title || label || 'Открыть')}">${escapeHtml_(label || 'Открыть')}</a>`;
    }

    function isMonitoringHistoryHostSection_(section) {
      return !!(
        section &&
        String(section.presetKey || '').trim() === 'manual_all' &&
        Array.isArray(section.optionKeys) &&
        section.optionKeys.includes('monitoring_history')
      );
    }

    function renderMonitoringHistorySectionHtml_() {
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0 || state.currentView !== 'object') return '';
      const objectId = getSelectedObjectKey_();
      const objectKey = normalizeMonitoringObjectKey_(objectId);
      const loading = objectKey && state.monitoringHistoryLoadingObjectKey === objectKey;
      const error = objectKey ? String(state.monitoringHistoryErrorsByObjectKey[objectKey] || '').trim() : '';
      const rows = objectKey && Array.isArray(state.monitoringHistoryByObjectKey[objectKey])
        ? state.monitoringHistoryByObjectKey[objectKey]
        : [];
      const overlay = objectKey ? getMonitoringOverlayForObjectKey_(objectKey) : null;
      const badgeCount = rows.length || Number(overlay && overlay.monitoringCount) || 0;

      if (loading && !rows.length) {
        return (
          `<div class="monitoring-history-card monitoring-history-inline">` +
            `<div class="section-card-top">` +
              `<div><h3>История мониторинга</h3></div>` +
              `<div class="monitoring-history-badge">${badgeCount}</div>` +
            `</div>` +
            `<div class="empty-state">Загружаю мониторинги объекта...</div>` +
          `</div>`
        );
      }
      if (error && !rows.length) {
        return (
          `<div class="monitoring-history-card monitoring-history-inline">` +
            `<div class="section-card-top">` +
              `<div><h3>История мониторинга</h3></div>` +
              `<div class="monitoring-history-badge">${badgeCount}</div>` +
            `</div>` +
            `<div class="empty-state">${escapeHtml_(error)}</div>` +
          `</div>`
        );
      }
      if (!rows.length) {
        return (
          `<div class="monitoring-history-card monitoring-history-inline">` +
            `<div class="section-card-top">` +
              `<div><h3>История мониторинга</h3></div>` +
              `<div class="monitoring-history-badge">${badgeCount}</div>` +
            `</div>` +
            `<div class="empty-state">Для этого объекта архивные мониторинги пока не найдены.</div>` +
          `</div>`
        );
      }

      return (
        `<div class="monitoring-history-card monitoring-history-inline">` +
          `<div class="section-card-top">` +
            `<div><h3>История мониторинга</h3></div>` +
            `<div class="monitoring-history-badge">${badgeCount}</div>` +
          `</div>` +
          `<div class="monitoring-history-list">` +
            rows.map(item => (
              (() => {
                const status = normalizeMonitoringVisitStatus_(item && item.visitStatus);
                const statusLabel = getMonitoringHistoryStatusLabel_(status, item && item.statusLabel);
                const inspectorLabel = String(item && item.inspector || '').trim() || 'Инспектор не указан';
                const monitoringDateText = formatRegistryDateText_(item.monitoringDate) || item.monitoringDate || 'Без даты';
                const metaParts = [
                  `<span class="monitoring-history-person">${escapeHtml_(inspectorLabel)}</span>`,
                  `<span class="monitoring-history-date">${escapeHtml_(monitoringDateText)}</span>`,
                  `<span class="monitoring-history-type${status === 'denied_access' ? ' denied' : ''}">${escapeHtml_(statusLabel)}</span>`
                ].filter(Boolean).join('<span class="monitoring-history-separator">•</span>');
                const photoLinkHtml = renderMonitoringHistoryLinkHtml_(item.photosUrl, 'Фото', 'Открыть фото');
                return (
                  `<article class="monitoring-history-item">` +
                    `<div class="monitoring-history-item-head">` +
                      `<div class="monitoring-history-meta">${metaParts}</div>` +
                    `</div>` +
                    (
                      photoLinkHtml
                        ? `<div class="monitoring-history-actions">${photoLinkHtml}</div>`
                        : ''
                    ) +
                  `</article>`
                );
              })()
            )).join('') +
          `</div>` +
        `</div>`
      );
    }

    function isLabStudiesHistoryHostSection_(section) {
      return !!(
        section &&
        String(section.presetKey || '').trim() === 'lab_all' &&
        Array.isArray(section.optionKeys) &&
        section.optionKeys.includes('lab_history')
      );
    }

    function getSelectedLabStudiesHistoryRows_() {
      const objectId = getSelectedObjectKey_();
      const objectKey = normalizeMonitoringObjectKey_(objectId);
      return objectKey && Array.isArray(state.labStudiesHistoryByObjectKey[objectKey])
        ? state.labStudiesHistoryByObjectKey[objectKey]
        : [];
    }

    function formatLabStudyHistoryDateTime_(value) {
      const timestamp = Date.parse(String(value || ''));
      if (!Number.isFinite(timestamp)) return '';
      try {
        const date = new Date(timestamp);
        const isDateOnly = (
          date.getHours() === 0 &&
          date.getMinutes() === 0 &&
          date.getSeconds() === 0 &&
          date.getMilliseconds() === 0
        );
        if (isDateOnly) {
          return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
        return date.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return '';
      }
    }

    function formatLabStudyHistoryNumber_(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '';
      if (Math.abs(numeric - Math.round(numeric)) < 0.000001) return String(Math.round(numeric));
      return String(Math.round(numeric * 100) / 100).replace('.', ',');
    }

    function getLabStudyHistoryInspectorLabel_(study) {
      return String(
        study && (
          study.inspectorName ||
          study.completedByName ||
          study.generatedByName
        ) ||
        ''
      ).trim() || 'Инспектор не указан';
    }

    function formatLabStudyHistoryTypeLabel_(value) {
      const text = String(value || '').trim();
      if (!text) return '';
      const upper = text.toLocaleUpperCase('ru-RU');
      if (text === upper && /\p{Lu}/u.test(text)) return text;
      const lower = text.toLocaleLowerCase('ru-RU');
      return lower.charAt(0).toLocaleUpperCase('ru-RU') + lower.slice(1);
    }

    function getLabStudyHistoryParametersText_(study) {
      const parts = [];
      const lengthText = formatLabStudyHistoryNumber_(study && study.objectLengthM);
      const widthText = formatLabStudyHistoryNumber_(study && study.objectWidthM);
      if (lengthText) parts.push(`Длина ${lengthText} м`);
      if (widthText) parts.push(`Ширина ${widthText} м`);
      return parts.join(' • ');
    }

    function parseLabStudyHistoryCoords_(value) {
      const text = String(value || '').trim();
      if (!text) return null;
      const parts = text.split(/\s*[,;]\s*/).map(item => item.trim()).filter(Boolean);
      if (parts.length < 2) return null;
      const lat = Number(String(parts[0] || '').replace(',', '.'));
      const lon = Number(String(parts[1] || '').replace(',', '.'));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    }

    function formatLabStudyHistoryCoordsText_(coords, fallbackText) {
      if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
        return `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
      }
      return String(fallbackText || '').trim();
    }

    function buildLabStudySchemePayload_(study) {
      const start = parseLabStudyHistoryCoords_(study && study.coordinateStartLatLon);
      const center = parseLabStudyHistoryCoords_(study && study.studyLatLon);
      const finish = parseLabStudyHistoryCoords_(study && study.coordinateFinishLatLon);
      if (!start || !center || !finish) return null;
      return {
        points: [
          {
            key: 'start',
            title: 'Начало объекта',
            markerLabel: '1',
            coords: start,
            coordsText: formatLabStudyHistoryCoordsText_(start, study && study.coordinateStartLatLon)
          },
          {
            key: 'study',
            title: 'Точка исследования',
            markerLabel: '•',
            coords: center,
            coordsText: formatLabStudyHistoryCoordsText_(center, study && study.studyLatLon)
          },
          {
            key: 'finish',
            title: 'Конец объекта',
            markerLabel: '2',
            coords: finish,
            coordsText: formatLabStudyHistoryCoordsText_(finish, study && study.coordinateFinishLatLon)
          }
        ]
      };
    }

    function hasLabStudyScheme_(study) {
      return !!buildLabStudySchemePayload_(study);
    }

    function renderLabStudyHistorySummaryHtml_(study) {
      const parts = [];
      const taskText = String(study && study.randomTask || '').trim();
      const parametersText = getLabStudyHistoryParametersText_(study);
      if (taskText) {
        parts.push(
          `<span class="lab-studies-history-summary-item">` +
            `<span class="lab-studies-history-summary-label">Задание:</span>` +
            `<span class="lab-studies-history-summary-value">${escapeHtml_(taskText)}</span>` +
          `</span>`
        );
      }
      if (parametersText) {
        parts.push(
          `<span class="lab-studies-history-summary-item">` +
            `<span class="lab-studies-history-summary-label">Параметры:</span>` +
            `<span class="lab-studies-history-summary-value">${escapeHtml_(parametersText)}</span>` +
          `</span>`
        );
      }
      if (!parts.length) return '';
      return `<div class="lab-studies-history-summary">${parts.join('')}</div>`;
    }

    function renderLabStudiesHistoryTopHtml_(badgeCount) {
      const canCreate = canCurrentUserManageLabStudies_() && isCurrentRegistryDatasetEditable_();
      const createButton = canCreate
        ? `<button class="ghost object-nav-button object-card-action-button action-icon-button action-icon-button--success" type="button" data-open-lab-study-create="1" title="Добавить исследование" aria-label="Добавить исследование">${getPlusIconSvgHtml_('action-icon-svg')}</button>`
        : '';
      return (
        `<div class="section-card-top">` +
          `<div><h3>История исследований</h3></div>` +
          `<div class="section-card-actions">` +
            `<div class="monitoring-history-badge">${badgeCount}</div>` +
            createButton +
          `</div>` +
        `</div>`
      );
    }

    function renderLabStudiesHistorySectionHtml_() {
      const rowIndex = Number(state.selectedRowIndex);
      if (!Number.isFinite(rowIndex) || rowIndex < 0 || state.currentView !== 'object') return '';
      const objectId = getSelectedObjectKey_();
      const objectKey = normalizeMonitoringObjectKey_(objectId);
      const loading = objectKey && state.labStudiesHistoryLoadingObjectKey === objectKey;
      const error = objectKey ? String(state.labStudiesHistoryErrorsByObjectKey[objectKey] || '').trim() : '';
      const rows = getSelectedLabStudiesHistoryRows_();
      const badgeCount = rows.length;

      if (loading && !rows.length) {
        return (
          `<div class="lab-studies-history-card monitoring-history-inline">` +
            renderLabStudiesHistoryTopHtml_(badgeCount) +
            `<div class="empty-state">Загружаю исследования объекта...</div>` +
          `</div>`
        );
      }
      if (error && !rows.length) {
        return (
          `<div class="lab-studies-history-card monitoring-history-inline">` +
            renderLabStudiesHistoryTopHtml_(badgeCount) +
            `<div class="empty-state">${escapeHtml_(error)}</div>` +
          `</div>`
        );
      }
      if (!rows.length) {
        return (
          `<div class="lab-studies-history-card monitoring-history-inline">` +
            renderLabStudiesHistoryTopHtml_(badgeCount) +
            `<div class="empty-state">Для этого объекта исследования пока не найдены.</div>` +
          `</div>`
        );
      }

      return (
        `<div class="lab-studies-history-card monitoring-history-inline">` +
          renderLabStudiesHistoryTopHtml_(badgeCount) +
          `<div class="lab-studies-history-list">` +
            rows.map(study => {
              const createdText = formatLabStudyHistoryDateTime_(study && study.createdAt) || 'Без даты';
              const typeText = formatLabStudyHistoryTypeLabel_(study && study.studyType);
              const noteText = String(study && study.inspectorComment || '').trim();
              const metaParts = [
                `<span class="lab-studies-history-person">${escapeHtml_(getLabStudyHistoryInspectorLabel_(study))}</span>`,
                `<span class="lab-studies-history-date">${escapeHtml_(createdText)}</span>`,
                typeText ? `<span class="lab-studies-history-type">${escapeHtml_(typeText)}</span>` : ''
              ].filter(Boolean).join('<span class="lab-studies-history-separator">•</span>');
              const summaryHtml = renderLabStudyHistorySummaryHtml_(study);
              const schemeButton = hasLabStudyScheme_(study)
                ? `<button class="lab-study-history-button" type="button" data-open-lab-study-scheme="${escapeHtml_(String(study && study.id || '').trim())}">Схема</button>`
                : '';
              return (
                `<article class="lab-studies-history-item">` +
                  `<div class="lab-studies-history-item-head">` +
                    `<div class="lab-studies-history-meta">${metaParts}</div>` +
                  `</div>` +
                  (
                    summaryHtml
                      ? summaryHtml
                      : ''
                  ) +
                  (
                    noteText
                      ? `<div class="lab-studies-history-note">${escapeHtml_(noteText)}</div>`
                      : ''
                  ) +
                  (
                    schemeButton
                      ? `<div class="lab-studies-history-actions">${schemeButton}</div>`
                      : ''
                  ) +
                `</article>`
              );
            }).join('') +
          `</div>` +
        `</div>`
      );
    }

    let labStudySchemeMap_ = null;
    let labStudySchemeLayer_ = null;
    let labStudySchemeContentLayout_ = null;
    let labStudySchemePinCache_ = {};
    let labStudySchemeYandexMapsPromise_ = null;
    const LAB_STUDY_YANDEX_MAPS_API_URL = 'https://api-maps.yandex.ru/2.1/?apikey=52007aca-39bd-4a9c-87ef-4d9b730aeb71&lang=ru_RU';

    function findLabStudyHistoryById_(studyId) {
      const wantedId = String(studyId || '').trim();
      if (!wantedId) return null;
      return getSelectedLabStudiesHistoryRows_().find(item => String(item && item.id || '').trim() === wantedId) || null;
    }

    function isLabStudySchemeModalOpen_() {
      const overlay = el('labStudySchemeOverlay');
      return !!(overlay && !overlay.classList.contains('hidden'));
    }

    function getLabStudySchemePinHref_(color) {
      const key = String(color || '').trim().toLowerCase() || '#2f6ef2';
      if (labStudySchemePinCache_[key]) return labStudySchemePinCache_[key];
      const svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46" fill="none">' +
          `<path d="M17 1C8.163 1 1 8.163 1 17c0 11.782 12.537 25.251 15.001 27.777a1.4 1.4 0 0 0 1.998 0C20.463 42.251 33 28.782 33 17 33 8.163 25.837 1 17 1Z" fill="${key}" stroke="white" stroke-width="2"/>` +
          '<circle cx="17" cy="17" r="10" fill="white" fill-opacity="0.16"/>' +
        '</svg>'
      );
      const href = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
      labStudySchemePinCache_[key] = href;
      return href;
    }

    function getLabStudySchemeContentLayout_() {
      if (labStudySchemeContentLayout_) return labStudySchemeContentLayout_;
      if (!window.ymaps || !window.ymaps.templateLayoutFactory) return null;
      labStudySchemeContentLayout_ = window.ymaps.templateLayoutFactory.createClass(
        '<div class="lab-study-scheme-marker-content">$[properties.iconContent]</div>'
      );
      return labStudySchemeContentLayout_;
    }

    function loadLabStudySchemeYandexMaps_() {
      if (window.ymaps && typeof window.ymaps.ready === 'function') {
        return new Promise(resolve => window.ymaps.ready(() => resolve(window.ymaps)));
      }
      if (labStudySchemeYandexMapsPromise_) return labStudySchemeYandexMapsPromise_;

      labStudySchemeYandexMapsPromise_ = new Promise((resolve, reject) => {
        const finalize = () => {
          if (!window.ymaps || typeof window.ymaps.ready !== 'function') {
            reject(new Error('Yandex Maps API не загрузился'));
            return;
          }
          window.ymaps.ready(() => resolve(window.ymaps));
        };
        const handleError = () => reject(new Error('Не удалось загрузить Yandex Maps API'));
        const existing = Array.from(document.querySelectorAll('script[src]')).find(node => (
          String(node.getAttribute('src') || '').indexOf('api-maps.yandex.ru/2.1/') >= 0
        ));
        if (existing) {
          if (window.ymaps && typeof window.ymaps.ready === 'function') {
            finalize();
            return;
          }
          existing.addEventListener('load', finalize, { once: true });
          existing.addEventListener('error', handleError, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = LAB_STUDY_YANDEX_MAPS_API_URL;
        script.async = true;
        script.onload = finalize;
        script.onerror = handleError;
        (document.head || document.body || document.documentElement).appendChild(script);
      }).catch(error => {
        labStudySchemeYandexMapsPromise_ = null;
        throw error;
      });

      return labStudySchemeYandexMapsPromise_;
    }

    function ensureLabStudySchemeMap_() {
      if (labStudySchemeMap_) return labStudySchemeMap_;
      if (!window.ymaps) return null;
      const root = el('labStudySchemeMap');
      if (!root) return null;
      root.innerHTML = '';
      labStudySchemeMap_ = new window.ymaps.Map('labStudySchemeMap', {
        center: [55.751244, 37.618423],
        zoom: 16,
        controls: ['zoomControl']
      }, {
        suppressMapOpenBlock: true
      });
      labStudySchemeLayer_ = new window.ymaps.GeoObjectCollection();
      labStudySchemeMap_.geoObjects.add(labStudySchemeLayer_);
      return labStudySchemeMap_;
    }

    function renderLabStudySchemePlaceholder_(study, message, isError) {
      if (labStudySchemeMap_) return;
      const root = el('labStudySchemeMap');
      if (!root) return;
      root.innerHTML = (
        `<div class="lab-study-scheme-placeholder${isError ? ' is-error' : ''}">` +
          `<div class="lab-study-scheme-placeholder-title">${escapeHtml_(message)}</div>` +
        `</div>`
      );
    }

    function renderLabStudySchemeLegend_(study) {
      const subtitleNode = el('labStudySchemeSubtitle');
      const legendNode = el('labStudySchemeLegend');
      const summary = getObjectSummary_(Number(state.selectedRowIndex));
      const subtitleParts = [
        String(summary && (summary.name || summary.uin || summary.dsCode) || '').trim(),
        String(study && study.studyType || '').trim(),
        formatLabStudyHistoryDateTime_(study && study.createdAt)
      ].filter(Boolean);
      if (subtitleNode) subtitleNode.textContent = subtitleParts.join(' · ');
      if (!legendNode) return;

      const payload = buildLabStudySchemePayload_(study);
      if (!payload) {
        legendNode.innerHTML = `<div class="empty-state">Для этой записи пока нет полного набора координат.</div>`;
        return;
      }
      legendNode.innerHTML = payload.points.map(point => (
        `<div class="lab-study-scheme-legend-item">` +
          `<span class="lab-study-scheme-legend-marker lab-study-scheme-legend-marker--${escapeHtml_(point.key)}">${escapeHtml_(point.markerLabel)}</span>` +
          `<div class="lab-study-scheme-legend-text">` +
            `<div class="lab-study-scheme-legend-title">${escapeHtml_(point.title)}</div>` +
            `<div class="lab-study-scheme-legend-coords">${escapeHtml_(point.coordsText)}</div>` +
          `</div>` +
        `</div>`
      )).join('');
    }

    function renderLabStudySchemeMap_(study) {
      const payload = buildLabStudySchemePayload_(study);
      if (!payload || !window.ymaps) return;
      const map = ensureLabStudySchemeMap_();
      if (!map || !labStudySchemeLayer_) return;

      const lineCoords = payload.points.map(point => [point.coords.lat, point.coords.lon]);
      labStudySchemeLayer_.removeAll();
      labStudySchemeLayer_.add(new window.ymaps.Polyline(lineCoords, {}, {
        strokeColor: '#6f8ba7',
        strokeWidth: 4,
        strokeOpacity: 0.55
      }));

      payload.points.forEach(point => {
        const color = point.key === 'study'
          ? '#ef4444'
          : point.key === 'finish'
            ? '#0f766e'
            : '#2f6ef2';
        const placemark = new window.ymaps.Placemark(
          [point.coords.lat, point.coords.lon],
          {
            iconContent: point.markerLabel,
            hintContent: point.title,
            balloonContent: `${point.title}<br>${point.coordsText}`
          },
          {
            iconLayout: 'default#imageWithContent',
            iconImageHref: getLabStudySchemePinHref_(color),
            iconImageSize: [34, 46],
            iconImageOffset: [-17, -46],
            iconContentOffset: [0, 0],
            iconContentLayout: getLabStudySchemeContentLayout_(),
            hideIconOnBalloonOpen: false
          }
        );
        labStudySchemeLayer_.add(placemark);
      });

      const bounds = labStudySchemeLayer_.getBounds();
      if (bounds) {
        map.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: [36, 36, 36, 36]
        });
      }
      map.container.fitToViewport();
    }

    function openLabStudySchemeModal_(studyId) {
      const study = findLabStudyHistoryById_(studyId);
      if (!study) {
        showCopyToast_('Исследование не найдено', true);
        return;
      }
      if (!hasLabStudyScheme_(study)) {
        showCopyToast_('Для этой записи схема пока не настроена', true);
        return;
      }

      state.labStudySchemeStudyId = String(study.id || '').trim();
      renderLabStudySchemeLegend_(study);
      renderLabStudySchemePlaceholder_(study, 'Загружаю карту...', false);

      const overlay = el('labStudySchemeOverlay');
      if (!overlay) return;
      overlay.classList.remove('hidden');

      loadLabStudySchemeYandexMaps_()
        .then(() => {
          if (state.labStudySchemeStudyId !== String(study.id || '').trim() || !isLabStudySchemeModalOpen_()) return;
          window.requestAnimationFrame(() => renderLabStudySchemeMap_(study));
        })
        .catch(error => {
          warnRuntimeDiagnostic_(error, 'Ошибка загрузки схемы исследования');
          renderLabStudySchemePlaceholder_(
            study,
            error && error.message ? error.message : 'Не удалось загрузить карту',
            true
          );
        });
    }

    function closeLabStudySchemeModal_() {
      const overlay = el('labStudySchemeOverlay');
      if (overlay) overlay.classList.add('hidden');
      state.labStudySchemeStudyId = '';
    }

function getCheckIconSvgHtml_(className) {
      const iconClass = String(className || 'action-icon-svg').trim() || 'action-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M4 10.5l4 4 8-10"></path>` +
        `</svg>`
      );
    }

function getPlusIconSvgHtml_(className) {
      const iconClass = String(className || 'action-icon-svg').trim() || 'action-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M10 4.5v11"></path>` +
          `<path d="M4.5 10h11"></path>` +
        `</svg>`
      );
    }

function getEditBadgeSvgHtml_(className) {
      const iconClass = String(className || 'edit-badge-icon-svg').trim() || 'edit-badge-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M4.25 15.75l2.85-.72 7.37-7.37-2.13-2.13-7.37 7.37-.72 2.85Z"></path>` +
          `<path d="M11.85 5.55l2.13 2.13"></path>` +
        `</svg>`
      );
    }

function getMapPublishIconSvgHtml_(className) {
      const iconClass = String(className || 'saved-selection-action-icon-svg').trim() || 'saved-selection-action-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M3.9 10.05 15.8 4.8 11.55 16.1 9.45 10.55 3.9 10.05Z"></path>` +
          `<path d="M9.45 10.55 15.8 4.8"></path>` +
        `</svg>`
      );
    }

function getCloseIconSvgHtml_(className) {
      const iconClass = String(className || 'saved-selection-action-icon-svg').trim() || 'saved-selection-action-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M5 5l10 10"></path>` +
          `<path d="M15 5L5 15"></path>` +
        `</svg>`
      );
    }

function getChevronIconSvgHtml_(direction, className) {
      const iconClass = String(className || 'action-icon-svg').trim() || 'action-icon-svg';
      const normalizedDirection = String(direction || '').trim().toLowerCase() === 'down' ? 'down' : 'up';
      const path = normalizedDirection === 'down'
        ? '<path d="M5.5 8.25 10 12.75l4.5-4.5"></path>'
        : '<path d="M5.5 11.75 10 7.25l4.5 4.5"></path>';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          path +
        `</svg>`
      );
    }

function getTrashIconSvgHtml_(className) {
      const iconClass = String(className || 'saved-selection-action-icon-svg').trim() || 'saved-selection-action-icon-svg';
      return (
        `<svg class="${escapeHtml_(iconClass)}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">` +
          `<path d="M6.5 6.5h7"></path>` +
          `<path d="M8 6.5V5.2c0-.44.36-.8.8-.8h2.4c.44 0 .8.36.8.8v1.3"></path>` +
          `<path d="M6.9 6.5l.55 8.1c.03.51.46.9.97.9h3.16c.51 0 .94-.39.97-.9l.55-8.1"></path>` +
          `<path d="M9.1 8.8v4.5"></path>` +
          `<path d="M10.9 8.8v4.5"></path>` +
        `</svg>`
      );
    }

function renderObjectHistory_() {
      const node = el('objectHistorySection');
      const rowIndex = Number(state.selectedRowIndex);
      if (!node) return;
      if (!isCurrentRegistryDatasetEditable_()) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }
      if (!hasLoadedRowDetails_(rowIndex)) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }

      const key = getObjectChangeHistoryKey_(rowIndex);
      const entries = key && Array.isArray(state.changeHistoryByObject[key]) ? state.changeHistoryByObject[key] : [];
      if (!entries.length) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }

      node.classList.remove('hidden');
      node.innerHTML = (
        `<div class="section-card-top">` +
          `<div><h3>История изменений</h3></div>` +
          `<div class="section-card-actions">` +
            `<button class="object-history-clear ghost" type="button" data-clear-history="1">Очистить историю</button>` +
          `</div>` +
        `</div>` +
        `<div class="object-history-list">` +
          `${entries.map((entry, index) => (
            `<article class="object-history-item">` +
              `<div class="object-history-meta">` +
                `<div class="object-history-meta-main">` +
                  `<div class="object-history-field">${escapeHtml_(entry.field)}</div>` +
                  (
                    Number.isFinite(Number(entry.colIndex)) && Number(entry.colIndex) >= 0
                      ? `<button class="object-history-restore ghost" type="button" data-restore-history="${index}" ${canRestoreHistoryEntry_(rowIndex, entry) ? '' : 'disabled'}>Вернуть</button>`
                      : ''
                  ) +
                `</div>` +
                `<div class="object-history-time">${escapeHtml_(formatHistoryTime_(entry.at))}</div>` +
              `</div>` +
              `<div class="object-history-diff">` +
                `<div class="object-history-value old">${renderHistoryValueHtml_(entry.from)}</div>` +
                `<div class="object-history-arrow" aria-hidden="true">→</div>` +
                `<div class="object-history-value">${renderHistoryValueHtml_(entry.to)}</div>` +
              `</div>` +
            `</article>`
          )).join('')}` +
        `</div>`
      );

      node.querySelectorAll('[data-restore-history]').forEach(button => {
        button.addEventListener('click', () => {
          restoreHistoryEntry_(rowIndex, Number(button.getAttribute('data-restore-history')));
        });
      });
      node.querySelectorAll('[data-clear-history]').forEach(button => {
        button.addEventListener('click', () => {
          clearObjectHistory_(rowIndex);
        });
      });
    }

function formatHistoryTime_(timestamp) {
      if (!Number.isFinite(Number(timestamp))) return 'Сейчас';
      try {
        return new Date(Number(timestamp)).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (e) {
        return 'Сейчас';
      }
    }

function renderHistoryValueHtml_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '<span class="field-display-placeholder">Пусто</span>';
      return escapeHtmlWithBreaks_(text);
    }

function renderHeader_() {
      const rowIndex = state.selectedRowIndex;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        el('recordTitle').textContent = 'Выберите объект';
        el('btnHeaderEdit').classList.add('hidden');
        el('recordTitleMetaLine').classList.add('hidden');
        el('recordTitleMetaLine').innerHTML = '';
        el('pinnedGrid').innerHTML = '<div class="empty-state">Карточка объекта появится здесь после выбора строки в реестре.</div>';
        return;
      }

      const summary = getObjectSummary_(rowIndex);
      el('recordTitle').textContent = summary.name || summary.uin || 'Без названия';
      const rowReady = hasLoadedRowDetails_(rowIndex);
      el('btnHeaderEdit').classList.toggle('hidden', state.headerEditing || !rowReady || !isCurrentRegistryDatasetEditable_());

      if (state.headerEditing && rowReady) {
        el('recordTitleMetaLine').classList.add('hidden');
        el('recordTitleMetaLine').innerHTML = '';
        el('pinnedGrid').classList.remove('hidden');
        el('pinnedGrid').innerHTML = renderHeaderEditorHtml_(rowIndex);
        bindHeaderEditorEvents_(rowIndex);
        return;
      }

      const dashboardUrl = readCurrentValueBySpec_(rowIndex, DASHBOARD_SPEC);
      const titleItems = getHeaderTitleFieldsForRow_(rowIndex)
        .map(item => renderHeaderMetaItemHtml_(rowIndex, item, dashboardUrl))
        .filter(Boolean);

      el('recordTitleMetaLine').classList.toggle('hidden', !titleItems.length);
      el('recordTitleMetaLine').innerHTML = titleItems.join('');
      el('pinnedGrid').classList.add('hidden');
      el('pinnedGrid').innerHTML = '';

      bindHeaderEditorEvents_(rowIndex);
    }

function renderHeaderMetaItemHtml_(rowIndex, item, dashboardUrl) {
      if (!item) return '';
      if (item.kind === 'status') {
        const value = readCurrentValueBySpec_(rowIndex, item.spec);
        if (!String(value || '').trim()) return '';
        return (
          `<div class="record-meta-item${item.className ? ` ${escapeHtml_(item.className)}` : ''}">` +
            `<button class="status-pill copy-inline-chip" type="button" data-copy-text="${escapeHtml_(value)}" title="Нажмите, чтобы скопировать" aria-label="Скопировать статус">${escapeHtml_(value)}</button>` +
          `</div>`
        );
      }
      if (item.kind === 'done-rv') {
        const valueHtml = renderStatusDoneRvValueHtml_(rowIndex, item);
        if (!valueHtml) return '';
        return (
          `<div class="record-meta-item${item.className ? ` ${escapeHtml_(item.className)}` : ''}">` +
            `<span class="pill accent">${escapeHtml_(item.title || 'Поле')}</span>` +
            valueHtml +
          `</div>`
        );
      }
      if (!item.spec) return '';
      const valueHtml = renderHeaderFieldValueHtml_(rowIndex, item, dashboardUrl);
      if (!valueHtml) return '';
      return (
        `<div class="record-meta-item${item.className ? ` ${escapeHtml_(item.className)}` : ''}">` +
          `<span class="pill accent">${escapeHtml_(item.title || 'Поле')}</span>` +
          valueHtml +
        `</div>`
      );
    }

function renderHeaderFieldValueHtml_(rowIndex, item, dashboardUrl) {
      const value = readCurrentValueBySpec_(rowIndex, item.spec);
      if (item.kind === 'uin') return renderUinValueHtml_(value, dashboardUrl);
      return renderPinnedValueHtml_(item.spec, value);
    }

function getHeaderTitleFieldsForRow_(rowIndex) {
      return HEADER_TITLE_FIELDS.concat(buildStatusDoneHeaderFields_(rowIndex));
    }

function buildStatusDoneHeaderFields_(rowIndex) {
      if (!isStatusDoneForHeader_(rowIndex)) return [];
      return [{
        title: 'РВ',
        kind: 'done-rv',
        dateFieldId: STATUS_DONE_RV_HEADER_FIELDS.date,
        numberFieldId: STATUS_DONE_RV_HEADER_FIELDS.number
      }];
    }

function isStatusDoneForHeader_(rowIndex) {
      const statusValue = normalizeText_(readCurrentValueBySpec_(rowIndex, PINNED_FIELDS[0]));
      return statusValue === 'сдан' || statusValue.startsWith('сдан ');
    }

function renderStatusDoneRvValueHtml_(rowIndex, item) {
      const text = buildStatusDoneRvText_(rowIndex, item);
      if (!text) return '';
      return renderCopyableTextHtml_(text, 'pinned-value', escapeHtml_(text), { title: 'Нажмите, чтобы скопировать РВ' });
    }

    function buildStatusDoneRvText_(rowIndex, item) {
      const dateColumn = findColumnByFieldId_(item && item.dateFieldId);
      const numberColumn = findColumnByFieldId_(item && item.numberFieldId);
      const dateValue = dateColumn ? String(getCellValue_(rowIndex, dateColumn.index) || '').trim() : '';
      const numberValue = numberColumn ? String(getCellValue_(rowIndex, numberColumn.index) || '').trim() : '';
      return buildRvDisplayText_(dateValue, numberValue);
    }

    function buildRvDisplayText_(dateValue, numberValue) {
      if (!dateValue && !numberValue) return '';
      if (dateValue && numberValue) return `${dateValue} (№ ${numberValue})`;
      if (dateValue) return `${dateValue} (№ не заполнен)`;
      return `№ ${numberValue}`;
    }

    function getSectionFieldDisplayLabel_(field) {
      const fieldId = normalizeText_(field && field.fieldId || '');
      if (fieldId && Object.prototype.hasOwnProperty.call(SECTION_FIELD_LABEL_OVERRIDES, fieldId)) {
        return SECTION_FIELD_LABEL_OVERRIDES[fieldId];
      }
      return String(field && field.label || '').trim();
    }

function readCurrentValueBySpec_(rowIndex, spec) {
      const column = findColumnBySpec_(spec);
      return column ? getCellValue_(rowIndex, column.index) : '';
    }

function renderHeaderEditorHtml_(rowIndex) {
      const primaryFields = HEADER_EDIT_FIELDS_COMPACT.slice(0, 4);
      const secondaryFields = HEADER_EDIT_FIELDS_COMPACT.slice(4);
      return (
        `<div class="header-edit-shell">` +
          `<div class="header-edit-grid primary">` +
            `${primaryFields.map(item => renderHeaderEditorFieldHtml_(rowIndex, item, item.spec === OBJECT_NAME_SPEC)).join('')}` +
          `</div>` +
          (secondaryFields.length
            ? `<div class="header-edit-grid secondary">${secondaryFields.map(item => renderHeaderEditorFieldHtml_(rowIndex, item, false)).join('')}</div>`
            : '') +
          `<div class="header-edit-actions">` +
            `<button class="ghost object-card-action-button action-icon-button action-icon-button--success" type="button" data-header-finish="1" title="Применить изменения в шапке" aria-label="Применить изменения в шапке">${getCheckIconSvgHtml_('action-icon-svg')}</button>` +
            `<button class="ghost object-card-action-button action-icon-button action-icon-button--danger" type="button" data-header-cancel="1" title="Отменить редактирование шапки" aria-label="Отменить редактирование шапки">${getCloseIconSvgHtml_('action-icon-svg')}</button>` +
          `</div>` +
        `</div>`
      );
    }

function renderHeaderEditorFieldHtml_(rowIndex, item, wide) {
      const column = findColumnBySpec_(item.spec);
      const value = column ? getCellValue_(rowIndex, column.index) : '';
      const textAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_(item && item.title), false);
      return (
        `<label class="header-edit-field${wide ? ' wide' : ''}">` +
          `<span class="header-edit-label">${escapeHtml_(item.title || 'Поле')}</span>` +
          `<input class="field-input" type="text"${textAssistAttrs} data-role="header-input" data-field-index="${column ? column.index : -1}" value="${escapeHtml_(value)}">` +
        `</label>`
      );
    }

function renderPassport_() {
      const node = el('passportSection');
      const rowIndex = state.selectedRowIndex;
      if (!node) return;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        node.classList.add('hidden');
        node.innerHTML = '';
        return;
      }

      const editing = !!state.passportEditing;
      const canEditPassport = isCurrentRegistryDatasetEditable_();
      node.classList.remove('hidden');
      node.innerHTML = (
        `<div class="passport-head">` +
          `<div>` +
            `<h3>Паспорт объекта</h3>` +
          `</div>` +
          `<div class="passport-actions">` +
            (
              editing
                ? (
                  `<button class="ghost passport-toggle object-card-action-button action-icon-button action-icon-button--success" type="button" data-passport-finish="1" title="Применить изменения паспорта" aria-label="Применить изменения паспорта">${getCheckIconSvgHtml_('action-icon-svg')}</button>` +
                  `<button class="ghost passport-toggle object-card-action-button action-icon-button action-icon-button--danger" type="button" data-passport-cancel="1" title="Отменить редактирование паспорта" aria-label="Отменить редактирование паспорта">${getCloseIconSvgHtml_('action-icon-svg')}</button>`
                )
                : (canEditPassport ? `<button class="ghost icon-button passport-edit-button object-card-action-button action-icon-button action-icon-button--success" type="button" data-passport-edit="1" title="Редактировать паспорт" aria-label="Редактировать паспорт">${getEditBadgeSvgHtml_('action-icon-svg')}</button>` : '')
            ) +
            `<button class="ghost passport-toggle passport-toggle-icon object-card-action-button action-icon-button action-icon-button--neutral" type="button" data-toggle-passport="1" title="${escapeHtml_(state.passportCollapsed ? 'Показать паспорт объекта' : 'Скрыть паспорт объекта')}" aria-label="${escapeHtml_(state.passportCollapsed ? 'Показать паспорт объекта' : 'Скрыть паспорт объекта')}">${getChevronIconSvgHtml_(state.passportCollapsed ? 'down' : 'up', 'action-icon-svg')}</button>` +
          `</div>` +
        `</div>` +
        (
          state.passportCollapsed
            ? ''
            : `<div class="passport-rows${editing ? ' is-editing' : ''}">${renderPassportRowsHtml_(rowIndex, editing)}</div>`
        )
      );

      bindPassportEvents_(node, rowIndex);

      if (!state.passportCollapsed && editing && state.pendingFocusFieldKey) {
        const target = node.querySelector(`[data-edit-key="${state.pendingFocusFieldKey}"]`);
        if (target) {
          target.focus();
          trySetInputSelectionToEnd_(target);
        }
        state.pendingFocusFieldKey = '';
      }
    }

function renderPassportRowsHtml_(rowIndex, editing) {
      const items = PASSPORT_ITEM_DEFS;
      return items.map(item => (
        `<div class="passport-row">` +
          `${renderPassportItemHtml_(rowIndex, item, editing)}` +
        `</div>`
      )).join('');
    }

function renderPassportItemHtml_(rowIndex, item, editing) {
      if (!item) return '';
      if (item.type === 'contacts') return renderPassportContactHtml_(rowIndex, item, editing);
      return renderPassportFieldHtml_(rowIndex, item, editing);
    }

function renderPassportFieldHtml_(rowIndex, item, editing) {
      const column = findColumnBySpec_(item.spec);
      const colIndex = column ? column.index : -1;
      const value = column ? getCellValue_(rowIndex, colIndex) : '';
      const changed = column ? hasEditedValue_(rowIndex, colIndex) : false;
      const multiline = shouldUseTextareaForField_(item && item.title, value);
      const stacked = shouldUseStackedFieldDisplay_(item.title, value);
      return (
        `<article class="passport-item${stacked ? ' stacked' : ''}${changed ? ' changed' : ''}${editing ? ' is-editing' : ''}">` +
          `<div class="passport-item-label">${escapeHtml_(item.title || 'Поле')}</div>` +
          (
            editing && column
              ? renderPassportFieldEditorHtml_(rowIndex, colIndex, value, multiline, item && item.title)
              : renderPassportFieldDisplayHtml_(value, stacked)
          ) +
        `</article>`
      );
    }

function renderPassportFieldEditorHtml_(rowIndex, colIndex, value, multiline, label) {
      const inputId = `passport_${rowIndex}_${colIndex}`;
      const editKey = fieldEditKey_(rowIndex, colIndex);
      const textAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_(label, { multiline }), multiline);
      return multiline
        ? `<textarea id="${escapeHtml_(inputId)}" class="field-input"${textAssistAttrs} data-role="passport-input" data-field-index="${colIndex}" data-edit-key="${escapeHtml_(editKey)}">${escapeHtml_(value || '')}</textarea>`
        : `<input id="${escapeHtml_(inputId)}" class="field-input" type="text"${textAssistAttrs} data-role="passport-input" data-field-index="${colIndex}" data-edit-key="${escapeHtml_(editKey)}" value="${escapeHtml_(value || '')}">`;
    }

function renderPassportFieldDisplayHtml_(value, stacked) {
      const text = normalizeInlineDisplayText_(value);
      if (!text) return `<div class="passport-item-placeholder">Пока пусто</div>`;
      return renderCopyableTextHtml_(
        text,
        'passport-item-value',
        stacked ? escapeHtmlWithBreaks_(String(value == null ? '' : value).trim()) : escapeHtml_(text),
        { stacked: !!stacked }
      );
    }

function renderPassportContactHtml_(rowIndex, item, editing) {
      const indexes = getPassportContactIndexes_(item);
      const personValue = indexes.person >= 0 ? getCellValue_(rowIndex, indexes.person) : '';
      const detailsValue = indexes.details >= 0 ? getCellValue_(rowIndex, indexes.details) : '';
      const changed = hasPassportContactChanges_(rowIndex, indexes);
      return (
        `<article class="passport-item${changed ? ' changed' : ''}${editing ? ' is-editing' : ''}">` +
          `<div class="passport-item-label">${escapeHtml_(item.title || 'Контакты')}</div>` +
          (
            editing
              ? renderPassportContactEditorHtml_(rowIndex, indexes, personValue, detailsValue)
              : renderPassportContactDisplayHtml_(personValue, detailsValue)
          ) +
        `</article>`
      );
    }

function renderPassportContactDisplayHtml_(personValue, detailsValue) {
      const person = normalizeInlineDisplayText_(personValue);
      const details = normalizeInlineDisplayText_(detailsValue);
      if (!person && !details) return `<div class="passport-item-placeholder">Пока пусто</div>`;
      return (
        `<div class="passport-contact-display">` +
          `<div class="passport-contact-line">` +
            (person ? renderCopyableTextHtml_(person, 'passport-contact-person', escapeHtml_(person)) : '') +
            (person && details ? `<span class="passport-contact-separator"> / </span>` : '') +
            (details ? renderCopyableTextHtml_(details, 'passport-contact-details', escapeHtml_(details)) : '') +
          `</div>` +
        `</div>`
      );
    }

function renderPassportContactEditorHtml_(rowIndex, indexes, personValue, detailsValue) {
      const personTextAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_('', { placeholder: 'Руководитель проекта (Заказчик)' }), false);
      const detailsTextAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_('', { placeholder: 'Контактные данные' }), false);
      return (
        `<div class="passport-contact-edit">` +
          (
            indexes.person >= 0
              ? `<input class="field-input" type="text"${personTextAssistAttrs} data-role="passport-input" data-field-index="${indexes.person}" data-edit-key="${escapeHtml_(fieldEditKey_(rowIndex, indexes.person))}" placeholder="Руководитель проекта (Заказчик)" value="${escapeHtml_(personValue || '')}">`
              : ''
          ) +
          (
            indexes.details >= 0
              ? `<input class="field-input" type="text"${detailsTextAssistAttrs} data-role="passport-input" data-field-index="${indexes.details}" data-edit-key="${escapeHtml_(fieldEditKey_(rowIndex, indexes.details))}" placeholder="Контактные данные" value="${escapeHtml_(detailsValue || '')}">`
              : ''
          ) +
        `</div>`
      );
    }

function getPassportContactIndexes_(item) {
      const personColumn = item && item.personSpec ? findColumnBySpec_(item.personSpec) : null;
      const detailsColumn = item && item.detailsSpec ? findColumnBySpec_(item.detailsSpec) : null;
      return {
        person: personColumn ? personColumn.index : -1,
        details: detailsColumn ? detailsColumn.index : -1
      };
    }

function hasPassportContactChanges_(rowIndex, indexes) {
      return (
        (Number.isFinite(indexes.person) && indexes.person >= 0 && hasEditedValue_(rowIndex, indexes.person)) ||
        (Number.isFinite(indexes.details) && indexes.details >= 0 && hasEditedValue_(rowIndex, indexes.details))
      );
    }

function getSectionPlaceholderMessage_(section) {
      return String(section && section.stubMessage || '').trim();
    }

function isGoogleOwnedHtmlFieldId_(fieldId) {
      const normalizedFieldId = normalizeText_(fieldId);
      if (!normalizedFieldId) return false;
      if (GOOGLE_OWNED_HTML_FIELD_IDS.has(normalizedFieldId)) return true;
      return GOOGLE_OWNED_HTML_FIELD_PREFIXES.some(prefix => normalizedFieldId.startsWith(prefix));
    }

function canEditSectionField_(field) {
      if (!isCurrentRegistryDatasetEditable_()) return false;
      const fieldId = normalizeText_(field && field.fieldId || '');
      if (!fieldId) return false;
      if (fieldId.startsWith('ksg_')) return true;
      return !isGoogleOwnedHtmlFieldId_(fieldId);
    }

function sectionHasEditableFields_(section, rowIndex) {
      const fields = getSectionFields_(section, rowIndex);
      return fields.some(field => canEditSectionField_(field));
    }

function canEditSection_(section) {
      if (!section) return false;
      if (getSectionPlaceholderMessage_(section)) return false;
      const rowIndex = Number.isFinite(state.selectedRowIndex) ? state.selectedRowIndex : -1;
      if (rowIndex < 0) return false;
      return sectionHasEditableFields_(section, rowIndex);
    }

function renderSectionStack_() {
      const stack = el('sectionStack');
      const rowIndex = state.selectedRowIndex;
      if (!Number.isFinite(rowIndex) || rowIndex < 0) {
        stack.innerHTML = '<div class="empty-state">Сначала выберите объект в реестре.</div>';
        return;
      }
      if (!state.activeSections.length) {
        stack.innerHTML = '';
        return;
      }
      if (state.sectionEditingId && !state.activeSections.some(section => section.id === state.sectionEditingId && canEditSection_(section))) {
        state.sectionEditingId = '';
        state.sectionEditSnapshot = new Map();
      }

      stack.innerHTML = state.activeSections.map(section => {
        const placeholderMessage = getSectionPlaceholderMessage_(section);
        const fields = placeholderMessage ? [] : getSectionFields_(section, rowIndex);
        const editable = canEditSection_(section);
        const editing = editable && state.sectionEditingId === section.id;
        const renderItems = buildSectionRenderItems_(fields, section, editing);
        const rows = buildSectionRows_(renderItems);
        const monitoringHistoryHtml = isMonitoringHistoryHostSection_(section)
          ? renderMonitoringHistorySectionHtml_()
          : '';
        const labStudiesHistoryHtml = isLabStudiesHistoryHostSection_(section)
          ? renderLabStudiesHistorySectionHtml_()
          : '';
        const sectionToolbarHtml = renderSectionToolbarHtml_(section, rowIndex, editing);
        const customSectionHtml = `${monitoringHistoryHtml}${labStudiesHistoryHtml}`;
        return (
          `<section class="surface section-card" id="${escapeHtml_(sectionDomId_(section.id))}">` +
            `<div class="section-card-top">` +
              `<div>` +
                `<h3>${escapeHtml_(section.title)}</h3>` +
              `</div>` +
              `<div class="section-card-actions">` +
                sectionToolbarHtml +
                (
                  editing
                    ? (
                      `<button class="ghost passport-toggle object-card-action-button action-icon-button action-icon-button--success" type="button" data-section-finish="${escapeHtml_(section.id)}" title="Применить изменения раздела" aria-label="Применить изменения раздела">${getCheckIconSvgHtml_('action-icon-svg')}</button>` +
                      `<button class="ghost passport-toggle object-card-action-button action-icon-button action-icon-button--danger" type="button" data-section-cancel="${escapeHtml_(section.id)}" title="Отменить редактирование раздела" aria-label="Отменить редактирование раздела">${getCloseIconSvgHtml_('action-icon-svg')}</button>`
                    )
                    : (
                      editable
                        ? `<button class="ghost icon-button section-edit-button object-card-action-button action-icon-button action-icon-button--success" type="button" data-section-edit="${escapeHtml_(section.id)}" title="Редактировать раздел" aria-label="Редактировать раздел">${getEditBadgeSvgHtml_('action-icon-svg')}</button>`
                        : ''
                    )
                ) +
                `<button class="ghost passport-toggle object-card-action-button action-icon-button action-icon-button--danger" type="button" data-remove-section="${escapeHtml_(section.id)}" title="Убрать раздел из карточки объекта" aria-label="Убрать раздел из карточки объекта">${getCloseIconSvgHtml_('action-icon-svg')}</button>` +
              `</div>` +
            `</div>` +
            (
              rows.length
                ? `<div class="section-rows${editing ? ' is-editing' : ''}">${rows.map(items => renderSectionRowHtml_(items, rowIndex, editing, section)).join('')}</div>`
                : (customSectionHtml
                  ? ''
                  : `<div class="empty-state">${escapeHtml_(placeholderMessage || 'Для текущего объекта в этой секции пока нет подходящих полей.')}</div>`)
            ) +
            customSectionHtml +
          `</section>`
        );
      }).join('');

      stack.querySelectorAll('[data-remove-section]').forEach(button => {
        button.addEventListener('click', () => removeSection_(String(button.getAttribute('data-remove-section') || '')));
      });
      stack.querySelectorAll('[data-section-edit]').forEach(button => {
        button.addEventListener('click', () => {
          const sectionId = String(button.getAttribute('data-section-edit') || '');
          const section = state.activeSections.find(item => item.id === sectionId);
          if (!section) return;
          startSectionEdit_(section, rowIndex);
          renderSectionStack_();
          syncObjectSaveUi_();
        });
      });
      stack.querySelectorAll('[data-section-finish]').forEach(button => {
        button.addEventListener('click', () => {
          finishSectionEdit_();
          renderSectionStack_();
          syncObjectSaveUi_();
        });
      });
      stack.querySelectorAll('[data-section-cancel]').forEach(button => {
        button.addEventListener('click', () => {
          cancelSectionEdit_(rowIndex);
          renderSectionStack_();
          syncObjectSaveUi_();
        });
      });
      stack.querySelectorAll('[data-open-lab-study-scheme]').forEach(button => {
        button.addEventListener('click', () => openLabStudySchemeModal_(String(button.getAttribute('data-open-lab-study-scheme') || '')));
      });
      stack.querySelectorAll('[data-open-lab-study-create]').forEach(button => {
        button.addEventListener('click', () => openLabStudyCreateDialog_());
      });
      stack.querySelectorAll('[data-ksg-state-save]').forEach(button => {
        button.addEventListener('click', () => {
          const inputId = String(button.getAttribute('data-input-id') || '').trim();
          const input = inputId ? document.getElementById(inputId) : null;
          const isoDate = input ? String(input.value || '').trim() : '';
          saveSelectedObjectKsgState_(getSelectedObjectKey_(), isoDate);
        });
      });
      bindEditableFieldContainerEvents_(stack);

      if (state.pendingFocusFieldKey) {
        const target = stack.querySelector(`[data-edit-key="${state.pendingFocusFieldKey}"]`);
        if (target) {
          target.focus();
          trySetInputSelectionToEnd_(target);
        }
        state.pendingFocusFieldKey = '';
      }
    }

function renderSectionRowHtml_(items, rowIndex, editing, section) {
      return (
        `<div class="section-row">` +
          `${(Array.isArray(items) ? items : []).map(item => renderSectionItemHtml_(item, rowIndex, editing, section)).join('')}` +
        `</div>`
      );
    }

    function renderSectionFieldItemHtml_(field, rowIndex, editing) {
      const rawValue = getCellValue_(rowIndex, field.index);
      const isMonitoringDateField = matchesFieldSpec_(field && field.label, field && field.fieldId, [SM_MONITORING_DATE_SPEC]);
      const isReadinessFactField = matchesFieldSpec_(field && field.label, field && field.fieldId, [SM_READINESS_FACT_SPEC]);
      const isPeopleFactField = matchesFieldSpec_(field && field.label, field && field.fieldId, [SM_PEOPLE_FACT_SPEC]);
      const monitoringSummary = !editing && (isMonitoringDateField || isReadinessFactField || isPeopleFactField) ? getRegistryRowSummary_(rowIndex) : null;
      const metricValue = isReadinessFactField
        ? String(monitoringSummary && monitoringSummary.constructionReadinessFact || rawValue || '').trim()
        : (isPeopleFactField ? String(monitoringSummary && monitoringSummary.peopleCountFact || rawValue || '').trim() : '');
      const value = isMonitoringDateField
        ? (
          monitoringSummary && String(monitoringSummary.monitoringDate || '').trim()
            ? formatRegistryDateText_(monitoringSummary.monitoringDate)
            : rawValue
        )
        : (metricValue || rawValue);
      const metricAlertTitle = isReadinessFactField
        ? buildMonitoringRetainedMetricAlertTitle_(monitoringSummary, 'Строительная готовность')
        : (isPeopleFactField ? buildMonitoringRetainedMetricAlertTitle_(monitoringSummary, 'Кол-во людей') : '');
      const changed = hasEditedValue_(rowIndex, field.index) ? ' changed' : '';
      const fieldLabel = getSectionFieldDisplayLabel_(field) || `Поле ${field.index + 1}`;
      const multiline = shouldUseTextareaForField_(fieldLabel, value);
      const linkKind = getFieldLinkKind_(field);
      const inputId = `field_${rowIndex}_${field.index}`;
      const stacked = linkKind ? false : shouldUseStackedFieldDisplay_(fieldLabel, value);
      const inlineLink = !editing && linkKind && isHttpUrl_(value);
      const editable = canEditSectionField_(field);
      return (
        `<article class="section-item${stacked ? ' stacked' : ''}${inlineLink ? ' link-inline' : ''}${changed}${editing ? ' is-editing' : ''}">` +
          `<div class="section-item-label">${escapeHtml_(fieldLabel)}</div>` +
          (
            editing
              ? renderSectionFieldEditorHtml_(field, value, multiline, inputId, linkKind, rowIndex, field.index, editable)
              : (
                isMonitoringDateField
                  ? renderMonitoringDateFieldDisplayHtml_(monitoringSummary || value)
                  : (
                    metricAlertTitle
                      ? renderMonitoringAlertFieldDisplayHtml_(value, metricAlertTitle)
                      : renderSectionFieldDisplayHtml_(value, linkKind, stacked)
                  )
              )
          ) +
        `</article>`
      );
    }

    function renderSectionLinkedFieldItemHtml_(item, rowIndex, editing) {
      const field = item && item.field;
      const linkField = item && item.linkField;
      if (!field || !linkField) return '';
      const value = getCellValue_(rowIndex, field.index);
      const href = getCellValue_(rowIndex, linkField.index);
      const changed = (hasEditedValue_(rowIndex, field.index) || hasEditedValue_(rowIndex, linkField.index)) ? ' changed' : '';
      if (String(item && item.linkKind || '') === 'checklist') {
        if (editing) {
          return (
            `<article class="section-item${changed} is-editing">` +
              `<div class="section-item-label">${escapeHtml_(getSectionFieldDisplayLabel_(field) || field.label || `Поле ${field.index + 1}`)}</div>` +
              `${renderSectionLinkedChecklistEditorHtml_(field, linkField, rowIndex)}` +
            `</article>`
          );
        }
        return (
          `<article class="section-item${changed}">` +
            `<div class="section-item-label">${escapeHtml_(getSectionFieldDisplayLabel_(field) || field.label || `Поле ${field.index + 1}`)}</div>` +
            `<div class="section-item-main">` +
              `<div class="section-item-link-stack">` +
                `<div class="section-item-display">` +
                  `${renderSectionLinkedValueHtml_(value, href, item && item.linkKind)}` +
                `</div>` +
                `${renderFieldLinkActionHtml_(href, item && item.linkKind)}` +
              `</div>` +
            `</div>` +
          `</article>`
        );
      }
      return (
        `<article class="section-item${changed}">` +
          `<div class="section-item-label">${escapeHtml_(field.label || `Поле ${field.index + 1}`)}</div>` +
          `<div class="section-item-main">` +
            `<div class="section-item-link-stack">` +
              `<div class="section-item-display">` +
                `${renderSectionLinkedValueHtml_(value, href, item && item.linkKind)}` +
                `${renderFieldLinkActionHtml_(href, item && item.linkKind)}` +
              `</div>` +
              `<div class="field-display-placeholder">Ссылка подключена</div>` +
            `</div>` +
          `</div>` +
        `</article>`
      );
    }

    function renderSectionItemHtml_(item, rowIndex, editing, section) {
      if (!item) return '';
      if (item.type === 'group') return renderSectionGroupHtml_(item, rowIndex, editing, section);
      if (item.type === 'rv-field') return renderSectionRvFieldItemHtml_(item, rowIndex);
      if (item.type === 'linked-field') return renderSectionLinkedFieldItemHtml_(item, rowIndex, editing);
      return renderSectionFieldItemHtml_(item.field, rowIndex, editing);
    }

    function renderSectionRvFieldItemHtml_(item, rowIndex) {
      const dateField = item && item.dateField;
      const numberField = item && item.numberField;
      const changed = (
        (dateField && hasEditedValue_(rowIndex, dateField.index)) ||
        (numberField && hasEditedValue_(rowIndex, numberField.index))
      ) ? ' changed' : '';
      const text = buildRvDisplayText_(
        dateField ? String(getCellValue_(rowIndex, dateField.index) || '').trim() : '',
        numberField ? String(getCellValue_(rowIndex, numberField.index) || '').trim() : ''
      );
      return (
        `<article class="section-item${changed}">` +
          `<div class="section-item-label">${escapeHtml_(String(item && item.title || 'РВ'))}</div>` +
          `<div class="section-item-main">` +
            `<div class="section-item-display">` +
              (
                text
                  ? renderCopyableTextHtml_(text, 'field-display-text', escapeHtml_(text), { title: 'Нажмите, чтобы скопировать РВ' })
                  : `<div class="field-display-placeholder">Пока пусто</div>`
              ) +
            `</div>` +
          `</div>` +
        `</article>`
      );
    }

function isKsgSection_(section) {
      return String(section && section.sourceKey || '').trim() === '__ksg__';
    }

    function getSelectedObjectKsgStateRecord_() {
      return getObjectKsgStateRecordByObjectKey_(getSelectedObjectKey_());
    }

    function getKsgSectionUpdatedDateInputValue_() {
      const stateRecord = getSelectedObjectKsgStateRecord_();
      const normalizedStored = normalizeDateRangeFacetBoundary_(stateRecord && stateRecord.updatedDate);
      if (normalizedStored) return normalizedStored;
      return formatLocalDateInputValue_(new Date());
    }

    function renderKsgSectionToolbarHtml_(section, rowIndex, editing) {
      if (editing || !isKsgSection_(section)) return '';
      const objectKey = normalizeMonitoringObjectKey_(getSelectedObjectKey_());
      if (!objectKey) return '';
      const stateRecord = getSelectedObjectKsgStateRecord_();
      const inputId = `ksg_section_update_${rowIndex}`;
      const busy = state.objectSaving || state.objectKsgStateLoadingObjectKey === objectKey;
      const disabledAttr = busy ? ' disabled' : '';
      const updatedDateText = formatRegistryDateText_(stateRecord && stateRecord.updatedDate) || '';
      const updatedByText = String(stateRecord && stateRecord.updatedBy || '').trim();
      const metaText = updatedDateText
        ? `Обновлено: ${updatedDateText}${updatedByText ? ` · ${updatedByText}` : ''}`
        : 'Дата обновления блока не указана';
      return (
        `<div class="ksg-section-toolbar" title="${escapeHtml_(metaText)}">` +
          `<input class="field-input ksg-section-date" type="date" id="${escapeHtml_(inputId)}" value="${escapeHtml_(getKsgSectionUpdatedDateInputValue_())}"${disabledAttr}>` +
          `<button class="ghost ksg-section-update-button" type="button" data-ksg-state-save data-input-id="${escapeHtml_(inputId)}"${disabledAttr}>Обновить</button>` +
        `</div>`
      );
    }

    function renderSectionToolbarHtml_(section, rowIndex, editing) {
      if (isKsgSection_(section)) return renderKsgSectionToolbarHtml_(section, rowIndex, editing);
      return '';
    }

function renderSectionGroupHtml_(group, rowIndex, editing, section) {
      const changed = (Array.isArray(group.items) ? group.items : []).some(item => hasEditedValue_(rowIndex, item.field.index));
      return (
        `<article class="section-item section-item-wide section-group-item${changed ? ' changed' : ''}${editing ? ' is-editing' : ''}">` +
          `<div class="section-group-head">` +
            `<div class="section-item-label">${escapeHtml_(group.title)}</div>` +
          `</div>` +
          `<div class="section-group-grid">` +
            `${group.items.map(item => renderSectionGroupSubitemHtml_(item, rowIndex, editing)).join('')}` +
          `</div>` +
        `</article>`
      );
    }

function renderSectionGroupSubitemHtml_(item, rowIndex, editing) {
      const field = item.field;
      const value = getCellValue_(rowIndex, field.index);
      const changed = hasEditedValue_(rowIndex, field.index) ? ' changed' : '';
      const multiline = shouldUseTextareaForField_(field && (field.label || item.shortLabel), value);
      const linkKind = getFieldLinkKind_(field);
      const inputId = `field_${rowIndex}_${field.index}`;
      const stacked = linkKind ? false : shouldUseStackedGroupSubitemDisplay_(item, value);
      const inlineLink = !editing && linkKind && isHttpUrl_(value);
      const editable = canEditSectionField_(field);
      return (
        `<div class="section-subitem${stacked ? ' stacked' : ''}${inlineLink ? ' link-inline' : ''}${changed}${editing ? ' is-editing' : ''}">` +
          `<div class="section-subitem-label">${escapeHtml_(item.shortLabel)}</div>` +
          (
            editing
              ? renderSectionFieldEditorHtml_(field, value, multiline, inputId, linkKind, rowIndex, field.index, editable)
              : renderSectionFieldDisplayHtml_(value, linkKind, stacked)
          ) +
        `</div>`
      );
    }

function shouldUseStackedGroupSubitemDisplay_(item, value) {
      const shortLabelKey = normalizeText_(item && item.shortLabel || '');
      const text = String(value == null ? '' : value).trim();
      if (/^(план|факт)$/.test(shortLabelKey) && text.length <= 40 && !shouldUseTextarea_(value)) {
        return false;
      }
      return shouldUseStackedFieldDisplay_(item && item.shortLabel || '', value);
    }

    function renderSectionFieldEditorHtml_(field, value, multiline, inputId, linkKind, rowIndex, colIndex, editable) {
      const editKey = fieldEditKey_(rowIndex, colIndex);
      const useTextarea = multiline && !linkKind;
      const fieldLabel = getSectionFieldDisplayLabel_(field);
      const canEdit = editable !== false;
      const textAssistAttrs = buildTextAssistAttrs_(shouldEnableTextAssist_(fieldLabel || (field && field.label), {
        multiline: useTextarea,
        linkKind
      }), useTextarea);
      const autoCalculated = getAutoCalculatedCellValueInfo_(rowIndex, colIndex);
      if (autoCalculated) {
        return (
          `<div class="section-item-main">` +
            `<input id="${escapeHtml_(inputId)}" class="field-input field-input-readonly" type="text" value="${escapeHtml_(autoCalculated.value || '')}" readonly tabindex="-1" aria-readonly="true" data-auto-calculated-field-index="${colIndex}" title="Рассчитывается автоматически по формуле Профинансировано x 100 / Сумма контракта">` +
          `</div>`
        );
      }
      if (!canEdit) {
        return (
          `<div class="section-item-main">` +
            (
              useTextarea
                ? `<textarea id="${escapeHtml_(inputId)}" class="field-input field-input-readonly" readonly tabindex="-1" aria-readonly="true" data-google-owned-field-index="${colIndex}" title="Поле обновляется из Google Sheets">${escapeHtml_(value || '')}</textarea>`
                : `<input id="${escapeHtml_(inputId)}" class="field-input field-input-readonly" type="text" value="${escapeHtml_(value || '')}" readonly tabindex="-1" aria-readonly="true" data-google-owned-field-index="${colIndex}" title="Поле обновляется из Google Sheets">`
            ) +
            `<div class="field-display-placeholder">Обновляется из Google</div>` +
          `</div>`
        );
      }
      return (
        `<div class="section-item-main">` +
          (
            useTextarea
              ? `<textarea id="${escapeHtml_(inputId)}" class="field-input"${textAssistAttrs} data-role="field-input" data-field-index="${colIndex}" data-link-kind="${escapeHtml_(linkKind)}" data-edit-key="${escapeHtml_(editKey)}">${escapeHtml_(value || '')}</textarea>`
              : `<input id="${escapeHtml_(inputId)}" class="field-input"${textAssistAttrs} data-role="field-input" data-field-index="${colIndex}" data-link-kind="${escapeHtml_(linkKind)}" data-edit-key="${escapeHtml_(editKey)}" value="${escapeHtml_(value || '')}">`
          ) +
          `${linkKind ? renderFieldLinkActionHtml_(value, linkKind) : ''}` +
        `</div>`
      );
    }

    function renderSectionLinkedChecklistEditorHtml_(field, linkField, rowIndex) {
      const fieldLabel = getSectionFieldDisplayLabel_(field) || String(field && field.label || `Поле ${Number(field && field.index) + 1}`).trim();
      const linkLabel = getSectionFieldDisplayLabel_(linkField) || String(linkField && linkField.label || `Поле ${Number(linkField && linkField.index) + 1}`).trim();
      const value = getCellValue_(rowIndex, field.index);
      const href = getCellValue_(rowIndex, linkField.index);
      const fieldInputId = `field_${rowIndex}_${field.index}`;
      const linkInputId = `field_${rowIndex}_${linkField.index}`;
      const fieldEditKey = fieldEditKey_(rowIndex, field.index);
      const linkEditKey = fieldEditKey_(rowIndex, linkField.index);
      const fieldTextAssistAttrs = buildTextAssistAttrs_(
        shouldEnableTextAssist_(fieldLabel, { multiline: false, linkKind: '' }),
        false
      );
      const linkTextAssistAttrs = buildTextAssistAttrs_(
        shouldEnableTextAssist_(linkLabel, { multiline: false, linkKind: 'checklist' }),
        false
      );
      return (
        `<div class="section-item-main section-linked-editor">` +
          `<label class="section-linked-editor-row">` +
            `<span class="section-linked-editor-label">${escapeHtml_(fieldLabel)}</span>` +
            `<input id="${escapeHtml_(fieldInputId)}" class="field-input"${fieldTextAssistAttrs} data-role="field-input" data-field-index="${field.index}" data-link-kind="" data-edit-key="${escapeHtml_(fieldEditKey)}" value="${escapeHtml_(value || '')}">` +
          `</label>` +
          `<div class="section-linked-editor-row">` +
            `<label class="section-linked-editor-input">` +
              `<span class="section-linked-editor-label">${escapeHtml_(linkLabel)}</span>` +
              `<input id="${escapeHtml_(linkInputId)}" class="field-input"${linkTextAssistAttrs} data-role="field-input" data-field-index="${linkField.index}" data-link-kind="checklist" data-edit-key="${escapeHtml_(linkEditKey)}" value="${escapeHtml_(href || '')}">` +
            `</label>` +
            `${renderFieldLinkActionHtml_(href, 'checklist')}` +
          `</div>` +
        `</div>`
      );
    }

function renderSectionFieldDisplayHtml_(value, linkKind, stacked) {
      if (linkKind && isHttpUrl_(value)) {
        return (
          `<div class="section-item-main">` +
            `<div class="section-item-link-stack">` +
              `<div class="section-item-display">${renderFieldLinkActionHtml_(value, linkKind)}</div>` +
              `<div class="field-display-placeholder">Ссылка подключена</div>` +
            `</div>` +
          `</div>`
        );
      }
      return (
        `<div class="section-item-main">` +
          `<div class="section-item-display">` +
            `${renderFieldDisplayTextHtml_(value, linkKind, stacked)}` +
            `${linkKind ? renderFieldLinkActionHtml_(value, linkKind) : ''}` +
          `</div>` +
        `</div>`
      );
    }

function renderCopyableTextHtml_(text, className, displayHtml, options) {
      const value = String(text == null ? '' : text).trim();
      if (!value) return '';
      const settings = options || {};
      const title = String(settings.title || 'Нажмите, чтобы скопировать').trim() || 'Нажмите, чтобы скопировать';
      const classes = [
        String(className || '').trim(),
        'copy-inline-text',
        settings.stacked ? 'copy-inline-text--stacked' : ''
      ].filter(Boolean).join(' ');
      return (
        `<button class="${escapeHtml_(classes)}" type="button" data-copy-text="${escapeHtml_(value)}" title="${escapeHtml_(title)}" aria-label="${escapeHtml_(title)}">` +
          `${displayHtml}` +
        `</button>`
      );
    }

function renderCopyActionButtonHtml_(text, title, extraClass) {
      const value = String(text == null ? '' : text).trim();
      if (!value) return '';
      const label = String(title || 'Скопировать').trim() || 'Скопировать';
      const classes = ['copy-action-button', String(extraClass || '').trim()].filter(Boolean).join(' ');
      return (
        `<button class="${escapeHtml_(classes)}" type="button" data-copy-text="${escapeHtml_(value)}" title="${escapeHtml_(label)}" aria-label="${escapeHtml_(label)}">` +
          `<svg class="copy-action-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">` +
            `<rect x="5.25" y="2.25" width="8.5" height="8.5" rx="1.75"></rect>` +
            `<path d="M10.75 13.75H4.5a2.25 2.25 0 0 1-2.25-2.25V5.25"></path>` +
          `</svg>` +
        `</button>`
      );
    }

function buildSectionRows_(items) {
      return (Array.isArray(items) ? items : []).map(item => [item]);
    }

function renderFieldDisplayTextHtml_(value, linkKind, stacked) {
      const text = normalizeInlineDisplayText_(value);
      if (!text) return `<div class="field-display-placeholder">Пока пусто</div>`;
      if (linkKind && isHttpUrl_(text)) return `<div class="field-display-placeholder">Ссылка подключена</div>`;
      return renderCopyableTextHtml_(
        text,
        'field-display-text',
        stacked ? escapeHtmlWithBreaks_(String(value == null ? '' : value).trim()) : escapeHtml_(text),
        { stacked: !!stacked }
      );
    }

function buildSectionRenderItems_(fields, section, editing) {
      const out = [];
      const groupIndexByKey = new Map();
      const compoundMap = buildSpecialSectionCompoundMap_(fields, section, editing);
      const consumedIndexes = new Set();

      (Array.isArray(fields) ? fields : []).forEach(field => {
        if (!field || consumedIndexes.has(field.index)) return;
        const compoundItem = compoundMap.get(field.index);
        if (compoundItem) {
          out.push(compoundItem);
          const compoundIndexes = Array.isArray(compoundItem.fieldIndexes)
            ? compoundItem.fieldIndexes
            : [field.index];
          compoundIndexes.forEach(index => {
            const normalizedIndex = Number(index);
            if (Number.isFinite(normalizedIndex)) consumedIndexes.add(normalizedIndex);
          });
          if (compoundItem.linkField) consumedIndexes.add(compoundItem.linkField.index);
          return;
        }
        const grouped = splitGroupedFieldLabel_(field && field.label);
        if (!grouped) {
          out.push({ type: 'field', field });
          return;
        }

        const groupKey = normalizeText_(grouped.title);
        if (!groupKey) {
          out.push({ type: 'field', field });
          return;
        }

        if (!groupIndexByKey.has(groupKey)) {
          out.push({
            type: 'group',
            title: grouped.title,
            items: [{ field, shortLabel: grouped.shortLabel }]
          });
          groupIndexByKey.set(groupKey, out.length - 1);
          return;
        }

        out[groupIndexByKey.get(groupKey)].items.push({ field, shortLabel: grouped.shortLabel });
      });

      return out.flatMap(item => (
        item.type === 'group' && item.items.length < 2
          ? [{ type: 'field', field: item.items[0].field }]
          : [item]
      )).map(item => (
        item && item.type === 'group'
          ? { ...item, items: sortSectionGroupItems_(item.items) }
          : item
      ));
    }

function sortSectionGroupItemsLegacy_(items) {
      const list = Array.isArray(items) ? items.slice() : [];
      const priorityByLabel = { 'план': 0, 'факт': 1 };
      return list.sort((a, b) => {
        const labelA = normalizeText_(a && a.shortLabel || '');
        const labelB = normalizeText_(b && b.shortLabel || '');
        const priorityA = Object.prototype.hasOwnProperty.call(priorityByLabel, labelA) ? priorityByLabel[labelA] : 99;
        const priorityB = Object.prototype.hasOwnProperty.call(priorityByLabel, labelB) ? priorityByLabel[labelB] : 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return Number(a && a.field && a.field.index) - Number(b && b.field && b.field.index);
      });
    }

    function buildSpecialSectionCompoundMapLegacy_(fields, section, editing) {
      const map = new Map();
      if (!section) return map;
      const list = Array.isArray(fields) ? fields : [];
      const sourceKey = String(section.sourceKey || '').trim();
      if (sourceKey === '__objects__') {
        const anoField = list.find(field => normalizeText_(field && field.fieldId || '') === 'sm_1_1') || null;
        const checklistField = list.find(field => normalizeText_(field && field.fieldId || '') === 'sm_1_2') || null;
        if (anoField && checklistField) {
          map.set(anoField.index, {
            type: 'linked-field',
            field: anoField,
            linkField: checklistField,
            linkKind: 'checklist'
          });
        }
      }
      if (sourceKey === '__ksg__') {
        const dateField = list.find(field => normalizeText_(field && field.fieldId || '') === 'ksg_12_3') || null;
        const numberField = list.find(field => normalizeText_(field && field.fieldId || '') === 'ksg_12_4') || null;
        const fieldIndexes = [dateField && dateField.index, numberField && numberField.index]
          .map(value => Number(value))
          .filter(value => Number.isFinite(value));
        if (fieldIndexes.length) {
          const rvItem = {
            type: 'rv-field',
            title: 'РВ',
            field: dateField || numberField,
            dateField,
            numberField,
            fieldIndexes
          };
          fieldIndexes.forEach(index => map.set(index, rvItem));
        }
      }
      return map;
    }

function sortSectionGroupItems_(items) {
      const list = Array.isArray(items) ? items.slice() : [];
      const priorityByLabel = {
        'контракт': 0,
        'план': 1,
        'факт': 2,
        '№ рв': 3,
        '№рв': 3,
        'номер рв': 3
      };
      return list.sort((a, b) => {
        const labelA = normalizeText_(a && a.shortLabel || '');
        const labelB = normalizeText_(b && b.shortLabel || '');
        const priorityA = Object.prototype.hasOwnProperty.call(priorityByLabel, labelA) ? priorityByLabel[labelA] : 99;
        const priorityB = Object.prototype.hasOwnProperty.call(priorityByLabel, labelB) ? priorityByLabel[labelB] : 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return Number(a && a.field && a.field.index) - Number(b && b.field && b.field.index);
      });
    }

    function buildSpecialSectionCompoundMap_(fields, section, editing) {
      const map = new Map();
      if (!section) return map;
      const list = Array.isArray(fields) ? fields : [];
      const sourceKey = String(section.sourceKey || '').trim();
      if (sourceKey === '__objects__') {
        const anoField = list.find(field => normalizeText_(field && field.fieldId || '') === 'sm_1_1') || null;
        const checklistField = list.find(field => normalizeText_(field && field.fieldId || '') === 'sm_1_2') || null;
        if (anoField && checklistField) {
          map.set(anoField.index, {
            type: 'linked-field',
            field: anoField,
            linkField: checklistField,
            linkKind: 'checklist'
          });
        }
      }
      return map;
    }

function sortSectionGroupItems_(items) {
      const list = Array.isArray(items) ? items.slice() : [];
      const priorityByLabel = {
        'контракт': 0,
        'план': 1,
        'факт': 2,
        '№ рв': 3,
        '№рв': 3,
        'номер рв': 3
      };
      return list.sort((a, b) => {
        const labelA = normalizeText_(a && a.shortLabel || '');
        const labelB = normalizeText_(b && b.shortLabel || '');
        const priorityA = Object.prototype.hasOwnProperty.call(priorityByLabel, labelA) ? priorityByLabel[labelA] : 99;
        const priorityB = Object.prototype.hasOwnProperty.call(priorityByLabel, labelB) ? priorityByLabel[labelB] : 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return Number(a && a.field && a.field.index) - Number(b && b.field && b.field.index);
      });
    }

function sortSectionGroupItems_(items) {
      const list = Array.isArray(items) ? items.slice() : [];
      const priorityByLabel = {
        '\u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442': 0,
        '\u043f\u043b\u0430\u043d': 1,
        '\u0444\u0430\u043a\u0442': 2,
        '\u2116 \u0440\u0432': 3,
        '\u2116\u0440\u0432': 3,
        '\u043d\u043e\u043c\u0435\u0440 \u0440\u0432': 3
      };
      return list.sort((a, b) => {
        const labelA = normalizeText_(a && a.shortLabel || '');
        const labelB = normalizeText_(b && b.shortLabel || '');
        const priorityA = Object.prototype.hasOwnProperty.call(priorityByLabel, labelA) ? priorityByLabel[labelA] : 99;
        const priorityB = Object.prototype.hasOwnProperty.call(priorityByLabel, labelB) ? priorityByLabel[labelB] : 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return Number(a && a.field && a.field.index) - Number(b && b.field && b.field.index);
      });
    }

    function renderSectionLinkedValueHtml_(value, href, linkKind) {
      const text = normalizeInlineDisplayText_(value);
      const url = String(href == null ? '' : href).trim();
      if (isHttpUrl_(url)) {
        if (String(linkKind || '') === 'checklist') {
          return `<a class="field-link-text" data-role="field-link" href="${escapeHtml_(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml_(text || 'Пусто')}</a>`;
        }
        return '';
      }
      if (!text) return `<div class="field-display-placeholder">Пока пусто</div>`;
      return `<span class="field-display-text">${escapeHtml_(text)}</span>`;
    }

function splitGroupedFieldLabel_(label) {
      const text = String(label == null ? '' : label).trim();
      const match = text.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      if (!match) return null;

      const title = String(match[1] || '').trim();
      const shortLabel = formatGroupedFieldLabel_(match[2]);
      if (!title || !shortLabel) return null;

      return { title, shortLabel };
    }

function formatGroupedFieldLabel_(value) {
      const text = String(value == null ? '' : value).trim().toLowerCase();
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function renderFieldLinkActionHtml_(value, linkKind) {
      if (!linkKind) return '';
      const text = String(value == null ? '' : value).trim();
      const href = isHttpUrl_(text) ? text : '';
      if (!href) return '';
      return (
        `<span class="inline-action-group">` +
          `<a class="field-link-action" data-role="field-link" href="${escapeHtml_(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml_(getFieldLinkActionText_(linkKind))}</a>` +
          `${renderCopyActionButtonHtml_(href, 'Скопировать ссылку')}` +
        `</span>`
      );
    }

function applyRegistryRangeFacetFilterFromMenu_(facetKey, menu) {
      const key = String(facetKey || '').trim();
      if (!key || !menu) return;
      if (isNumberRangeFacetDef_(key)) {
        updateRegistryFacetFilter_(key, normalizeNumberRangeFacetFilter_({
          min: getRegistryRangeFacetMenuValue_(menu, 'min'),
          max: getRegistryRangeFacetMenuValue_(menu, 'max')
        }));
        return;
      }
      if (isDateRangeFacetDef_(key)) {
        updateRegistryFacetFilter_(key, normalizeDateRangeFacetFilter_({
          from: getRegistryRangeFacetMenuValue_(menu, 'from'),
          to: getRegistryRangeFacetMenuValue_(menu, 'to')
        }));
      }
    }

function getRegistryRangeFacetMenuValue_(menu, bound) {
      const input = menu.querySelector(`[data-range-bound="${String(bound || '').trim()}"]`);
      return input ? String(input.value || '') : '';
    }

    // ----- Bind -----

function bindRegistryFacetMenuEvents_(def, menu) {
      if (!menu || menu.dataset.bound === '1') return;
      menu.dataset.bound = '1';
      menu.addEventListener('click', evt => {
        const input = evt.target.closest('[data-registry-filter-search]');
        if (input) {
          evt.stopPropagation();
          return;
        }
        const allButton = evt.target.closest('[data-registry-filter-all]');
        if (allButton) {
          evt.stopPropagation();
          toggleRegistryFacetAll_(String(allButton.getAttribute('data-registry-filter-all') || ''));
          return;
        }
        const rangeClearButton = evt.target.closest('[data-registry-filter-range-clear]');
        if (rangeClearButton) {
          evt.stopPropagation();
          updateRegistryFacetFilter_(String(rangeClearButton.getAttribute('data-registry-filter-range-clear') || ''), null);
          return;
        }
        const rangeApplyButton = evt.target.closest('[data-registry-filter-range-apply]');
        if (rangeApplyButton) {
          evt.stopPropagation();
          applyRegistryRangeFacetFilterFromMenu_(
            String(rangeApplyButton.getAttribute('data-registry-filter-range-apply') || ''),
            menu
          );
          closeRegistryFilterMenus_();
          return;
        }
        const optionButton = evt.target.closest('[data-registry-filter-option]');
        if (!optionButton) return;
        evt.stopPropagation();
        toggleRegistryFacetOption_(
          String(optionButton.getAttribute('data-registry-filter-option') || ''),
          String(optionButton.getAttribute('data-registry-filter-value') || '')
        );
      });
      menu.addEventListener('input', evt => {
        const input = evt.target.closest('[data-registry-filter-search]');
        if (!input) return;
        updateRegistryFacetSearch_(
          String(input.getAttribute('data-registry-filter-search') || ''),
          String(evt.target.value || '')
        );
      });
      menu.addEventListener('keydown', evt => {
        const input = evt.target.closest('[data-registry-filter-range-input]');
        if (!input || evt.key !== 'Enter') return;
        evt.preventDefault();
        evt.stopPropagation();
        applyRegistryRangeFacetFilterFromMenu_(
          String(input.getAttribute('data-registry-filter-range-input') || ''),
          menu
        );
        closeRegistryFilterMenus_();
      });
    }

function bindHeaderEditorEvents_(rowIndex) {
      const editButton = el('btnHeaderEdit');
      if (editButton) {
        editButton.onclick = () => {
          startHeaderEdit_(rowIndex);
          renderHeader_();
        };
      }

      el('pinnedGrid').querySelectorAll('[data-role="header-input"]').forEach(input => {
        input.addEventListener('input', () => {
          const colIndex = Number(input.getAttribute('data-field-index'));
          if (!Number.isFinite(colIndex) || colIndex < 0) return;
          setEditedValue_(rowIndex, colIndex, String(input.value || ''));
        });
      });

      el('pinnedGrid').querySelectorAll('[data-header-finish]').forEach(button => {
        button.addEventListener('click', () => {
          finishHeaderEdit_();
          renderHeader_();
          syncObjectSaveUi_();
        });
      });

      el('pinnedGrid').querySelectorAll('[data-header-cancel]').forEach(button => {
        button.addEventListener('click', () => {
          cancelHeaderEdit_(rowIndex);
          renderHeader_();
          syncObjectSaveUi_();
        });
      });
    }

function bindPassportEvents_(container, rowIndex) {
      const toggle = container.querySelector('[data-toggle-passport]');
      if (toggle) {
        toggle.addEventListener('click', () => {
          state.passportCollapsed = !state.passportCollapsed;
          persistRegistrySessionState_();
          renderPassport_();
        });
      }

      container.querySelectorAll('[data-passport-edit]').forEach(button => {
        button.addEventListener('click', () => {
          startPassportEdit_(rowIndex);
          renderPassport_();
          syncObjectSaveUi_();
        });
      });

      container.querySelectorAll('[data-passport-finish]').forEach(button => {
        button.addEventListener('click', () => {
          finishPassportEdit_();
          renderPassport_();
          syncObjectSaveUi_();
        });
      });

      container.querySelectorAll('[data-passport-cancel]').forEach(button => {
        button.addEventListener('click', () => {
          cancelPassportEdit_(rowIndex);
          renderPassport_();
          syncObjectSaveUi_();
        });
      });

      container.querySelectorAll('[data-role="passport-input"]').forEach(input => {
        input.addEventListener('input', () => {
          const colIndex = Number(input.getAttribute('data-field-index'));
          if (!Number.isFinite(colIndex) || colIndex < 0) return;
          setEditedValue_(rowIndex, colIndex, String(input.value || ''));
          const fieldCard = input.closest('.passport-item');
          if (fieldCard) fieldCard.classList.toggle('changed', true);
          syncObjectSaveUi_();
        });
      });
    }

function bindEditableFieldContainerEvents_(container) {
      if (!container) return;
      container.querySelectorAll('[data-role="field-input"]').forEach(input => {
        input.addEventListener('input', () => {
          const colIndex = Number(input.getAttribute('data-field-index'));
          if (!Number.isFinite(colIndex) || state.selectedRowIndex < 0) return;
          setEditedValue_(state.selectedRowIndex, colIndex, String(input.value || ''));
          const fieldCard = input.closest('.passport-item, .section-item, .section-subitem');
          if (fieldCard) fieldCard.classList.toggle('changed', true);
          syncFieldLinkPreview_(input);
        });
      });
    }

    // ----- Sync -----

function formatObjectSaveMessage_(result, fallbackCount) {
      const count = Number(result && result.updatedCells);
      const updatedCells = Number.isFinite(count) && count > 0 ? count : Number(fallbackCount) || 0;
      if (updatedCells <= 0) return 'Изменения сохранены в лист "Сводная".';
      const suffix = updatedCells % 10 === 1 && updatedCells % 100 !== 11
        ? 'ячейка'
        : ([2, 3, 4].includes(updatedCells % 10) && ![12, 13, 14].includes(updatedCells % 100) ? 'ячейки' : 'ячеек');
      return `Сохранено в "Сводная": ${updatedCells} ${suffix}.`;
    }

function syncObjectSaveUi_() {
      const button = el('btnSaveObject');
      const resetButton = el('btnResetObjectChanges');
      const status = el('objectSaveStatus');
      if (!button || !status) return;
      const rowIndex = state.selectedRowIndex;
      const hasObject = Number.isFinite(rowIndex) && rowIndex >= 0;
      const rowReady = hasObject && hasLoadedRowDetails_(rowIndex);
      const isEditable = isCurrentRegistryDatasetEditable_();
      const pendingEdits = isEditable && hasPendingEditsForRow_(rowIndex);
      const labelNode = button.querySelector('.object-save-button-text');
      const visualState = state.objectSaving
        ? 'saving'
        : (state.objectSaveVisual === 'success' ? 'success' : (state.objectSaveVisual === 'error' ? 'error' : 'idle'));
      const pendingCount = pendingEdits ? getPendingEditsForRow_(rowIndex).length : 0;

      button.disabled = !isEditable || !rowReady || (!pendingEdits && !state.objectSaving && !state.objectSaveError);
      if (resetButton) {
        resetButton.disabled = !isEditable || !rowReady || !pendingEdits || state.objectSaving;
        resetButton.classList.toggle('hidden', !isEditable || !rowReady || (!pendingEdits && !state.objectSaving));
        resetButton.title = pendingEdits
          ? 'Сбросить все несохраненные изменения текущего объекта.'
          : 'Несохраненных изменений нет.';
      }
      button.classList.toggle('is-saving', state.objectSaving);
      button.classList.toggle('is-success', !state.objectSaving && state.objectSaveVisual === 'success');
      button.classList.toggle('is-error', !state.objectSaving && state.objectSaveVisual === 'error');
      button.setAttribute('data-visual-state', visualState);
      if (labelNode) {
        labelNode.textContent = visualState === 'idle' ? 'Сохранить' : '';
      }
      const buttonTitle = !hasObject
        ? 'Выберите объект в реестре.'
        : (state.objectSaving
            ? 'Сохраняю изменения в лист "Сводная"...'
            : (state.objectSaveError
                ? `Повторить сохранение: ${state.objectSaveError}`
                : (pendingEdits
                    ? `Сохранить изменения текущего объекта: ${pendingCount}.`
                    : (state.objectSaveMessage || 'Изменений нет.'))));
      button.title = buttonTitle;
      button.setAttribute('aria-label', buttonTitle);

      let text = '0 изм.';
      let title = 'Изменений нет.';
      let statusClass = 'object-save-status idle';
      if (!hasObject) {
        text = 'Нет объекта';
        title = 'Выберите объект в реестре.';
      } else if (state.objectSaving) {
        text = 'Сохраняю...';
        title = 'Сохраняю изменения в лист "Сводная"...';
        statusClass = 'object-save-status saving';
      } else if (state.objectSaveError) {
        text = 'Ошибка';
        title = state.objectSaveError;
        statusClass = 'object-save-status error';
      } else if (pendingEdits) {
        text = `${pendingCount} изм.`;
        title = `К сохранению подготовлено изменений: ${pendingCount}.`;
        statusClass = 'object-save-status pending';
      } else if (state.objectSaveMessage) {
        text = 'Сохранено';
        title = state.objectSaveMessage;
        statusClass = 'object-save-status success';
      }

      status.className = statusClass;
      status.textContent = text;
      status.title = title;
    }

function syncObjectWorkflowUi_() {
      const indexNode = el('objectSelectionIndex');
      const workBadge = el('objectWorkStatusBadge');
      const prevButton = el('btnPrevUndoneObject');
      const nextButton = el('btnNextUndoneObject');
      const takeButton = el('btnTakeObjectWork');
      const doneButton = el('btnMarkObjectDone');
      const releaseButton = el('btnReleaseObjectWork');
      if (!isCurrentRegistryDatasetEditable_()) {
        [indexNode, workBadge, prevButton, nextButton, takeButton, doneButton, releaseButton].forEach(node => {
          if (!node) return;
          node.classList.add('hidden');
          if ('disabled' in node) node.disabled = true;
        });
        return;
      }
      const rowIndex = Number(state.selectedRowIndex);
      const hasObject = Number.isFinite(rowIndex) && rowIndex >= 0;
      const activeSelection = getActiveRegistrySelection_();
      const hasSavedSelection = !!activeSelection;
      const sharedSelectionActive = isCollaborativeRegistrySelection_(activeSelection);
      const sharedWorkEnabled = hasActiveSharedSelectionWork_();
      const workState = hasObject ? getRegistryRowWorkState_(rowIndex) : null;
      const pendingAction = hasObject ? String(workState && workState.pendingAction || '') : '';
      const hasPendingAction = !!pendingAction || !!state.sharedSelectionWorkBatchPendingAction;
      const isDone = hasSavedSelection && hasObject ? !!(workState && workState.isDone) : false;
      const position = hasSavedSelection && hasObject ? getActiveSelectionObjectPosition_(rowIndex) : null;
      const prevRowIndex = hasSavedSelection && hasObject ? findPrevUndoneRowIndex_(rowIndex) : -1;
      const nextRowIndex = hasSavedSelection && hasObject ? findNextUndoneRowIndex_(rowIndex) : -1;

      if (indexNode) {
        indexNode.classList.toggle('hidden', !position);
        if (position) {
          indexNode.textContent = `Объект ${position.index} из ${position.total}`;
          indexNode.title = `Текущий объект: ${position.index} из ${position.total} в активной сохраненной выборке.`;
        } else {
          indexNode.textContent = 'Объект 0 из 0';
          indexNode.title = '';
        }
      }

      if (workBadge) {
        let badgeText = '';
        let badgeClass = 'object-work-badge';
        if (hasSavedSelection && isCollaborativeRegistrySelection_(activeSelection) && !getCurrentUserBlockName_()) {
          badgeText = getCollaborativeSelectionDivisionMessage_(activeSelection);
        } else if (sharedWorkEnabled && pendingAction) {
          badgeText = getSharedSelectionWorkPendingText_(pendingAction);
          badgeClass += ' mine';
        } else if (sharedWorkEnabled && workState) {
          if (workState.isDone) {
            badgeText = `Выполнено${workState.assigneeName ? `: ${workState.assigneeName}` : ''}`;
            badgeClass += ' done';
          } else if (workState.isMine) {
            badgeText = 'У вас';
            badgeClass += ' mine';
          } else if (workState.isBusy) {
            badgeText = workState.assigneeName || 'Занят';
          } else {
            badgeText = 'Свободен';
          }
        }
        workBadge.className = badgeClass;
        workBadge.textContent = badgeText;
        workBadge.classList.toggle('hidden', !badgeText);
        workBadge.title = badgeText;
      }

      if (prevButton) {
        prevButton.classList.toggle('hidden', !hasSavedSelection || !hasObject);
        prevButton.disabled = prevRowIndex < 0;
        prevButton.title = prevRowIndex >= 0
          ? 'Открыть предыдущий невыполненный объект из текущей выборки'
          : 'В текущей выборке больше нет невыполненных объектов до текущего';
      }

      if (nextButton) {
        nextButton.classList.toggle('hidden', !hasSavedSelection || !hasObject);
        nextButton.disabled = nextRowIndex < 0;
        nextButton.title = nextRowIndex >= 0
          ? 'Открыть следующий невыполненный объект из текущей выборки'
          : 'В текущей выборке больше нет невыполненных объектов';
      }

      if (takeButton) {
        takeButton.classList.add('hidden');
        takeButton.classList.remove('is-loading');
        takeButton.disabled = true;
        takeButton.title = '';
      }

      if (doneButton) {
        if (sharedSelectionActive) {
          const isDonePending = pendingAction === 'done';
          const showDone = !!(sharedWorkEnabled && hasObject && workState && (workState.isFree || workState.isMine || isDonePending));
          doneButton.classList.toggle('hidden', !showDone);
          doneButton.classList.remove('is-done');
          doneButton.classList.toggle('is-loading', isDonePending);
          doneButton.disabled = !showDone || hasPendingAction;
          doneButton.textContent = isDonePending ? 'Отмечаю...' : 'Выполнить';
          doneButton.title = showDone
            ? 'Пометить текущий объект как выполненный для вашего блока'
            : '';
        } else {
          doneButton.classList.toggle('hidden', !hasSavedSelection || !hasObject);
          doneButton.classList.toggle('is-done', !!isDone);
          doneButton.classList.remove('is-loading');
          doneButton.disabled = !hasSavedSelection || !hasObject;
          doneButton.textContent = isDone ? 'Снять выполнение' : 'Выполнить';
          doneButton.title = isDone
            ? 'Снять личную отметку "выполнено" для текущего объекта'
            : 'Пометить текущий объект как выполненный в активной выборке';
        }
      }

      if (releaseButton) {
        releaseButton.classList.add('hidden');
        releaseButton.classList.remove('is-loading');
        releaseButton.disabled = true;
        releaseButton.title = '';
      }
    }


function syncAutoCalculatedFieldUi_(rowIndex) {
      if (Number(state.selectedRowIndex) !== Number(rowIndex)) return;
      const columns = getMgzBudgetProgressColumns_();
      if (!columns || !columns.budgetProgress) return;
      const colIndex = Number(columns.budgetProgress.index);
      const value = getCellValue_(rowIndex, colIndex);
      document.querySelectorAll(`[data-auto-calculated-field-index="${colIndex}"]`).forEach(input => {
        if (String(input.value || '') !== value) input.value = value;
        const fieldCard = input.closest('.passport-item, .section-item, .section-subitem');
        if (fieldCard) fieldCard.classList.toggle('changed', hasEditedValue_(rowIndex, colIndex));
      });
    }

function syncFieldLinkPreview_(input) {
      if (!input) return;
      const linkKind = String(input.getAttribute('data-link-kind') || '').trim();
      if (!linkKind) return;
      const fieldRow = input.closest('.section-item, .section-subitem');
      const link = fieldRow ? fieldRow.querySelector('[data-role="field-link"]') : null;
      if (!link) return;
      const value = String(input.value || '').trim();
      if (isHttpUrl_(value)) {
        link.setAttribute('href', value);
        link.classList.remove('hidden');
      } else {
        link.setAttribute('href', '#');
        link.classList.add('hidden');
      }
    }

    // ----- Interaction -----

function startHeaderEdit_(rowIndex) {
      state.headerEditSnapshot = new Map();
      HEADER_EDIT_FIELDS_COMPACT.forEach(item => {
        const column = findColumnBySpec_(item.spec);
        if (column) state.headerEditSnapshot.set(column.index, getCellValue_(rowIndex, column.index));
      });
      state.headerEditing = true;
    }

function finishHeaderEdit_() {
      state.headerEditing = false;
      state.headerEditSnapshot = new Map();
      syncObjectSaveUi_();
    }

function cancelHeaderEdit_(rowIndex) {
      state.headerEditSnapshot.forEach((value, colIndex) => {
        setEditedValue_(rowIndex, colIndex, value);
      });
      state.headerEditing = false;
      state.headerEditSnapshot = new Map();
      syncObjectSaveUi_();
    }

function getPassportEditableColumnIndexes_() {
      const indexes = [];
      PASSPORT_ITEM_DEFS.forEach(item => {
        if (item.type === 'field' && item.spec) {
          const column = findColumnBySpec_(item.spec);
          if (column) indexes.push(column.index);
        }
        if (item.type === 'contacts') {
          const contactIndexes = getPassportContactIndexes_(item);
          if (Number.isFinite(contactIndexes.person) && contactIndexes.person >= 0) indexes.push(contactIndexes.person);
          if (Number.isFinite(contactIndexes.details) && contactIndexes.details >= 0) indexes.push(contactIndexes.details);
        }
      });
      return Array.from(new Set(indexes));
    }

function startPassportEdit_(rowIndex) {
      state.passportCollapsed = false;
      state.passportEditing = true;
      state.passportEditSnapshot = new Map();
      const indexes = getPassportEditableColumnIndexes_();
      indexes.forEach(colIndex => {
        state.passportEditSnapshot.set(colIndex, getCellValue_(rowIndex, colIndex));
      });
      if (indexes.length) state.pendingFocusFieldKey = fieldEditKey_(rowIndex, indexes[0]);
    }

function finishPassportEdit_() {
      state.passportEditing = false;
      state.passportEditSnapshot = new Map();
    }

function cancelPassportEdit_(rowIndex) {
      state.passportEditSnapshot.forEach((value, colIndex) => {
        setEditedValue_(rowIndex, colIndex, value);
      });
      state.passportEditing = false;
      state.passportEditSnapshot = new Map();
    }

function getSectionEditableColumnIndexes_(section, rowIndex) {
      const fields = getSectionFields_(section, rowIndex);
      const items = buildSectionRenderItems_(fields);
      const indexes = [];
      items.forEach(item => {
        if (!item) return;
        if (item.type === 'group') {
          (Array.isArray(item.items) ? item.items : []).forEach(groupItem => {
            if (groupItem && groupItem.field && canEditSectionField_(groupItem.field) && Number.isFinite(groupItem.field.index)) indexes.push(groupItem.field.index);
          });
          return;
        }
        if (item.field && canEditSectionField_(item.field) && Number.isFinite(item.field.index)) indexes.push(item.field.index);
      });
      return Array.from(new Set(indexes));
    }

function startSectionEdit_(section, rowIndex) {
      if (!section || !canEditSection_(section)) return;
      if (state.sectionEditingId && state.sectionEditingId !== section.id) finishSectionEdit_();
      state.sectionEditingId = section.id;
      state.sectionEditSnapshot = new Map();
      const indexes = getSectionEditableColumnIndexes_(section, rowIndex);
      indexes.forEach(colIndex => {
        state.sectionEditSnapshot.set(colIndex, getCellValue_(rowIndex, colIndex));
      });
      if (indexes.length) state.pendingFocusFieldKey = fieldEditKey_(rowIndex, indexes[0]);
    }

function finishSectionEdit_() {
      state.sectionEditingId = '';
      state.sectionEditSnapshot = new Map();
      syncObjectSaveUi_();
    }

function cancelSectionEdit_(rowIndex) {
      state.sectionEditSnapshot.forEach((value, colIndex) => {
        setEditedValue_(rowIndex, colIndex, value);
      });
      state.sectionEditingId = '';
      state.sectionEditSnapshot = new Map();
      syncObjectSaveUi_();
    }


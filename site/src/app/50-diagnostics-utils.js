    // ===== Diagnostics =====

    // ----- Runtime -----

function fieldEditKey_(rowIndex, colIndex) {
      return `${Number(rowIndex)}:${Number(colIndex)}`;
    }

function formatRuntimeErrorMessage_(error, context) {
      const base = error && error.message ? error.message : String(error || 'Неизвестная ошибка');
      const text = String(base || 'Неизвестная ошибка').trim();
      return context ? `${context}: ${text}` : text;
    }

function setRuntimeError_(message) {
      const text = String(message || '').trim();
      state.runtimeErrorMessage = text;
      const node = el('runtimeErrorBanner');
      if (!node) return;
      node.textContent = text;
      node.classList.toggle('hidden', !text);
    }

function clearRuntimeError_() {
      state.runtimeErrorMessage = '';
      const node = el('runtimeErrorBanner');
      if (!node) return;
      node.textContent = '';
      node.classList.add('hidden');
    }

function writeRuntimeDiagnostic_(level, error, context) {
      const normalizedLevel = String(level || '').trim().toLowerCase() === 'warn' ? 'warn' : 'error';
      const logger = normalizedLevel === 'warn' ? console.warn : console.error;
      const label = context ? `[mpro ss] ${context}` : '[mpro ss]';
      try {
        if (typeof logger === 'function') {
          if (error === undefined) {
            logger.call(console, label);
          } else {
            logger.call(console, label, error);
          }
        }
      } catch (loggingError) {}
    }

function warnRuntimeDiagnostic_(error, context) {
      writeRuntimeDiagnostic_('warn', error, context);
    }

function reportRuntimeError_(error, context) {
      const message = formatRuntimeErrorMessage_(error, context);
      writeRuntimeDiagnostic_('error', error, context || 'Runtime error');
      setRuntimeError_(message);
      state.objectSaving = false;
      state.objectSaveVisual = 'error';
      state.objectSaveMessage = '';
      state.objectSaveError = message;
      try {
        syncObjectSaveUi_();
      } catch (syncError) {
        writeRuntimeDiagnostic_('error', syncError, 'Failed to sync error UI');
      }
    }

function renderErrorState_(message) {
      cancelRegistryRowsRender_();
      setRuntimeError_(message || 'Ошибка');
      el('savedSelectionList').innerHTML = `<div class="empty-state">${escapeHtml_(message || 'Ошибка')}</div>`;
      el('registryTableBody').innerHTML = `<tr><td colspan="${getRegistryTableColumnCount_()}"><div class="empty-state">${escapeHtml_(message || 'Ошибка')}</div></td></tr>`;
      el('recordTitle').textContent = 'Ошибка загрузки';
      el('btnHeaderEdit').classList.add('hidden');
      el('recordTitleMetaLine').classList.add('hidden');
      el('recordTitleMetaLine').innerHTML = '';
      el('pinnedGrid').classList.add('hidden');
      el('pinnedGrid').innerHTML = '';
      el('passportSection').classList.add('hidden');
      el('passportSection').innerHTML = '';
      el('sectionStack').innerHTML = `<div class="empty-state">${escapeHtml_(message || 'Ошибка')}</div>`;
    }

function syncRegistryDatasetButtonsUi_() {
      return;
    }

function syncExportSummaryButtonUi_() {
      const button = el('btnExportSummaryCsv');
      if (!button) return;
      const hasSession = !!state.currentUser && !!state.sessionToken;
      button.classList.toggle('hidden', !hasSession);
      const ready = hasSession && !state.loading && Array.isArray(state.columns) && state.columns.length > 0 && Array.isArray(state.rows) && state.rows.length > 0;
      button.disabled = !ready || !!state.summaryExportPending;
      const labelNode = button.querySelector('.sidebar-data-action-title');
      if (labelNode) labelNode.textContent = 'Экспорт CSV';
      const title = state.summaryExportPending
        ? 'Экспортируем CSV...'
        : (ready ? 'Экспортировать актуальную сводную в CSV' : 'Данные еще не готовы для экспорта');
      button.title = title;
      button.setAttribute('aria-label', title);
    }

function syncGoogleSheetButtonUi_() {
      const button = el('btnSyncGoogleSheet');
      const statusNode = el('syncGoogleStatus');
      if (!button) return;
      const hasSession = !!state.currentUser && !!state.sessionToken;
      button.classList.toggle('hidden', !hasSession);
      const ready = hasSession && !state.googleSyncPending;
      button.disabled = !ready;
      button.classList.toggle('is-loading', !!state.googleSyncPending);
      const formattedLastAt = formatGoogleSyncLastAt_(state.googleSyncLastAt);
      if (statusNode) {
        const statusText = state.googleSyncPending ? 'идет sync' : formattedLastAt;
        statusNode.textContent = statusText;
        statusNode.classList.toggle('hidden', !statusText);
      }
      const title = !hasSession
        ? 'Авторизуйтесь, чтобы управлять синхронизацией Google'
        : (state.googleSyncPending
          ? 'Синхронизируем Google...'
          : (formattedLastAt ? `sync Google · ${formattedLastAt}` : 'sync Google'));
      button.title = title;
      button.setAttribute('aria-label', title);
    }

function getSummaryExportCatalogLookup_() {
      return getSourceCatalogLookup_();
    }

function buildSummaryExportColumnsFrom_(rawColumns) {
      const catalogLookup = getSummaryExportCatalogLookup_();
      const baseColumns = (Array.isArray(rawColumns) ? rawColumns : []).map((column, sourceIndex) => {
        const fieldId = String(column && column.fieldId || '').trim();
        const catalogEntry = catalogLookup.get(normalizeText_(fieldId));
        return {
          fieldId,
          source: String(catalogEntry && catalogEntry.source || column && column.sourceRaw || '').trim(),
          label: String(catalogEntry && catalogEntry.label || column && column.label || '').trim(),
          sourceIndex
        };
      });
      if (isArchiveRegistryDataMode_()) return baseColumns;
      const existingFieldIds = new Set(baseColumns.map(column => normalizeText_(column.fieldId)).filter(Boolean));
      const existingLabels = new Set(baseColumns.map(column => normalizeText_(column.label)).filter(Boolean));
      const extraColumns = SUMMARY_EXPORT_EXTRA_COLUMNS
        .filter(column => {
          const fieldId = normalizeText_(column && column.fieldId || '');
          const label = normalizeText_(column && column.label || '');
          if (fieldId && existingFieldIds.has(fieldId)) return false;
          if (label && existingLabels.has(label)) return false;
          return true;
        })
        .map(column => ({
          fieldId: String(column && column.fieldId || '').trim(),
          source: String(column && column.source || '').trim(),
          label: String(column && column.label || '').trim(),
          sourceIndex: -1
        }));
      return baseColumns.concat(extraColumns);
    }

function buildSummaryExportColumns_() {
      return buildSummaryExportColumnsFrom_(state.columns);
    }

function buildSummaryExportMatrixFrom_(rawColumns, rawRows) {
      const columns = buildSummaryExportColumnsFrom_(rawColumns);
      const fieldIdRow = columns.map(column => String(column && column.fieldId || '').trim());
      const sourceRow = columns.map(column => String(column && column.source || '').trim());
      const labelRow = columns.map(column => String(column && column.label || '').trim());
      const dataRows = (Array.isArray(rawRows) ? rawRows : []).map(row => (
        columns.map(column => (
          Number.isFinite(column && column.sourceIndex) && column.sourceIndex >= 0
            ? String(row && row[column.sourceIndex] != null ? row[column.sourceIndex] : '')
            : ''
        ))
      ));
      return [fieldIdRow, sourceRow, labelRow].concat(dataRows);
    }

function buildSummaryExportMatrix_() {
      return buildSummaryExportMatrixFrom_(state.columns, state.rows);
    }

async function loadSummarySyncPayload_() {
      const response = await runServer_('getSmartFilterShellData', [{
        force: true,
        dataset: REGISTRY_DATASET_MODES.registry
      }]);
      const columns = Array.isArray(response && response.columns) ? response.columns : [];
      const rows = Array.isArray(response && response.rows) ? response.rows : [];
      if (!columns.length || !rows.length) {
        throw new Error('Нет данных для синхронизации Google');
      }
      if (response && response.truncated) {
        throw new Error('Сводная загружена не полностью. Уберите ограничение maxRows и повторите.');
      }
      return {
        matrix: buildSummaryExportMatrixFrom_(columns, rows),
        rowCount: rows.length,
        sheetName: String(
          response && response.sheetName ||
          state.runtimeOptions.sheetName ||
          DEFAULT_SHEET_NAME ||
          'Сводная'
        ).trim() || 'Сводная'
      };
    }

function getSupabaseFunctionUrl_(functionName) {
      const baseUrl = String(
        window.SUPABASE_MPRO_CONFIG &&
        window.SUPABASE_MPRO_CONFIG.supabaseUrl ||
        ''
      ).trim().replace(/\/+$/g, '');
      const name = String(functionName || '').trim().replace(/^\/+/g, '');
      if (!baseUrl) throw new Error('Не настроен SUPABASE_URL');
      if (!name) throw new Error('Не указано имя Supabase function');
      return `${baseUrl}/functions/v1/${name}`;
    }

function extractGoogleSyncErrorMessage_(payload, fallbackMessage) {
      const direct = String(payload && (payload.error || payload.message) || '').trim();
      if (direct) return direct;
      const details = payload && typeof payload === 'object'
        ? (payload.details && typeof payload.details === 'object'
          ? payload.details
          : (payload.upstream && typeof payload.upstream === 'object' ? payload.upstream : null))
        : null;
      const nested = String(details && (details.error || details.message) || '').trim();
      return nested || String(fallbackMessage || 'Не удалось обновить Google').trim() || 'Не удалось обновить Google';
    }

async function invokeGoogleSheetSync_(payload) {
      const response = await fetch(getSupabaseFunctionUrl_('google-sheet-sync'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload || {})
      });
      const responseText = await response.text();
      let responsePayload = {};
      try {
        responsePayload = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        responsePayload = { error: responseText || (response.statusText || 'Не удалось обновить Google') };
      }
      if (!response.ok || !responsePayload || responsePayload.ok === false) {
        throw new Error(extractGoogleSyncErrorMessage_(responsePayload, response.statusText || 'Не удалось обновить Google'));
      }
      return responsePayload;
    }

function buildGoogleSyncSuccessMessage_(result) {
      const upstream = result && result.upstream && typeof result.upstream === 'object'
        ? result.upstream
        : {};
      const writtenRows = Number(upstream && upstream.writtenRows || result && result.rowsSent || 0);
      const targetSheetName = String(
        upstream && upstream.sheetName ||
        result && result.sheetName ||
        state.runtimeOptions.sheetName ||
        DEFAULT_SHEET_NAME ||
        'Сводная'
      ).trim() || 'Сводная';
      return writtenRows > 0
        ? `Google обновлен: ${writtenRows} строк -> "${targetSheetName}"`
        : `Google обновлен -> "${targetSheetName}"`;
    }

async function handleSyncGoogleSheetClick_() {
      if (state.googleSyncPending) return;
      if (isArchiveRegistryDataMode_()) {
        showCopyToast_('Архив не синхронизируется обратно в Google', true);
        return;
      }
      if (!state.sessionToken || !state.currentUser) {
        showCopyToast_('Авторизуйтесь для синхронизации Google', true);
        return;
      }
      if (state.loading) {
        showCopyToast_('Дождитесь завершения загрузки данных', false);
        return;
      }
      if (hasPendingObjectEdits_()) {
        showCopyToast_('Сначала сохраните изменения в карточке объекта', true);
        return;
      }
      state.googleSyncPending = true;
      syncGoogleSheetButtonUi_();
      try {
        const summary = await loadSummarySyncPayload_();
        const result = await invokeGoogleSheetSync_({
          sessionToken: state.sessionToken,
          spreadsheetId: state.runtimeOptions.spreadsheetId || DEFAULT_SPREADSHEET_ID,
          sheetName: summary.sheetName,
          fieldIdRow: 1,
          blockRow: 2,
          labelRow: 3,
          dataStartRow: DEFAULT_DATA_START_ROW,
          rows: summary.matrix
        });
        persistGoogleSyncLastAt_(
          String(
            result && result.upstream && result.upstream.updatedAt ||
            result && result.updatedAt ||
            new Date().toISOString()
          ).trim()
        );
        syncGoogleSheetButtonUi_();
        showCopyToast_(buildGoogleSyncSuccessMessage_(result), false);
      } catch (error) {
        writeRuntimeDiagnostic_('error', error, 'Ошибка обратной синхронизации Google');
        showCopyToast_(
          error && error.message ? error.message : 'Не удалось обновить Google',
          true
        );
      } finally {
        state.googleSyncPending = false;
        syncGoogleSheetButtonUi_();
      }
    }

function escapeCsvCell_(value) {
      const text = String(value == null ? '' : value);
      if (!/[",\r\n]/.test(text)) return text;
      return `"${text.replace(/"/g, '""')}"`;
    }

function stringifyCsvRows_(rows) {
      return (Array.isArray(rows) ? rows : [])
        .map(row => (Array.isArray(row) ? row : []).map(escapeCsvCell_).join(','))
        .join('\r\n');
    }

function sanitizeFileNameFragment_(value) {
      const text = String(value == null ? '' : value).trim();
      return (text || 'summary').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
    }

function buildSummaryExportFileName_() {
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const sheetName = sanitizeFileNameFragment_(
        getRegistryDatasetTitle_() ||
        state.meta && state.meta.sheetName ||
        state.runtimeOptions.sheetName ||
        DEFAULT_SHEET_NAME ||
        'Сводная'
      );
      return `${sheetName}_актуальная_${year}-${month}-${day}_${hours}-${minutes}.csv`;
    }

function downloadBlobAsFile_(blob, filename) {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }

function exportSummaryCsv_() {
      if (state.summaryExportPending) return;
      if (!Array.isArray(state.columns) || !state.columns.length || !Array.isArray(state.rows) || !state.rows.length) {
        showCopyToast_('Нет данных для экспорта', true);
        return;
      }
      state.summaryExportPending = true;
      syncExportSummaryButtonUi_();
      try {
        const csvText = stringifyCsvRows_(buildSummaryExportMatrix_());
        const blob = new Blob(['\ufeff', csvText], { type: 'text/csv;charset=utf-8;' });
        downloadBlobAsFile_(blob, buildSummaryExportFileName_());
        showCopyToast_(
          state.truncated
            ? 'CSV выгружен, но данные в приложении были усечены'
            : `CSV выгружен: ${state.rows.length} строк`,
          !!state.truncated
        );
      } catch (error) {
        writeRuntimeDiagnostic_('error', error, 'Ошибка экспорта сводной');
        showCopyToast_('Не удалось выгрузить CSV', true);
      } finally {
        state.summaryExportPending = false;
        syncExportSummaryButtonUi_();
      }
    }

function showCopyToast_(message, isError) {
      const node = el('copyToast');
      if (!node) return;
      node.textContent = String(message || '').trim() || (isError ? 'Не удалось скопировать' : 'Скопировано');
      node.classList.toggle('error', !!isError);
      node.classList.add('show');
      if (copyToastTimer) clearTimeout(copyToastTimer);
      copyToastTimer = setTimeout(() => {
        node.classList.remove('show');
        node.classList.remove('error');
      }, 1400);
    }

function copyTextLegacy_(text) {
      return new Promise((resolve, reject) => {
        const value = String(text == null ? '' : text);
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        textarea.style.left = '-1000px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          const ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (!ok) {
            reject(new Error('copy_failed'));
            return;
          }
          resolve();
        } catch (error) {
          document.body.removeChild(textarea);
          reject(error);
        }
      });
    }

function copyTextToClipboard_(text) {
      const value = String(text == null ? '' : text);
      if (!value.trim()) return Promise.reject(new Error('empty_copy_text'));
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(value).catch(() => copyTextLegacy_(value));
      }
      return copyTextLegacy_(value);
    }

function copyTextFromTrigger_(node) {
      const text = String(node && node.getAttribute('data-copy-text') || '').trim();
      if (!text) return;
      copyTextToClipboard_(text)
        .then(() => showCopyToast_('Скопировано', false))
        .catch(() => showCopyToast_('Не удалось скопировать', true));
    }

function setLoading_(flag) {
      const button = el('btnReload');
      button.disabled = !!flag;
      button.classList.toggle('is-loading', !!flag);
      button.title = flag ? 'Обновление данных...' : 'Обновить данные';
      button.setAttribute('aria-label', button.title);
      syncExportSummaryButtonUi_();
      syncGoogleSheetButtonUi_();
    }

    // ----- Field helpers -----

function shouldUseTextarea_(value) {
      const text = String(value == null ? '' : value);
      return text.length > 90 || /\r?\n/.test(text);
    }

function shouldUseTextareaForField_(label, value) {
      const labelKey = normalizeText_(label || '');
      return (
        shouldUseTextarea_(value) ||
        /проблемные вопросы|проблематика|описание|примеч|комментар|обоснован|вывод/.test(labelKey)
      );
    }

function shouldEnableTextAssist_(label, options) {
      const settings = options || {};
      if (settings.linkKind) return false;
      const text = [label, settings.placeholder]
        .map(value => normalizeText_(value || ''))
        .filter(Boolean)
        .join(' ');
      if (!text) return !!settings.multiline;
      if (/уин|код|телефон|e-?mail|email|почт|сайт|url|инн|кпп|окпо|октмо/.test(text)) return false;
      return true;
    }

function buildTextAssistAttrs_(enabled, multiline) {
      return enabled
        ? ` spellcheck="true" autocorrect="on" autocapitalize="${multiline ? 'sentences' : 'words'}" lang="ru"`
        : ' spellcheck="false" autocorrect="off" autocapitalize="off"';
    }

function shouldUseStackedFieldDisplay_(label, value) {
      const labelKey = normalizeText_(label || '');
      const text = String(value == null ? '' : value).trim();
      return (
        shouldUseTextarea_(value) ||
        text.length > 140 ||
        /проблемные вопросы|факт|состояние|описание|примеч|комментар|обоснован|вывод|контакты/.test(labelKey)
      );
    }

function getFieldLinkKind_(field) {
      const label = normalizeText_(field && field.label || '');
      if (/чек-лист/.test(label)) return 'checklist';
      if (/я\.диск|ядиск/.test(label)) return 'ydisk';
      if (/автослайдер/.test(label)) return 'autoslider';
      return '';
    }

function getFieldLinkActionText_(linkKind) {
      if (linkKind === 'checklist') return 'Открыть чек-лист';
      if (linkKind === 'ydisk' || linkKind === 'autoslider') return 'Открыть';
      return 'Открыть ссылку';
    }

function isHttpUrl_(value) {
      return /^https?:\/\//i.test(String(value == null ? '' : value).trim());
    }

function sectionDomId_(id) {
      return `section_${String(id || '').replace(/[^\w-]+/g, '_')}`;
    }

    // ----- Text helpers -----

function tokenize_(value) {
      const normalized = normalizeText_(value);
      return normalized ? normalized.split(' ').filter(Boolean) : [];
    }

const CP1251_SPECIAL_BYTE_BY_CHAR_ = Object.freeze({
      '\u0402': 0x80,
      '\u0403': 0x81,
      '\u201A': 0x82,
      '\u0453': 0x83,
      '\u201E': 0x84,
      '\u2026': 0x85,
      '\u2020': 0x86,
      '\u2021': 0x87,
      '\u20AC': 0x88,
      '\u2030': 0x89,
      '\u0409': 0x8A,
      '\u2039': 0x8B,
      '\u040A': 0x8C,
      '\u040C': 0x8D,
      '\u040B': 0x8E,
      '\u040F': 0x8F,
      '\u0452': 0x90,
      '\u2018': 0x91,
      '\u2019': 0x92,
      '\u201C': 0x93,
      '\u201D': 0x94,
      '\u2022': 0x95,
      '\u2013': 0x96,
      '\u2014': 0x97,
      '\u2122': 0x99,
      '\u0459': 0x9A,
      '\u203A': 0x9B,
      '\u045A': 0x9C,
      '\u045C': 0x9D,
      '\u045B': 0x9E,
      '\u045F': 0x9F,
      '\u040E': 0xA1,
      '\u045E': 0xA2,
      '\u0408': 0xA3,
      '\u00A4': 0xA4,
      '\u0490': 0xA5,
      '\u00A6': 0xA6,
      '\u00A7': 0xA7,
      '\u0401': 0xA8,
      '\u00A9': 0xA9,
      '\u0404': 0xAA,
      '\u00AB': 0xAB,
      '\u00AC': 0xAC,
      '\u00AD': 0xAD,
      '\u00AE': 0xAE,
      '\u0407': 0xAF,
      '\u00B0': 0xB0,
      '\u00B1': 0xB1,
      '\u0406': 0xB2,
      '\u0456': 0xB3,
      '\u0491': 0xB4,
      '\u00B5': 0xB5,
      '\u00B6': 0xB6,
      '\u00B7': 0xB7,
      '\u0451': 0xB8,
      '\u2116': 0xB9,
      '\u0454': 0xBA,
      '\u00BB': 0xBB,
      '\u0458': 0xBC,
      '\u0405': 0xBD,
      '\u0455': 0xBE,
      '\u0457': 0xBF
    });

function countMatches_(value, pattern) {
      const text = String(value == null ? '' : value);
      const matches = text.match(pattern);
      return matches ? matches.length : 0;
    }

function looksLikeBrokenEncoding_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return false;
      const cyrillicCount = countMatches_(text, /[А-Яа-яЁё]/g);
      if (!cyrillicCount) return false;
      const suspiciousLetterCount = countMatches_(text, /[РС]/g);
      const suspiciousCharCount = countMatches_(text, /[\u0402\u0403\u0453\u0409\u040A\u040B\u040F\u0452\u0459\u045A\u045B\u045C\u045F\u040E\u045E\u0408\u0490\u0404\u0407\u0406\u0456\u0491\u0454\u0458\u0405\u0455\u0457\u201A\u201E\u2026\u2020\u2021\u20AC\u2030\u2039\u203A\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u2122]/g);
      return suspiciousCharCount > 0 || (cyrillicCount >= 6 && suspiciousLetterCount / cyrillicCount >= 0.34);
    }

function cp1251ByteForChar_(char) {
      const code = String(char || '').charCodeAt(0);
      if (!Number.isFinite(code)) return -1;
      if (code <= 0x7F) return code;
      if (code >= 0x0410 && code <= 0x044F) return code - 0x350;
      if (code === 0x0401) return 0xA8;
      if (code === 0x0451) return 0xB8;
      if (Object.prototype.hasOwnProperty.call(CP1251_SPECIAL_BYTE_BY_CHAR_, char)) {
        return CP1251_SPECIAL_BYTE_BY_CHAR_[char];
      }
      return -1;
    }

function tryRepairCp1251Utf8Mojibake_(value) {
      const text = String(value == null ? '' : value);
      if (!looksLikeBrokenEncoding_(text) || typeof TextDecoder !== 'function') return text;
      const bytes = [];
      for (const char of text) {
        const byte = cp1251ByteForChar_(char);
        if (!Number.isFinite(byte) || byte < 0) return text;
        bytes.push(byte);
      }
      try {
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)).trim();
        return decoded || text;
      } catch (error) {
        return text;
      }
    }

function repairDisplayEncoding_(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '';
      const repaired = tryRepairCp1251Utf8Mojibake_(text);
      if (!repaired || repaired === text) return text;
      if (!looksLikeBrokenEncoding_(repaired)) return repaired;
      return text;
    }

function getSourceCatalogLookup_() {
      if (getSourceCatalogLookup_._cache instanceof Map) return getSourceCatalogLookup_._cache;
      const catalog = window.MPRO_SOURCE_CATALOG && typeof window.MPRO_SOURCE_CATALOG === 'object'
        ? window.MPRO_SOURCE_CATALOG
        : {};
      const map = new Map();
      Object.keys(catalog).forEach(sourceKey => {
        const entries = Array.isArray(catalog[sourceKey]) ? catalog[sourceKey] : [];
        entries.forEach(entry => {
          const fieldId = normalizeText_(entry && entry.fieldId || '');
          if (!fieldId || map.has(fieldId)) return;
          map.set(fieldId, {
            source: repairDisplayEncoding_(String(entry && entry.source || '').trim()),
            label: repairDisplayEncoding_(String(entry && entry.label || '').trim())
          });
        });
      });
      getSourceCatalogLookup_._cache = map;
      return map;
    }

function normalizeText_(value) {
      return String(value == null ? '' : value).replace(/\u00A0/g, ' ').replace(/ё/g, 'е').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    }

function normalizeInlineDisplayText_(value) {
      return String(value == null ? '' : value)
        .replace(/\r?\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

function escapeHtml_(value) {
      return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

function escapeHtmlWithBreaks_(value) {
      return escapeHtml_(value).replace(/\r?\n/g, '<br>');
    }

function debounce_(fn, waitMs) {
      let timer = null;
      return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), Number(waitMs) || 0);
      };
    }

function el(id) {
      return document.getElementById(id);
    }


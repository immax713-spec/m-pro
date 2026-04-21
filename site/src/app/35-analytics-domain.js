// ===== Analytics Domain (lazy) =====

function parseDelimitedText_(rawText, delimiter) {
      const text = String(rawText || '');
      const cellDelimiter = String(delimiter || ',').charAt(0) || ',';
      const rows = [];
      let row = [];
      let value = '';
      let inQuotes = false;
      for (let index = 0; index < text.length; index++) {
        const char = text[index];
        if (char === '"') {
          if (inQuotes && text[index + 1] === '"') {
            value += '"';
            index++;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }
        if (char === cellDelimiter && !inQuotes) {
          row.push(value);
          value = '';
          continue;
        }
        if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && text[index + 1] === '\n') index++;
          row.push(value);
          rows.push(row);
          row = [];
          value = '';
          continue;
        }
        value += char;
      }
      if (value || row.length) {
        row.push(value);
        rows.push(row);
      }
      return rows;
    }

function normalizeAnalyticsHeaderKey_(value) {
      return normalizeText_(String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim());
    }

function normalizeAnalyticsCsvCell_(value) {
      return String(value == null ? '' : value).replace(/^\uFEFF/, '').trim();
    }

function parseAnalyticsWorkControlDateValue_(value) {
      const text = normalizeAnalyticsCsvCell_(value);
      if (!text) return '';
      let match = /^(\d{2})[.\-/](\d{2})[.\-/](\d{4})$/.exec(text);
      if (match) return `${match[3]}-${match[2]}-${match[1]}`;
      match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
      const parsed = parseMonitoringDateValue_(text);
      if (parsed && parsed.date instanceof Date) return formatLocalDateInputValue_(parsed.date);
      return '';
    }

const ANALYTICS_CONTROL_FULL_WORKDAY_MINUTES = 540;

function isAnalyticsControlAverageWorkMinutesValue_(value) {
      return Number.isFinite(Number(value))
        && Number(value) >= ANALYTICS_CONTROL_FULL_WORKDAY_MINUTES;
    }

function collectAnalyticsControlAverageWorkMinutes_(items) {
      return (Array.isArray(items) ? items : [])
        .map(item => Number(item && item.workMinutes))
        .filter(isAnalyticsControlAverageWorkMinutesValue_);
    }

function parseAnalyticsIntegerValue_(value) {
      const text = normalizeAnalyticsCsvCell_(value);
      if (!text) return NaN;
      const numeric = Number(String(text).replace(',', '.'));
      return Number.isFinite(numeric) ? Math.round(numeric) : NaN;
    }

function parseAnalyticsSkudBool_(value) {
      const text = normalizeText_(value);
      return text === '1' || text === 'true' || text === 'да' || text === 'yes';
    }

function normalizeAnalyticsSkudInspectorName_(value) {
      return String(value == null ? '' : value)
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*\([^)]*\)\s*$/g, '')
        .trim();
    }

function normalizeAnalyticsInspectorKey_(value) {
      return String(value == null ? '' : value)
        .trim()
        .toLowerCase()
        .replace(/[ёЁ]/g, 'е')
        .replace(/\s+/g, ' ');
    }

function buildAnalyticsSkudUploadRows_(rawText) {
      const rows = parseDelimitedText_(String(rawText || '').replace(/^\uFEFF/, ''), ';');
      const headerIndex = rows.findIndex(row => {
        const cells = Array.isArray(row) ? row : [];
        return normalizeAnalyticsHeaderKey_(cells[0]) === 'фио'
          && normalizeAnalyticsHeaderKey_(cells[1]) === 'подразделение'
          && normalizeAnalyticsHeaderKey_(cells[2]) === 'дата';
      });
      if (headerIndex < 0) {
        throw new Error('Не удалось найти заголовок СКУД CSV.');
      }
      const headers = (Array.isArray(rows[headerIndex]) ? rows[headerIndex] : []).map(cell => String(cell == null ? '' : cell));
      const columnIndexByKey = new Map();
      headers.forEach((header, index) => {
        const key = normalizeAnalyticsHeaderKey_(header);
        if (key) columnIndexByKey.set(key, index);
      });
      const getValue = (row, key) => {
        const index = columnIndexByKey.get(key);
        return index === undefined ? '' : normalizeAnalyticsCsvCell_(row[index]);
      };
      const getFirstValue = (row, keys) => {
        for (let index = 0; index < keys.length; index += 1) {
          const value = getValue(row, keys[index]);
          if (value) return value;
        }
        return '';
      };
      return rows
        .slice(headerIndex + 1)
        .filter(row => Array.isArray(row) && row.some(cell => normalizeAnalyticsCsvCell_(cell)))
        .map(row => {
          const inspectorNameRaw = getValue(row, 'фио');
          const inspectorNameClean = normalizeAnalyticsSkudInspectorName_(inspectorNameRaw);
          const workDate = parseAnalyticsWorkControlDateValue_(getValue(row, 'дата'));
          if (!inspectorNameClean || !workDate) return null;
          const arrivalTime = getFirstValue(row, ['время прихода', 'приход в офис acs']);
          const departureTime = getFirstValue(row, ['время ухода', 'возврат в офис acs']);
          const totalMinutes = parseAnalyticsIntegerValue_(getFirstValue(row, ['итого_дня_мин', 'итого дня мин']));
          const absenceReason = getValue(row, 'причина отсутствия');
          const divisionName = getValue(row, 'подразделение');
          const isRegistryInspector = parseAnalyticsSkudBool_(getFirstValue(row, ['реестр_инспектор', 'реестр инспектор']));
          const isSkInspector = parseAnalyticsSkudBool_(getFirstValue(row, ['ск_инспектор', 'ск инспектор']));
          const rawRow = {};
          headers.forEach((header, index) => {
            const normalizedHeader = normalizeAnalyticsCsvCell_(header);
            if (!normalizedHeader) return;
            rawRow[normalizedHeader] = normalizeAnalyticsCsvCell_(row[index]);
          });
          return {
            work_date: workDate,
            inspector_name: inspectorNameRaw,
            inspector_name_clean: inspectorNameClean,
            division_name: divisionName,
            arrival_time: arrivalTime,
            departure_time: departureTime,
            total_minutes: Number.isFinite(totalMinutes) ? totalMinutes : null,
            absence_reason: absenceReason,
            is_registry_inspector: isRegistryInspector,
            is_sk_inspector: isSkInspector,
            raw_row: rawRow
          };
        })
        .filter(Boolean);
    }

function buildAnalyticsWorkControlDashboardFromRows_(dailyRows, options) {
      const settings = options && typeof options === 'object' ? options : {};
      const dashboard = buildEmptyAnalyticsWorkControlDashboard_();
      const items = Array.isArray(dailyRows) ? dailyRows.filter(Boolean) : [];
      if (!items.length && !settings.allowEmpty) {
        dashboard.errorText = String(settings.errorText || 'Нет строк для контроля работы.');
        return dashboard;
      }
      const divisionsMap = new Map();
      const inspectorsMap = new Map();

      items.forEach(item => {
        const divisionKey = normalizeText_(item.division);
        const divisionBucket = divisionsMap.get(divisionKey) || {
          division: item.division,
          monitorings: 0,
          violations: 0,
          inspectors: new Set()
        };
        divisionBucket.monitorings += item.monitorings;
        if (item.hasViolation) divisionBucket.violations += 1;
        divisionBucket.inspectors.add(item.inspectorKey);
        divisionsMap.set(divisionKey, divisionBucket);

        const inspectorBucket = inspectorsMap.get(item.inspectorKey) || {
          inspector: item.inspector,
          inspectorKey: item.inspectorKey,
          division: item.division,
          monitorings: 0,
          violations: 0,
          workMinutesTotal: 0,
          workMinutesCount: 0,
          dailyRows: []
        };
        inspectorBucket.monitorings += item.monitorings;
        if (item.hasViolation) inspectorBucket.violations += 1;
        if (isAnalyticsControlAverageWorkMinutesValue_(item.workMinutes)) {
          inspectorBucket.workMinutesTotal += item.workMinutes;
          inspectorBucket.workMinutesCount += 1;
        }
        inspectorBucket.dailyRows.push(item);
        inspectorsMap.set(item.inspectorKey, inspectorBucket);
      });

      const divisions = Array.from(divisionsMap.values())
        .map(item => ({
          division: item.division,
          monitorings: item.monitorings,
          violations: item.violations,
          inspectorCount: item.inspectors.size
        }))
        .sort((left, right) => {
          const violationsDelta = Number(right.violations || 0) - Number(left.violations || 0);
          if (violationsDelta) return violationsDelta;
          const monitoringsDelta = Number(right.monitorings || 0) - Number(left.monitorings || 0);
          if (monitoringsDelta) return monitoringsDelta;
          return normalizeText_(left.division).localeCompare(normalizeText_(right.division), 'ru');
        });

      const inspectors = Array.from(inspectorsMap.values())
        .map(item => ({
          inspector: item.inspector,
          inspectorKey: item.inspectorKey,
          division: item.division,
          monitorings: item.monitorings,
          violations: item.violations,
          averageWorkMinutes: item.workMinutesCount > 0 ? item.workMinutesTotal / item.workMinutesCount : NaN,
          dailyRows: item.dailyRows.sort((left, right) => String(right.date || '').localeCompare(String(left.date || ''), 'ru'))
        }))
        .sort((left, right) => {
          const violationsDelta = Number(right.violations || 0) - Number(left.violations || 0);
          if (violationsDelta) return violationsDelta;
          const monitoringsDelta = Number(right.monitorings || 0) - Number(left.monitorings || 0);
          if (monitoringsDelta) return monitoringsDelta;
          return normalizeText_(left.inspector).localeCompare(normalizeText_(right.inspector), 'ru');
        });

      const activeDivision = normalizeText_(state.analyticsControlDivision || '');
      const filteredInspectors = activeDivision
        ? inspectors.filter(item => normalizeText_(item.division) === activeDivision)
        : inspectors.slice();
      const selectedInspectorKey = normalizeAnalyticsInspectorKey_(state.analyticsControlSelectedInspector || '');
      const selectedInspectorRecord = filteredInspectors.find(item => item.inspectorKey === selectedInspectorKey) || null;
      const filteredDailyRows = filteredInspectors.reduce((out, inspector) => out.concat(Array.isArray(inspector.dailyRows) ? inspector.dailyRows : []), []);
      const filteredWorkMinutes = collectAnalyticsControlAverageWorkMinutes_(filteredDailyRows);
      const workMinutesValues = collectAnalyticsControlAverageWorkMinutes_(items);

      dashboard.available = true;
      dashboard.errorText = String(settings.errorText || '').trim();
      dashboard.sourceLabel = String(settings.sourceLabel || 'База данных').trim() || 'База данных';
      dashboard.periodFrom = normalizeAnalyticsArchiveDateValue_(settings.periodFrom);
      dashboard.periodTo = normalizeAnalyticsArchiveDateValue_(settings.periodTo);
      dashboard.skudStatus = settings.skudStatus && typeof settings.skudStatus === 'object'
        ? {
            status: String(settings.skudStatus.status || '').trim() || 'missing',
            label: String(settings.skudStatus.label || '').trim() || 'Отсутствует СКУД',
            expectedDays: Math.max(0, Number(settings.skudStatus.expectedDays) || 0),
            loadedDays: Math.max(0, Number(settings.skudStatus.loadedDays) || 0),
            loadedDates: Array.isArray(settings.skudStatus.loadedDates) ? settings.skudStatus.loadedDates.slice() : [],
            missingDates: Array.isArray(settings.skudStatus.missingDates) ? settings.skudStatus.missingDates.slice() : [],
            latestImport: settings.skudStatus.latestImport && typeof settings.skudStatus.latestImport === 'object'
              ? { ...settings.skudStatus.latestImport }
              : {}
          }
        : dashboard.skudStatus;
      dashboard.totalMonitorings = inspectors.reduce((sum, item) => sum + Math.max(0, Number(item.monitorings) || 0), 0);
      dashboard.totalInspectors = inspectors.length;
      dashboard.totalViolations = inspectors.reduce((sum, item) => sum + Math.max(0, Number(item.violations) || 0), 0);
      dashboard.averageWorkMinutes = workMinutesValues.length
        ? workMinutesValues.reduce((sum, value) => sum + value, 0) / workMinutesValues.length
        : 0;
      dashboard.displayMonitorings = filteredInspectors.reduce((sum, item) => sum + Math.max(0, Number(item.monitorings) || 0), 0);
      dashboard.displayInspectors = filteredInspectors.length;
      dashboard.displayViolations = filteredInspectors.reduce((sum, item) => sum + Math.max(0, Number(item.violations) || 0), 0);
      dashboard.displayAverageWorkMinutes = filteredWorkMinutes.length
        ? filteredWorkMinutes.reduce((sum, value) => sum + value, 0) / filteredWorkMinutes.length
        : 0;
      dashboard.inspectors = inspectors;
      dashboard.filteredInspectors = filteredInspectors;
      dashboard.divisions = divisions;
      dashboard.divisionOptions = divisions.map(item => ({
        value: item.division,
        label: item.division,
        count: item.inspectorCount
      }));
      dashboard.activeDivision = activeDivision;
      dashboard.selectedInspector = selectedInspectorRecord ? selectedInspectorRecord.inspectorKey : '';
      dashboard.selectedInspectorRecord = selectedInspectorRecord;
      return dashboard;
    }

function normalizeAnalyticsWorkControlDbDailyRow_(row) {
      const item = row && typeof row === 'object' ? row : {};
      const inspector = String(item.inspector || '').trim();
      const inspectorKey = normalizeAnalyticsInspectorKey_(item.inspectorKey || inspector);
      const commentText = String(item.commentText || '—').trim() || '—';
      return {
        date: normalizeAnalyticsArchiveDateValue_(item.date),
        dateDisplay: String(item.dateDisplay || item.date || '').trim(),
        inspector,
        inspectorKey,
        division: String(item.division || 'Не указано').trim() || 'Не указано',
        status: 'present',
        monitorings: Math.max(0, Number(item.monitorings) || 0),
        openingText: String(item.openingText || '—').trim() || '—',
        closingText: String(item.closingText || '—').trim() || '—',
        workMinutes: Number.isFinite(Number(item.workMinutes)) ? Number(item.workMinutes) : NaN,
        workdayPresent: !!item.workdayPresent,
        workdaySource: String(item.workdaySource || '').trim(),
        skudLabel: String(item.skudLabel || 'Нет данных').trim() || 'Нет данных',
        fromOfficeMinutes: Number.isFinite(Number(item.fromOfficeMinutes)) ? Number(item.fromOfficeMinutes) : NaN,
        toOfficeMinutes: Number.isFinite(Number(item.toOfficeMinutes)) ? Number(item.toOfficeMinutes) : NaN,
        hasViolation: !!item.hasViolation,
        commentText,
        commentParts: commentText === '—'
          ? []
          : commentText.split('·').map(part => String(part || '').trim()).filter(Boolean)
      };
    }

function buildAnalyticsWorkControlDashboardFromDb_(payload) {
      const data = payload && typeof payload === 'object' ? payload : {};
      const rows = (Array.isArray(data.dailyRows) ? data.dailyRows : [])
        .map(normalizeAnalyticsWorkControlDbDailyRow_)
        .filter(item => item.inspectorKey && item.date);
      return buildAnalyticsWorkControlDashboardFromRows_(rows, {
        allowEmpty: true,
        sourceLabel: 'База данных',
        periodFrom: data.periodFrom,
        periodTo: data.periodTo,
        skudStatus: data.skudStatus && typeof data.skudStatus === 'object' ? data.skudStatus : {}
      });
    }

function getAnalyticsWorkControlViewModel_(dashboard) {
      const base = dashboard && typeof dashboard === 'object'
        ? dashboard
        : buildEmptyAnalyticsWorkControlDashboard_();
      const inspectors = Array.isArray(base.inspectors) ? base.inspectors : [];
      const divisions = Array.isArray(base.divisions) ? base.divisions : [];
      const activeDivisionKey = normalizeText_(state.analyticsControlDivision || '');
      const activeDivisionRecord = activeDivisionKey
        ? divisions.find(item => normalizeText_(item && item.division) === activeDivisionKey)
        : null;
      const filteredInspectors = activeDivisionKey
        ? inspectors.filter(item => normalizeText_(item && item.division) === activeDivisionKey)
        : inspectors.slice();
      const filteredDailyRows = filteredInspectors.reduce((items, inspector) => items.concat(Array.isArray(inspector && inspector.dailyRows) ? inspector.dailyRows : []), []);
      const selectedInspectorKey = normalizeAnalyticsInspectorKey_(state.analyticsControlSelectedInspector || '');
      const selectedInspectorRecord = filteredInspectors.find(item => normalizeText_(item && item.inspectorKey) === selectedInspectorKey) || null;
      const filteredWorkMinutes = collectAnalyticsControlAverageWorkMinutes_(filteredDailyRows);
      return {
        ...base,
        filteredInspectors,
        activeDivision: activeDivisionRecord ? String(activeDivisionRecord.division || '').trim() : '',
        selectedInspector: selectedInspectorRecord ? selectedInspectorRecord.inspectorKey : '',
        selectedInspectorRecord,
        displayMonitorings: filteredInspectors.reduce((sum, item) => sum + Math.max(0, Number(item && item.monitorings) || 0), 0),
        displayInspectors: filteredInspectors.length,
        displayViolations: filteredInspectors.reduce((sum, item) => sum + Math.max(0, Number(item && item.violations) || 0), 0),
        displayAverageWorkMinutes: filteredWorkMinutes.length
          ? filteredWorkMinutes.reduce((sum, value) => sum + value, 0) / filteredWorkMinutes.length
          : 0
      };
    }

function hasAnalyticsCellValue_(value) {
      return !!String(value == null ? '' : value).trim();
    }

function buildAnalyticsArchiveSuccessTimelineByKey_(archivePayload) {
      const rows = Array.isArray(archivePayload && archivePayload.rows) ? archivePayload.rows : [];
      const map = new Map();
      rows.forEach(item => {
        const status = normalizeMonitoringVisitStatus_(item && item.visitStatus);
        const monitoringTime = getMonitoringDateTimestamp_(item && item.monitoringDate);
        if (status === 'denied_access' || !Number.isFinite(monitoringTime)) return;
        const keys = [
          normalizeText_(item && item.uin),
          normalizeText_(item && item.objectId)
        ].filter(Boolean);
        Array.from(new Set(keys)).forEach(key => {
          const bucket = map.get(key);
          if (bucket) {
            bucket.push(monitoringTime);
          } else {
            map.set(key, [monitoringTime]);
          }
        });
      });
      map.forEach((times, key) => {
        const uniqueTimes = Array.from(new Set((Array.isArray(times) ? times : []).filter(Number.isFinite))).sort((a, b) => a - b);
        map.set(key, uniqueTimes);
      });
      return map;
    }

function findAnalyticsSuccessTimeNotLaterThanByKeys_(timelineByKey, keys, maxTime) {
      const map = timelineByKey instanceof Map ? timelineByKey : new Map();
      const deadlineTime = Number.isFinite(maxTime) ? Number(maxTime) : NaN;
      let found = NaN;
      Array.from(new Set(Array.isArray(keys) ? keys.filter(Boolean) : [])).forEach(key => {
        const times = Array.isArray(map.get(key)) ? map.get(key) : [];
        for (let index = 0; index < times.length; index++) {
          const time = Number(times[index]);
          if (!Number.isFinite(time)) continue;
          if (Number.isFinite(deadlineTime) && time > deadlineTime) break;
          if (!Number.isFinite(found) || time < found) found = time;
          break;
        }
      });
      return found;
    }

function buildAnalyticsStartSmrQuarter_(archivePayload, options) {
      const quarter = buildEmptyAnalyticsStartSmrQuarter_(options);
      const rangeFromTime = getMonitoringDateTimestamp_(quarter.rangeFrom);
      const rangeToTime = getMonitoringDateTimestamp_(quarter.rangeTo);
      if (!Number.isFinite(rangeFromTime) || !Number.isFinite(rangeToTime)) return quarter;

      const quarterEndTime = rangeToTime + 86400000 - 1;
      const today = startOfLocalDay_(new Date()).getTime();
      const timelineByKey = buildAnalyticsArchiveSuccessTimelineByKey_(archivePayload);
      const seenObjects = new Set();
      const windowMs = Math.max(1, Number(quarter.responseDays) || 7) * 86400000;

      (Array.isArray(state.rows) ? state.rows : []).forEach((row, rowIndex) => {
        if (!Array.isArray(row)) return;
        const summary = getRegistryRowSummary_(rowIndex);
        const startTime = getMonitoringDateTimestamp_(summary && summary.startSmrDate);
        if (!Number.isFinite(startTime) || startTime < rangeFromTime || startTime > quarterEndTime) return;

        const objectKeys = [
          normalizeText_(summary && summary.uin),
          normalizeText_(summary && summary.objectId)
        ].filter(Boolean);
        const dedupeKey = objectKeys[0] || objectKeys[1] || `row:${rowIndex}`;
        if (seenObjects.has(dedupeKey)) return;
        seenObjects.add(dedupeKey);

        quarter.total += 1;
        quarter.rowIndexes.push(rowIndex);
        if (startTime > today) {
          quarter.upcoming += 1;
          quarter.upcomingRowIndexes.push(rowIndex);
          return;
        }

        quarter.elapsed += 1;
        const deadlineTime = startTime + windowMs - 86400000;
        const successInWindowTime = findAnalyticsSuccessTimeNotLaterThanByKeys_(timelineByKey, objectKeys, deadlineTime);
        if (Number.isFinite(successInWindowTime)) {
          quarter.onTime += 1;
          quarter.onTimeRowIndexes.push(rowIndex);
          return;
        }
        if (today > deadlineTime) {
          quarter.late += 1;
          quarter.lateRowIndexes.push(rowIndex);
          return;
        }
        quarter.inWindow += 1;
        quarter.inWindowRowIndexes.push(rowIndex);
      });

      return quarter;
    }

function buildAnalyticsStaticQuarterTrack_(definition) {
      const item = definition || {};
      const plan = Math.max(0, Number(item.plan) || 0);
      const fact = Math.max(0, Number(item.fact) || 0);
      const percent = plan > 0 ? (fact / plan) * 100 : 0;
      return {
        key: String(item.key || '').trim(),
        title: String(item.title || 'Направление').trim() || 'Направление',
        note: String(item.note || '').trim(),
        plan,
        fact,
        percent,
        progressPercent: Math.max(0, Math.min(percent, 100)),
        overPlanCount: Math.max(0, fact - plan),
        planRowIndexes: [],
        factRowIndexes: [],
        ratioLabel: 'Факт'
      };
    }

function buildAnalyticsStaticQuarterDashboard_(baseDashboard, config, options) {
      const dashboard = baseDashboard && typeof baseDashboard === 'object'
        ? baseDashboard
        : buildEmptyAnalyticsDashboard_();
      const normalizedConfig = config && typeof config === 'object' ? config : {};
      const settings = options && typeof options === 'object' ? options : {};
      const tracks = Array.isArray(normalizedConfig.tracks) ? normalizedConfig.tracks.map(buildAnalyticsStaticQuarterTrack_) : [];
      const overallPlan = Math.max(0, Number(normalizedConfig && normalizedConfig.overall && normalizedConfig.overall.plan) || 0);
      const overallFact = Math.max(0, Number(normalizedConfig && normalizedConfig.overall && normalizedConfig.overall.fact) || 0);
      const startSmrFallback = buildEmptyAnalyticsStartSmrQuarter_({
        rangeFrom: String(settings.rangeFrom || '').trim(),
        rangeTo: String(settings.rangeTo || '').trim()
      });
      return {
        tracks,
        trackedRows: overallPlan,
        overallUniquePlan: overallPlan,
        overallUniqueFact: overallFact,
        overallUniquePercent: overallPlan > 0 ? (overallFact / overallPlan) * 100 : 0,
        overallPlanRowIndexes: [],
        overallFactRowIndexes: [],
        startSmrQuarter: dashboard[String(settings.startSmrKey || 'startSmrQuarter')] || startSmrFallback,
        startSmrQuarterQ1: dashboard.startSmrQuarterQ1 || buildEmptyAnalyticsStartSmrQuarter_({
          rangeFrom: ANALYTICS_Q1_START_SMR_RANGE_FROM,
          rangeTo: ANALYTICS_Q1_START_SMR_RANGE_TO
        }),
        archiveFetchedAt: String(dashboard.archiveFetchedAt || '').trim(),
        computedAt: String(dashboard.computedAt || '').trim()
      };
    }

function buildAnalyticsQuarterOneDashboard_(baseDashboard) {
      return buildAnalyticsStaticQuarterDashboard_(baseDashboard, ANALYTICS_Q1_DASHBOARD_DEF, {
        startSmrKey: 'startSmrQuarterQ1',
        rangeFrom: ANALYTICS_Q1_START_SMR_RANGE_FROM,
        rangeTo: ANALYTICS_Q1_START_SMR_RANGE_TO
      });
    }

function buildAnalyticsQuarterTwoDashboard_(baseDashboard) {
      return buildAnalyticsStaticQuarterDashboard_(baseDashboard, ANALYTICS_Q2_DASHBOARD_DEF, {
        startSmrKey: 'startSmrQuarter',
        rangeFrom: ANALYTICS_START_SMR_RANGE_FROM,
        rangeTo: ANALYTICS_START_SMR_RANGE_TO
      });
    }

function buildEmptyAnalyticsKsgDashboard_() {
      return {
        totalObjects: 0,
        totalPlan: 0,
        onTime: 0,
        late: 0,
        missingPast: 0,
        upcoming: 0,
        withoutPlan: 0,
        okPercent: 0,
        contractorOptions: [],
        activeContractors: [],
        grbsOptions: [],
        activeGrbs: [],
        activeDateFrom: '',
        activeDateTo: '',
        totalObjectRowIndexes: [],
        totalPlanRowIndexes: [],
        onTimeRowIndexes: [],
        lateRowIndexes: [],
        missingPastRowIndexes: [],
        upcomingRowIndexes: [],
        withoutPlanRowIndexes: [],
        stages: [],
        problems: []
      };
    }

function getAnalyticsFieldValueById_(rowIndex, fieldId) {
      const column = findColumnByFieldId_(fieldId);
      return column ? getCellValue_(rowIndex, column.index) : '';
    }

function getAnalyticsKsgProblemSortWeight_(item) {
      const problem = item || {};
      const status = String(problem.status || '').trim();
      if (status === 'missing') return 3;
      if (status === 'late') return 2;
      if (status === 'without-plan') return 1;
      return 0;
    }

function normalizeAnalyticsKsgDateRange_() {
      let dateFrom = normalizeAnalyticsArchiveDateValue_(state.analyticsKsgDateFrom);
      let dateTo = normalizeAnalyticsArchiveDateValue_(state.analyticsKsgDateTo);
      if (dateFrom && dateTo && dateFrom > dateTo) {
        const swap = dateFrom;
        dateFrom = dateTo;
        dateTo = swap;
        state.analyticsKsgDateFrom = dateFrom;
        state.analyticsKsgDateTo = dateTo;
      }
      return { dateFrom, dateTo };
    }

function isAnalyticsKsgTimestampInRange_(timestamp, dateFrom, dateTo) {
      const time = Number(timestamp);
      if (!Number.isFinite(time)) return false;
      const minTime = dateFrom ? getMonitoringDateTimestamp_(dateFrom) : NaN;
      const maxBaseTime = dateTo ? getMonitoringDateTimestamp_(dateTo) : NaN;
      const maxTime = Number.isFinite(maxBaseTime) ? maxBaseTime + 86399999 : NaN;
      if (Number.isFinite(minTime) && time < minTime) return false;
      if (Number.isFinite(maxTime) && time > maxTime) return false;
      return true;
    }

function isAnalyticsKsgEntryInDateRange_(planTime, factTime, dateFrom, dateTo) {
      if (!dateFrom && !dateTo) return true;
      return (
        isAnalyticsKsgTimestampInRange_(planTime, dateFrom, dateTo)
        || isAnalyticsKsgTimestampInRange_(factTime, dateFrom, dateTo)
      );
    }

function isAnalyticsKsgRowInDateRange_(rowIndex, dateFrom, dateTo) {
      if (!dateFrom && !dateTo) return true;
      return ANALYTICS_KSG_PAIR_DEFS.some(def => {
        const planText = String(getAnalyticsFieldValueById_(rowIndex, def.planFieldId) || '').trim();
        const factText = String(getAnalyticsFieldValueById_(rowIndex, def.factFieldId) || '').trim();
        return isAnalyticsKsgEntryInDateRange_(
          getMonitoringDateTimestamp_(planText),
          getMonitoringDateTimestamp_(factText),
          dateFrom,
          dateTo
        );
      });
    }

function buildAnalyticsKsgDashboard_() {
      const dashboard = buildEmptyAnalyticsKsgDashboard_();
      const todayTime = startOfLocalDay_(new Date()).getTime();
      const rows = Array.isArray(state.rows) ? state.rows : [];
      const contractorCounts = new Map();
      const selectedContractors = normalizeAnalyticsKsgContractorFilters_(state.analyticsKsgContractors);
      const grbsCounts = new Map();
      const selectedGrbs = normalizeAnalyticsKsgGrbsFilters_(state.analyticsKsgGrbs);

      rows.forEach((row, rowIndex) => {
        if (!Array.isArray(row)) return;
        const hasKsgData = ANALYTICS_KSG_PAIR_DEFS.some(def => {
          const planText = String(getAnalyticsFieldValueById_(rowIndex, def.planFieldId) || '').trim();
          const factText = String(getAnalyticsFieldValueById_(rowIndex, def.factFieldId) || '').trim();
          return Number.isFinite(getMonitoringDateTimestamp_(planText)) || Number.isFinite(getMonitoringDateTimestamp_(factText));
        });
        if (!hasKsgData) return;
        const summary = getRegistryRowSummary_(rowIndex) || {};
        const contractorLabel = String(summary.contractor || '').trim() || 'Не указан';
        contractorCounts.set(contractorLabel, (contractorCounts.get(contractorLabel) || 0) + 1);
      });

      dashboard.contractorOptions = Array.from(contractorCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => normalizeText_(String(left && left.label || '')).localeCompare(normalizeText_(String(right && right.label || '')), 'ru'));
      dashboard.activeContractors = dashboard.contractorOptions
        .map(option => String(option && option.label || '').trim())
        .filter(label => selectedContractors.includes(label));
      const activeContractorSet = new Set(dashboard.activeContractors.map(label => normalizeText_(label)));
      const hasActiveContractorFilter = activeContractorSet.size > 0;

      dashboard.stages = ANALYTICS_KSG_PAIR_DEFS.map(def => {
        const stage = {
          key: String(def && def.key || '').trim(),
          title: String(def && def.title || '').trim() || 'КСГ',
          totalPlan: 0,
          onTime: 0,
          late: 0,
          missingPast: 0,
          upcoming: 0,
          withoutPlan: 0,
          resolved: 0,
          okPercent: 0,
          totalPlanRowIndexes: [],
          onTimeRowIndexes: [],
          lateRowIndexes: [],
          missingPastRowIndexes: [],
          upcomingRowIndexes: [],
          withoutPlanRowIndexes: []
        };

        rows.forEach((row, rowIndex) => {
          if (!Array.isArray(row)) return;
          const summary = getRegistryRowSummary_(rowIndex) || {};
          const contractorLabel = String(summary.contractor || '').trim() || 'Не указан';
          if (hasActiveContractorFilter && !activeContractorSet.has(normalizeText_(contractorLabel))) return;
          const planText = String(getAnalyticsFieldValueById_(rowIndex, def.planFieldId) || '').trim();
          const factText = String(getAnalyticsFieldValueById_(rowIndex, def.factFieldId) || '').trim();
          const planTime = getMonitoringDateTimestamp_(planText);
          const factTime = getMonitoringDateTimestamp_(factText);
          const hasPlan = Number.isFinite(planTime);
          const hasFact = Number.isFinite(factTime);

          if (!hasPlan && !hasFact) return;
          const problemBase = {
            stageKey: stage.key,
            stageTitle: stage.title,
            uin: String(summary.uin || '').trim(),
            objectName: String(summary.name || '').trim(),
            planText,
            factText
          };

          if (!hasPlan && hasFact) {
            stage.withoutPlan += 1;
            dashboard.withoutPlan += 1;
            stage.withoutPlanRowIndexes.push(rowIndex);
            dashboard.withoutPlanRowIndexes.push(rowIndex);
            dashboard.problems.push({
              ...problemBase,
              rowIndex,
              status: 'without-plan',
              statusLabel: 'Без плана',
              deltaDays: NaN
            });
            return;
          }

          stage.totalPlan += 1;
          dashboard.totalPlan += 1;
          stage.totalPlanRowIndexes.push(rowIndex);
          dashboard.totalPlanRowIndexes.push(rowIndex);

          if (hasFact) {
            const deltaDays = Math.round((factTime - planTime) / 86400000);
            if (factTime <= planTime) {
              stage.onTime += 1;
              dashboard.onTime += 1;
              stage.onTimeRowIndexes.push(rowIndex);
              dashboard.onTimeRowIndexes.push(rowIndex);
            } else {
              stage.late += 1;
              dashboard.late += 1;
              stage.lateRowIndexes.push(rowIndex);
              dashboard.lateRowIndexes.push(rowIndex);
              dashboard.problems.push({
                ...problemBase,
                rowIndex,
                status: 'late',
                statusLabel: 'С опозданием',
                deltaDays
              });
            }
            return;
          }

          if (planTime < todayTime) {
            const overdueDays = Math.max(1, Math.round((todayTime - planTime) / 86400000));
            stage.missingPast += 1;
            dashboard.missingPast += 1;
            stage.missingPastRowIndexes.push(rowIndex);
            dashboard.missingPastRowIndexes.push(rowIndex);
            dashboard.problems.push({
              ...problemBase,
              rowIndex,
              status: 'missing',
              statusLabel: 'Нет факта',
              deltaDays: overdueDays
            });
            return;
          }

          stage.upcoming += 1;
          dashboard.upcoming += 1;
          stage.upcomingRowIndexes.push(rowIndex);
          dashboard.upcomingRowIndexes.push(rowIndex);
        });

        stage.resolved = stage.onTime + stage.late;
        stage.okPercent = stage.totalPlan > 0 ? (stage.onTime / stage.totalPlan) * 100 : 0;
        return stage;
      });

      dashboard.okPercent = dashboard.totalPlan > 0 ? (dashboard.onTime / dashboard.totalPlan) * 100 : 0;
      dashboard.problems = dashboard.problems
        .sort((left, right) => {
          const weightDelta = getAnalyticsKsgProblemSortWeight_(right) - getAnalyticsKsgProblemSortWeight_(left);
          if (weightDelta) return weightDelta;
          const dayDelta = (Number(right && right.deltaDays) || 0) - (Number(left && left.deltaDays) || 0);
          if (dayDelta) return dayDelta;
          return normalizeText_(String(left && left.objectName || left && left.uin || ''))
            .localeCompare(normalizeText_(String(right && right.objectName || right && right.uin || '')), 'ru');
        })
        .slice(0, 14);
      return dashboard;
    }

function buildAnalyticsKsgDashboard_() {
      const dashboard = buildEmptyAnalyticsKsgDashboard_();
      const todayTime = startOfLocalDay_(new Date()).getTime();
      const rows = Array.isArray(state.rows) ? state.rows : [];
      const contractorCounts = new Map();
      const grbsCounts = new Map();
      const totalObjectRowIndexes = [];
      const dateRange = normalizeAnalyticsKsgDateRange_();
      const activeDateFrom = dateRange.dateFrom;
      const activeDateTo = dateRange.dateTo;
      const selectedContractors = normalizeAnalyticsKsgContractorFilters_(state.analyticsKsgContractors);
      const selectedGrbs = normalizeAnalyticsKsgGrbsFilters_(state.analyticsKsgGrbs);

      dashboard.activeDateFrom = activeDateFrom;
      dashboard.activeDateTo = activeDateTo;

      rows.forEach((row, rowIndex) => {
        if (!Array.isArray(row)) return;
        const hasKsgData = ANALYTICS_KSG_PAIR_DEFS.some(def => {
          const planText = String(getAnalyticsFieldValueById_(rowIndex, def.planFieldId) || '').trim();
          const factText = String(getAnalyticsFieldValueById_(rowIndex, def.factFieldId) || '').trim();
          return Number.isFinite(getMonitoringDateTimestamp_(planText)) || Number.isFinite(getMonitoringDateTimestamp_(factText));
        });
        if (!hasKsgData) return;
        if (!isAnalyticsKsgRowInDateRange_(rowIndex, activeDateFrom, activeDateTo)) return;
        const summary = getRegistryRowSummary_(rowIndex) || {};
        const contractorLabel = String(summary.contractor || '').trim() || 'Не указан';
        const grbsLabel = String(summary.grbs || '').trim() || 'Не указан';
        contractorCounts.set(contractorLabel, (contractorCounts.get(contractorLabel) || 0) + 1);
        grbsCounts.set(grbsLabel, (grbsCounts.get(grbsLabel) || 0) + 1);
      });

      dashboard.contractorOptions = Array.from(contractorCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => normalizeText_(String(left && left.label || '')).localeCompare(normalizeText_(String(right && right.label || '')), 'ru'));
      dashboard.activeContractors = dashboard.contractorOptions
        .map(option => String(option && option.label || '').trim())
        .filter(label => selectedContractors.includes(label));

      dashboard.grbsOptions = Array.from(grbsCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => normalizeText_(String(left && left.label || '')).localeCompare(normalizeText_(String(right && right.label || '')), 'ru'));
      dashboard.activeGrbs = dashboard.grbsOptions
        .map(option => String(option && option.label || '').trim())
        .filter(label => selectedGrbs.includes(label));

      const activeContractorSet = new Set(dashboard.activeContractors.map(label => normalizeText_(label)));
      const activeGrbsSet = new Set(dashboard.activeGrbs.map(label => normalizeText_(label)));
      const hasActiveContractorFilter = activeContractorSet.size > 0;
      const hasActiveGrbsFilter = activeGrbsSet.size > 0;

      rows.forEach((row, rowIndex) => {
        if (!Array.isArray(row)) return;
        if (!isAnalyticsKsgRowInDateRange_(rowIndex, activeDateFrom, activeDateTo)) return;
        const summary = getRegistryRowSummary_(rowIndex) || {};
        const contractorLabel = String(summary.contractor || '').trim() || 'Не указан';
        const grbsLabel = String(summary.grbs || '').trim() || 'Не указан';
        if (hasActiveContractorFilter && !activeContractorSet.has(normalizeText_(contractorLabel))) return;
        if (hasActiveGrbsFilter && !activeGrbsSet.has(normalizeText_(grbsLabel))) return;
        const hasVisibleKsgEntry = ANALYTICS_KSG_PAIR_DEFS.some(def => {
          const planText = String(getAnalyticsFieldValueById_(rowIndex, def.planFieldId) || '').trim();
          const factText = String(getAnalyticsFieldValueById_(rowIndex, def.factFieldId) || '').trim();
          const planTime = getMonitoringDateTimestamp_(planText);
          const factTime = getMonitoringDateTimestamp_(factText);
          const hasPlan = Number.isFinite(planTime);
          const hasFact = Number.isFinite(factTime);
          if (!hasPlan && !hasFact) return false;
          return isAnalyticsKsgEntryInDateRange_(planTime, factTime, activeDateFrom, activeDateTo);
        });
        if (!hasVisibleKsgEntry) return;
        totalObjectRowIndexes.push(rowIndex);
      });

      dashboard.totalObjectRowIndexes = totalObjectRowIndexes.slice();
      dashboard.totalObjects = totalObjectRowIndexes.length;

      dashboard.stages = ANALYTICS_KSG_PAIR_DEFS.map(def => {
        const stage = {
          key: String(def && def.key || '').trim(),
          title: String(def && def.title || '').trim() || 'КСГ',
          totalPlan: 0,
          onTime: 0,
          late: 0,
          missingPast: 0,
          upcoming: 0,
          withoutPlan: 0,
          resolved: 0,
          okPercent: 0,
          totalPlanRowIndexes: [],
          onTimeRowIndexes: [],
          lateRowIndexes: [],
          missingPastRowIndexes: [],
          upcomingRowIndexes: [],
          withoutPlanRowIndexes: []
        };

        rows.forEach((row, rowIndex) => {
          if (!Array.isArray(row)) return;
          const summary = getRegistryRowSummary_(rowIndex) || {};
          const contractorLabel = String(summary.contractor || '').trim() || 'Не указан';
          const grbsLabel = String(summary.grbs || '').trim() || 'Не указан';
          if (hasActiveContractorFilter && !activeContractorSet.has(normalizeText_(contractorLabel))) return;
          if (hasActiveGrbsFilter && !activeGrbsSet.has(normalizeText_(grbsLabel))) return;

          const planText = String(getAnalyticsFieldValueById_(rowIndex, def.planFieldId) || '').trim();
          const factText = String(getAnalyticsFieldValueById_(rowIndex, def.factFieldId) || '').trim();
          const planTime = getMonitoringDateTimestamp_(planText);
          const factTime = getMonitoringDateTimestamp_(factText);
          const hasPlan = Number.isFinite(planTime);
          const hasFact = Number.isFinite(factTime);

          if (!hasPlan && !hasFact) return;
          if (!isAnalyticsKsgEntryInDateRange_(planTime, factTime, activeDateFrom, activeDateTo)) return;

          const problemBase = {
            stageKey: stage.key,
            stageTitle: stage.title,
            uin: String(summary.uin || '').trim(),
            objectName: String(summary.name || '').trim(),
            planText,
            factText
          };

          if (!hasPlan && hasFact) {
            stage.withoutPlan += 1;
            dashboard.withoutPlan += 1;
            stage.withoutPlanRowIndexes.push(rowIndex);
            dashboard.withoutPlanRowIndexes.push(rowIndex);
            dashboard.problems.push({
              ...problemBase,
              rowIndex,
              status: 'without-plan',
              statusLabel: 'Без плана',
              deltaDays: NaN
            });
            return;
          }

          stage.totalPlan += 1;
          dashboard.totalPlan += 1;
          stage.totalPlanRowIndexes.push(rowIndex);
          dashboard.totalPlanRowIndexes.push(rowIndex);

          if (hasFact) {
            const deltaDays = Math.round((factTime - planTime) / 86400000);
            if (factTime <= planTime) {
              stage.onTime += 1;
              dashboard.onTime += 1;
              stage.onTimeRowIndexes.push(rowIndex);
              dashboard.onTimeRowIndexes.push(rowIndex);
            } else {
              stage.late += 1;
              dashboard.late += 1;
              stage.lateRowIndexes.push(rowIndex);
              dashboard.lateRowIndexes.push(rowIndex);
              dashboard.problems.push({
                ...problemBase,
                rowIndex,
                status: 'late',
                statusLabel: 'Выполнен с отставанием',
                deltaDays
              });
            }
            return;
          }

          if (planTime < todayTime) {
            const overdueDays = Math.max(1, Math.round((todayTime - planTime) / 86400000));
            stage.missingPast += 1;
            dashboard.missingPast += 1;
            stage.missingPastRowIndexes.push(rowIndex);
            dashboard.missingPastRowIndexes.push(rowIndex);
            dashboard.problems.push({
              ...problemBase,
              rowIndex,
              status: 'missing',
              statusLabel: 'Нет факта',
              deltaDays: overdueDays
            });
            return;
          }

          stage.upcoming += 1;
          dashboard.upcoming += 1;
          stage.upcomingRowIndexes.push(rowIndex);
          dashboard.upcomingRowIndexes.push(rowIndex);
        });

        stage.resolved = stage.onTime + stage.late;
        stage.okPercent = stage.totalPlan > 0 ? (stage.onTime / stage.totalPlan) * 100 : 0;
        return stage;
      });

      dashboard.okPercent = dashboard.totalPlan > 0 ? (dashboard.onTime / dashboard.totalPlan) * 100 : 0;
      dashboard.problems = dashboard.problems
        .sort((left, right) => {
          const weightDelta = getAnalyticsKsgProblemSortWeight_(right) - getAnalyticsKsgProblemSortWeight_(left);
          if (weightDelta) return weightDelta;
          const dayDelta = (Number(right && right.deltaDays) || 0) - (Number(left && left.deltaDays) || 0);
          if (dayDelta) return dayDelta;
          return normalizeText_(String(left && left.objectName || left && left.uin || ''))
            .localeCompare(normalizeText_(String(right && right.objectName || right && right.uin || '')), 'ru');
        })
        .slice(0, 14);
      return dashboard;
    }

function createAnalyticsIsoTimestamp_() {
      try {
        return new Date().toISOString();
      } catch (e) {
        return '';
      }
    }

function ensureAnalyticsControlPeriod_() {
      let dateFrom = normalizeAnalyticsArchiveDateValue_(state.analyticsControlDateFrom);
      let dateTo = normalizeAnalyticsArchiveDateValue_(state.analyticsControlDateTo);
      if (!dateFrom || !dateTo) {
        const today = startOfLocalDay_(new Date());
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFrom = dateFrom || formatLocalDateInputValue_(monthStart);
        dateTo = dateTo || formatLocalDateInputValue_(today);
        state.analyticsControlDateFrom = dateFrom;
        state.analyticsControlDateTo = dateTo;
      }
      if (dateFrom && dateTo && dateFrom > dateTo) {
        const swap = dateFrom;
        dateFrom = dateTo;
        dateTo = swap;
        state.analyticsControlDateFrom = dateFrom;
        state.analyticsControlDateTo = dateTo;
      }
      return { dateFrom, dateTo };
    }

function getAnalyticsSectionDef_(section) {
      const normalized = normalizeAnalyticsSection_(section);
      const defs = Array.isArray(ANALYTICS_PANEL_SECTION_DEFS)
        ? ANALYTICS_PANEL_SECTION_DEFS
        : [];
      return defs.find(item => normalizeAnalyticsSection_(item && item.key) === normalized) || null;
    }

function getAnalyticsSectionKind_(section) {
      const def = getAnalyticsSectionDef_(section);
      const kind = String(def && def.kind || '').trim();
      return kind || 'archive';
    }

function isAnalyticsControlSection_(section) {
      return getAnalyticsSectionKind_(section) === 'control';
    }

function isAnalyticsKsgSection_(section) {
      return getAnalyticsSectionKind_(section) === 'ksg';
    }

function isAnalyticsArchiveSection_(section) {
      return getAnalyticsSectionKind_(section) === 'archive';
    }

function getAnalyticsArchiveSectionPeriod_(section) {
      const def = getAnalyticsSectionDef_(section);
      if (def && isAnalyticsArchiveSection_(def.key)) {
        return {
          dateFrom: normalizeAnalyticsArchiveDateValue_(def.rangeFrom),
          dateTo: normalizeAnalyticsArchiveDateValue_(def.rangeTo)
        };
      }
      return {
        dateFrom: '',
        dateTo: ''
      };
    }

function buildAnalyticsDashboardCacheKey_(section, period) {
      const analyticsSection = normalizeAnalyticsSection_(section || state.analyticsSection);
      if (isAnalyticsControlSection_(analyticsSection)) {
        const range = period && typeof period === 'object'
          ? period
          : ensureAnalyticsControlPeriod_();
        return [
          analyticsSection,
          normalizeAnalyticsArchiveDateValue_(range.dateFrom),
          normalizeAnalyticsArchiveDateValue_(range.dateTo)
        ].join('|');
      }
      const archivePeriod = getAnalyticsArchiveSectionPeriod_(analyticsSection);
      if (archivePeriod.dateFrom || archivePeriod.dateTo) {
        return [
          analyticsSection,
          archivePeriod.dateFrom,
          archivePeriod.dateTo
        ].join('|');
      }
      return analyticsSection;
    }

function importAnalyticsControlSkudFile_(file) {
      const sourceFile = file;
      if (!sourceFile || typeof sourceFile.text !== 'function') {
        return Promise.reject(new Error('Файл СКУД не выбран.'));
      }
      return sourceFile.text()
        .then(text => {
          const rows = buildAnalyticsSkudUploadRows_(text);
          if (!rows.length) {
            throw new Error('В файле СКУД не найдены строки для импорта.');
          }
          return runServer_('saveSmartFilterShellWorkControlSkud', [{
            fileName: String(sourceFile.name || '').trim(),
            rows
          }]);
        });
    }

function buildAnalyticsDashboard_(archivePayload, workControlPayload) {
      const workControlData = workControlPayload && typeof workControlPayload === 'object'
        ? workControlPayload
        : {};
      const workControl = buildAnalyticsWorkControlDashboardFromDb_(workControlData);
      const startSmrQuarter = buildAnalyticsStartSmrQuarter_(archivePayload);
      const startSmrQuarterQ1 = buildAnalyticsStartSmrQuarter_(archivePayload, {
        rangeFrom: ANALYTICS_Q1_START_SMR_RANGE_FROM,
        rangeTo: ANALYTICS_Q1_START_SMR_RANGE_TO
      });
      return {
        tracks: [],
        trackedRows: 0,
        overallUniquePlan: 0,
        overallUniqueFact: 0,
        overallUniquePercent: 0,
        overallPlanRowIndexes: [],
        overallFactRowIndexes: [],
        workControl,
        startSmrQuarter,
        startSmrQuarterQ1,
        archiveFetchedAt: String(archivePayload && archivePayload.fetchedAt || '').trim(),
        computedAt: createAnalyticsIsoTimestamp_()
      };
    }

function openAnalyticsRegistryDrilldown_(rowIndexes) {
      const normalizedRowIndexes = normalizeAnalyticsRegistryDrilldownRowIndexes_(rowIndexes)
        .filter(rowIndex => rowIndex < state.rows.length);
      if (!normalizedRowIndexes.length) return false;
      if (isRegistryMapRemovalMode_()) exitRegistryMapRemovalMode_({ silent: true });
      state.currentView = 'registry';
      state.sidebarExpanded = true;
      state.sidebarActivePanel = 'registry';
      state.registrySidebarPanelOpen = true;
      state.selectionPublishMenuId = '';
      state.activeRegistrySelectionId = '';
      state.selectionDraftSourceId = '';
      state.analyticsRegistryDrilldownRowIndexes = normalizedRowIndexes;
      state.objectQuery = '';
      state.bulkUinText = '';
      state.registryBulkDraftText = null;
      state.registryBulkOpen = false;
      state.registryFacetFilters = buildEmptyRegistryFacetFilters_();
      state.registryFacetQueries = buildEmptyRegistryFacetQueries_();
      state.openRegistryFilterKey = '';
      const searchInput = el('registrySearchInput');
      if (searchInput) searchInput.value = '';
      const bulkInput = el('registryBulkUinInput');
      if (bulkInput) bulkInput.value = '';
      syncRegistryBulkUinUi_();
      applyObjectFilters_();
      syncObjectTabsState_();
      ensureObjectSelection_();
      persistRegistrySessionState_();
      renderAll_();
      scrollWorkspaceToTop_();
      return true;
    }

const ANALYTICS_ARCHIVE_RPC_LIMIT = 20000;

function buildAnalyticsArchiveRequestOptions_(analyticsSection) {
      const section = normalizeAnalyticsSection_(analyticsSection);
      const period = getAnalyticsArchiveSectionPeriod_(section);
      if (period.dateFrom || period.dateTo) {
        return {
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          limit: null,
          legacyLimit: ANALYTICS_ARCHIVE_RPC_LIMIT
        };
      }
      return {
        dateFrom: '',
        dateTo: '',
        limit: ANALYTICS_ARCHIVE_RPC_LIMIT,
        legacyLimit: ANALYTICS_ARCHIVE_RPC_LIMIT
      };
    }

function buildAnalyticsDashboardRequests_(analyticsSection, controlPeriod) {
      const section = normalizeAnalyticsSection_(analyticsSection);
      if (isAnalyticsControlSection_(section)) {
        return {
          archiveRequest: Promise.resolve({ rows: [], fetchedAt: '' }),
          workControlRequest: runServer_('getSmartFilterShellWorkControlDashboard', [{
            dateFrom: controlPeriod && controlPeriod.dateFrom || '',
            dateTo: controlPeriod && controlPeriod.dateTo || ''
          }])
        };
      }
      const archiveRequest = buildAnalyticsArchiveRequestOptions_(section);
      return {
        archiveRequest: runServer_('getSmartFilterShellArchiveMonitoring', [{
          limit: archiveRequest.limit,
          legacyLimit: archiveRequest.legacyLimit,
          dateFrom: archiveRequest.dateFrom,
          dateTo: archiveRequest.dateTo
        }]),
        workControlRequest: Promise.resolve(null)
      };
    }

function ensureAnalyticsDashboardLoaded_(options) {
      const settings = options || {};
      if (!state.sessionToken) return Promise.resolve(state.analyticsDashboard);
      const force = !!settings.force;
      const now = Date.now();
      const analyticsSection = normalizeAnalyticsSection_(settings.section || state.analyticsSection);
      const controlPeriod = isAnalyticsControlSection_(analyticsSection)
        ? ensureAnalyticsControlPeriod_()
        : null;
      const cacheKey = buildAnalyticsDashboardCacheKey_(analyticsSection, controlPeriod);
      if (
        !force &&
        state.analyticsLoadedOnce &&
        !state.analyticsError &&
        state.analyticsLoadedKey === cacheKey &&
        (now - Number(state.analyticsLastLoadedAt || 0)) < ANALYTICS_DASHBOARD_CACHE_MS
      ) {
        return Promise.resolve(state.analyticsDashboard);
      }
      return loadAnalyticsDashboard_(settings);
    }

function loadAnalyticsDashboard_(options) {
      const settings = options || {};
      if (!state.sessionToken) return Promise.resolve(state.analyticsDashboard);
      if (state.analyticsLoading && !settings.force) return Promise.resolve(state.analyticsDashboard);
      state.analyticsLoading = true;
      state.analyticsError = '';
      if (!settings.silent) renderAll_();
      const analyticsSection = normalizeAnalyticsSection_(state.analyticsSection);
      const controlPeriod = isAnalyticsControlSection_(analyticsSection)
        ? ensureAnalyticsControlPeriod_()
        : { dateFrom: '', dateTo: '' };
      const cacheKey = buildAnalyticsDashboardCacheKey_(analyticsSection, controlPeriod);
      const requests = buildAnalyticsDashboardRequests_(analyticsSection, controlPeriod);
      return Promise.all([
        Promise.resolve(requests.archiveRequest),
        Promise.resolve(requests.workControlRequest)
      ])
        .then(results => {
          const archivePayload = results[0];
          const workControlPayload = results[1];
          state.analyticsDashboard = buildAnalyticsDashboard_(archivePayload, workControlPayload);
          state.analyticsLastLoadedAt = Date.now();
          state.analyticsLoadedOnce = true;
          state.analyticsLoadedKey = cacheKey;
          return state.analyticsDashboard;
        })
        .catch(err => {
          if (isUnauthorizedError_(err)) {
            handleUnauthorized_();
            return state.analyticsDashboard;
          }
          state.analyticsError = err && err.message ? err.message : String(err || 'Ошибка аналитики');
          throw err;
        })
        .finally(() => {
          state.analyticsLoading = false;
          if (!settings.silent) renderAll_();
        });
    }

// ===== Analytics Domain (lazy) =====

function getAnalyticsPlanAssetUrl_() {
      const url = new URL(ANALYTICS_PLAN_ASSET_PATH, window.location.href);
      const assetVersion = String(
        window.__M_PRO_DEPLOY_CONFIG &&
        window.__M_PRO_DEPLOY_CONFIG.assetVersion ||
        ''
      ).trim();
      if (assetVersion) url.searchParams.set('v', assetVersion);
      return url.toString();
    }

function readAnalyticsPlanText_() {
      const embeddedText = String(window.__SITE_ANALYTICS_PLAN_Q2_2026_CSV__ || '');
      if (embeddedText) return Promise.resolve(embeddedText);
      return fetch(getAnalyticsPlanAssetUrl_(), { cache: 'no-store' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Не удалось загрузить план аналитики (${response.status}).`);
          }
          return response.text();
        });
    }

function parseCsvText_(rawText) {
      const text = String(rawText || '');
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
        if (char === ',' && !inQuotes) {
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

function hasAnalyticsCellValue_(value) {
      return !!String(value == null ? '' : value).trim();
    }

function buildAnalyticsPlanRows_(csvRows) {
      const rows = Array.isArray(csvRows) ? csvRows : [];
      return rows
        .slice(ANALYTICS_PLAN_DATA_START_ROW)
        .filter(row => Array.isArray(row) && row.length >= ANALYTICS_PLAN_MIN_COLUMN_COUNT)
        .map(row => ({
          uin: String(row[ANALYTICS_PLAN_UIN_COLUMN_INDEX] || '').trim(),
          constructionMonitoringPlan: hasAnalyticsCellValue_(row[13]),
          constructionMonitoringFact: hasAnalyticsCellValue_(row[14]),
          constructionControlPlan: hasAnalyticsCellValue_(row[15]),
          constructionControlFact: hasAnalyticsCellValue_(row[16]),
          metroMonitoringPlan: hasAnalyticsCellValue_(row[17]),
          metroMonitoringFact: hasAnalyticsCellValue_(row[18]),
          uniqueMonitoringPlan: hasAnalyticsCellValue_(row[19]),
          uniqueMonitoringFact: hasAnalyticsCellValue_(row[20]),
          labStudiesPlan: hasAnalyticsCellValue_(row[21]),
          labStudiesFact: hasAnalyticsCellValue_(row[22])
        }))
        .filter(item => item.uin);
    }

function extractAnalyticsCsvSnapshotLabel_(csvRows) {
      const infoRow = Array.isArray(csvRows && csvRows[2]) ? csvRows[2] : [];
      return String(infoRow[5] || '').trim();
    }

function buildAnalyticsArchiveFactUins_(archivePayload) {
      const rows = Array.isArray(archivePayload && archivePayload.rows) ? archivePayload.rows : [];
      const seen = new Set();
      rows.forEach(item => {
        const uin = normalizeText_(item && (item.uin || item.objectId) || '');
        const monitoringDateParsed = parseMonitoringDateValue_(item && item.monitoringDate);
        const monitoringDate = monitoringDateParsed && monitoringDateParsed.date instanceof Date
          ? formatLocalDateInputValue_(monitoringDateParsed.date)
          : '';
        const visitStatus = normalizeMonitoringVisitStatus_(item && item.visitStatus);
        if (!uin || !monitoringDate) return;
        if (monitoringDate < ANALYTICS_MONITORING_FACT_FROM) return;
        if (visitStatus === 'denied_access') return;
        seen.add(uin);
      });
      return seen;
    }

function collectRegistryRowIndexesForUins_(items) {
      const targets = new Set((Array.isArray(items) ? items : []).map(normalizeText_).filter(Boolean));
      if (!targets.size) return [];
      const rowIndexes = [];
      for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex++) {
        const uin = normalizeText_(getRegistrySummaryValue_(rowIndex, 'uin'));
        if (!uin || !targets.has(uin)) continue;
        rowIndexes.push(rowIndex);
      }
      return rowIndexes;
    }

function buildAnalyticsArchiveActivity_(archivePayload) {
      const activity = buildEmptyAnalyticsArchiveActivity_();
      const rows = Array.isArray(archivePayload && archivePayload.rows) ? archivePayload.rows : [];
      const rangeFrom = String(activity.rangeFrom || '').trim();
      const rangeTo = String(activity.rangeTo || '').trim();
      activity.totalMonitorings = rows.reduce((count, item) => {
        const monitoringDateParsed = parseMonitoringDateValue_(item && item.monitoringDate);
        const monitoringDate = monitoringDateParsed && monitoringDateParsed.date instanceof Date
          ? formatLocalDateInputValue_(monitoringDateParsed.date)
          : '';
        if (!monitoringDate) return count;
        if (rangeFrom && monitoringDate < rangeFrom) return count;
        if (rangeTo && monitoringDate > rangeTo) return count;
        return count + 1;
      }, 0);
      activity.gaugePercent = activity.totalMonitorings > 0 ? 100 : 0;
      return activity;
    }

function buildAnalyticsArchiveRegistryLookup_() {
      const byObjectId = new Map();
      const byUin = new Map();
      (Array.isArray(state.rows) ? state.rows : []).forEach((row, rowIndex) => {
        if (!Array.isArray(row)) return;
        const summary = getRegistryRowSummary_(rowIndex) || {};
        const objectId = normalizeText_(summary.objectId);
        const uin = normalizeText_(summary.uin);
        if (objectId && !byObjectId.has(objectId)) byObjectId.set(objectId, rowIndex);
        if (uin && !byUin.has(uin)) byUin.set(uin, rowIndex);
      });
      return { byObjectId, byUin };
    }

function buildAnalyticsArchiveMonitoring_(archivePayload) {
      const archive = buildEmptyAnalyticsArchiveMonitoring_();
      const rows = Array.isArray(archivePayload && archivePayload.rows) ? archivePayload.rows : [];
      const lookup = buildAnalyticsArchiveRegistryLookup_();
      const grbsCounts = new Map();

      rows.forEach((item, index) => {
        const monitoringDateRaw = String(item && item.monitoringDate || '').trim();
        const monitoringDateParsed = parseMonitoringDateValue_(monitoringDateRaw);
        if (!monitoringDateParsed || !(monitoringDateParsed.date instanceof Date)) return;
        const monitoringDate = formatLocalDateInputValue_(monitoringDateParsed.date);
        const monitoringDateDisplay = String(monitoringDateParsed.display || formatLocalDateDisplay_(monitoringDateParsed.date) || monitoringDateRaw).trim();

        const objectIdText = String(item && item.objectId || '').trim();
        const uinText = String(item && item.uin || '').trim();
        const objectIdKey = normalizeText_(objectIdText);
        const uinKey = normalizeText_(uinText);
        const matchedRowIndex = lookup.byObjectId.has(objectIdKey)
          ? lookup.byObjectId.get(objectIdKey)
          : (lookup.byUin.has(uinKey) ? lookup.byUin.get(uinKey) : NaN);
        const summary = Number.isFinite(matchedRowIndex) ? (getRegistryRowSummary_(matchedRowIndex) || {}) : null;
        const objectKey = normalizeText_(
          String(summary && (summary.objectId || summary.uin) || objectIdText || uinText || `archive:${index}`).trim()
        ) || `archive:${index}`;
        const grbs = String(summary && summary.grbs || '').trim() || 'Не указан';
        const rvDate = normalizeAnalyticsArchiveDateValue_(summary && summary.rvDate);
        const record = {
          monitoringDate,
          monitoringDateDisplay,
          objectKey,
          objectId: String(summary && summary.objectId || objectIdText || '').trim(),
          uin: String(summary && summary.uin || uinText || '').trim(),
          objectName: String(summary && summary.name || item && item.objectName || objectIdText || uinText || 'Объект').trim(),
          grbs,
          contractor: String(summary && summary.contractor || '').trim(),
          rvDate,
          rvDateDisplay: rvDate ? formatRegistryDateText_(rvDate) : '',
          inspector: String(item && item.inspector || '').trim(),
          visitStatus: normalizeMonitoringVisitStatus_(item && item.visitStatus),
          rowIndex: Number.isFinite(matchedRowIndex) ? Number(matchedRowIndex) : null
        };
        archive.records.push(record);
        grbsCounts.set(grbs, (grbsCounts.get(grbs) || 0) + 1);
        if (!archive.minDate || monitoringDate < archive.minDate) archive.minDate = monitoringDate;
        if (!archive.maxDate || monitoringDate > archive.maxDate) archive.maxDate = monitoringDate;
      });

      archive.grbsOptions = Array.from(grbsCounts.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => normalizeText_(String(left && left.label || '')).localeCompare(normalizeText_(String(right && right.label || '')), 'ru'));
      return archive;
    }

function buildAnalyticsArchiveMonitoringDashboard_(archiveMonitoringBase) {
      const base = archiveMonitoringBase && typeof archiveMonitoringBase === 'object'
        ? archiveMonitoringBase
        : buildEmptyAnalyticsArchiveMonitoring_();
      const records = Array.isArray(base.records) ? base.records : [];
      const baseMinDate = String(base.minDate || '').trim();
      const baseMaxDate = String(base.maxDate || '').trim();
      const defaultDateTo = baseMaxDate;
      let defaultDateFrom = baseMinDate;
      if (baseMaxDate) {
        const parsedMaxDate = parseMonitoringDateValue_(baseMaxDate);
        if (parsedMaxDate && parsedMaxDate.date instanceof Date) {
          const monthStartDate = createValidatedLocalDate_(
            parsedMaxDate.date.getFullYear(),
            parsedMaxDate.date.getMonth() + 1,
            1
          );
          const monthStartValue = formatLocalDateInputValue_(monthStartDate);
          if (monthStartValue) {
            defaultDateFrom = (!baseMinDate || monthStartValue >= baseMinDate)
              ? monthStartValue
              : baseMinDate;
          }
        }
      }
      const selectedGrbs = normalizeAnalyticsArchiveGrbsFilters_(state.analyticsArchiveGrbs);
      const activeGrbsSet = new Set(selectedGrbs.map(normalizeText_));
      let dateFrom = normalizeAnalyticsArchiveDateValue_(state.analyticsArchiveDateFrom) || defaultDateFrom;
      let dateTo = normalizeAnalyticsArchiveDateValue_(state.analyticsArchiveDateTo) || defaultDateTo;
      if (baseMinDate && (!dateFrom || dateFrom < baseMinDate)) dateFrom = defaultDateFrom || baseMinDate;
      if (baseMaxDate && (!dateTo || dateTo > baseMaxDate)) dateTo = defaultDateTo || baseMaxDate;
      if (dateFrom && dateTo && dateFrom > dateTo) {
        const swap = dateFrom;
        dateFrom = dateTo;
        dateTo = swap;
      }

      const dateFilteredGrbsCounts = new Map();
      records.forEach(record => {
        if (!record || !record.monitoringDate) return;
        if (dateFrom && record.monitoringDate < dateFrom) return;
        if (dateTo && record.monitoringDate > dateTo) return;
        dateFilteredGrbsCounts.set(record.grbs, (dateFilteredGrbsCounts.get(record.grbs) || 0) + 1);
      });

      const filteredRecords = records.filter(record => {
        if (!record || !record.monitoringDate) return false;
        if (dateFrom && record.monitoringDate < dateFrom) return false;
        if (dateTo && record.monitoringDate > dateTo) return false;
        if (activeGrbsSet.size && !activeGrbsSet.has(normalizeText_(record.grbs))) return false;
        return true;
      });

      const objectStats = new Map();
      const postRvObjects = new Map();
      const dailyBuckets = new Map();
      const matchedRowIndexes = [];
      const deniedRowIndexes = [];
      const withoutRvRowIndexes = [];
      const beforeRvRowIndexes = [];
      const afterRvRowIndexes = [];
      let visitsWithoutRv = 0;
      let visitsBeforeRv = 0;
      let visitsAfterRv = 0;

      filteredRecords.forEach(record => {
        const objectKey = String(record.objectKey || '').trim() || 'archive';
        const rowIndex = Number.isFinite(record.rowIndex) ? Number(record.rowIndex) : NaN;
        if (Number.isFinite(rowIndex)) matchedRowIndexes.push(rowIndex);
        if (record.visitStatus === 'denied_access' && Number.isFinite(rowIndex)) deniedRowIndexes.push(rowIndex);
        const rvDate = String(record.rvDate || '').trim();
        if (!rvDate) {
          visitsWithoutRv += 1;
          if (Number.isFinite(rowIndex)) withoutRvRowIndexes.push(rowIndex);
        } else if (record.monitoringDate > rvDate) {
          visitsAfterRv += 1;
          if (Number.isFinite(rowIndex)) afterRvRowIndexes.push(rowIndex);
          if (!postRvObjects.has(objectKey) || (!Number.isFinite(postRvObjects.get(objectKey)) && Number.isFinite(rowIndex))) {
            postRvObjects.set(objectKey, rowIndex);
          }
        } else {
          visitsBeforeRv += 1;
          if (Number.isFinite(rowIndex)) beforeRvRowIndexes.push(rowIndex);
        }

        const currentObject = objectStats.get(objectKey) || {
          key: objectKey,
          rowIndex,
          uin: String(record.uin || '').trim(),
          objectName: String(record.objectName || '').trim(),
          grbs: String(record.grbs || '').trim(),
          contractor: String(record.contractor || '').trim(),
          total: 0,
          denied: 0,
          lastDate: ''
        };
        currentObject.total += 1;
        if (record.visitStatus === 'denied_access') currentObject.denied += 1;
        if (!currentObject.lastDate || record.monitoringDate > currentObject.lastDate) currentObject.lastDate = record.monitoringDate;
        objectStats.set(objectKey, currentObject);

        const bucket = dailyBuckets.get(record.monitoringDate) || {
          date: record.monitoringDate,
          total: 0,
          denied: 0,
          uniqueKeys: new Set(),
          rowIndexes: []
        };
        bucket.total += 1;
        if (record.visitStatus === 'denied_access') bucket.denied += 1;
        bucket.uniqueKeys.add(objectKey);
        if (Number.isFinite(rowIndex)) bucket.rowIndexes.push(rowIndex);
        dailyBuckets.set(record.monitoringDate, bucket);
      });

      const uniqueObjects = objectStats.size;
      const totalMonitorings = filteredRecords.length;
      const repeatedMonitorings = Math.max(0, totalMonitorings - uniqueObjects);
      const averagePerObject = uniqueObjects > 0 ? totalMonitorings / uniqueObjects : 0;
      const objectsWithPostRvVisits = postRvObjects.size;
      const postRvShare = totalMonitorings > 0 ? (visitsAfterRv / totalMonitorings) * 100 : 0;
      const uniqueRowIndexes = Array.from(objectStats.values())
        .map(item => item.rowIndex)
        .filter(Number.isFinite);
      const repeatedRowIndexes = Array.from(objectStats.values())
        .filter(item => Number(item && item.total) > 1)
        .map(item => item.rowIndex)
        .filter(Number.isFinite);
      const postRvObjectRowIndexes = Array.from(postRvObjects.values()).filter(Number.isFinite);
      const timeline = Array.from(dailyBuckets.values())
        .sort((left, right) => String(left && left.date || '').localeCompare(String(right && right.date || '')))
        .map(bucket => {
          const uniqueCount = bucket.uniqueKeys.size;
          return {
            date: bucket.date,
            total: bucket.total,
            uniqueCount,
            repeatCount: Math.max(0, bucket.total - uniqueCount),
            deniedCount: bucket.denied,
            rowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(bucket.rowIndexes)
          };
        });
      const topObjects = Array.from(objectStats.values())
        .sort((left, right) => {
          const totalDelta = Number(right && right.total || 0) - Number(left && left.total || 0);
          if (totalDelta) return totalDelta;
          const deniedDelta = Number(right && right.denied || 0) - Number(left && left.denied || 0);
          if (deniedDelta) return deniedDelta;
          return String(right && right.lastDate || '').localeCompare(String(left && left.lastDate || ''));
        })
        .slice(0, 10)
        .map(item => ({
          ...item,
          rowIndexes: Number.isFinite(item && item.rowIndex) ? [Number(item.rowIndex)] : []
        }));

      return {
        totalMonitorings,
        uniqueObjects,
        repeatedMonitorings,
        deniedAccess: filteredRecords.reduce((count, record) => count + (record && record.visitStatus === 'denied_access' ? 1 : 0), 0),
        averagePerObject,
        visitsWithoutRv,
        visitsBeforeRv,
        visitsAfterRv,
        objectsWithPostRvVisits,
        postRvShare,
        grbsOptions: (Array.isArray(base.grbsOptions) ? base.grbsOptions : []).map(option => ({
          label: String(option && option.label || '').trim(),
          count: dateFilteredGrbsCounts.get(String(option && option.label || '').trim()) || 0
        })),
        activeGrbs: selectedGrbs,
        dateFrom,
        dateTo,
        minDate: String(base.minDate || '').trim(),
        maxDate: String(base.maxDate || '').trim(),
        timeline,
        topObjects,
        totalRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(matchedRowIndexes),
        uniqueRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(uniqueRowIndexes),
        repeatedRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(repeatedRowIndexes),
        deniedRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(deniedRowIndexes),
        withoutRvRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(withoutRvRowIndexes),
        beforeRvRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(beforeRvRowIndexes),
        afterRvRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(afterRvRowIndexes),
        postRvObjectRowIndexes: normalizeAnalyticsRegistryDrilldownRowIndexes_(postRvObjectRowIndexes)
      };
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
        archiveActivity: dashboard.archiveActivity || buildEmptyAnalyticsArchiveActivity_(),
        archiveMonitoring: dashboard.archiveMonitoring || buildEmptyAnalyticsArchiveMonitoring_(),
        startSmrQuarter: dashboard[String(settings.startSmrKey || 'startSmrQuarter')] || startSmrFallback,
        startSmrQuarterQ1: dashboard.startSmrQuarterQ1 || buildEmptyAnalyticsStartSmrQuarter_({
          rangeFrom: ANALYTICS_Q1_START_SMR_RANGE_FROM,
          rangeTo: ANALYTICS_Q1_START_SMR_RANGE_TO
        }),
        csvSnapshotLabel: String(normalizedConfig.snapshotLabel || dashboard.csvSnapshotLabel || '').trim(),
        csvFetchedAt: String(dashboard.csvFetchedAt || '').trim(),
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
        totalPlan: 0,
        onTime: 0,
        late: 0,
        missingPast: 0,
        upcoming: 0,
        withoutPlan: 0,
        okPercent: 0,
        contractorOptions: [],
        activeContractors: [],
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

function buildAnalyticsKsgDashboard_() {
      const dashboard = buildEmptyAnalyticsKsgDashboard_();
      const todayTime = startOfLocalDay_(new Date()).getTime();
      const rows = Array.isArray(state.rows) ? state.rows : [];
      const contractorCounts = new Map();
      const selectedContractors = normalizeAnalyticsKsgContractorFilters_(state.analyticsKsgContractors);

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

function countAnalyticsTrackPlan_(rows, trackDef) {
      const planKey = `${String(trackDef && trackDef.key || '')}Plan`;
      return (Array.isArray(rows) ? rows : []).reduce((count, row) => count + (row && row[planKey] ? 1 : 0), 0);
    }

function countAnalyticsTrackFact_(rows, trackDef, archiveFactUins) {
      const items = Array.isArray(rows) ? rows : [];
      const def = trackDef || {};
      if (String(def.factSource || '') === 'archive') {
        const planKey = `${String(def.key || '')}Plan`;
        return items.reduce((count, row) => (
          count + (row && row[planKey] && archiveFactUins.has(normalizeText_(row.uin)) ? 1 : 0)
        ), 0);
      }
      const factKey = `${String(def.key || '')}Fact`;
      return items.reduce((count, row) => count + (row && row[factKey] ? 1 : 0), 0);
    }

function buildAnalyticsTrackFactUins_(rows, trackDef, archiveFactUins) {
      const items = Array.isArray(rows) ? rows : [];
      const def = trackDef || {};
      const seen = new Set();
      if (String(def.factSource || '') === 'archive') {
        const planKey = `${String(def.key || '')}Plan`;
        items.forEach(row => {
          const uin = normalizeText_(row && row.uin);
          if (!uin || !row || !row[planKey] || !archiveFactUins.has(uin)) return;
          seen.add(uin);
        });
        return seen;
      }
      const factKey = `${String(def.key || '')}Fact`;
      items.forEach(row => {
        const uin = normalizeText_(row && row.uin);
        if (!uin || !row || !row[factKey]) return;
        seen.add(uin);
      });
      return seen;
    }

function createAnalyticsIsoTimestamp_() {
      try {
        return new Date().toISOString();
      } catch (e) {
        return '';
      }
    }

function buildAnalyticsDashboard_(archivePayload) {
      const archiveActivity = buildAnalyticsArchiveActivity_(archivePayload);
      const archiveMonitoring = buildAnalyticsArchiveMonitoring_(archivePayload);
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
        archiveActivity,
        archiveMonitoring,
        startSmrQuarter,
        startSmrQuarterQ1,
        csvSnapshotLabel: '',
        csvFetchedAt: '',
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

function ensureAnalyticsDashboardLoaded_(options) {
      const settings = options || {};
      if (!state.sessionToken) return Promise.resolve(state.analyticsDashboard);
      const force = !!settings.force;
      const now = Date.now();
      if (
        !force &&
        state.analyticsLoadedOnce &&
        !state.analyticsError &&
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
      const archiveRequest = runServer_('getSmartFilterShellArchiveMonitoring', [{ limit: 20000 }]);
      return Promise.resolve(archiveRequest)
        .then(archivePayload => {
          state.analyticsDashboard = buildAnalyticsDashboard_(archivePayload);
          state.analyticsLastLoadedAt = Date.now();
          state.analyticsLoadedOnce = true;
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

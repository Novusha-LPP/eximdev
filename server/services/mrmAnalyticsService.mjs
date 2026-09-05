import MRMItem from '../model/mrm/mrmItemModel.mjs';
import MRMMetadata from '../model/mrm/mrmMetadataModel.mjs';
import OpenPoint from '../model/openPoints/openPointModel.mjs';

/**
 * Parses numeric value safely from strings (handles percentages, commas, currency)
 */
export const parseNumericValue = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
};

/**
 * Evaluates Auto-RAG status based on Actual vs Plan, Optimization Direction, and Tolerance Band.
 * Returns 'Green' | 'Yellow' | 'Red' | null
 */
export const calculateAutoRAG = (actual, planOrTarget, optimizationDirection = 'Higher', toleranceBand = 5) => {
    const numActual = parseNumericValue(actual);
    const numPlan = parseNumericValue(planOrTarget);

    if (numActual === null || numPlan === null) {
        return null;
    }

    const tol = Math.max(0, Number(toleranceBand) || 5);
    const isHigher = String(optimizationDirection || '').toLowerCase() !== 'lower';

    if (isHigher) {
        // Higher is better (e.g. Sales, Units, Volume, Service Level)
        if (numActual >= numPlan) {
            return 'Green';
        }
        if (numPlan === 0) {
            return numActual >= 0 ? 'Green' : 'Red';
        }
        const shortfallPct = ((numPlan - numActual) / Math.abs(numPlan)) * 100;
        if (shortfallPct <= tol) {
            return 'Yellow';
        }
        return 'Red';
    } else {
        // Lower is better (e.g. Turnaround Time, Error Count, Attrition)
        if (numActual <= numPlan) {
            return 'Green';
        }
        if (numPlan === 0) {
            return numActual <= 0 ? 'Green' : 'Red';
        }
        const overrunPct = ((numActual - numPlan) / Math.abs(numPlan)) * 100;
        if (overrunPct <= tol) {
            return 'Yellow';
        }
        return 'Red';
    }
};

/**
 * Calculates 12-Month Strip, YTD Rollup, and Viewer-Selectable Forecasts.
 * Only Approved months feed official rollup totals per PRD specification.
 */
export const calculateAnnualRollup = async ({ year, userId = null, forecastMethod = 'best_worst' }) => {
    const queryYear = Number(year) || new Date().getFullYear();
    
    // 1. Fetch metadata for all months to verify approval status
    const metaQuery = { year: queryYear };
    if (userId) metaQuery.userId = userId;
    const metadataList = await MRMMetadata.find(metaQuery);

    const approvedMonthSet = new Set();
    metadataList.forEach(m => {
        if (m.status === 'Approved' || m.meetingDone === true) {
            approvedMonthSet.add(m.month);
        }
    });

    // 2. Fetch all items for this year/user
    const itemQuery = { year: queryYear };
    if (userId) itemQuery.createdBy = userId;
    const items = await MRMItem.find(itemQuery).sort({ seq: 1, createdAt: 1 });

    // Dynamically resolve parent tile name from preceding title rows
    const userMonthItems = new Map();
    items.forEach(it => {
        const k = `${it.createdBy}::${it.month}`;
        if (!userMonthItems.has(k)) userMonthItems.set(k, []);
        userMonthItems.get(k).push(it);
    });
    userMonthItems.forEach(list => {
        list.sort((a, b) => (a.seq || 0) - (b.seq || 0));
        let activeTile = 'General';
        list.forEach(it => {
            if (it.isTitleRow) {
                activeTile = (it.tileName || it.processDescription || 'General').trim();
            } else if (!it.tileName) {
                it.tileName = activeTile;
            }
        });
    });

    // Group items by unique objective & tile
    const objectiveGroups = new Map();

    items.forEach(item => {
        if (item.isTitleRow) return; // Skip title rows in rollup math
        const tileName = item.tileName || item.processDescription || 'General';
        const key = `${tileName}::${item.objective || item.processDescription}`;

        if (!objectiveGroups.has(key)) {
            objectiveGroups.set(key, {
                tile: tileName,
                objective: item.objective || item.processDescription,
                aggregationType: item.aggregationType || 'Sum',
                optimizationDirection: item.optimizationDirection || 'Higher',
                toleranceBand: item.toleranceBand || 5,
                lastYearBaseline: item.lastYearBaseline || null,
                lastYearBaselineMetric: item.lastYearBaselineMetric || '',
                monthlyData: {}, // '01': { actual, plan, status, isApproved, numActual }
                history: []
            });
        }

        const group = objectiveGroups.get(key);
        const isApproved = approvedMonthSet.has(item.month);
        const numActual = parseNumericValue(item.actual);
        const numPlan = parseNumericValue(item.plan);

        group.monthlyData[item.month] = {
            itemId: item._id,
            actual: item.actual,
            plan: item.plan,
            numActual,
            numPlan,
            status: item.status || 'Gray',
            isApproved
        };

        if (numActual !== null && isApproved) {
            group.history.push({ month: item.month, value: numActual });
        }

        if (item.lastYearBaseline != null && group.lastYearBaseline == null) {
            group.lastYearBaseline = item.lastYearBaseline;
            group.lastYearBaselineMetric = item.lastYearBaselineMetric || '';
        }
        if (item.macroReferences && item.macroReferences.length > 0 && (!group.macroReferences || group.macroReferences.length === 0)) {
            group.macroReferences = item.macroReferences;
        }
    });

    // 3. Compute 12-Month Strip, Rollup & Forecast for each objective
    const monthKeys = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const rollupResults = [];

    objectiveGroups.forEach((group) => {
        const strip = [];
        const approvedValues = [];

        monthKeys.forEach(m => {
            const data = group.monthlyData[m] || { actual: '', plan: '', numActual: null, status: 'Gray', isApproved: false };
            strip.push({
                month: m,
                ...data
            });
            if (data.isApproved && data.numActual !== null) {
                approvedValues.push(data.numActual);
            }
        });

        // Compute YTD based on aggregationType
        let ytd = null;
        if (approvedValues.length > 0) {
            if (group.aggregationType === 'Average') {
                const sum = approvedValues.reduce((a, b) => a + b, 0);
                ytd = Number((sum / approvedValues.length).toFixed(2));
            } else if (group.aggregationType === 'Latest') {
                ytd = approvedValues[approvedValues.length - 1];
            } else {
                // Sum default
                ytd = Number(approvedValues.reduce((a, b) => a + b, 0).toFixed(2));
            }
        }

        // Compute Forecasts (Only for remaining unapproved months)
        const approvedCount = approvedValues.length;
        const remainingMonths = Math.max(0, 12 - approvedCount);

        let forecast = {
            method: forecastMethod,
            value: null,
            range: null
        };

        if (approvedCount > 0) {
            const minVal = Math.min(...approvedValues);
            const maxVal = Math.max(...approvedValues);
            const meanVal = approvedValues.reduce((a, b) => a + b, 0) / approvedCount;

            // 1. Best / Worst-case range
            const worstTotal = group.aggregationType === 'Average'
                ? Number(((ytd * approvedCount + remainingMonths * minVal) / 12).toFixed(2))
                : Number((ytd + remainingMonths * minVal).toFixed(2));

            const bestTotal = group.aggregationType === 'Average'
                ? Number(((ytd * approvedCount + remainingMonths * maxVal) / 12).toFixed(2))
                : Number((ytd + remainingMonths * maxVal).toFixed(2));

            // 2. Run-rate forecast
            const runRateTotal = group.aggregationType === 'Average'
                ? ytd
                : Number((ytd + remainingMonths * meanVal).toFixed(2));

            // 3. Linear Trend forecast
            let trendTotal = runRateTotal;
            if (approvedCount >= 2) {
                // Simple linear regression slope: m = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(x^2) - (sum(x))^2)
                let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                approvedValues.forEach((y, idx) => {
                    const x = idx + 1;
                    sumX += x;
                    sumY += y;
                    sumXY += x * y;
                    sumXX += x * x;
                });
                const denominator = approvedCount * sumXX - sumX * sumX;
                const slope = denominator !== 0 ? (approvedCount * sumXY - sumX * sumY) / denominator : 0;
                const intercept = (sumY - slope * sumX) / approvedCount;

                let projectedRemainingSum = 0;
                for (let step = 1; step <= remainingMonths; step++) {
                    const futureX = approvedCount + step;
                    const projectedY = Math.max(0, slope * futureX + intercept);
                    projectedRemainingSum += projectedY;
                }

                trendTotal = group.aggregationType === 'Average'
                    ? Number(((ytd * approvedCount + projectedRemainingSum) / 12).toFixed(2))
                    : Number((ytd + projectedRemainingSum).toFixed(2));
            }

            if (forecastMethod === 'run_rate') {
                forecast.value = runRateTotal;
            } else if (forecastMethod === 'linear_trend') {
                forecast.value = trendTotal;
            } else {
                // best_worst (default)
                forecast.range = { worst: worstTotal, best: bestTotal };
                forecast.value = Number(((worstTotal + bestTotal) / 2).toFixed(2));
            }
        }

        // Dual YoY Delta Calculation (both absolute and %)
        let yoyDelta = null;
        if (ytd !== null && group.lastYearBaseline !== null) {
            const absDelta = Number((ytd - group.lastYearBaseline).toFixed(2));
            const pctDelta = group.lastYearBaseline !== 0
                ? Number(((absDelta / group.lastYearBaseline) * 100).toFixed(1))
                : null;
            
            const sign = absDelta > 0 ? '+' : '';
            const formattedText = pctDelta !== null
                ? `${sign}${absDelta} (${pctDelta > 0 ? '+' : ''}${pctDelta}%)`
                : `${sign}${absDelta}`;

            yoyDelta = {
                baseline: group.lastYearBaseline,
                metric: group.lastYearBaselineMetric,
                absDelta,
                pctDelta,
                formattedText
            };
        }

        // Anomaly Detection on Approved Trailing Actuals
        const anomaly = approvedValues.length >= 2 ? detectAnomalies(approvedValues) : { isAnomaly: false };

        rollupResults.push({
            tile: group.tile,
            objective: group.objective,
            aggregationType: group.aggregationType,
            optimizationDirection: group.optimizationDirection,
            toleranceBand: group.toleranceBand,
            lastYearBaseline: group.lastYearBaseline,
            lastYearBaselineMetric: group.lastYearBaselineMetric,
            macroReferences: group.macroReferences || [],
            strip,
            months: group.monthlyData,
            approvedCount,
            ytd,
            yoyDelta,
            forecast,
            anomaly
        });
    });

    // 4. Compute Tile-Level Rollup Subtotals
    const tileMap = new Map();
    rollupResults.forEach(obj => {
        const t = obj.tile || 'General';
        if (!tileMap.has(t)) {
            tileMap.set(t, {
                tile: t,
                totalObjectives: 0,
                approvedObjectivesCount: 0,
                ytdSum: 0,
                hasYtd: false,
                anomalyCount: 0,
                forecastValues: []
            });
        }
        const tStat = tileMap.get(t);
        tStat.totalObjectives++;
        if (obj.approvedCount > 0) tStat.approvedObjectivesCount++;
        if (obj.ytd !== null) {
            tStat.ytdSum += obj.ytd;
            tStat.hasYtd = true;
        }
        if (obj.anomaly?.isAnomaly) {
            tStat.anomalyCount++;
        }
        if (obj.forecast?.value !== null && obj.forecast?.value !== undefined) {
            tStat.forecastValues.push(obj.forecast.value);
        }
    });

    const tileSummaries = [];
    tileMap.forEach((tStat, tile) => {
        tileSummaries.push({
            tile,
            totalObjectives: tStat.totalObjectives,
            approvedObjectivesCount: tStat.approvedObjectivesCount,
            ytdSum: tStat.hasYtd ? Number(tStat.ytdSum.toFixed(2)) : null,
            anomalyCount: tStat.anomalyCount,
            hasAnomaly: tStat.anomalyCount > 0,
            projectedTotal: tStat.forecastValues.length > 0 
                ? Number(tStat.forecastValues.reduce((a, b) => a + b, 0).toFixed(2)) 
                : null
        });
    });

    // 5. Person-Level Composite Summary
    const personSummary = {
        totalObjectives: rollupResults.length,
        approvedMonthsCount: approvedMonthSet.size,
        objectivesWithApprovedData: rollupResults.filter(o => o.approvedCount > 0).length,
        anomalyCount: rollupResults.filter(o => o.anomaly?.isAnomaly).length,
        tilesCount: tileSummaries.length
    };

    return {
        year: queryYear,
        approvedMonths: Array.from(approvedMonthSet),
        objectives: rollupResults,
        tileSummaries,
        personSummary
    };
};

/**
 * Statistical Anomaly Detector (Trailing 3-Month Deviation)
 */
export const detectAnomalies = (monthlyActuals) => {
    // Expects array of numbers [m1, m2, m3, current]
    if (!Array.isArray(monthlyActuals) || monthlyActuals.length < 2) {
        return { isAnomaly: false };
    }

    const currentVal = monthlyActuals[monthlyActuals.length - 1];
    const trailingValues = monthlyActuals.slice(0, monthlyActuals.length - 1);

    const sum = trailingValues.reduce((a, b) => a + b, 0);
    const mean = sum / trailingValues.length;

    if (mean === 0) return { isAnomaly: false };

    const diffPct = ((currentVal - mean) / mean) * 100;

    // Flag if deviation exceeds 30%
    if (Math.abs(diffPct) >= 30) {
        return {
            isAnomaly: true,
            diffPct: Number(diffPct.toFixed(1)),
            direction: diffPct > 0 ? 'surge' : 'drop',
            trailingMean: Number(mean.toFixed(2)),
            currentVal
        };
    }

    return { isAnomaly: false };
};

/**
 * Recurring Issues Analyzer (Consecutive Red, Chronic Open Points, Systemic Tiles, Cross-Year Red)
 */
export const analyzeRecurringIssues = async ({ year = new Date().getFullYear() }) => {
    const queryYear = Number(year);
    const priorYear = queryYear - 1;

    // 1. Fetch all items for current year and prior year (for cross-year analysis)
    const items = await MRMItem.find({ year: queryYear }).sort({ month: 1, seq: 1 });
    const priorItems = await MRMItem.find({ year: priorYear }).sort({ month: 1, seq: 1 });

    // Dynamically resolve parent tile name from preceding title rows in each user/month
    const resolveParentTiles = (itemList) => {
        const userMonthMap = new Map();
        itemList.forEach(it => {
            const k = `${it.createdBy}::${it.month}`;
            if (!userMonthMap.has(k)) userMonthMap.set(k, []);
            userMonthMap.get(k).push(it);
        });
        userMonthMap.forEach(list => {
            list.sort((a, b) => (a.seq || 0) - (b.seq || 0));
            let activeTile = 'General';
            list.forEach(it => {
                if (it.isTitleRow) {
                    activeTile = (it.tileName || it.processDescription || 'General').trim();
                } else if (!it.tileName) {
                    it.tileName = activeTile;
                }
            });
        });
    };

    resolveParentTiles(items);
    resolveParentTiles(priorItems);

    // Group by objective across months
    const objectiveHistory = new Map();
    const tileRedCounts = new Map();

    items.forEach(item => {
        if (item.isTitleRow) return;
        const key = `${item.createdBy}::${item.objective || item.processDescription}`;
        const itemTile = item.tileName || item.processDescription || 'General';

        if (!objectiveHistory.has(key)) {
            objectiveHistory.set(key, {
                objective: item.objective || item.processDescription,
                tile: itemTile,
                userId: item.createdBy,
                months: []
            });
        }
        objectiveHistory.get(key).months.push({
            month: item.month,
            status: item.status || 'Gray'
        });

        // Track Tile Red counts
        const tileKey = itemTile;
        if (!tileRedCounts.has(tileKey)) {
            tileRedCounts.set(tileKey, { tile: tileKey, totalItems: 0, redItems: 0, users: new Set() });
        }
        const tStat = tileRedCounts.get(tileKey);
        tStat.totalItems++;
        if (item.status === 'Red') tStat.redItems++;
        tStat.users.add(String(item.createdBy));
    });

    // Rule A: Consecutive Red Objectives (2+ consecutive calendar months)
    const consecutiveRedList = [];
    objectiveHistory.forEach(obj => {
        const sorted = obj.months.sort((a, b) => Number(a.month) - Number(b.month));
        let consecutiveCount = 0;
        let flaggedMonths = [];
        let lastMonthNum = null;

        for (const m of sorted) {
            const mNum = Number(m.month);
            if (m.status === 'Red') {
                if (lastMonthNum !== null && mNum === lastMonthNum + 1) {
                    consecutiveCount++;
                    flaggedMonths.push(m.month);
                } else {
                    if (consecutiveCount >= 2) {
                        consecutiveRedList.push({
                            objective: obj.objective,
                            tile: obj.tile,
                            userId: obj.userId,
                            consecutiveCount,
                            streak: consecutiveCount,
                            months: [...flaggedMonths]
                        });
                    }
                    consecutiveCount = 1;
                    flaggedMonths = [m.month];
                }
                lastMonthNum = mNum;
            } else {
                if (consecutiveCount >= 2) {
                    consecutiveRedList.push({
                        objective: obj.objective,
                        tile: obj.tile,
                        userId: obj.userId,
                        consecutiveCount,
                        streak: consecutiveCount,
                        months: [...flaggedMonths]
                    });
                }
                consecutiveCount = 0;
                flaggedMonths = [];
                lastMonthNum = null;
            }
        }
        if (consecutiveCount >= 2) {
            consecutiveRedList.push({
                objective: obj.objective,
                tile: obj.tile,
                userId: obj.userId,
                consecutiveCount,
                streak: consecutiveCount,
                months: [...flaggedMonths]
            });
        }
    });

    // Rule A2: Cross-Year Recurring Red in the Same Month
    const sameMonthAcrossYears = [];
    if (priorItems.length > 0) {
        const priorRedSet = new Set();
        priorItems.forEach(p => {
            if (!p.isTitleRow && p.status === 'Red') {
                const pKey = `${p.createdBy}::${p.objective || p.processDescription}::${p.month}`;
                priorRedSet.add(pKey);
            }
        });

        items.forEach(c => {
            if (!c.isTitleRow && c.status === 'Red') {
                const cKey = `${c.createdBy}::${c.objective || c.processDescription}::${c.month}`;
                if (priorRedSet.has(cKey)) {
                    sameMonthAcrossYears.push({
                        objective: c.objective || c.processDescription,
                        tile: c.tileName || c.processDescription || 'General',
                        userId: c.createdBy,
                        month: c.month,
                        years: [priorYear, queryYear]
                    });
                }
            }
        });
    }

    // Rule B: Chronic Open Point Owners (Open Points originating from MRM that are still open)
    const now = Date.now();
    const openPoints = await OpenPoint.find({
        originModule: 'MRM',
        status: { $in: ['Red', 'Yellow', 'Orange'] }
    }).populate('responsible_person', 'first_name last_name username');

    const chronicOwnersMap = new Map();
    openPoints.forEach(pt => {
        const ownerName = pt.responsible_person
            ? `${pt.responsible_person.first_name || ''} ${pt.responsible_person.last_name || ''}`.trim() || pt.responsible_person.username
            : (pt.responsibility || 'Unassigned');

        if (!chronicOwnersMap.has(ownerName)) {
            chronicOwnersMap.set(ownerName, {
                owner: ownerName,
                ownerName,
                totalOpen: 0,
                overdueCount: 0,
                maxAgeDays: 0,
                points: []
            });
        }
        const o = chronicOwnersMap.get(ownerName);
        o.totalOpen++;
        
        const ptDate = pt.createdAt ? new Date(pt.createdAt).getTime() : now;
        const ageDays = Math.max(0, Math.floor((now - ptDate) / (1000 * 60 * 60 * 24)));
        if (ageDays > o.maxAgeDays) {
            o.maxAgeDays = ageDays;
        }

        if (pt.target_date && new Date(pt.target_date) < new Date()) {
            o.overdueCount++;
        }
        o.points.push({
            id: pt._id,
            uniqueId: pt.unique_id,
            title: pt.title,
            targetDate: pt.target_date,
            status: pt.status,
            ageDays
        });
    });

    // Filter to owners whose points stay open across multiple months (age >= 30 days or overdue)
    const chronicOwners = Array.from(chronicOwnersMap.values())
        .filter(o => o.maxAgeDays >= 30 || o.overdueCount > 0);

    // Rule C: Systemic Tile Bottlenecks (Disproportionately Red across multiple people)
    const systemicTiles = [];
    tileRedCounts.forEach(t => {
        const redRatio = t.totalItems > 0 ? (t.redItems / t.totalItems) : 0;
        if (t.users.size >= 2 && redRatio >= 0.35 && t.redItems >= 2) {
            systemicTiles.push({
                tile: t.tile,
                affectedUsersCount: t.users.size,
                totalItems: t.totalItems,
                total: t.totalItems,
                redItems: t.redItems,
                redPercentage: Number((redRatio * 100).toFixed(1))
            });
        }
    });

    return {
        consecutiveRed: consecutiveRedList,
        sameMonthAcrossYears,
        chronicOwners,
        systemicTiles
    };
};


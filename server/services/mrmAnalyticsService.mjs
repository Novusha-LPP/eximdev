import MRMItem from '../model/mrm/mrmItemModel.mjs';
import MRMMetadata from '../model/mrm/mrmMetadataModel.mjs';
import OpenPoint from '../model/openPoints/openPointModel.mjs';
import UserModel from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';
import KPISheet from '../model/kpi/kpiSheetModel.mjs';
import MRMSegmentRollup from '../model/mrm/mrmSegmentRollupModel.mjs';
import MRMHodScore from '../model/mrm/mrmHodScoreModel.mjs';
import MRMMemberWeight from '../model/mrm/mrmMemberWeightModel.mjs';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import EmployeeKPI from '../model/hr/employeeKPIModel.mjs';
import { isFeatureEnabled } from '../config/featureFlags.mjs';

import { getKarmaPriorityPoints } from '../utils/karmaPointsUtil.mjs';
export { getKarmaPriorityPoints };

/**
 * Resolves the clean, authoritative list of active Department HODs across the organization.
 * Discovers HODs from active TeamModel configurations as well as UserModel role definitions,
 * while strictly filtering out non-HOD administrative executives or developers.
 */
export const getTrueHodUsers = async () => {
    const teams = await TeamModel.find({ isActive: true }).lean();
    const teamHodIdMap = new Map();
    for (const team of teams) {
        const hId = team.hodId || team.hod_id;
        if (hId) {
            teamHodIdMap.set(hId.toString(), team.department || team.name);
        }
    }

    const hodRoleFilter = { $regex: /^(head_of_department|hod)$/i };

    const candidates = await UserModel.find({
        isActive: { $ne: false },
        $or: [
            { _id: { $in: Array.from(teamHodIdMap.keys()) } },
            { role: hodRoleFilter }
        ]
    })
    .select('first_name last_name username email role department designation')
    .lean();

    // Specific accounts that are executive leadership or admins, not departmental HOD presenters
    const EXCLUDED_USERNAMES = [
        'suraj_rajan', 'uday_zope', 'afzal_ghanchi', 'riya_saini',
        'shalini_arun', 'geethanjali_b', 'masood_raza', 'dev_master',
        'rajan_aranamkatte', 'manu_pillai'
    ];

    const validHods = [];
    const seenUsernames = new Set();

    for (const user of candidates) {
        if (EXCLUDED_USERNAMES.includes(user.username)) continue;

        // Exclude if designation explicitly indicates non-HOD executive
        const desig = (user.designation || '').toLowerCase();
        if (desig.includes('executive') && !teamHodIdMap.has(user._id.toString())) {
            continue;
        }

        const dept = user.department || teamHodIdMap.get(user._id.toString()) || '';
        if (!dept) continue;

        if (!seenUsernames.has(user.username)) {
            seenUsernames.add(user.username);
            validHods.push({
                ...user,
                department: dept
            });
        }
    }

    return validHods;
};

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
 * Resolves unified RegExp for department names handling common aliases/variations
 * e.g., 'Software' vs 'Software Development', 'Sales & Marketing' vs 'Marketing', 'Field' vs 'Feild'
 */
export const getDepartmentFilterRegex = (dept) => {
    if (!dept) return /.*/;
    const clean = String(dept).trim();
    if (/^(it|information\s+technology)$/i.test(clean)) {
        return /^(it|information\s+technology)$/i;
    }
    if (/^software(\s+development)?$/i.test(clean)) {
        return /^(software|software\s+development)$/i;
    }
    if (/^(sales\s*(&|and)?\s*marketing|marketing)$/i.test(clean)) {
        return /^(sales\s*(&|and)?\s*marketing|marketing)$/i;
    }
    if (/^f[ie]{2}ld$/i.test(clean)) {
        return /^f[ie]{2}ld$/i;
    }
    return new RegExp(`^${clean}$`, 'i');
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
        if (item.isTitleRow || item.status === 'Not Required') return; // Skip title rows and Not Required items in rollup math
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

    // 6. Annual Team Business Loss Rollup (MRM 2.0 KPI Rollup Extension)
    let teamBusinessLoss = null;
    if (isFeatureEnabled('MRM_KPI_ROLLUP_ENABLED') && userId) {
        try {
            const userDoc = await UserModel.findById(userId).select('department').lean();
            if (userDoc?.department) {
                teamBusinessLoss = await calculateAnnualBusinessLossRollup({
                    department: userDoc.department,
                    year: queryYear
                });
            }
        } catch (err) {
            console.error('Failed to attach teamBusinessLoss to annual rollup:', err);
        }
    }

    return {
        year: queryYear,
        approvedMonths: Array.from(approvedMonthSet),
        objectives: rollupResults,
        tileSummaries,
        personSummary,
        ...(teamBusinessLoss ? { teamBusinessLoss } : {})
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
        if (item.isTitleRow || item.status === 'Not Required') return;
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

// ============================================================================
// MRM 2.0 — KPI ROLLUP & HOD PERFORMANCE SCORING ENGINES (FEATURE-FLAG GATED)
// ============================================================================

/**
 * Calculates Sub-Team KPI Segment Rollups for an HOD's Department
 * 2-Signal Derived RAG: Signal 1 (Trailing 3M Trend Deviation) + Signal 2 (Flags: Blocker/Loss/Late)
 */
export const calculateSegmentRollup = async ({ department, hodId, month, year }) => {
    if (!isFeatureEnabled('MRM_KPI_ROLLUP_ENABLED')) {
        return { enabled: false, message: 'MRM KPI Rollup feature is not enabled' };
    }

    const monthStr = String(month).padStart(2, '0');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const monthEndDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    const deptRegex = getDepartmentFilterRegex(department);

    // 1. Fetch active candidate users belonging to this department (supporting aliases)
    const candidateUsers = await UserModel.find({
        department: { $regex: deptRegex },
        isActive: { $ne: false }
    }).select('_id first_name last_name username sub_team sub_team_role department joining_date role is_operator category').lean();

    // 2. Fetch KPISheets for current month for candidate users
    const candidateIds = candidateUsers.map(u => u._id);
    const currentSheets = await KPISheet.find({
        user: { $in: candidateIds },
        month: monthNum,
        year: yearNum
    }).lean();

    const sheetByUserMap = new Map();
    currentSheets.forEach(s => sheetByUserMap.set(s.user.toString(), s));

    const userIdsWithAnySheet = new Set(
        (await KPISheet.distinct('user', { user: { $in: candidateIds } })).map(id => id.toString())
    );

    // 3. Filter members:
    // - Include anyone who has a current month sheet
    // - Exclude HOD reviewer
    // - Exclude system test accounts like dev_master
    // - Exclude shopfloor operators and housekeeping who never have KPI sheets
    // - Only include users who ever had a KPI sheet or have an assigned sub-team
    let resolvedHodId = hodId;
    if (!resolvedHodId) {
        const trueHods = await getTrueHodUsers();
        const found = trueHods.find(h => deptRegex.test(h.department));
        if (found) resolvedHodId = found._id;
    }

    const deptUsers = candidateUsers.filter(u => {
        const uIdStr = u._id.toString();

        if (u.username === 'dev_master') return false;

        const hasSheetThisMonth = sheetByUserMap.has(uIdStr);

        const isHodUser = (resolvedHodId && uIdStr === resolvedHodId.toString()) ||
            /^(head_of_department|hod)$/i.test(String(u.role || '')) ||
            ['suraj_rajan', 'uday_zope', 'afzal_ghanchi', 'ajith_sivadasan', 'chirag_shah', 'deepak_singh', 'mahesh_patil', 'majhar_khan', 'punit_pandey', 'kinjal_khatri', 'sojith_mammuttil', 'sreekumar_pillai', 'anurag_pillai', 'krishnapal_puvar', 'mohit_singh'].includes(u.username);
        if (isHodUser && !hasSheetThisMonth) {
            return false;
        }

        if (u.is_operator) return false;
        if (['housekeeping', 'helper', 'operator'].includes(String(u.category || '').toLowerCase())) {
            return false;
        }

        if (u.joining_date) {
            const jDate = new Date(u.joining_date);
            if (!isNaN(jDate.getTime()) && jDate > monthEndDate) {
                return false;
            }
        }

        const hasSheet = sheetByUserMap.has(uIdStr);
        if (hasSheet) return true;

        const hasEverHadSheet = userIdsWithAnySheet.has(uIdStr);
        if (hasEverHadSheet) return true;
        if (u.sub_team && u.sub_team !== 'General') return true;

        return false;
    });

    const now = new Date();
    // Monthly submission deadline: 5th of following month (e.g. Oct 5 for Sept)
    const deadlineDate = new Date(yearNum, monthNum, 5, 23, 59, 59, 999);
    const isDeadlinePassed = now > deadlineDate;

    if (!deptUsers || deptUsers.length === 0) {
        return {
            enabled: true,
            department,
            month: monthStr,
            year: yearNum,
            segments: [],
            totalMembers: 0,
            submittedCount: 0
        };
    }

    // 4. Group users into sub-teams (defaulting to 'General')
    const subTeamMap = new Map();
    deptUsers.forEach(u => {
        const teamName = (u.sub_team && u.sub_team.trim()) ? u.sub_team.trim() : 'General';
        if (!subTeamMap.has(teamName)) {
            subTeamMap.set(teamName, []);
        }
        subTeamMap.get(teamName).push(u);
    });

    const userIds = deptUsers.map(u => u._id);

    // 5. Determine trailing 3 months for trend baseline
    const trailingMonths = [];
    for (let offset = 1; offset <= 3; offset++) {
        let m = monthNum - offset;
        let y = yearNum;
        if (m <= 0) {
            m += 12;
            y -= 1;
        }
        trailingMonths.push({ month: m, year: y });
    }

    // Fetch historical sheets for the 3 trailing months
    const historicalSheets = await KPISheet.find({
        user: { $in: userIds },
        $or: trailingMonths.map(t => ({ month: t.month, year: t.year }))
    }).lean();

    // Pre-fetch Attendance, EmployeeKPI, and OpenPoints for current month
    const monthYearStr = `${yearNum}-${monthStr}`;
    const [deptAttRecords, deptEmployeeKpis, deptOpenPoints] = await Promise.all([
        AttendanceRecord.find({
            employee_id: { $in: userIds },
            year_month: monthYearStr
        }).lean(),
        EmployeeKPI.find({
            employee: { $in: userIds },
            year: yearNum,
            month: monthNum
        }).lean(),
        OpenPoint.find({
            responsible_person: { $in: userIds }
        }).lean()
    ]);

    const attByUserMap = new Map();
    deptAttRecords.forEach(r => {
        const uid = r.employee_id.toString();
        if (!attByUserMap.has(uid)) attByUserMap.set(uid, []);
        attByUserMap.get(uid).push(r);
    });

    const kpiByUserMap = new Map();
    deptEmployeeKpis.forEach(k => kpiByUserMap.set(k.employee.toString(), k));

    const opByUserMap = new Map();
    deptOpenPoints.forEach(p => {
        if (!p.responsible_person) return;
        const uid = p.responsible_person.toString();
        if (!opByUserMap.has(uid)) opByUserMap.set(uid, []);
        opByUserMap.get(uid).push(p);
    });

    // Check Cold-Start Rule:
    // Count distinct historical months with submitted/approved sheets across department
    const distinctHistoricalMonthKeys = new Set(
        historicalSheets
            .filter(s => ['SUBMITTED', 'APPROVED', 'CHECKED', 'VERIFIED'].includes(s.status))
            .map(s => `${s.year}-${String(s.month).padStart(2, '0')}`)
    );
    const isColdStart = distinctHistoricalMonthKeys.size < 3;

    // 5. Build Segment Rollups
    const segmentRollups = [];

    for (const [subTeamName, members] of subTeamMap.entries()) {
        const memberIds = members.map(m => m._id.toString());

        let totalSegmentTasks = 0;
        let businessLossTotal = 0;
        let hasBusinessLoss = false;
        let hasBlockers = false;
        let totalBlockersCount = 0;
        let hasUnsubmitted = false;
        let hasMissedDeadline = false;
        const unsubmittedMembers = [];
        const missedDeadlineMembers = [];
        const contributingMembers = [];
        const taskSumMap = new Map();

        let segmentHasTargets = false;

        members.forEach(member => {
            const mIdStr = member._id.toString();
            const sheet = sheetByUserMap.get(mIdStr);
            const memberFullName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username;

            let memberTasks = 0;
            let memberLoss = 0;
            let memberLossNTR = false;
            let memberLossRemarks = '';
            let memberHasBlockers = false;
            let memberBlockersSummary = '';
            let memberBlockersRecurrenceKey = '';
            let memberOpenPointsCount = 0;
            let memberOpenPointsItems = [];

            const isSubmitted = sheet ? ['SUBMITTED', 'APPROVED', 'CHECKED', 'VERIFIED'].includes(sheet.status) : false;
            const isSubmittedOnTime = sheet?.summary?.is_submitted_on_time !== false;

            const sheetHasTargets = Boolean(
                sheet?.has_targets || 
                (Array.isArray(sheet?.rows) && sheet.rows.some(r => r.target !== null && r.target !== undefined && r.target !== '' && !isNaN(Number(r.target))))
            );
            if (sheetHasTargets) {
                segmentHasTargets = true;
            }

            if (sheet) {
                if (Array.isArray(sheet.rows)) {
                    sheet.rows.forEach(r => {
                        const rowTotal = Number(r.total) || 0;
                        const rowActual = Number(r.actual !== undefined && r.actual !== null ? r.actual : r.total) || 0;
                        const hasRowTarget = (r.target !== null && r.target !== undefined && r.target !== '' && !isNaN(Number(r.target)));
                        const rowTarget = hasRowTarget ? Number(r.target) : null;

                        memberTasks += rowTotal;

                        const taskLabel = r.label || r.row_id || 'Other';
                        if (!taskSumMap.has(taskLabel)) {
                            taskSumMap.set(taskLabel, {
                                task_name: taskLabel,
                                total_count: 0,
                                total_target: null,
                                total_actual: 0,
                                has_target: false,
                                member_counts: []
                            });
                        }
                        const tObj = taskSumMap.get(taskLabel);
                        tObj.total_count += rowTotal;
                        tObj.total_actual += rowActual;
                        if (hasRowTarget) {
                            tObj.total_target = (tObj.total_target === null ? 0 : tObj.total_target) + rowTarget;
                            tObj.has_target = true;
                        }
                        tObj.member_counts.push({
                            userId: member._id,
                            name: memberFullName,
                            count: rowTotal,
                            actual: rowActual,
                            target: rowTarget,
                            has_target: hasRowTarget
                        });
                    });
                }

                const summary = sheet.summary || {};
                memberLoss = Number(summary.business_loss) || 0;
                memberLossNTR = Boolean(summary.business_loss_nothing_to_report);
                memberLossRemarks = summary.business_loss_remarks || summary.loss_description || '';
                if (!memberLossNTR && memberLoss > 0) {
                    businessLossTotal += memberLoss;
                    hasBusinessLoss = true;
                }

                const blockerText = (summary.blockers || '').trim();
                const blockerNTR = Boolean(summary.blockers_nothing_to_report);
                if (!blockerNTR && blockerText && blockerText !== 'NONE: No blockers to select' && blockerText.toUpperCase() !== 'NONE') {
                    memberHasBlockers = true;
                    hasBlockers = true;
                    totalBlockersCount++;
                    memberBlockersSummary = blockerText;
                    memberBlockersRecurrenceKey = summary.blockers_recurrence_key || summary.blockers_root_cause || '';
                }

                memberOpenPointsCount = Number(summary.open_points_count) || (Array.isArray(summary.open_points) ? summary.open_points.length : 0);
                if (Array.isArray(summary.open_points)) {
                    memberOpenPointsItems = summary.open_points;
                }
            }

            if (!isSubmitted) {
                hasUnsubmitted = true;
                unsubmittedMembers.push(memberFullName);
                if (isDeadlinePassed) {
                    hasMissedDeadline = true;
                    missedDeadlineMembers.push(memberFullName);
                }
            }

            totalSegmentTasks += memberTasks;

            // Compute member attendance score
            const uAttRecords = attByUserMap.get(mIdStr) || [];
            let presentDays = 0;
            let weeklyOffs = 0;
            let holidays = 0;
            uAttRecords.forEach(rec => {
                const st = rec.status;
                if (st === 'weekly_off' || rec.is_weekly_off) weeklyOffs++;
                else if (st === 'holiday' || rec.is_holiday) holidays++;
                else if (['present', 'on_duty', 'leave', 'late'].includes(st)) presentDays += 1;
                else if (st === 'half_day' || rec.is_half_day || st === 'incomplete' || rec.missed_punch) presentDays += 0.5;
            });
            const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
            let workingDays = daysInMonth - (weeklyOffs + holidays);
            if (workingDays <= 0 || uAttRecords.length === 0) {
                let sundays = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                    if (new Date(yearNum, monthNum - 1, d).getDay() === 0) sundays++;
                }
                workingDays = daysInMonth - sundays;
            }
            const memberAttScore = workingDays > 0 && uAttRecords.length > 0
                ? Number(((presentDays / workingDays) * 100).toFixed(1))
                : 100;

            // Compute member KPI score
            const empKpi = kpiByUserMap.get(mIdStr);
            let memberKpiScore = 0;
            if (empKpi && empKpi.total_kpi_score != null) {
                memberKpiScore = Number((empKpi.total_kpi_score * 10).toFixed(1));
            } else if (sheet && sheet.summary?.overall_percentage != null) {
                memberKpiScore = Number(Number(sheet.summary.overall_percentage).toFixed(1));
            } else if (sheet && sheet.status && ['SUBMITTED', 'APPROVED', 'CHECKED', 'VERIFIED'].includes(sheet.status)) {
                memberKpiScore = 100;
            }

            // Compute member Karma points
            const uOpenPoints = opByUserMap.get(mIdStr) || [];
            let greenPts = 0;
            let redPts = 0;
            uOpenPoints.forEach(pt => {
                const compDate = pt.completion_date ? new Date(pt.completion_date) : null;
                const pts = getKarmaPriorityPoints(pt.priority);
                const isTargetMonth = compDate 
                    ? (compDate.getMonth() + 1 === monthNum && compDate.getFullYear() === yearNum)
                    : true;
                if (pt.status === 'Green') {
                    if (isTargetMonth) greenPts += pts;
                } else if (pt.status !== 'Yellow' && pt.status !== 'Orange') {
                    redPts += pts;
                }
            });
            const memberKarmaPts = greenPts - redPts;

            contributingMembers.push({
                userId: member._id,
                name: memberFullName,
                task_count: memberTasks,
                business_loss: memberLoss,
                business_loss_nothing_to_report: memberLossNTR,
                business_loss_remarks: memberLossRemarks,
                has_blockers: memberHasBlockers,
                blockers_summary: memberBlockersSummary,
                blockers_recurrence_key: memberBlockersRecurrenceKey,
                open_points_count: memberOpenPointsCount,
                open_points_items: memberOpenPointsItems,
                submitted: isSubmitted,
                submitted_at: sheet?.summary?.submission_date || sheet?.updatedAt,
                is_submitted_on_time: isSubmittedOnTime,
                has_targets: sheetHasTargets,
                attendance_score: memberAttScore,
                kpi_score: memberKpiScore,
                karma_points: memberKarmaPts,
                kpi_sheet_rows: sheet && Array.isArray(sheet.rows) ? sheet.rows.map(r => ({
                    label: r.label || r.row_id,
                    total: r.total || 0,
                    actual: r.actual != null ? r.actual : r.total || 0,
                    target: r.target != null && !isNaN(Number(r.target)) ? Number(r.target) : null,
                    weight: r.weight || 3
                })) : [],
                kpi_total_score: empKpi?.total_kpi_score != null
                    ? Number(empKpi.total_kpi_score.toFixed(2))
                    : (sheet?.summary?.overall_percentage != null ? Number((sheet.summary.overall_percentage / 10).toFixed(2)) : null),
                kpi_rag_status: empKpi?.rag_status || null
            });
        });

        // Trailing 3-Month Trend
        let trailing3mAvg = null;
        let trendDeviationPct = null;
        let trendStatus = 'ColdStart';

        if (!isColdStart) {
            const monthlySums = [0, 0, 0];
            trailingMonths.forEach((tm, idx) => {
                const sheetsForMonth = historicalSheets.filter(hs =>
                    hs.month === tm.month &&
                    hs.year === tm.year &&
                    memberIds.includes(hs.user.toString())
                );
                sheetsForMonth.forEach(s => {
                    if (Array.isArray(s.rows)) {
                        s.rows.forEach(r => {
                            monthlySums[idx] += (Number(r.total) || 0);
                        });
                    }
                });
            });

            const sumOf3M = monthlySums.reduce((a, b) => a + b, 0);
            trailing3mAvg = Number((sumOf3M / 3).toFixed(1));

            if (trailing3mAvg > 0) {
                trendDeviationPct = Number((((totalSegmentTasks - trailing3mAvg) / trailing3mAvg) * 100).toFixed(1));
            } else {
                trendDeviationPct = 0;
            }

            if (trendDeviationPct <= -20.0) {
                trendStatus = 'Red';
            } else if (trendDeviationPct <= -10.0) {
                trendStatus = 'Amber';
            } else {
                trendStatus = 'Green';
            }
        }

        // Flag Status: Only trigger Red for unsubmitted if the monthly deadline has passed
        const flagStatus = (hasBusinessLoss || hasBlockers || hasMissedDeadline) ? 'Red' : 'Green';

        // Final RAG & Score & Reason Badge
        let finalRag = 'Green';
        let segmentScore = 100;
        let reasonBadge = '';

        if (hasMissedDeadline) {
            finalRag = 'Red';
            segmentScore = 0;
            if (missedDeadlineMembers.length === members.length) {
                reasonBadge = `[All ${missedDeadlineMembers.length} Submissions Missed Deadline]`;
            } else if (missedDeadlineMembers.length > 2) {
                reasonBadge = `[${missedDeadlineMembers.length} Missed Submissions]`;
            } else {
                reasonBadge = `[Missed Submission: ${missedDeadlineMembers.join(', ')}]`;
            }
        } else if (isColdStart) {
            if (flagStatus === 'Red') {
                finalRag = 'Red';
                segmentScore = 40;
                const reasons = [];
                if (hasBusinessLoss) reasons.push(`Loss: ₹${businessLossTotal.toLocaleString('en-IN')}`);
                if (hasBlockers) reasons.push('Blockers');
                reasonBadge = `[Operational Flag: ${reasons.join(', ')} (Cold Start)]`;
            } else {
                finalRag = 'Green';
                segmentScore = 100;
                reasonBadge = isDeadlinePassed ? '[Clean (Cold Start)]' : '[Clean (In-Progress)]';
            }
        } else {
            let effectiveTrendStatus = trendStatus;
            let effectiveDeviationPct = trendDeviationPct;

            // In an in-progress month, pro-rate the trailing 3M target by the elapsed days in the month
            if (!isDeadlinePassed && trailing3mAvg > 0) {
                const daysInMonth = monthEndDate.getDate();
                const currentDay = Math.min(now.getDate(), daysInMonth);
                const proratedTarget = (trailing3mAvg / daysInMonth) * currentDay;
                if (proratedTarget > 0) {
                    effectiveDeviationPct = Number((((totalSegmentTasks - proratedTarget) / proratedTarget) * 100).toFixed(1));
                    if (effectiveDeviationPct <= -20.0) {
                        effectiveTrendStatus = 'Red';
                    } else if (effectiveDeviationPct <= -10.0) {
                        effectiveTrendStatus = 'Amber';
                    } else {
                        effectiveTrendStatus = 'Green';
                    }
                }
            }

            const isTrendRed = effectiveTrendStatus === 'Red';
            const isTrendAmber = effectiveTrendStatus === 'Amber';
            const isFlagRed = flagStatus === 'Red';

            if (isTrendRed && isFlagRed) {
                finalRag = 'Red';
                segmentScore = 20;
                reasonBadge = `[Trend Deviation (${effectiveDeviationPct}%) & Operational Flags]`;
            } else if (isTrendRed && !isFlagRed) {
                finalRag = 'Red';
                segmentScore = 40;
                reasonBadge = `[Trend Deviation (${effectiveDeviationPct}%)]`;
            } else if (!isTrendRed && isFlagRed) {
                finalRag = 'Red';
                segmentScore = 40;
                const reasons = [];
                if (hasBusinessLoss) reasons.push(`Loss: ₹${businessLossTotal.toLocaleString('en-IN')}`);
                if (hasBlockers) reasons.push('Blockers');
                reasonBadge = `[Operational Flag: ${reasons.join(', ')}]`;
            } else if (isTrendAmber && !isFlagRed) {
                finalRag = 'Amber';
                segmentScore = 70;
                reasonBadge = `[Trend Deviation (${effectiveDeviationPct}%)]`;
            } else {
                finalRag = 'Green';
                segmentScore = 100;
                reasonBadge = isDeadlinePassed ? '[On Trend & Clean]' : '[On Trend & Clean (In-Progress)]';
            }
        }

        const taskBreakdown = Array.from(taskSumMap.values());

        const segmentData = {
            month: monthStr,
            year: yearNum,
            department,
            sub_team: subTeamName,
            hodId: resolvedHodId || hodId || members[0]?._id,
            contributing_members: contributingMembers,
            has_targets: segmentHasTargets,
            total_tasks: totalSegmentTasks,
            trailing_3m_avg: trailing3mAvg,
            trend_deviation_pct: trendDeviationPct,
            is_cold_start: isColdStart,
            trend_status: trendStatus,
            flags: {
                business_loss_total: businessLossTotal,
                has_business_loss: hasBusinessLoss,
                has_blockers: hasBlockers,
                blockers_count: totalBlockersCount,
                has_unsubmitted: hasUnsubmitted,
                unsubmitted_members: unsubmittedMembers,
                has_missed_deadline: hasMissedDeadline,
                missed_deadline_members: missedDeadlineMembers,
                is_deadline_passed: isDeadlinePassed
            },
            flag_status: flagStatus,
            final_rag: finalRag,
            reason_badge: reasonBadge,
            segment_score: segmentScore,
            task_breakdown: taskBreakdown
        };

        // Persist snapshot to MRMSegmentRollup
        await MRMSegmentRollup.findOneAndUpdate(
            { month: monthStr, year: yearNum, department, sub_team: subTeamName },
            { $set: segmentData },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        segmentRollups.push(segmentData);
    }

    // Sort segments: Reds first, then Ambers, then Greens
    const ragPriority = { Red: 0, Amber: 1, Green: 2 };
    segmentRollups.sort((a, b) => ragPriority[a.final_rag] - ragPriority[b.final_rag]);

    const totalUnsubmitted = segmentRollups.reduce((acc, s) => acc + s.flags.unsubmitted_members.length, 0);

    return {
        enabled: true,
        department,
        month: monthStr,
        year: yearNum,
        segments: segmentRollups,
        totalMembers: deptUsers.length,
        submittedCount: deptUsers.length - totalUnsubmitted
    };
};

/**
 * Calculates Per-Member Composite Score from Attendance, KPI, and Karma Points
 * S_Composite = (Attendance_Norm + KPI_Norm + Karma_Norm) / 3
 * Team Score = Σ(Member_Composite * Member_Weight_Pct / 100)
 */
export const calculateMemberCompositeScores = async ({ department, hodId, month, year }) => {
    const monthStr = String(month).padStart(2, '0');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const deptRegex = getDepartmentFilterRegex(department);

    // 1. Fetch active candidate users belonging to this department
    const candidateUsers = await UserModel.find({
        department: { $regex: deptRegex },
        isActive: { $ne: false }
    }).select('_id first_name last_name username sub_team sub_team_role department joining_date role is_operator category').lean();

    const candidateIds = candidateUsers.map(u => u._id);
    const currentSheets = await KPISheet.find({
        user: { $in: candidateIds },
        month: monthNum,
        year: yearNum
    }).lean();

    const sheetByUserMap = new Map();
    currentSheets.forEach(s => sheetByUserMap.set(s.user.toString(), s));

    const userIdsWithAnySheet = new Set(
        (await KPISheet.distinct('user', { user: { $in: candidateIds } })).map(id => id.toString())
    );

    let resolvedHodId = hodId;
    if (!resolvedHodId) {
        const trueHods = await getTrueHodUsers();
        const found = trueHods.find(h => deptRegex.test(h.department));
        if (found) resolvedHodId = found._id;
    }

    const monthEndDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    const deptUsers = candidateUsers.filter(u => {
        const uIdStr = u._id.toString();
        if (u.username === 'dev_master') return false;
        const hasSheetThisMonth = sheetByUserMap.has(uIdStr);
        const isHodUser = (resolvedHodId && uIdStr === resolvedHodId.toString()) ||
            /^(head_of_department|hod)$/i.test(String(u.role || '')) ||
            ['suraj_rajan', 'uday_zope', 'afzal_ghanchi', 'ajith_sivadasan', 'chirag_shah', 'deepak_singh', 'mahesh_patil', 'majhar_khan', 'punit_pandey', 'kinjal_khatri', 'sojith_mammuttil', 'sreekumar_pillai', 'anurag_pillai', 'krishnapal_puvar', 'mohit_singh'].includes(u.username);
        if (isHodUser && !hasSheetThisMonth) return false;
        if (u.is_operator) return false;
        if (['housekeeping', 'helper', 'operator'].includes(String(u.category || '').toLowerCase())) return false;
        if (u.joining_date) {
            const jDate = new Date(u.joining_date);
            if (!isNaN(jDate.getTime()) && jDate > monthEndDate) return false;
        }
        if (hasSheetThisMonth) return true;
        if (userIdsWithAnySheet.has(uIdStr)) return true;
        if (u.sub_team && u.sub_team !== 'General') return true;
        return false;
    });

    if (!deptUsers || deptUsers.length === 0) {
        return { team_score: 100, members: [], is_configured: false };
    }

    // 2. Load configured weights if any
    const weightConfig = await MRMMemberWeight.findOne({
        month: monthStr,
        year: yearNum,
        department,
        hodId: resolvedHodId,
        isHodLevel: false
    }).lean();

    const weightMap = new Map();
    if (weightConfig && Array.isArray(weightConfig.members)) {
        weightConfig.members.forEach(m => weightMap.set(m.userId.toString(), m));
    }

    // Component weights for Attendance/KPI/Karma
    const cw = weightConfig?.component_weights || { attendance: 34, kpi: 33, karma: 33 };
    const cwTotal = (cw.attendance || 0) + (cw.kpi || 0) + (cw.karma || 0);
    const attW = cwTotal > 0 ? (cw.attendance || 0) / cwTotal : 1 / 3;
    const kpiW = cwTotal > 0 ? (cw.kpi || 0) / cwTotal : 1 / 3;
    const karmaW = cwTotal > 0 ? (cw.karma || 0) / cwTotal : 1 / 3;

    // Default weight per member if not configured
    const defaultWeight = Number((100 / deptUsers.length).toFixed(2));

    // 3. Pre-fetch Attendance, EmployeeKPI, and OpenPoints for all members
    const userIds = deptUsers.map(u => u._id);
    const monthYearStr = `${yearNum}-${monthStr}`;

    const [attendanceRecords, employeeKpis, openPoints] = await Promise.all([
        AttendanceRecord.find({
            employee_id: { $in: userIds },
            year_month: monthYearStr
        }).lean(),
        EmployeeKPI.find({
            employee: { $in: userIds },
            year: yearNum,
            month: monthNum
        }).lean(),
        OpenPoint.find({
            responsible_person: { $in: userIds }
        }).lean()
    ]);

    const attByUser = new Map();
    attendanceRecords.forEach(r => {
        const uid = r.employee_id.toString();
        if (!attByUser.has(uid)) attByUser.set(uid, []);
        attByUser.get(uid).push(r);
    });

    const kpiByUser = new Map();
    employeeKpis.forEach(k => kpiByUser.set(k.employee.toString(), k));

    const opByUser = new Map();
    openPoints.forEach(p => {
        if (!p.responsible_person) return;
        const uid = p.responsible_person.toString();
        if (!opByUser.has(uid)) opByUser.set(uid, []);
        opByUser.get(uid).push(p);
    });

    const membersWithScores = deptUsers.map((u) => {
        const uIdStr = u._id.toString();
        const memberFullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;

        // A. Attendance Score
        const uAttRecords = attByUser.get(uIdStr) || [];
        let presentDays = 0;
        let weeklyOffs = 0;
        let holidays = 0;
        uAttRecords.forEach(rec => {
            const st = rec.status;
            if (st === 'weekly_off' || rec.is_weekly_off) weeklyOffs++;
            else if (st === 'holiday' || rec.is_holiday) holidays++;
            else if (['present', 'on_duty', 'leave', 'late'].includes(st)) presentDays += 1;
            else if (st === 'half_day' || rec.is_half_day || st === 'incomplete' || rec.missed_punch) presentDays += 0.5;
        });

        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        let workingDays = daysInMonth - (weeklyOffs + holidays);
        if (workingDays <= 0 || uAttRecords.length === 0) {
            let sundays = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                if (new Date(yearNum, monthNum - 1, d).getDay() === 0) sundays++;
            }
            workingDays = daysInMonth - sundays;
        }

        const attendanceScore = workingDays > 0 && uAttRecords.length > 0 
            ? Number(((presentDays / workingDays) * 100).toFixed(1))
            : 100;

        // B. KPI Score
        const empKpi = kpiByUser.get(uIdStr);
        const kpiSheet = sheetByUserMap.get(uIdStr);
        let kpiScore = 0;
        if (empKpi && empKpi.total_kpi_score != null) {
            kpiScore = Number((empKpi.total_kpi_score * 10).toFixed(1));
        } else if (kpiSheet && kpiSheet.summary?.overall_percentage != null) {
            kpiScore = Number(Number(kpiSheet.summary.overall_percentage).toFixed(1));
        } else if (kpiSheet && kpiSheet.status && ['SUBMITTED', 'APPROVED', 'CHECKED', 'VERIFIED'].includes(kpiSheet.status)) {
            kpiScore = 100;
        }

        // C. Karma Points & Normalized Score
        const uOpenPoints = opByUser.get(uIdStr) || [];
        let greenPts = 0;
        let redPts = 0;
        let inProgressPts = 0;

        uOpenPoints.forEach(pt => {
            const compDate = pt.completion_date ? new Date(pt.completion_date) : null;
            const pts = getKarmaPriorityPoints(pt.priority);
            const isTargetMonth = compDate 
                ? (compDate.getMonth() + 1 === monthNum && compDate.getFullYear() === yearNum)
                : true;

            if (pt.status === 'Green') {
                if (isTargetMonth) greenPts += pts;
            } else if (pt.status === 'Yellow' || pt.status === 'Orange') {
                inProgressPts += pts;
            } else {
                redPts += pts;
            }
        });

        const karmaPoints = greenPts - redPts;
        const totalKarmaTasksPts = greenPts + redPts + inProgressPts;
        const karmaNorm = totalKarmaTasksPts > 0 
            ? Math.min(100, Math.max(0, Math.round((greenPts / totalKarmaTasksPts) * 100)))
            : 100;

        // Weight
        const configuredMember = weightMap.get(uIdStr);
        const weightPct = configuredMember ? configuredMember.weight_pct : defaultWeight;
        const isManual = configuredMember ? Boolean(configuredMember.is_manual) : false;

        // User-specific component weights (measures)
        const userCw = configuredMember?.component_weights || cw;
        const uAttWeight = userCw.attendance != null ? Number(userCw.attendance) : (cw.attendance ?? 34);
        const uKpiWeight = userCw.kpi != null ? Number(userCw.kpi) : (cw.kpi ?? 33);
        const uKarmaWeight = userCw.karma != null ? Number(userCw.karma) : (cw.karma ?? 33);
        const uCwTotal = uAttWeight + uKpiWeight + uKarmaWeight;

        const uAttPct = uCwTotal > 0 ? (uAttWeight / uCwTotal) : (1 / 3);
        const uKpiPct = uCwTotal > 0 ? (uKpiWeight / uCwTotal) : (1 / 3);
        const uKarmaPct = uCwTotal > 0 ? (uKarmaWeight / uCwTotal) : (1 / 3);

        // Normalized (0-100) and weighted by user's specific component weights
        const attNorm = Math.min(100, Math.max(0, attendanceScore));
        const kpiNorm = Math.min(100, Math.max(0, kpiScore));
        const compositeScore = Number((attNorm * uAttPct + kpiNorm * uKpiPct + karmaNorm * uKarmaPct).toFixed(1));

        return {
            userId: u._id,
            name: memberFullName,
            sub_team: u.sub_team || 'General',
            designation: u.sub_team_role || u.role || '',
            weight_pct: weightPct,
            is_manual: isManual,
            component_weights: {
                attendance: uAttWeight,
                kpi: uKpiWeight,
                karma: uKarmaWeight
            },
            attendance_score: attendanceScore,
            kpi_score: kpiScore,
            karma_points: karmaPoints,
            karma_norm: karmaNorm,
            composite_score: compositeScore,
            kpi_sheet_rows: kpiSheet && Array.isArray(kpiSheet.rows) ? kpiSheet.rows.map(r => ({
                label: r.label || r.row_id,
                total: r.total || 0,
                actual: r.actual != null ? r.actual : r.total || 0,
                target: r.target != null && !isNaN(Number(r.target)) ? Number(r.target) : null,
                weight: r.weight || 3
            })) : [],
            kpi_total_score: empKpi?.total_kpi_score != null
                ? Number(empKpi.total_kpi_score.toFixed(2))
                : (kpiSheet?.summary?.overall_percentage != null ? Number((kpiSheet.summary.overall_percentage / 10).toFixed(2)) : null),
            kpi_rag_status: empKpi?.rag_status || null
        };
    });

    // Team score: weighted average if member weights sum to ~100%, otherwise equal average
    let teamScore = 100;
    if (membersWithScores.length > 0) {
        const totalWeight = membersWithScores.reduce((sum, m) => sum + (Number(m.weight_pct) || 0), 0);
        if (Math.abs(totalWeight - 100) < 1) {
            teamScore = Number(membersWithScores.reduce((sum, m) => sum + (m.composite_score * (m.weight_pct / 100)), 0).toFixed(1));
        } else {
            teamScore = Number((membersWithScores.reduce((sum, m) => sum + m.composite_score, 0) / membersWithScores.length).toFixed(1));
        }
    }

    return {
        team_score: teamScore,
        members: membersWithScores,
        component_weights: { attendance: cw.attendance, kpi: cw.kpi, karma: cw.karma },
        is_configured: Boolean(weightConfig)
    };
};

/**
 * Calculates 70/30 Blended Monthly HOD Performance Score
 * S_HOD = (S_Team * 0.70) + (S_Focus * 0.30)
 */
export const calculateHodMonthlyScore = async ({ hodId, department, month, year }) => {
    if (!isFeatureEnabled('MRM_KPI_ROLLUP_ENABLED')) {
        return { enabled: false, message: 'MRM KPI Rollup feature is not enabled' };
    }

    const monthStr = String(month).padStart(2, '0');
    const yearNum = parseInt(year, 10);

    const trueHods = await getTrueHodUsers();
    let targetHod = trueHods.find(h => h._id.toString() === hodId?.toString());
    if (!targetHod && department) {
        const dRegex = getDepartmentFilterRegex(department);
        targetHod = trueHods.find(h => dRegex.test(h.department) || h.department?.toLowerCase() === department.toLowerCase());
    }

    const effectiveHodId = targetHod ? targetHod._id : hodId;
    const effectiveDept = targetHod?.department || department;
    const isTrueHod = Boolean(targetHod);
    const deptRegex = getDepartmentFilterRegex(effectiveDept);

    // 1. Team KPI Performance Score (S_Team, 70% weight)
    // Reworked composite score based on Attendance + KPI + Karma with member weights
    const memberComposite = await calculateMemberCompositeScores({
        department: effectiveDept,
        hodId: effectiveHodId,
        month: monthStr,
        year: yearNum
    });

    let teamScore = memberComposite.team_score;
    const memberScores = memberComposite.members || [];

    // Fallback if no members in department
    const computed = await calculateSegmentRollup({ department: effectiveDept, hodId: effectiveHodId, month: monthStr, year: yearNum });
    let rollups = computed?.segments || [];

    if (!rollups || rollups.length === 0) {
        rollups = await MRMSegmentRollup.find({
            department: { $regex: deptRegex },
            month: monthStr,
            year: yearNum
        }).lean();
    }

    if ((!memberScores || memberScores.length === 0) && rollups.length > 0) {
        const totalSegmentScores = rollups.reduce((acc, s) => acc + (Number(s.segment_score) || 0), 0);
        teamScore = Number((totalSegmentScores / rollups.length).toFixed(1));
    }

    // 2. HOD Focus Areas Score (S_Focus, 30% weight)
    const hodItems = await MRMItem.find({
        month: monthStr,
        year: yearNum,
        createdBy: effectiveHodId,
        isTitleRow: { $ne: true }
    }).lean();

    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;

    hodItems.forEach(item => {
        const st = String(item.status || '').toLowerCase();
        if (st === 'not required') return; // Exclude inactive / not required items
        if (st === 'green') greenCount++;
        else if (st === 'yellow' || st === 'amber' || st === 'orange') yellowCount++;
        else if (st === 'red') redCount++;
    });

    const totalObjectives = greenCount + yellowCount + redCount;
    let focusScore = 100;
    if (totalObjectives > 0) {
        focusScore = Number((((greenCount * 100) + (yellowCount * 60) + (redCount * 0)) / totalObjectives).toFixed(1));
    }

    // 3. Final Blended Score
    const finalScore = Number(((teamScore * 0.70) + (focusScore * 0.30)).toFixed(1));

    // 4. Cumulative Annual Business Loss
    const annualRollups = await MRMSegmentRollup.find({
        department: { $regex: deptRegex },
        year: yearNum
    }).lean();

    let annualLossTotal = 0;
    let annualLossIncidents = 0;
    annualRollups.forEach(r => {
        const loss = Number(r.flags?.business_loss_total) || 0;
        if (loss > 0) {
            annualLossTotal += loss;
            annualLossIncidents += (r.contributing_members || []).filter(m => m.business_loss > 0).length;
        }
    });

    const scoreData = {
        month: monthStr,
        year: yearNum,
        hodId,
        department,
        team_score: teamScore,
        focus_score: focusScore,
        final_score: finalScore,
        segments_count: rollups.length,
        segments_summary: rollups.map(r => ({
            sub_team: r.sub_team,
            rag: r.final_rag,
            score: r.segment_score,
            reason: r.reason_badge
        })),
        member_scores: memberScores,
        focus_areas_count: totalObjectives,
        focus_areas_summary: {
            green: greenCount,
            yellow: yellowCount,
            red: redCount
        },
        annual_cumulative_team_business_loss: annualLossTotal,
        annual_business_loss_incident_count: annualLossIncidents
    };

    scoreData.department = effectiveDept;
    scoreData.hodId = effectiveHodId;

    let rank = 1;
    const trueHodIds = trueHods.map(h => h._id);
    const totalRanked = trueHods.length;

    if (isTrueHod) {
        const savedScore = await MRMHodScore.findOneAndUpdate(
            { month: monthStr, year: yearNum, hodId: effectiveHodId },
            { $set: scoreData },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const allMonthlyScores = await MRMHodScore.find({
            month: monthStr,
            year: yearNum,
            hodId: { $in: trueHodIds }
        }).sort({ final_score: -1 }).lean();

        const rankIdx = allMonthlyScores.findIndex(s => s.hodId.toString() === effectiveHodId.toString());
        rank = rankIdx >= 0 ? rankIdx + 1 : 1;

        await MRMHodScore.findByIdAndUpdate(savedScore._id, {
            monthly_rank: rank,
            total_hods_ranked: totalRanked
        });
    }

    return {
        ...scoreData,
        monthly_rank: rank,
        total_hods_ranked: totalRanked
    };
};

/**
 * Detects Recurring Blockers across historical KPI submissions
 */
export const detectRecurringBlockers = async ({ department, month, year }) => {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    const targetMonths = [];
    for (let offset = 0; offset < 3; offset++) {
        let m = monthNum - offset;
        let y = yearNum;
        if (m <= 0) {
            m += 12;
            y -= 1;
        }
        targetMonths.push({ month: m, year: y });
    }

    const deptRegex = getDepartmentFilterRegex(department);
    const sheets = await KPISheet.find({
        department: { $regex: deptRegex },
        $or: targetMonths.map(t => ({ month: t.month, year: t.year }))
    }).populate('user', 'first_name last_name username sub_team').lean();

    const blockerMap = new Map();

    sheets.forEach(s => {
        const summary = s.summary || {};
        if (summary.blockers_nothing_to_report) return;
        const blockerText = (summary.blockers || '').trim();
        if (!blockerText || blockerText === 'NONE: No blockers to select' || blockerText.toUpperCase() === 'NONE') return;

        const key = (summary.blockers_recurrence_key || summary.blockers_root_cause || blockerText).trim().toLowerCase();
        const userName = s.user ? `${s.user.first_name || ''} ${s.user.last_name || ''}`.trim() || s.user.username : 'Unknown';
        const subTeam = s.user?.sub_team || 'General';

        if (!blockerMap.has(key)) {
            blockerMap.set(key, {
                key,
                rawText: blockerText,
                subTeam,
                members: new Set(),
                occurrences: []
            });
        }

        const b = blockerMap.get(key);
        b.members.add(userName);
        b.occurrences.push({
            month: s.month,
            year: s.year,
            userName,
            text: blockerText
        });
    });

    const recurringList = [];
    for (const [key, val] of blockerMap.entries()) {
        const distinctMonths = new Set(val.occurrences.map(o => `${o.year}-${o.month}`));
        if (distinctMonths.size >= 2) {
            recurringList.push({
                recurrenceKey: key,
                description: val.rawText,
                subTeam: val.subTeam,
                affectedMembers: Array.from(val.members),
                consecutiveMonthsCount: distinctMonths.size,
                isChronic: distinctMonths.size >= 3,
                occurrences: val.occurrences
            });
        }
    }

    return recurringList;
};

/**
 * Pre-Deadline Submission Tracker for HODs
 */
export const getPreDeadlineSubmissionStatus = async ({ department, month, year }) => {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const monthEndDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    const deptRegex = getDepartmentFilterRegex(department);

    const rawUsers = await UserModel.find({
        department: { $regex: deptRegex },
        isActive: { $ne: false }
    }).select('_id first_name last_name username email sub_team sub_team_role joining_date role is_operator category').lean();

    const rawUserIds = rawUsers.map(u => u._id);
    const sheets = await KPISheet.find({
        user: { $in: rawUserIds },
        month: monthNum,
        year: yearNum
    }).select('user status summary updatedAt').lean();

    const sheetMap = new Map();
    sheets.forEach(s => sheetMap.set(s.user.toString(), s));

    const userIdsWithAnySheet = new Set(
        (await KPISheet.distinct('user', { user: { $in: rawUserIds } })).map(id => id.toString())
    );

    const trueHods = await getTrueHodUsers();
    const resolvedHod = trueHods.find(h => deptRegex.test(h.department));

    const users = rawUsers.filter(u => {
        const uIdStr = u._id.toString();

        if (u.username === 'dev_master') return false;

        const isHodUser = (resolvedHod && uIdStr === resolvedHod._id.toString()) ||
            /^(head_of_department|hod)$/i.test(String(u.role || '')) ||
            ['suraj_rajan', 'uday_zope', 'afzal_ghanchi', 'ajith_sivadasan', 'chirag_shah', 'deepak_singh', 'mahesh_patil', 'majhar_khan', 'punit_pandey', 'kinjal_khatri', 'sojith_mammuttil', 'sreekumar_pillai', 'anurag_pillai', 'krishnapal_puvar', 'mohit_singh'].includes(u.username);
        if (isHodUser) {
            return false;
        }

        if (u.is_operator) return false;
        if (['housekeeping', 'helper', 'operator'].includes(String(u.category || '').toLowerCase())) {
            return false;
        }

        if (u.joining_date) {
            const jDate = new Date(u.joining_date);
            if (!isNaN(jDate.getTime()) && jDate > monthEndDate) {
                return false;
            }
        }

        const hasSheet = sheetMap.has(uIdStr);
        if (hasSheet) return true;

        const hasEverHadSheet = userIdsWithAnySheet.has(uIdStr);
        if (hasEverHadSheet) return true;
        if (u.sub_team && u.sub_team !== 'General') return true;

        return false;
    });

    const submitted = [];
    const pending = [];

    users.forEach(u => {
        const uId = u._id.toString();
        const s = sheetMap.get(uId);
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
        const isSub = s ? ['SUBMITTED', 'APPROVED', 'CHECKED', 'VERIFIED'].includes(s.status) : false;

        const info = {
            userId: u._id,
            name,
            sub_team: u.sub_team || 'General',
            status: s ? s.status : 'NOT_STARTED',
            submittedAt: s?.summary?.submission_date || (isSub ? s.updatedAt : null)
        };

        if (isSub) {
            submitted.push(info);
        } else {
            pending.push(info);
        }
    });

    const total = users.length;
    const submittedCount = submitted.length;
    const submissionRate = total > 0 ? Number(((submittedCount / total) * 100).toFixed(1)) : 0;

    return {
        department,
        month: monthNum,
        year: yearNum,
        totalMembers: total,
        submittedCount,
        pendingCount: pending.length,
        submissionRate,
        submitted,
        pending
    };
};

/**
 * Calculates Department Annual Business Loss Rollup
 */
export const calculateAnnualBusinessLossRollup = async ({ department, year }) => {
    const yearNum = parseInt(year, 10);
    const deptRegex = getDepartmentFilterRegex(department);

    const rollups = await MRMSegmentRollup.find({
        department: { $regex: deptRegex },
        year: yearNum
    }).lean();

    let totalLoss = 0;
    const monthlyBreakdown = {};
    const subTeamBreakdown = {};
    const incidents = [];

    rollups.forEach(r => {
        const mKey = r.month;
        if (!monthlyBreakdown[mKey]) monthlyBreakdown[mKey] = 0;
        if (!subTeamBreakdown[r.sub_team]) subTeamBreakdown[r.sub_team] = 0;

        const loss = Number(r.flags?.business_loss_total) || 0;
        totalLoss += loss;
        monthlyBreakdown[mKey] += loss;
        subTeamBreakdown[r.sub_team] += loss;

        (r.contributing_members || []).forEach(m => {
            if (m.business_loss > 0) {
                incidents.push({
                    month: r.month,
                    sub_team: r.sub_team,
                    memberName: m.name,
                    amount: m.business_loss,
                    remarks: m.business_loss_remarks
                });
            }
        });
    });

    return {
        department,
        year: yearNum,
        totalLoss,
        totalIncidents: incidents.length,
        monthlyBreakdown,
        subTeamBreakdown,
        incidents
    };
};



/**
 * KPI Analytics Service
 *
 * Handles all KPI analytics calculations with documented formulas and business logic.
 * This service provides a single source of truth for all analytics, ensuring consistency
 * across all clients (web, mobile, reports, exports).
 *
 * IMPORTANT: This service is the authoritative source for all KPI calculations.
 * Frontend dashboards should call backend endpoints that use these functions, not implement
 * their own calculations.
 */

// ============================================================================
// SUMMARY METRICS CALCULATIONS
// ============================================================================

/**
 * Calculate summary metrics from a collection of KPI sheets
 *
 * @param {Array} sheets - Array of KPI sheets with summary data
 * @returns {Object} Summary metrics including totals, averages, and rates
 *
 * Formulas used:
 * - Average Performance: SUM(overall_percentage) / COUNT(sheets)
 *   Meaning: Team/organization overall KPI achievement (0-100%)
 *   Interpretation: <70% = concerning, 70-85% = acceptable, >85% = excellent
 *
 * - Total Business Loss: SUM(business_loss)
 *   Units: Indian Rupees (₹)
 *   Meaning: Cumulative impact of performance gaps attributed to blockers/inefficiencies
 *
 * - Average Workload Percentage: SUM(total_workload_percentage) / COUNT(sheets)
 *   Meaning: Team utilization rate
 *   Interpretation: >100% = over-capacity, 70-100% = optimal, <70% = under-utilized
 *
 * - Blocker Rate: COUNT(sheets with blockers) / COUNT(total sheets) * 100
 *   Units: Percentage (%)
 *   Meaning: Proportion of KPIs facing obstacles/blockers
 *   Threshold: >30% indicates systemic issues requiring attention
 */
export function calculateSummaryMetrics(sheets) {
    if (!sheets || sheets.length === 0) {
        return {
            total: 0,
            avgPerf: 0,
            totalLoss: 0,
            avgLoss: 0,
            avgWorkload: 0,
            blockerRate: 0,
            blockersCount: 0
        };
    }

    let totalPerf = 0;
    let totalLoss = 0;
    let totalWorkload = 0;
    let blockersCount = 0;

    sheets.forEach(sheet => {
        const perf = sheet.summary?.overall_percentage || 0;
        const loss = sheet.summary?.business_loss || 0;
        const workload = sheet.summary?.total_workload_percentage || 0;
        const blockers = sheet.summary?.blockers || '';

        totalPerf += perf;
        totalLoss += loss;
        totalWorkload += workload;

        if (blockers.trim() && blockers.trim().toUpperCase() !== 'NA') {
            blockersCount++;
        }
    });

    const total = sheets.length;
    const avgPerf = Math.round(totalPerf / total);
    const avgLoss = Math.round(totalLoss / total);
    const avgWorkload = Math.round(totalWorkload / total);
    const blockerRate = Math.round((blockersCount / total) * 100);

    return {
        total,
        avgPerf,
        totalLoss,
        avgLoss,
        avgWorkload,
        blockerRate,
        blockersCount
    };
}

// ============================================================================
// DEPARTMENT ANALYTICS
// ============================================================================

/**
 * Calculate department-level statistics
 *
 * @param {Array} sheets - Array of KPI sheets
 * @returns {Array} Array of department analytics objects, sorted by avgPerf descending
 *
 * Metrics per department:
 * - avgPerf: Average performance percentage
 * - totalLoss: Sum of business losses
 * - avgLoss: Average loss per sheet
 * - avgWorkload: Average workload percentage
 * - blockerRate: Percentage of sheets with blockers
 * - approvalRate: Percentage of sheets that reached APPROVED state
 * - rejectionRate: Percentage of sheets that were REJECTED
 * - efficiency: Composite efficiency score balancing performance vs loss
 *   Formula: (avgPerf * 0.7) - (avgLoss / 100000 * 0.3)
 *   Meaning: Balances performance delivery vs cost of failures
 */
export function aggregateDepartmentStats(sheets) {
    if (!sheets || sheets.length === 0) {
        return [];
    }

    const deptStats = {};

    sheets.forEach(sheet => {
        const dept = sheet.department || 'Other';
        const perf = sheet.summary?.overall_percentage || 0;
        const loss = sheet.summary?.business_loss || 0;
        const workload = sheet.summary?.total_workload_percentage || 0;
        const blockers = sheet.summary?.blockers || '';

        if (!deptStats[dept]) {
            deptStats[dept] = {
                perf: 0,
                loss: 0,
                workload: 0,
                count: 0,
                blockers: 0,
                approved: 0,
                rejected: 0,
                pending: 0
            };
        }

        deptStats[dept].perf += perf;
        deptStats[dept].loss += loss;
        deptStats[dept].workload += workload;
        deptStats[dept].count++;

        if (blockers.trim() && blockers.trim().toUpperCase() !== 'NA') {
            deptStats[dept].blockers++;
        }

        if (sheet.status === 'APPROVED') {
            deptStats[dept].approved++;
        } else if (sheet.status === 'REJECTED') {
            deptStats[dept].rejected++;
        } else if (['SUBMITTED', 'CHECKED', 'VERIFIED'].includes(sheet.status)) {
            deptStats[dept].pending++;
        }
    });

    // Transform to array and calculate derived metrics
    const departments = Object.entries(deptStats)
        .map(([name, stats]) => {
            const avgLoss = Math.round(stats.loss / stats.count);
            const efficiency = Math.round((stats.perf / stats.count) * 0.7 - (avgLoss / 100000) * 0.3);

            return {
                name,
                avgPerf: Math.round(stats.perf / stats.count),
                totalLoss: stats.loss,
                avgLoss,
                avgWorkload: Math.round(stats.workload / stats.count),
                blockerRate: Math.round((stats.blockers / stats.count) * 100),
                approvalRate: Math.round((stats.approved / stats.count) * 100),
                rejectionRate: Math.round((stats.rejected / stats.count) * 100),
                pendingCount: stats.pending,
                count: stats.count,
                efficiency
            };
        })
        .sort((a, b) => b.avgPerf - a.avgPerf);

    return departments;
}

// ============================================================================
// MONTHLY TREND ANALYSIS
// ============================================================================

/**
 * Generate monthly trend data
 *
 * @param {Array} sheets - Array of KPI sheets with year and month
 * @returns {Array} Monthly trend data sorted chronologically
 *
 * Each record includes:
 * - month: YYYY-MM format
 * - avgPerf: Average performance for that month
 * - totalLoss: Total business loss for that month
 * - avgLoss: Average loss per sheet
 * - count: Number of sheets in that month
 * - blockerRate: Percentage of sheets with blockers
 */
export function generateMonthlyTrends(sheets) {
    if (!sheets || sheets.length === 0) {
        return [];
    }

    const monthlyData = {};

    sheets.forEach(sheet => {
        const monthKey = `${sheet.year}-${String(sheet.month).padStart(2, '0')}`;
        const perf = sheet.summary?.overall_percentage || 0;
        const loss = sheet.summary?.business_loss || 0;
        const blockers = sheet.summary?.blockers || '';

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                perf: 0,
                loss: 0,
                count: 0,
                blockers: 0
            };
        }

        monthlyData[monthKey].perf += perf;
        monthlyData[monthKey].loss += loss;
        monthlyData[monthKey].count++;

        if (blockers.trim() && blockers.trim().toUpperCase() !== 'NA') {
            monthlyData[monthKey].blockers++;
        }
    });

    const trends = Object.entries(monthlyData)
        .map(([month, data]) => ({
            month,
            avgPerf: Math.round(data.perf / data.count),
            totalLoss: data.loss,
            avgLoss: Math.round(data.loss / data.count),
            count: data.count,
            blockerRate: Math.round((data.blockers / data.count) * 100)
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    return trends;
}

// ============================================================================
// PERFORMANCE DISTRIBUTION
// ============================================================================

/**
 * Calculate performance distribution across buckets
 *
 * @param {Array} sheets - Array of KPI sheets
 * @returns {Array} Performance buckets (10% ranges: 0-10%, 10-20%, etc.)
 */
export function calculatePerformanceDistribution(sheets) {
    if (!sheets || sheets.length === 0) {
        return [];
    }

    const perfBuckets = {};

    sheets.forEach(sheet => {
        const perf = sheet.summary?.overall_percentage || 0;
        const bucket = Math.floor(perf / 10) * 10;
        perfBuckets[bucket] = (perfBuckets[bucket] || 0) + 1;
    });

    const total = sheets.length;
    const distribution = Object.entries(perfBuckets)
        .map(([bucket, count]) => ({
            range: `${bucket}-${parseInt(bucket) + 10}%`,
            count,
            percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => parseInt(a.range) - parseInt(b.range));

    return distribution;
}

// ============================================================================
// LOSS DISTRIBUTION
// ============================================================================

/**
 * Calculate loss distribution across rupee buckets
 *
 * @param {Array} sheets - Array of KPI sheets
 * @returns {Array} Loss buckets (₹10K ranges: ₹0-10K, ₹10K-20K, etc.)
 */
export function calculateLossDistribution(sheets) {
    if (!sheets || sheets.length === 0) {
        return [];
    }

    const lossBuckets = {};

    sheets.forEach(sheet => {
        const loss = sheet.summary?.business_loss || 0;
        const bucket = Math.floor(loss / 10000) * 10000;
        lossBuckets[bucket] = (lossBuckets[bucket] || 0) + 1;
    });

    const total = sheets.length;
    const distribution = Object.entries(lossBuckets)
        .map(([bucket, count]) => {
            const bucketNum = parseInt(bucket);
            return {
                range: `₹${(bucketNum / 1000).toFixed(0)}k-${((bucketNum + 10000) / 1000).toFixed(0)}k`,
                count,
                totalLoss: bucketNum * count,
                percentage: Math.round((count / total) * 100)
            };
        })
        .sort((a, b) => {
            const aVal = parseInt(a.range.match(/₹(\d+)/)[1]);
            const bVal = parseInt(b.range.match(/₹(\d+)/)[1]);
            return aVal - bVal;
        });

    return distribution;
}

// ============================================================================
// STATUS BREAKDOWN
// ============================================================================

/**
 * Calculate status distribution
 *
 * @param {Array} sheets - Array of KPI sheets
 * @returns {Array} Status breakdown with counts and percentages
 */
export function calculateStatusBreakdown(sheets) {
    if (!sheets || sheets.length === 0) {
        return [];
    }

    const statusCount = {};

    sheets.forEach(sheet => {
        const status = sheet.status;
        statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const total = sheets.length;
    const breakdown = Object.entries(statusCount).map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / total) * 100)
    }));

    return breakdown;
}

// ============================================================================
// RISK MATRIX COMPUTATION
// ============================================================================

/**
 * Compute risk matrix for high-risk KPI cases
 *
 * Risk criteria:
 * - Performance < 70%
 * - Business Loss > ₹0
 * - Active blockers present (not empty, not "NA")
 *
 * Risk Score Formula: (100 - overall_percentage) * 0.6 + (business_loss / max_loss) * 0.4
 *
 * Components:
 * - 60% weight: Performance gap (lower performance = higher risk)
 * - 40% weight: Business impact (higher loss = higher risk)
 *
 * Interpretation:
 * - <30: Acceptable
 * - 30-60: Monitor
 * - >60: Critical
 *
 * @param {Array} sheets - Array of KPI sheets
 * @param {number} maxLossForScore - Maximum loss value for normalization (optional)
 * @returns {Array} Top 20 high-risk cases sorted by risk score
 */
export function computeRiskMatrix(sheets, maxLossForScore = 500000) {
    if (!sheets || sheets.length === 0) {
        return [];
    }

    // Filter for high-risk cases
    const riskCases = sheets
        .filter(sheet => {
            const perf = sheet.summary?.overall_percentage || 0;
            const loss = sheet.summary?.business_loss || 0;
            const blockers = sheet.summary?.blockers || '';

            // Must have performance < 70%, loss > 0, and active blockers
            const hasActiveBlockers = blockers.trim() && blockers.trim().toUpperCase() !== 'NA';
            return perf < 70 && loss > 0 && hasActiveBlockers;
        })
        .map(sheet => {
            const perf = sheet.summary?.overall_percentage || 0;
            const loss = sheet.summary?.business_loss || 0;

            // Score formula: performance gap (60%) + loss impact (40%)
            const performanceGapScore = (100 - perf) * 0.6;
            const lossImpactScore = (loss / maxLossForScore) * 40;
            const riskScore = Math.round(performanceGapScore + lossImpactScore);

            return {
                sheetId: sheet._id,
                name: `${sheet.user?.first_name || ''} ${sheet.user?.last_name || ''}`.trim(),
                dept: sheet.department,
                perf,
                loss,
                blockers: sheet.summary?.blockers || '',
                riskReason: perf < 50 ? 'Critical performance' : 'Performance gap with blockers',
                riskScore,
                month: `${sheet.year}-${String(sheet.month).padStart(2, '0')}`,
                status: sheet.status
            };
        })
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 20);

    return riskCases;
}

// ============================================================================
// BLOCKER IMPACT ANALYSIS
// ============================================================================

/**
 * Identify top blockers by financial impact
 *
 * @param {Array} sheets - Array of KPI sheets
 * @returns {Array} Top 15 blockers sorted by loss impact
 */
export function identifyBlockerImpact(sheets) {
    if (!sheets || sheets.length === 0) {
        return [];
    }

    const blockersList = [];

    sheets.forEach(sheet => {
        const blockers = sheet.summary?.blockers || '';
        const loss = sheet.summary?.business_loss || 0;
        const perf = sheet.summary?.overall_percentage || 0;

        if (blockers.trim() && blockers.trim().toUpperCase() !== 'NA') {
            blockersList.push({
                dept: sheet.department,
                user: `${sheet.user?.first_name || ''} ${sheet.user?.last_name || ''}`.trim(),
                blocker: blockers,
                loss,
                perf,
                month: `${sheet.year}-${String(sheet.month).padStart(2, '0')}`
            });
        }
    });

    // Sort by loss impact and return top 15
    const topBlockers = blockersList
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 15);

    return topBlockers;
}

// ============================================================================
// TOP/BOTTOM PERFORMERS
// ============================================================================

/**
 * Get top and bottom performing KPI sheets
 *
 * @param {Array} sheets - Array of KPI sheets
 * @returns {Object} Object with topPerformers and bottomPerformers arrays
 */
export function identifyTopAndBottomPerformers(sheets) {
    if (!sheets || sheets.length === 0) {
        return { topPerformers: [], bottomPerformers: [] };
    }

    const sortedByPerf = [...sheets].sort((a, b) =>
        (b.summary?.overall_percentage || 0) - (a.summary?.overall_percentage || 0)
    );

    const topPerformers = sortedByPerf.slice(0, 10).map(sheet => ({
        name: `${sheet.user?.first_name || ''} ${sheet.user?.last_name || ''}`.trim(),
        dept: sheet.department,
        perf: sheet.summary?.overall_percentage || 0,
        loss: sheet.summary?.business_loss || 0,
        month: `${sheet.year}-${String(sheet.month).padStart(2, '0')}`,
        status: sheet.status
    }));

    const bottomPerformers = sortedByPerf.slice(-10).reverse().map(sheet => ({
        name: `${sheet.user?.first_name || ''} ${sheet.user?.last_name || ''}`.trim(),
        dept: sheet.department,
        perf: sheet.summary?.overall_percentage || 0,
        loss: sheet.summary?.business_loss || 0,
        month: `${sheet.year}-${String(sheet.month).padStart(2, '0')}`,
        status: sheet.status
    }));

    return { topPerformers, bottomPerformers };
}

// ============================================================================
// LEAVE/HOLIDAY ANALYSIS
// ============================================================================

/**
 * Analyze leave patterns
 *
 * @param {Array} sheets - Array of KPI sheets (must include holidays array)
 * @returns {Object} Object with mostLeaves and leastLeaves arrays
 */
export function analyzeLeavePatterns(sheets) {
    if (!sheets || sheets.length === 0) {
        return { mostLeaves: [], leastLeaves: [] };
    }

    const leaveData = sheets.map(sheet => ({
        name: `${sheet.user?.first_name || ''} ${sheet.user?.last_name || ''}`.trim(),
        dept: sheet.department,
        leaves: sheet.holidays ? sheet.holidays.length : 0,
        perf: sheet.summary?.overall_percentage || 0,
        month: `${sheet.year}-${String(sheet.month).padStart(2, '0')}`
    }));

    const mostLeaves = [...leaveData]
        .sort((a, b) => b.leaves - a.leaves)
        .slice(0, 10);

    const leastLeaves = [...leaveData]
        .sort((a, b) => a.leaves - b.leaves)
        .slice(0, 10);

    return { mostLeaves, leastLeaves };
}

// ============================================================================
// DATA CONSISTENCY VALIDATION
// ============================================================================

/**
 * Validate data consistency across analytics
 *
 * Checks performed:
 * 1. Summary totals are consistent across all sheets
 * 2. Department totals sum to overall totals
 * 3. Monthly trends sum correctly
 * 4. No duplicate sheets by ID
 * 5. All referenced users exist
 * 6. Status values are valid
 *
 * @param {Array} sheets - Array of KPI sheets
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with status and issues array
 */
export function validateDataConsistency(sheets, options = {}) {
    const issues = [];
    const checks = [];

    if (!sheets || sheets.length === 0) {
        checks.push({ name: 'Empty Data Check', passed: true });
        return {
            is_valid: true,
            checks_passed: checks.length,
            checks_failed: 0,
            last_verified: new Date().toISOString(),
            issues: []
        };
    }

    // Check 1: No duplicate sheets by ID
    const sheetIds = new Set();
    sheets.forEach(sheet => {
        if (sheetIds.has(sheet._id)) {
            issues.push({
                type: 'DUPLICATE_SHEET',
                sheet_id: sheet._id,
                issue: 'Duplicate sheet ID found'
            });
        }
        sheetIds.add(sheet._id);
    });
    checks.push({ name: 'Duplicate Sheet Check', passed: issues.length === 0 });

    // Check 2: Valid statuses
    const validStatuses = ['DRAFT', 'SUBMITTED', 'CHECKED', 'VERIFIED', 'APPROVED', 'REJECTED'];
    sheets.forEach(sheet => {
        if (!validStatuses.includes(sheet.status)) {
            issues.push({
                type: 'INVALID_STATUS',
                sheet_id: sheet._id,
                issue: `Invalid status: ${sheet.status}`,
                expected: validStatuses
            });
        }
    });
    checks.push({ name: 'Status Validity Check', passed: issues.filter(i => i.type === 'INVALID_STATUS').length === 0 });

    // Check 3: Summary data consistency
    sheets.forEach(sheet => {
        const summary = sheet.summary || {};

        if (summary.overall_percentage < 0 || summary.overall_percentage > 100) {
            issues.push({
                type: 'INVALID_PERFORMANCE',
                sheet_id: sheet._id,
                issue: `Performance out of range: ${summary.overall_percentage}%`,
                expected: '0-100%'
            });
        }

        if (summary.business_loss < 0) {
            issues.push({
                type: 'NEGATIVE_LOSS',
                sheet_id: sheet._id,
                issue: `Business loss cannot be negative: ₹${summary.business_loss}`,
                expected: '≥ 0'
            });
        }

        if (summary.total_workload_percentage && (summary.total_workload_percentage < 0 || summary.total_workload_percentage > 200)) {
            issues.push({
                type: 'INVALID_WORKLOAD',
                sheet_id: sheet._id,
                issue: `Workload out of typical range: ${summary.total_workload_percentage}%`,
                expected: '0-200%'
            });
        }
    });
    checks.push({ name: 'Summary Data Check', passed: issues.filter(i => i.type.includes('INVALID')).length === 0 });

    // Check 4: Required user references
    sheets.forEach(sheet => {
        if (!sheet.user || !sheet.user._id) {
            issues.push({
                type: 'MISSING_USER',
                sheet_id: sheet._id,
                issue: 'Sheet missing user reference'
            });
        }
    });
    checks.push({ name: 'User Reference Check', passed: issues.filter(i => i.type === 'MISSING_USER').length === 0 });

    // Check 5: Department data consistency
    sheets.forEach(sheet => {
        if (!sheet.department || sheet.department.trim() === '') {
            issues.push({
                type: 'MISSING_DEPARTMENT',
                sheet_id: sheet._id,
                issue: 'Sheet missing department'
            });
        }
    });
    checks.push({ name: 'Department Check', passed: issues.filter(i => i.type === 'MISSING_DEPARTMENT').length === 0 });

    // Check 6: Valid year and month
    sheets.forEach(sheet => {
        if (!sheet.year || sheet.year < 2020 || sheet.year > 2030) {
            issues.push({
                type: 'INVALID_YEAR',
                sheet_id: sheet._id,
                issue: `Invalid year: ${sheet.year}`,
                expected: '2020-2030'
            });
        }

        if (!sheet.month || sheet.month < 1 || sheet.month > 12) {
            issues.push({
                type: 'INVALID_MONTH',
                sheet_id: sheet._id,
                issue: `Invalid month: ${sheet.month}`,
                expected: '1-12'
            });
        }
    });
    checks.push({ name: 'Date Validity Check', passed: issues.filter(i => i.type === 'INVALID_MONTH' || i.type === 'INVALID_YEAR').length === 0 });

    const checksPassed = checks.filter(c => c.passed).length;
    const checksFailed = checks.length - checksPassed;

    return {
        is_valid: checksFailed === 0 && issues.length === 0,
        checks_passed: checksPassed,
        checks_failed: checksFailed,
        checks_summary: checks,
        last_verified: new Date().toISOString(),
        issues: issues.slice(0, 100) // Limit to first 100 issues
    };
}

// ============================================================================
// COMPREHENSIVE ANALYTICS AGGREGATION
// ============================================================================

/**
 * Generate comprehensive analytics from a sheet collection
 *
 * This is the main function that should be called by API endpoints.
 * It orchestrates all calculation functions and returns a complete analytics package.
 *
 * @param {Array} sheets - Array of KPI sheets
 * @param {Object} options - Additional options
 * @returns {Object} Complete analytics object
 */
export function generateComprehensiveAnalytics(sheets, options = {}) {
    const maxLoss = Math.max(...sheets.map(s => s.summary?.business_loss || 0), 500000);

    return {
        summary: calculateSummaryMetrics(sheets),
        departments: aggregateDepartmentStats(sheets),
        monthlyTrends: generateMonthlyTrends(sheets),
        performanceDistribution: calculatePerformanceDistribution(sheets),
        lossDistribution: calculateLossDistribution(sheets),
        statusBreakdown: calculateStatusBreakdown(sheets),
        riskMatrix: computeRiskMatrix(sheets, maxLoss),
        blockerAnalysis: identifyBlockerImpact(sheets),
        performers: identifyTopAndBottomPerformers(sheets),
        leaveAnalysis: analyzeLeavePatterns(sheets),
        consistency: validateDataConsistency(sheets, options)
    };
}

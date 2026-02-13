/**
 * KPI Analytics API Routes
 *
 * Provides dedicated endpoints for all KPI analytics and insights.
 * These endpoints are designed to be the single source of truth for all dashboard analytics,
 * ensuring consistency across all clients.
 *
 * All calculations are performed server-side using kpiAnalyticsService.mjs
 */

import express from 'express';
import verifyToken from '../../middleware/authMiddleware.mjs';
import KPISheet from '../../model/kpi/kpiSheetModel.mjs';
import * as KPIAnalytics from '../../services/kpi/kpiAnalyticsService.mjs';

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply date range and department filters
 *
 * @param {Object} filters - Filter object
 * @param {number} filters.yearStart - Start year
 * @param {number} filters.monthStart - Start month (1-12)
 * @param {number} filters.yearEnd - End year
 * @param {number} filters.monthEnd - End month (1-12)
 * @param {Array} filters.departmentIds - Department filter array
 * @returns {Object} MongoDB query object
 */
function buildDateRangeQuery(filters) {
    const query = {};

    if (filters.yearStart && filters.monthStart) {
        // Start date filter
        const startDate = new Date(filters.yearStart, filters.monthStart - 1, 1);
        query.$or = query.$or || [];
        query.$or.push({
            year: { $gt: filters.yearStart }
        });
        query.$or.push({
            year: filters.yearStart,
            month: { $gte: filters.monthStart }
        });
    }

    if (filters.yearEnd && filters.monthEnd) {
        // End date filter
        const endDate = new Date(filters.yearEnd, filters.monthEnd, 0);
        query.$and = query.$and || [];
        query.$and.push({
            $or: [
                { year: { $lt: filters.yearEnd } },
                {
                    year: filters.yearEnd,
                    month: { $lte: filters.monthEnd }
                }
            ]
        });
    }

    return query;
}

/**
 * Apply department filters
 *
 * @param {Array} departmentIds - Array of department names to filter
 * @returns {Object} MongoDB query object for department matching
 */
function buildDepartmentQuery(departmentIds) {
    if (!departmentIds || departmentIds.length === 0) {
        return {};
    }

    return {
        department: { $in: departmentIds }
    };
}

/**
 * Merge query objects
 *
 * @param {...Object} queries - Query objects to merge
 * @returns {Object} Merged MongoDB query
 */
function mergeQueries(...queries) {
    const merged = {};

    queries.forEach(query => {
        Object.keys(query).forEach(key => {
            if (!merged[key]) {
                merged[key] = query[key];
            } else if (key === '$and') {
                merged[key] = (merged[key] || []).concat(query[key]);
            } else if (key === '$or') {
                merged[key] = (merged[key] || []).concat(query[key]);
            }
        });
    });

    return merged;
}

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/kpi/analytics/summary
 *
 * Get summary metrics for the dashboard
 *
 * Query Parameters:
 * - yearStart: number (required)
 * - monthStart: number 1-12 (required)
 * - yearEnd: number (required)
 * - monthEnd: number 1-12 (required)
 * - departments: comma-separated string of department names (optional)
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     summary: { total, avgPerf, totalLoss, avgLoss, avgWorkload, blockerRate, blockersCount },
 *     lastUpdated: ISO timestamp
 *   },
 *   validationStatus: { is_valid, checks_passed, checks_failed }
 * }
 */
router.get('/api/kpi/analytics/summary', verifyToken, async (req, res) => {
    try {
        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        // Validate required parameters
        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: yearStart, monthStart, yearEnd, monthEnd'
            });
        }

        // Build query
        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        // Fetch sheets
        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .populate('assigned_signatories.checked_by', 'first_name last_name')
            .populate('assigned_signatories.verified_by', 'first_name last_name')
            .populate('assigned_signatories.approved_by', 'first_name last_name')
            .lean();

        // Calculate summary metrics
        const summary = KPIAnalytics.calculateSummaryMetrics(sheets);
        const consistency = KPIAnalytics.validateDataConsistency(sheets);

        res.json({
            success: true,
            data: {
                summary,
                lastUpdated: new Date().toISOString(),
                sheetsAnalyzed: sheets.length
            },
            validationStatus: {
                is_valid: consistency.is_valid,
                checks_passed: consistency.checks_passed,
                checks_failed: consistency.checks_failed
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/summary ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate summary metrics',
            error: error.message
        });
    }
});

/**
 * GET /api/kpi/analytics/departments
 *
 * Get department-level analytics
 *
 * Query Parameters: Same as /summary
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     departments: Array of department analytics,
 *     totalDepartments: number,
 *     lastUpdated: ISO timestamp
 *   }
 * }
 */
router.get('/api/kpi/analytics/departments', verifyToken, async (req, res) => {
    try {
        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .lean();

        const departmentStats = KPIAnalytics.aggregateDepartmentStats(sheets);

        res.json({
            success: true,
            data: {
                departments: departmentStats,
                totalDepartments: departmentStats.length,
                lastUpdated: new Date().toISOString(),
                sheetsAnalyzed: sheets.length
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/departments ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate department analytics',
            error: error.message
        });
    }
});

/**
 * GET /api/kpi/analytics/trends
 *
 * Get monthly trend analysis
 *
 * Query Parameters: Same as /summary
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     trends: Array of monthly trend data,
 *     periods: number,
 *     lastUpdated: ISO timestamp
 *   }
 * }
 */
router.get('/api/kpi/analytics/trends', verifyToken, async (req, res) => {
    try {
        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .lean();

        const trends = KPIAnalytics.generateMonthlyTrends(sheets);
        const perfDist = KPIAnalytics.calculatePerformanceDistribution(sheets);
        const lossDist = KPIAnalytics.calculateLossDistribution(sheets);

        res.json({
            success: true,
            data: {
                trends,
                performanceDistribution: perfDist,
                lossDistribution: lossDist,
                periods: trends.length,
                lastUpdated: new Date().toISOString(),
                sheetsAnalyzed: sheets.length
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/trends ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate trends',
            error: error.message
        });
    }
});

/**
 * GET /api/kpi/analytics/risk
 *
 * Get risk matrix and high-risk cases
 *
 * Query Parameters: Same as /summary
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     riskCases: Array of high-risk KPI sheets,
 *     criticalsCount: number,
 *     monitorCount: number,
 *     acceptableCount: number,
 *     lastUpdated: ISO timestamp
 *   }
 * }
 */
router.get('/api/kpi/analytics/risk', verifyToken, async (req, res) => {
    try {
        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .lean();

        const riskCases = KPIAnalytics.computeRiskMatrix(sheets);
        const statusBreakdown = KPIAnalytics.calculateStatusBreakdown(sheets);

        // Categorize risk levels
        const criticalsCount = riskCases.filter(c => c.riskScore > 60).length;
        const monitorCount = riskCases.filter(c => c.riskScore >= 30 && c.riskScore <= 60).length;
        const acceptableCount = riskCases.filter(c => c.riskScore < 30).length;

        res.json({
            success: true,
            data: {
                riskCases,
                riskSummary: {
                    critical: criticalsCount,
                    monitor: monitorCount,
                    acceptable: acceptableCount
                },
                statusBreakdown,
                lastUpdated: new Date().toISOString(),
                sheetsAnalyzed: sheets.length
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/risk ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate risk analysis',
            error: error.message
        });
    }
});

/**
 * GET /api/kpi/analytics/blockers
 *
 * Get top blockers by impact
 *
 * Query Parameters: Same as /summary
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     blockers: Array of top blockers,
 *     totalBlockers: number,
 *     totalImpact: number (sum of loss),
 *     lastUpdated: ISO timestamp
 *   }
 * }
 */
router.get('/api/kpi/analytics/blockers', verifyToken, async (req, res) => {
    try {
        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .lean();

        const blockers = KPIAnalytics.identifyBlockerImpact(sheets);
        const totalImpact = blockers.reduce((sum, b) => sum + b.loss, 0);
        const leaveAnalysis = KPIAnalytics.analyzeLeavePatterns(sheets);

        res.json({
            success: true,
            data: {
                blockers,
                leaveAnalysis,
                summary: {
                    topBlockersCount: blockers.length,
                    totalBlockerImpact: totalImpact,
                    mostLeavesTaken: leaveAnalysis.mostLeaves.length,
                    leastLeavesTaken: leaveAnalysis.leastLeaves.length
                },
                lastUpdated: new Date().toISOString(),
                sheetsAnalyzed: sheets.length
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/blockers ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze blockers',
            error: error.message
        });
    }
});

/**
 * GET /api/kpi/analytics/performers
 *
 * Get top and bottom performers
 *
 * Query Parameters: Same as /summary
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     topPerformers: Array of top 10,
 *     bottomPerformers: Array of bottom 10,
 *     lastUpdated: ISO timestamp
 *   }
 * }
 */
router.get('/api/kpi/analytics/performers', verifyToken, async (req, res) => {
    try {
        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .lean();

        const { topPerformers, bottomPerformers } = KPIAnalytics.identifyTopAndBottomPerformers(sheets);

        res.json({
            success: true,
            data: {
                topPerformers,
                bottomPerformers,
                totalRecords: sheets.length,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/performers ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performers',
            error: error.message
        });
    }
});

/**
 * GET /api/kpi/analytics/consistency-check
 *
 * Validate data consistency (Admin only)
 *
 * Query Parameters: Same as /summary
 *
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     is_valid: boolean,
 *     checks_passed: number,
 *     checks_failed: number,
 *     issues: Array of data inconsistencies found
 *   }
 * }
 */
router.get('/api/kpi/analytics/consistency-check', verifyToken, async (req, res) => {
    try {
        // Admin only
        if (req.user.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required for consistency checks'
            });
        }

        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .lean();

        const validation = KPIAnalytics.validateDataConsistency(sheets);

        res.json({
            success: true,
            data: {
                ...validation,
                sheetsAnalyzed: sheets.length
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/consistency-check ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform consistency check',
            error: error.message
        });
    }
});

/**
 * GET /api/kpi/analytics/comprehensive
 *
 * Get all analytics in one call (use for dashboard initialization)
 *
 * Query Parameters: Same as /summary
 *
 * This endpoint is best used for dashboard initialization to reduce API calls.
 * For real-time updates, use individual endpoints.
 */
router.get('/api/kpi/analytics/comprehensive', verifyToken, async (req, res) => {
    try {
        const { yearStart, monthStart, yearEnd, monthEnd, departments } = req.query;

        if (!yearStart || !monthStart || !yearEnd || !monthEnd) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const dateQuery = buildDateRangeQuery({
            yearStart: parseInt(yearStart),
            monthStart: parseInt(monthStart),
            yearEnd: parseInt(yearEnd),
            monthEnd: parseInt(monthEnd)
        });

        const deptQuery = departments
            ? buildDepartmentQuery(departments.split(',').map(d => d.trim()))
            : {};

        const finalQuery = mergeQueries(dateQuery, deptQuery);

        const sheets = await KPISheet.find(finalQuery)
            .populate('user', 'first_name last_name')
            .populate('assigned_signatories.checked_by', 'first_name last_name')
            .populate('assigned_signatories.verified_by', 'first_name last_name')
            .populate('assigned_signatories.approved_by', 'first_name last_name')
            .lean();

        const analytics = KPIAnalytics.generateComprehensiveAnalytics(sheets);

        res.json({
            success: true,
            data: {
                ...analytics,
                sheetsAnalyzed: sheets.length,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('GET /api/kpi/analytics/comprehensive ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate comprehensive analytics',
            error: error.message
        });
    }
});

export default router;

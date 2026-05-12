import express from 'express';
import AggregationService from '../../services/attendance/AggregationService.js';
import authMiddleware from '../../middleware/authMiddleware.mjs';
import { ALLOWED_USERNAMES } from '../../middleware/requireAllowedAdmin.mjs';

const router = express.Router();

/**
 * AUTHORIZATION MIDDLEWARE
 * Only ALLOWED_USERNAMES can access these endpoints
 */
const requireAllowedAdmin = (req, res, next) => {
    const username = String(req.user?.username || '').toLowerCase();
    if (!ALLOWED_USERNAMES.has(username)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin authorization required.'
        });
    }
    next();
};

/**
 * Parse query parameters into arrays
 */
const parseArrayParam = (param) => {
    if (!param) return [];
    if (Array.isArray(param)) return param.filter(Boolean);
    return String(param)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
};

/**
 * GET /api/attendance/admin-dashboard
 * Global dashboard summary with optional filtering
 *
 * Query params:
 *  - date: YYYY-MM-DD (required)
 *  - organization_ids: comma-separated or array (optional, "" or [] = ALL)
 *  - department_ids: comma-separated or array (optional)
 *  - team_ids: comma-separated or array (optional)
 */
router.get(
    '/admin-dashboard',
    authMiddleware,
    requireAllowedAdmin,
    async (req, res) => {
        try {
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date parameter is required (YYYY-MM-DD format)'
                });
            }

            const organizationIds = parseArrayParam(req.query.organization_ids);
            const departmentIds = parseArrayParam(req.query.department_ids);
            const teamIds = parseArrayParam(req.query.team_ids);

            const result = await AggregationService.getGlobalDashboardSummary(
                date,
                organizationIds,
                departmentIds,
                teamIds
            );

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: result
            });
        } catch (error) {
            console.error('Error in GET /admin-dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }
);

/**
 * GET /api/attendance/admin-dashboard/daily-summary
 * Detailed daily employee summary with pagination
 *
 * Query params:
 *  - date: YYYY-MM-DD (required)
 *  - organization_ids: comma-separated or array (optional)
 *  - department_ids: comma-separated or array (optional)
 *  - team_ids: comma-separated or array (optional)
 *  - page: 1, 2, 3... (default: 1)
 *  - limit: records per page (default: 50, max: 500)
 */
router.get(
    '/admin-dashboard/daily-summary',
    authMiddleware,
    requireAllowedAdmin,
    async (req, res) => {
        try {
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date parameter is required (YYYY-MM-DD format)'
                });
            }

            const organizationIds = parseArrayParam(req.query.organization_ids);
            const departmentIds = parseArrayParam(req.query.department_ids);
            const teamIds = parseArrayParam(req.query.team_ids);

            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, Math.min(500, parseInt(req.query.limit) || 50));

            const result = await AggregationService.getDailyEmployeeSummary(
                date,
                organizationIds,
                departmentIds,
                teamIds,
                { page, limit }
            );

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: result
            });
        } catch (error) {
            console.error('Error in GET /admin-dashboard/daily-summary:', error);
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }
);

/**
 * GET /api/attendance/admin-dashboard/monthly-summary
 * Monthly aggregated stats with daily breakdown and employee summaries
 *
 * Query params:
 *  - year: 2026 (required)
 *  - month: 1-12 (required)
 *  - organization_ids: comma-separated or array (optional)
 *  - department_ids: comma-separated or array (optional)
 *  - team_ids: comma-separated or array (optional)
 */
router.get(
    '/admin-dashboard/monthly-summary',
    authMiddleware,
    requireAllowedAdmin,
    async (req, res) => {
        try {
            const { year, month } = req.query;

            if (!year || !month) {
                return res.status(400).json({
                    success: false,
                    message: 'Year and month parameters are required'
                });
            }

            const yearNum = parseInt(year);
            const monthNum = parseInt(month);

            if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid year or month'
                });
            }

            const organizationIds = parseArrayParam(req.query.organization_ids);
            const departmentIds = parseArrayParam(req.query.department_ids);
            const teamIds = parseArrayParam(req.query.team_ids);

            const result = await AggregationService.getMonthlySummary(
                yearNum,
                monthNum,
                organizationIds,
                departmentIds,
                teamIds
            );

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: result
            });
        } catch (error) {
            console.error('Error in GET /admin-dashboard/monthly-summary:', error);
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }
);

/**
 * GET /api/attendance/admin-dashboard/leave-requests
 * Get leave applications with optional filtering
 *
 * Query params:
 *  - organization_ids: comma-separated or array (optional)
 *  - status: 'pending' | 'approved' | 'rejected' (default: 'pending')
 *  - page: 1, 2, 3... (default: 1)
 *  - limit: records per page (default: 50, max: 500)
 */
router.get(
    '/admin-dashboard/leave-requests',
    authMiddleware,
    requireAllowedAdmin,
    async (req, res) => {
        try {
            const organizationIds = parseArrayParam(req.query.organization_ids);
            const status = req.query.status || 'pending';

            if (!['pending', 'approved', 'rejected'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: pending, approved, or rejected'
                });
            }

            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, Math.min(500, parseInt(req.query.limit) || 50));

            const result = await AggregationService.getLeaveRequests(
                organizationIds,
                status,
                { page, limit }
            );

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: result
            });
        } catch (error) {
            console.error('Error in GET /admin-dashboard/leave-requests:', error);
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }
);

/**
 * GET /api/attendance/admin-dashboard/regularization-requests
 * Get regularization requests with optional filtering
 *
 * Query params:
 *  - organization_ids: comma-separated or array (optional)
 *  - page: 1, 2, 3... (default: 1)
 *  - limit: records per page (default: 50, max: 500)
 */
router.get(
    '/admin-dashboard/regularization-requests',
    authMiddleware,
    requireAllowedAdmin,
    async (req, res) => {
        try {
            const organizationIds = parseArrayParam(req.query.organization_ids);
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, Math.min(500, parseInt(req.query.limit) || 50));

            const result = await AggregationService.getRegularizationRequests(
                organizationIds,
                { page, limit }
            );

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: result
            });
        } catch (error) {
            console.error('Error in GET /admin-dashboard/regularization-requests:', error);
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }
);

/**
 * GET /api/attendance/admin-dashboard/hierarchy
 * Get organization/department/team hierarchy for filter dropdowns
 *
 * Query params:
 *  - organization_ids: comma-separated or array (optional, "" or [] = ALL)
 */
router.get(
    '/admin-dashboard/hierarchy',
    authMiddleware,
    requireAllowedAdmin,
    async (req, res) => {
        try {
            const organizationIds = parseArrayParam(req.query.organization_ids);

            const result = await AggregationService.getHierarchy(organizationIds);

            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                data: result
            });
        } catch (error) {
            console.error('Error in GET /admin-dashboard/hierarchy:', error);
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    }
);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Dashboard routes healthy' });
});

export default router;

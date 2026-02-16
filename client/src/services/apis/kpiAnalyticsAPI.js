/**
 * KPI Analytics API Service
 *
 * Frontend service layer for KPI analytics API calls.
 *
 * This service abstracts away API details and provides a clean interface for React components.
 * It includes error handling, retry logic, and response validation.
 *
 * Usage:
 * import { fetchAnalyticsSummary, fetchDepartmentAnalytics } from '@/services/apis/kpiAnalyticsAPI';
 *
 * const { data, error } = await fetchAnalyticsSummary({
 *   yearStart: 2025,
 *   monthStart: 1,
 *   yearEnd: 2025,
 *   monthEnd: 2,
 *   departments: []
 * });
 */

const API_BASE = process.env.REACT_APP_API_STRING || 'http://localhost:5000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wrapper for fetch with retry logic
 *
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries remaining
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
        const response = await fetch(url, {
            ...options,
            credentials: 'include' // Include cookies for auth
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Auth error - redirect to login
                window.location.href = '/login';
                throw new Error('Unauthorized - redirecting to login');
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        if (retries > 0 && error.message.includes('fetch')) {
            // Network error - retry
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchWithRetry(url, options, retries - 1);
        }

        throw error;
    }
}

/**
 * Build query string from filter object
 *
 * @param {Object} filters - Filter object
 * @returns {string} Query string (without leading ?)
 */
function buildQueryString(filters) {
    const params = new URLSearchParams();

    if (filters.yearStart) params.append('yearStart', filters.yearStart);
    if (filters.monthStart) params.append('monthStart', filters.monthStart);
    if (filters.yearEnd) params.append('yearEnd', filters.yearEnd);
    if (filters.monthEnd) params.append('monthEnd', filters.monthEnd);

    if (filters.departments && filters.departments.length > 0) {
        params.append('departments', filters.departments.join(','));
    }

    return params.toString();
}

/**
 * Handle API response and validate structure
 *
 * @param {Response} response - Fetch Response object
 * @returns {Promise<Object>} Parsed JSON response
 */
async function handleResponse(response) {
    const data = await response.json();

    if (!data.success) {
        throw new Error(data.message || 'API returned success: false');
    }

    return data.data;
}

// ============================================================================
// ANALYTICS API CALLS
// ============================================================================

/**
 * Fetch summary metrics
 *
 * @param {Object} filters - Filter object with year/month/departments
 * @returns {Promise<Object>} Summary metrics object
 *
 * @throws {Error} If API call fails
 */
export async function fetchAnalyticsSummary(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/summary?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await handleResponse(response);

        return {
            success: true,
            data: data.summary,
            validationStatus: data.validationStatus,
            sheetsAnalyzed: data.sheetsAnalyzed,
            lastUpdated: data.lastUpdated
        };
    } catch (error) {
        console.error('fetchAnalyticsSummary error:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
}

/**
 * Fetch department-level analytics
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Department analytics array
 */
export async function fetchDepartmentAnalytics(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/departments?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await handleResponse(response);

        return {
            success: true,
            data: data.departments,
            totalDepartments: data.totalDepartments,
            sheetsAnalyzed: data.sheetsAnalyzed,
            lastUpdated: data.lastUpdated
        };
    } catch (error) {
        console.error('fetchDepartmentAnalytics error:', error);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}

/**
 * Fetch trend analysis
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Trend data with performance/loss distributions
 */
export async function fetchTrendAnalysis(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/trends?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await handleResponse(response);

        return {
            success: true,
            data: {
                trends: data.trends,
                performanceDistribution: data.performanceDistribution,
                lossDistribution: data.lossDistribution
            },
            periods: data.periods,
            sheetsAnalyzed: data.sheetsAnalyzed,
            lastUpdated: data.lastUpdated
        };
    } catch (error) {
        console.error('fetchTrendAnalysis error:', error);
        return {
            success: false,
            error: error.message,
            data: { trends: [], performanceDistribution: [], lossDistribution: [] }
        };
    }
}

/**
 * Fetch risk matrix and high-risk cases
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Risk matrix and summary statistics
 */
export async function fetchRiskAnalysis(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/risk?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await handleResponse(response);

        return {
            success: true,
            data: {
                riskCases: data.riskCases,
                riskSummary: data.riskSummary,
                statusBreakdown: data.statusBreakdown
            },
            sheetsAnalyzed: data.sheetsAnalyzed,
            lastUpdated: data.lastUpdated
        };
    } catch (error) {
        console.error('fetchRiskAnalysis error:', error);
        return {
            success: false,
            error: error.message,
            data: { riskCases: [], riskSummary: {}, statusBreakdown: [] }
        };
    }
}

/**
 * Fetch blocker impact analysis
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Blocker and leave analysis
 */
export async function fetchBlockerAnalysis(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/blockers?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await handleResponse(response);

        return {
            success: true,
            data: {
                blockers: data.blockers,
                leaveAnalysis: data.leaveAnalysis
            },
            summary: data.summary,
            sheetsAnalyzed: data.sheetsAnalyzed,
            lastUpdated: data.lastUpdated
        };
    } catch (error) {
        console.error('fetchBlockerAnalysis error:', error);
        return {
            success: false,
            error: error.message,
            data: { blockers: [], leaveAnalysis: {} }
        };
    }
}

/**
 * Fetch top and bottom performers
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Top and bottom performers
 */
export async function fetchPerformers(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/performers?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await handleResponse(response);

        return {
            success: true,
            data: {
                topPerformers: data.topPerformers,
                bottomPerformers: data.bottomPerformers
            },
            totalRecords: data.totalRecords,
            lastUpdated: data.lastUpdated
        };
    } catch (error) {
        console.error('fetchPerformers error:', error);
        return {
            success: false,
            error: error.message,
            data: { topPerformers: [], bottomPerformers: [] }
        };
    }
}

/**
 * Validate data consistency (Admin only)
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Consistency check result
 */
export async function validateDashboardData(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/consistency-check?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await response.json();

        // This endpoint might return success: false if not admin, handle gracefully
        if (response.status === 403) {
            return {
                success: false,
                error: 'Admin access required',
                isValid: null
            };
        }

        return {
            success: data.success,
            error: data.message || null,
            isValid: data.data.is_valid,
            checksPassed: data.data.checks_passed,
            checksFailed: data.data.checks_failed,
            issues: data.data.issues
        };
    } catch (error) {
        console.error('validateDashboardData error:', error);
        return {
            success: false,
            error: error.message,
            isValid: null
        };
    }
}

/**
 * Fetch all analytics in one call (comprehensive)
 *
 * Best used for dashboard initialization to reduce number of API calls.
 * For subsequent updates, use individual analytics endpoints.
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} Complete analytics object
 */
export async function fetchComprehensiveAnalytics(filters) {
    try {
        const queryString = buildQueryString(filters);
        const url = `${API_BASE}/api/kpi/analytics/comprehensive?${queryString}`;

        const response = await fetchWithRetry(url);
        const data = await handleResponse(response);

        return {
            success: true,
            analytics: data,
            sheetsAnalyzed: data.sheetsAnalyzed,
            lastUpdated: data.lastUpdated
        };
    } catch (error) {
        console.error('fetchComprehensiveAnalytics error:', error);
        return {
            success: false,
            error: error.message,
            analytics: null
        };
    }
}

// ============================================================================
// BATCH OPERATIONS (Convenience functions for common workflows)
// ============================================================================

/**
 * Fetch all dashboard data in optimized batch calls
 *
 * For initial dashboard load, this prefetches all required data.
 * Uses parallel requests where possible.
 *
 * @param {Object} filters - Filter object
 * @returns {Promise<Object>} All dashboard data organized by section
 */
export async function fetchDashboardData(filters) {
    try {
        // Parallel fetch for better performance
        const [summaryRes, deptRes, trendRes, riskRes, blockerRes, performersRes, validationRes] = await Promise.all([
            fetchAnalyticsSummary(filters),
            fetchDepartmentAnalytics(filters),
            fetchTrendAnalysis(filters),
            fetchRiskAnalysis(filters),
            fetchBlockerAnalysis(filters),
            fetchPerformers(filters),
            validateDashboardData(filters)
        ]);

        return {
            success: summaryRes.success && deptRes.success && trendRes.success,
            data: {
                summary: summaryRes.data,
                departments: deptRes.data,
                trends: trendRes.data,
                risk: riskRes.data,
                blockers: blockerRes.data,
                performers: performersRes.data,
                validation: validationRes
            },
            errors: {
                summary: summaryRes.error,
                departments: deptRes.error,
                trends: trendRes.error,
                risk: riskRes.error,
                blockers: blockerRes.error,
                performers: performersRes.error,
                validation: validationRes.error
            }
        };
    } catch (error) {
        console.error('fetchDashboardData error:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
}

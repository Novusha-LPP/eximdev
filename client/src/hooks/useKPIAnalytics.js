/**
 * KPI Analytics Hooks
 *
 * Custom React hooks for KPI analytics data management.
 *
 * These hooks handle:
 * - API data fetching and lifecycle management
 * - Filter state management
 * - Error handling and data validation
 * - Automatic refetching on filter changes
 *
 * Usage:
 * const { analytics, loading, error, filters, applyFilters } = useKPIAnalytics({
 *   dateRange: 'last_6_months',
 *   departments: []
 * });
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as KPIAnalyticsAPI from '../apis/kpiAnalyticsAPI';

// ============================================================================
// DATE RANGE UTILITIES
// ============================================================================

/**
 * Calculate date range boundaries
 *
 * @param {string} dateRange - One of: 'current_month', 'last_3_months', 'last_6_months', 'ytd', 'custom'
 * @param {Object} customDates - Custom start/end dates if applicable
 * @returns {Object} { yearStart, monthStart, yearEnd, monthEnd }
 */
function calculateDateRange(dateRange, customDates = {}) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    let yearStart, monthStart, yearEnd, monthEnd;

    switch (dateRange) {
    case 'current_month':
        yearStart = currentYear;
        monthStart = currentMonth;
        yearEnd = currentYear;
        monthEnd = currentMonth;
        break;

    case 'last_3_months':
        yearEnd = currentYear;
        monthEnd = currentMonth;
        // Go back 3 months
        monthStart = currentMonth - 2;
        yearStart = currentYear;
        if (monthStart <= 0) {
            monthStart += 12;
            yearStart -= 1;
        }
        break;

    case 'last_6_months':
        yearEnd = currentYear;
        monthEnd = currentMonth;
        // Go back 6 months
        monthStart = currentMonth - 5;
        yearStart = currentYear;
        if (monthStart <= 0) {
            monthStart += 12;
            yearStart -= 1;
        }
        break;

    case 'ytd':
        yearStart = currentYear;
        monthStart = 1;
        yearEnd = currentYear;
        monthEnd = currentMonth;
        break;

    case 'custom':
        yearStart = customDates.yearStart || currentYear;
        monthStart = customDates.monthStart || 1;
        yearEnd = customDates.yearEnd || currentYear;
        monthEnd = customDates.monthEnd || currentMonth;
        break;

    default:
        yearStart = currentYear;
        monthStart = currentMonth;
        yearEnd = currentYear;
        monthEnd = currentMonth;
    }

    return { yearStart, monthStart, yearEnd, monthEnd };
}

// ============================================================================
// useKPIAnalytics HOOK
// ============================================================================

/**
 * Main hook for KPI analytics
 *
 * @param {Object} initialFilters - Initial filter values
 * @param {string} initialFilters.dateRange - Date range preset
 * @param {Array} initialFilters.departments - Department filter
 * @param {Object} options - Hook options
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @returns {Object} Analytics data, loading state, errors, and filter functions
 */
export function useKPIAnalytics(initialFilters = {}, options = {}) {
    const { autoFetch = true } = options;

    // Filter state
    const [filters, setFilters] = useState({
        dateRange: initialFilters.dateRange || 'last_6_months',
        departments: initialFilters.departments || [],
        customStartYear: new Date().getFullYear(),
        customStartMonth: new Date().getMonth() + 1,
        customEndYear: new Date().getFullYear(),
        customEndMonth: new Date().getMonth() + 1
    });

    // Analytics data state
    const [analytics, setAnalytics] = useState({
        summary: null,
        departments: null,
        trends: null,
        risk: null,
        blockers: null,
        performers: null,
        leaveAnalysis: null
    });

    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataValid, setDataValid] = useState(true);
    const [validationWarning, setValidationWarning] = useState(null);

    // Computed date range
    const dateRange = useMemo(() => {
        const custom = {
            yearStart: filters.customStartYear,
            monthStart: filters.customStartMonth,
            yearEnd: filters.customEndYear,
            monthEnd: filters.customEndMonth
        };
        return calculateDateRange(filters.dateRange, custom);
    }, [filters.dateRange, filters.customStartYear, filters.customStartMonth, filters.customEndYear, filters.customEndMonth]);

    // API call parameters
    const apiParams = useMemo(() => ({
        ...dateRange,
        departments: filters.departments
    }), [dateRange, filters.departments]);

    // Fetch analytics data
    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setValidationWarning(null);

            // Fetch all dashboard data
            const result = await KPIAnalyticsAPI.fetchDashboardData(apiParams);

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch analytics data');
            }

            setAnalytics(result.data);

            // Check data validity
            const isValid = result.data.validation?.isValid;
            if (isValid === false) {
                setDataValid(false);
                setValidationWarning(`Data consistency check found ${result.data.validation.checksFailed} issues`);
            } else if (isValid === null) {
                // Validation not admin-accessible
                setDataValid(true);
            } else {
                setDataValid(true);
            }
        } catch (err) {
            console.error('useKPIAnalytics fetch error:', err);
            setError(err.message);
            setDataValid(false);
        } finally {
            setLoading(false);
        }
    }, [apiParams]);

    // Auto-fetch on mount and filter changes
    useEffect(() => {
        if (autoFetch) {
            fetchAnalytics();
        }
    }, [apiParams, fetchAnalytics, autoFetch]);

    // Apply filters
    const applyFilters = useCallback((newFilters) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters
        }));
    }, []);

    // Refetch data
    const refetch = useCallback(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return {
        analytics,
        loading,
        error,
        filters,
        applyFilters,
        refetch,
        isDataValid: dataValid,
        validationWarning,
        dateRange
    };
}

// ============================================================================
// useKPIFilters HOOK
// ============================================================================

/**
 * Hook for managing KPI dashboard filters
 *
 * Handles filter state and persistence to localStorage
 *
 * @param {Object} initialFilters - Initial filter values
 * @param {Object} options - Hook options
 * @param {boolean} options.persistToStorage - Save to localStorage (default: true)
 * @returns {Object} Filter state and setter functions
 */
export function useKPIFilters(initialFilters = {}, options = {}) {
    const { persistToStorage = true } = options;
    const STORAGE_KEY = 'kpi_dashboard_filters';

    // Load from localStorage if available
    const getInitialFilters = () => {
        if (!persistToStorage) {
            return initialFilters;
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (err) {
            console.warn('Failed to load filters from localStorage:', err);
        }

        return initialFilters;
    };

    const [filters, setFilters] = useState(getInitialFilters());

    // Persist to localStorage
    useEffect(() => {
        if (!persistToStorage) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
        } catch (err) {
            console.warn('Failed to persist filters to localStorage:', err);
        }
    }, [filters, persistToStorage]);

    const updateFilter = useCallback((key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({
            ...prev,
            ...newFilters
        }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(initialFilters);
    }, [initialFilters]);

    return {
        filters,
        setFilters,
        updateFilter,
        updateFilters,
        resetFilters
    };
}

// ============================================================================
// useDepartmentAnalytics HOOK
// ============================================================================

/**
 * Hook for detailed department analytics
 *
 * @param {string} departmentName - Department to analyze
 * @param {Object} dateRange - Date range parameters
 * @returns {Object} Department analytics or null if not loaded
 */
export function useDepartmentAnalytics(departmentName, dateRange) {
    const [deptAnalytics, setDeptAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!departmentName) {
            setDeptAnalytics(null);
            return;
        }

        const fetchDeptAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);

                const result = await KPIAnalyticsAPI.fetchDepartmentAnalytics({
                    ...dateRange,
                    departments: [departmentName]
                });

                if (!result.success) {
                    throw new Error(result.error);
                }

                // Filter to selected department
                const deptData = result.data.find(d => d.name === departmentName);
                setDeptAnalytics(deptData || null);
            } catch (err) {
                console.error('useDepartmentAnalytics error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDeptAnalytics();
    }, [departmentName, dateRange]);

    return { deptAnalytics, loading, error };
}

// ============================================================================
// useDataValidation HOOK
// ============================================================================

/**
 * Hook for validating dashboard data consistency
 *
 * Useful for admin users to verify data integrity periodically
 *
 * @param {Object} dateRange - Date range parameters
 * @param {Object} options - Hook options
 * @param {boolean} options.autoValidate - Auto-validate on mount (default: false)
 * @returns {Object} Validation result and functions
 */
export function useDataValidation(dateRange, options = {}) {
    const { autoValidate = false } = options;

    const [validation, setValidation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const validate = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await KPIAnalyticsAPI.validateDashboardData(dateRange);

            if (!result.success && result.error !== 'Admin access required') {
                throw new Error(result.error);
            }

            setValidation(result);
        } catch (err) {
            console.error('useDataValidation error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        if (autoValidate) {
            validate();
        }
    }, [autoValidate, validate]);

    return {
        validation,
        loading,
        error,
        validate
    };
}

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * CUSTOM HOOK: useAdminDashboard
 * Handles admin dashboard data fetching, state management, filtering, and polling
 *
 * Features:
 *  - Global & org-scoped data aggregation
 *  - Dynamic filtering (org, dept, team)
 *  - Dependent filter management
 *  - Real-time polling (30-60 second intervals)
 *  - Caching for hierarchy data
 *  - Error handling & loading states
 */
const useAdminDashboard = () => {
    // ─── FILTER STATE ───
    const [filters, setFilters] = useState({
        date: new Date(),
        organizations: [], // Empty = ALL orgs
        departments: [],
        teams: [],
        summaryType: 'daily', // 'daily' or 'monthly'
        startDate: null, // For monthly
        endDate: null
    });

    // ─── DATA STATE ───
    const [data, setData] = useState({
        summary: { global: {}, organizations: [] },
        daily_details: { present: [], absent: [], late: [], on_leave: [] },
        pending_requests: {},
        organizations: []
    });

    const [monthlyData, setMonthlyData] = useState({
        summary: {},
        daily_breakdown: [],
        employee_monthly: []
    });

    const [leaveRequests, setLeaveRequests] = useState({
        pending: [],
        approved: [],
        total: 0
    });

    const [hierarchy, setHierarchy] = useState({
        organizations: [],
        departments: [],
        teams: []
    });

    // ─── UI STATE ───
    const [loading, setLoading] = useState(false);
    const [hierarchyLoading, setHierarchyLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('daily');
    const [error, setError] = useState(null);
    const [lastUpdateTime, setLastUpdateTime] = useState(null);

    // ─── POLLING CONTROL ───
    const [autoRefresh, setAutoRefresh] = useState(true);
    const POLL_INTERVAL = 30000; // 30 seconds

    /**
     * Build query string from filters
     */
    const buildQueryString = useCallback(() => {
        const params = new URLSearchParams();

        if (filters.organizations.length > 0) {
            params.append('organization_ids', filters.organizations.join(','));
        }

        if (filters.departments.length > 0) {
            params.append('department_ids', filters.departments.join(','));
        }

        if (filters.teams.length > 0) {
            params.append('team_ids', filters.teams.join(','));
        }

        return params.toString();
    }, [filters]);

    /**
     * Fetch daily dashboard summary
     */
    const fetchDailySummary = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const dateStr = filters.date.toISOString().split('T')[0];
            const queryStr = buildQueryString();
            const url = `/api/attendance/admin-dashboard?date=${dateStr}&${queryStr}`;

            const response = await axios.get(url, { withCredentials: true });

            if (response.data.success) {
                setData(response.data.data);
                setLastUpdateTime(new Date());
            }
        } catch (err) {
            console.error('Error fetching daily summary:', err);
            setError(err.response?.data?.message || 'Failed to load dashboard data');
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [filters.date, buildQueryString]);

    /**
     * Fetch monthly summary
     */
    const fetchMonthlySummary = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const year = filters.date.getFullYear();
            const month = filters.date.getMonth() + 1;
            const queryStr = buildQueryString();
            const url = `/api/attendance/admin-dashboard/monthly-summary?year=${year}&month=${month}&${queryStr}`;

            const response = await axios.get(url, { withCredentials: true });

            if (response.data.success) {
                setMonthlyData(response.data.data);
                setLastUpdateTime(new Date());
            }
        } catch (err) {
            console.error('Error fetching monthly summary:', err);
            setError(err.response?.data?.message || 'Failed to load monthly summary');
            toast.error('Failed to load monthly summary');
        } finally {
            setLoading(false);
        }
    }, [filters.date, buildQueryString]);

    /**
     * Fetch leave requests
     */
    const fetchLeaveRequests = useCallback(async (status = 'pending') => {
        try {
            const queryStr = buildQueryString();
            const url = `/api/attendance/admin-dashboard/leave-requests?status=${status}&${queryStr}&limit=100`;

            const response = await axios.get(url, { withCredentials: true });

            if (response.data.success) {
                if (status === 'pending') {
                    setLeaveRequests(prev => ({
                        ...prev,
                        pending: response.data.data.data || []
                    }));
                } else if (status === 'approved') {
                    setLeaveRequests(prev => ({
                        ...prev,
                        approved: response.data.data.data || []
                    }));
                }
            }
        } catch (err) {
            console.error('Error fetching leave requests:', err);
        }
    }, [buildQueryString]);

    /**
     * Fetch hierarchy (orgs, depts, teams) for filter dropdowns
     * Called once on mount, cached
     */
    const fetchHierarchy = useCallback(async () => {
        try {
            setHierarchyLoading(true);

            const queryStr = buildQueryString();
            const url = `/api/attendance/admin-dashboard/hierarchy?${queryStr}`;

            const response = await axios.get(url, { withCredentials: true });

            if (response.data.success) {
                setHierarchy(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching hierarchy:', err);
        } finally {
            setHierarchyLoading(false);
        }
    }, [buildQueryString]);

    /**
     * Handle organization filter change
     * Reset dependent filters when org changes
     */
    const handleOrganizationChange = useCallback((selectedOrgs) => {
        setFilters(prev => ({
            ...prev,
            organizations: selectedOrgs,
            departments: [], // Reset
            teams: [] // Reset
        }));
    }, []);

    /**
     * Handle department filter change
     * Reset team filter when dept changes
     */
    const handleDepartmentChange = useCallback((selectedDepts) => {
        setFilters(prev => ({
            ...prev,
            departments: selectedDepts,
            teams: [] // Reset
        }));
    }, []);

    /**
     * Handle team filter change
     */
    const handleTeamChange = useCallback((selectedTeams) => {
        setFilters(prev => ({
            ...prev,
            teams: selectedTeams
        }));
    }, []);

    /**
     * Handle date change
     */
    const handleDateChange = useCallback((newDate) => {
        setFilters(prev => ({
            ...prev,
            date: newDate
        }));
    }, []);

    /**
     * Handle summary type change (daily/monthly)
     */
    const handleSummaryTypeChange = useCallback((type) => {
        setFilters(prev => ({
            ...prev,
            summaryType: type
        }));
        setActiveTab('summary'); // Switch to main tab
    }, []);

    /**
     * Manual refresh
     */
    const handleRefresh = useCallback(async () => {
        if (filters.summaryType === 'daily') {
            await fetchDailySummary();
        } else {
            await fetchMonthlySummary();
        }
        toast.success('Dashboard refreshed');
    }, [filters.summaryType, fetchDailySummary, fetchMonthlySummary]);

    /**
     * Toggle auto-refresh
     */
    const toggleAutoRefresh = useCallback(() => {
        setAutoRefresh(prev => !prev);
    }, []);

    /**
     * INITIAL LOAD: Fetch hierarchy on mount
     */
    useEffect(() => {
        fetchHierarchy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * EFFECT: Fetch data when filters or summary type changes
     */
    useEffect(() => {
        if (filters.summaryType === 'daily') {
            fetchDailySummary();
        } else {
            fetchMonthlySummary();
        }
        // Also fetch leave requests
        fetchLeaveRequests('pending');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.organizations, filters.departments, filters.teams, filters.date, filters.summaryType]);

    /**
     * AUTO-REFRESH: Set up polling interval
     */
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            if (filters.summaryType === 'daily') {
                fetchDailySummary();
            } else {
                fetchMonthlySummary();
            }
            fetchLeaveRequests('pending');
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRefresh, filters.summaryType, buildQueryString]);

    return {
        // State
        filters,
        data,
        monthlyData,
        leaveRequests,
        hierarchy,
        loading,
        hierarchyLoading,
        activeTab,
        error,
        lastUpdateTime,
        autoRefresh,

        // Handlers
        handleOrganizationChange,
        handleDepartmentChange,
        handleTeamChange,
        handleDateChange,
        handleSummaryTypeChange,
        handleRefresh,
        toggleAutoRefresh,
        setActiveTab,

        // Direct API calls
        fetchDailySummary,
        fetchMonthlySummary,
        fetchLeaveRequests,
        fetchHierarchy
    };
};

export default useAdminDashboard;

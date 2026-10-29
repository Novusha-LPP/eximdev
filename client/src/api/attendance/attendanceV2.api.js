import apiClient from '../attendanceApiClient';

/**
 * Attendance V2 API Service
 * Interacts with EXIM backend /api/attendance/v2 routes powered by HRMS Integration API
 */
const attendanceV2API = {
  /**
   * Get current user's profile and mapped HRMS session details
   */
  getMe: async () => {
    const res = await apiClient.get('/attendance/v2/me');
    return res.data;
  },

  /**
   * Auto-link current EXIM user to their HRMS employee profile
   */
  autoLink: async () => {
    const res = await apiClient.post('/attendance/v2/auto-link');
    return res.data;
  },

  /**
   * Get today's attendance status & punch log
   */
  getTodayStatus: async (params = {}) => {
    const res = await apiClient.get('/attendance/v2/today', { params });
    return res.data;
  },

  /**
   * Record a live punch (IN, OUT, BREAK_START, BREAK_END)
   */
  punch: async (payload) => {
    const res = await apiClient.post('/attendance/v2/punch', payload);
    return res.data;
  },

  /**
   * Get attendance days ledger for a date range or month
   */
  getDays: async (params = {}) => {
    const res = await apiClient.get('/attendance/v2/days', { params });
    return res.data;
  },

  /**
   * Get leave balances
   */
  getLeaveBalances: async (params = {}) => {
    const res = await apiClient.get('/attendance/v2/leave/balances', { params });
    return res.data;
  },

  /**
   * Get configured leave types
   */
  getLeaveTypes: async () => {
    const res = await apiClient.get('/attendance/v2/leave/types');
    return res.data;
  },

  /**
   * Get leave applications
   */
  getLeaveApplications: async (params = {}) => {
    const res = await apiClient.get('/attendance/v2/leave/applications', { params });
    return res.data;
  },

  /**
   * Apply for leave
   */
  applyLeave: async (payload) => {
    const res = await apiClient.post('/attendance/v2/leave/apply', payload);
    return res.data;
  },

  /**
   * Cancel a leave application
   */
  cancelLeave: async (id, payload = {}) => {
    const res = await apiClient.post(`/attendance/v2/leave/cancel/${id}`, payload);
    return res.data;
  },

  /**
   * Get regularization / correction requests
   */
  getCorrections: async (params = {}) => {
    const res = await apiClient.get('/attendance/v2/corrections', { params });
    return res.data;
  },

  /**
   * Request attendance correction
   */
  requestCorrection: async (payload) => {
    const res = await apiClient.post('/attendance/v2/corrections', payload);
    return res.data;
  },

  /**
   * Cancel correction request
   */
  cancelCorrection: async (id) => {
    const res = await apiClient.post(`/attendance/v2/corrections/cancel/${id}`);
    return res.data;
  },

  /**
   * Get approvals inbox (for Managers, HODs, Admins)
   */
  getApprovalsInbox: async () => {
    const res = await apiClient.get('/attendance/v2/approvals/inbox');
    return res.data;
  },

  /**
   * Decide on an approval item
   */
  decideApproval: async (id, action, comments = '') => {
    const res = await apiClient.post(`/attendance/v2/approvals/decision/${id}`, { action, comments });
    return res.data;
  },

  /**
   * Get daily attendance summary (for Admins / HODs)
   */
  getDailySummary: async (date) => {
    const res = await apiClient.get('/attendance/v2/daily-summary', { params: { date } });
    return res.data;
  },

  /**
   * Get holidays list
   */
  getHolidays: async (year) => {
    const res = await apiClient.get('/attendance/v2/holidays', { params: { year } });
    return res.data;
  },

  /**
   * Get reference data
   */
  getReferenceData: async () => {
    const res = await apiClient.get('/attendance/v2/reference-data');
    return res.data;
  },

  /**
   * Get integrated employees list
   */
  getEmployees: async (refresh = false) => {
    const res = await apiClient.get('/attendance/v2/employees', { params: { refresh } });
    return res.data;
  },

  // ─── HRMS Live Integration & Sync Management ───────────────────────────────

  /**
   * Get sync status, health, cursor, and recent reconcile metrics
   */
  getIntegrationStatus: async () => {
    const res = await apiClient.get('/attendance/v2/integration/status');
    return res.data;
  },

  /**
   * Manually trigger pull of events feed
   */
  pollEvents: async () => {
    const res = await apiClient.post('/attendance/v2/integration/poll');
    return res.data;
  },

  /**
   * Run full reconciliation comparing active EXIM users with HRMS
   */
  runReconciliation: async () => {
    const res = await apiClient.post('/attendance/v2/integration/reconcile');
    return res.data;
  },

  /**
   * Push single user to HRMS
   */
  syncUser: async (userId, dryRun = false) => {
    const res = await apiClient.post(`/attendance/v2/integration/sync-user/${userId}`, null, {
      params: { dry_run: dryRun }
    });
    return res.data;
  },

  /**
   * Bulk push all active users to HRMS
   */
  syncAllUsers: async (dryRun = false) => {
    const res = await apiClient.post('/attendance/v2/integration/sync-all', { dry_run: dryRun });
    return res.data;
  },

  /**
   * Run employee code linking
   */
  linkEmployees: async (dryRun = true) => {
    const res = await apiClient.post('/attendance/v2/integration/link', null, {
      params: { dry_run: dryRun }
    });
    return res.data;
  },

  /**
   * Fetch recent event log
   */
  getEventsLog: async () => {
    const res = await apiClient.get('/attendance/v2/integration/events-log');
    return res.data;
  },

  /**
   * Mark attendance (PRESENT/ABSENT/HALF_DAY) on behalf of an employee (Admin/HOD)
   */
  markAttendanceAdmin: async (payload) => {
    const res = await apiClient.post('/attendance/v2/admin/mark-attendance', payload);
    return res.data;
  },

  /**
   * Update employee details (department, designation, etc.)
   */
  updateEmployee: async (userId, data) => {
    const res = await apiClient.put(`/attendance/v2/employees/${userId}`, data);
    return res.data;
  },
};

export default attendanceV2API;

import apiClient from '../attendanceApiClient';
import { normalizeLeaveBalanceRows } from '../../components/attendance/utils/leaveBalance';

/**
 * Attendance API functions
 */
const attendanceAPI = {
  /**
   * Punch In/Out
   */
  punch: async (punchData) => {
    try {
      const response = await apiClient.post('/attendance/punch', punchData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Punch failed' };
    }
  },

  /**
   * Get dashboard data
   */
  getDashboardData: async (monthOrOptions, year) => {
    try {
      let params = {};
      if (typeof monthOrOptions === 'object') {
        params = { ...monthOrOptions };
      } else {
        if (monthOrOptions) params.month = monthOrOptions;
        if (year) params.year = year;
      }
      const response = await apiClient.get('/attendance/dashboard', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch dashboard data' };
    }
  },

  /**
   * Get today's attendance status
   */
  getTodayStatus: async () => {
    try {
      const response = await apiClient.get('/attendance/my-today');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch today\'s status' };
    }
  },

  /**
   * Get attendance history
   */
  getHistory: async (params) => {
    try {
      const response = await apiClient.get('/attendance/history', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch attendance history' };
    }
  },

  /**
   * Request regularization
   */
  requestRegularization: async (regularizationData) => {
    try {
      const response = await apiClient.post('/attendance/regularization', regularizationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit regularization request' };
    }
  },

  /**
   * Get regularization requests
   */
  getRegularizations: async (params) => {
    try {
      const response = await apiClient.get('/attendance/regularizations', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch regularization requests' };
    }
  },

  /**
   * Cancel a pending regularization request
   */
  cancelRegularization: async (id) => {
    try {
      const response = await apiClient.post(`/attendance/regularization/cancel/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel regularization request' };
    }
  },

  approveRegularizationById: async (id, approval_remarks = '') => {
    try {
      const response = await apiClient.post(`/attendance/regularization/approve/${id}`, {
        approval_remarks
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to approve regularization request' };
    }
  },

  calculateDailyAttendance: async (employee_id, attendance_date) => {
    try {
      const response = await apiClient.post('/attendance/calculate-daily', {
        employee_id,
        attendance_date
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to recalculate attendance' };
    }
  },

  /**
   * Get HOD Dashboard Data (also used for HOD leave approvals)
   * Admins can pass ?teamId to filter
   */
  getHODDashboard: async (teamId) => {
    try {
      const url = teamId && teamId !== 'all'
        ? `/attendance/HODDashboard?teamId=${teamId}`
        : '/attendance/HODDashboard';
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch HOD dashboard' };
    }
  },

  /**
   * Get Department Attendance Report (HOD)
   */
  getDepartmentAttendanceReport: async (month) => {
    try {
      const response = await apiClient.get('/attendance/department-report', { params: { month } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch department report' };
    }
  },

  /**
   * Approve/Reject Request (Leave or Regularization)
   */
  approveRequest: async (type, id, status, comments = '') => {
    try {
      const response = await apiClient.post('/attendance/approve-request', {
        type, // 'leave' or 'regularization'
        id,
        status, // 'approved' or 'rejected'
        comments
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update request' };
    }
  },

  /**
   * Get Admin Dashboard Data
   */
  getAdminDashboard: async (options = {}) => {
    try {
      const params = {};
      if (options.date) params.date = options.date;
      if (options.company_id) params.company_id = options.company_id;
      const response = await apiClient.get('/attendance/adminDashboard', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch admin dashboard' };
    }
  },

  /**
   * Lock Attendance for a month
   */
  lockAttendance: async (yearMonth) => {
    try {
      const response = await apiClient.post('/attendance/lock', { year_month: yearMonth });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to lock attendance' };
    }
  },

  /**
   * Get Payroll Export Data
   */
  getPayrollData: async (month, year, companyId) => {
    try {
      const params = { month, year };
      if (companyId) params.company_id = companyId;
      const response = await apiClient.get('/attendance/payroll', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch payroll data' };
    }
  },

  getPayrollLocks: async (params) => {
    const response = await apiClient.get('/attendance/payroll-locks', { params });
    return response.data;
  },

  togglePayrollLock: async (yearMonth, isLocked) => {
    const response = await apiClient.post('/attendance/toggle-lock', { year_month: yearMonth, is_locked: isLocked });
    return response.data;
  },

  getAdminAttendanceReport: async (startDate, endDate, designation, companyId) => {
    try {
      const params = { startDate, endDate };
      if (designation && designation !== 'all') params.designation = designation;
      if (companyId) params.company_id = companyId;
      const response = await apiClient.get('/attendance/admin-report', {
        params,
        timeout: 90000
      });
      return response.data;
    } catch (error) {
      if (error?.response) throw error;
      throw { message: error?.message || 'Failed to fetch admin report' };
    }
  },

  getTeamAttendanceReport: async (startDate, endDate, teamId) => {
    try {
      const params = { startDate, endDate };
      if (teamId && teamId !== 'all') params.teamId = teamId;
      const response = await apiClient.get('/attendance/team-report', {
        params
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch team report' };
    }
  },

  /**
   * Update attendance record (Admin only)
   */
  updateAttendanceRecord: async (id, data) => {
    try {
      const response = await apiClient.put(`/attendance/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update record' };
    }
  },

  createManualAdjustment: async (data) => {
    try {
      const response = await apiClient.put('/attendance/new', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create manual adjustment' };
    }
  },

  /**
   * Delete attendance record (Admin only)
   */
  deleteAttendanceRecord: async (id) => {
    try {
      const response = await apiClient.delete(`/attendance/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete record' };
    }
  },

  /**
   * Get employee full profile (Admin only)
   */
  getEmployeeFullProfile: async (id, startDate, endDate, companyId) => {
    try {
      const response = await apiClient.get(`/attendance/employee-full-profile/${id}`, {
        params: { startDate, endDate, company_id: companyId }
      });
      return {
        ...response.data,
        balances: normalizeLeaveBalanceRows(response.data?.balances || [])
      };
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employee profile' };
    }
  },

  getEmployeeMigrationHistory: async (id) => {
    try {
      const response = await apiClient.get(`/attendance/employee-migration-history/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch migration history' };
    }
  },

  /**
   * Update employee profile (HOD version - shift only)
   */
  updateEmployeeProfileHOD: async (id, data) => {
    try {
      const response = await apiClient.put(`/attendance/employee-profile-hod/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update employee shift' };
    }
  },

  /**
   * Update employee profile (Admin only)
   */
  updateEmployeeProfile: async (id, data) => {
    try {
      const response = await apiClient.put(`/attendance/employee-profile/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update employee profile' };
    }
  },

  /**
   * Get all leave requests for Admin view (with optional teamId filter)
   * Returns: { data: { pendingLeaves, recentProcessedLeaves, teams } }
   */
  getAdminLeaveRequests: async (teamId, historyPage = 1, historyLimit = 20) => {
    try {
      const params = { historyPage, historyLimit };
      if (teamId && teamId !== 'all') params.teamId = teamId;
      const response = await apiClient.get('/attendance/admin-leave-requests', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch leave requests' };
    }
  },

  deleteLeaveApplication: async (id) => {
    try {
      const response = await apiClient.delete(`/attendance/leave-application/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete leave record' };
    }
  },

  /**
   * Migrate employee to a different organization
   */
  migrateEmployee: async (employeeId, destinationOrgId) => {
    try {
      const response = await apiClient.post(`/attendance/migrate/${employeeId}`, { destinationOrgId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to migrate employee' };
    }
  },

  /**
   * Bulk assign policies to all employees in an organization
   */
  bulkAssignPolicies: async (companyId, policyIds) => {
    try {
      const response = await apiClient.post(`/attendance/organizations/${companyId}/bulk-assign-policies`, { policyIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to assign policies' };
    }
  },

  /**
   * Bulk update attendance for an employee (Attendance Continuity)
   */
  bulkUpdateAttendance: async (data) => {
    try {
      const response = await apiClient.post('/attendance/bulk-update', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to bulk update attendance' };
    }
  },

  /**
   * Apply full month presence for an employee while respecting week-off policy
   */
  applyFullMonthPresence: async (data) => {
    try {
      const response = await apiClient.post('/attendance/full-month-presence', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to apply full month presence' };
    }
  },

  /**
   * Get leave balances for multiple employees
   */
  getLeaveBalances: async (employeeIds) => {
    try {
      const response = await apiClient.get('/leave/balances-bulk', { 
        params: { employee_ids: employeeIds.join(',') } 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch leave balances' };
    }
  }
};

export default attendanceAPI;

import apiClient from '../attendanceApiClient';

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
  approveRequest: async (type, id, status) => {
    try {
      const response = await apiClient.post('/attendance/approve-request', {
        type, // 'leave' or 'regularization'
        id,
        status // 'approved' or 'rejected'
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
        params
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch admin report' };
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
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employee profile' };
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
  getAdminLeaveRequests: async (teamId) => {
    try {
      const params = {};
      if (teamId && teamId !== 'all') params.teamId = teamId;
      const response = await apiClient.get('/attendance/admin-leave-requests', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch leave requests' };
    }
  }
};

export default attendanceAPI;

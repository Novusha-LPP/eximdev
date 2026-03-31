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
   * Get HOD Dashboard Data
   */
  getHODDashboard: async () => {
    try {
      const response = await apiClient.get('/attendance/HODDashboard');
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
  getAdminDashboard: async () => {
    try {
      const response = await apiClient.get('/attendance/adminDashboard');
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
  getPayrollData: async (month, year) => {
    try {
      const response = await apiClient.get('/attendance/payroll', { params: { month, year } });
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

  getAdminAttendanceReport: async (startDate, endDate, departmentId, designation) => {
    try {
      const response = await apiClient.get('/attendance/admin-report', {
        params: { startDate, endDate, departmentId: departmentId, designation }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch admin department report' };
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
  getEmployeeFullProfile: async (id, startDate, endDate) => {
    try {
      const response = await apiClient.get(`/attendance/employee-full-profile/${id}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch employee profile' };
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
  }
};

export default attendanceAPI;

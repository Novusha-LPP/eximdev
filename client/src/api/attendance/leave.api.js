import apiClient from '../attendanceApiClient';

const leaveAPI = {
  getBalance: async (employee_id) => {
    try {
      const params = employee_id ? { employee_id } : {};
      const response = await apiClient.get('/leave/balance', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch balance' };
    }
  },

  getApplications: async (params) => {
    try {
      const response = await apiClient.get('/leave/applications', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch applications' };
    }
  },

  applyLeave: async (data) => {
    try {
      const response = await apiClient.post('/leave/apply', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to apply leave' };
    }
  },

  cancelLeave: async (id) => {
    try {
      const response = await apiClient.post(`/leave/cancel/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel leave' };
    }
  },

  // Admin function to update leave balance
  updateBalance: async (employee_id, leave_policy_id, opening_balance, credited, consumed) => {
    try {
      const response = await apiClient.post(`/leave/admin/update-balance/${employee_id}`, {
        leave_policy_id,
        opening_balance,
        credited: credited || 0,
        consumed: consumed || 0
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update leave balance' };
    }
  }
};

export default leaveAPI;

import apiClient from '../attendanceApiClient';

const leaveAPI = {
  getBalance: async () => {
    try {
      const response = await apiClient.get('/leave/balance');
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
  }
};

export default leaveAPI;

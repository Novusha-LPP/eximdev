import apiClient from '../attendanceApiClient';

const adminAPI = {
  getAdminDashboard: async () => {
    try {
      const response = await apiClient.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch admin dashboard' };
    }
  }
};

export default adminAPI;

import apiClient from '../attendanceApiClient';
import { normalizeLeaveBalanceRows } from '../../components/attendance/utils/leaveBalance';

const leaveAPI = {
  getBalance: async (employee_id) => {
    try {
      const params = employee_id ? { employee_id } : {};
      const response = await apiClient.get('/leave/balance', { params });
      return {
        ...response.data,
        data: normalizeLeaveBalanceRows(response.data?.data || [])
      };
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
  
  previewLeave: async (params) => {
    try {
      const response = await apiClient.get('/leave/preview-application', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to preview leave' };
    }
  },

  // Admin function to update leave balance
  updateBalance: async (employee_id, payload) => {
    try {
      const {
        leave_policy_id,
        opening_balance,
        used,
        pending,
      } = payload || {};

      const usedNum = Number(used) || 0;
      const pendingNum = Number(pending) || 0;

      const response = await apiClient.post(`/leave/admin-update-balance/${employee_id}`, {
        leave_policy_id,
        opening_balance,
        used: usedNum,
        pending: pendingNum,
        pending_approval: pendingNum
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update leave balance' };
    }
  }
};

export default leaveAPI;

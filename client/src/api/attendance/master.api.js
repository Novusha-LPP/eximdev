import apiClient from '../attendanceApiClient';

const masterAPI = {
    /**
     * Shifts
     */
    getShifts: async (params) => {
        const response = await apiClient.get('/master/shifts', { params });
        return response.data;
    },

    createShift: async (shiftData) => {
        const response = await apiClient.post('/master/shifts', shiftData);
        return response.data;
    },

    deleteShift: async (id) => {
        const response = await apiClient.delete(`/master/shifts/${id}`);
        return response.data;
    },

    bulkAssignShifts: async (data) => {
        const response = await apiClient.post('/master/shifts/bulk-assign', data);
        return response.data;
    },

    /**
     * Holidays
     */
    getHolidays: async (params) => {
        const response = await apiClient.get('/master/holidays', { params });
        return response.data;
    },

    createHoliday: async (holidayData) => {
        const response = await apiClient.post('/master/holidays', holidayData);
        return response.data;
    },

    deleteHoliday: async (id) => {
        const response = await apiClient.delete(`/master/holidays/${id}`);
        return response.data;
    },

    bulkDeleteHolidays: async (ids) => {
        const response = await apiClient.post('/master/holidays/bulk-delete', { ids });
        return response.data;
    },

    /**
     * Leave Policies
     */
    getLeavePolicies: async (params) => {
        const response = await apiClient.get('/master/leave-policies', { params });
        return response.data;
    },

    createLeavePolicy: async (policyData) => {
        const response = await apiClient.post('/master/leave-policies', policyData);
        return response.data;
    },

    updateLeavePolicy: async (id, policyData) => {
        const response = await apiClient.put(`/master/leave-policies/${id}`, policyData);
        return response.data;
    },

    deleteLeavePolicy: async (id) => {
        const response = await apiClient.delete(`/master/leave-policies/${id}`);
        return response.data;
    },

    /**
     * Company Settings
     */
    getCompanySettings: async () => {
        const response = await apiClient.get('/master/company-settings');
        return response.data;
    },

    updateCompanySettings: async (settings) => {
        const response = await apiClient.put('/master/company-settings', settings);
        return response.data;
    },

 

    /**
     * Designations
     */
    getDesignations: async () => {
        const response = await apiClient.get('/master/designations');
        return response.data;
    },

  /**
   * Companies (Admin only)
   */
  getCompanies: async () => {
      const response = await apiClient.get('/master/companies');
      return response.data;
  },

  createCompany: async (companyData) => {
      const response = await apiClient.post('/master/companies', companyData);
      return response.data;
  },

  updateCompany: async (id, companyData) => {
      const response = await apiClient.put(`/master/companies/${id}`, companyData);
      return response.data;
  },

  deleteCompany: async (id) => {
      const response = await apiClient.delete(`/master/companies/${id}`);
      return response.data;
  },

  /**
   * User Migration
   */
  migrateUser: async (migrationData) => {
      const response = await apiClient.post('/master/users/migrate', migrationData);
      return response.data;
  },

  /**
   * Users (Admin only)
   */
  getUsers: async (params) => {
      const response = await apiClient.get('/master/users', { params });
      return response.data;
  },

  /**
   * Organizations with HOD info
   */
  getOrganizations: async () => {
      const response = await apiClient.get('/master/organizations');
      return response.data;
  },

  getBranches: async (params) => {
      const response = await apiClient.get('/master/branches', { params });
      return response.data;
  },

  getTeams: async () => {
      // Use relative path without leading slash to ensure axios appends it to baseURL correctly
      const response = await apiClient.get('teams/all');
      return response.data;
  },

  getDepartments: async (params) => {
      const response = await apiClient.get('/master/departments', { params });
      return response.data;
  },

  // ── Week-Off Policies ────────────────────────────────────────────────────
  getWeekOffPolicies: async () => {
      const response = await apiClient.get('/master/weekoff-policies');
      return response.data;
  },

  createWeekOffPolicy: async (data) => {
      const response = await apiClient.post('/master/weekoff-policies', data);
      return response.data;
  },

  updateWeekOffPolicy: async (id, data) => {
      const response = await apiClient.put(`/master/weekoff-policies/${id}`, data);
      return response.data;
  },

  deleteWeekOffPolicy: async (id) => {
      const response = await apiClient.delete(`/master/weekoff-policies/${id}`);
      return response.data;
  },

  // ── Holiday Policies ─────────────────────────────────────────────────────
  getHolidayPolicies: async (params) => {
      const response = await apiClient.get('/master/holiday-policies', { params });
      return response.data;
  },

  getHolidayPolicyById: async (id) => {
      const response = await apiClient.get(`/master/holiday-policies/${id}`);
      return response.data;
  },

  createHolidayPolicy: async (data) => {
      const response = await apiClient.post('/master/holiday-policies', data);
      return response.data;
  },

  updateHolidayPolicy: async (id, data) => {
      const response = await apiClient.put(`/master/holiday-policies/${id}`, data);
      return response.data;
  },

  deleteHolidayPolicy: async (id) => {
      const response = await apiClient.delete(`/master/holiday-policies/${id}`);
      return response.data;
  },

  addHolidayToPolicy: async (policyId, holidayData) => {
      const response = await apiClient.post(`/master/holiday-policies/${policyId}/holidays`, holidayData);
      return response.data;
  },

  removeHolidayFromPolicy: async (policyId, holidayDate) => {
      const response = await apiClient.delete(`/master/holiday-policies/${policyId}/holidays/${holidayDate}`);
      return response.data;
  },

  // My resolved holiday list (all roles, read-only)
  getMyHolidays: async (year) => {
      const response = await apiClient.get('/master/my-holidays', { params: { year } });
      return response.data;
  },

  // Assign policy overrides to a specific user
  assignPolicyToUser: async (userId, data) => {
      const response = await apiClient.put(`/master/users/${userId}/policies`, data);
      return response.data;
  }
};

export default masterAPI;

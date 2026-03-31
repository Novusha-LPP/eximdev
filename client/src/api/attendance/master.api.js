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
     * Departments
     */
    getDepartments: async (params) => {
        const response = await apiClient.get('/master/departments', { params });
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
    }
};

export default masterAPI;

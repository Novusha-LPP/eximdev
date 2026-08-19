import apiClient from './attendanceApiClient';

const firstAidAPI = {
    // Products Directory
    getProducts: async () => {
        const response = await apiClient.get('/first-aid/products');
        return response.data;
    },

    addProduct: async (data) => {
        const response = await apiClient.post('/first-aid/products', data);
        return response.data;
    },

    updateProduct: async (id, data) => {
        const response = await apiClient.put(`/first-aid/products/${id}`, data);
        return response.data;
    },

    deleteProduct: async (id) => {
        const response = await apiClient.delete(`/first-aid/products/${id}`);
        return response.data;
    },

    // Checklists Logs
    getChecklists: async (filters = {}) => {
        const response = await apiClient.get('/first-aid/checklists', { params: filters });
        return response.data;
    },

    getChecklistById: async (id) => {
        const response = await apiClient.get(`/first-aid/checklists/${id}`);
        return response.data;
    },

    createChecklist: async (data) => {
        const response = await apiClient.post('/first-aid/checklists', data);
        return response.data;
    },

    updateChecklist: async (id, data) => {
        const response = await apiClient.put(`/first-aid/checklists/${id}`, data);
        return response.data;
    },

    checkWeek: async (id, week) => {
        const response = await apiClient.post(`/first-aid/checklists/${id}/check/${week}`);
        return response.data;
    },

    reviewWeek: async (id, week) => {
        const response = await apiClient.post(`/first-aid/checklists/${id}/review/${week}`);
        return response.data;
    }
};

export default firstAidAPI;

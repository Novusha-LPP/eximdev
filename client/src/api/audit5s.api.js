import apiClient from './attendanceApiClient';

const audit5sAPI = {
    /**
     * Template Config
     */
    getTemplate: async (zoneId) => {
        const response = await apiClient.get('/audit5s/template', {
            params: { zoneId }
        });
        return response.data;
    },

    saveTemplate: async (templateData) => {
        // templateData now includes { zoneId, docNo, revNo, revDate, categories }
        const response = await apiClient.post('/audit5s/template', templateData);
        return response.data;
    },

    /**
     * Zones Management
     */
    getZones: async () => {
        const response = await apiClient.get('/audit5s/zones');
        return response.data;
    },

    saveZone: async (zoneData) => {
        const response = await apiClient.post('/audit5s/zones', zoneData);
        return response.data;
    },

    deleteZone: async (id) => {
        const response = await apiClient.delete(`/audit5s/zones/${id}`);
        return response.data;
    },

    /**
     * Checklist Operations
     */
    getChecklist: async (month, zoneId) => {
        const response = await apiClient.get('/audit5s/checklist', {
            params: { month, zoneId }
        });
        return response.data;
    },

    updateChecklist: async (id, checklistData) => {
        const response = await apiClient.put(`/audit5s/checklist/${id}`, checklistData);
        return response.data;
    }
};

export default audit5sAPI;

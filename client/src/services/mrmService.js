
import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_STRING || 'http://localhost:9006/api') + '/mrm';

const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    const userId = user._id || user.id || user.username || '';
    return {
        headers: {
            'Content-Type': 'application/json',
            'user-id': userId,
            'username': user.username || userId,
            'user-role': user.role || ''
        }
    };
};

export const fetchMRMItems = async (month, year, userId = null) => {
    try {
        const params = { month, year };
        if (userId) params.userId = userId;
        const response = await axios.get(API_URL, { params, ...getHeaders() });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const fetchMRMMetadata = async (month, year, userId = null) => {
    try {
        const params = { month, year };
        if (userId) params.userId = userId;
        const response = await axios.get(`${API_URL}/metadata`, { params, ...getHeaders() });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const saveMRMMetadata = async (data) => {
    try {
        const response = await axios.post(`${API_URL}/metadata`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const createMRMItem = async (data) => {
    try {
        const response = await axios.post(API_URL, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateMRMItem = async (id, data) => {
    try {
        const response = await axios.put(`${API_URL}/${id}`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteMRMItem = async (id) => {
    try {
        const response = await axios.delete(`${API_URL}/${id}`, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const importMRMItems = async (data) => {
    try {
        const response = await axios.post(`${API_URL}/import`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Fetch users who have MRM module assigned
export const fetchMRMUsers = async () => {
    try {
        const response = await axios.get(`${API_URL}/users`, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

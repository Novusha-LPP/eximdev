
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

export const bulkDeleteMRMItems = async (monthOrObj, year, userId) => {
    try {
        let params;
        if (typeof monthOrObj === 'object' && monthOrObj !== null) {
            params = monthOrObj;
        } else {
            params = { month: monthOrObj, year, userId };
        }
        const response = await axios.delete(`${API_URL}-bulk/delete`, { params, ...getHeaders() });
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

// Bulk reorder MRM items
export const reorderMRMItems = async (items) => {
    try {
        const response = await axios.put(`${API_URL}-bulk/reorder`, { items }, getHeaders());
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

// Fetch dashboard submissions summary
export const fetchMRMDashboard = async (month, year) => {
    try {
        const params = { month, year };
        const response = await axios.get(`${API_URL}/dashboard`, { params, ...getHeaders() });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Submit MRM for approval (triggers completeness validation)
export const submitMRM = async (data) => {
    try {
        const response = await axios.post(`${API_URL}/submit`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Approve MRM and lock month (Suraj/Admin only)
export const approveMRM = async (data) => {
    try {
        const response = await axios.post(`${API_URL}/approve`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Request revision on MRM (Suraj/Admin only)
export const requestMRMRevision = async (data) => {
    try {
        const response = await axios.post(`${API_URL}/request-revision`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Reopen an approved/locked month (Suraj/Admin only)
export const reopenMRM = async (data) => {
    try {
        const response = await axios.post(`${API_URL}/reopen`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Fetch executive approval queue (Suraj/Admin only)
export const fetchApprovalQueue = async (year = null) => {
    try {
        const params = {};
        if (year) params.year = year;
        const response = await axios.get(`${API_URL}/approval-queue`, { params, ...getHeaders() });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Fetch annual rollup and forecasts (Approved months only)
export const fetchAnnualRollup = async ({ year, userId, forecastMethod = 'best_worst' }) => {
    try {
        const params = { year, forecastMethod };
        if (userId) params.userId = userId;
        const response = await axios.get(`${API_URL}/annual-rollup`, { params, ...getHeaders() });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Fetch recurring issues analysis
export const fetchRecurringIssues = async (year = null) => {
    try {
        const params = {};
        if (year) params.year = year;
        const response = await axios.get(`${API_URL}/recurring-issues`, { params, ...getHeaders() });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Fetch Open Points tagged with MRM origin
export const fetchMRMOpenPoints = async (filterParams = {}) => {
    try {
        const response = await axios.get(`${API_URL}/open-points`, { params: filterParams, ...getHeaders() });
        return response.data;
    } catch (error) {
        throw error;
    }
};

// Update Objective Configuration (Aggregation, Optimization, Tolerance, Baseline & Macro References)
export const updateObjectiveConfig = async (data) => {
    try {
        const response = await axios.put(`${API_URL}/objective/config`, data, getHeaders());
        return response.data;
    } catch (error) {
        throw error;
    }
};


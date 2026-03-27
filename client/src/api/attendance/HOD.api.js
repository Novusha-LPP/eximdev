import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const hodAPI = {
  // Get dashboard data
  getDashboard: (date) => {
    const params = date ? { date } : {};
    return axios.get(`${API_BASE_URL}/hod/dashboard`, { params });
  },

  // Approve leave
  approveLeave: (applicationId) => {
    return axios.post(`${API_BASE_URL}/hod/leave/approve/${applicationId}`);
  },

  // Reject leave
  rejectLeave: (applicationId, data) => {
    return axios.post(`${API_BASE_URL}/hod/leave/reject/${applicationId}`, data);
  }
};

export default hodAPI;

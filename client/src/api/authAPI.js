import axios from "axios";

// Create an instance of axios with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || "http://0.0.0.0:9006",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const authMsg = error.response.data?.message || error.response.data?.error || "Your session has expired. Please log in again.";
      sessionStorage.setItem('auth_error_message', authMsg);
      localStorage.removeItem('token');
      localStorage.removeItem('exim_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;

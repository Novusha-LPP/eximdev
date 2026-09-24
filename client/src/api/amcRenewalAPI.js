import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || "http://0.0.0.0:9006",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach Bearer token for cross-origin/cookie fallback
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authMsg = error.response.data?.message || error.response.data?.error || "Your session has expired. Please log in again.";
      sessionStorage.setItem('auth_error_message', authMsg);
      localStorage.removeItem('token');
      localStorage.removeItem('exim_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ── AMC Renewal API ──────────────────────────────────────────────────────────

export const amcRenewalAPI = {
  // Fetch paginated list
  getAll: (params = {}) =>
    api.get("/amc-renewals", { params }).then((r) => r.data),

  // Get stats
  getStats: () =>
    api.get("/amc-renewals/stats").then((r) => r.data),

  // Get single record by ID
  getById: (id) =>
    api.get(`/amc-renewals/${id}`).then((r) => r.data),

  // Create new record
  create: (payload) =>
    api.post("/amc-renewals", payload).then((r) => r.data),

  // Update record
  update: (id, payload) =>
    api.put(`/amc-renewals/${id}`, payload).then((r) => r.data),

  // Delete
  remove: (id) =>
    api.delete(`/amc-renewals/${id}`).then((r) => r.data),
};

export default api;

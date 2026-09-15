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

// ── Scorecard API ────────────────────────────────────────────────────────────

export const scorecardAPI = {
  // Fetch paginated list
  getAll: (params = {}) =>
    api.get("/scorecards", { params }).then((r) => r.data),

  // Get blank template with default criteria
  getTemplate: () =>
    api.get("/scorecards/template").then((r) => r.data),

  // Get single scorecard by ID
  getById: (id) =>
    api.get(`/scorecards/${id}`).then((r) => r.data),

  // Create new scorecard
  create: (payload) =>
    api.post("/scorecards", payload).then((r) => r.data),

  // Update scorecard
  update: (id, payload) =>
    api.put(`/scorecards/${id}`, payload).then((r) => r.data),

  // Change status only
  updateStatus: (id, status) =>
    api.patch(`/scorecards/${id}/status`, { status }).then((r) => r.data),

  // Delete
  remove: (id) =>
    api.delete(`/scorecards/${id}`).then((r) => r.data),

  // Summary stats
  getStats: () =>
    api.get("/scorecards/stats/summary").then((r) => r.data),
};

export default api;

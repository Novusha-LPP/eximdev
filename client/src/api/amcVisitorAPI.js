import axios from "axios";

// Build baseURL: use env variable but replace 0.0.0.0 with current hostname
// so mobile devices scanning QR can reach the backend server
let apiBaseURL = process.env.REACT_APP_API_STRING || "http://0.0.0.0:9006/api";

if (
  typeof window !== "undefined" &&
  apiBaseURL.includes("0.0.0.0") &&
  window.location.hostname !== "0.0.0.0" &&
  window.location.hostname !== "127.0.0.1"
) {
  // Replace 0.0.0.0 with the PC's actual IP, preserving the /api prefix
  apiBaseURL = apiBaseURL.replace(
    /0.0.0.0|127\.0\.0\.1/,
    window.location.hostname
  );
}

const api = axios.create({
  baseURL: apiBaseURL,
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

export const amcVisitorAPI = {
  // Check-In (Public)
  checkIn: (payload) =>
    api.post("/amc-visitor/check-in", payload).then((r) => r.data),

  // Check-Out (Public)
  checkOut: (payload) =>
    api.post("/amc-visitor/check-out", payload).then((r) => r.data),

  // Get active check-in by mobile number (Public)
  getActiveByMobile: (mobile) =>
    api.get(`/amc-visitor/active/${mobile}`).then((r) => r.data),

  // Get all visitor logs (with filters, pagination)
  getLogs: (params = {}) =>
    api.get("/amc-visitor/logs", { params }).then((r) => r.data),

  // Update a log entry (Admin approval / edit)
  updateLog: (id, payload) =>
    api.put(`/amc-visitor/logs/${id}`, payload).then((r) => r.data),

  // Delete a log entry
  deleteLog: (id) =>
    api.delete(`/amc-visitor/logs/${id}`).then((r) => r.data),
};

export default amcVisitorAPI;

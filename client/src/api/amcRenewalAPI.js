import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || "http://localhost:9006",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

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

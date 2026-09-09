import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || "http://0.0.0.0:9006",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

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

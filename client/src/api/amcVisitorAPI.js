import axios from "axios";

// Build baseURL: use env variable but replace localhost with current hostname
// so mobile devices scanning QR can reach the backend server
let apiBaseURL = process.env.REACT_APP_API_STRING || "http://localhost:9006/api";

if (
  typeof window !== "undefined" &&
  apiBaseURL.includes("localhost") &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
) {
  // Replace localhost with the PC's actual IP, preserving the /api prefix
  apiBaseURL = apiBaseURL.replace(
    /localhost|127\.0\.0\.1/,
    window.location.hostname
  );
}

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

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

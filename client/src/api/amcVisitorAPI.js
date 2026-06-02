import axios from "axios";

let apiBaseURL = process.env.REACT_APP_API_STRING || "http://localhost:9006";

// If accessing the development site from a mobile phone via PC IP, dynamically point backend to PC IP
if (apiBaseURL.includes("localhost") && typeof window !== "undefined" && window.location.hostname !== "localhost") {
  apiBaseURL = `http://${window.location.hostname}:9006`;
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

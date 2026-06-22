import axios from "axios";

let apiBaseURL = process.env.REACT_APP_API_STRING || "http://localhost:9006";

if (apiBaseURL.includes("localhost") && typeof window !== "undefined" && window.location.hostname !== "localhost") {
  apiBaseURL = `http://${window.location.hostname}:9006`;
}

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const equipmentChecklistAPI = {
  // Submit new checklist
  create: (payload) =>
    api.post("/equipment-checklist", payload).then((r) => r.data),

  // Get list of checklist submissions
  getAll: (params = {}) =>
    api.get("/equipment-checklist", { params }).then((r) => r.data),

  // Get details of a single checklist
  getById: (id) =>
    api.get(`/equipment-checklist/${id}`).then((r) => r.data),

  // Delete checklist record
  remove: (id) =>
    api.delete(`/equipment-checklist/${id}`).then((r) => r.data),
};

export default equipmentChecklistAPI;

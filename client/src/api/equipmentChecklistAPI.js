import authAPI from "./authAPI";

const api = authAPI;

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

  // Update existing checklist
  update: (id, payload) =>
    api.put(`/equipment-checklist/${id}`, payload).then((r) => r.data),

  // Delete checklist record
  remove: (id) =>
    api.delete(`/equipment-checklist/${id}`).then((r) => r.data),
};

export default equipmentChecklistAPI;

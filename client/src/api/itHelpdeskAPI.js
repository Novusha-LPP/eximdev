import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || "http://localhost:9006/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const itHelpdeskAPI = {
  assets: {
    getAll: (params = {}) => api.get("/it-helpdesk/assets", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/assets/stats").then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/assets/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/assets", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/assets/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/assets/${id}`).then((r) => r.data),
  },
  tickets: {
    getAll: (params = {}) => api.get("/it-helpdesk/tickets", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/tickets/stats").then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/tickets/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/tickets", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/tickets/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/tickets/${id}`).then((r) => r.data),
  },
  vendors: {
    getAll: (params = {}) => api.get("/it-helpdesk/vendors", { params }).then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/vendors/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/vendors", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/vendors/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/vendors/${id}`).then((r) => r.data),
  },
  contracts: {
    getAll: (params = {}) => api.get("/it-helpdesk/contracts", { params }).then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/contracts/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/contracts", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/contracts/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/contracts/${id}`).then((r) => r.data),
  },
  licenses: {
    getAll: (params = {}) => api.get("/it-helpdesk/licenses", { params }).then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/licenses/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/licenses", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/licenses/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/licenses/${id}`).then((r) => r.data),
  },
  inventory: {
    getAll: (params = {}) => api.get("/it-helpdesk/inventory", { params }).then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/inventory/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/inventory", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/inventory/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/inventory/${id}`).then((r) => r.data),
  },
};

export default api;

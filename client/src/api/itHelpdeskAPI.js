import authAPI from "./authAPI";

const api = authAPI;

export const itHelpdeskAPI = {
  assets: {
    getAll: (params = {}) => api.get("/it-helpdesk/assets", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/assets/stats").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/assets/export", { params, responseType: "blob" }),
    getById: (id) => api.get(`/it-helpdesk/assets/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/assets", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/assets/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/assets/${id}`).then((r) => r.data),
  },
  tickets: {
    getAll: (params = {}) => api.get("/it-helpdesk/tickets", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/tickets/stats").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/tickets/export", { params, responseType: "blob" }),
    getReport: (params = {}) => api.get("/it-helpdesk/tickets/report", { params }).then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/tickets/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/tickets", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/tickets/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/tickets/${id}`).then((r) => r.data),
    assign: (id, payload) => api.post(`/it-helpdesk/tickets/${id}/assign`, payload).then((r) => r.data),
    addHistory: (id, payload) => api.post(`/it-helpdesk/tickets/${id}/history`, payload).then((r) => r.data),
    uploadAttachment: (id, formData) =>
      api.post(`/it-helpdesk/tickets/${id}/attachments`, formData).then((r) => r.data),
    deleteAttachment: (id, attachmentId) =>
      api.delete(`/it-helpdesk/tickets/${id}/attachments/${attachmentId}`).then((r) => r.data),
    replaceAttachment: (id, attachmentId, formData) =>
      api.put(`/it-helpdesk/tickets/${id}/attachments/${attachmentId}`, formData).then((r) => r.data),
  },
  vendors: {
    getAll: (params = {}) => api.get("/it-helpdesk/vendors", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/vendors/stats").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/vendors/export", { params, responseType: "blob" }),
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
    getStats: () => api.get("/it-helpdesk/licenses/stats").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/licenses/export", { params, responseType: "blob" }),
    getById: (id) => api.get(`/it-helpdesk/licenses/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/licenses", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/licenses/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/licenses/${id}`).then((r) => r.data),
  },
  inventory: {
    getAll: (params = {}) => api.get("/it-helpdesk/inventory", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/inventory/stats").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/inventory/export", { params, responseType: "blob" }),
    getById: (id) => api.get(`/it-helpdesk/inventory/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/inventory", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/inventory/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/inventory/${id}`).then((r) => r.data),
  },
  users: {
    getAll: (params = {}) => api.get("/it-helpdesk/users", { params }).then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/users/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/users", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/users/${id}`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/users/${id}`).then((r) => r.data),
  },
  notifications: {
    getAll: (params = {}) => api.get("/it-helpdesk/notifications", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/notifications/stats").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/notifications/export", { params, responseType: "blob" }),
  },
  audit: {
    getAll: (params = {}) => api.get("/audit-trail", { params }).then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/audit/export", { params, responseType: "blob" }),
  },
  reports: {
    export: (reportType, params = {}) =>
      api.get(`/it-helpdesk/reports/${reportType}/export`, {
        params,
        responseType: "blob",
      }),
  },
  admin: {
    myBranches: () => api.get("/admin/my-branches").then((r) => r.data),
  },
};

export default api;

import authAPI from "./authAPI";

const api = authAPI;

export const itHelpdeskAPI = {
  assets: {
    getAll: (params = {}) => api.get("/it-helpdesk/assets", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/assets/stats").then((r) => r.data),
    getNextTag: () => api.get("/it-helpdesk/assets/next-tag").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/assets/export", { params, responseType: "blob" }),
    getById: (id) => api.get(`/it-helpdesk/assets/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/assets", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/assets/${id}`, payload).then((r) => r.data),
    updateWorkflow: (id, payload) => api.put(`/it-helpdesk/assets/${id}/workflow`, payload).then((r) => r.data),
    getApprovalSettings: () => api.get("/it-helpdesk/assets/settings/approval").then((r) => r.data),
    updateApprovalSettings: (payload) => api.put("/it-helpdesk/assets/settings/approval", payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/assets/${id}`).then((r) => r.data),
  },
  tickets: {
    getAll: (params = {}) => api.get("/it-helpdesk/tickets", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/tickets/stats").then((r) => r.data),
    export: (params = {}) => api.get("/it-helpdesk/reports/tickets/export", { params, responseType: "blob" }),
    getReport: (params = {}) => api.get("/it-helpdesk/tickets/report", { params }).then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/tickets/${id}`).then((r) => r.data),
    create: (payload) => {
      const isFormData = payload instanceof FormData;
      return api.post("/it-helpdesk/tickets", payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
      }).then((r) => r.data);
    },
    update: (id, payload) => {
      const isFormData = payload instanceof FormData;
      return api.put(`/it-helpdesk/tickets/${id}`, payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
      }).then((r) => r.data);
    },
    remove: (id) => api.delete(`/it-helpdesk/tickets/${id}`).then((r) => r.data),
    assign: (id, payload) => api.post(`/it-helpdesk/tickets/${id}/assign`, payload).then((r) => r.data),
    addHistory: (id, payload) => api.post(`/it-helpdesk/tickets/${id}/history`, payload).then((r) => r.data),
    uploadAttachment: (id, formData) =>
      api.post(`/it-helpdesk/tickets/${id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),
    deleteAttachment: (id, attachmentId) =>
      api.delete(`/it-helpdesk/tickets/${id}/attachments/${attachmentId}`).then((r) => r.data),
    replaceAttachment: (id, attachmentId, formData) =>
      api.put(`/it-helpdesk/tickets/${id}/attachments/${attachmentId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),
  },
  vendors: {
    getAll: (params = {}) => api.get("/it-helpdesk/vendors", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/vendors/stats").then((r) => r.data),
    getNextCode: () => api.get("/it-helpdesk/vendors/next-code").then((r) => r.data),
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
  unifiedAssets: {
    getAll: (params = {}) => api.get("/it-helpdesk/unified-assets", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/unified-assets/stats").then((r) => r.data),
    getNextTag: () => api.get("/it-helpdesk/unified-assets/next-tag").then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/unified-assets/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/unified-assets", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/unified-assets/${id}`, payload).then((r) => r.data),
    quickAssign: (id, payload) => api.put(`/it-helpdesk/unified-assets/${id}/quick-assign`, payload).then((r) => r.data),
    quickReturn: (id, payload) => api.put(`/it-helpdesk/unified-assets/${id}/quick-return`, payload).then((r) => r.data),
    quickStatus: (id, payload) => api.put(`/it-helpdesk/unified-assets/${id}/quick-status`, payload).then((r) => r.data),
    updateWorkflow: (id, payload) => api.put(`/it-helpdesk/unified-assets/${id}/workflow`, payload).then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/unified-assets/${id}`).then((r) => r.data),
    exportExcel: (params = {}) => api.get("/it-helpdesk/unified-assets/export/excel", { params, responseType: "blob" }),
    cloneFromLegacy: () => api.post("/it-helpdesk/unified-assets/clone-from-legacy").then((r) => r.data),
  },
  procurement: {
    getAll: (params = {}) => api.get("/it-helpdesk/procurement", { params }).then((r) => r.data),
    getStats: () => api.get("/it-helpdesk/procurement/stats").then((r) => r.data),
    getNextPr: () => api.get("/it-helpdesk/procurement/next-pr").then((r) => r.data),
    getById: (id) => api.get(`/it-helpdesk/procurement/${id}`).then((r) => r.data),
    create: (payload) => api.post("/it-helpdesk/procurement", payload).then((r) => r.data),
    update: (id, payload) => api.put(`/it-helpdesk/procurement/${id}`, payload).then((r) => r.data),
    uploadQuotations: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/quotations`, payload).then((r) => r.data),
    evaluateIT: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/it-evaluate`, payload).then((r) => r.data),
    approveHOD: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/approve-hod`, payload).then((r) => r.data),
    approveGM: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/approve-gm`, payload).then((r) => r.data),
    createPO: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/po`, payload).then((r) => r.data),
    recordGRN: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/grn`, payload).then((r) => r.data),
    verifyInvoice: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/invoice-verify`, payload).then((r) => r.data),
    recordPayment: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/payment`, payload).then((r) => r.data),
    convertToAsset: (id, payload = {}) => api.post(`/it-helpdesk/procurement/${id}/convert-to-asset`, payload).then((r) => r.data),
    handover: (id, payload) => api.post(`/it-helpdesk/procurement/${id}/handover`, payload).then((r) => r.data),
    uploadDoc: (formData) =>
      api
        .post("/it-helpdesk/procurement/upload-doc", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),
    remove: (id) => api.delete(`/it-helpdesk/procurement/${id}`).then((r) => r.data),
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

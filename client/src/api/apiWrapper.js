import authAPI from "./authAPI";
import { auditService } from "../services/auditService";

// API wrapper that adds logging to all API calls
export const apiWithLogging = {
  // GET request with logging
  get: async (url, params = {}, moduleName = "General") => {
    try {
      const response = await authAPI.get(url, { params });

      // Log successful request
      await auditService.logAction({
        action: "API_REQUEST",
        module: moduleName,
        severity: "info",
        details: `GET request to ${url} successful`,
        url: window.location.href,
        additionalData: { url, params, status: response.status }
      });

      return response.data;
    } catch (error) {
      // Log error
      await auditService.logApiError(error, moduleName);
      throw error;
    }
  },

  // POST request with logging
  post: async (url, data = {}, moduleName = "General") => {
    try {
      const response = await authAPI.post(url, data);

      // Log successful request
      await auditService.logAction({
        action: "API_REQUEST",
        module: moduleName,
        severity: "info",
        details: `POST request to ${url} successful`,
        url: window.location.href,
        additionalData: { url, data, status: response.status }
      });

      return response.data;
    } catch (error) {
      // Log error
      await auditService.logApiError(error, moduleName);
      throw error;
    }
  },

  // PUT request with logging
  put: async (url, data = {}, moduleName = "General") => {
    try {
      const response = await authAPI.put(url, data);

      // Log successful request
      await auditService.logAction({
        action: "API_REQUEST",
        module: moduleName,
        severity: "info",
        details: `PUT request to ${url} successful`,
        url: window.location.href,
        additionalData: { url, data, status: response.status }
      });

      return response.data;
    } catch (error) {
      // Log error
      await auditService.logApiError(error, moduleName);
      throw error;
    }
  },

  // DELETE request with logging
  delete: async (url, moduleName = "General") => {
    try {
      const response = await authAPI.delete(url);

      // Log successful request
      await auditService.logAction({
        action: "API_REQUEST",
        module: moduleName,
        severity: "info",
        details: `DELETE request to ${url} successful`,
        url: window.location.href,
        additionalData: { url, status: response.status }
      });

      return response.data;
    } catch (error) {
      // Log error
      await auditService.logApiError(error, moduleName);
      throw error;
    }
  }
};

// Update itHelpdeskAPI to use the logging wrapper
export const itHelpdeskAPIWithLogging = {
  assets: {
    getAll: (params = {}) => apiWithLogging.get("/it-helpdesk/assets", params, "Asset Management"),
    getStats: () => apiWithLogging.get("/it-helpdesk/assets/stats", {}, "Asset Management"),
    getById: (id) => apiWithLogging.get(`/it-helpdesk/assets/${id}`, {}, "Asset Management"),
    create: (payload) => apiWithLogging.post("/it-helpdesk/assets", payload, "Asset Management"),
    update: (id, payload) => apiWithLogging.put(`/it-helpdesk/assets/${id}`, payload, "Asset Management"),
    remove: (id) => apiWithLogging.delete(`/it-helpdesk/assets/${id}`, "Asset Management"),
  },
  tickets: {
    getAll: (params = {}) => apiWithLogging.get("/it-helpdesk/tickets", params, "Ticket Management"),
    getStats: () => apiWithLogging.get("/it-helpdesk/tickets/stats", {}, "Ticket Management"),
    getById: (id) => apiWithLogging.get(`/it-helpdesk/tickets/${id}`, {}, "Ticket Management"),
    create: (payload) => apiWithLogging.post("/it-helpdesk/tickets", payload, "Ticket Management"),
    update: (id, payload) => apiWithLogging.put(`/it-helpdesk/tickets/${id}`, payload, "Ticket Management"),
    remove: (id) => apiWithLogging.delete(`/it-helpdesk/tickets/${id}`, "Ticket Management"),
  },
  vendors: {
    getAll: (params = {}) => apiWithLogging.get("/it-helpdesk/vendors", params, "Vendor Management"),
    getById: (id) => apiWithLogging.get(`/it-helpdesk/vendors/${id}`, {}, "Vendor Management"),
    create: (payload) => apiWithLogging.post("/it-helpdesk/vendors", payload, "Vendor Management"),
    update: (id, payload) => apiWithLogging.put(`/it-helpdesk/vendors/${id}`, payload, "Vendor Management"),
    remove: (id) => apiWithLogging.delete(`/it-helpdesk/vendors/${id}`, "Vendor Management"),
  },
  licenses: {
    getAll: (params = {}) => apiWithLogging.get("/it-helpdesk/licenses", params, "License Management"),
    getStats: () => apiWithLogging.get("/it-helpdesk/licenses/stats", {}, "License Management"),
    getById: (id) => apiWithLogging.get(`/it-helpdesk/licenses/${id}`, {}, "License Management"),
    create: (payload) => apiWithLogging.post("/it-helpdesk/licenses", payload, "License Management"),
    update: (id, payload) => apiWithLogging.put(`/it-helpdesk/licenses/${id}`, payload, "License Management"),
    remove: (id) => apiWithLogging.delete(`/it-helpdesk/licenses/${id}`, "License Management"),
  },
  contracts: {
    getAll: (params = {}) => apiWithLogging.get("/it-helpdesk/contracts", params, "Contract Management"),
    getStats: () => apiWithLogging.get("/it-helpdesk/contracts/stats", {}, "Contract Management"),
    getById: (id) => apiWithLogging.get(`/it-helpdesk/contracts/${id}`, {}, "Contract Management"),
    create: (payload) => apiWithLogging.post("/it-helpdesk/contracts", payload, "Contract Management"),
    update: (id, payload) => apiWithLogging.put(`/it-helpdesk/contracts/${id}`, payload, "Contract Management"),
    remove: (id) => apiWithLogging.delete(`/it-helpdesk/contracts/${id}`, "Contract Management"),
  },
  users: {
    getAll: (params = {}) => apiWithLogging.get("/it-helpdesk/users", params, "User Management"),
    getStats: () => apiWithLogging.get("/it-helpdesk/users/stats", {}, "User Management"),
    getById: (id) => apiWithLogging.get(`/it-helpdesk/users/${id}`, {}, "User Management"),
    create: (payload) => apiWithLogging.post("/it-helpdesk/users", payload, "User Management"),
    update: (id, payload) => apiWithLogging.put(`/it-helpdesk/users/${id}`, payload, "User Management"),
    remove: (id) => apiWithLogging.delete(`/it-helpdesk/users/${id}`, "User Management"),
  },
  admin: {
    myBranches: () => apiWithLogging.get("/admin/my-branches", {}, "Admin"),
    // Add other admin endpoints as needed
  }
};

import authAPI from "../api/authAPI";

// Audit service to handle all logging operations
export const auditService = {
  // Log any action
  logAction: async (actionData) => {
    try {
      const response = await authAPI.post("/audit-trail/custom", actionData);
      return response.data;
    } catch (error) {
      console.error("Error logging action:", error);
      return null;
    }
  },

  // Log CRUD operations
  logCRUD: async (module, operation, entityName, entityId, details, severity = "info") => {
    const actionMap = {
      create: "CREATE",
      read: "VIEW",
      update: "UPDATE",
      delete: "DELETE"
    };

    const actionData = {
      action: actionMap[operation] || operation.toUpperCase(),
      module,
      severity,
      details: `${operation.toUpperCase()} operation performed on ${entityName} (ID: ${entityId}). ${details ? `Details: ${details}` : ''}`,
      targetEntity: entityName,
      targetId: entityId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      ip_address: "127.0.0.1" // This can be enhanced to get real IP
    };

    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem('exim_user'));
    if (user) {
      actionData.username = user.username;
      actionData.userId = user._id;
    }

    return auditService.logAction(actionData);
  },

  // Log module access
  logModuleAccess: async (moduleName) => {
    return auditService.logAction({
      action: "MODULE_ACCESS",
      module: moduleName,
      severity: "info",
      details: `Accessed ${moduleName} module`,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
  },

  // Log form submissions
  logFormSubmit: async (formName, action, details) => {
    return auditService.logAction({
      action: "FORM_SUBMIT",
      module: "General",
      severity: "info",
      details: `Form ${formName} ${action}. ${details ? `Details: ${details}` : ''}`,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
  },

  // Log API errors
  logApiError: async (error, module = "General") => {
    return auditService.logAction({
      action: "API_ERROR",
      module,
      severity: "error",
      details: error.message || "API request failed",
      timestamp: new Date().toISOString(),
      url: window.location.href,
      additionalData: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      }
    });
  }
};

// Higher-order component to add logging to any component
export const withAuditLogging = (WrappedComponent, moduleName) => {
  return function WithAuditLogging(props) {
    // Log module access when component mounts
    React.useEffect(() => {
      auditService.logModuleAccess(moduleName);
    }, [moduleName]);

    return <WrappedComponent {...props} />;
  };
};

// Hook to use audit service in components
export const useAudit = () => {
  return {
    logAction: auditService.logAction,
    logCRUD: auditService.logCRUD,
    logModuleAccess: auditService.logModuleAccess,
    logFormSubmit: auditService.logFormSubmit,
    logApiError: auditService.logApiError
  };
};

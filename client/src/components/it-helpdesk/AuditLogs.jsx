// components/AuditLogs.js
import React, { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  Tab,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  TabList,
  TabPanel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import { toast } from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";
import { debounce } from "lodash";

/*
 * Audit Logging Documentation:
 * 
 * 1. useActionLogger - Provides basic action logging functionality
 *    - logAction(moduleName, action, details, severity, additionalData)
 *    - logCRUD(moduleName, operation, entityName, entityId, entityDetails, user, severity, additionalData)
 *    - useAutoLogger(moduleName, trackedActions) - Automatically logs DOM events
 * 
 * 2. useAuditCRUD - High-level hook for automatic CRUD operations logging
 *    - Automatically initializes action tracking for a module
 *    - Provides pre-built CRUD logging functions
 *    - Usage: const audit = useAuditCRUD('User Management', 'User', ['click', 'submit']);
 *    - Methods: audit.logCreate(id, details), audit.logRead(id, details), etc.
 * 
 * 3. Adding data-action attributes to UI elements
 *    - <button data-action="delete">Delete</button>
 *    - <form data-form-action="submit-user-form">...</form>
 * 
 * 4. Using in any module without manual implementation
 *    - Import useAuditCRUD
 *    - Initialize with module name and entity name
 *    - Call appropriate CRUD methods when actions occur
 */

// Create a context for audit logging
const AuditLogContext = createContext();

// Define types for audit log
const AuditLogType = {
  id: '',
  user: '',
  action: '',
  module: '',
  severity: 'info',
  timestamp: '',
  ip_address: '',
  user_agent: '',
  details: ''
};

// Predefined modules and actions for consistency
const MODULES = {
  AUTHENTICATION: 'Authentication',
  USER_MANAGEMENT: 'User Management',
  ROLE_MANAGEMENT: 'Role Management',
  TICKET_MANAGEMENT: 'Ticket Management',
  ASSET_MANAGEMENT: 'Asset Management',
  ADMINISTRATION: 'Administration',
  GENERAL: 'General'
};

const ACTIONS = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  VIEW: 'View',
  EXPORT: 'Export',
  IMPORT: 'Import',
  SEARCH: 'Search',
  FILTER: 'Filter',
  APPROVE: 'Approve',
  REJECT: 'Reject',
  SUBMIT: 'Submit',
  CANCEL: 'Cancel'
};

// Severity levels
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
};

// Provider component for audit logs
export const AuditLogProvider = ({ children }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pendingLogsRef = useRef([]);

  // Helper function to create audit log entries
  const createAuditLog = useCallback((logData) => {
    const currentUser = JSON.parse(localStorage.getItem('user')) || { name: 'Unknown User' };

    return {
      id: `log-${Date.now()}`,
      user: currentUser.name,
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.100',
      user_agent: navigator.userAgent,
      severity: logData.severity || SEVERITY.INFO,
      ...logData
    };
  }, []);

  // Add new audit log with batching capability
  const addAuditLog = useCallback(async (logData, batch = false) => {
    try {
      const newLog = createAuditLog(logData);

      if (batch) {
        pendingLogsRef.current.push(newLog);
        return newLog;
      }

      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/audit-trail/custom`, logData);
      const savedLog = response.data.log;

      const mappedLog = {
        id: savedLog._id,
        user: savedLog.username,
        action: savedLog.action,
        module: savedLog.documentType,
        severity: logData.severity || 'info',
        timestamp: savedLog.timestamp,
        ip_address: '',
        user_agent: savedLog.userAgent || '',
        details: savedLog.heading || ''
      };

      setAuditLogs(prevLogs => [mappedLog, ...prevLogs]);
      return mappedLog;
    } catch (err) {
      console.error('Error adding audit log:', err);
      // We don't throw to prevent UI interruptions for simple logging
    }
  }, [createAuditLog]);

  // Batch multiple audit logs together
  const batchAddAuditLogs = useCallback(async (logsData) => {
    try {
      return logsData;
    } catch (err) {
      console.error('Error adding batch audit logs:', err);
    }
  }, []);

  // Process pending logs
  const processPendingLogs = useCallback(async () => {
    if (pendingLogsRef.current.length > 0) {
      pendingLogsRef.current = [];
    }
  }, []);

  // Fetch audit logs from API
  const fetchAuditLogs = useCallback(async (isRefresh = false, module = null) => {
    try {
      setLoading(true);
      setIsRefreshing(isRefresh);

      const params = {
        limit: 1000
      };

      if (module) {
        params.documentType = module;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/audit-trail`, { params });
      const backendLogs = response.data.auditTrail || [];

      const newLogs = backendLogs.map(log => ({
        id: log._id,
        user: log.username,
        action: log.action,
        module: log.documentType,
        severity: log.action === 'DELETE' ? 'warning' : 'info',
        timestamp: log.timestamp,
        ip_address: '',
        user_agent: log.userAgent || '',
        details: log.heading || ''
      }));

      if (isRefresh) {
        setAuditLogs(prevLogs => {
          const existingIds = new Set(prevLogs.map(log => log.id));
          const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log.id));
          return [...uniqueNewLogs, ...prevLogs];
        });
      } else {
        setAuditLogs(newLogs);
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('API endpoint not available - failed to fetch audit logs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [lastUpdated]);

  // Function to fetch logs for a specific module
  const fetchModuleLogs = useCallback(async (module) => {
    if (!module) return;

    try {
      setLoading(true);

      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/audit-trail`, {
        params: {
          documentType: module,
          limit: 1000
        }
      });

      const backendLogs = response.data.auditTrail || [];
      const moduleLogs = backendLogs.map(log => ({
        id: log._id,
        user: log.username,
        action: log.action,
        module: log.documentType,
        severity: log.action === 'DELETE' ? 'warning' : 'info',
        timestamp: log.timestamp,
        ip_address: '',
        user_agent: log.userAgent || '',
        details: log.heading || ''
      }));

      setAuditLogs(moduleLogs);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error(`Error fetching logs for module ${module}:`, err);
      setError(`Failed to fetch logs for ${module}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize audit logs
  useEffect(() => {
    fetchAuditLogs(false); // Initial fetch for all modules

    // Process pending logs before unmounting
    return () => {
      processPendingLogs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuditLogContext.Provider value={{
      auditLogs,
      addAuditLog,
      fetchModuleLogs,
      loading,
      error,
      lastUpdated,
      isRefreshing,
      refreshLogs: () => fetchAuditLogs(true),
      batchAddAuditLogs,
      fetchAuditLogs,
      processPendingLogs,
      MODULES,
      ACTIONS,
      SEVERITY
    }}>
      {children}
    </AuditLogContext.Provider>
  );
};

// HOC for adding audit logging capability to any component
export const withAuditLog = (WrappedComponent, moduleName, customActions = {}) => {
  return function WithAuditLog(props) {
    const { addAuditLog } = useAuditLogs();

    const logAction = useCallback((action, details, severity = SEVERITY.INFO, additionalData = {}) => {
      addAuditLog({
        action,
        module: moduleName,
        severity,
        details,
        ...additionalData
      });
    }, [addAuditLog, moduleName]);

    // Merge custom actions with default actions
    const componentActions = {
      ...ACTIONS,
      ...customActions
    };

    return <WrappedComponent
      {...props}
      logAction={logAction}
      actions={componentActions}
    />;
  };
};

// Hook for logging actions from anywhere in the app
export const useActionLogger = () => {
  const { addAuditLog } = useAuditLogs();

  const logAction = useCallback((moduleName, action, details, severity = SEVERITY.INFO, additionalData = {}) => {
    addAuditLog({
      action,
      module: moduleName,
      severity,
      details,
      ...additionalData
    });
  }, [addAuditLog]);

  // Generic function to log any CRUD operation
  const logCRUD = useCallback((moduleName, operation, entityName, entityId, entityDetails, user, severity = SEVERITY.INFO, additionalData = {}) => {
    const actionMap = {
      create: ACTIONS.CREATE,
      read: ACTIONS.VIEW,
      update: ACTIONS.UPDATE,
      delete: ACTIONS.DELETE
    };

    addAuditLog({
      action: actionMap[operation] || operation.toUpperCase(),
      module: moduleName,
      severity,
      details: `${operation.toUpperCase()} operation performed on ${entityName} (ID: ${entityId}). ${entityDetails ? `Details: ${entityDetails}` : ''}`,
      targetEntity: entityName,
      targetId: entityId,
      performedBy: user || JSON.parse(localStorage.getItem('user'))?.name || 'Unknown User',
      ...additionalData
    });
  }, [addAuditLog, ACTIONS, SEVERITY]);

  // Function to automatically detect and log actions based on DOM events
  const useAutoLogger = (moduleName, trackedActions = ['click', 'submit']) => {
    const { addAuditLog } = useAuditLogs();

    useEffect(() => {
      const handleClick = (e) => {
        const target = e.target;
        const actionName = target.getAttribute('data-action') ||
          target.closest('[data-action]')?.getAttribute('data-action');

        if (actionName) {
          logAction(
            moduleName,
            actionName,
            `User clicked on ${actionName} in ${moduleName}`,
            SEVERITY.INFO,
            {
              element: target.tagName,
              classList: Array.from(target.classList).join(' '),
              id: target.id
            }
          );
        }
      };

      const handleSubmit = (e) => {
        const form = e.target;
        const formAction = form.getAttribute('data-form-action') || 'SUBMIT';

        logAction(
          moduleName,
          formAction,
          `Form submitted in ${moduleName}`,
          SEVERITY.INFO,
          {
            formId: form.id,
            action: form.action
          }
        );
      };

      // Add event listeners if click tracking is enabled
      if (trackedActions.includes('click')) {
        document.addEventListener('click', handleClick);
      }

      // Add form submit listener if submit tracking is enabled
      if (trackedActions.includes('submit')) {
        document.addEventListener('submit', handleSubmit);
      }

      return () => {
        if (trackedActions.includes('click')) {
          document.removeEventListener('click', handleClick);
        }

        if (trackedActions.includes('submit')) {
          document.removeEventListener('submit', handleSubmit);
        }
      };
    }, [moduleName, trackedActions, logAction]);
  };

  return { logAction, logCRUD, useAutoLogger };
};

// High-level hook for automatic CRUD logging without manual implementation
export const useAuditCRUD = (moduleName, entityName, trackedActions = []) => {
  const { logCRUD, useAutoLogger } = useActionLogger();

  // Initialize automatic logging for this module
  useAutoLogger(moduleName, trackedActions);

  // Return CRUD functions that can be used in any module
  return {
    logCreate: (entityId, details, user, additionalData = {}) => {
      logCRUD(moduleName, 'create', entityName, entityId, details, user, SEVERITY.INFO, additionalData);
    },
    logRead: (entityId, details, user, additionalData = {}) => {
      logCRUD(moduleName, 'read', entityName, entityId, details, user, SEVERITY.INFO, additionalData);
    },
    logUpdate: (entityId, details, user, additionalData = {}) => {
      logCRUD(moduleName, 'update', entityName, entityId, details, user, SEVERITY.INFO, additionalData);
    },
    logDelete: (entityId, details, user, additionalData = {}) => {
      logCRUD(moduleName, 'delete', entityName, entityId, details, user, SEVERITY.WARNING, additionalData);
    },
    logCustom: (action, entityId, details, severity = SEVERITY.INFO, user, additionalData = {}) => {
      logCRUD(moduleName, action, entityName, entityId, details, user, severity, additionalData);
    }
  };
};

// Custom hook for module-specific audit logging
export const useModuleAuditLogs = (moduleName) => {
  const { auditLogs, addAuditLog, fetchModuleLogs, ...rest } = useAuditLogs();

  // Filter logs by module
  const moduleLogs = useMemo(() => {
    return auditLogs.filter(log => log.module === moduleName);
  }, [auditLogs, moduleName]);

  // Module-specific CRUD functions
  const logCreate = (id, details, severity = SEVERITY.INFO) => {
    addAuditLog({
      action: ACTIONS.CREATE,
      module: moduleName,
      severity,
      details: `Created new ${details}`,
      targetId: id
    });
  };

  const logRead = (id, details, severity = SEVERITY.INFO) => {
    addAuditLog({
      action: ACTIONS.VIEW,
      module: moduleName,
      severity,
      details: `Viewed ${details}`,
      targetId: id
    });
  };

  const logUpdate = (id, details, severity = SEVERITY.INFO) => {
    addAuditLog({
      action: ACTIONS.UPDATE,
      module: moduleName,
      severity,
      details: `Updated ${details}`,
      targetId: id
    });
  };

  const logDelete = (id, details, severity = SEVERITY.WARNING) => {
    addAuditLog({
      action: ACTIONS.DELETE,
      module: moduleName,
      severity,
      details: `Deleted ${details}`,
      targetId: id
    });
  };

  return {
    ...rest,
    auditLogs: moduleLogs,
    addAuditLog,
    fetchModuleLogs,
    logCreate,
    logRead,
    logUpdate,
    logDelete
  };
};

export const useAuditLogs = () => {
  const context = useContext(AuditLogContext);
  if (!context) {
    throw new Error('useAuditLogs must be used within an AuditLogProvider');
  }

  // Add CRUD functionality
  const logCreate = (id, details, severity = SEVERITY.INFO, module = 'General') => {
    context.addAuditLog({
      action: ACTIONS.CREATE,
      module,
      severity,
      details: `Created new ${details}`,
      targetId: id
    });
  };

  const logRead = (id, details, severity = SEVERITY.INFO, module = 'General') => {
    context.addAuditLog({
      action: ACTIONS.VIEW,
      module,
      severity,
      details: `Viewed ${details}`,
      targetId: id
    });
  };

  const logUpdate = (id, details, severity = SEVERITY.INFO, module = 'General') => {
    context.addAuditLog({
      action: ACTIONS.UPDATE,
      module,
      severity,
      details: `Updated ${details}`,
      targetId: id
    });
  };

  const logDelete = (id, details, severity = SEVERITY.WARNING, module = 'General') => {
    context.addAuditLog({
      action: ACTIONS.DELETE,
      module,
      severity,
      details: `Deleted ${details}`,
      targetId: id
    });
  };

  return {
    ...context,
    logCreate,
    logRead,
    logUpdate,
    logDelete
  };
};

// Custom hook for tracking component actions
export const useComponentTracker = (moduleName, actionsToTrack = []) => {
  const { addAuditLog } = useAuditLogs();
  const componentRef = useRef(null);

  useEffect(() => {
    if (!componentRef.current) return;

    const trackAction = (action, details, severity = SEVERITY.INFO) => {
      addAuditLog({
        action,
        module: moduleName,
        severity,
        details,
        timestamp: new Date().toISOString()
      });
    };

    // Add event listeners for tracking
    const addListeners = () => {
      if (!actionsToTrack.length) return;

      actionsToTrack.forEach(actionType => {
        if (actionType === 'click') {
          componentRef.current.addEventListener('click', (e) => {
            const target = e.target;
            const actionName = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');

            if (actionName) {
              trackAction(
                actionName,
                `User clicked on ${target.tagName.toLowerCase()} with action "${actionName}"`
              );
            }
          });
        }

        // Add more action types as needed
      });
    };

    addListeners();

    return () => {
      // Clean up listeners
      if (!actionsToTrack.length) return;

      actionsToTrack.forEach(actionType => {
        if (actionType === 'click') {
          componentRef.current.removeEventListener('click', () => { });
        }
      });
    };
  }, [moduleName, actionsToTrack, addAuditLog]);

  return componentRef;
};

// Main AuditLogs component
const AuditLogsComponent = () => {
  const {
    auditLogs,
    loading,
    error,
    fetchAuditLogs,
    lastUpdated,
    isRefreshing,
    MODULES,
    ACTIONS,
    SEVERITY
  } = useAuditLogs();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [tabValue, setTabValue] = useState("all");
  const [exportLoading, setExportLoading] = useState(false);
  const [newLogsCount, setNewLogsCount] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterIp, setFilterIp] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  // Track new logs
  useEffect(() => {
    if (lastUpdated) {
      const recentLogs = auditLogs.filter(log =>
        new Date(log.timestamp) > new Date(Date.now() - 60000)
      );
      setNewLogsCount(recentLogs.length);
    }
  }, [auditLogs, lastUpdated]);

  // Debounced search handler
  const handleSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Filter audit logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch =
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUser = !filterUser || log.user === filterUser;
      const matchesAction = !filterAction || log.action === filterAction;
      const matchesIp = !filterIp || log.ip_address === filterIp;
      const matchesModule = !filterModule || log.module === filterModule;
      const matchesTab = tabValue === "all" ||
        (tabValue === "recent" && new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
        (tabValue === "errors" && log.severity === SEVERITY.ERROR) ||
        (tabValue === "warnings" && log.severity === SEVERITY.WARNING);

      let matchesDate = true;
      if (dateRange.startDate || dateRange.endDate) {
        const logDate = new Date(log.timestamp);
        if (dateRange.startDate) {
          const startDate = new Date(dateRange.startDate);
          startDate.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && logDate >= startDate;
        }
        if (dateRange.endDate) {
          const endDate = new Date(dateRange.endDate);
          endDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && logDate <= endDate;
        }
      }

      return matchesSearch && matchesUser && matchesAction && matchesIp && matchesModule && matchesDate && matchesTab;
    });
  }, [auditLogs, searchTerm, filterUser, filterAction, filterIp, filterModule, dateRange, tabValue, SEVERITY]);

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const handleExportLogs = useCallback(async () => {
    setExportLoading(true);
    try {
      const headers = ['Timestamp', 'User', 'Action', 'Module', 'Severity', 'IP Address', 'Details'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          log.timestamp,
          log.user,
          log.action,
          log.module,
          log.severity,
          log.ip_address,
          `"${log.details}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Audit logs exported successfully");
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      toast.error("Failed to export audit logs");
    } finally {
      setExportLoading(false);
    }
  }, [filteredLogs]);

  // Batch export functionality
  const handleBatchExport = useCallback(async (module, action, dateRange) => {
    setExportLoading(true);
    try {
      let logsToExport = auditLogs;

      // Filter by module if specified
      if (module) {
        logsToExport = logsToExport.filter(log => log.module === module);
      }

      // Filter by action if specified
      if (action) {
        logsToExport = logsToExport.filter(log => log.action === action);
      }

      // Filter by date range if specified
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);

        logsToExport = logsToExport.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= startDate && logDate <= endDate;
        });
      }

      const headers = ['Timestamp', 'User', 'Action', 'Module', 'Severity', 'IP Address', 'Details'];
      const csvContent = [
        headers.join(','),
        ...logsToExport.map(log => [
          log.timestamp,
          log.user,
          log.action,
          log.module,
          log.severity,
          log.ip_address,
          `"${log.details}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${module || 'all'}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${logsToExport.length} audit logs`);
    } catch (err) {
      console.error('Error exporting audit logs:', err);
      toast.error("Failed to export audit logs");
    } finally {
      setExportLoading(false);
    }
  }, [auditLogs]);

  const handleRefreshLogs = useCallback(() => {
    if (!loading) {
      fetchAuditLogs(true);
      toast.success("Audit logs refreshed");
    }
  }, [fetchAuditLogs, loading]);

  const getSeverityColor = useCallback((severity) => {
    switch (severity) {
      case SEVERITY.INFO: return "info";
      case SEVERITY.WARNING: return "warning";
      case SEVERITY.ERROR: return "error";
      case SEVERITY.SUCCESS: return "success";
      default: return "default";
    }
  }, [SEVERITY]);

  const getModuleColor = useCallback((module) => {
    const moduleColors = {
      [MODULES.AUTHENTICATION]: "primary",
      [MODULES.USER_MANAGEMENT]: "success",
      [MODULES.ROLE_MANAGEMENT]: "secondary",
      [MODULES.TICKET_MANAGEMENT]: "error",
      [MODULES.ASSET_MANAGEMENT]: "warning",
      [MODULES.ADMINISTRATION]: "info",
      [MODULES.GENERAL]: "default"
    };
    return moduleColors[module] || "default";
  }, [MODULES]);

  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      handleSearch.cancel();
    };
  }, [handleSearch]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <HistoryIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Audit Logs
              {newLogsCount > 0 && (
                <Chip
                  label={newLogsCount}
                  color="primary"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            {lastUpdated && (
              <Typography variant="body2" color="text.secondary">
                Last updated: {formatDate(lastUpdated)}
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={handleRefreshLogs}
            disabled={loading || isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="All Logs" value="all" />
            <Tab label="Recent (7 days)" value="recent" />
            <Tab label="Errors" value="errors" />
            <Tab label="Warnings" value="warnings" />
          </Tabs>
        </Box>

        {/* Error message */}
        {error && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography color="error" variant="body1">
                {error}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter Bar */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  label="Search"
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  label="User"
                  size="small"
                  fullWidth
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Select
                  label="Module"
                  size="small"
                  fullWidth
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                >
                  <MenuItem value="">All Modules</MenuItem>
                  {Object.values(MODULES).map(module => (
                    <MenuItem key={module} value={module}>{module}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={2}>
                <Select
                  label="Action"
                  size="small"
                  fullWidth
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {Object.values(ACTIONS).map(action => (
                    <MenuItem key={action} value={action}>{action}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={() => setShowFilterModal(true)}
                    fullWidth
                  >
                    Filters
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportLogs}
                    fullWidth
                    disabled={exportLoading}
                  >
                    {exportLoading ? <CircularProgress size={20} /> : "Export"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Box mt={1}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredLogs.length} of {auditLogs.length} logs
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardContent>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Module</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>IP</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary">
                            {auditLogs.length === 0
                              ? "No audit logs available"
                              : "No logs found matching the criteria"
                            }
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map(log => (
                        <TableRow key={log.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(log.timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            <Chip
                              label={log.module}
                              color={getModuleColor(log.module)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.severity}
                              color={getSeverityColor(log.severity)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {log.ip_address}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {log.details}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(log)}
                              title="View Details"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Filter Modal */}
        <Dialog
          open={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          maxWidth="sm"
          fullWidth
          aria-labelledby="filter-dialog-title"
        >
          <DialogTitle id="filter-dialog-title">Advanced Filters</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="IP Address"
                  size="small"
                  fullWidth
                  value={filterIp}
                  onChange={(e) => setFilterIp(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowFilterModal(false)}>
              Cancel
            </Button>
            <Button variant="contained" onClick={() => setShowFilterModal(false)}>
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        {/* Log Details Modal */}
        <Dialog
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          maxWidth="md"
          fullWidth
          aria-labelledby="details-dialog-title"
        >
          {selectedLog && (
            <>
              <DialogTitle id="details-dialog-title">Log Details</DialogTitle>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User
                    </Typography>
                    <Typography variant="body1">{selectedLog.user}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Action
                    </Typography>
                    <Typography variant="body1">{selectedLog.action}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Timestamp
                    </Typography>
                    <Typography variant="body1">{formatDate(selectedLog.timestamp)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      IP Address
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace">
                      {selectedLog.ip_address}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User Agent
                    </Typography>
                    <Typography variant="body1">{selectedLog.user_agent}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Module
                    </Typography>
                    <Chip
                      label={selectedLog.module}
                      color={getModuleColor(selectedLog.module)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Severity
                    </Typography>
                    <Chip
                      label={selectedLog.severity}
                      color={getSeverityColor(selectedLog.severity)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Details
                    </Typography>
                    <Card variant="outlined" sx={{ mt: 1, p: 2 }}>
                      <Typography variant="body1">{selectedLog.details}</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

// Create a wrapper component that includes the provider
// Utility function to wrap any component with audit logging
export const createAuditedComponent = (Component, moduleName, options = {}) => {
  return function AuditedComponent(props) {
    const { addAuditLog, batchAddAuditLogs } = useAuditLogs();

    const logAction = useCallback((action, details, severity = SEVERITY.INFO, additionalData = {}) => {
      addAuditLog({
        action,
        module: moduleName,
        severity,
        details,
        ...additionalData
      });
    }, [addAuditLog, moduleName]);

    const batchLogActions = useCallback((actionsArray) => {
      const batchData = actionsArray.map(actionData => ({
        ...actionData,
        module: moduleName
      }));

      return batchAddAuditLogs(batchData);
    }, [batchAddAuditLogs, moduleName]);

    // Pass logging functions to the wrapped component
    return (
      <Component
        {...props}
        logAction={logAction}
        batchLogActions={batchLogActions}
        moduleName={moduleName}
        {...options}
      />
    );
  };
};

// Higher-order component for automatic action tracking
export const withActionTracking = (moduleName, trackedActions = []) => (WrappedComponent) => {
  return function ActionTrackedComponent(props) {
    const { addAuditLog } = useAuditLogs();
    const componentRef = useRef(null);

    // Track actions automatically
    useEffect(() => {
      if (!componentRef.current) return;

      const trackAction = (action, details, severity = SEVERITY.INFO, element) => {
        addAuditLog({
          action,
          module: moduleName,
          severity,
          details,
          element: element ? element.tagName.toLowerCase() : 'unknown',
          timestamp: new Date().toISOString()
        });
      };

      // Add click tracking if specified
      if (trackedActions.includes('click')) {
        const handleClick = (e) => {
          const target = e.target;
          const actionName = target.getAttribute('data-action') ||
            target.closest('[data-action]')?.getAttribute('data-action');

          if (actionName) {
            trackAction(
              actionName,
              `User clicked on ${target.tagName.toLowerCase()} with action "${actionName}"`,
              SEVERITY.INFO,
              target
            );
          }
        };

        componentRef.current.addEventListener('click', handleClick);

        return () => {
          componentRef.current.removeEventListener('click', handleClick);
        };
      }

      // Add more tracking types as needed

    }, [moduleName, trackedActions, addAuditLog]);

    return <WrappedComponent {...props} ref={componentRef} />;
  };
};

// Example of how to use the audit logging in a form component
export const AuditedForm = ({ moduleName, onSubmit, initialValues, fields, ...props }) => {
  const { addAuditLog } = useAuditLogs();
  const [values, setValues] = useState(initialValues || {});
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));

    // Log field changes
    addAuditLog({
      action: 'FIELD_CHANGE',
      module: moduleName,
      details: `Field "${name}" changed to "${value}"`
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate form
    const validationErrors = {};
    fields.forEach(field => {
      if (field.required && !values[field.name]) {
        validationErrors[field.name] = `${field.label} is required`;
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      // Log validation error
      addAuditLog({
        action: 'VALIDATION_ERROR',
        module: moduleName,
        severity: SEVERITY.ERROR,
        details: `Form validation failed: ${Object.keys(validationErrors).join(', ')}`
      });
      return;
    }

    // Log successful submission
    addAuditLog({
      action: 'FORM_SUBMIT',
      module: moduleName,
      severity: SEVERITY.SUCCESS,
      details: `Form submitted with values: ${JSON.stringify(values)}`
    });

    // Call parent onSubmit
    if (onSubmit) {
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} {...props}>
      {fields.map(field => (
        <div key={field.name}>
          <label>{field.label}</label>
          <input
            type={field.type || 'text'}
            value={values[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            data-action={field.action || 'change'}
          />
          {errors[field.name] && (
            <div className="error">{errors[field.name]}</div>
          )}
        </div>
      ))}
      <button type="submit">Submit</button>
    </form>
  );
};

export default function AuditLogs() {
  return (
    <AuditLogProvider>
      <AuditLogsComponent />
    </AuditLogProvider>
  );
}
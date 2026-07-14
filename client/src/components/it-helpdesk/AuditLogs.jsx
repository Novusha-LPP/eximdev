// src/components/it-helpdesk/AuditLogs.js
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import WarningIcon from "@mui/icons-material/Warning";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import Tooltip from "@mui/material/Tooltip";
import { debounce } from "lodash";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";

// ✅ FIX 1: Create axios instance WITHOUT hardcoded token in headers
const api = axios.create({
  baseURL: process.env.REACT_APP_API_STRING,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true
});

// ✅ Read token fresh on every request via interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ✅ FIX 3: Response interceptor — show error instead of redirecting to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // ❌ REMOVED: localStorage.removeItem('exim_user') + window.location.href = '/login'
          // This was causing the redirect. Just log it and let the component handle it.
          console.warn('401 Unauthorized - token may be invalid or expired');
          break;
        case 403:
          console.error('Access forbidden. Check permissions for audit logs endpoint.');
          break;
        case 404:
          console.error('Endpoint not found:', error.config.url);
          break;
        case 500:
          console.error('Server error:', error.response.data);
          break;
      }
    }
    return Promise.reject(error);
  }
);

const AuditLogContext = createContext();

const MODULES = {
  USER: 'User',
  TICKET: 'Helpdesk',
  ASSET: 'Asset',
  VENDOR: 'Vendor',
  CONTRACT: 'Contract',
  INVENTORY: 'Inventory',
  LICENSE: 'License',
  AUTHENTICATION: 'Authentication',
  ROLE_MANAGEMENT: 'Role Management',
  ADMINISTRATION: 'Administration',
  GENERAL: 'General'
};

const ACTIONS = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  EXPORT: 'Export',
  IMPORT: 'Import',
  APPROVE: 'Approve',
  REJECT: 'Reject',
  SUBMIT: 'Submit',
  CANCEL: 'Cancel'
};

const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
};

const handleApiError = (error, module = null) => {
  console.error(`API Error for ${module ? `module ${module}` : `all modules`}:`, error);
  if (error.response && error.response.status === 401) {
    return "Authentication failed. Please log in again.";
  }
  return module
    ? `Failed to fetch logs for ${module}. Please try again later.`
    : "Failed to fetch audit logs. Please try again later.";
};

const documentTypeMap = {
  'ITAsset': 'Asset',
  'ItVendor': 'Vendor',
  'HelpdeskTicket': 'Helpdesk',
  'ITInventory': 'Inventory',
  'ITContract': 'Contract',
  'ITLicense': 'License',
  'User': 'User'
};

const reverseDocumentTypeMap = {
  'Asset': 'ITAsset',
  'Vendor': 'ItVendor',
  'Helpdesk': 'HelpdeskTicket',
  'Inventory': 'ITInventory',
  'Contract': 'ITContract',
  'License': 'ITLicense',
  'User': 'User'
};

export const AuditLogProvider = ({ children }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [pendingLogs, setPendingLogs] = useState([]);
  const pendingLogsRef = useRef([]);

  const createAuditLog = useCallback((logData) => {
    const currentUser = JSON.parse(localStorage.getItem('exim_user')) || { username: 'Unknown User', _id: 'unknown' };
    const additionalContext = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`
    };
    return {
      id: logData.id || `log-${Date.now()}`,
      user: currentUser.name,
      userId: currentUser.id,
      timestamp: additionalContext.timestamp,
      ip_address: logData.ip_address || '127.0.0.1',
      user_agent: additionalContext.userAgent,
      severity: logData.severity || SEVERITY.INFO,
      url: additionalContext.url,
      module: logData.module || 'General',
      action: logData.action || 'UNKNOWN',
      details: logData.details || 'No additional details',
      targetId: logData.targetId || null,
      entityType: logData.entityType || null,
      additionalData: { ...logData.additionalData, ...additionalContext }
    };
  }, []);

  const addAuditLog = useCallback(async (logData, batch = false) => {
    try {
      const enrichedLogData = {
        ...logData,
        timestamp: logData.timestamp || new Date().toISOString(),
        username: logData.user || JSON.parse(localStorage.getItem('exim_user'))?.username || 'Unknown User',
        documentType: logData.module || 'General',
        userAgent: logData.user_agent || navigator.userAgent,
        ip_address: logData.ip_address || '127.0.0.1'
      };

      const newLog = createAuditLog(enrichedLogData);

      if (batch) {
        pendingLogsRef.current.push(newLog);
        return newLog;
      }

      const response = await api.post('/audit-trail/custom', enrichedLogData);

      if (response.data.skipped) {
        return null;
      }

      const savedLog = response.data.log;

      const mappedLog = {
        id: savedLog._id,
        user: savedLog.username,
        action: savedLog.action,
        module: savedLog.documentType,
        severity: savedLog.severity || logData.severity || 'info',
        timestamp: savedLog.timestamp,
        ip_address: savedLog.ip_address || '',
        user_agent: savedLog.userAgent || '',
        details: savedLog.heading || savedLog.details || ''
      };

      setAuditLogs(prevLogs => [mappedLog, ...prevLogs]);
      setLastUpdated(new Date());
      return mappedLog;
    } catch (err) {
      console.error('Error adding audit log:', err);
      const localLog = createAuditLog(logData);
      setAuditLogs(prevLogs => [localLog, ...prevLogs]);
      setLastUpdated(new Date());
    }
  }, [createAuditLog]);

  const batchAddAuditLogs = useCallback(async (logsData) => {
    try {
      const batchData = logsData.map(log => ({
        ...log,
        timestamp: log.timestamp || new Date().toISOString(),
        username: log.user || JSON.parse(localStorage.getItem('exim_user'))?.username || 'Unknown User',
        documentType: log.module || 'General',
        userAgent: log.user_agent || navigator.userAgent,
        ip_address: log.ip_address || '127.0.0.1'
      }));
      const response = await api.post('/audit-trail/batch', batchData);
      return response.data.logs;
    } catch (err) {
      console.error('Error adding batch audit logs:', err);
      return logsData.map(log => createAuditLog(log));
    }
  }, [createAuditLog]);

  const processPendingLogs = useCallback(async () => {
    if (pendingLogsRef.current.length > 0) {
      try {
        await batchAddAuditLogs(pendingLogsRef.current);
        pendingLogsRef.current = [];
      } catch (err) {
        console.error('Error processing pending logs:', err);
      }
    }
  }, [batchAddAuditLogs]);

  const fetchAuditLogs = useCallback(async (isRefresh = false, module = null, retryCount = 0) => {
    const MAX_RETRIES = 3;

    try {
      setLoading(true);
      setIsRefreshing(isRefresh);

      const params = { limit: 1000, timestamp: new Date().getTime() };
      if (module) params.documentType = reverseDocumentTypeMap[module] || module;

      const response = await api.get('/audit-trail', { params });
      const backendLogs = response.data.auditTrail || [];

      const newLogs = backendLogs.map(log => ({
        id: log._id,
        user: log.username || 'Unknown User',
        action: log.action || 'UNKNOWN',
        module: documentTypeMap[log.documentType] || log.documentType || 'General',
        severity: log.action === 'DELETE' ? 'warning' : (log.severity || 'info'),
        timestamp: log.timestamp || new Date().toISOString(),
        ip_address: log.ip_address || '',
        user_agent: log.userAgent || '',
        details: log.heading || log.details || ''
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
      const errorMessage = handleApiError(err, module);
      setError(errorMessage);

      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          fetchAuditLogs(isRefresh, module, retryCount + 1);
        }, 2000 * (retryCount + 1));
      }
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchModuleLogs = useCallback(async (module, retryCount = 0) => {
    const MAX_RETRIES = 3;
    if (!module) return;
    try {
      setLoading(true);
      const response = await api.get('/audit-trail', {
        params: { documentType: reverseDocumentTypeMap[module] || module, limit: 1000, timestamp: new Date().getTime() }
      });

      const backendLogs = response.data.auditTrail || [];
      const moduleLogs = backendLogs.map(log => ({
        id: log._id,
        user: log.username || 'Unknown User',
        action: log.action || 'UNKNOWN',
        module: documentTypeMap[log.documentType] || log.documentType || 'General',
        severity: log.action === 'DELETE' ? 'warning' : (log.severity || 'info'),
        timestamp: log.timestamp || new Date().toISOString(),
        ip_address: log.ip_address || '',
        user_agent: log.userAgent || '',
        details: log.heading || log.details || ''
      }));

      setAuditLogs(moduleLogs);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = handleApiError(err, module);
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => fetchModuleLogs(module, retryCount + 1), 2000 * (retryCount + 1));
      } else {
        setAuditLogs([]);
        setLastUpdated(new Date());
        setError(errorMessage);
      }
    } finally {
      if (retryCount === 0) setLoading(false);
    }
  }, []);

  // ✅ FIX 5: useEffect — NO redirect to /login, just set error message
  useEffect(() => {
    // ✅ Cookie is sent automatically - just fetch directly
    fetchAuditLogs(false);

    const reconnectInterval = setInterval(() => {
      if (error) {
        fetchAuditLogs(false);
      }
    }, 30000);

    const handleOffline = () => setOnlineStatus(false);
    const handleOnline = () => {
      setOnlineStatus(true);
      if (pendingLogs.length > 0) processPendingLogs();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(reconnectInterval);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      processPendingLogs();
    };
  }, []);  // ✅ FIX 6: Empty deps — don't re-run on every error change (was causing loops)

  return (
    <AuditLogContext.Provider value={{
      auditLogs,
      setAuditLogs,
      addAuditLog,
      fetchModuleLogs,
      loading,
      error,
      setError,
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

export const useAuditLogs = () => {
  const context = useContext(AuditLogContext);
  if (!context) throw new Error('useAuditLogs must be used within an AuditLogProvider');

  const logCreate = useCallback((id, details, severity = SEVERITY.INFO, module = 'General') => {
    context.addAuditLog({ action: ACTIONS.CREATE, module, severity, details, targetId: id });
  }, [context.addAuditLog]);

  const logRead = useCallback((id, details, severity = SEVERITY.INFO, module = 'General') => {
    context.addAuditLog({ action: 'VIEW', module, severity, details, targetId: id });
  }, [context.addAuditLog]);

  const logUpdate = useCallback((id, details, severity = SEVERITY.INFO, module = 'General') => {
    context.addAuditLog({ action: ACTIONS.UPDATE, module, severity, details, targetId: id });
  }, [context.addAuditLog]);

  const logDelete = useCallback((id, details, severity = SEVERITY.WARNING, module = 'General') => {
    context.addAuditLog({ action: ACTIONS.DELETE, module, severity, details, targetId: id });
  }, [context.addAuditLog]);

  return { ...context, logCreate, logRead, logUpdate, logDelete };
};

export const useActionLogger = () => {
  const { addAuditLog } = useAuditLogs();

  const logAction = useCallback((moduleName, action, details, severity = SEVERITY.INFO, additionalData = {}) => {
    addAuditLog({
      action,
      module: moduleName || 'General',
      severity,
      details: details || `${action} action performed in ${moduleName}`,
      ...additionalData,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }, [addAuditLog]);

  const logCRUD = useCallback((moduleName, operation, entityName, entityId, entityDetails, user, severity = SEVERITY.INFO, additionalData = {}) => {
    const actionMap = { create: ACTIONS.CREATE, read: 'VIEW', update: ACTIONS.UPDATE, delete: ACTIONS.DELETE };
    addAuditLog({
      action: actionMap[operation] || operation.toUpperCase(),
      module: moduleName,
      severity,
      details: `${operation.toUpperCase()} operation performed on ${entityName} (ID: ${entityId}). ${entityDetails ? `Details: ${entityDetails}` : ''}`,
      targetEntity: entityName,
      targetId: entityId,
      performedBy: user || JSON.parse(localStorage.getItem('exim_user'))?.username || 'Unknown User',
      ...additionalData
    });
  }, [addAuditLog]);

  return { logAction, logCRUD };
};

export const useAuditCRUD = (moduleName, entityName) => {
  const { logCRUD } = useActionLogger();
  const logCreate = useCallback((entityId, details, user, additionalData = {}) => logCRUD(moduleName, 'create', entityName, entityId, details, user, SEVERITY.INFO, additionalData), [logCRUD, moduleName, entityName]);
  const logRead = useCallback((entityId, details, user, additionalData = {}) => logCRUD(moduleName, 'read', entityName, entityId, details, user, SEVERITY.INFO, additionalData), [logCRUD, moduleName, entityName]);
  const logUpdate = useCallback((entityId, details, user, additionalData = {}) => logCRUD(moduleName, 'update', entityName, entityId, details, user, SEVERITY.INFO, additionalData), [logCRUD, moduleName, entityName]);
  const logDelete = useCallback((entityId, details, user, additionalData = {}) => logCRUD(moduleName, 'delete', entityName, entityId, details, user, SEVERITY.WARNING, additionalData), [logCRUD, moduleName, entityName]);
  return { logCreate, logRead, logUpdate, logDelete };
};

export const useModuleAuditLogs = (moduleName) => {
  const { auditLogs, addAuditLog, fetchModuleLogs, ...rest } = useAuditLogs();
  const moduleLogs = useMemo(() => auditLogs.filter(log => log.module === moduleName), [auditLogs, moduleName]);

  const logCreate = useCallback((id, details, severity = SEVERITY.INFO, additionalData = {}) => addAuditLog({ action: ACTIONS.CREATE, module: moduleName, severity, details, targetId: id, additionalData }), [addAuditLog, moduleName]);
  const logRead = useCallback((id, details, severity = SEVERITY.INFO, additionalData = {}) => addAuditLog({ action: 'VIEW', module: moduleName, severity, details, targetId: id, additionalData }), [addAuditLog, moduleName]);
  const logUpdate = useCallback((id, details, severity = SEVERITY.INFO, additionalData = {}) => addAuditLog({ action: ACTIONS.UPDATE, module: moduleName, severity, details, targetId: id, additionalData }), [addAuditLog, moduleName]);
  const logDelete = useCallback((id, details, severity = SEVERITY.WARNING, additionalData = {}) => addAuditLog({ action: ACTIONS.DELETE, module: moduleName, severity, details, targetId: id, additionalData }), [addAuditLog, moduleName]);

  return { ...rest, auditLogs: moduleLogs, addAuditLog, fetchModuleLogs, logCreate, logRead, logUpdate, logDelete };
};

const AuditLogsComponent = () => {
  const navigate = useNavigate();
  const { auditLogs, setAuditLogs, loading, error, setError, fetchAuditLogs, lastUpdated, isRefreshing, MODULES, ACTIONS, SEVERITY } = useAuditLogs();

  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [tabValue, setTabValue] = useState("all");
  const [exportLoading, setExportLoading] = useState(false);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterIp, setFilterIp] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });

  useEffect(() => {
    if (lastUpdated) {
      const recentLogs = auditLogs.filter(log => new Date(log.timestamp) > new Date(Date.now() - 60000));
      setNewLogsCount(recentLogs.length);
    }
  }, [auditLogs, lastUpdated]);

  const handleSearch = useMemo(() => debounce((value) => setSearchTerm(value), 300), []);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return auditLogs.filter(log => {
      const formattedTime = log.timestamp
        ? new Date(log.timestamp).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' }) +
        ' ' + new Date(log.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        : '';
      const matchesSearch = !term ||
        (log.user || '').toLowerCase().includes(term) ||
        (log.action || '').toLowerCase().includes(term) ||
        (log.details || '').toLowerCase().includes(term) ||
        (log.module || '').toLowerCase().includes(term) ||
        (log.ip_address || '').toLowerCase().includes(term) ||
        formattedTime.toLowerCase().includes(term);
      const matchesUser = !filterUser || (log.user || '') === filterUser;
      const matchesAction = !filterAction || (log.action || '').toUpperCase() === filterAction.toUpperCase();
      const matchesIp = !filterIp || (log.ip_address || '') === filterIp;
      const matchesModule = !filterModule || (log.module || '') === filterModule;
      const matchesTab = tabValue === "all" ||
        (tabValue === "recent" && new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
        (tabValue === "errors" && log.severity === SEVERITY.ERROR) ||
        (tabValue === "warnings" && log.severity === SEVERITY.WARNING);

      let matchesDate = true;
      if (dateRange.startDate || dateRange.endDate) {
        const logDate = new Date(log.timestamp);
        if (dateRange.startDate) { const s = new Date(dateRange.startDate); s.setHours(0, 0, 0, 0); matchesDate = matchesDate && logDate >= s; }
        if (dateRange.endDate) { const e = new Date(dateRange.endDate); e.setHours(23, 59, 59, 999); matchesDate = matchesDate && logDate <= e; }
      }
      return matchesSearch && matchesUser && matchesAction && matchesIp && matchesModule && matchesDate && matchesTab;
    });
  }, [auditLogs, searchTerm, filterUser, filterAction, filterIp, filterModule, dateRange, tabValue, SEVERITY]);

  const handleViewDetails = (log) => { setSelectedLog(log); setShowDetailsModal(true); };

  const handleDeleteSingleLog = useCallback(async (logId) => {
    try {
      await api.delete(`/audit-trail/${logId}`);
      // Remove from local state immediately — no need to re-fetch
      setAuditLogs(prev => prev.filter(l => l.id !== logId));
      toast.success('Log entry deleted.');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete log entry.';
      toast.error(msg);
    }
  }, [setAuditLogs]);

  const handleModuleFilterChange = useCallback((module) => {
    setFilterModule(module);
    // Re-fetch from server with documentType filter for accurate server-side filtering
    fetchAuditLogs(false);
  }, [fetchAuditLogs]);

  const handleDeleteLogs = useCallback(async () => {
    setDeleteLoading(true);
    try {
      const params = filterModule ? { documentType: reverseDocumentTypeMap[filterModule] || filterModule } : {};
      await api.delete('/audit-trail', { params });
      toast.success(filterModule ? `Logs for "${filterModule}" deleted.` : 'All audit logs deleted.');
      setShowDeleteConfirm(false);
      fetchAuditLogs(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to delete audit logs.';
      toast.error(msg);
      console.error('Delete logs error:', err?.response?.status, err?.response?.data);
    } finally {
      setDeleteLoading(false);
    }
  }, [filterModule, fetchAuditLogs]);

  const handleExportLogs = useCallback(async () => {
    setExportLoading(true);
    try {
      const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details'];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [log.timestamp, `"${log.user}"`, `"${log.action}"`, `"${log.module}"`, `"${log.details}"`].join(','))
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
      toast.error("Failed to export audit logs");
    } finally {
      setExportLoading(false);
    }
  }, [filteredLogs]);

  const handleRefreshLogs = useCallback(() => {
    if (!loading) { fetchAuditLogs(true); toast.success("Audit logs refreshed"); }
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
      [MODULES.USER]: "success",
      [MODULES.ROLE_MANAGEMENT]: "secondary",
      [MODULES.TICKET]: "error",
      [MODULES.ASSET]: "warning",
      [MODULES.ADMINISTRATION]: "info",
      [MODULES.GENERAL]: "default",
      [MODULES.VENDOR]: "success",
      [MODULES.CONTRACT]: "secondary",
      [MODULES.INVENTORY]: "warning",
      [MODULES.LICENSE]: "info",
    };
    return moduleColors[module] || "default";
  }, [MODULES]);

  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }, []);

  useEffect(() => { return () => { handleSearch.cancel(); }; }, [handleSearch]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Tooltip title="Back">
              <IconButton
                onClick={handleBack}
                sx={{
                  mr: 1,
                  bgcolor: "white",
                  border: "1px solid",
                  borderColor: "primary.main",
                  color: "primary.main",
                  "&:hover": { bgcolor: "primary.light", color: "primary.dark" }
                }}
              >
                <ArrowBackIcon sx={{ color: "primary.main" }} />
              </IconButton>
            </Tooltip>
            <HistoryIcon color="primary" />
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" fontWeight={700}>Audit Logs</Typography>
              {error && (
                <Tooltip title={error}>
                  <Chip label="API Error" color="error" size="small" variant="outlined" />
                </Tooltip>
              )}
              {newLogsCount > 0 && <Chip label={newLogsCount} color="primary" size="small" sx={{ ml: 1 }} />}
            </Box>
            {lastUpdated && (
              <Typography variant="body2" color="text.secondary">Last updated: {formatDate(lastUpdated)}</Typography>
            )}
          </Box>
          <Box display="flex" gap={1}>
            {/* <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefreshLogs} disabled={loading || isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button> */}
            {/* <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
            >
              {filterModule ? `Delete "${filterModule}" Logs` : 'Delete All Logs'}
            </Button> */}
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="All Logs" value="all" />
            {/* <Tab label="Recent (7 days)" value="recent" /> */}
            {/* <Tab label="Errors" value="errors" /> */}
            {/* <Tab label="Warnings" value="warnings" /> */}
          </Tabs>
        </Box>

        {error && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography color="warning.main" variant="body1"><WarningIcon /></Typography>
                <Box flexGrow={1}>
                  <Typography color="error" variant="body1" fontWeight={500}>
                    {error}
                    {loading && <Box component="span" sx={{ ml: 1 }}><CircularProgress size={16} color="inherit" />{" Reconnecting..."}</Box>}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unable to fetch audit logs from the server. Please try again later or contact your administrator.
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => { setError(null); fetchAuditLogs(); }} startIcon={<RefreshIcon />} disabled={loading}>
                  {loading ? "Connecting..." : "Retry"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField label="Search" size="small" fullWidth onChange={(e) => handleSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
              </Grid>
              {/* <Grid item xs={12} md={2}>
                <TextField label="User" size="small" fullWidth value={filterUser} onChange={(e) => setFilterUser(e.target.value)} />
              </Grid> */}
              <Grid item xs={12} md={2}>
                {/* <Select size="small" fullWidth value={filterModule}
                  onChange={(e) => handleModuleFilterChange(e.target.value)} displayEmpty>
                  <MenuItem value="">All Modules</MenuItem>
                  {Object.values(MODULES).map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select> */}
              </Grid>
              <Grid item xs={12} md={2}>
                {/* <Select size="small" fullWidth value={filterAction} onChange={(e) => setFilterAction(e.target.value)} displayEmpty>
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="CREATE">Create</MenuItem>
                  <MenuItem value="UPDATE">Update</MenuItem>
                  <MenuItem value="DELETE">Delete</MenuItem>
                </Select> */}
              </Grid>
              <Grid item xs={12} md={3}>
                <Box display="flex" gap={1}>
                  <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setShowFilterModal(true)} fullWidth>Filters</Button>
                  <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportLogs} fullWidth disabled={exportLoading}>
                    {exportLoading ? <CircularProgress size={20} /> : "Export"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Box mt={1}>
              <Typography variant="body2" color="text.secondary">Showing {filteredLogs.length} of {auditLogs.length} logs</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Module</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary">
                            {auditLogs.length === 0 ? "No audit logs available" : "No logs found matching the criteria"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map(log => (
                        <TableRow key={log.id} hover>
                          <TableCell><Typography variant="body2">{formatDate(log.timestamp)}</Typography></TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell><Chip label={log.module} color={getModuleColor(log.module)} size="small" /></TableCell>
                          <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>{log.details}</Typography></TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => handleViewDetails(log)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Log">
                              {/* <IconButton
                                size="small"
                                onClick={() => handleDeleteSingleLog(log.id)}
                                sx={{ color: 'error.main', ml: 0.5 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton> */}
                            </Tooltip>
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onClose={() => !deleteLoading && setShowDeleteConfirm(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon /> Confirm Delete
          </DialogTitle>
          <DialogContent>
            <Typography>
              {filterModule
                ? `Delete all audit logs for module "${filterModule}"? This cannot be undone.`
                : 'Delete ALL audit logs from the system? This cannot be undone.'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteLogs} disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Filter Modal */}
        <Dialog open={showFilterModal} onClose={() => setShowFilterModal(false)} maxWidth="sm" fullWidth aria-labelledby="filter-dialog-title">
          <DialogTitle id="filter-dialog-title">Advanced Filters</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <DatePicker label="Start Date" value={dateRange.startDate}
                  onChange={(v) => setDateRange(prev => ({ ...prev, startDate: v }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker label="End Date" value={dateRange.endDate}
                  onChange={(v) => setDateRange(prev => ({ ...prev, endDate: v }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowFilterModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => setShowFilterModal(false)}>Apply</Button>
          </DialogActions>
        </Dialog>

        {/* Details Modal */}
        <Dialog open={showDetailsModal} onClose={() => setShowDetailsModal(false)} maxWidth="md" fullWidth aria-labelledby="details-dialog-title">
          {selectedLog && (
            <>
              <DialogTitle id="details-dialog-title">Log Details</DialogTitle>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">User</Typography><Typography variant="body1">{selectedLog.user}</Typography></Grid>
                  <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Action</Typography><Typography variant="body1">{selectedLog.action}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Timestamp</Typography><Typography variant="body1">{formatDate(selectedLog.timestamp)}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">User Agent</Typography><Typography variant="body1">{selectedLog.user_agent}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Module</Typography><Chip label={selectedLog.module} color={getModuleColor(selectedLog.module)} size="small" /></Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Details</Typography>
                    <Card variant="outlined" sx={{ mt: 1, p: 2 }}><Typography variant="body1">{selectedLog.details}</Typography></Card>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowDetailsModal(false)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export const withAuditLog = (WrappedComponent, moduleName, customActions = {}) => {
  return function WithAuditLog(props) {
    const { addAuditLog } = useAuditLogs();
    const logAction = useCallback((action, details, severity = SEVERITY.INFO, additionalData = {}) => {
      addAuditLog({ action, module: moduleName, severity, details, ...additionalData });
    }, [addAuditLog]);
    return <WrappedComponent {...props} logAction={logAction} actions={{ ...ACTIONS, ...customActions }} />;
  };
};

export default function AuditLogs() {
  return (
    <AuditLogProvider>
      <AuditLogsComponent />
    </AuditLogProvider>
  );
}

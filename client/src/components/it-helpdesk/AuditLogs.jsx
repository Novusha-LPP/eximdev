// src/components/it-helpdesk/AuditLogs.js
import React, { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Button,
  Grid,
  Typography,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  X,
  User,
  Clock,
  Activity,
  Globe,
  Laptop,
  FileText,
  Copy,
  Check,
  Layers,
  Calendar,
} from "lucide-react";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import "../../styles/scorecard.scss";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import { debounce } from "lodash";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx'; // Add this import for Excel export

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

const sanitizeUser = (raw) => {
  if (!raw) return "Unknown User";
  if (typeof raw === "object") {
    return raw.username || raw.name || raw.first_name || raw.email || "Unknown User";
  }
  return String(raw);
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
      user: currentUser.username || currentUser.name || 'Unknown User',
      userId: currentUser.id || currentUser._id || 'unknown',
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
      const currentUser = JSON.parse(localStorage.getItem('exim_user')) || {};
      const enrichedLogData = {
        action: logData.action || 'EXPORT',
        module: logData.module || 'General',
        details: logData.details || '',
        severity: logData.severity || 'info',
        user: logData.user || currentUser.name || currentUser.username || 'System',
        username: logData.user || currentUser.name || currentUser.username || 'System',
        documentType: logData.module || 'General',
        timestamp: logData.timestamp || new Date().toISOString(),
        userAgent: logData.user_agent || navigator.userAgent,
        ip_address: logData.ip_address || '127.0.0.1',
        ...logData,
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

      const savedLog = response.data.log || {};

      const mappedLog = {
        id: savedLog._id || newLog.id,
        user: sanitizeUser(savedLog.username || enrichedLogData.user),
        action: savedLog.action || enrichedLogData.action,
        module: documentTypeMap[savedLog.documentType] || savedLog.documentType || enrichedLogData.module,
        severity: savedLog.severity || logData.severity || 'info',
        timestamp: savedLog.timestamp || enrichedLogData.timestamp,
        ip_address: savedLog.ip_address || '',
        user_agent: savedLog.userAgent || '',
        details: savedLog.heading || savedLog.details || enrichedLogData.details,
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

      const params = { limit: 1000, timestamp: new Date().getTime(), allDates: 'true' };
      if (module) params.documentType = reverseDocumentTypeMap[module] || module;

      const response = await api.get('/audit-trail', { params });
      const backendLogs = response.data.auditTrail || [];

      const newLogs = backendLogs.map(log => ({
        id: log._id,
        user: sanitizeUser(log.username || log.user),
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
        params: { documentType: reverseDocumentTypeMap[module] || module, limit: 1000, timestamp: new Date().getTime(), allDates: 'true' }
      });

      const backendLogs = response.data.auditTrail || [];
      const moduleLogs = backendLogs.map(log => ({
        id: log._id,
        user: sanitizeUser(log.username || log.user),
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

  const logExport = useCallback((id, details, severity = SEVERITY.INFO, module = 'General') => {
    context.addAuditLog({ action: 'EXPORT', module, severity, details, targetId: id });
  }, [context.addAuditLog]);

  return { ...context, logCreate, logRead, logUpdate, logDelete, logExport };
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
  const logExport = useCallback((id, details, severity = SEVERITY.INFO, additionalData = {}) => addAuditLog({ action: 'EXPORT', module: moduleName, severity, details, targetId: id, additionalData }), [addAuditLog, moduleName]);

  return { ...rest, auditLogs: moduleLogs, addAuditLog, fetchModuleLogs, logCreate, logRead, logUpdate, logDelete, logExport };
};

const AuditLogsComponent = () => {
  const navigate = useNavigate();
  const { auditLogs, setAuditLogs, addAuditLog, loading, error, setError, fetchAuditLogs, lastUpdated, isRefreshing, MODULES, ACTIONS, SEVERITY } = useAuditLogs();

  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [copiedUserAgent, setCopiedUserAgent] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const parseUserAgent = useCallback((ua) => {
    if (!ua) return { browser: "Unknown", os: "Unknown" };
    let browser = "Web Browser";
    if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Google Chrome";
    else if (ua.includes("Edg/")) browser = "Microsoft Edge";
    else if (ua.includes("Firefox/")) browser = "Mozilla Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Apple Safari";

    let os = "Desktop";
    if (ua.includes("Windows NT 10.0")) os = "Windows 10 / 11";
    else if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS X")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return { browser, os };
  }, []);
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (lastUpdated) {
      const recentLogs = auditLogs.filter(log => new Date(log.timestamp) > new Date(Date.now() - 60000));
      setNewLogsCount(recentLogs.length);
    }
  }, [auditLogs, lastUpdated]);

  const handleSearch = useMemo(() => debounce((value) => {
    setSearchTerm(value);
    setPage(1);
  }, 300), []);

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
      const matchesAction = !filterAction ||
        (log.action || '').toUpperCase() === filterAction.toUpperCase() ||
        (log.action || '').toUpperCase().includes(filterAction.toUpperCase());
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

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / limit));
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLogs.slice(start, start + limit);
  }, [filteredLogs, page, limit]);

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

  // Modified export function to use XLSX for Excel export
  const handleExportLogs = useCallback(async () => {
    setExportLoading(true);
    try {
      // Prepare data for Excel export
      const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details'];
      const data = filteredLogs.map(log => ({
        'Timestamp': log.timestamp,
        'User': log.user,
        'Action': log.action,
        'Module': log.module,
        'Details': log.details
      }));

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);

      // Automatically record audit log for this export action
      if (addAuditLog) {
        await addAuditLog({
          action: "EXPORT",
          module: "Administration",
          details: `Exported ${filteredLogs.length} audit log entries to Excel`,
          severity: SEVERITY.INFO,
        });
      }

      toast.success("Audit logs exported successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export audit logs");
    } finally {
      setExportLoading(false);
    }
  }, [filteredLogs, addAuditLog, SEVERITY]);

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

  const getActionBadgeClass = (action) => {
    const act = String(action || "").toUpperCase();
    if (act.includes("CREATE") || act.includes("INSERT") || act.includes("LOGIN")) return "badge-excellent";
    if (act.includes("UPDATE") || act.includes("EDIT")) return "badge-primary";
    if (act.includes("DELETE") || act.includes("PURGE") || act.includes("ERROR")) return "badge-danger";
    if (act.includes("EXPORT") || act.includes("DOWNLOAD")) return "badge-warning";
    return "badge-secondary";
  };

  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return { date: "—", time: "" };
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return { date: String(timestamp), time: "" };
    const dateStr = date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return { date: dateStr, time: timeStr };
  }, []);

  const formatUserName = useCallback((raw) => {
    if (!raw) return "Unknown User";
    const str = typeof raw === "object" ? (raw.username || raw.name || raw.email || "Unknown User") : String(raw);
    if (str.includes("_") || str.includes(".")) {
      return str.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return str;
  }, []);

  const getUserInitials = useCallback((name) => {
    if (!name) return "U";
    const str = typeof name === "object" ? (name.username || name.name || name.email || "U") : String(name);
    const parts = str.trim().split(/[\s_.]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  }, []);

  const getUserAvatarTheme = useCallback((name) => {
    const palettes = [
      { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
      { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
      { bg: "#faf5ff", text: "#6d28d9", border: "#e9d5ff" },
      { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
      { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
      { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
    ];
    let hash = 0;
    const str = typeof name === "object" ? (name.username || name.name || name.email || "") : String(name || "");
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return palettes[Math.abs(hash) % palettes.length];
  }, []);

  const getActionBadgeStyle = useCallback((action) => {
    const act = String(action || "").toUpperCase();
    if (act.includes("CREATE") || act.includes("INSERT")) {
      return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", dot: "#10b981" };
    }
    if (act.includes("UPDATE") || act.includes("EDIT")) {
      return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" };
    }
    if (act.includes("DELETE") || act.includes("PURGE") || act.includes("REMOVE") || act.includes("ERROR")) {
      return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", dot: "#ef4444" };
    }
    if (act.includes("LOGIN") || act.includes("AUTH")) {
      return { bg: "#faf5ff", color: "#6d28d9", border: "#e9d5ff", dot: "#8b5cf6" };
    }
    if (act.includes("EXPORT") || act.includes("DOWNLOAD")) {
      return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b" };
    }
    return { bg: "#f8fafc", color: "#475569", border: "#cbd5e1", dot: "#64748b" };
  }, []);

  const getModuleBadgeStyle = useCallback((module) => {
    const mod = String(module || "").toLowerCase();
    if (mod.includes("helpdesk") || mod.includes("ticket")) {
      return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
    }
    if (mod.includes("asset")) {
      return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
    }
    if (mod.includes("inventory")) {
      return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
    }
    if (mod.includes("license")) {
      return { bg: "#ecfeff", color: "#0e7490", border: "#a5f3fc" };
    }
    if (mod.includes("vendor")) {
      return { bg: "#faf5ff", color: "#6d28d9", border: "#e9d5ff" };
    }
    if (mod.includes("user") || mod.includes("role") || mod.includes("auth")) {
      return { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" };
    }
    if (mod.includes("contract")) {
      return { bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe" };
    }
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  }, []);

  const renderLogDetails = useCallback((log) => {
    const rawDetails = log?.details || "";
    const module = log?.module || "";
    const str = String(rawDetails).trim();

    if (!str) {
      return <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>No details recorded</span>;
    }

    // 1. Check if rawDetails is a 24-character hexadecimal MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(str)) {
      return (
        <Tooltip title={`Full Record ID: ${str}`} arrow placement="top">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>
              {module ? `${module} Record` : "Record"}
            </span>
            <span
              style={{
                fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: "11.5px",
                fontWeight: 600,
                background: "#f1f5f9",
                color: "#475569",
                padding: "2px 7px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                letterSpacing: "0.2px",
              }}
            >
              #{str.slice(-6)}
            </span>
          </div>
        </Tooltip>
      );
    }

    // 2. Check pattern: ModelName ('Identifier') Action
    const modelMatch = str.match(/^([A-Za-z]+)\s*(?:\(['"]?([^'"]+)['"]?\))?\s*(Update|Create|Delete|Edit|Save)?$/i);
    if (modelMatch) {
      const [, rawModel, identifier, act] = modelMatch;
      const cleanModel = rawModel
        .replace(/^IT/, "IT ")
        .replace(/Ticket$/, " Ticket")
        .replace(/Vendor$/, " Vendor")
        .replace(/License$/, " License")
        .replace(/Inventory$/, " Inventory")
        .replace(/Asset$/, " Asset")
        .trim();

      const actionText = act
        ? act.toLowerCase() === "update"
          ? "updated"
          : act.toLowerCase() === "create"
          ? "created"
          : act.toLowerCase() === "delete"
          ? "deleted"
          : act.toLowerCase()
        : "";

      return (
        <Tooltip title={str} arrow placement="top">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", flexWrap: "nowrap", maxWidth: "100%", overflow: "hidden" }}>
            <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap" }}>
              {cleanModel}
            </span>
            {identifier && (
              <span
                style={{
                  fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: "11.5px",
                  fontWeight: 600,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  border: "1px solid #bfdbfe",
                  whiteSpace: "nowrap",
                  maxWidth: "240px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {identifier}
              </span>
            )}
            {actionText && (
              <span style={{ color: "#64748b", fontSize: "12.5px", whiteSpace: "nowrap", fontWeight: 500 }}>
                {actionText}
              </span>
            )}
          </div>
        </Tooltip>
      );
    }

    // 3. Sentences containing identifiable entity codes
    const entityMatch = str.match(/\b(TK-\d{8}-\d{4}|AST-\d{4}-\d{3}|INV-[A-Za-z0-9-]+|VND-[A-Za-z0-9-]+)\b/);
    if (entityMatch) {
      const code = entityMatch[1];
      const parts = str.split(code);
      return (
        <Tooltip title={str} arrow placement="top">
          <div style={{ fontSize: "13px", color: "#334155", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 420 }}>
            <span>{parts[0]}</span>
            <span
              style={{
                fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: "11.5px",
                fontWeight: 600,
                background: "#eff6ff",
                color: "#1d4ed8",
                padding: "1px 5px",
                borderRadius: "4px",
                border: "1px solid #bfdbfe",
                margin: "0 2px",
              }}
            >
              {code}
            </span>
            <span>{parts.slice(1).join(code)}</span>
          </div>
        </Tooltip>
      );
    }

    // 4. Default clean presentation
    return (
      <Tooltip title={str} arrow placement="top">
        <div style={{ fontSize: "13px", color: "#334155", fontWeight: 500, maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {str}
        </div>
      </Tooltip>
    );
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="scorecard-container">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="back-btn" onClick={handleBack} title="Back to IT Helpdesk">
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="page-title">Audit Logs & Trail</div>
              <div className="page-subtitle">Real-time system activity, change logs, and access security monitoring</div>
            </div>
          </div>
          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="btn btn-secondary" onClick={handleRefreshLogs} disabled={loading || isRefreshing}>
              <RefreshCw size={15} /> {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowFilterModal(true)}>
              <SlidersHorizontal size={15} /> Date Filters
            </button>
            <button className="btn btn-primary" onClick={handleExportLogs} disabled={exportLoading}>
              <Download size={15} /> {exportLoading ? "Exporting..." : "Export Excel"}
            </button>
          </div>
        </div>

        {error && (
          <div className="card mb-16" style={{ borderLeft: "4px solid #ef4444", background: "#fef2f2" }}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, color: "#b91c1c" }}>Audit Log Connection Error</div>
                <div style={{ fontSize: 13, color: "#7f1d1d" }}>{error}</div>
              </div>
              <button className="btn btn-secondary" onClick={() => { setError(null); fetchAuditLogs(); }} disabled={loading}>
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* KPI Metrics */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-val">{auditLogs.length}</div>
                <div className="stat-lbl">Total Log Entries</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {auditLogs.filter(l => String(l.action || "").toUpperCase().includes("CREATE") || String(l.action || "").toUpperCase().includes("INSERT")).length}
                </div>
                <div className="stat-lbl">Create Actions</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#3b82f6" }}>
                  {auditLogs.filter(l => String(l.action || "").toUpperCase().includes("UPDATE")).length}
                </div>
                <div className="stat-lbl">Update Actions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr auto", gap: "12px", alignItems: "flex-end" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Search Logs</label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: "32px", height: "38px" }}
                    placeholder="Search by user, action, module, details, IP..."
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Module</label>
                <CustomSelect
                  value={filterModule}
                  onChange={(val) => handleModuleFilterChange(val)}
                  options={[
                    { label: "All Modules", value: "" },
                    ...Object.values(MODULES).map((m) => ({ label: m, value: m })),
                  ]}
                  placeholder="All Modules"
                  width="100%"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Action</label>
                <CustomSelect
                  value={filterAction}
                  onChange={(val) => setFilterAction(val)}
                  options={[
                    { label: "All Actions", value: "" },
                    { label: "CREATE", value: "CREATE" },
                    { label: "UPDATE", value: "UPDATE" },
                    { label: "EXPORT", value: "EXPORT" },
                  ]}
                  placeholder="All Actions"
                  width="100%"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0, minWidth: "130px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFilterModule("");
                    setFilterAction("");
                    setSearchTerm("");
                    setDateRange({ startDate: null, endDate: null });
                  }}
                  title="Clear Filters"
                  style={{
                    height: "38px",
                    width: "100%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "0 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    borderRadius: "8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  <RotateCcw size={14} /> <span>Clear Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Audit Log Entries</div>
              <div className="card-subtitle">Showing {filteredLogs.length} of {auditLogs.length} records</div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
                Loading audit logs...
              </div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", minWidth: "1050px", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ minWidth: 165, padding: "12px 16px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>
                        Timestamp
                      </th>
                      <th style={{ minWidth: 165, padding: "12px 16px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>
                        User
                      </th>
                      <th style={{ minWidth: 125, padding: "12px 16px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>
                        Action
                      </th>
                      <th style={{ minWidth: 130, padding: "12px 16px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>
                        Module
                      </th>
                      <th style={{ minWidth: 340, padding: "12px 16px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>
                        Details
                      </th>
                      <th style={{ width: 80, minWidth: 80, textAlign: "right", padding: "12px 16px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#475569" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "40px 16px", color: "var(--color-text-muted)" }}>
                          {auditLogs.length === 0 ? "No audit logs recorded yet." : "No logs matching current filter."}
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => {
                        const { date, time } = formatTimestamp(log.timestamp);
                        const rawUser = sanitizeUser(log.user);
                        const avatar = getUserAvatarTheme(rawUser);
                        const initials = getUserInitials(rawUser);
                        const formattedName = formatUserName(rawUser);
                        const hasHandle = rawUser && (rawUser.includes("_") || rawUser.includes("."));
                        const actionStyle = getActionBadgeStyle(log.action);
                        const moduleStyle = getModuleBadgeStyle(log.module);

                        return (
                          <tr
                            key={log.id || log._id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              transition: "background-color 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(248, 250, 252, 0.95)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          >
                            <td style={{ verticalAlign: "middle", padding: "12px 16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Calendar size={13} style={{ color: "#64748b", flexShrink: 0 }} />
                                  <span>{date}</span>
                                </div>
                                <div style={{ fontSize: "11.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", paddingLeft: "19px" }}>
                                  <Clock size={11} style={{ color: "#94a3b8", flexShrink: 0 }} />
                                  <span style={{ fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace', letterSpacing: "0.2px" }}>
                                    {time}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                                <div
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "50%",
                                    backgroundColor: avatar.bg,
                                    color: avatar.text,
                                    border: `1px solid ${avatar.border}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "11.5px",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                                  }}
                                >
                                  {initials}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "#0f172a",
                                      fontSize: "13px",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                    title={rawUser}
                                  >
                                    {formattedName}
                                  </span>
                                  {hasHandle && (
                                    <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                                      @{rawUser}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "12px 16px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11.5px",
                                  fontWeight: 700,
                                  letterSpacing: "0.2px",
                                  background: actionStyle.bg,
                                  color: actionStyle.color,
                                  border: `1px solid ${actionStyle.border}`,
                                  whiteSpace: "nowrap",
                                  lineHeight: 1.3,
                                }}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: actionStyle.dot,
                                    flexShrink: 0,
                                  }}
                                />
                                {String(log.action || "UNKNOWN").toUpperCase()}
                              </span>
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "12px 16px" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "3px 9px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  background: moduleStyle.bg,
                                  color: moduleStyle.color,
                                  border: `1px solid ${moduleStyle.border}`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {log.module || "General"}
                              </span>
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "12px 16px" }}>
                              {renderLogDetails(log)}
                            </td>
                            <td style={{ verticalAlign: "middle", padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <Tooltip title="View Log Details" arrow placement="left">
                                <button
                                  type="button"
                                  onClick={() => handleViewDetails(log)}
                                  style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    color: "#0284c7",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#f0f9ff";
                                    e.currentTarget.style.borderColor = "#7dd3fc";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 2px 5px rgba(2, 132, 199, 0.18)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#ffffff";
                                    e.currentTarget.style.borderColor = "#cbd5e1";
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.04)";
                                  }}
                                  aria-label="View Log Details"
                                >
                                  <Eye size={15} />
                                </button>
                              </Tooltip>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            <ITPagination
              page={page}
              totalPages={totalPages}
              totalRecords={filteredLogs.length}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        </div>

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
        <Dialog
          open={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          maxWidth="md"
          fullWidth
          aria-labelledby="details-dialog-title"
          PaperProps={{
            sx: {
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)",
              bgcolor: "#ffffff",
            },
          }}
        >
          {selectedLog && (
            <>
              <Box
                sx={{
                  px: 3,
                  py: 2.2,
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box display="flex" alignItems="center" gap={1.75}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(37, 99, 235, 0.28)",
                    }}
                  >
                    <FileText size={20} />
                  </Box>
                  <Box>
                    <Typography
                      id="details-dialog-title"
                      variant="h6"
                      sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.15rem", lineHeight: 1.2 }}
                    >
                      Audit Log Details
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                      System event information &amp; client execution context
                    </Typography>
                  </Box>
                </Box>

                <IconButton
                  onClick={() => setShowDetailsModal(false)}
                  sx={{
                    color: "#64748b",
                    bgcolor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    p: 0.8,
                    "&:hover": { bgcolor: "#f8fafc", color: "#0f172a", borderColor: "#cbd5e1" },
                    transition: "all 0.15s ease",
                  }}
                >
                  <X size={18} />
                </IconButton>
              </Box>

              <DialogContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {/* Key Metadata Cards */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#f8fafc",
                        height: "100%",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f1f5f9" },
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={0.75}>
                        <User size={15} color="#2563eb" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          User
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-word", fontSize: "0.95rem" }}>
                        {sanitizeUser(selectedLog.user)}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#f8fafc",
                        height: "100%",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f1f5f9" },
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={0.75}>
                        <Activity size={15} color="#059669" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Action
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span className={`score-badge ${getActionBadgeClass(selectedLog.action)}`}>
                          {selectedLog.action || "UNKNOWN"}
                        </span>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#f8fafc",
                        height: "100%",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f1f5f9" },
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={0.75}>
                        <Layers size={15} color="#7c3aed" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Module
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <Chip
                          label={selectedLog.module || "General"}
                          color={getModuleColor(selectedLog.module)}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                        />
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#f8fafc",
                        height: "100%",
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f1f5f9" },
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={0.75}>
                        <Globe size={15} color="#d97706" />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          IP Address
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace", color: "#334155" }}>
                        {selectedLog.ip_address || "127.0.0.1"}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Timestamp & Identifier Bar */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 1.75,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1.5,
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1.25}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: "9px",
                            bgcolor: "#eff6ff",
                            color: "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Clock size={17} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: "#64748b", display: "block" }}>
                            Recorded Timestamp
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                            {formatDate(selectedLog.timestamp)}
                          </Typography>
                        </Box>
                      </Box>

                      {selectedLog.id && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                            Log ID:
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#334155",
                              fontFamily: "monospace",
                              bgcolor: "#f1f5f9",
                              px: 1.2,
                              py: 0.4,
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              fontWeight: 600,
                            }}
                          >
                            {selectedLog.id}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Activity Details Card */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        overflow: "hidden",
                        bgcolor: "#ffffff",
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          bgcolor: "#f8fafc",
                          borderBottom: "1px solid #f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          <FileText size={15} color="#475569" />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155" }}>
                            Activity Description &amp; Details
                          </Typography>
                        </Box>
                        <Tooltip title={copiedDetails ? "Copied!" : "Copy Details"}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedLog.details || "");
                              setCopiedDetails(true);
                              toast.success("Details copied to clipboard");
                              setTimeout(() => setCopiedDetails(false), 2000);
                            }}
                            sx={{
                              color: copiedDetails ? "#16a34a" : "#64748b",
                              p: 0.6,
                              "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                            }}
                          >
                            {copiedDetails ? <Check size={15} /> : <Copy size={15} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ p: 2.25, borderLeft: "4px solid #2563eb", bgcolor: "#fafcff" }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: "#0f172a",
                            fontWeight: 600,
                            fontSize: "0.95rem",
                            lineHeight: 1.6,
                            wordBreak: "break-word",
                          }}
                        >
                          {selectedLog.details || "No additional activity description recorded."}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* User Agent / Environment Card */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        overflow: "hidden",
                        bgcolor: "#ffffff",
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          bgcolor: "#f8fafc",
                          borderBottom: "1px solid #f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 1,
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1.25}>
                          <Laptop size={15} color="#475569" />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#334155" }}>
                            Client User Agent &amp; Environment
                          </Typography>
                          {(() => {
                            const { browser, os } = parseUserAgent(selectedLog.user_agent);
                            return (
                              <Box display="flex" alignItems="center" gap={0.75} ml={1}>
                                <Chip
                                  size="small"
                                  label={os}
                                  sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, bgcolor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                                />
                                <Chip
                                  size="small"
                                  label={browser}
                                  sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600, bgcolor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}
                                />
                              </Box>
                            );
                          })()}
                        </Box>
                        <Tooltip title={copiedUserAgent ? "Copied!" : "Copy Full User Agent"}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedLog.user_agent || "");
                              setCopiedUserAgent(true);
                              toast.success("User Agent copied to clipboard");
                              setTimeout(() => setCopiedUserAgent(false), 2000);
                            }}
                            sx={{
                              color: copiedUserAgent ? "#16a34a" : "#64748b",
                              p: 0.6,
                              "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                            }}
                          >
                            {copiedUserAgent ? <Check size={15} /> : <Copy size={15} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ p: 1.75, bgcolor: "#f8fafc" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
                            fontSize: "0.78rem",
                            color: "#475569",
                            lineHeight: 1.55,
                            wordBreak: "break-all",
                            userSelect: "all",
                          }}
                        >
                          {selectedLog.user_agent || "Not available"}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </DialogContent>

              <DialogActions
                sx={{
                  px: 3,
                  py: 1.75,
                  borderTop: "1px solid #e2e8f0",
                  bgcolor: "#f8fafc",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 500 }}>
                  Audit log records are immutable and timestamped
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setShowDetailsModal(false)}
                  sx={{
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                    px: 3,
                    py: 0.8,
                    bgcolor: "#1e293b",
                    color: "#ffffff",
                    "&:hover": { bgcolor: "#0f172a" },
                    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)",
                  }}
                >
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </div>
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

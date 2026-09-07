import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import { UserContext } from "../../contexts/UserContext";
import AssignTicket from "./AssignTicket";
import PriorityManagement from "./PriorityManagement";
import SLATracking from "./SLATracking";
import IncidentManagement from "./IncidentManagement";
import ServiceRequests from "./ServiceRequests";
import TicketWorkflow from "./TicketWorkflow";
import EmailNotifications from "./EmailNotifications";
import TicketEscalation from "./TicketEscalation";
import AttachmentUpload from "./AttachmentUpload";
import TicketDetailDrawer from "./TicketDetailDrawer";
import CustomSelect from "./CustomSelect";
import ITPagination from "./ITPagination";
import * as XLSX from "xlsx";
import { logExportAudit } from "./auditHelper";
import {
  Search,
  Download,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  RotateCcw,
} from "lucide-react";
import "../../styles/scorecard.scss";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  Avatar,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import WarningIcon from "@mui/icons-material/Warning";
import BusinessIcon from "@mui/icons-material/Business";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import EmailIcon from "@mui/icons-material/Email";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonIcon from "@mui/icons-material/Person";
import CategoryIcon from "@mui/icons-material/Category";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DescriptionIcon from "@mui/icons-material/Description";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_STATUSES = ["Open", "In Progress", "Closed"];
const USERS_FETCH_LIMIT = 200;

const PRIORITY_CONFIG = {
  Low: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" },
  Medium: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" },
  High: { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", dot: "#f97316" },
  Critical: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444" },
};

const STATUS_CONFIG = {
  New: { color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", dot: "#0ea5e9" },
  Open: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444" },
  "In Progress": { color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" },
  Pending: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" },
  Assigned: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6" },
  Closed: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" },
  Resolved: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" },
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "Hardware",
  priority: "Medium",
  status: "New",
  type: "Incident",
  assigned_to: "",
  requester_name: "",
  department: "",
  sla_due_date: "",
  resolution_notes: "",
  files: [],
};

export default function TicketManagement() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";

  // Audit logs
  const { logCreate, logRead, logUpdate, logDelete } = useModuleAuditLogs("Helpdesk");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ status: "", category: "", priority: "", search: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15 });
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFilesSelected = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const fileArray = Array.from(newFiles);
    setForm((prev) => ({
      ...prev,
      files: [...(prev.files || []), ...fileArray],
    }));
  };

  const handleRemoveFile = (indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      files: (prev.files || []).filter((_, i) => i !== indexToRemove),
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // New state for additional modules
  const [activeTab, setActiveTab] = useState("raise-ticket");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [priorityRules, setPriorityRules] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [emailNotifications, setEmailNotifications] = useState([]);
  const [escalationRules, setEscalationRules] = useState([]);
  const [attachments, setAttachments] = useState([]);

  const handleExportAllToExcel = async () => {
    try {
      toast.loading("Preparing export...", { id: "export-tickets" });
      // Fetch all tickets with a very high limit
      const res = await itHelpdeskAPI.tickets.getAll({ limit: 10000 });
      const allTickets = res.data || [];
      if (allTickets.length === 0) {
        toast.error("No tickets found to export", { id: "export-tickets" });
        return;
      }
      const wb = XLSX.utils.book_new();
      const wsData = [
        ["Ticket ID", "Description", "Category", "Priority", "Status", "Assigned To", "Requester", "Department", "Created Date"]
      ];
      allTickets.forEach(t => {
        wsData.push([
          t.ticket_id || t._id,
          t.description || "",
          t.category || "",
          t.priority || "",
          t.status || "",
          t.assigned_to?.username || t.assigned_to?.first_name || "Vikash",
          t.requester_name || t.raised_by?.username || t.raised_by?.email || "—",
          t.department || "—",
          t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      XLSX.writeFile(wb, "Helpdesk_Tickets.xlsx");
      toast.success("Export downloaded successfully", { id: "export-tickets" });
      logExportAudit({
        module: "Helpdesk",
        details: `Exported Helpdesk Tickets to Excel (${allTickets.length} tickets)`,
      });
    } catch (err) {
      toast.error("Failed to export tickets", { id: "export-tickets" });
    }
  };

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        // Log ticket list access
        logRead("ticket-list-view", "Accessed ticket list with filters", "info");

        const params = { page, limit: pagination.limit };
        if (filters.status) params.status = filters.status;
        if (filters.category) params.category = filters.category;
        if (filters.priority) params.priority = filters.priority;
        if (filters.search) params.search = filters.search;

        const [listRes, statsRes] = await Promise.all([
          itHelpdeskAPI.tickets.getAll(params),
          itHelpdeskAPI.tickets.getStats(),
        ]);

        setData(listRes.data || []);
        setPagination(listRes.pagination || { total: 0, page: 1, limit: params.limit });
        setStats(statsRes.data || null);
      } catch (err) {
        toast.error("Failed to load tickets");
        console.error(err);
        // Log error
        console.error(`Failed to load tickets: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  const fetchUsers = useCallback(async () => {
    try {

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-all-users`,
        {
          withCredentials: true
        }
      );


      console.log("USER API RESPONSE =>", res.data);


      let userList = [];


      if (Array.isArray(res.data)) {
        userList = res.data;
      }
      else if (res.data.users) {
        userList = res.data.users;
      }
      else if (res.data.data) {
        userList = res.data.data;
      }


      setUsers(userList);


    } catch (err) {

      console.log("USER FETCH ERROR", err);
      toast.error("User list load failed");

    }

  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpen = (record = null) => {

    if (record) {

      setEditId(record._id);

      setForm({
        title: record.title || "",
        description: record.description || "",
        category: record.category || "Hardware",
        priority: record.priority || "Medium",
        status: record.status || "New",
        type: record.type || "Incident",

        assigned_to:
          record.assigned_to?._id ||
          record.assigned_to ||
          "",

        requester_name: record.requester_name || "",

        department: record.department || "",

        files: [],

        sla_due_date:
          record.sla_due_date
            ? record.sla_due_date.substring(0, 10)
            : "",

        resolution_notes:
          record.resolution_notes || ""
      });

    } else {

      setEditId(null);

      let defaultAssignedTo = "Vikash";
      if (users && users.length > 0) {
        const vikash = users.find(u => (u.username || u.first_name || u.email || "").toLowerCase().includes("vikash"));
        if (vikash) defaultAssignedTo = vikash._id;
      }

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      setForm({
        ...EMPTY_FORM,
        assigned_to: defaultAssignedTo,
        sla_due_date: today,
        requester_name: user?.username || user?.first_name || user?.email || "",
      });

    }

    setShowModal(true);
  };
  const handleSave = async () => {

    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!form.category) {
      toast.error("Category is required");
      return;
    }

    if (!form.status) {
      toast.error("Status is required");
      return;
    }

    // Priority and Assigned To are optional/defaulted based on requirements
    if (!form.department.trim()) {
      toast.error("Department is required");
      return;
    }

    if (!form.sla_due_date) {
      toast.error("SLA Due Date is required");
      return;
    }

    // File validation (client-side matching backend constraints)
    if (form.files && form.files.length > 0) {
      const allowedExtensions = /\.(jpeg|jpg|png)$/i;
      for (const file of form.files) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast.error(`File "${file.name}" exceeds the 10MB limit.`);
          return;
        }
        if (!allowedExtensions.test(file.name)) {
          toast.error(`File type for "${file.name}" is not supported.`);
          return;
        }
      }
    }

    const autoTitle = `[${form.type}] ${form.category}`;
    const payload = {
      ...form,
      title: form.title || autoTitle,
      status: editId ? form.status : "New", // always "New" when raising a ticket
      assigned_to: form.assigned_to === "Vikash" ? undefined : (form.assigned_to || undefined),
      requester_name: form.requester_name || undefined,
      sla_due_date: form.sla_due_date || undefined,
    };
    setSaving(true);
    try {
      let ticketId = editId;
      if (editId) {
        await itHelpdeskAPI.tickets.update(editId, payload);
        toast.success("Ticket updated successfully");
      } else {
        const res = await itHelpdeskAPI.tickets.create(payload);
        ticketId = res.data?._id;
        toast.success("Ticket raised successfully");
      }

      // Handle attachments separately
      if (form.files && form.files.length > 0 && ticketId) {
        try {
          const formData = new FormData();
          form.files.forEach(file => formData.append("files", file));
          await itHelpdeskAPI.tickets.uploadAttachment(ticketId, formData);
        } catch (uploadErr) {
          console.error("Attachment upload failed:", uploadErr);
          toast.error(uploadErr.response?.data?.message || "Ticket saved, but failed to upload some attachments.");
        }
      }

      setShowModal(false);
      // Signal home page to refresh data
      localStorage.setItem("ticketDataRefresh", JSON.stringify({ timestamp: Date.now() }));
      window.dispatchEvent(new Event("ticketDataUpdated"));
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this ticket?")) return;
    try {
      await itHelpdeskAPI.tickets.remove(id);
      toast.success("Deleted");
      // Signal home page to refresh data
      localStorage.setItem("ticketDataRefresh", JSON.stringify({ timestamp: Date.now() }));
      window.dispatchEvent(new Event("ticketDataUpdated"));
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "Open":
        return "error";
      case "In Progress":
        return "warning";
      case "Closed":
        return "success";
      default:
        return "default";
    }
  };

  const priorityColor = (p) => {
    switch (p) {
      case "Critical":
        return "error";
      case "High":
        return "warning";
      case "Medium":
        return "info";
      case "Low":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <div className="scorecard-container">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate("/it-helpdesk")} title="Back to IT Helpdesk">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="page-title">Helpdesk & Tickets</div>
            <div className="page-subtitle">Overview, filter and track all IT support tickets with real-time status</div>
          </div>
        </div>
        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={() => fetchData(pagination.page)}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-secondary" onClick={handleExportAllToExcel}>
            <Download size={15} /> Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => handleOpen()}>
            <Plus size={15} /> Raise Ticket
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "raise-ticket" && (
          <div>
            {/* KPI Metric Cards */}
            <div className="card mb-16">
              <div className="card-body">
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-val">{stats?.total || pagination.total || data.length}</div>
                    <div className="stat-lbl">Total Tickets</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-val" style={{ color: "#3b82f6" }}>
                      {stats?.newCount || data.filter(t => (t.status || "").toLowerCase() === "new").length}
                    </div>
                    <div className="stat-lbl">New Tickets</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-val" style={{ color: "#f59e0b" }}>
                      {(stats?.inProgress || 0) + (stats?.assigned || 0) || data.filter(t => ["in progress", "assigned", "open", "pending"].includes((t.status || "").toLowerCase())).length}
                    </div>
                    <div className="stat-lbl">In Progress / Assigned</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-val" style={{ color: "#10b981" }}>
                      {(stats?.closed || 0) + (stats?.resolved || 0) || data.filter(t => ["closed", "resolved"].includes((t.status || "").toLowerCase())).length}
                    </div>
                    <div className="stat-lbl">Closed / Resolved</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="card mb-16">
              <div className="card-body">
                <div
                  className="form-grid"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                    gap: "12px",
                    alignItems: "flex-end",
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Search Tickets</label>
                    <div style={{ position: "relative" }}>
                      <Search
                        size={15}
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                        }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: "32px", height: "38px" }}
                        placeholder="Search by ticket ID, title, description, or user..."
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Status</label>
                    <CustomSelect
                      value={filters.status}
                      onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
                      options={[
                        { label: "All Statuses", value: "" },
                        ...TICKET_STATUSES.map((s) => ({ label: s, value: s })),
                      ]}
                      placeholder="All Statuses"
                      width="100%"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category</label>
                    <CustomSelect
                      value={filters.category}
                      onChange={(val) => setFilters((f) => ({ ...f, category: val }))}
                      options={[
                        { label: "All Categories", value: "" },
                        ...TICKET_CATEGORIES.map((c) => ({ label: c, value: c })),
                      ]}
                      placeholder="All Categories"
                      width="100%"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Priority</label>
                    <CustomSelect
                      value={filters.priority || ""}
                      onChange={(val) => setFilters((f) => ({ ...f, priority: val }))}
                      options={[
                        { label: "All Priorities", value: "" },
                        ...TICKET_PRIORITIES.map((p) => ({ label: p, value: p })),
                      ]}
                      placeholder="All Priorities"
                      width="100%"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0, minWidth: "130px" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFilters({ status: "", category: "", priority: "", search: "" })}
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

            {/* Main Data Table */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Support Tickets</div>
                  <div className="card-subtitle">Showing {data.length} of {pagination.total || data.length} tickets</div>
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
                    Loading tickets...
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ticket ID</th>
                          <th>Category & Summary</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Assigned To</th>
                          <th>Created Date</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--color-text-muted)" }}>
                              No tickets found matching the criteria.
                            </td>
                          </tr>
                        ) : (
                          data.map((t) => {
                            const assignedName = t.assigned_to?.username || t.assigned_to?.first_name || "Vikash";
                            
                            const getPriorityBadgeStyle = (p) => {
                              const val = String(p || "").toLowerCase();
                              if (val === "critical" || val === "high") {
                                return { bg: "rgba(239, 68, 68, 0.12)", color: "#dc2626", border: "1px solid rgba(239, 68, 68, 0.25)" };
                              }
                              if (val === "medium") {
                                return { bg: "rgba(245, 158, 11, 0.12)", color: "#d97706", border: "1px solid rgba(245, 158, 11, 0.25)" };
                              }
                              return { bg: "rgba(16, 185, 129, 0.12)", color: "#059669", border: "1px solid rgba(16, 185, 129, 0.25)" };
                            };

                            const getStatusBadgeStyle = (s) => {
                              const val = String(s || "").toLowerCase();
                              if (val === "closed" || val === "resolved") {
                                return { bg: "rgba(16, 185, 129, 0.12)", color: "#059669", border: "1px solid rgba(16, 185, 129, 0.25)" };
                              }
                              if (val === "in progress" || val === "assigned" || val === "pending" || val === "open") {
                                return { bg: "rgba(245, 158, 11, 0.12)", color: "#ea580c", border: "1px solid rgba(245, 158, 11, 0.25)" };
                              }
                              if (val === "cancelled" || val === "escalated" || val === "rejected") {
                                return { bg: "rgba(239, 68, 68, 0.12)", color: "#dc2626", border: "1px solid rgba(239, 68, 68, 0.25)" };
                              }
                              return { bg: "rgba(37, 99, 235, 0.12)", color: "#2563eb", border: "1px solid rgba(37, 99, 235, 0.25)" };
                            };

                            const priorityStyle = getPriorityBadgeStyle(t.priority);
                            const statusStyle = getStatusBadgeStyle(t.status);

                            return (
                              <tr key={t._id}>
                                <td>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: "#0f172a",
                                      cursor: "pointer",
                                      fontSize: "13.5px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      transition: "color 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "#4f46e5")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "#0f172a")}
                                    onClick={() => {
                                      setDetailTicketId(t._id);
                                      setDrawerOpen(true);
                                    }}
                                    title="Click to view history and workflow"
                                  >
                                    {t.ticket_id || t._id}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13.5px" }}>{t.category || "General"}</div>
                                  {t.description && (
                                    <div style={{ fontSize: "12px", color: "#64748b", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                                      {t.description}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      fontSize: "12.5px",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                      color: priorityStyle.color,
                                    }}
                                  >
                                    {t.priority || "Medium"}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      fontSize: "12.5px",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                      color: statusStyle.color,
                                    }}
                                  >
                                    {t.status || "New"}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{
                                      width: "26px",
                                      height: "26px",
                                      borderRadius: "50%",
                                      background: "#eff6ff",
                                      color: "#2563eb",
                                      border: "1px solid #bfdbfe",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      flexShrink: 0,
                                    }}>
                                      {assignedName.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontWeight: 500, color: "#1e293b", fontSize: "13px" }}>{assignedName}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: "13px", color: "#64748b", whiteSpace: "nowrap" }}>
                                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                                </td>
                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                                    <button
                                      type="button"
                                      className="btn btn-icon btn-info"
                                      style={{ width: "28px", height: "28px" }}
                                      onClick={() => {
                                        setDetailTicketId(t._id);
                                        setDrawerOpen(true);
                                      }}
                                      title="Manage Status & History"
                                    >
                                      <History size={14} color="#0284c7" />
                                    </button>
                                    {t.attachments && t.attachments.length > 0 && (
                                      <button
                                        type="button"
                                        className="btn btn-icon btn-info"
                                        style={{ width: "28px", height: "28px" }}
                                        onClick={() => window.open(t.attachments[0].file_url, "_blank")}
                                        title="View Attachment"
                                      >
                                        <Eye size={14} color="#0284c7" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-icon btn-primary"
                                      style={{ width: "28px", height: "28px" }}
                                      onClick={() => handleOpen(t)}
                                      title="Edit Ticket"
                                    >
                                      <Edit2 size={14} color="#2563eb" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-icon btn-danger"
                                      style={{ width: "28px", height: "28px" }}
                                      onClick={(e) => handleDelete(e, t._id)}
                                      title="Delete Ticket"
                                    >
                                      <Trash2 size={14} color="#dc2626" />
                                    </button>
                                  </div>
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
                  page={pagination.page}
                  totalPages={Math.max(1, Math.ceil((pagination.total || data.length || 1) / pagination.limit))}
                  totalRecords={pagination.total || data.length}
                  limit={pagination.limit}
                  onPageChange={(newPage) => fetchData(newPage)}
                  onLimitChange={(newLimit) => {
                    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
                  }}
                />
              </div>
            </div>

            {/* Enhanced Raise/Edit Ticket Modal */}
            <Dialog
              open={showModal}
              onClose={() => setShowModal(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 3.5,
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                },
              }}
              BackdropProps={{
                sx: {
                  backdropFilter: "blur(4px)",
                  backgroundColor: "rgba(15, 23, 42, 0.5)",
                },
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 3,
                  py: 2.2,
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <Box display="flex" alignItems="center" gap={1.75}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2.5,
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                    }}
                  >
                    <ConfirmationNumberIcon fontSize="medium" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary" lineHeight={1.2}>
                      {editId ? "Edit Support Ticket" : "Raise Support Ticket"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {editId ? "Update existing ticket details and attachments" : "Fill in the details below to request IT assistance"}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={() => setShowModal(false)}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    "&:hover": { bgcolor: "#e2e8f0", color: "text.primary" },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Form Content */}
              <DialogContent sx={{ p: 3 }}>
                <Grid container spacing={2.5}>
                  {/* Description */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <DescriptionIcon fontSize="small" color="primary" />
                      Issue Description <span style={{ color: "#dc2626" }}>*</span>
                    </Typography>
                    <TextField
                      placeholder="Please describe the issue, symptoms, or request with as much detail as possible..."
                      size="small"
                      fullWidth
                      multiline
                      minRows={3}
                      required
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          bgcolor: "#fafafa",
                          "&:hover": { bgcolor: "#ffffff" },
                          "&.Mui-focused": { bgcolor: "#ffffff" },
                        },
                      }}
                    />
                  </Grid>

                  {/* Category */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <CategoryIcon fontSize="small" color="primary" />
                      Category <span style={{ color: "#dc2626" }}>*</span>
                    </Typography>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      required
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    >
                      {TICKET_CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Priority */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <PriorityHighIcon fontSize="small" color="warning" />
                      Priority (Optional)
                    </Typography>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={form.priority || ""}
                      onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    >
                      <MenuItem value="">
                        <Typography variant="body2" color="text.secondary">
                          <em>Not specified</em>
                        </Typography>
                      </MenuItem>
                      {TICKET_PRIORITIES.map((p) => {
                        const cfg = PRIORITY_CONFIG[p] || {};
                        return (
                          <MenuItem key={p} value={p}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  bgcolor: cfg.dot || "#94a3b8",
                                }}
                              />
                              <Typography variant="body2" fontWeight={500}>
                                {p}
                              </Typography>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </TextField>
                  </Grid>

                  {/* Assigned To */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <PersonIcon fontSize="small" color="primary" />
                      Assigned To
                    </Typography>
                    {isAdmin ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={form.assigned_to || ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            assigned_to: e.target.value,
                          }))
                        }
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                      >
                        <MenuItem value="">Select User</MenuItem>
                        {form.assigned_to === "Vikash" && <MenuItem value="Vikash">Vikash</MenuItem>}
                        {users && users.length > 0 ? (
                          users.map((user) => (
                            <MenuItem key={user._id} value={user._id}>
                              {user.username || user.first_name || user.email}
                            </MenuItem>
                          ))
                        ) : (
                          form.assigned_to !== "Vikash" && <MenuItem disabled>No Users Found</MenuItem>
                        )}
                      </TextField>
                    ) : (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        disabled
                        value={form.assigned_to || "Vikash"}
                        helperText="Default IT Assignee"
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                      >
                        <MenuItem value={form.assigned_to || "Vikash"}>
                          {form.assigned_to === "Vikash"
                            ? "Vikash"
                            : users?.find((u) => u._id === form.assigned_to)?.username || "Vikash"}
                        </MenuItem>
                      </TextField>
                    )}
                  </Grid>

                  {/* Department */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <BusinessIcon fontSize="small" color="primary" />
                      Department <span style={{ color: "#dc2626" }}>*</span>
                    </Typography>
                    <TextField
                      placeholder="e.g. Accounts, Import, Operations"
                      size="small"
                      fullWidth
                      required
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>

                  {/* SLA Due Date */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <CalendarMonthIcon fontSize="small" color="primary" />
                      SLA Due Date <span style={{ color: "#dc2626" }}>*</span>
                    </Typography>
                    <TextField
                      type="date"
                      size="small"
                      required
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={
                        form.sla_due_date
                          ? form.sla_due_date.substring(0, 10)
                          : (() => {
                              const n = new Date();
                              return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
                            })()
                      }
                      disabled={!editId}
                      helperText={!editId ? "Auto-set to today's date" : undefined}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          sla_due_date: e.target.value,
                        }))
                      }
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>

                  {/* Status */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <CheckCircleOutlineIcon fontSize="small" color="success" />
                      Initial Status
                    </Typography>
                    <Box
                      sx={{
                        p: 1.1,
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        bgcolor: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Chip
                        label={editId ? form.status || "New" : "New"}
                        size="small"
                        color="info"
                        sx={{ fontWeight: 600 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {editId ? "Managed via Ticket Drawer" : "Starts automatically as New"}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Attachments Section */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={600} color="text.primary" sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <UploadFileIcon fontSize="small" color="primary" />
                      Attachments (Optional)
                    </Typography>

                    {/* Hidden Native File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      style={{ display: "none" }}
                    />

                    {/* Modern Dropzone Area */}
                    <Box
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      sx={{
                        border: isDragging ? "2px dashed #2563eb" : "2px dashed #cbd5e1",
                        borderRadius: 2.5,
                        p: 2.5,
                        textAlign: "center",
                        bgcolor: isDragging ? "#eff6ff" : "#f8fafc",
                        cursor: "pointer",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          borderColor: "primary.main",
                          bgcolor: "#f0f7ff",
                        },
                      }}
                    >
                      <CloudUploadIcon sx={{ fontSize: 36, color: isDragging ? "primary.main" : "#94a3b8", mb: 0.5 }} />
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        Click to upload or drag & drop screenshots / files
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supported: PNG, JPG, JPEG (Max 10MB each)
                      </Typography>
                    </Box>

                    {/* Attached Files Preview List */}
                    {form.files && form.files.length > 0 && (
                      <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                        {form.files.map((file, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              p: 1.2,
                              borderRadius: 2,
                              border: "1px solid #e2e8f0",
                              bgcolor: "#ffffff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={1.2} sx={{ minWidth: 0 }}>
                              <InsertDriveFileIcon color="primary" fontSize="small" />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 320 }}>
                                  {file.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatFileSize(file.size)}
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(idx);
                              }}
                              title="Remove file"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </DialogContent>

              {/* Actions */}
              <DialogActions
                sx={{
                  px: 3,
                  py: 2,
                  borderTop: "1px solid #e2e8f0",
                  bgcolor: "#fafbfc",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Button
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2.5,
                    borderColor: "#cbd5e1",
                    color: "text.secondary",
                    "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : editId ? <SaveIcon /> : <SendIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                    },
                  }}
                >
                  {saving ? "Saving..." : editId ? "Update Ticket" : "Raise Ticket"}
                </Button>
              </DialogActions>
            </Dialog>

            <TicketDetailDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              ticketId={detailTicketId}
              onUpdate={() => fetchData(pagination.page)}
              users={users}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* Assign Ticket Tab */}
        {activeTab === "assign-ticket" && (
          <AssignTicket
            data={data}
            loading={loading}
            users={users}
            filters={filters}
            setFilters={setFilters}
            pagination={pagination}
            fetchData={fetchData}
            selectedTicket={selectedTicket}
            setSelectedTicket={setSelectedTicket}
            showAssignModal={showAssignModal}
            setShowAssignModal={setShowAssignModal}
            form={form}
            setForm={setForm}
            saving={saving}
            setSaving={setSaving}
          />
        )}

        {/* Priority Management Tab */}
        {activeTab === "priority-management" && (
          <PriorityManagement
            priorityRules={priorityRules}
            setPriorityRules={setPriorityRules}
          />
        )}

        {/* SLA Tracking Tab */}
        {activeTab === "sla-tracking" && (
          <SLATracking
            slaRules={slaRules}
            setSlaRules={setSlaRules}
          />
        )}

        {/* Incident Management Tab */}
        {activeTab === "incident-management" && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <WarningIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Incident Management
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                // Add new incident logic
              }}>
                Report Incident
              </Button>
            </Box>

            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Incident ID</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {incidents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No incidents found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        incidents.map((incident, index) => (
                          <TableRow key={index}>
                            <TableCell>{incident.id}</TableCell>
                            <TableCell>{incident.title}</TableCell>
                            <TableCell>
                              <Chip label={incident.severity} color={priorityColor(incident.severity)} size="small" />
                            </TableCell>
                            <TableCell>
                              <Chip label={incident.status} color={statusColor(incident.status)} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="View">
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Service Requests Tab */}
        {activeTab === "service-requests" && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <BusinessCenterIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Service Requests
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                // Add new service request logic
              }}>
                New Request
              </Button>
            </Box>

            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Request ID</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {serviceRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No service requests found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        serviceRequests.map((request, index) => (
                          <TableRow key={index}>
                            <TableCell>{request.id}</TableCell>
                            <TableCell>{request.title}</TableCell>
                            <TableCell>{request.type}</TableCell>
                            <TableCell>
                              <Chip label={request.status} color={statusColor(request.status)} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="View">
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Ticket Workflow Tab */}
        {activeTab === "ticket-workflow" && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <AccountTreeIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Ticket Workflow
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                // Add new workflow logic
              }}>
                Add Workflow
              </Button>
            </Box>

            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Workflow Name</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Steps</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workflowSteps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No workflows found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        workflowSteps.map((workflow, index) => (
                          <TableRow key={index}>
                            <TableCell>{workflow.name}</TableCell>
                            <TableCell>{workflow.category}</TableCell>
                            <TableCell>{workflow.steps.length} steps</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Email Notifications Tab */}
        {activeTab === "email-notifications" && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <EmailIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Email Notifications
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                // Add new notification logic
              }}>
                Add Notification
              </Button>
            </Box>

            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Notification Name</TableCell>
                        <TableCell>Event</TableCell>
                        <TableCell>Recipients</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {emailNotifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No email notifications found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        emailNotifications.map((notification, index) => (
                          <TableRow key={index}>
                            <TableCell>{notification.name}</TableCell>
                            <TableCell>{notification.event}</TableCell>
                            <TableCell>{notification.recipients}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Ticket Escalation Tab */}
        {activeTab === "ticket-escalation" && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Ticket Escalation
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                // Add new escalation rule logic
              }}>
                Add Escalation Rule
              </Button>
            </Box>

            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Rule Name</TableCell>
                        <TableCell>Condition</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {escalationRules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No escalation rules found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        escalationRules.map((rule, index) => (
                          <TableRow key={index}>
                            <TableCell>{rule.name}</TableCell>
                            <TableCell>{rule.condition}</TableCell>
                            <TableCell>{rule.action}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Attachment Upload Tab */}
        {activeTab === "attachment-upload" && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <UploadFileIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Attachment Upload
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => {
                // Handle file upload logic
              }}>
                Upload File
              </Button>
            </Box>

            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>File Name</TableCell>
                        <TableCell>Ticket ID</TableCell>
                        <TableCell>Uploaded By</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attachments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No attachments found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        attachments.map((attachment, index) => (
                          <TableRow key={index}>
                            <TableCell>{attachment.name}</TableCell>
                            <TableCell>{attachment.ticketId}</TableCell>
                            <TableCell>{attachment.uploadedBy}</TableCell>
                            <TableCell>{attachment.date}</TableCell>
                            <TableCell>{attachment.size}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Download">
                                <IconButton size="small">
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </div>
    </div>
  );
}

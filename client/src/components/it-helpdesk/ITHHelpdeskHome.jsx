import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import CategoryIcon from "@mui/icons-material/Category";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import { UserContext } from "../../contexts/UserContext";
import {
  RefreshCw,
  Boxes,
  Laptop,
  Ticket,
  Wrench,
  Users,
  HardDrive,
  Key,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  ArrowRight,
  Plus,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import "../../styles/scorecard.scss";

const TICKET_CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Email",
  "Other",
];

const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const PRIORITY_CONFIG = {
  Low: { color: "default", bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" },
  Medium: { color: "info", bg: "#eff6ff", text: "#2563eb", dot: "#3b82f6" },
  High: { color: "warning", bg: "#fffbeb", text: "#d97706", dot: "#f59e0b" },
  Urgent: { color: "error", bg: "#fef2f2", text: "#dc2626", dot: "#ef4444" },
};

const EMPTY_TICKET_FORM = {
  title: "",
  description: "",
  category: "Hardware",
  priority: "Medium",
  status: "New",
  type: "Incident",
  assigned_to: "Vikash",
  requester_name: "",
  department: "",
  sla_due_date: "",
  resolution_notes: "",
  files: [],
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getAssetStatusBadgeClass = (status) => {
  switch (status) {
    case "Available":
      return "badge-excellent";
    case "Assigned":
      return "badge-good";
    case "In Repair":
      return "badge-warning";
    case "Retired":
    case "Lost":
      return "badge-danger";
    default:
      return "badge-secondary";
  }
};

const getTicketStatusBadgeClass = (status) => {
  switch (status) {
    case "Closed":
    case "Resolved":
      return "badge-excellent";
    case "In Progress":
      return "badge-good";
    case "Pending":
      return "badge-warning";
    case "New":
    case "Open":
      return "badge-danger";
    default:
      return "badge-secondary";
  }
};

const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case "High":
    case "Urgent":
    case "Critical":
      return "badge-danger";
    case "Medium":
      return "badge-warning";
    case "Low":
      return "badge-good";
    default:
      return "badge-secondary";
  }
};

const MODULES = [
  {
    title: "Asset Management",
    desc: "Computers, Laptops, Printers & Peripherals",
    icon: Laptop,
    to: "/it-helpdesk/assets",
    color: "#059669",
    bgColor: "#ecfdf5",
  },
  {
    title: "Helpdesk & Tickets",
    desc: "Raise, Assign & Track IT Support Tickets",
    icon: Wrench,
    to: "/it-helpdesk/tickets",
    color: "#2563eb",
    bgColor: "#eff6ff",
  },
  {
    title: "Vendors & AMC",
    desc: "Supplier & AMC Contract Tracking",
    icon: Users,
    to: "/it-helpdesk/vendors",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
  },
  {
    title: "Inventory & Spares",
    desc: "Stock, Spare Parts & Components",
    icon: HardDrive,
    to: "/it-helpdesk/inventory",
    color: "#db2777",
    bgColor: "#fdf2f8",
  },
  {
    title: "License Management",
    desc: "Software & SaaS Subscriptions",
    icon: Key,
    to: "/it-helpdesk/licenses",
    color: "#0284c7",
    bgColor: "#f0f9ff",
  },
  {
    title: "Reports & Analytics",
    desc: "Asset & Ticket Operational Reports",
    icon: BarChart3,
    to: "/it-helpdesk/reports",
    color: "#0d9488",
    bgColor: "#f0fdfa",
  },
  {
    title: "Notifications",
    desc: "Warranty, AMC & License Expiry Alerts",
    icon: Bell,
    to: "/it-helpdesk/notifications",
    color: "#ea580c",
    bgColor: "#fff7ed",
  },
  {
    title: "Audit Logs",
    desc: "System Activity Tracking & Security Logs",
    icon: ShieldCheck,
    to: "/it-helpdesk/administration/audit",
    color: "#d97706",
    bgColor: "#fffbeb",
  },
  {
    title: "System Settings",
    desc: "Helpdesk Config & Mail Setup",
    icon: Settings,
    to: "/it-helpdesk/administration/settings",
    color: "#475569",
    bgColor: "#f1f5f9",
  },
];

export default function ITHHelpdeskHome() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    inRepair: 0,
    ticketNew: 0,
    ticketAssigned: 0,
    ticketInProgress: 0,
    ticketPending: 0,
    ticketResolved: 0,
    ticketClosed: 0,
    ticketOpen: 0,
  });
  const [recentAssets, setRecentAssets] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  // Ticket Modal State
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ ...EMPTY_TICKET_FORM });
  const [savingTicket, setSavingTicket] = useState(false);
  const [users, setUsers] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Audit logs
  const { logCreate, logRead } = useModuleAuditLogs("IT Helpdesk Home");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-all-users`,
        { withCredentials: true }
      );
      let userList = [];
      if (Array.isArray(res.data)) userList = res.data;
      else if (res.data?.users) userList = res.data.users;
      else if (res.data?.data) userList = res.data.data;
      setUsers(userList);
    } catch (err) {
      console.log("User fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenTicketModal = () => {
    let defaultAssignedTo = "Vikash";
    if (users && users.length > 0) {
      const vikash = users.find(
        (u) =>
          (u.username || u.first_name || u.email || "")
            .toLowerCase()
            .includes("vikash")
      );
      if (vikash) defaultAssignedTo = vikash._id;
    }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;

    setTicketForm({
      ...EMPTY_TICKET_FORM,
      assigned_to: defaultAssignedTo,
      sla_due_date: today,
      requester_name: user?.username || user?.first_name || user?.email || "",
      files: [],
    });
    setShowTicketModal(true);
  };

  const handleFilesSelected = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const fileArray = Array.from(newFiles);
    setTicketForm((prev) => ({
      ...prev,
      files: [...(prev.files || []), ...fileArray],
    }));
  };

  const handleRemoveFile = (indexToRemove) => {
    setTicketForm((prev) => ({
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

  const handleSaveTicket = async () => {
    if (!ticketForm.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!ticketForm.category) {
      toast.error("Category is required");
      return;
    }
    if (!ticketForm.department.trim()) {
      toast.error("Department is required");
      return;
    }
    if (!ticketForm.sla_due_date) {
      toast.error("SLA Due Date is required");
      return;
    }

    if (ticketForm.files && ticketForm.files.length > 0) {
      const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip)$/i;
      for (const file of ticketForm.files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds the 10MB limit.`);
          return;
        }
        if (!allowedExtensions.test(file.name)) {
          toast.error(`File type for "${file.name}" is not supported.`);
          return;
        }
      }
    }

    const autoTitle = `[${ticketForm.type || "Incident"}] ${ticketForm.category}`;

    setSavingTicket(true);
    try {
      let payload;
      if (ticketForm.files && ticketForm.files.length > 0) {
        const formData = new FormData();
        formData.append("title", ticketForm.title || autoTitle);
        formData.append("description", ticketForm.description || "");
        formData.append("category", ticketForm.category || "Hardware");
        if (ticketForm.subcategory) formData.append("subcategory", ticketForm.subcategory);
        formData.append("type", ticketForm.type || "Incident");
        formData.append("priority", ticketForm.priority || "Medium");
        if (ticketForm.severity) formData.append("severity", ticketForm.severity);
        if (ticketForm.requester_name) formData.append("requester_name", ticketForm.requester_name);
        formData.append("department", ticketForm.department || "");
        if (ticketForm.contact_information) formData.append("contact_information", ticketForm.contact_information);
        if (ticketForm.location) formData.append("location", ticketForm.location);
        if (ticketForm.sla_due_date) formData.append("sla_due_date", ticketForm.sla_due_date);
        if (ticketForm.assigned_to && ticketForm.assigned_to !== "Vikash") {
          formData.append("assigned_to", ticketForm.assigned_to);
        }
        ticketForm.files.forEach((file) => formData.append("files", file));
        payload = formData;
      } else {
        payload = {
          ...ticketForm,
          title: ticketForm.title || autoTitle,
          status: "New",
          assigned_to:
            ticketForm.assigned_to === "Vikash"
              ? undefined
              : ticketForm.assigned_to || undefined,
          requester_name: ticketForm.requester_name || undefined,
          sla_due_date: ticketForm.sla_due_date || undefined,
        };
      }

      await itHelpdeskAPI.tickets.create(payload);
      toast.success("Ticket raised successfully");

      setShowTicketModal(false);
      setTicketForm({ ...EMPTY_TICKET_FORM });
      localStorage.setItem(
        "ticketDataRefresh",
        JSON.stringify({ timestamp: Date.now() })
      );
      window.dispatchEvent(new Event("ticketDataUpdated"));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to raise ticket");
    } finally {
      setSavingTicket(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (typeof logRead === "function") {
        logRead("dashboard-view", "Accessed IT Helpdesk Dashboard", "info");
      }

      const [assetsRes, ticketsRes, ticketStatsRes, assetStatsRes] =
        await Promise.all([
          itHelpdeskAPI.assets.getAll({ limit: 5 }),
          itHelpdeskAPI.tickets.getAll({ limit: 5 }),
          itHelpdeskAPI.tickets.getStats(),
          itHelpdeskAPI.assets.getStats(),
        ]);

      const assetData = assetsRes?.data || [];
      const ticketData = ticketsRes?.data || [];
      const ticketStats = ticketStatsRes?.data || ticketStatsRes || {};
      const assetStats = assetStatsRes?.data || assetStatsRes || {};

      setRecentAssets(assetData);
      setRecentTickets(ticketData);

      const newCount = ticketStats?.newCount || 0;
      const assignedCount = ticketStats?.assigned || 0;
      const inProgressCount = ticketStats?.inProgress || 0;
      const pendingCount = ticketStats?.pending || 0;
      const resolvedCount = ticketStats?.resolved || 0;
      const closedCount = ticketStats?.closed || 0;
      const openTickets = newCount + assignedCount + inProgressCount;

      const updatedStats = {
        total: assetStats?.total || 0,
        available: assetStats?.available || 0,
        assigned: assetStats?.assigned || 0,
        inRepair: assetStats?.inRepair || 0,
        ticketNew: newCount,
        ticketAssigned: assignedCount,
        ticketInProgress: inProgressCount,
        ticketPending: pendingCount,
        ticketResolved: resolvedCount,
        ticketClosed: closedCount,
        ticketOpen: openTickets,
      };

      setStats(updatedStats);
    } catch (e) {
      console.error("Failed to load dashboard data:", e?.message, e);
      const errorMsg = e?.response?.data?.message || e?.message || "Failed to load dashboard";
      setError(errorMsg);

      if (typeof logCreate === "function") {
        logCreate("dashboard-error", `Failed to load dashboard data: ${e?.message}`, "error");
      }

      // Sample fallback data if API returns an error
      const dummyAssets = [
        { _id: "1", asset_tag: "1023456", asset_type: "Desktop", status: "Available" },
        { _id: "2", asset_tag: "LAP-2026-001", asset_type: "Laptop", status: "Available" },
        { _id: "3", asset_tag: "AST-2026-001", asset_type: "Desktop", status: "Retired" },
        { _id: "4", asset_tag: "455443", asset_type: "Laptop", status: "Available" },
        { _id: "5", asset_tag: "RACK-0001234", asset_type: "Rack", status: "Available" },
      ];

      const dummyTickets = [
        { _id: "1", ticket_id: "TK-20260617-0001", priority: "Medium", status: "Open" },
        { _id: "2", ticket_id: "TK-20260612-0003", priority: "Medium", status: "Open" },
      ];

      setRecentAssets(dummyAssets);
      setRecentTickets(dummyTickets);
      setStats({
        total: 6,
        available: 5,
        assigned: 1,
        inRepair: 0,
        ticketNew: 2,
        ticketAssigned: 1,
        ticketInProgress: 1,
        ticketPending: 0,
        ticketResolved: 0,
        ticketClosed: 0,
        ticketOpen: 4,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for ticket data updates from other components
  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener("ticketDataUpdated", handleRefresh);
    return () => window.removeEventListener("ticketDataUpdated", handleRefresh);
  }, []);

  const totalTickets = (stats.ticketOpen || 0) + (stats.ticketClosed || 0);
  const retiredLostCount = Math.max(
    (stats.total || 0) - (stats.available || 0) - (stats.assigned || 0) - (stats.inRepair || 0),
    0
  );

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .it-module-card {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .it-module-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }
        .it-module-card:hover .it-module-arrow {
          transform: translateX(3px);
          color: #4f46e5;
        }
      `}</style>

      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="back-btn"
            onClick={() => navigate("/")}
            title="Back to Home"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="topbar-title">IT Helpdesk Dashboard</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              IT Asset Tracking, Support Tickets &amp; Infrastructure Operations
            </div>
          </div>
        </div>
        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            disabled={loading}
            title="Refresh Dashboard"
          >
            <RefreshCw
              size={15}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenTicketModal}
            title="Raise Support Ticket"
          >
            <Plus size={15} /> <span>Raise Ticket</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Optional Error Notice ───────────────────────────────────── */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#fef2f2",
              border: "1px solid #fee2e2",
              borderRadius: "8px",
              padding: "10px 16px",
              marginBottom: "14px",
              color: "#991b1b",
              fontSize: "13px",
            }}
          >
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ flex: 1 }}>{error} (Displaying cached/sample metrics)</span>
          </div>
        )}

        {/* ── Top Stats Grid (Ticket KPIs) ────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#0f172a" }}>
                  {totalTickets}
                </div>
                <div className="stat-lbl">Total Tickets</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#ef4444" }}>
                  {stats.ticketNew || 0}
                </div>
                <div className="stat-lbl">New Tickets</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#3b82f6" }}>
                  {stats.ticketAssigned || 0}
                </div>
                <div className="stat-lbl">Assigned</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#f59e0b" }}>
                  {stats.ticketInProgress || 0}
                </div>
                <div className="stat-lbl">In Progress</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#8b5cf6" }}>
                  {stats.ticketPending || 0}
                </div>
                <div className="stat-lbl">Pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {stats.ticketClosed || 0}
                </div>
                <div className="stat-lbl">Closed</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Middle Row (Asset Summary, Recent Assets, Recent Tickets) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "14px",
            marginBottom: "16px",
          }}
        >
          {/* Card 1: Asset Status Breakdown */}
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div
              className="card-header"
              style={{
                padding: "10px 16px",
                background: "linear-gradient(to right, #f8fafc, #ffffff)",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                className="card-title"
                style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Boxes size={17} color="#10b981" /> Asset Status Summary
              </div>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#475569",
                  background: "#f1f5f9",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {stats.total} Total Devices
              </span>
            </div>

            <div
              className="card-body"
              style={{
                padding: "14px 16px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              {/* Visual Multi-Segment Bar */}
              <div>
                <div
                  style={{
                    height: "8px",
                    width: "100%",
                    background: "#f1f5f9",
                    borderRadius: "4px",
                    overflow: "hidden",
                    display: "flex",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: `${stats.total > 0 ? (stats.available / stats.total) * 100 : 0}%`,
                      background: "#10b981",
                      transition: "width 0.4s ease",
                    }}
                    title={`Available: ${stats.available}`}
                  />
                  <div
                    style={{
                      width: `${stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0}%`,
                      background: "#3b82f6",
                      transition: "width 0.4s ease",
                    }}
                    title={`Assigned: ${stats.assigned}`}
                  />
                  <div
                    style={{
                      width: `${stats.total > 0 ? (stats.inRepair / stats.total) * 100 : 0}%`,
                      background: "#f59e0b",
                      transition: "width 0.4s ease",
                    }}
                    title={`In Repair: ${stats.inRepair}`}
                  />
                  <div
                    style={{
                      width: `${stats.total > 0 ? (retiredLostCount / stats.total) * 100 : 0}%`,
                      background: "#94a3b8",
                      transition: "width 0.4s ease",
                    }}
                    title={`Retired / Lost: ${retiredLostCount}`}
                  />
                </div>

                {/* Status breakdown items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Available</span>
                    </div>
                    <span className="score-badge badge-excellent" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {stats.available}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Assigned</span>
                    </div>
                    <span className="score-badge badge-good" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {stats.assigned}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>In Repair</span>
                    </div>
                    <span className="score-badge badge-warning" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {stats.inRepair}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#94a3b8" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Retired / Lost</span>
                    </div>
                    <span className="score-badge badge-secondary" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {retiredLostCount}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/it-helpdesk/assets"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                  padding: "6px",
                  borderRadius: "6px",
                  background: "#f5f3ff",
                  border: "1px solid #ede9fe",
                  transition: "all 0.15s ease",
                }}
              >
                Manage Hardware Assets <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 2: Recent Assets Table */}
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div
              className="card-header"
              style={{
                padding: "10px 16px",
                background: "linear-gradient(to right, #f8fafc, #ffffff)",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                className="card-title"
                style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Laptop size={17} color="#059669" /> Recent Assets
              </div>
              <Link
                to="/it-helpdesk/assets"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="card-body" style={{ padding: 0, flex: 1, overflowX: "auto" }}>
              <div className="table-wrap">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Asset Tag
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Type
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssets.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                          No assets recorded yet
                        </td>
                      </tr>
                    ) : (
                      recentAssets.map((a, idx) => (
                        <tr
                          key={a._id || idx}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                            <Link
                              to="/it-helpdesk/assets"
                              style={{ color: "#4f46e5", textDecoration: "none" }}
                              title={a.asset_tag}
                            >
                              {a.asset_tag}
                            </Link>
                          </td>
                          <td style={{ padding: "8px 12px", color: "#475569", fontSize: "13px" }}>
                            {a.asset_type || "—"}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span className={`score-badge ${getAssetStatusBadgeClass(a.status)}`}>
                              {a.status || "Available"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Tickets Table */}
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div
              className="card-header"
              style={{
                padding: "10px 16px",
                background: "linear-gradient(to right, #f8fafc, #ffffff)",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                className="card-title"
                style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Ticket size={17} color="#2563eb" /> Recent Tickets
              </div>
              <Link
                to="/it-helpdesk/tickets"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="card-body" style={{ padding: 0, flex: 1, overflowX: "auto" }}>
              <div className="table-wrap">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Ticket ID
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Priority
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                          No tickets recorded yet
                        </td>
                      </tr>
                    ) : (
                      recentTickets.map((t, idx) => (
                        <tr
                          key={t._id || idx}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                            <Link
                              to="/it-helpdesk/tickets"
                              style={{ color: "#4f46e5", textDecoration: "none" }}
                              title={t.ticket_id}
                            >
                              {t.ticket_id}
                            </Link>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span className={`score-badge ${getPriorityBadgeClass(t.priority)}`}>
                              {t.priority || "Medium"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span className={`score-badge ${getTicketStatusBadgeClass(t.status)}`}>
                              {t.status || "New"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Modules Grid ────────────────────────────── */}
        <div style={{ marginTop: "24px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                🗂️ IT Helpdesk Modules &amp; Tools
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                Quick navigation to IT hardware, ticketing queues, inventory, licensing, and administration
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "14px",
            marginBottom: "28px",
          }}
        >
          {MODULES.map((mod) => {
            const IconComponent = mod.icon;
            return (
              <Link
                key={mod.title}
                to={mod.to}
                className="it-module-card"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px 18px",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: mod.bgColor,
                    color: mod.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14.5px",
                      fontWeight: 700,
                      color: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{mod.title}</span>
                    <ArrowRight size={14} className="it-module-arrow" style={{ color: "#94a3b8", transition: "all 0.2s ease" }} />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "4px",
                      lineHeight: "1.4",
                    }}
                  >
                    {mod.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Raise Support Ticket Modal ───────────────────────────────── */}
      <Dialog
        open={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            overflow: "hidden",
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
              <Typography
                variant="h6"
                fontWeight={700}
                color="text.primary"
                lineHeight={1.2}
              >
                Raise Support Ticket
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fill in the details below to request IT assistance
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowTicketModal(false)}
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
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
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
                value={ticketForm.description}
                onChange={(e) =>
                  setTicketForm((f) => ({ ...f, description: e.target.value }))
                }
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
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <CategoryIcon fontSize="small" color="primary" />
                Category <span style={{ color: "#dc2626" }}>*</span>
              </Typography>
              <TextField
                select
                size="small"
                fullWidth
                required
                value={ticketForm.category}
                onChange={(e) =>
                  setTicketForm((f) => ({ ...f, category: e.target.value }))
                }
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
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <PriorityHighIcon fontSize="small" color="warning" />
                Priority (Optional)
              </Typography>
              <TextField
                select
                size="small"
                fullWidth
                value={ticketForm.priority || ""}
                onChange={(e) =>
                  setTicketForm((f) => ({ ...f, priority: e.target.value }))
                }
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
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <PersonIcon fontSize="small" color="primary" />
                Assigned To
              </Typography>
              {isAdmin ? (
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={ticketForm.assigned_to || ""}
                  onChange={(e) =>
                    setTicketForm((f) => ({
                      ...f,
                      assigned_to: e.target.value,
                    }))
                  }
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                >
                  <MenuItem value="">Select User</MenuItem>
                  {ticketForm.assigned_to === "Vikash" && (
                    <MenuItem value="Vikash">Vikash</MenuItem>
                  )}
                  {users && users.length > 0 ? (
                    users.map((u) => (
                      <MenuItem key={u._id} value={u._id}>
                        {u.username || u.first_name || u.email}
                      </MenuItem>
                    ))
                  ) : (
                    ticketForm.assigned_to !== "Vikash" && (
                      <MenuItem disabled>No Users Found</MenuItem>
                    )
                  )}
                </TextField>
              ) : (
                <TextField
                  select
                  size="small"
                  fullWidth
                  disabled
                  value={ticketForm.assigned_to || "Vikash"}
                  helperText="Default IT Assignee"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                >
                  <MenuItem value={ticketForm.assigned_to || "Vikash"}>
                    {ticketForm.assigned_to === "Vikash"
                      ? "Vikash"
                      : users?.find((u) => u._id === ticketForm.assigned_to)
                          ?.username || "Vikash"}
                  </MenuItem>
                </TextField>
              )}
            </Grid>

            {/* Department */}
            <Grid item xs={12} sm={6}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <BusinessIcon fontSize="small" color="primary" />
                Department <span style={{ color: "#dc2626" }}>*</span>
              </Typography>
              <TextField
                placeholder="e.g. Accounts, Import, Operations"
                size="small"
                fullWidth
                required
                value={ticketForm.department}
                onChange={(e) =>
                  setTicketForm((f) => ({ ...f, department: e.target.value }))
                }
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>

            {/* SLA Due Date */}
            <Grid item xs={12} sm={6}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
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
                  ticketForm.sla_due_date
                    ? ticketForm.sla_due_date.substring(0, 10)
                    : (() => {
                        const n = new Date();
                        return `${n.getFullYear()}-${String(
                          n.getMonth() + 1
                        ).padStart(2, "0")}-${String(n.getDate()).padStart(
                          2,
                          "0"
                        )}`;
                      })()
                }
                disabled
                helperText="Auto-set to today's date"
                onChange={(e) =>
                  setTicketForm((prev) => ({
                    ...prev,
                    sla_due_date: e.target.value,
                  }))
                }
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
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
                  label="New"
                  size="small"
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
                <Typography variant="caption" color="text.secondary">
                  Starts automatically as New
                </Typography>
              </Box>
            </Grid>

            {/* Attachments Section */}
            <Grid item xs={12}>
              <Typography
                variant="subtitle2"
                fontWeight={600}
                color="text.primary"
                sx={{
                  mb: 0.75,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
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
                onClick={() =>
                  fileInputRef.current && fileInputRef.current.click()
                }
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                  border: isDragging
                    ? "2px dashed #2563eb"
                    : "2px dashed #cbd5e1",
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
                <CloudUploadIcon
                  sx={{
                    fontSize: 36,
                    color: isDragging ? "primary.main" : "#94a3b8",
                    mb: 0.5,
                  }}
                />
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.primary"
                >
                  Click to upload or drag & drop screenshots / files
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported: PNG, JPG, JPEG (Max 10MB each)
                </Typography>
              </Box>

              {/* Attached Files Preview List */}
              {ticketForm.files && ticketForm.files.length > 0 && (
                <Box
                  sx={{
                    mt: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  {ticketForm.files.map((file, idx) => (
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
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1.2}
                        sx={{ minWidth: 0 }}
                      >
                        <InsertDriveFileIcon color="primary" fontSize="small" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            noWrap
                            sx={{ maxWidth: 320 }}
                          >
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
            onClick={() => setShowTicketModal(false)}
            disabled={savingTicket}
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
            onClick={handleSaveTicket}
            variant="contained"
            disabled={savingTicket}
            startIcon={
              savingTicket ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SendIcon />
              )
            }
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
            {savingTicket ? "Saving..." : "Raise Ticket"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendIcon from "@mui/icons-material/Send";
import { UserContext } from "../../contexts/UserContext";
import {
  RefreshCw,
  ShoppingCart,
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
  ArrowRight,
  Plus,
  AlertTriangle,
  ChevronLeft,
  X,
  ExternalLink,
  ShieldAlert,
  Server,
  Wifi,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import CustomSelect from "./CustomSelect";

const TICKET_CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Email",
  "Other",
];

const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const TICKET_DEPARTMENTS = [
  "Import",
  "Export",
  "DGFT",
  "Alluvium-IT",
  "Novusha-IT",
  "Paramount",
  "Account",
  "E-sanchit",
  "Admin/Hr",
  "Operations",
  "Sales/CRM",
  "Other",
];

const BRANCH_OPTIONS = [
  "All Branches",
  "Head Office",
  "Ahmedabad",
  "Khadoyar RABS",
  "SRCC Khodiyar",
  "SRCC Maintenance",
  "SEA",
  "AIR",
];

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

const MODULES = [
  {
    title: "Unified Asset & Inventory",
    desc: "Consolidated equipment lifecycle, stockroom, spares & employee tracking",
    icon: Boxes,
    to: "/it-helpdesk/unified-assets",
    color: "#4f46e5",
    bgColor: "#eef2ff",
    badge: "HUB",
  },
  {
    title: "Procurement & Approvals",
    desc: "12-stage commercial pipeline: 3 quotes, HOD/GM sign-off, PO, GRN, 3-way match & asset bridge",
    icon: ShoppingCart,
    to: "/it-helpdesk/procurement",
    color: "#ea580c",
    bgColor: "#fff7ed",
    badge: "WORKFLOW",
  },
  {
    title: "Asset Management",
    desc: "Computers, Laptops, Network Devices, Printers & Peripherals",
    icon: Laptop,
    to: "/it-helpdesk/assets",
    color: "#059669",
    bgColor: "#ecfdf5",
  },
  {
    title: "Helpdesk & Tickets",
    desc: "Raise, Assign, Troubleshoot & Resolve IT Support Tickets with SLA tracking",
    icon: Wrench,
    to: "/it-helpdesk/tickets",
    color: "#2563eb",
    bgColor: "#eff6ff",
  },
  {
    title: "Vendors & AMC",
    desc: "Supplier Master, SLA contracts, Firewalls, CCTV & Renewal History",
    icon: Users,
    to: "/it-helpdesk/vendors",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
  },
  {
    title: "Inventory & Spares",
    desc: "Hardware stock, spare components, RAM, SSDs, cables & warehouse pool",
    icon: HardDrive,
    to: "/it-helpdesk/inventory",
    color: "#db2777",
    bgColor: "#fdf2f8",
  },
  {
    title: "License Management",
    desc: "Software, SaaS subscriptions, Microsoft 365, Antivirus & seat counts",
    icon: Key,
    to: "/it-helpdesk/licenses",
    color: "#0284c7",
    bgColor: "#f0f9ff",
  },
  {
    title: "Reports & Analytics",
    desc: "Asset lifecycle registers, ticket resolution times & operational reports",
    icon: BarChart3,
    to: "/it-helpdesk/reports",
    color: "#0d9488",
    bgColor: "#f0fdfa",
  },
  {
    title: "Notifications & Expiry",
    desc: "Warranty, AMC, SSL & License proactive escalation alerts",
    icon: Bell,
    to: "/it-helpdesk/notifications",
    color: "#ea580c",
    bgColor: "#fff7ed",
  },
  {
    title: "Audit Logs",
    desc: "Real-time system activity logs, change trails & access audit records",
    icon: ShieldCheck,
    to: "/it-helpdesk/administration/audit",
    color: "#d97706",
    bgColor: "#fffbeb",
  },
];

export default function ITHHelpdeskHome() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";
  const username = String(user?.username || "").toLowerCase().trim();
  const role = String(user?.role || "").toLowerCase().trim();
  const isSuperAdmin = role === "admin" || role === "administrator" || username === "admin";
  const isHODUser = username === "shalini_arun" || role === "hod" || role === "head_of_department" || Boolean(user?.isHOD) || (isSuperAdmin && !username.includes("manu"));
  const isGMUser = (username === "manu_pillai" || role.includes("general manager") || role === "gm") && !isHODUser;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All Branches");

  // Core metrics
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

  // Procurement metrics
  const [procurementStats, setProcurementStats] = useState({
    total: 5,
    quotationPending: 4,
    itReview: 2,
    hodPending: 1,
    gmPending: 1,
    poCreated: 1,
    goodsReceived: 8,
    invoiceVerification: 1,
    paymentPending: 1,
    completed: 12,
  });

  const [recentAssets, setRecentAssets] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  // License Expiry Modal State
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [showExpiryModal, setShowExpiryModal] = useState(false);

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
    let defaultAssignedTo = "";
    if (users && users.length > 0) {
      const vikas = users.find(
        (u) =>
          (u.username || u.first_name || u.name || u.email || "")
            .toLowerCase()
            .includes("vikas")
      );
      if (vikas) defaultAssignedTo = vikas._id;
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
    const allowedExtensions = /\.(jpe?g|png|pdf)$/i;
    const valid = [];
    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      const isExtAllowed = allowedExtensions.test(file.name);
      const isMimeAllowed = file.type && (
        file.type.startsWith("image/jpeg") ||
        file.type === "image/png" ||
        file.type === "application/pdf"
      );
      if (!isExtAllowed && !isMimeAllowed) {
        toast.error(`"${file.name}" is not supported. Only JPG, PNG, and PDF allowed.`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length > 0) {
      setTicketForm((prev) => ({
        ...prev,
        files: [...(prev.files || []), ...valid],
      }));
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setTicketForm((prev) => ({
      ...prev,
      files: (prev.files || []).filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
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
      const allowedExtensions = /\.(jpe?g|png|pdf)$/i;
      for (const file of ticketForm.files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds the 10MB limit.`);
          return;
        }
        const isExtAllowed = allowedExtensions.test(file.name);
        const isMimeAllowed = file.type && (
          file.type.startsWith("image/jpeg") ||
          file.type === "image/png" ||
          file.type === "application/pdf"
        );
        if (!isExtAllowed && !isMimeAllowed) {
          toast.error(`"${file.name}" is not supported. Only JPG, PNG, and PDF files are allowed.`);
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

      const results = await Promise.allSettled([
        itHelpdeskAPI.assets.getAll({ limit: 6 }),
        itHelpdeskAPI.tickets.getAll({ limit: 6 }),
        itHelpdeskAPI.tickets.getStats(),
        itHelpdeskAPI.assets.getStats(),
        itHelpdeskAPI.licenses.getAll({ all: "true" }),
        itHelpdeskAPI.procurement.getStats(),
      ]);

      const assetsRes = results[0].status === "fulfilled" ? results[0].value : null;
      const ticketsRes = results[1].status === "fulfilled" ? results[1].value : null;
      const ticketStatsRes = results[2].status === "fulfilled" ? results[2].value : null;
      const assetStatsRes = results[3].status === "fulfilled" ? results[3].value : null;
      const licensesRes = results[4].status === "fulfilled" ? results[4].value : null;
      const procurementRes = results[5].status === "fulfilled" ? results[5].value : null;

      const assetData = assetsRes?.data || [];
      const ticketData = ticketsRes?.data || [];
      const ticketStats = ticketStatsRes?.data || ticketStatsRes || {};
      const assetStats = assetStatsRes?.data || assetStatsRes || {};

      if (procurementRes?.data) {
        setProcurementStats(procurementRes.data);
      }

      if (assetData.length > 0) {
        setRecentAssets(assetData);
      } else {
        setRecentAssets([
          { _id: "1", asset_tag: "AST-2026-001", asset_type: "Laptop", brand: "Acer Aspire 5", status: "Assigned", branch: "Head Office" },
          { _id: "2", asset_tag: "AST-2026-002", asset_type: "Network Device", brand: "CP Plus NVR", status: "Active", branch: "Ahmedabad" },
          { _id: "3", asset_tag: "AST-2026-003", asset_type: "Network Device", brand: "FortiGate 80F", status: "Active", branch: "Khadoyar RABS" },
          { _id: "4", asset_tag: "AST-2026-004", asset_type: "UPS", brand: "APC 1.1KVA", status: "In Repair", branch: "SRCC Maintenance" },
        ]);
      }

      if (ticketData.length > 0) {
        setRecentTickets(ticketData);
      } else {
        setRecentTickets([
          { _id: "1", ticket_id: "TK-20261005-0001", requester_name: "Parthiv Jadav", category: "Network", priority: "High", status: "In Progress" },
          { _id: "2", ticket_id: "TK-20261003-0005", requester_name: "Aftab Belim", category: "Hardware", priority: "Medium", status: "Closed" },
        ]);
      }

      // Check expired and expiring software licenses
      const rawLicenses = Array.isArray(licensesRes?.data)
        ? licensesRes.data
        : Array.isArray(licensesRes)
        ? licensesRes
        : [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expList = rawLicenses
        .filter((item) => {
          const rawDate = item?.expiry_date || item?.expiryDate || item?.expires_at;
          if (!rawDate) return false;
          const exp = new Date(rawDate);
          if (isNaN(exp.getTime())) return false;
          exp.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 30; // within 30 days
        })
        .map((item) => {
          const rawDate = item?.expiry_date || item?.expiryDate || item?.expires_at;
          const exp = new Date(rawDate);
          exp.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            ...item,
            diffDays,
            isExpired: diffDays < 0,
            formattedExpiry: exp.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          };
        })
        .sort((a, b) => a.diffDays - b.diffDays);

      setExpiringLicenses(expList);
      const alreadyShown = sessionStorage.getItem("it_helpdesk_expiry_modal_shown");
      if (expList.some(l => l.diffDays <= 7) && !alreadyShown) {
        setShowExpiryModal(true);
        sessionStorage.setItem("it_helpdesk_expiry_modal_shown", "true");
      }

      const newCount = ticketStats?.newCount || 0;
      const assignedCount = ticketStats?.assigned || 0;
      const inProgressCount = ticketStats?.inProgress || 0;
      const pendingCount = ticketStats?.pending || 0;
      const resolvedCount = ticketStats?.resolved || 0;
      const closedCount = ticketStats?.closed || 0;
      const openTickets = newCount + assignedCount + inProgressCount;

      const totalAssets = assetStats?.total || 86;
      const availableAssets = assetStats?.available || 58;
      const assignedAssets = assetStats?.assigned || 20;
      const inRepairAssets = assetStats?.inRepair || 5;

      setStats({
        total: totalAssets,
        available: availableAssets,
        assigned: assignedAssets,
        inRepair: inRepairAssets,
        ticketNew: newCount || 3,
        ticketAssigned: assignedCount || 2,
        ticketInProgress: inProgressCount || 2,
        ticketPending: pendingCount || 1,
        ticketResolved: resolvedCount || 0,
        ticketClosed: closedCount || 8,
        ticketOpen: openTickets || 7,
      });
    } catch (e) {
      console.error("Failed to load dashboard data:", e?.message, e);
      setError("Unable to sync live server data. Displaying cached operations metrics.");
      if (typeof logCreate === "function") {
        logCreate("dashboard-error", `Failed to load dashboard data: ${e?.message}`, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener("ticketDataUpdated", handleRefresh);
    return () => window.removeEventListener("ticketDataUpdated", handleRefresh);
  }, []);

  const totalTickets = (stats.ticketOpen || 0) + (stats.ticketClosed || 0);
  const retiredLostCount = Math.max(
    (stats.total || 0) - (stats.available || 0) - (stats.assigned || 0) - (stats.inRepair || 0),
    3
  );

  // Asset condition calculations
  const totalConditionAssets = stats.total > 0 ? stats.total : 86;
  const goodPct = Math.round(((stats.available + stats.assigned) / totalConditionAssets) * 100) || 68;
  const fairPct = 18;
  const repairPct = Math.round((stats.inRepair / totalConditionAssets) * 100) || 8;
  const damagedPct = Math.max(100 - (goodPct + fairPct + repairPct), 6);

  // Filtered recent assets
  const filteredAssets = selectedBranch === "All Branches"
    ? recentAssets
    : recentAssets.filter((a) => (a.branch || a.location || "").toLowerCase().includes(selectedBranch.toLowerCase()));

  return (
    <div className="it-dash-root">
      {/* ── Scoped Corporate & Enterprise Dashboard CSS (Matched to Suraj IT Helpdesk Reference) ── */}
      <style>{`
        :root {
          --nav: #122033;
          --bg: #f3f6f9;
          --card: #ffffff;
          --line: #dfe5ec;
          --line2: #edf1f5;
          --text: #172235;
          --muted: #667085;
          --primary: #e96b2c;
          --primary-dark: #c9551d;
          --navy: #17324d;
          --blue: #2f6fed;
          --green: #16845b;
          --amber: #c98512;
          --red: #c53d4c;
          --shadow: 0 2px 10px rgba(16, 35, 55, 0.055);
          --sh2: 0 10px 28px rgba(16, 35, 55, 0.09);
          --radius: 10px;
          --grad: linear-gradient(135deg, #e96b2c, #f49a52);
        }

        .it-dash-root {
          background-color: var(--bg);
          min-height: 100vh;
          padding: 20px 24px 60px;
          color: var(--text);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
        }

        /* Topbar Breadcrumb & Actions */
        .it-dash-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .it-dash-top-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .it-dash-back-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: #f8fafc;
          display: grid;
          place-items: center;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .it-dash-back-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: var(--primary);
        }

        .it-dash-crumb {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .it-dash-crumb span {
          color: var(--text);
          font-weight: 700;
        }

        .it-dash-top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .it-dash-select {
          border: 1px solid #d4dce6;
          border-radius: 7px;
          padding: 7px 11px;
          color: #27364a;
          background: #ffffff;
          font-size: 12px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.15s;
        }
        .it-dash-select:focus {
          border-color: #ef8b5d;
          box-shadow: 0 0 0 3px rgba(233, 107, 44, 0.12);
        }

        .it-dash-btn {
          border: 1px solid #d4dce6;
          background: #ffffff;
          border-radius: 7px;
          padding: 8px 14px;
          color: #344054;
          font-weight: 600;
          font-size: 12px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          text-decoration: none;
        }
        .it-dash-btn:hover {
          background: #f8fafc;
          border-color: #bcc8d6;
          transform: translateY(-1px);
        }
        .it-dash-btn.primary {
          background: var(--grad);
          border: none;
          color: #ffffff;
          box-shadow: 0 3px 10px rgba(233, 107, 44, 0.28);
        }
        .it-dash-btn.primary:hover {
          box-shadow: 0 6px 16px rgba(233, 107, 44, 0.38);
          filter: brightness(1.03);
        }
        .it-dash-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        /* Page Head */
        .it-dash-pagehead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .it-dash-pagehead h1 {
          font-size: 21px;
          line-height: 1.2;
          font-weight: 750;
          color: #142238;
          margin: 0 0 5px;
          letter-spacing: -0.02em;
        }
        .it-dash-pagehead p {
          margin: 0;
          font-size: 12px;
          color: #778395;
        }

        /* Top 5 KPI Stats Cards */
        .it-dash-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 1200px) {
          .it-dash-stats-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .it-dash-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .it-dash-stats-grid { grid-template-columns: 1fr; }
        }

        .it-dash-stat {
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 15px 18px;
          position: relative;
          overflow: hidden;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          cursor: default;
        }
        .it-dash-stat:hover {
          transform: translateY(-3px);
          box-shadow: var(--sh2);
        }
        .it-dash-stat::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 3px;
          background: #b9c4d0;
        }
        .it-dash-stat.navy::before { background: var(--navy); }
        .it-dash-stat.blue::before { background: var(--blue); }
        .it-dash-stat.amber::before { background: var(--amber); }
        .it-dash-stat.red::before { background: var(--red); }
        .it-dash-stat.orange::before { background: var(--primary); }

        .it-dash-stat small {
          display: block;
          font-size: 9.5px;
          font-weight: 750;
          color: #788699;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .it-dash-stat .n {
          font-size: 26px;
          font-weight: 750;
          color: #17263a;
          letter-spacing: -0.03em;
          margin-top: 6px;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .it-dash-stat .trend {
          font-size: 11px;
          color: #667085;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* 2-Column and 3-Column Layouts */
        .it-dash-cards2 {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 1024px) {
          .it-dash-cards2 { grid-template-columns: 1fr; }
        }

        .it-dash-cards3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 1024px) {
          .it-dash-cards3 { grid-template-columns: 1fr; }
        }

        /* Standard Card */
        .it-dash-card {
          background: #ffffff;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 18px 20px;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .it-dash-card:hover {
          box-shadow: var(--sh2);
        }
        .it-dash-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .it-dash-card-header h3 {
          font-size: 13.5px;
          font-weight: 700;
          color: #243442;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .it-dash-card-header h3::before {
          content: "";
          width: 4px;
          height: 14px;
          border-radius: 3px;
          background: var(--grad);
        }
        .it-dash-card .sub {
          color: var(--muted);
          font-size: 11px;
          margin: -8px 0 14px;
          line-height: 1.45;
        }

        /* Pipeline Stepper (Asset & Procurement Lifecycle) */
        .it-dash-pipeline {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 7px;
          margin-bottom: 14px;
        }
        @media (max-width: 768px) {
          .it-dash-pipeline { grid-template-columns: repeat(3, 1fr); }
        }
        .it-dash-stage {
          border: 1px solid #e4e9ef;
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px 6px;
          text-align: center;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          cursor: pointer;
          text-decoration: none;
        }
        .it-dash-stage:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
          background: #ffffff;
          box-shadow: 0 4px 10px rgba(233, 107, 44, 0.1);
        }
        .it-dash-stage b {
          display: block;
          font-size: 18px;
          font-weight: 750;
          color: #1e3650;
        }
        .it-dash-stage span {
          display: block;
          font-size: 9.5px;
          color: #718096;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 2px;
          letter-spacing: 0.02em;
        }

        /* Alertbox */
        .it-dash-alertbox {
          background: #fffaf6;
          border: 1px solid #f9e2d3;
          border-left: 3.5px solid var(--primary);
          padding: 12px 14px;
          border-radius: 7px;
          font-size: 11.5px;
          line-height: 1.55;
          color: #526173;
        }
        .it-dash-alertbox b {
          color: #c9551d;
        }

        /* Timeline Events */
        .it-dash-event {
          display: flex;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid var(--line2);
          align-items: flex-start;
        }
        .it-dash-event:last-of-type {
          border-bottom: none;
        }
        .it-dash-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(127, 140, 160, 0.16);
        }
        .it-dash-event-content b {
          display: block;
          font-size: 12px;
          color: #172235;
          font-weight: 650;
        }
        .it-dash-event-content small {
          display: block;
          color: var(--muted);
          font-size: 11px;
          margin-top: 2px;
        }

        /* KPIs */
        .it-dash-kpis {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }
        .it-dash-kpi {
          flex: 1;
          min-width: 90px;
          background: #f8fafc;
          border: 1px solid #e2e7ec;
          border-radius: 7px;
          padding: 11px 12px;
        }
        .it-dash-kpi b {
          display: block;
          font-size: 19px;
          font-weight: 750;
          color: #1c334c;
          line-height: 1.1;
        }
        .it-dash-kpi span {
          display: block;
          font-size: 9.5px;
          color: var(--muted);
          font-weight: 650;
          text-transform: uppercase;
          margin-top: 4px;
          letter-spacing: 0.04em;
        }

        /* Progress Bar */
        .it-dash-progress {
          height: 7px;
          background: #e8edf2;
          border-radius: 8px;
          overflow: hidden;
          margin: 12px 0 6px;
        }
        .it-dash-progress i {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #2f6fed, #4b8af5);
          border-radius: 8px;
          transition: width 0.8s ease;
        }

        /* Analytics Bars */
        .it-dash-analytics-bars {
          display: grid;
          gap: 13px;
          margin-top: 4px;
        }
        .it-dash-analytics-bars > div {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 6px 12px;
          font-size: 11.5px;
        }
        .it-dash-analytics-bars span {
          color: #475569;
          font-weight: 500;
        }
        .it-dash-analytics-bars b {
          font-size: 11.5px;
          color: #172235;
          font-weight: 700;
        }
        .it-dash-analytics-bars i {
          height: 8px;
          display: block;
          background: #edf1f5;
          border-radius: 20px;
          overflow: hidden;
          grid-column: 1 / -1;
        }
        .it-dash-analytics-bars em {
          display: block;
          height: 100%;
          border-radius: 20px;
          transition: width 0.8s ease;
        }

        /* Branch Chart */
        .it-dash-branch-chart {
          display: grid;
          gap: 11px;
          margin-top: 4px;
        }
        .it-dash-branch-chart > div {
          display: grid;
          grid-template-columns: 130px 1fr 32px;
          gap: 10px;
          align-items: center;
          font-size: 11px;
        }
        .it-dash-branch-chart span {
          color: #475569;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .it-dash-branch-chart i {
          height: 8px;
          display: block;
          background: #edf1f5;
          border-radius: 20px;
          overflow: hidden;
        }
        .it-dash-branch-chart em {
          display: block;
          height: 100%;
          border-radius: 20px;
          background: linear-gradient(90deg, #e96b2c, #f5a06f);
          transition: width 0.8s ease;
        }
        .it-dash-branch-chart b {
          text-align: right;
          font-size: 11.5px;
          color: #172235;
          font-weight: 700;
        }

        /* Badges & Tags */
        .it-dash-tag {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          border: 1px solid transparent;
          gap: 5px;
          white-space: nowrap;
        }
        .it-dash-tag::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .it-dash-tag.green { background: #edf8f3; color: #16845b; border-color: #c7e9d9; }
        .it-dash-tag.red { background: #fff0f1; color: #c53d4c; border-color: #f0c8cd; }
        .it-dash-tag.amber { background: #fff7e8; color: #c98512; border-color: #f3dfb0; }
        .it-dash-tag.blue { background: #edf4ff; color: #2f6fed; border-color: #d8e6ff; }
        .it-dash-tag.gray { background: #f2f4f7; color: #5f6c77; border-color: #e1e5ea; }

        /* Tables */
        .it-dash-table-wrap {
          border: 1px solid var(--line);
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
        }
        .it-dash-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .it-dash-table th {
          background: #f7f9fb;
          color: #657386;
          font-size: 9.5px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 9px 12px;
          border-bottom: 1px solid var(--line);
          text-align: left;
        }
        .it-dash-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #edf1f5;
          color: #354451;
        }
        .it-dash-table tbody tr {
          transition: background 0.15s;
        }
        .it-dash-table tbody tr:hover td {
          background: #fbfcfd;
        }
        .it-dash-table tbody tr td:first-child {
          border-left: 3px solid transparent;
        }
        .it-dash-table tbody tr:hover td:first-child {
          border-left-color: var(--primary);
        }

        /* Modules Grid */
        .it-dash-modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .it-dash-module-card {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 16px 18px;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid var(--line);
          text-decoration: none;
          box-shadow: 0 1px 3px rgba(16, 35, 55, 0.04);
          transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          cursor: pointer;
        }
        .it-dash-module-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--sh2);
          border-color: #cbd5e1;
        }
        .it-dash-module-card:hover .it-module-arrow {
          transform: translateX(3px);
          color: var(--primary);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Topbar (Breadcrumb, Branch Filter & Top Quick Actions) ── */}
      <header className="it-dash-topbar">
        <div className="it-dash-top-left">
          <button
            className="it-dash-back-btn"
            onClick={() => {
              sessionStorage.removeItem("it_helpdesk_expiry_modal_shown");
              navigate("/");
            }}
            title="Return to System Portal"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="it-dash-crumb">
            IT Helpdesk / <span>Operations Dashboard</span>
          </div>
        </div>

        <div className="it-dash-top-actions">
          <select
            className="it-dash-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            aria-label="Filter by branch"
          >
            {BRANCH_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="it-dash-btn"
            onClick={fetchData}
            disabled={loading}
            title="Refresh dashboard metrics"
          >
            <RefreshCw
              size={13}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="it-dash-btn primary"
            onClick={handleOpenTicketModal}
            title="Raise a new support ticket"
          >
            <Plus size={14} />
            <span>Raise Ticket</span>
          </button>
        </div>
      </header>

      {/* ── Page Header & Quick Navigation Actions ── */}
      <div className="it-dash-pagehead">
        <div>
          <h1>IT Operations Dashboard</h1>
          <p>
            Assets, support tickets, procurement workflow, licenses, contracts and enterprise infrastructure in one place.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="it-dash-btn"
            onClick={() => navigate("/it-helpdesk/unified-assets")}
          >
            <Plus size={13} color="#e96b2c" />
            <span>New Asset</span>
          </button>
          <button
            type="button"
            className="it-dash-btn"
            onClick={() => navigate("/it-helpdesk/procurement")}
          >
            <Plus size={13} color="#e96b2c" />
            <span>Purchase Request</span>
          </button>
        </div>
      </div>

      {/* ── Optional Error Banner ── */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#fffaf6",
            border: "1px solid #fed7aa",
            borderRadius: "8px",
            padding: "10px 16px",
            marginBottom: "18px",
            color: "#9a3412",
            fontSize: "12.5px",
          }}
        >
          <AlertTriangle size={16} color="#ea580c" />
          <span style={{ flex: 1 }}>{error}</span>
        </div>
      )}

      {/* ── Top 5 Stats Grid (Matching Suraj Reference HTML) ── */}
      <div className="it-dash-stats-grid">
        <div className="it-dash-stat navy" onClick={() => navigate("/it-helpdesk/unified-assets")} style={{ cursor: "pointer" }}>
          <small>Total IT Assets</small>
          <div className="n">{stats.total}</div>
          <div className="trend">Old + new equipment inventory</div>
        </div>

        <div className="it-dash-stat blue" onClick={() => navigate("/it-helpdesk/tickets")} style={{ cursor: "pointer" }}>
          <small>Open Tickets</small>
          <div className="n" style={{ color: "#2f6fed" }}>{stats.ticketOpen}</div>
          <div className="trend">{stats.ticketNew || 0} new · {stats.ticketInProgress || 0} in progress</div>
        </div>

        <div className="it-dash-stat amber" onClick={() => navigate("/it-helpdesk/notifications")} style={{ cursor: "pointer" }}>
          <small>Warranty / AMC Due</small>
          <div className="n" style={{ color: "#c98512" }}>6</div>
          <div className="trend" style={{ color: "#c98512", fontWeight: 600 }}>2 due within 30 days</div>
        </div>

        <div className="it-dash-stat red" onClick={() => navigate("/it-helpdesk/licenses")} style={{ cursor: "pointer" }}>
          <small>License / Domain Due</small>
          <div className="n" style={{ color: "#c53d4c" }}>{expiringLicenses.length || 4}</div>
          <div className="trend" style={{ color: "#c53d4c", fontWeight: 600 }}>
            {expiringLicenses.filter((l) => l.diffDays < 0).length || 1} critical renewal
          </div>
        </div>

        <div className="it-dash-stat orange" onClick={() => navigate("/it-helpdesk/procurement")} style={{ cursor: "pointer" }}>
          <small>Purchase Requests</small>
          <div className="n" style={{ color: "#e96b2c" }}>{procurementStats.total || 5}</div>
          <div className="trend">
            <span style={{ color: "#7c3aed", fontWeight: 700 }}>{procurementStats.hodPending || 0} HOD</span>
            {" • "}
            <span style={{ color: "#059669", fontWeight: 700 }}>{procurementStats.gmPending || 0} GM</span>
            {" awaiting quote review"}
          </div>
        </div>
      </div>

      {/* ── Role Approvals Banner (Stage 4 HOD / Stage 5 GM) ── */}
      {isHODUser && (
        <div
          style={{
            background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
            border: "1.5px solid #d8b4fe",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#ede9fe", color: "#7c3aed", padding: "8px", borderRadius: "8px", display: "flex" }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 750, color: "#581c87", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Stage 4: HOD / Admin Quotation Approval Queue</span>
                <span style={{ background: "#7c3aed", color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                  {procurementStats.hodPending || 0} Pending Sign-Off
                </span>
              </div>
              <div style={{ color: "#7e22ce", fontSize: "12px", marginTop: "2px" }}>
                IT Technical evaluation is complete. Review vendor quotations, warranty terms &amp; prices to provide HOD sign-off.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/it-helpdesk/procurement?stage=4")}
            style={{
              background: "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "7px 14px",
              fontWeight: 650,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Review &amp; Approve Quotations (Stage 4) →
          </button>
        </div>
      )}

      {isGMUser && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1.5px solid #86efac",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: "#dcfce7", color: "#059669", padding: "8px", borderRadius: "8px", display: "flex" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 750, color: "#065f46", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Stage 5: General Manager Quotation Approval Queue</span>
                <span style={{ background: "#059669", color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                  {procurementStats.gmPending || 0} Pending Selection
                </span>
              </div>
              <div style={{ color: "#047857", fontSize: "12px", marginTop: "2px" }}>
                HOD sign-off completed. Compare vendor quotation matrix side-by-side, choose winning vendor &amp; grant final approval.
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/it-helpdesk/procurement?stage=5")}
            style={{
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "7px 14px",
              fontWeight: 650,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Select Winner Quote &amp; Approve (Stage 5) →
          </button>
        </div>
      )}

      {/* ── Row 1: Asset & Procurement Lifecycle + Upcoming Critical Items ── */}
      <div className="it-dash-cards2">
        {/* Card 1: Asset & Procurement Lifecycle Pipeline */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Asset &amp; Procurement Lifecycle</h3>
            <Link
              to="/it-helpdesk/procurement"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#e96b2c",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              Open Workflow <ArrowRight size={12} />
            </Link>
          </div>

          <div className="it-dash-pipeline" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            <Link to="/it-helpdesk/procurement" className="it-dash-stage" title="Click to view requests">
              <b>{procurementStats.quotationPending || 5}</b>
              <span>Request</span>
            </Link>
            <Link to="/it-helpdesk/procurement" className="it-dash-stage" title="Click to view quotations">
              <b>{procurementStats.quotationPending || 4}</b>
              <span>3 Quotes</span>
            </Link>
            <Link to="/it-helpdesk/procurement" className="it-dash-stage" title="Click to view IT reviews">
              <b>{procurementStats.itReview || 2}</b>
              <span>IT Eval</span>
            </Link>
            <Link to="/it-helpdesk/procurement?stage=4" className="it-dash-stage" title="Stage 4: HOD / Admin Quotation Approvals" style={{ borderColor: "#d8b4fe", background: "#faf5ff" }}>
              <b style={{ color: "#7c3aed" }}>{procurementStats.hodPending || 0}</b>
              <span style={{ color: "#6b21a8", fontWeight: 700 }}>Stage 4: HOD</span>
            </Link>
            <Link to="/it-helpdesk/procurement?stage=5" className="it-dash-stage" title="Stage 5: General Manager Quotation Approval" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
              <b style={{ color: "#059669" }}>{procurementStats.gmPending || 0}</b>
              <span style={{ color: "#047857", fontWeight: 700 }}>Stage 5: GM</span>
            </Link>
            <Link to="/it-helpdesk/procurement" className="it-dash-stage" title="Click to view accounts status">
              <b>{(procurementStats.invoiceVerification || 0) + (procurementStats.paymentPending || 0) || 1}</b>
              <span>Accounts</span>
            </Link>
            <Link to="/it-helpdesk/procurement" className="it-dash-stage" title="Click to view received goods">
              <b>{procurementStats.goodsReceived || 8}</b>
              <span>Received</span>
            </Link>
          </div>

          <div className="it-dash-alertbox">
            <b>Recommended workflow:</b> Purchase Request → 3 Vendor Quotations → IT Technical Verification →
            <b>Stage 4: HOD Sign-Off</b> → <b>Stage 5: GM Winner Quote Selection</b> → Accounts PO &amp; Verification → Goods Received (GRN) → Asset Tag
            Registration → User Handover → Warranty Tracking.
          </div>
        </div>

        {/* Card 2: Upcoming Critical Items */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Upcoming Critical Items</h3>
            <span className="it-dash-tag red">Action Needed</span>
          </div>

          <div style={{ flex: 1 }}>
            {expiringLicenses.length > 0 ? (
              expiringLicenses.slice(0, 3).map((lic, idx) => (
                <div key={lic._id || idx} className="it-dash-event">
                  <div
                    className="it-dash-dot"
                    style={{
                      background: lic.diffDays < 0 ? "#c53d4c" : lic.diffDays <= 7 ? "#c98512" : "#2f6fed",
                    }}
                  />
                  <div className="it-dash-event-content">
                    <b>{lic.license_name || lic.software_name || "Software License"}</b>
                    <small>
                      {lic.diffDays < 0
                        ? `Expired ${Math.abs(lic.diffDays)} days ago · Critical Renewal`
                        : `Expires in ${lic.diffDays} days (${lic.formattedExpiry})`}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="it-dash-event">
                  <div className="it-dash-dot" style={{ background: "var(--red)" }} />
                  <div className="it-dash-event-content">
                    <b>SSL Certificate — alvision.in</b>
                    <small>Expires in 14 days · Critical Renewal</small>
                  </div>
                </div>
                <div className="it-dash-event">
                  <div className="it-dash-dot" style={{ background: "var(--amber)" }} />
                  <div className="it-dash-event-content">
                    <b>Fortinet FortiGate 80F AMC</b>
                    <small>Expires in 27 days · Maintenance renewal required</small>
                  </div>
                </div>
                <div className="it-dash-event">
                  <div className="it-dash-dot" style={{ background: "var(--blue)" }} />
                  <div className="it-dash-event-content">
                    <b>Microsoft 365 Subscription</b>
                    <small>Review billing &amp; seat allocation in 45 days</small>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--line2)" }}>
            <button
              type="button"
              className="it-dash-btn"
              onClick={() => navigate("/it-helpdesk/licenses")}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <span>View all expiry items</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 2: Ticket SLA, Asset Distribution & Security / Monitoring ── */}
      <div className="it-dash-cards3">
        {/* Card 1: Ticket SLA & Resolution Time */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Ticket SLA Performance</h3>
            <span className="it-dash-tag green">Target Met</span>
          </div>
          <div className="it-dash-kpis">
            <div className="it-dash-kpi">
              <b>92%</b>
              <span>Within SLA</span>
            </div>
            <div className="it-dash-kpi">
              <b>2.4h</b>
              <span>Avg Response</span>
            </div>
          </div>
          <div className="it-dash-progress">
            <i style={{ width: "92%" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "11px", color: "#64748b" }}>
            <span>Resolved: {stats.ticketClosed || 0}</span>
            <span>In Progress: {stats.ticketInProgress || 0}</span>
            <span>New: {stats.ticketNew || 0}</span>
          </div>
        </div>

        {/* Card 2: Asset Distribution */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Asset Distribution</h3>
            <Link
              to="/it-helpdesk/unified-assets"
              style={{ fontSize: "11px", color: "#e96b2c", fontWeight: 600, textDecoration: "none" }}
            >
              Details
            </Link>
          </div>
          <div className="it-dash-kpis">
            <div className="it-dash-kpi">
              <b>51</b>
              <span>Computers</span>
            </div>
            <div className="it-dash-kpi">
              <b>15</b>
              <span>Network</span>
            </div>
            <div className="it-dash-kpi">
              <b>20</b>
              <span>Peripherals</span>
            </div>
          </div>
          <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span className="it-dash-tag blue">Available: {stats.available}</span>
            <span className="it-dash-tag green">Assigned: {stats.assigned}</span>
            <span className="it-dash-tag amber">Repair: {stats.inRepair}</span>
          </div>
        </div>

        {/* Card 3: Security & Monitoring */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Security &amp; Infrastructure</h3>
            <span className="it-dash-tag green">Healthy</span>
          </div>
          <div className="it-dash-kpis">
            <div className="it-dash-kpi">
              <b>80</b>
              <span>Endpoints</span>
            </div>
            <div className="it-dash-kpi">
              <b>1</b>
              <span>Server</span>
            </div>
            <div className="it-dash-kpi">
              <b>3</b>
              <span>ISPs</span>
            </div>
          </div>
          <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Antivirus &amp; Firewall Status</div>
            <span className="it-dash-tag green">Active &amp; Updated</span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Asset Condition Overview & Inventory Allocation by Branch ── */}
      <div className="it-dash-cards2">
        {/* Card 1: Asset Condition Overview */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Asset Condition Overview</h3>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
              {stats.total} Total Units
            </span>
          </div>
          <p className="sub">
            Condition assessment of company IT equipment across corporate offices and logistics branches.
          </p>

          <div className="it-dash-analytics-bars">
            <div>
              <span>Good / Working Condition</span>
              <b>{goodPct}%</b>
              <i><em style={{ width: `${goodPct}%`, background: "#16845b" }} /></i>
            </div>
            <div>
              <span>Fair / Operational — Needs Review</span>
              <b>{fairPct}%</b>
              <i><em style={{ width: `${fairPct}%`, background: "#2f6fed" }} /></i>
            </div>
            <div>
              <span>Under Repair / Service Depot</span>
              <b>{repairPct}%</b>
              <i><em style={{ width: `${repairPct}%`, background: "#c98512" }} /></i>
            </div>
            <div>
              <span>Damaged / Obsolete / Standby</span>
              <b>{damagedPct}%</b>
              <i><em style={{ width: `${damagedPct}%`, background: "#c53d4c" }} /></i>
            </div>
          </div>
        </div>

        {/* Card 2: Inventory by Branch */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Inventory by Branch</h3>
            <select
              className="it-dash-select"
              style={{ fontSize: "11px", padding: "4px 8px" }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {BRANCH_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <p className="sub">
            Branch-wise distribution for equipment allocation, site capacity and maintenance planning.
          </p>

          <div className="it-dash-branch-chart">
            <div>
              <span>Head Office</span>
              <i><em style={{ width: "82%" }} /></i>
              <b>32</b>
            </div>
            <div>
              <span>Ahmedabad</span>
              <i><em style={{ width: "64%" }} /></i>
              <b>25</b>
            </div>
            <div>
              <span>Khadoyar RABS</span>
              <i><em style={{ width: "36%" }} /></i>
              <b>14</b>
            </div>
            <div>
              <span>SRCC Khodiyar</span>
              <i><em style={{ width: "24%" }} /></i>
              <b>9</b>
            </div>
            <div>
              <span>SRCC Maintenance</span>
              <i><em style={{ width: "16%" }} /></i>
              <b>6</b>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Recent Assets & Recent Support Tickets Tables ── */}
      <div className="it-dash-cards2" style={{ marginBottom: "28px" }}>
        {/* Recent Assets */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Recent Hardware Assets</h3>
            <Link
              to="/it-helpdesk/unified-assets"
              style={{ fontSize: "11px", fontWeight: 600, color: "#e96b2c", textDecoration: "none" }}
            >
              View All →
            </Link>
          </div>

          <div className="it-dash-table-wrap">
            <table className="it-dash-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Category / Model</th>
                  <th>Branch / Location</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                      No assets found for the selected branch.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((a, idx) => {
                    const statusStr = String(a.status || "Available");
                    let tagClass = "blue";
                    if (statusStr.includes("Assigned") || statusStr.includes("Active")) tagClass = "green";
                    else if (statusStr.includes("Repair")) tagClass = "amber";
                    else if (statusStr.includes("Retired") || statusStr.includes("Lost")) tagClass = "red";

                    return (
                      <tr key={a._id || idx}>
                        <td>
                          <Link
                            to="/it-helpdesk/unified-assets"
                            style={{ color: "#17263a", fontWeight: 700, textDecoration: "none" }}
                          >
                            {a.asset_tag}
                          </Link>
                        </td>
                        <td>
                          <div>{a.brand || a.asset_type || "Equipment"}</div>
                          {a.brand && a.asset_type && (
                            <div style={{ fontSize: "10px", color: "#64748b" }}>{a.asset_type}</div>
                          )}
                        </td>
                        <td style={{ color: "#475569" }}>
                          {a.branch || a.location || "Head Office"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`it-dash-tag ${tagClass}`}>{statusStr}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="it-dash-card">
          <div className="it-dash-card-header">
            <h3>Recent Support Tickets</h3>
            <Link
              to="/it-helpdesk/tickets"
              style={{ fontSize: "11px", fontWeight: 600, color: "#e96b2c", textDecoration: "none" }}
            >
              View Queue →
            </Link>
          </div>

          <div className="it-dash-table-wrap">
            <table className="it-dash-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Requester / Category</th>
                  <th style={{ textAlign: "center" }}>Priority</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                      No tickets recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((t, idx) => {
                    const prio = String(t.priority || "Medium");
                    let prioTag = "blue";
                    if (prio === "High" || prio === "Urgent") prioTag = "red";
                    else if (prio === "Medium") prioTag = "amber";

                    const statusStr = String(t.status || "New");
                    let statusTag = "red";
                    if (statusStr === "In Progress") statusTag = "blue";
                    else if (statusStr === "Closed" || statusStr === "Resolved") statusTag = "green";
                    else if (statusStr === "Pending") statusTag = "amber";

                    return (
                      <tr key={t._id || idx}>
                        <td>
                          <Link
                            to="/it-helpdesk/tickets"
                            style={{ color: "#17263a", fontWeight: 700, textDecoration: "none" }}
                          >
                            {t.ticket_id}
                          </Link>
                        </td>
                        <td>
                          <div>{t.requester_name || "Employee"}</div>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>{t.category || "General"}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`it-dash-tag ${prioTag}`}>{prio}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`it-dash-tag ${statusTag}`}>{statusStr}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Row 5: Quick Navigation — IT Helpdesk Modules & Tools ── */}
      <div style={{ marginBottom: "14px" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 750, color: "#142238" }}>
          IT Operations Modules &amp; Management Hub
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
          Full access to asset management, procurement approvals, helpdesk queues, software licensing, vendor agreements and system logs.
        </p>
      </div>

      <div className="it-dash-modules-grid">
        {MODULES.map((mod) => {
          const IconComponent = mod.icon;
          return (
            <Link
              key={mod.title}
              to={mod.to}
              className="it-dash-module-card"
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "9px",
                  background: mod.bgColor,
                  color: mod.color,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <IconComponent size={20} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#172235",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{mod.title}</span>
                    {mod.badge && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 800,
                          padding: "1px 5px",
                          borderRadius: "4px",
                          background: "#e96b2c",
                          color: "#ffffff",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  <ArrowRight size={13} className="it-module-arrow" style={{ color: "#94a3b8", transition: "transform 0.2s" }} />
                </div>

                <div
                  style={{
                    fontSize: "11.5px",
                    color: "#64748b",
                    marginTop: "3px",
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

      {/* ── Raise Support Ticket Modal (Enterprise Styled) ── */}
      {showTicketModal && (
        <div
          onClick={() => !savingTicket && setShowTicketModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(12, 24, 38, 0.55)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1400,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #d9e0e8",
              boxShadow: "0 20px 50px rgba(12, 24, 38, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                background: "#172c43",
                borderBottom: "3px solid #e96b2c",
                color: "#ffffff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>🎫</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#ffffff" }}>
                    Raise IT Support Ticket
                  </h3>
                  <div style={{ fontSize: "11px", color: "#9aacc1", marginTop: "2px" }}>
                    Hardware, software, network &amp; access assistance
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !savingTicket && setShowTicketModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  width: "28px",
                  height: "28px",
                  display: "grid",
                  placeItems: "center",
                  color: "#d7e1ec",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1, backgroundColor: "#ffffff" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* Issue Description */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    Issue Description *
                  </label>
                  <textarea
                    placeholder="Describe symptoms, error messages, machine details, or assistance required..."
                    rows={3}
                    value={ticketForm.description}
                    onChange={(e) =>
                      setTicketForm((f) => ({ ...f, description: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      borderRadius: "7px",
                      border: "1px solid #d4dce6",
                      padding: "9px 10px",
                      fontSize: "12px",
                      minHeight: "75px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Category */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    Category *
                  </label>
                  <CustomSelect
                    value={ticketForm.category}
                    onChange={(val) => setTicketForm((f) => ({ ...f, category: val }))}
                    options={TICKET_CATEGORIES.map((c) => ({ label: c, value: c }))}
                    placeholder="Select Category"
                    width="100%"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    Priority
                  </label>
                  <CustomSelect
                    value={ticketForm.priority}
                    onChange={(val) => setTicketForm((f) => ({ ...f, priority: val }))}
                    options={[
                      { label: "Not specified", value: "" },
                      ...TICKET_PRIORITIES.map((p) => ({ label: p, value: p })),
                    ]}
                    placeholder="Not specified"
                    width="100%"
                  />
                </div>

                {/* Assigned To */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    Assigned To
                  </label>
                  {isAdmin ? (
                    <CustomSelect
                      value={ticketForm.assigned_to || ""}
                      onChange={(val) => setTicketForm((f) => ({ ...f, assigned_to: val }))}
                      options={[
                        { label: "Select User", value: "" },
                        ...(users && users.length > 0
                          ? users.map((u) => ({
                              label: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name || u.username || u.email,
                              value: u._id,
                            }))
                          : []),
                      ]}
                      placeholder="Select User"
                      width="100%"
                    />
                  ) : (
                    <div
                      style={{
                        height: "36px",
                        padding: "0 10px",
                        borderRadius: "7px",
                        border: "1px solid #d4dce6",
                        background: "#f8fafc",
                        color: "#64748b",
                        fontSize: "12px",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {(() => {
                        const u = users?.find((user) => String(user._id) === String(ticketForm.assigned_to));
                        if (u) return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name || u.username || u.email;
                        if (String(ticketForm.assigned_to).toLowerCase().includes("vikas")) return "Vikas Chandra (Default IT Assignee)";
                        return String(ticketForm.assigned_to || "Unassigned");
                      })()}
                    </div>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    Department *
                  </label>
                  <CustomSelect
                    value={ticketForm.department}
                    onChange={(val) => setTicketForm((f) => ({ ...f, department: val }))}
                    options={TICKET_DEPARTMENTS.map((dept) => ({ label: dept, value: dept }))}
                    placeholder="Select Department"
                    width="100%"
                  />
                </div>

                {/* SLA Due Date */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    SLA Due Date
                  </label>
                  <input
                    type="date"
                    disabled
                    value={
                      ticketForm.sla_due_date
                        ? ticketForm.sla_due_date.substring(0, 10)
                        : (() => {
                            const n = new Date();
                            return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
                          })()
                    }
                    style={{
                      width: "100%",
                      borderRadius: "7px",
                      border: "1px solid #d4dce6",
                      padding: "8px 10px",
                      fontSize: "12px",
                      background: "#f8fafc",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Status Indicator */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    Initial Status
                  </label>
                  <div
                    style={{
                      height: "36px",
                      padding: "0 10px",
                      borderRadius: "7px",
                      border: "1px solid #d4dce6",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <span className="it-dash-tag red">New</span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Auto assigned</span>
                  </div>
                </div>

                {/* Drag & Drop File Upload */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "#637286", textTransform: "uppercase", marginBottom: "5px", letterSpacing: "0.04em" }}>
                    Attachments (Optional)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />

                  <div
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      border: isDragging ? "2px dashed #e96b2c" : "1px dashed #cfd7de",
                      borderRadius: "8px",
                      padding: "16px",
                      textAlign: "center",
                      backgroundColor: isDragging ? "#fffaf6" : "#fbfcfd",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 28, color: isDragging ? "#e96b2c" : "#94a3b8", mb: 0.5 }} />
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                      Click to upload or drag &amp; drop screenshot / document
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      Supported: JPG, PNG, PDF (Max 10MB each)
                    </div>
                  </div>

                  {ticketForm.files && ticketForm.files.length > 0 && (
                    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {ticketForm.files.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                            <InsertDriveFileIcon color="primary" fontSize="small" />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: "#1e293b",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "320px",
                                }}
                              >
                                {file.name}
                              </div>
                              <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(idx);
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#c53d4c",
                              cursor: "pointer",
                              padding: "4px",
                            }}
                            title="Remove file"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "8px",
                padding: "12px 20px",
                borderTop: "1px solid var(--line)",
                backgroundColor: "#f8fafc",
              }}
            >
              <button
                type="button"
                className="it-dash-btn"
                onClick={() => setShowTicketModal(false)}
                disabled={savingTicket}
              >
                Cancel
              </button>
              <button
                type="button"
                className="it-dash-btn primary"
                onClick={handleSaveTicket}
                disabled={savingTicket}
              >
                {savingTicket ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <SendIcon fontSize="small" />
                )}
                <span>{savingTicket ? "Submitting..." : "Raise Ticket"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Software License Expiry Modal Notification ── */}
      <Dialog
        open={showExpiryModal}
        onClose={() => setShowExpiryModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "12px",
            border: "1px solid #d9e0e8",
            boxShadow: "0 25px 50px rgba(12, 24, 38, 0.25)",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            background: "#172c43",
            borderBottom: "3px solid #e96b2c",
            px: 2.5,
            py: 1.8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "linear-gradient(135deg, #e96b2c, #f49a52)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
              }}
            >
              <AlertTriangle size={18} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#ffffff", lineHeight: 1.2 }}>
                Software License &amp; Contract Expiry Alert
              </Typography>
              <Typography variant="caption" sx={{ color: "#9aacc1", fontSize: "11px" }}>
                {(() => {
                  const expiredCount = expiringLicenses.filter((l) => l.diffDays < 0).length;
                  const expiringCount = expiringLicenses.filter((l) => l.diffDays >= 0).length;
                  if (expiredCount > 0 && expiringCount > 0) {
                    return `${expiredCount} expired and ${expiringCount} expiring soon.`;
                  }
                  if (expiredCount > 0) {
                    return `${expiredCount} license${expiredCount > 1 ? "s have" : " has"} expired.`;
                  }
                  return `${expiringCount} software license${expiringCount > 1 ? "s require" : " requires"} renewal attention.`;
                })()}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setShowExpiryModal(false)}
            sx={{ color: "#d7e1ec", "&:hover": { bgcolor: "rgba(255,255,255,0.1)" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 2.5, bgcolor: "#ffffff" }}>
          <div className="it-dash-alertbox" style={{ marginBottom: "16px" }}>
            <b>Action Required:</b> The following subscriptions and software licenses are approaching their renewal date or have already expired. Initiate procurement/renewal verification to prevent service interruption.
          </div>

          <div className="it-dash-table-wrap">
            <table className="it-dash-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>License Name</th>
                  <th>License Code</th>
                  <th>Assigned / Vendor</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {expiringLicenses.map((lic, index) => {
                  const isExpired = lic.diffDays < 0;
                  let badgeTag = "amber";
                  let badgeText = `Expires in ${lic.diffDays} days`;

                  if (isExpired) {
                    badgeTag = "red";
                    badgeText = lic.diffDays === -1 ? "Expired Yesterday" : `Expired (${Math.abs(lic.diffDays)}d ago)`;
                  } else if (lic.diffDays === 0) {
                    badgeTag = "red";
                    badgeText = "Expires Today";
                  }

                  return (
                    <tr key={lic._id || index}>
                      <td style={{ color: "#64748b" }}>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: 650, color: "#172235" }}>
                          {lic.license_name || "License Item"}
                        </div>
                        {lic.software_name && (
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{lic.software_name}</div>
                        )}
                      </td>
                      <td>
                        <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#334155" }}>
                          {lic.license_code || "—"}
                        </code>
                      </td>
                      <td style={{ color: "#475569" }}>
                        <div>{lic.assigned_to || "Unassigned"}</div>
                        {lic.vendor && (
                          <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                            {typeof lic.vendor === "object" ? lic.vendor.name : lic.vendor}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 500, color: "#334155" }}>
                        {lic.formattedExpiry}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`it-dash-tag ${badgeTag}`}>{badgeText}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #dfe5ec", bgcolor: "#f8fafc" }}>
          <Button
            onClick={() => setShowExpiryModal(false)}
            variant="outlined"
            sx={{
              borderRadius: "7px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "12px",
              borderColor: "#cbd5e1",
              color: "#475569",
            }}
          >
            Remind Later
          </Button>
          <Button
            onClick={() => {
              setShowExpiryModal(false);
              navigate("/it-helpdesk/licenses");
            }}
            variant="contained"
            endIcon={<ArrowRight size={14} />}
            sx={{
              borderRadius: "7px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "12px",
              background: "linear-gradient(135deg, #e96b2c, #f49a52)",
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(233, 107, 44, 0.3)",
              "&:hover": { filter: "brightness(1.05)" },
            }}
          >
            Manage in License Register
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

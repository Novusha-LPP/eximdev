import React, { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  X,
  FileText,
  History,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Layers,
  ShieldCheck,
  Send,
  UploadCloud,
  ExternalLink,
  Copy,
  Check,
  Tag,
  Calendar,
  ArrowRight,
  MessageSquare,
  FileSpreadsheet,
  FileImage,
  FileCode,
  FileQuestion,
  UserCheck,
  CheckSquare,
  Lock,
  Edit3,
  Save,
  Eye,
  Trash2,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AttachmentImageViewer, { isImageAttachment } from "./AttachmentImageViewer";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_SUB_CATEGORIES = [
  "Desktop", "Laptop", "Printer", "Phone", "SIM",
  "Routing", "Switch", "Firewall", "Wi-Fi", "LAN", "WAN", "VPN",
  "Email", "Access Card", "Software Install", "License", "Other",
];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_TYPES = ["Incident", "Service Request", "Problem", "Change Request", "Maintenance", "Other"];

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatUser = (userVal) => {
  if (!userVal) return "—";
  if (typeof userVal === "object") {
    return userVal.username || userVal.first_name || userVal.name || userVal.email || "—";
  }
  return String(userVal);
};

const getUserInitials = (name) => {
  const str = formatUser(name);
  if (!str || str === "—") return "U";
  const parts = str.trim().split(/[\s_.]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
};

const getUserAvatarTheme = (name) => {
  const palettes = [
    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
    { bg: "#faf5ff", text: "#6d28d9", border: "#e9d5ff" },
    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
    { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  ];
  let hash = 0;
  const str = formatUser(name);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
};

const getStatusMeta = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "closed" || s === "resolved") {
    return {
      label: status || "Closed",
      bg: "#ecfdf5",
      text: "#047857",
      border: "#a7f3d0",
      dot: "#10b981",
      icon: CheckCircle2,
    };
  }
  if (s === "in progress" || s === "in-progress") {
    return {
      label: "In Progress",
      bg: "#fff7ed",
      text: "#c2410c",
      border: "#fed7aa",
      dot: "#f97316",
      icon: Clock,
    };
  }
  if (s === "assigned") {
    return {
      label: "Assigned",
      bg: "#eff6ff",
      text: "#1d4ed8",
      border: "#bfdbfe",
      dot: "#3b82f6",
      icon: UserCheck,
    };
  }
  if (s === "pending") {
    return {
      label: "Pending",
      bg: "#fefce8",
      text: "#a16207",
      border: "#fef08a",
      dot: "#eab308",
      icon: Clock,
    };
  }
  if (s === "new" || s === "open") {
    return {
      label: status || "New",
      bg: "#fef2f2",
      text: "#b91c1c",
      border: "#fecaca",
      dot: "#ef4444",
      icon: AlertCircle,
    };
  }
  return {
    label: status || "—",
    bg: "#f8fafc",
    text: "#475569",
    border: "#cbd5e1",
    dot: "#64748b",
    icon: AlertCircle,
  };
};

const getPriorityMeta = (priority) => {
  const p = String(priority || "").toLowerCase();
  if (p === "critical") {
    return { label: "Critical", bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
  }
  if (p === "high") {
    return { label: "High", bg: "#fff1f2", text: "#be123c", border: "#fecdd3" };
  }
  if (p === "medium") {
    return { label: "Medium", bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
  }
  return { label: priority || "Low", bg: "#f8fafc", text: "#475569", border: "#e2e8f0" };
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);
  return (
    date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (fileName = "") => {
  const ext = fileName.split(".").pop().toLowerCase();
  if (["pdf"].includes(ext)) return <FileText size={18} color="#dc2626" />;
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return <FileImage size={18} color="#2563eb" />;
  if (["xls", "xlsx", "csv"].includes(ext)) return <FileSpreadsheet size={18} color="#16a34a" />;
  if (["doc", "docx", "txt"].includes(ext)) return <FileText size={18} color="#0284c7" />;
  if (["zip", "rar", "tar"].includes(ext)) return <FileCode size={18} color="#d97706" />;
  return <FileQuestion size={18} color="#64748b" />;
};

// ── Component ────────────────────────────────────────────────────────────────
export default function TicketDetailDrawer({
  open,
  onClose,
  ticketId,
  onUpdate,
  users = [],
  isAdmin = false,
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "Hardware",
    subcategory: "",
    type: "Incident",
    priority: "Medium",
    severity: "Medium",
    department: "",
    location: "",
  });

  // Image Viewer Modal state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  const [comment, setComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [statusData, setStatusData] = useState({ status: "", remarks: "" });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [assignData, setAssignData] = useState({ assigned_to: "", remarks: "" });
  const [assigning, setAssigning] = useState(false);

  const fetchTicketDetails = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res = await itHelpdeskAPI.tickets.getById(ticketId);
      setTicket(res.data);
      setStatusData({ status: res.data.status || "", remarks: "" });
      setAssignData({
        assigned_to: res.data.assigned_to?._id || (typeof res.data.assigned_to === "string" ? res.data.assigned_to : ""),
        remarks: "",
      });
    } catch (err) {
      toast.error("Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (open && ticketId) {
      fetchTicketDetails();
      setTabIndex(0);
      setIsEditing(false);
    } else {
      setTicket(null);
      setIsEditing(false);
    }
  }, [open, ticketId, fetchTicketDetails]);

  const handleStartEdit = () => {
    if (ticket?.status === "Closed") {
      toast.error("This ticket is closed and cannot be edited.");
      return;
    }
    setEditForm({
      title: ticket?.title || "",
      description: ticket?.description || "",
      category: ticket?.category || "Hardware",
      subcategory: ticket?.subcategory || "",
      type: ticket?.type || "Incident",
      priority: ticket?.priority || "Medium",
      severity: ticket?.severity || "Medium",
      department: ticket?.department || "",
      location: ticket?.location || "",
    });
    setIsEditing(true);
    setTabIndex(0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) {
      toast.error("Please provide a ticket title");
      return;
    }
    if (!editForm.description.trim()) {
      toast.error("Please provide an issue description");
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        subcategory: editForm.subcategory,
        type: editForm.type,
        priority: editForm.priority,
        severity: editForm.severity,
        department: editForm.department.trim(),
        location: editForm.location.trim(),
      };
      await itHelpdeskAPI.tickets.update(ticketId, payload);
      toast.success("Ticket details updated successfully");
      setIsEditing(false);
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      let friendlyMsg = "Failed to update ticket. Please try again.";
      if (serverMsg === "Closed tickets cannot be updated") {
        friendlyMsg = "This ticket is closed and cannot be updated.";
      } else if (serverMsg) {
        friendlyMsg = serverMsg;
      }
      toast.error(friendlyMsg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyId = () => {
    if (!ticket?.ticket_id) return;
    navigator.clipboard.writeText(ticket.ticket_id);
    setCopiedId(true);
    toast.success("Ticket ID copied");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyDesc = () => {
    if (!ticket?.description) return;
    navigator.clipboard.writeText(ticket.description);
    setCopiedDesc(true);
    toast.success("Description copied");
    setTimeout(() => setCopiedDesc(false), 2000);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    if (ticket?.status === "Closed") {
      toast.error("This ticket is closed. New comments cannot be added.");
      return;
    }
    setAddingComment(true);
    try {
      await itHelpdeskAPI.tickets.addHistory(ticketId, {
        remarks: comment.trim(),
        action: "Comment",
      });
      setComment("");
      toast.success("Comment added successfully");
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      let friendlyMsg = "Unable to add comment. Please try again.";
      if (serverMsg === "Closed tickets cannot be commented on") {
        friendlyMsg = "This ticket is closed. New comments cannot be added.";
      } else if (serverMsg === "Unauthorized to comment on this ticket") {
        friendlyMsg = "You do not have permission to comment on this ticket.";
      } else if (serverMsg) {
        friendlyMsg = serverMsg;
      }
      toast.error(friendlyMsg);
    } finally {
      setAddingComment(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusData.status) return;
    if (!isAdmin) {
      toast.error("Only Admins are authorized to update ticket status");
      return;
    }
    if (ticket?.status === "Closed") {
      toast.error("Closed tickets cannot be modified");
      return;
    }
    setUpdatingStatus(true);
    try {
      await itHelpdeskAPI.tickets.update(ticketId, {
        status: statusData.status,
        resolution_notes: statusData.remarks,
      });
      toast.success(`Status updated to ${statusData.status}`);
      setStatusData((prev) => ({ ...prev, remarks: "" }));
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssign = async () => {
    if (!assignData.assigned_to) {
      toast.error("Please select a technician to assign");
      return;
    }
    if (ticket?.status === "Closed") {
      toast.error("This ticket is closed and cannot be reassigned.");
      return;
    }
    setAssigning(true);
    try {
      await itHelpdeskAPI.tickets.assign(ticketId, assignData);
      toast.success("Ticket assigned successfully");
      setAssignData((prev) => ({ ...prev, remarks: "" }));
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to assign ticket");
    } finally {
      setAssigning(false);
    }
  };

  const handleFileUpload = async () => {
    if (files.length === 0) return;
    if (ticket?.status === "Closed") {
      toast.error("This ticket is closed. Attachments cannot be uploaded.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      await itHelpdeskAPI.tickets.uploadAttachment(ticketId, formData);
      toast.success(`${files.length} file(s) uploaded successfully`);
      setFiles([]);
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      let friendlyMsg = "File upload failed. Please try again.";
      if (serverMsg === "Closed tickets cannot have attachments added") {
        friendlyMsg = "This ticket is closed. Attachments cannot be added.";
      } else if (serverMsg) {
        friendlyMsg = serverMsg;
      }
      toast.error(friendlyMsg);
    } finally {
      setUploading(false);
    }
  };

  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const [replacingAttachmentId, setReplacingAttachmentId] = useState(null);

  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (ticket?.status === "Closed") {
      toast.error("This ticket is closed. Attachments cannot be deleted.");
      return;
    }
    if (!window.confirm(`Are you sure you want to remove "${fileName}"?`)) return;

    setDeletingAttachmentId(attachmentId);
    try {
      await itHelpdeskAPI.tickets.deleteAttachment(ticketId, attachmentId);
      toast.success(`"${fileName}" removed successfully`);
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete attachment");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleReplaceAttachment = async (attachmentId, selectedFile) => {
    if (!selectedFile) return;
    if (ticket?.status === "Closed") {
      toast.error("This ticket is closed. Attachments cannot be replaced.");
      return;
    }

    setReplacingAttachmentId(attachmentId);
    const formData = new FormData();
    formData.append("files", selectedFile);

    try {
      await itHelpdeskAPI.tickets.replaceAttachment(ticketId, attachmentId, formData);
      toast.success(`Attachment replaced with "${selectedFile.name}"`);
      await fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to replace attachment");
    } finally {
      setReplacingAttachmentId(null);
    }
  };

  if (!open) return null;

  const statusMeta = getStatusMeta(ticket?.status);
  const priorityMeta = getPriorityMeta(ticket?.priority);
  const StatusIcon = statusMeta.icon;

  const requesterName = ticket?.requester_name || formatUser(ticket?.raised_by);
  const assigneeName = formatUser(ticket?.assigned_to);
  const requesterAvatar = getUserAvatarTheme(requesterName);
  const assigneeAvatar = getUserAvatarTheme(assigneeName);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 540, md: 620 },
          bgcolor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 24px rgba(15, 23, 42, 0.12)",
        },
      }}
    >
      {/* ── Drawer Header ───────────────────────────────────────────── */}
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {/* Top Badges & Actions Row */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            {/* Ticket ID Badge with Copy */}
            {ticket && (
              <Box
                onClick={handleCopyId}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  bgcolor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  px: 1.2,
                  py: 0.4,
                  borderRadius: "7px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: "#3b82f6",
                    bgcolor: "#eff6ff",
                  },
                }}
                title="Click to copy Ticket ID"
              >
                <Tag size={13} color="#2563eb" />
                <Typography
                  sx={{
                    fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#1d4ed8",
                    letterSpacing: "0.2px",
                  }}
                >
                  {ticket.ticket_id}
                </Typography>
                {copiedId ? (
                  <Check size={13} color="#16a34a" />
                ) : (
                  <Copy size={12} color="#94a3b8" />
                )}
              </Box>
            )}

            {/* Status Badge */}
            {ticket && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 9px",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  background: statusMeta.bg,
                  color: statusMeta.text,
                  border: `1px solid ${statusMeta.border}`,
                  lineHeight: 1,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: statusMeta.dot,
                  }}
                />
                {statusMeta.label}
              </span>
            )}

            {/* Priority Badge */}
            {ticket && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 9px",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  background: priorityMeta.bg,
                  color: priorityMeta.text,
                  border: `1px solid ${priorityMeta.border}`,
                  lineHeight: 1,
                }}
              >
                {priorityMeta.label} Priority
              </span>
            )}
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {ticket && !isEditing && (
              <Tooltip title={ticket.status === "Closed" ? "Closed tickets cannot be edited" : "Edit Ticket Details"}>
                <span>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    disabled={ticket.status === "Closed"}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      background: ticket.status === "Closed" ? "#f1f5f9" : "#ffffff",
                      color: ticket.status === "Closed" ? "#94a3b8" : "#334155",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: ticket.status === "Closed" ? "not-allowed" : "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Edit3 size={13} color={ticket.status === "Closed" ? "#94a3b8" : "#2563eb"} />
                    <span>Edit</span>
                  </button>
                </span>
              </Tooltip>
            )}

            {isEditing && (
              <Box display="flex" alignItems="center" gap={1}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={savingEdit}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "7px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: savingEdit ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 14px",
                    borderRadius: "7px",
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: savingEdit ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
                  }}
                >
                  {savingEdit ? <CircularProgress size={13} color="inherit" /> : <Save size={13} />}
                  <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
                </button>
              </Box>
            )}

            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: "#64748b",
                bgcolor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                p: 0.8,
                "&:hover": { bgcolor: "#f8fafc", color: "#0f172a", borderColor: "#94a3b8" },
              }}
            >
              <X size={17} />
            </IconButton>
          </Box>
        </Box>

        {/* Title */}
        {isEditing ? (
          <Box mt={0.5}>
            <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", mb: 0.5 }}>
              Ticket Title <span style={{ color: "#ef4444" }}>*</span>
            </Typography>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Brief summary of the issue or request..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #3b82f6",
                background: "#ffffff",
                fontSize: "14px",
                fontWeight: 700,
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.15)",
              }}
            />
          </Box>
        ) : (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "#0f172a",
              fontSize: "1.125rem",
              lineHeight: 1.35,
              wordBreak: "break-word",
            }}
          >
            {loading && !ticket ? "Loading Ticket Details..." : ticket?.title || "Ticket Details"}
          </Typography>
        )}

        {/* Subtitle / Timing Row */}
        {ticket && (
          <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={0.6}>
              <Calendar size={13} color="#64748b" />
              <Typography sx={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                Created: {formatTimestamp(ticket.createdAt || ticket.date_time)}
              </Typography>
            </Box>

            {ticket.type && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "#475569",
                    bgcolor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    px: 0.9,
                    py: 0.2,
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                >
                  {ticket.type}
                </Typography>
              </Box>
            )}

            {ticket.sla_due_date && (
              <Box display="flex" alignItems="center" gap={0.6}>
                <Clock size={13} color="#d97706" />
                <Typography sx={{ fontSize: "12px", color: "#d97706", fontWeight: 600 }}>
                  SLA: {formatTimestamp(ticket.sla_due_date)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Modern Segmented Tabs ───────────────────────────────────── */}
      <Box sx={{ px: 3, pt: 2, pb: 1, bgcolor: "#ffffff" }}>
        <Box
          sx={{
            display: "flex",
            bgcolor: "#f1f5f9",
            p: 0.5,
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            gap: "4px",
          }}
        >
          {[
            { id: 0, label: "Details", icon: FileText },
            {
              id: 1,
              label: "History & Timeline",
              icon: History,
              count: ticket?.history?.length || 0,
            },
            {
              id: 2,
              label: "Attachments",
              icon: Paperclip,
              count: ticket?.attachments?.length || 0,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = tabIndex === tab.id;
            return (
              <Box
                key={tab.id}
                onClick={() => setTabIndex(tab.id)}
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  py: 1,
                  px: 1.5,
                  borderRadius: "7px",
                  cursor: "pointer",
                  bgcolor: isSelected ? "#ffffff" : "transparent",
                  color: isSelected ? "#0f172a" : "#64748b",
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: "13px",
                  boxShadow: isSelected ? "0 1px 3px rgba(0, 0, 0, 0.08)" : "none",
                  transition: "all 0.15s ease",
                  userSelect: "none",
                  "&:hover": {
                    color: "#0f172a",
                  },
                }}
              >
                <Icon size={15} color={isSelected ? "#2563eb" : "#64748b"} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "10px",
                      backgroundColor: isSelected ? "#eff6ff" : "#e2e8f0",
                      color: isSelected ? "#2563eb" : "#475569",
                      lineHeight: 1.3,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Content Area ────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
        {loading && !ticket ? (
          <Box py={8} display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={2}>
            <CircularProgress size={36} sx={{ color: "#2563eb" }} />
            <Typography sx={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
              Loading ticket details...
            </Typography>
          </Box>
        ) : ticket ? (
          <>
            {/* ── TAB 0: DETAILS ────────────────────────────────────────── */}
            {tabIndex === 0 && (
              isEditing ? (
                <Box display="flex" flexDirection="column" gap={2.5}>
                  {/* Edit Banner Notice */}
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: "10px",
                      bgcolor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "7px",
                          bgcolor: "#dbeafe",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Edit3 size={16} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#1e40af" }}>
                          Editing Ticket Details
                        </Typography>
                        <Typography sx={{ fontSize: "11.5px", color: "#3b82f6" }}>
                          Update the fields below. Click &quot;Save Changes&quot; to apply.
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={savingEdit}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#475569",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: savingEdit ? "not-allowed" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "5px 14px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#2563eb",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: savingEdit ? "not-allowed" : "pointer",
                          boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
                        }}
                      >
                        {savingEdit ? <CircularProgress size={13} color="inherit" /> : <Save size={13} />}
                        <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
                      </button>
                    </Box>
                  </Box>

                  {/* 2x2 Bento Form Grid */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                    {/* Category */}
                    <Box sx={{ p: 1.75, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Layers size={13} color="#2563eb" />
                        Category
                      </Typography>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#0f172a",
                          outline: "none",
                        }}
                      >
                        {TICKET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Box>

                    {/* Subcategory */}
                    <Box sx={{ p: 1.75, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Layers size={13} color="#64748b" />
                        Subcategory
                      </Typography>
                      <select
                        value={editForm.subcategory}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, subcategory: e.target.value }))}
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#0f172a",
                          outline: "none",
                        }}
                      >
                        <option value="">Select Subcategory...</option>
                        {TICKET_SUB_CATEGORIES.map((sc) => (
                          <option key={sc} value={sc}>{sc}</option>
                        ))}
                      </select>
                    </Box>

                    {/* Department */}
                    <Box sx={{ p: 1.75, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Building size={13} color="#059669" />
                        Department
                      </Typography>
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                        placeholder="e.g. IT Operations, Finance..."
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </Box>

                    {/* Location */}
                    <Box sx={{ p: 1.75, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Building size={13} color="#64748b" />
                        Office / Location
                      </Typography>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g. Ahmedabad HO - Server Room..."
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </Box>
                  </Box>

                  {/* 2x2 Grid for Type & Priority */}
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                    {/* Ticket Type */}
                    <Box sx={{ p: 1.75, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Tag size={13} color="#2563eb" />
                        Ticket Type
                      </Typography>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#0f172a",
                          outline: "none",
                        }}
                      >
                        {TICKET_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </Box>

                    {/* Priority Level */}
                    <Box sx={{ p: 1.75, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                      <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <AlertCircle size={13} color="#d97706" />
                        Priority Level
                      </Typography>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
                        style={{
                          width: "100%",
                          height: "36px",
                          padding: "0 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 700,
                          color:
                            editForm.priority === "Critical"
                              ? "#991b1b"
                              : editForm.priority === "High"
                              ? "#be123c"
                              : editForm.priority === "Medium"
                              ? "#b45309"
                              : "#15803d",
                          outline: "none",
                        }}
                      >
                        {TICKET_PRIORITIES.map((p) => (
                          <option key={p} value={p}>{p} Priority</option>
                        ))}
                      </select>
                    </Box>
                  </Box>

                  {/* Issue Description Edit Card */}
                  <Box
                    sx={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#ffffff",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <FileText size={15} color="#2563eb" />
                        <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                          Issue Description <span style={{ color: "#ef4444" }}>*</span>
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>
                        {editForm.description.length} chars
                      </Typography>
                    </Box>

                    <Box sx={{ p: 2 }}>
                      <textarea
                        rows={6}
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Detailed explanation of the issue, requirements, steps to reproduce..."
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                          lineHeight: 1.5,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Read-Only Audit Integrity Notice */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "8px",
                      bgcolor: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography sx={{ fontSize: "11.5px", color: "#64748b" }}>
                      🔒 <strong>Raised By:</strong> {requesterName} &bull; <strong>Ticket ID:</strong> {ticket.ticket_id} (Preserved for audit trail)
                    </Typography>
                  </Box>

                  {/* Bottom Save / Cancel Bar */}
                  <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1.25} pt={1} pb={2}>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={savingEdit}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "7px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#475569",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: savingEdit ? "not-allowed" : "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 22px",
                        borderRadius: "7px",
                        border: "none",
                        background: "#2563eb",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: savingEdit ? "not-allowed" : "pointer",
                        boxShadow: "0 1px 3px rgba(37,99,235,0.3)",
                      }}
                    >
                      {savingEdit ? <CircularProgress size={14} color="inherit" /> : <Save size={14} />}
                      <span>{savingEdit ? "Saving Changes..." : "Save Changes"}</span>
                    </button>
                  </Box>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={2.5}>
                {/* 2x2 Bento Attribute Cards */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1.5,
                  }}
                >
                  {/* Category Card */}
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                      <Layers size={14} color="#2563eb" />
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Category
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                      {ticket.category || "General"}
                    </Typography>
                    {ticket.subcategory && (
                      <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.25 }}>
                        Sub: {ticket.subcategory}
                      </Typography>
                    )}
                  </Box>

                  {/* Department Card */}
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                      <Building size={14} color="#059669" />
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Department
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                      {ticket.department || "General"}
                    </Typography>
                    {ticket.location && (
                      <Typography sx={{ fontSize: "12px", color: "#64748b", mt: 0.25 }}>
                        Loc: {ticket.location}
                      </Typography>
                    )}
                  </Box>

                  {/* Status Overview Card */}
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                      <StatusIcon size={14} color={statusMeta.text} />
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Current Status
                      </Typography>
                    </Box>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: statusMeta.bg,
                        color: statusMeta.text,
                        border: `1px solid ${statusMeta.border}`,
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          backgroundColor: statusMeta.dot,
                        }}
                      />
                      {statusMeta.label}
                    </span>
                  </Box>

                  {/* Priority Overview Card */}
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                      <AlertCircle size={14} color={priorityMeta.text} />
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Priority Level
                      </Typography>
                    </Box>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 8px",
                        borderRadius: "5px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: priorityMeta.bg,
                        color: priorityMeta.text,
                        border: `1px solid ${priorityMeta.border}`,
                      }}
                    >
                      {priorityMeta.label}
                    </span>
                  </Box>
                </Box>

                {/* People Cards: Raised By & Assigned To */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 1.5,
                  }}
                >
                  {/* Raised By */}
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#ffffff",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1 }}>
                      Raised By
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          bgcolor: requesterAvatar.bg,
                          color: requesterAvatar.text,
                          border: `1px solid ${requesterAvatar.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {getUserInitials(requesterName)}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "13.5px",
                            fontWeight: 700,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {requesterName}
                        </Typography>
                        <Typography sx={{ fontSize: "11.5px", color: "#64748b" }}>
                          Requester
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Assigned To */}
                  <Box
                    sx={{
                      p: 1.75,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#ffffff",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1 }}>
                      Assigned Technician
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          bgcolor: assigneeAvatar.bg,
                          color: assigneeAvatar.text,
                          border: `1px solid ${assigneeAvatar.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {getUserInitials(assigneeName)}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "13.5px",
                            fontWeight: 700,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {assigneeName}
                        </Typography>
                        <Typography sx={{ fontSize: "11.5px", color: "#0284c7", fontWeight: 600 }}>
                          IT Support
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Description Card */}
                <Box
                  sx={{
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    bgcolor: "#ffffff",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      bgcolor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.75}>
                      <FileText size={15} color="#2563eb" />
                      <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                        Issue Description
                      </Typography>
                    </Box>

                    <Tooltip title={copiedDesc ? "Copied!" : "Copy Description"}>
                      <button
                        type="button"
                        onClick={handleCopyDesc}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          color: copiedDesc ? "#16a34a" : "#64748b",
                          cursor: "pointer",
                        }}
                      >
                        {copiedDesc ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedDesc ? "Copied" : "Copy"}</span>
                      </button>
                    </Tooltip>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: "#fafcff" }}>
                    <Typography
                      sx={{
                        fontSize: "13.5px",
                        color: "#1e293b",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {ticket.description || "No description provided."}
                    </Typography>
                  </Box>
                </Box>

                {/* Status Resolution Banner (Closed) or Management Card */}
                {ticket.status === "Closed" ? (
                  <Box
                    sx={{
                      p: 2.25,
                      borderRadius: "10px",
                      border: "1px solid #a7f3d0",
                      bgcolor: "#ecfdf5",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1.25}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "8px",
                          bgcolor: "#dcfce7",
                          color: "#16a34a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ShieldCheck size={18} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#065f46" }}>
                          Ticket Closed &amp; Verified
                        </Typography>
                        <Typography sx={{ fontSize: "12px", color: "#047857" }}>
                          This ticket has been completed. Further status updates are locked.
                        </Typography>
                      </Box>
                    </Box>

                    {ticket.resolution_notes && (
                      <Box
                        sx={{
                          mt: 0.5,
                          p: 1.5,
                          borderRadius: "7px",
                          bgcolor: "#ffffff",
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#065f46", textTransform: "uppercase", mb: 0.25 }}>
                          Resolution Notes
                        </Typography>
                        <Typography sx={{ fontSize: "13px", color: "#047857" }}>
                          {ticket.resolution_notes}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#ffffff",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={0.75}>
                        <CheckSquare size={15} color="#2563eb" />
                        <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                          Manage Ticket Status
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ p: 2 }}>
                      {!isAdmin ? (
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: "7px",
                            bgcolor: "#fffbeb",
                            border: "1px solid #fde68a",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <AlertCircle size={16} color="#d97706" />
                          <Typography sx={{ fontSize: "12.5px", color: "#92400e", fontWeight: 500 }}>
                            Only <strong>IT Administrators</strong> are authorized to update ticket status.
                          </Typography>
                        </Box>
                      ) : (
                        <Box display="flex" flexDirection="column" gap={1.5}>
                          <Box display="flex" gap={1.5} alignItems="center">
                            <Box sx={{ minWidth: 160, flex: 1 }}>
                              <select
                                value={statusData.status}
                                onChange={(e) =>
                                  setStatusData((prev) => ({ ...prev, status: e.target.value }))
                                }
                                style={{
                                  width: "100%",
                                  height: "38px",
                                  padding: "0 10px",
                                  borderRadius: "7px",
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#0f172a",
                                  outline: "none",
                                }}
                              >
                                {["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"].map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </Box>

                            <Box sx={{ flex: 2 }}>
                              <input
                                type="text"
                                placeholder="Optional resolution remarks..."
                                value={statusData.remarks}
                                onChange={(e) =>
                                  setStatusData((prev) => ({ ...prev, remarks: e.target.value }))
                                }
                                style={{
                                  width: "100%",
                                  height: "38px",
                                  padding: "0 12px",
                                  borderRadius: "7px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "13px",
                                  boxSizing: "border-box",
                                  outline: "none",
                                }}
                              />
                            </Box>

                            <button
                              type="button"
                              onClick={handleUpdateStatus}
                              disabled={updatingStatus || ticket.status === statusData.status}
                              style={{
                                height: "38px",
                                padding: "0 16px",
                                borderRadius: "7px",
                                border: "none",
                                background:
                                  updatingStatus || ticket.status === statusData.status
                                    ? "#cbd5e1"
                                    : "#2563eb",
                                color: "#ffffff",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor:
                                  updatingStatus || ticket.status === statusData.status
                                    ? "not-allowed"
                                    : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                whiteSpace: "nowrap",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {updatingStatus && <CircularProgress size={14} color="inherit" />}
                              <span>{updatingStatus ? "Saving..." : "Update Status"}</span>
                            </button>
                          </Box>

                          {/* Quick Assign Dropdown for Admins */}
                          {users && users.length > 0 && (
                            <Box
                              sx={{
                                pt: 1.5,
                                mt: 0.5,
                                borderTop: "1px dashed #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Typography sx={{ fontSize: "12px", color: "#64748b", fontWeight: 600, minWidth: 90 }}>
                                Reassign to:
                              </Typography>
                              <select
                                value={assignData.assigned_to}
                                onChange={(e) =>
                                  setAssignData((prev) => ({ ...prev, assigned_to: e.target.value }))
                                }
                                style={{
                                  flex: 1,
                                  height: "36px",
                                  padding: "0 10px",
                                  borderRadius: "7px",
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  fontSize: "13px",
                                  fontWeight: 500,
                                  color: "#0f172a",
                                  outline: "none",
                                }}
                              >
                                <option value="">Select Technician...</option>
                                {users.map((u) => (
                                  <option key={u._id} value={u._id}>
                                    {u.username} {u.first_name ? `(${u.first_name})` : ""}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={handleAssign}
                                disabled={assigning || !assignData.assigned_to}
                                style={{
                                  height: "36px",
                                  padding: "0 14px",
                                  borderRadius: "7px",
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  color: "#334155",
                                  fontSize: "12.5px",
                                  fontWeight: 600,
                                  cursor: assigning || !assignData.assigned_to ? "not-allowed" : "pointer",
                                  opacity: assigning || !assignData.assigned_to ? 0.5 : 1,
                                }}
                              >
                                {assigning ? "Assigning..." : "Assign"}
                              </button>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            )
          )}

            {/* ── TAB 1: HISTORY & COMMENTS ─────────────────────────────── */}
            {tabIndex === 1 && (
              <Box display="flex" flexDirection="column" gap={2}>
                {/* Add Comment Card / Closed Notice */}
                {ticket?.status === "Closed" ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "10px",
                      border: "1px solid #fed7aa",
                      bgcolor: "#fffbeb",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "8px",
                        bgcolor: "#fef3c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Lock size={18} color="#d97706" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#92400e" }}>
                        Ticket is Closed
                      </Typography>
                      <Typography sx={{ fontSize: "12px", color: "#b45309", mt: 0.25 }}>
                        This ticket is marked as closed. Comments, notes, and further updates are disabled.
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      bgcolor: "#ffffff",
                    }}
                  >
                    <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", mb: 1, display: "flex", alignItems: "center", gap: 0.75 }}>
                      <MessageSquare size={14} color="#2563eb" />
                      Add Activity Note or Comment
                    </Typography>

                    <Box display="flex" gap={1}>
                      <textarea
                        placeholder="Write an internal update, progress note, or comment..."
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </Box>

                    <Box display="flex" justifyContent="flex-end" mt={1}>
                      <button
                        type="button"
                        onClick={handleAddComment}
                        disabled={addingComment || !comment.trim()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          borderRadius: "7px",
                          border: "none",
                          background: addingComment || !comment.trim() ? "#cbd5e1" : "#2563eb",
                          color: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: addingComment || !comment.trim() ? "not-allowed" : "pointer",
                        }}
                      >
                        {addingComment ? <CircularProgress size={14} color="inherit" /> : <Send size={13} />}
                        <span>{addingComment ? "Posting..." : "Post Comment"}</span>
                      </button>
                    </Box>
                  </Box>
                )}

                {/* Timeline Events */}
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", mb: 2 }}>
                    Timeline &amp; Audit Trail ({ticket.history?.length || 0})
                  </Typography>

                  {(!ticket.history || ticket.history.length === 0) ? (
                    <Box
                      sx={{
                        p: 4,
                        textAlign: "center",
                        borderRadius: "10px",
                        border: "1px dashed #e2e8f0",
                        bgcolor: "#fafbfc",
                      }}
                    >
                      <History size={24} color="#94a3b8" style={{ marginBottom: 6 }} />
                      <Typography sx={{ fontSize: "13px", color: "#64748b" }}>
                        No history or comments recorded yet.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ position: "relative", pl: 3, borderLeft: "2px solid #e2e8f0", ml: 1.5 }}>
                      {ticket.history
                        .slice()
                        .reverse()
                        .map((h, i) => {
                          const actorName = h.changed_by_name || formatUser(h.changed_by) || "System";
                          const actorAvatar = getUserAvatarTheme(actorName);
                          return (
                            <Box
                              key={i}
                              sx={{
                                position: "relative",
                                mb: 2.5,
                                "&:last-child": { mb: 0 },
                              }}
                            >
                              {/* Node Indicator */}
                              <Box
                                sx={{
                                  position: "absolute",
                                  left: -33,
                                  top: 2,
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  bgcolor: actorAvatar.bg,
                                  color: actorAvatar.text,
                                  border: `2px solid #ffffff`,
                                  boxShadow: "0 0 0 2px #cbd5e1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  fontWeight: 800,
                                }}
                              >
                                {getUserInitials(actorName)}
                              </Box>

                              {/* Event Card */}
                              <Box
                                sx={{
                                  p: 1.75,
                                  borderRadius: "9px",
                                  border: "1px solid #e2e8f0",
                                  bgcolor: "#ffffff",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                }}
                              >
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                                      {actorName}
                                    </Typography>
                                    <span
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: 700,
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        backgroundColor: "#f1f5f9",
                                        color: "#475569",
                                      }}
                                    >
                                      {h.action || "Update"}
                                    </span>
                                  </Box>
                                  <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>
                                    {formatTimestamp(h.timestamp)}
                                  </Typography>
                                </Box>

                                {/* Value Transition */}
                                {h.old_value && h.new_value && (
                                  <Box
                                    sx={{
                                      my: 0.75,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      fontSize: "11.5px",
                                      bgcolor: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                      px: 1,
                                      py: 0.3,
                                      borderRadius: "5px",
                                    }}
                                  >
                                    <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>{h.old_value}</span>
                                    <ArrowRight size={12} color="#64748b" />
                                    <span style={{ color: "#0f172a", fontWeight: 700 }}>{h.new_value}</span>
                                  </Box>
                                )}

                                {/* Remarks */}
                                {h.remarks && (
                                  <Typography sx={{ fontSize: "13px", color: "#334155", mt: 0.5, lineHeight: 1.5 }}>
                                    {h.remarks}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* ── TAB 2: ATTACHMENTS ────────────────────────────────────── */}
            {tabIndex === 2 && (
              <Box display="flex" flexDirection="column" gap={2.5}>
                {/* Upload Zone Card / Closed Notice */}
                {ticket?.status === "Closed" ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: "10px",
                      border: "1px solid #fed7aa",
                      bgcolor: "#fffbeb",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "8px",
                        bgcolor: "#fef3c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Lock size={18} color="#d97706" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "13px", fontWeight: 700, color: "#92400e" }}>
                        Ticket is Closed
                      </Typography>
                      <Typography sx={{ fontSize: "12px", color: "#b45309", mt: 0.25 }}>
                        This ticket is marked as closed. New attachments cannot be uploaded.
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: "10px",
                      border: "2px dashed #cbd5e1",
                      bgcolor: "#f8fafc",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                      "&:hover": { borderColor: "#3b82f6", bgcolor: "#f0f7ff" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        bgcolor: "#eff6ff",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1.25,
                      }}
                    >
                      <UploadCloud size={24} />
                    </Box>

                    <Typography sx={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
                      Upload Files &amp; Screenshots
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#64748b", mb: 2 }}>
                      PDF, JPG, PNG, Excel, Word (Max 10MB each)
                    </Typography>

                    <input
                      type="file"
                      id="ticket-file-input"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => setFiles(Array.from(e.target.files))}
                    />

                    <label
                      htmlFor="ticket-file-input"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 16px",
                        borderRadius: "7px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#334155",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      Browse Files
                    </label>

                    {files.length > 0 && (
                      <Box mt={2} p={1.5} bgcolor="#ffffff" borderRadius="8px" border="1px solid #bfdbfe">
                        <Typography sx={{ fontSize: "12.5px", fontWeight: 600, color: "#1d4ed8", mb: 1 }}>
                          {files.length} file(s) selected:
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={0.5} textAlign="left">
                          {files.map((f, i) => (
                            <Typography key={i} sx={{ fontSize: "12px", color: "#475569" }}>
                              • {f.name} ({formatFileSize(f.size)})
                            </Typography>
                          ))}
                        </Box>
                        <Box mt={1.5} display="flex" justifyContent="flex-end" gap={1}>
                          <button
                            type="button"
                            onClick={() => setFiles([])}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "transparent",
                              color: "#64748b",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleFileUpload}
                            disabled={uploading}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "6px",
                              border: "none",
                              background: "#2563eb",
                              color: "#ffffff",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: uploading ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            {uploading && <CircularProgress size={12} color="inherit" />}
                            <span>{uploading ? "Uploading..." : "Upload Now"}</span>
                          </button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {/* Attached Files List */}
                <Box>
                  <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", mb: 1.5 }}>
                    Attached Documents ({ticket.attachments?.length || 0})
                  </Typography>

                  {(!ticket.attachments || ticket.attachments.length === 0) ? (
                    <Box
                      sx={{
                        p: 4,
                        textAlign: "center",
                        borderRadius: "10px",
                        border: "1px dashed #e2e8f0",
                        bgcolor: "#fafbfc",
                      }}
                    >
                      <Paperclip size={24} color="#94a3b8" style={{ marginBottom: 6 }} />
                      <Typography sx={{ fontSize: "13px", color: "#64748b" }}>
                        No attachments uploaded for this ticket.
                      </Typography>
                    </Box>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={1.25}>
                      {ticket.attachments.map((file, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 1.5,
                            borderRadius: "9px",
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1.5,
                            transition: "all 0.15s ease",
                            "&:hover": {
                              borderColor: "#cbd5e1",
                              bgcolor: "#f8fafc",
                            },
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
                            <Box
                              sx={{
                                width: 38,
                                height: 38,
                                borderRadius: "8px",
                                bgcolor: "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {getFileIcon(file.file_name)}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#0f172a",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={file.file_name}
                              >
                                {file.file_name}
                              </Typography>
                              <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                                {formatFileSize(file.file_size)} • {formatTimestamp(file.uploaded_at)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            {isImageAttachment(file) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setViewerIndex(idx);
                                  setViewerOpen(true);
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid #bfdbfe",
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                                title="View Image on Page"
                              >
                                <Eye size={13} />
                                <span>View</span>
                              </button>
                            )}

                            {/* Change / Replace File */}
                            {ticket?.status !== "Closed" && (
                              <>
                                <input
                                  type="file"
                                  id={`replace-file-input-${file._id || idx}`}
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleReplaceAttachment(file._id, e.target.files[0]);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`replace-file-input-${file._id || idx}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #e2e8f0",
                                    background: "#f8fafc",
                                    color: "#475569",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: replacingAttachmentId === file._id ? "not-allowed" : "pointer",
                                    whiteSpace: "nowrap",
                                    margin: 0,
                                  }}
                                  title="Change / Replace File"
                                >
                                  {replacingAttachmentId === file._id ? (
                                    <CircularProgress size={12} color="inherit" />
                                  ) : (
                                    <RotateCcw size={13} />
                                  )}
                                  <span>{replacingAttachmentId === file._id ? "Replacing..." : "Change"}</span>
                                </label>

                                {/* Delete / Remove File */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttachment(file._id, file.file_name)}
                                  disabled={deletingAttachmentId === file._id}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #fecdd3",
                                    background: "#fff1f2",
                                    color: "#e11d48",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: deletingAttachmentId === file._id ? "not-allowed" : "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                  title="Remove File"
                                >
                                  {deletingAttachmentId === file._id ? (
                                    <CircularProgress size={12} color="inherit" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </>
        ) : null}
      </Box>

      {ticket && ticket.attachments && (
        <AttachmentImageViewer
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          attachments={ticket.attachments}
          initialIndex={viewerIndex}
          ticketId={ticket.ticket_id}
        />
      )}
    </Drawer>
  );
}
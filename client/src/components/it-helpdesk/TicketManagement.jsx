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
import * as XLSX from "xlsx";
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
  Tabs,
  Tab,
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

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_STATUSES = ["Open", "In Progress", "Closed"];
const USERS_FETCH_LIMIT = 200;

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
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 });
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState(null);

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
      const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip)$/i;
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
    <Box>
      {/* Tabs for different modules */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center" }} mb={2}>
        <Button onClick={() => navigate(-1)} sx={{ mr: 2, ml: 1 }} startIcon={<ArrowBackIcon />}>
          Back
        </Button>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="helpdesk-tabs">
          {/* <Tab label="Raise Ticket" value="raise-ticket" />
          <Tab label="Assign Ticket" value="assign-ticket" />
          <Tab label="Priority Management" value="priority-management" />
          <Tab label="SLA Tracking" value="sla-tracking" />
          <Tab label="Incident Management" value="incident-management" />
          <Tab label="Service Requests" value="service-requests" />
          <Tab label="Ticket Workflow" value="ticket-workflow" />
          <Tab label="Email Notifications" value="email-notifications" />
          <Tab label="Ticket Escalation" value="ticket-escalation" />
          <Tab label="Attachment Upload" value="attachment-upload" /> */}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box mt={2}>
        {activeTab === "raise-ticket" && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <ConfirmationNumberIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Helpdesk Tickets
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportAllToExcel}>
                  Export Excel
                </Button>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchData(pagination.page)}>
                  Refresh
                </Button>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
                  Raise Ticket
                </Button>
              </Box>
            </Box>

            {stats && (
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Tickets
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.newCount}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        New
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.inProgress + stats.assigned}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        In Progress
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.closed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Closed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            <Card>
              <CardContent>
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Status"
                      size="small"
                      fullWidth
                      value={filters.status}
                      onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      {TICKET_STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      select
                      label="Category"
                      size="small"
                      fullWidth
                      value={filters.category}
                      onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {TICKET_CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Search Title / ID / Requester"
                      size="small"
                      fullWidth
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Ticket ID</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Priority</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Requester</TableCell>
                          <TableCell>Assigned To</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No tickets found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.map((t) => (
                            <TableRow key={t._id} hover>
                              <TableCell>{t.ticket_id || t._id}</TableCell>
                              <TableCell>{t.category}</TableCell>

                              <TableCell>
                                <Chip label={t.priority} color={priorityColor(t.priority)} size="small" />
                              </TableCell>
                              <TableCell>
                                <Chip label={t.status} color={statusColor(t.status)} size="small" />
                              </TableCell>
                              <TableCell>
                                {t.requester_name || t.raised_by?.username || "—"}
                              </TableCell>
                              <TableCell>
                                {t.assigned_to?.username || t.assigned_to?.first_name || "Vikash"}
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Manage Status / History">
                                  <IconButton size="small" color="secondary" onClick={() => {
                                    setDetailTicketId(t._id);
                                    setDrawerOpen(true);
                                  }}>
                                    <ManageHistoryIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {t.attachments && t.attachments.length > 0 && (
                                  <Tooltip title="View Attachment">
                                    <IconButton size="small" color="primary" onClick={() => {
                                      window.open(t.attachments[0].file_url, '_blank');
                                    }}>
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpen(t)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={(e) => handleDelete(e, t._id)}>
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
                )}

                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Total: {pagination.total}
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchData(pagination.page - 1)}
                    >
                      Prev
                    </Button>
                    <Typography variant="caption" sx={{ alignSelf: "center" }}>
                      Page {pagination.page}
                    </Typography>
                    <Button
                      size="small"
                      disabled={pagination.page * pagination.limit >= pagination.total}
                      onClick={() => fetchData(pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
              <DialogTitle>{editId ? "Edit Ticket" : "Raise Ticket"}</DialogTitle>
              <DialogContent>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  {/* Debug: Log users data when form is rendered */}
                  {console.log("Form rendering with users:", users)}
                  {/* Title removed per request, auto-generated */}
                  <Grid item xs={12}>
                    <TextField
                      label="Description"
                      size="small"
                      fullWidth
                      multiline
                      minRows={3}
                      required
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label="Category"
                      size="small"
                      fullWidth
                      required
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      {TICKET_CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label="Priority (Optional)"
                      size="small"
                      fullWidth
                      value={form.priority}
                      onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    >
                      <MenuItem value=""><em>Not specified</em></MenuItem>
                      {TICKET_PRIORITIES.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    {isAdmin ? (
                      <TextField
                        select
                        label="Assigned To"
                        size="small"
                        fullWidth
                        value={form.assigned_to || ""}
                        onChange={(e) =>
                          setForm(f => ({
                            ...f,
                            assigned_to: e.target.value
                          }))
                        }
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
                          !form.assigned_to === "Vikash" && <MenuItem disabled>No Users Found</MenuItem>
                        )}
                      </TextField>
                    ) : (
                      <TextField
                        select
                        label="Assigned To"
                        size="small"
                        fullWidth
                        disabled
                        value={form.assigned_to || "Vikash"}
                        helperText="Default IT Assignee"
                      >
                        <MenuItem value={form.assigned_to || "Vikash"}>
                          {form.assigned_to === "Vikash" ? "Vikash" : (
                            users?.find(u => u._id === form.assigned_to)?.username || "Vikash"
                          )}
                        </MenuItem>
                      </TextField>
                    )}
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Requester"
                      size="small"
                      fullWidth
                      disabled
                      value={form.requester_name}
                      onChange={(e) => setForm((f) => ({ ...f, requester_name: e.target.value }))}
                      helperText="Auto-detected logged-in user"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Department"
                      size="small"
                      fullWidth
                      required
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="SLA Due Date"
                      type="date"
                      size="small"
                      required
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={
                        form.sla_due_date
                          ? form.sla_due_date.substring(0, 10)
                          : (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; })()
                      }
                      disabled={!editId}
                      helperText={!editId ? "Auto-set to today's date" : undefined}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          sla_due_date: e.target.value
                        }))
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    {/* Status is read-only in this form — can only be changed by Admin via Manage Status in the ticket drawer */}
                    <TextField
                      label="Status"
                      size="small"
                      fullWidth
                      value={editId ? (form.status || "New") : "New"}
                      disabled
                      helperText={editId ? "Use 'Manage Status' to change status" : "New tickets always start as New"}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                      Attachments (Optional)
                    </Typography>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setForm(f => ({ ...f, files: Array.from(e.target.files) }))}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </Grid>
                  {/* <Grid item xs={12}>
              <TextField
                label="Resolution Notes"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.resolution_notes}
                onChange={(e) => setForm((f) => ({ ...f, resolution_notes: e.target.value }))}
              />
            </Grid> */}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="contained" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
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
          </Box>
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
      </Box>
    </Box>
  );
}

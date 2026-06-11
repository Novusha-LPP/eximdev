import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AssignTicket from "./AssignTicket";
import PriorityManagement from "./PriorityManagement";
import SLATracking from "./SLATracking";
import IncidentManagement from "./IncidentManagement";
import ServiceRequests from "./ServiceRequests";
import TicketWorkflow from "./TicketWorkflow";
import EmailNotifications from "./EmailNotifications";
import TicketEscalation from "./TicketEscalation";
import AttachmentUpload from "./AttachmentUpload";
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
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
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

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_STATUSES = ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"];
const USERS_FETCH_LIMIT = 200;

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "Hardware",
  priority: "Medium",
  status: "New",
  type: "Incident",
  assigned_to: "",
  department: "",
  sla_due_date: "",
  resolution_notes: "",
};

export default function TicketManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ status: "", category: "", priority: "", search: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25 });
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  
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

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
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
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/api/get-all-users`, {
        withCredentials: true,
        params: { limit: USERS_FETCH_LIMIT },
      });
      const usersData = res.data || [];
      console.log("Fetched users:", usersData);
      setUsers(usersData);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpen = (record = null) => {
    console.log("Opening modal, current users:", users);
    if (record) {
      setEditId(record._id);
      setForm({
        title: record.title || "",
        description: record.description || "",
        category: record.category || "Hardware",
        priority: record.priority || "Medium",
        status: record.status || "New",
        type: record.type || "Incident",
        assigned_to: record.assigned_to?._id || record.assigned_to || "",
        department: record.department || "",
        sla_due_date: record.sla_due_date ? record.sla_due_date.slice(0, 10) : "",
        resolution_notes: record.resolution_notes || "",
      });
    } else {
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      assigned_to: form.assigned_to || undefined,
      sla_due_date: form.sla_due_date || undefined,
    };
    setSaving(true);
    try {
      if (editId) {
        await itHelpdeskAPI.tickets.update(editId, payload);
        toast.success("Ticket updated");
      } else {
        await itHelpdeskAPI.tickets.create(payload);
        toast.success("Ticket raised");
      }
      setShowModal(false);
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
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "New":
        return "error";
      case "Assigned":
        return "info";
      case "In Progress":
        return "warning";
      case "Pending":
        return "default";
      case "Resolved":
        return "success";
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
      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="helpdesk-tabs">
          <Tab label="Raise Ticket" value="raise-ticket" />
          <Tab label="Assign Ticket" value="assign-ticket" />
          <Tab label="Priority Management" value="priority-management" />
          <Tab label="SLA Tracking" value="sla-tracking" />
          <Tab label="Incident Management" value="incident-management" />
          <Tab label="Service Requests" value="service-requests" />
          <Tab label="Ticket Workflow" value="ticket-workflow" />
          <Tab label="Email Notifications" value="email-notifications" />
          <Tab label="Ticket Escalation" value="ticket-escalation" />
          <Tab label="Attachment Upload" value="attachment-upload" />
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
                label="Search Title / ID"
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
                    <TableCell>Title</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
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
                        <TableCell>{t.title}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>
<Chip label={t.priority} color={priorityColor(t.priority)} size="small" />
                          </TableCell>
                          <TableCell>
                            <Chip label={t.status} color={statusColor(t.status)} size="small" />
                        </TableCell>
                        <TableCell>
                          {t.assigned_to?.username || t.raised_by?.username || "—"}
                        </TableCell>
                        <TableCell align="right">
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
            <Grid item xs={12}>
              <TextField
                label="Title"
                required
                size="small"
                fullWidth
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                multiline
                minRows={3}
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
                label="Priority"
                size="small"
                fullWidth
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {TICKET_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Assigned To"
                size="small"
                fullWidth
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {users.length > 0 ? (
                  users.map((u) => (
                    <MenuItem key={u._id} value={u._id}>
                      {u.username} {u.first_name ? `(${u.first_name})` : ""}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Loading users...</MenuItem>
                )}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Department"
                size="small"
                fullWidth
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="SLA Due Date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.sla_due_date}
                onChange={(e) => setForm((f) => ({ ...f, sla_due_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Resolution Notes"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.resolution_notes}
                onChange={(e) => setForm((f) => ({ ...f, resolution_notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.title}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
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

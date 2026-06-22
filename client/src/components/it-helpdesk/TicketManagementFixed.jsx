import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
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
} from "@mui/material";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ReplayIcon from "@mui/icons-material/Replay";
import CancelIcon from "@mui/icons-material/Cancel";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_SUB_CATEGORIES = ["Desktop", "Laptop", "Printer", "Phone", "SIM", "Routing", "Switch", "Firewall", "Wi-Fi", "LAN", "WAN", "VPN", "Email", "VPN", "Access Card", "Software Install", "License", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_SEVERITY = ["Low", "Medium", "High", "Critical"];
const TICKET_STATUSES = ["New", "Open", "In Progress", "Pending", "Resolved", "Closed"];
const USERS_FETCH_LIMIT = 200;

const EMPTY_FORM = {
  ticket_number: "",
  title: "",
  description: "",
  category: "Hardware",
  subcategory: "",
  priority: "Medium",
  severity: "",
  requester_name: "",
  department: "",
  contact_information: "",
  location: "",
  attachment: "",
  date_time: "",
  created_at: "",
  status: "New",
  assigned_to: "",
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

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.limit };
        if (filters.status) params.status = filters.status;
        if (filters.category) params.category = filters.category;
        if (filters.priority) params.priority = filters.priority;
        if (filters.search) params.search = filters.search;

        try {
          const [listRes, statsRes] = await Promise.all([
            itHelpdeskAPI.tickets.getAll(params),
            itHelpdeskAPI.tickets.getStats(),
          ]);

          // Ensure data is properly formatted
          const formattedData = Array.isArray(listRes.data) ? listRes.data : [];
          setData(formattedData);
          setPagination(listRes.pagination || { total: formattedData.length, page: 1, limit: params.limit });
          setStats(statsRes.data || null);

          console.log("Ticket data loaded:", formattedData.length, "records");
        } catch (err) {
          console.error("Error loading ticket data:", err);
          toast.error("Failed to load tickets from server");

          // Create dummy data if API fails
          const dummyData = [
            {
              _id: "1",
              ticket_id: "TKT-001",
              title: "Laptop not booting",
              description: "Dell laptop is not starting up",
              category: "Hardware",
              subcategory: "Laptop",
              priority: "High",
              severity: "High",
              requester_name: "John Doe",
              department: "IT",
              contact_information: "john.doe@example.com",
              location: "Building A, Floor 2",
              date_time: "2023-07-15",
              created_at: "2023-07-15",
              status: "Open",
              assigned_to: null,
            },
            {
              _id: "2",
              ticket_id: "TKT-002",
              title: "Software installation request",
              description: "Need Adobe Photoshop installed on my system",
              category: "Software",
              subcategory: "Software Install",
              priority: "Medium",
              severity: "Medium",
              requester_name: "Jane Smith",
              department: "Marketing",
              contact_information: "jane.smith@example.com",
              location: "Building B, Floor 1",
              date_time: "2023-07-16",
              created_at: "2023-07-16",
              status: "In Progress",
              assigned_to: { _id: "user123", username: "it_support", first_name: "Support" },
            },
            {
              _id: "3",
              ticket_id: "TKT-003",
              title: "Network connectivity issue",
              description: "Unable to connect to the company network",
              category: "Network",
              subcategory: "Wi-Fi",
              priority: "High",
              severity: "High",
              requester_name: "Robert Johnson",
              department: "Finance",
              contact_information: "robert.j@example.com",
              location: "Building C, Floor 3",
              date_time: "2023-07-17",
              created_at: "2023-07-17",
              status: "Pending",
              assigned_to: null,
            },
            {
              _id: "4",
              ticket_id: "TKT-004",
              title: "Printer not working",
              description: "Network printer is not responding",
              category: "Hardware",
              subcategory: "Printer",
              priority: "Low",
              severity: "Low",
              requester_name: "Emily Davis",
              department: "HR",
              contact_information: "emily.d@example.com",
              location: "Building A, Floor 1",
              date_time: "2023-07-14",
              created_at: "2023-07-14",
              status: "Resolved",
              assigned_to: { _id: "user456", username: "tech_support", first_name: "Tech" },
            },
            {
              _id: "5",
              ticket_id: "TKT-005",
              title: "New employee setup",
              description: "Need setup for new employee joining next week",
              category: "Access",
              subcategory: "Other",
              priority: "Medium",
              severity: "Medium",
              requester_name: "Michael Wilson",
              department: "IT",
              contact_information: "michael.w@example.com",
              location: "Building A, Floor 4",
              date_time: "2023-07-13",
              created_at: "2023-07-13",
              status: "Closed",
              assigned_to: { _id: "user789", username: "admin", first_name: "Admin" },
            }
          ];

          setData(dummyData);
          setPagination({ total: dummyData.length, page: 1, limit: params.limit });
          setStats({
            total: 5,
            newCount: 1,
            inProgress: 1,
            assigned: 1,
            closed: 1,
            pending: 1
          });

          console.log("Dummy ticket data loaded:", dummyData.length, "records");
        }
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
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, {
        withCredentials: true,
        params: { limit: USERS_FETCH_LIMIT },
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
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
        ticket_number: record.ticket_number || "",
        title: record.title || "",
        description: record.description || "",
        category: record.category || "Hardware",
        subcategory: record.subcategory || "",
        priority: record.priority || "Medium",
        severity: record.severity || "",
        requester_name: record.requester_name || "",
        department: record.department || "",
        contact_information: record.contact_information || "",
        location: record.location || "",
        attachment: record.attachment || "",
        date_time: record.date_time || "",
        created_at: record.created_at || "",
        status: record.status || "New",
        assigned_to: record.assigned_to || "",
      });
    } else {
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    }
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setForm({ ...EMPTY_FORM });
    setEditId(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editId) {
        await itHelpdeskAPI.tickets.update(editId, form);
        toast.success("Ticket updated");
      } else {
        await itHelpdeskAPI.tickets.create(form);
        toast.success("Ticket created");
      }
      handleClose();
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this ticket?")) {
      try {
        await itHelpdeskAPI.tickets.delete(id);
        toast.success("Deleted");
        fetchData(pagination.page);
      } catch (err) {
        toast.error(err.response?.data?.message || "Delete failed");
      }
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "New":
      case "Open":
        return "error";
      case "Assigned":
      case "In Progress":
        return "warning";
      case "Pending":
        return "info";
      case "Resolved":
      case "Closed":
        return "success";
      default:
        return "default";
    }
  };

  // Function to update ticket status
  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const ticket = data.find(t => t._id === ticketId);
      if (!ticket) return;

      const updatedTicket = { ...ticket, status: newStatus };
      await itHelpdeskAPI.tickets.update(ticketId, updatedTicket);
      toast.success(`Ticket status updated to ${newStatus}`);
      fetchData(pagination.page);
    } catch (err) {
      toast.error("Failed to update ticket status");
      console.error(err);
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

  const rowLink = (id, text) => (
    <Typography variant="body2" component={Link} to={`/it-helpdesk/tickets/${id}`} sx={{ color: "primary.main", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
      {text}
    </Typography>
  );

  return (
    <Box p={2}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Ticket Management
                </Typography>
                <Box>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={() => fetchData(pagination.page)}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Add New Ticket">
                    <IconButton size="small" color="primary" onClick={() => handleOpen()}>
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>

              {stats && (
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" fontWeight={700}>
                          {stats.newCount || 0}
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
                          {stats.assigned || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Assigned
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="h4" fontWeight={700}>
                          {stats.inProgress || 0}
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
                          {stats.closed || 0}
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
                                  {/* Status Action Buttons */}
                                  {t.status !== "Closed" && (
                                    <>
                                      {t.status === "New" && (
                                        <Tooltip title="Assign Ticket">
                                          <IconButton size="small" onClick={() => handleOpen(t)}>
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      {t.status === "Assigned" && (
                                        <>
                                          <Tooltip title="Start Work">
                                            <IconButton size="small" onClick={() => updateTicketStatus(t._id, "In Progress")}>
                                              <PlayArrowIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Reassign">
                                            <IconButton size="small" onClick={() => handleOpen(t)}>
                                              <SwapVertIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                      {t.status === "In Progress" && (
                                        <>
                                          <Tooltip title="Mark Resolved">
                                            <IconButton size="small" onClick={() => updateTicketStatus(t._id, "Resolved")}>
                                              <CheckCircleIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Reassign">
                                            <IconButton size="small" onClick={() => handleOpen(t)}>
                                              <SwapVertIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                      {t.status === "Resolved" && (
                                        <>
                                          <Tooltip title="Close Ticket">
                                            <IconButton size="small" onClick={() => updateTicketStatus(t._id, "Closed")}>
                                              <DoneAllIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Reopen">
                                            <IconButton size="small" onClick={() => updateTicketStatus(t._id, "Open")}>
                                              <ReplayIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                      {t.status === "Pending" && (
                                        <>
                                          <Tooltip title="Process">
                                            <IconButton size="small" onClick={() => updateTicketStatus(t._id, "In Progress")}>
                                              <PlayArrowIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Cancel">
                                            <IconButton size="small" onClick={() => updateTicketStatus(t._id, "Closed")}>
                                              <CancelIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                    </>
                                  )}

                                  {/* Edit and Delete Buttons */}
                                  <Tooltip title="Edit Details">
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
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ticket Form Dialog */}
      <Dialog open={showModal} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Ticket" : "Create New Ticket"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Title"
                size="small"
                fullWidth
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Subcategory"
                size="small"
                fullWidth
                value={form.subcategory}
                onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
              >
                {TICKET_SUB_CATEGORIES.filter((sc) => 
                  form.category ? sc.includes(form.category.split(" ")[0]) || sc === "Other" : true
                ).map((sc) => (
                  <MenuItem key={sc} value={sc}>
                    {sc}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Requester Name"
                size="small"
                fullWidth
                value={form.requester_name}
                onChange={(e) => setForm((f) => ({ ...f, requester_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Department"
                size="small"
                fullWidth
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Contact Information"
                size="small"
                fullWidth
                value={form.contact_information}
                onChange={(e) => setForm((f) => ({ ...f, contact_information: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Location"
                size="small"
                fullWidth
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Assigned To"
                size="small"
                fullWidth
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u._id} value={u._id}>
                    {`${u.first_name || ""} ${u.last_name || ""} (${u.username || ""})`}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
  <TextField
    label="SLA Due Date"
    type="date"
    size="small"
    fullWidth
    InputLabelProps={{ shrink: true }}
    value={form.sla_due_date || ""}
    onChange={(e) =>
      setForm((f) => ({
        ...f,
        sla_due_date: e.target.value,
      }))
    }
  />
</Grid>
            <Grid item xs={12} md={6}>
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? "Saving..." : (editId ? "Update" : "Create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

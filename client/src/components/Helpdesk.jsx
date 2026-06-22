import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Tabs,
  Tab,
  Tooltip,
  Chip,
  FormControlLabel,
  Switch,
  Select,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import EmailIcon from "@mui/icons-material/Email";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import NotificationImportantIcon from "@mui/icons-material/NotificationImportant";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";

// Ticket categories
const TICKET_CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Other"
];

// Ticket priorities
const TICKET_PRIORITIES = [
  "Low",
  "Medium",
  "High",
  "Critical"
];

// Ticket statuses
const TICKET_STATUSES = [
  "New",
  "Assigned",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed"
];

// SLA levels
const SLA_LEVELS = [
  "P1 - Critical (4 hours)",
  "P2 - High (8 hours)",
  "P3 - Medium (24 hours)",
  "P4 - Low (72 hours)"
];

export default function Helpdesk() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [ticketModule, setTicketModule] = useState("raise-ticket");
  const [ticketStatus, setTicketStatus] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    category: "Hardware",
    priority: "Medium",
    title: "",
    description: "",
    assigned_to: "",
    status: "New",
    sla_level: "P3 - Medium (24 hours)",
    attachment: null
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const navigate = useNavigate();

  // Filter tickets based on search term and filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = !filterPriority || ticket.priority === filterPriority;
    const matchesStatus = !filterStatus || ticket.status === filterStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Fetch tickets
  const fetchTickets = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockTickets = [
        {
          id: 1,
          category: "Hardware",
          priority: "High",
          title: "Computer not booting",
          description: "Office computer fails to boot, shows error message",
          assigned_to: "John Doe",
          status: "In Progress",
          sla_level: "P2 - High (8 hours)",
          created_date: "2023-07-15",
          updated_date: "2023-07-16"
        },
        {
          id: 2,
          category: "Software",
          priority: "Medium",
          title: "Software installation request",
          description: "Need installation of Adobe Photoshop for design team",
          assigned_to: "Jane Smith",
          status: "Assigned",
          sla_level: "P3 - Medium (24 hours)",
          created_date: "2023-07-14",
          updated_date: "2023-07-15"
        }
      ];
      setTickets(mockTickets);
      setLoading(false);
    }, 500);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle module change
  const handleModuleChange = (event, newValue) => {
    setTicketModule(newValue);
  };

  // Handle status change
  const handleStatusChange = (event, newValue) => {
    setTicketStatus(newValue);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open modal for adding/editing ticket
  const handleOpenModal = (ticket = null) => {
    if (ticket) {
      setEditId(ticket.id);
      setForm({
        category: ticket.category,
        priority: ticket.priority,
        title: ticket.title,
        description: ticket.description,
        assigned_to: ticket.assigned_to,
        status: ticket.status,
        sla_level: ticket.sla_level,
        attachment: null
      });
    } else {
      setEditId(null);
      setForm({
        category: "Hardware",
        priority: "Medium",
        title: "",
        description: "",
        assigned_to: "",
        status: "New",
        sla_level: "P3 - Medium (24 hours)",
        attachment: null
      });
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save ticket
  const handleSaveTicket = () => {
    if (!form.title || !form.description) {
      toast.error("Title and Description are required");
      return;
    }

    if (editId) {
      // Update existing ticket
      setTickets(prev => prev.map(ticket => 
        ticket.id === editId ? { ...ticket, ...form, updated_date: new Date().toISOString().split('T')[0] } : ticket
      ));
      toast.success("Ticket updated successfully");
    } else {
      // Add new ticket
      const newTicket = {
        id: Date.now(),
        ...form,
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0]
      };
      setTickets(prev => [...prev, newTicket]);
      toast.success("Ticket created successfully");
    }

    handleCloseModal();
  };

  // Delete ticket
  const handleDeleteTicket = (id) => {
    if (window.confirm("Are you sure you want to delete this ticket?")) {
      setTickets(prev => prev.filter(ticket => ticket.id !== id));
      toast.success("Ticket deleted successfully");
    }
  };

  // Initialize tickets data
  useEffect(() => {
    fetchTickets();
  }, []);

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Low":
        return "success";
      case "Medium":
        return "default";
      case "High":
        return "warning";
      case "Critical":
        return "error";
      default:
        return "default";
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "New":
        return "default";
      case "Assigned":
        return "info";
      case "In Progress":
        return "warning";
      case "Pending":
        return "error";
      case "Resolved":
        return "success";
      case "Closed":
        return "secondary";
      default:
        return "default";
    }
  };

  // Get module icon
  const getModuleIcon = (module) => {
    switch (module) {
      case "raise-ticket":
        return <AddIcon />;
      case "assign-ticket":
        return <AssignmentIcon />;
      case "priority-management":
        return <PriorityHighIcon />;
      case "sla-tracking":
        return <TrendingUpIcon />;
      case "incident-management":
        return <NotificationImportantIcon />;
      case "service-requests":
        return <EmailIcon />;
      case "ticket-workflow":
        return <AccountTreeIcon />;
      case "email-notifications":
        return <EmailIcon />;
      case "ticket-escalation":
        return <NotificationImportantIcon />;
      case "attachment-upload":
        return <AddIcon />;
      default:
        return <AssignmentIcon />;
    }
  };

  // Get module description
  const getModuleDescription = (module) => {
    switch (module) {
      case "raise-ticket":
        return "Create a new support ticket for any IT issue";
      case "assign-ticket":
        return "Assign tickets to appropriate team members";
      case "priority-management":
        return "Manage ticket priorities based on urgency";
      case "sla-tracking":
        return "Track SLA compliance and response times";
      case "incident-management":
        return "Manage critical incidents and major outages";
      case "service-requests":
        return "Handle standard service requests";
      case "ticket-workflow":
        return "Define custom ticket workflows and transitions";
      case "email-notifications":
        return "Configure email notifications for ticket updates";
      case "ticket-escalation":
        return "Automatically escalate tickets based on rules";
      case "attachment-upload":
        return "Upload and manage ticket attachments";
      default:
        return "";
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <AssignmentIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Helpdesk / Ticket Management
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="ticket categories">
          <Tab label="Tickets" value="tickets" />
          <Tab label="Ticket Status" value="status" />
          <Tab label="Administration" value="admin" icon={<AdminPanelSettingsIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box mt={2}>
        {activeTab === "tickets" && (
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
            <Tabs value={ticketModule} onChange={handleModuleChange} aria-label="ticket modules">
              <Tab label="Raise Ticket" value="raise-ticket" icon={getModuleIcon("raise-ticket")} iconPosition="start" />
              <Tab label="Assign Ticket" value="assign-ticket" icon={getModuleIcon("assign-ticket")} iconPosition="start" />
              <Tab label="Priority Management" value="priority-management" icon={getModuleIcon("priority-management")} iconPosition="start" />
              <Tab label="SLA Tracking" value="sla-tracking" icon={getModuleIcon("sla-tracking")} iconPosition="start" />
              <Tab label="Incident Management" value="incident-management" icon={getModuleIcon("incident-management")} iconPosition="start" />
              <Tab label="Service Requests" value="service-requests" icon={getModuleIcon("service-requests")} iconPosition="start" />
              <Tab label="Ticket Workflow" value="ticket-workflow" icon={getModuleIcon("ticket-workflow")} iconPosition="start" />
              <Tab label="Email Notifications" value="email-notifications" icon={getModuleIcon("email-notifications")} iconPosition="start" />
              <Tab label="Ticket Escalation" value="ticket-escalation" icon={getModuleIcon("ticket-escalation")} iconPosition="start" />
              <Tab label="Attachment Upload" value="attachment-upload" icon={getModuleIcon("attachment-upload")} iconPosition="start" />
            </Tabs>
          </Box>
        )}

        {activeTab === "status" && (
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
            <Tabs value={ticketStatus} onChange={handleStatusChange} aria-label="ticket statuses">
              <Tab label="All" value="all" />
              <Tab label="New" value="new" />
              <Tab label="Assigned" value="assigned" />
              <Tab label="In Progress" value="in-progress" />
              <Tab label="Pending" value="pending" />
              <Tab label="Resolved" value="resolved" />
              <Tab label="Closed" value="closed" />
            </Tabs>
          </Box>
        )}

        {activeTab === "admin" && (
          <Box>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Administration</Typography>
                <Typography variant="body2" color="text.secondary">Manage roles, permissions, audit logs, email configuration, and system settings.</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      startIcon={<SecurityIcon />}
                      onClick={() => navigate("/admin/roles")}
                    >
                      Roles & Permissions
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      startIcon={<HistoryIcon />}
                      onClick={() => navigate("/admin/audit")}
                    >
                      Audit Logs
                    </Button>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      startIcon={<EmailIcon />}
                      onClick={() => navigate("/admin/email")}
                    >
                      Email Configuration
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      startIcon={<SettingsIcon />}
                      onClick={() => navigate("/admin/settings")}
                    >
                      System Settings
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        <Box mt={2}>
          {/* Filters and Search */}
          {activeTab === "tickets" && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Search Tickets"
                      size="small"
                      fullWidth
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Select
                      label="Priority"
                      size="small"
                      fullWidth
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                    >
                      <MenuItem value="">All Priorities</MenuItem>
                      {TICKET_PRIORITIES.map(priority => (
                        <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                      ))}
                    </Select>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Select
                      label="Status"
                      size="small"
                      fullWidth
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      {TICKET_STATUSES.map(status => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />} 
                      onClick={() => handleOpenModal()}
                      fullWidth
                    >
                      New Ticket
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Tickets Table */}
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
                        <TableCell>ID</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Assigned To</TableCell>
                        <TableCell>SLA Level</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredTickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No tickets found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTickets.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <Typography variant="body2">#{ticket.id}</Typography>
                            <TableCell>{ticket.title}</TableCell>
                            <TableCell>{ticket.category}</TableCell>
                            <TableCell>
                              <Chip 
                                label={ticket.priority} 
                                color={getPriorityColor(ticket.priority)} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={ticket.status} 
                                color={getStatusColor(ticket.status)} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>{ticket.assigned_to || "Unassigned"}</TableCell>
                            <TableCell>{ticket.sla_level}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => handleOpenModal(ticket)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => handleDeleteTicket(ticket.id)}>
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
        </Box>
      </Box>

      {/* Ticket Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? "Edit Ticket" : "Create New Ticket"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Title"
                name="title"
                size="small"
                fullWidth
                value={form.title}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Category"
                name="category"
                size="small"
                fullWidth
                value={form.category}
                onChange={handleInputChange}
              >
                {TICKET_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Priority"
                name="priority"
                size="small"
                fullWidth
                value={form.priority}
                onChange={handleInputChange}
              >
                {TICKET_PRIORITIES.map(priority => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="SLA Level"
                name="sla_level"
                size="small"
                fullWidth
                value={form.sla_level}
                onChange={handleInputChange}
              >
                {SLA_LEVELS.map(sla => (
                  <MenuItem key={sla} value={sla}>{sla}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                size="small"
                fullWidth
                multiline
                rows={3}
                value={form.description}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Assigned To"
                name="assigned_to"
                size="small"
                fullWidth
                value={form.assigned_to}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Status"
                name="status"
                size="small"
                fullWidth
                value={form.status}
                onChange={handleInputChange}
              >
                {TICKET_STATUSES.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTicket}>
            {editId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

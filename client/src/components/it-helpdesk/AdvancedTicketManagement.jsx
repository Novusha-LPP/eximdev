import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
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
  Tabs,
  Tab,
  FormControl,
  Select,
  InputLabel,
  Badge,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Avatar,
} from "@mui/material";
import {
  ConfirmationNumberIcon,
  RefreshIcon,
  AddIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon,
  PlayArrowIcon,
  SwapVertIcon,
  CheckCircleIcon,
  DoneAllIcon,
  ReplayIcon,
  CancelIcon,
  ExpandMoreIcon,
  PersonIcon,
  EmailIcon,
  PhoneIcon,
  AccessTimeIcon,
  PriorityHighIcon,
  AssignmentIcon,
  CommentIcon,
  AttachFileIcon,
  FilterListIcon,
  CloseIcon,
  SendIcon,
  FilterAltIcon,
  ViewColumnIcon,
  TableChartIcon,
} from "@mui/icons-material";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_SUB_CATEGORIES = ["Desktop", "Laptop", "Printer", "Phone", "SIM", "Routing", "Switch", "Firewall", "Wi-Fi", "LAN", "WAN", "VPN", "Email", "Access Card", "Software Install", "License", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_SEVERITY = ["Low", "Medium", "High", "Critical"];
const TICKET_STATUSES = ["New", "Open", "In Progress", "Pending", "Resolved", "Closed"];
const TICKET_TYPES = ["Incident", "Service Request", "Problem", "Change Request", "Other"];

const priorityColors = {
  Low: "success",
  Medium: "warning",
  High: "error",
  Critical: "error",
};

const statusColors = {
  New: "info",
  Open: "primary",
  "In Progress": "secondary",
  Pending: "warning",
  Resolved: "success",
  Closed: "default",
};

export default function AdvancedTicketManagement() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [openTicketDialog, setOpenTicketDialog] = useState(false);
  const [openViewTicketDialog, setOpenViewTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
  });
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    category: "",
    subCategory: "",
    priority: "Medium",
    severity: "Medium",
    type: "Incident",
    status: "New",
    assignee: "",
    group: "",
    reporter: "",
    dueDate: "",
    estimatedTime: "",
    tags: [],
    attachments: [],
  });
  const [comment, setComment] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'kanban'

  // Fetch tickets from API
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category = filterCategory;
      if (filterType) params.type = filterType;
      if (filterAssignee) params.assignee = filterAssignee;

      const response = await itHelpdeskAPI.tickets.getAll(params);
      setTickets(response.data || []);

      // Fetch stats
      const statsResponse = await itHelpdeskAPI.tickets.getStats();
      setStats(statsResponse.data || { total: 0, open: 0, resolved: 0, closed: 0, critical: 0 });
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus, filterPriority, filterCategory, filterType, filterAssignee]);

  // Fetch users for assignees
  const fetchUsers = async () => {
    try {
      const response = await itHelpdeskAPI.tickets.getAll({ limit: USERS_FETCH_LIMIT });
      // Assuming the response includes users data or we need a separate API
      // For now, we'll create mock users
      const mockUsers = [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
        { id: "3", name: "Robert Johnson", email: "robert@example.com" },
        { id: "4", name: "Emily Davis", email: "emily@example.com" },
        { id: "5", name: "Michael Wilson", email: "michael@example.com" },
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch groups
  const fetchGroups = async () => {
    try {
      // Mock groups data
      const mockGroups = [
        { id: "1", name: "Hardware Support" },
        { id: "2", name: "Software Support" },
        { id: "3", name: "Network Support" },
        { id: "4", name: "Security Team" },
      ];
      setGroups(mockGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchUsers();
    fetchGroups();
  }, [fetchTickets]);

  // Handle creating a new ticket
  const handleCreateTicket = async () => {
    if (!newTicket.title || !newTicket.description) {
      toast.error("Title and description are required");
      return;
    }

    try {
      const response = await itHelpdeskAPI.tickets.create(newTicket);
      toast.success("Ticket created successfully");
      setOpenTicketDialog(false);
      setNewTicket({
        title: "",
        description: "",
        category: "",
        subCategory: "",
        priority: "Medium",
        severity: "Medium",
        type: "Incident",
        status: "New",
        assignee: "",
        group: "",
        reporter: "",
        dueDate: "",
        estimatedTime: "",
        tags: [],
        attachments: [],
      });
      fetchTickets();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Failed to create ticket");
    }
  };

  // Handle updating a ticket
  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    try {
      const response = await itHelpdeskAPI.tickets.update(selectedTicket.id, selectedTicket);
      toast.success("Ticket updated successfully");
      setOpenViewTicketDialog(false);
      fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket");
    }
  };

  // Handle adding a comment to a ticket
  const handleAddComment = async () => {
    if (!comment || !selectedTicket) return;

    try {
      // In a real implementation, this would make an API call to add a comment
      const updatedTicket = {
        ...selectedTicket,
        comments: [
          ...(selectedTicket.comments || []),
          {
            id: Date.now().toString(),
            text: comment,
            user: "Current User", // In a real app, this would be the logged-in user
            timestamp: new Date().toISOString(),
          },
        ],
      };

      setSelectedTicket(updatedTicket);
      setComment("");

      // Update the ticket in the database
      await itHelpdeskAPI.tickets.update(selectedTicket.id, {
        ...updatedTicket,
        lastUpdated: new Date().toISOString(),
      });

      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  // Handle deleting a ticket
  const handleDeleteTicket = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;

    try {
      await itHelpdeskAPI.tickets.remove(id);
      toast.success("Ticket deleted successfully");
      fetchTickets();
      if (selectedTicket && selectedTicket.id === id) {
        setOpenViewTicketDialog(false);
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    }
  };

  // Handle status change
  const handleStatusChange = (newStatus) => {
    if (!selectedTicket) return;

    const updatedTicket = {
      ...selectedTicket,
      status: newStatus,
      lastUpdated: new Date().toISOString(),
    };

    setSelectedTicket(updatedTicket);
  };

  // Handle assignee change
  const handleAssigneeChange = (assigneeId) => {
    if (!selectedTicket) return;

    const updatedTicket = {
      ...selectedTicket,
      assignee: assigneeId,
      lastUpdated: new Date().toISOString(),
    };

    setSelectedTicket(updatedTicket);
  };

  // Filter tickets based on filters
  const filteredTickets = tickets.filter((ticket) => {
    if (searchTerm && !ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !ticket.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterStatus && ticket.status !== filterStatus) return false;
    if (filterPriority && ticket.priority !== filterPriority) return false;
    if (filterCategory && ticket.category !== filterCategory) return false;
    if (filterType && ticket.type !== filterType) return false;
    if (filterAssignee && ticket.assignee !== filterAssignee) return false;
    return true;
  });

  // Kanban columns
  const kanbanColumns = {
    New: [],
    Open: [],
    "In Progress": [],
    Pending: [],
    Resolved: [],
    Closed: [],
  };

  // Organize tickets for Kanban view
  filteredTickets.forEach((ticket) => {
    if (kanbanColumns[ticket.status]) {
      kanbanColumns[ticket.status].push(ticket);
    }
  });

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("");
    setFilterPriority("");
    setFilterCategory("");
    setFilterType("");
    setFilterAssignee("");
  };

  return (
    <Box p={3}>
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight={700}>
              Advanced Ticket Management
            </Typography>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<FilterAltIcon />}
                onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              >
                Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<ViewColumnIcon />}
                onClick={() => setViewMode(viewMode === "table" ? "kanban" : "table")}
              >
                {viewMode === "table" ? "Kanban View" : "Table View"}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<TableChartIcon />}
                onClick={() => {
                  // Placeholder for reports functionality
                  toast.success("Reports feature coming soon!");
                }}
              >
                Reports
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setOpenTicketDialog(true)}
              >
                New Ticket
              </Button>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={2.4}>
              <Card sx={{ textAlign: "center", boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6">Total Tickets</Typography>
                  <Typography variant="h4" color="primary">{stats.total}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Card sx={{ textAlign: "center", boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6">Open Tickets</Typography>
                  <Typography variant="h4" color="primary">{stats.open}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Card sx={{ textAlign: "center", boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6">Resolved</Typography>
                  <Typography variant="h4" color="success">{stats.resolved}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Card sx={{ textAlign: "center", boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6">Closed</Typography>
                  <Typography variant="h4" color="default">{stats.closed}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Card sx={{ textAlign: "center", boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="h6">Critical</Typography>
                  <Typography variant="h4" color="error">{stats.critical}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filter Panel */}
          {filterPanelOpen && (
            <Card sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" mb={2}>Filters</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    fullWidth
                    label="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      {TICKET_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      {TICKET_PRIORITIES.map((priority) => (
                        <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      {TICKET_CATEGORIES.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      {TICKET_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Assignee</InputLabel>
                    <Select
                      value={filterAssignee}
                      onChange={(e) => setFilterAssignee(e.target.value)}
                    >
                      <MenuItem value="">All</MenuItem>
                      {users.map((user) => (
                        <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={resetFilters}
                    startIcon={<RefreshIcon />}
                  >
                    Reset Filters
                  </Button>
                </Grid>
              </Grid>
            </Card>
          )}

          {/* Ticket View */}
          {viewMode === "table" ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ticket ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Assignee</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : filteredTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          No tickets found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <ConfirmationNumberIcon color="primary" sx={{ mr: 1 }} />
                              {ticket.id}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2">{ticket.title}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {ticket.description.substring(0, 50)}...
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.status}
                              color={statusColors[ticket.status]}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ticket.priority}
                              color={priorityColors[ticket.priority]}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{ticket.category}</TableCell>
                          <TableCell>{ticket.type}</TableCell>
                          <TableCell>
                            {ticket.assignee ? users.find(u => u.id === ticket.assignee)?.name || ticket.assignee : "Unassigned"}
                          </TableCell>
                          <TableCell>
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Box display="flex">
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setOpenViewTicketDialog(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteTicket(ticket.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            // Kanban View
            <Box sx={{ display: "flex", gap: 2, overflowX: "auto" }}>
              {Object.entries(kanbanColumns).map(([status, tickets]) => (
                <Card key={status} sx={{ minWidth: 300, flex: 1 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">{status}</Typography>
                      <Badge badgeContent={tickets.length} color="primary" />
                    </Box>
                    <Divider />
                    <Box sx={{ mt: 2, maxHeight: 600, overflowY: "auto" }}>
                      {tickets.map((ticket) => (
                        <Card key={ticket.id} sx={{ mb: 2, cursor: "pointer" }} onClick={() => {
                          setSelectedTicket(ticket);
                          setOpenViewTicketDialog(true);
                        }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Typography variant="subtitle2" fontWeight={600}>{ticket.title}</Typography>
                              <Chip
                                label={ticket.priority}
                                color={priorityColors[ticket.priority]}
                                size="small"
                              />
                            </Box>
                            <Typography variant="caption" color="textSecondary" mb={1}>
                              {ticket.description.substring(0, 70)}...
                            </Typography>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" color="textSecondary">
                                #{ticket.id}
                              </Typography>
                              {ticket.assignee && (
                                <Typography variant="caption">
                                  {users.find(u => u.id === ticket.assignee)?.name || ticket.assignee}
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                      {tickets.length === 0 && (
                        <Box textAlign="center" py={4} color="textSecondary">
                          No tickets in this status
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* New Ticket Dialog */}
      <Dialog open={openTicketDialog} onClose={() => setOpenTicketDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Ticket</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                multiline
                rows={4}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                >
                  {TICKET_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Sub-Category</InputLabel>
                <Select
                  value={newTicket.subCategory}
                  onChange={(e) => setNewTicket({ ...newTicket, subCategory: e.target.value })}
                >
                  {TICKET_SUB_CATEGORIES.map((subCategory) => (
                    <MenuItem key={subCategory} value={subCategory}>{subCategory}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                >
                  {TICKET_PRIORITIES.map((priority) => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={newTicket.severity}
                  onChange={(e) => setNewTicket({ ...newTicket, severity: e.target.value })}
                >
                  {TICKET_SEVERITY.map((severity) => (
                    <MenuItem key={severity} value={severity}>{severity}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newTicket.type}
                  onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value })}
                >
                  {TICKET_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Assignee</InputLabel>
                <Select
                  value={newTicket.assignee}
                  onChange={(e) => setNewTicket({ ...newTicket, assignee: e.target.value })}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={newTicket.dueDate}
                onChange={(e) => setNewTicket({ ...newTicket, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Estimated Time (hours)"
                type="number"
                value={newTicket.estimatedTime}
                onChange={(e) => setNewTicket({ ...newTicket, estimatedTime: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTicketDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTicket} variant="contained" color="primary">
            Create Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Ticket Dialog */}
      <Dialog open={openViewTicketDialog} onClose={() => setOpenViewTicketDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>Ticket Details: {selectedTicket?.id}</span>
            <Box display="flex" gap={1}>
              <Tooltip title="Delete Ticket">
                <IconButton size="small" onClick={() => selectedTicket && handleDeleteTicket(selectedTicket.id)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton size="small" onClick={() => setOpenViewTicketDialog(false)}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTicket && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <Typography variant="h6" gutterBottom>{selectedTicket.title}</Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {selectedTicket.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Details</Typography>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedTicket.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                          >
                            {TICKET_STATUSES.map((status) => (
                              <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Priority</Typography>
                        <Chip
                          label={selectedTicket.priority}
                          color={priorityColors[selectedTicket.priority]}
                          size="small"
                        />
                      </Box>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Category</Typography>
                        <Typography>{selectedTicket.category}</Typography>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                        <Typography>{selectedTicket.type}</Typography>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Assignee</Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            value={selectedTicket.assignee}
                            onChange={(e) => handleAssigneeChange(e.target.value)}
                          >
                            <MenuItem value="">Unassigned</MenuItem>
                            {users.map((user) => (
                              <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="subtitle2" color="textSecondary">Due Date</Typography>
                        <Typography>{selectedTicket.dueDate || "Not set"}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">Created</Typography>
                        <Typography>{new Date(selectedTicket.createdAt).toLocaleString()}</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box mt={4}>
                <Typography variant="h6" gutterBottom>Comments</Typography>
                <List>
                  {(selectedTicket.comments || []).map((comment) => (
                    <ListItem key={comment.id}>
                      <Avatar sx={{ mr: 2 }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Typography variant="subtitle2" fontWeight={600}>{comment.user}</Typography>
                          <Typography variant="caption" color="textSecondary" ml={2}>
                            {new Date(comment.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                        <Typography>{comment.text}</Typography>
                      </Box>
                    </ListItem>
                  ))}
                  {(selectedTicket.comments || []).length === 0 && (
                    <Typography color="textSecondary">No comments yet</Typography>
                  )}
                </List>
                <Box mt={2} display="flex" gap={2}>
                  <TextField
                    fullWidth
                    label="Add a comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    multiline
                    rows={2}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddComment}
                    startIcon={<SendIcon />}
                    disabled={!comment.trim()}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewTicketDialog(false)}>Close</Button>
          <Button onClick={handleUpdateTicket} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Badge,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Stack,
} from "@mui/material";
import {
  AssignmentIcon,
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
  CommentIcon,
  AttachFileIcon,
  ScheduleIcon,
  PeopleIcon,
  FilterListIcon,
  ViewColumnIcon,
  TableChartIcon,
  HistoryIcon,
  SettingsIcon,
  SendIcon,
  CloseIcon,
  WarningIcon,
  ErrorIcon,
  InfoIcon,
  CheckCircle as CheckCircleIconSolid,
  PersonPinIcon,
  GroupIcon,
  EmailIcon,
  PhoneIcon,
  AccessTimeIcon,
  PriorityHighIcon,
} from "@mui/icons-material";

const TICKET_STATUSES = ["New", "Open", "In Progress", "Pending", "Resolved", "Closed"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];

export default function TicketAssignment() {
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", priority: "", category: "", assignee: "", search: "" });
  const [stats, setStats] = useState({
    total: 0,
    unassigned: 0,
    assigned: 0,
    overdue: 0,
  });
  const [viewMode, setViewMode] = useState("all"); // "all", "unassigned", "assigned", "overdue"
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    assignee: "",
    group: "",
    priority: "",
    dueDate: "",
    notes: "",
  });

  // Fetch tickets and users
  const fetchData = async () => {
    setLoading(true);
    try {
      // Filter tickets based on view mode
      let statusFilter = "";
      if (viewMode === "unassigned") statusFilter = "New";
      else if (viewMode === "overdue") statusFilter = "Overdue";

      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.assignee) params.assignee = filters.assignee;
      if (filters.search) params.search = filters.search;

      // Fetch tickets
      // const ticketsResponse = await itHelpdeskAPI.tickets.getAll(params);
      // setTickets(ticketsResponse.data || []);

      // Mock data for now
      const mockTickets = [
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
          status: "New",
          assigned_to: null,
          sla_due_date: "2023-07-20",
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
          status: "Assigned",
          assigned_to: { _id: "user123", username: "it_support", first_name: "Support" },
          sla_due_date: "2023-07-22",
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
          status: "In Progress",
          assigned_to: { _id: "user456", username: "tech_support", first_name: "Tech" },
          due_date: "2023-07-18", // Overdue
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
          assigned_to: { _id: "user789", username: "admin", first_name: "Admin" },
          sla_due_date: "2023-07-19",
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
          assigned_to: { _id: "user101", username: "hr_support", first_name: "HR" },
          sla_due_date: "2023-07-15",
        }
      ];

      // Apply filters
      let filteredTickets = mockTickets;
      if (statusFilter) {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === statusFilter);
      }
      if (filters.status) {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === filters.status);
      }
      if (filters.priority) {
        filteredTickets = filteredTickets.filter(ticket => ticket.priority === filters.priority);
      }
      if (filters.category) {
        filteredTickets = filteredTickets.filter(ticket => ticket.category === filters.category);
      }
      if (filters.assignee) {
        filteredTickets = filteredTickets.filter(ticket => ticket.assigned_to?._id === filters.assignee);
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.title.toLowerCase().includes(searchTerm) || 
          ticket.description.toLowerCase().includes(searchTerm) ||
          ticket.ticket_id.toLowerCase().includes(searchTerm)
        );
      }

      setTickets(filteredTickets);

      // Calculate stats
      const total = mockTickets.length;
      const unassigned = mockTickets.filter(t => !t.assigned_to).length;
      const assigned = mockTickets.filter(t => t.assigned_to).length;
      const overdue = mockTickets.filter(t => new Date(t.due_date) < new Date() && t.status !== "Closed" && t.status !== "Resolved").length;

      setStats({ total, unassigned, assigned, overdue });

      // Fetch users
      // const usersResponse = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, {
      //   withCredentials: true,
      //   params: { limit: 200 },
      // });
      // setUsers(usersResponse.data || []);

      // Mock users
      const mockUsers = [
        { _id: "user123", username: "it_support", first_name: "Support", last_name: "Team", email: "support@example.com" },
        { _id: "user456", username: "tech_support", first_name: "Tech", last_name: "Team", email: "tech@example.com" },
        { _id: "user789", username: "admin", first_name: "Admin", last_name: "User", email: "admin@example.com" },
        { _id: "user101", username: "hr_support", first_name: "HR", last_name: "Team", email: "hr@example.com" },
      ];
      setUsers(mockUsers);

      // Fetch groups
      // const groupsResponse = await itHelpdeskAPI.groups.getAll();
      // setGroups(groupsResponse.data || []);

      // Mock groups
      const mockGroups = [
        { id: "group1", name: "Hardware Support", description: "Handles all hardware-related issues" },
        { id: "group2", name: "Software Support", description: "Handles all software-related issues" },
        { id: "group3", name: "Network Support", description: "Handles all network-related issues" },
        { id: "group4", name: "Security Team", description: "Handles all security-related issues" },
      ];
      setGroups(mockGroups);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, filters]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "New":
      case "Open":
        return "error";
      case "In Progress":
        return "warning";
      case "Pending":
        return "info";
      case "Resolved":
        return "success";
      case "Closed":
        return "default";
      default:
        return "default";
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical":
        return "error";
      case "High":
        return "warning";
      case "Medium":
        return "info";
      case "Low":
        return "success";
      default:
        return "default";
    }
  };

  // Open assignment dialog
  const openAssignmentDialog = (ticket) => {
    setSelectedTicket(ticket);
    setAssignmentForm({
      assignee: ticket.assigned_to?._id || "",
      group: "",
      priority: ticket.priority,
      dueDate: ticket.sla_due_date || "",
      notes: "",
    });
    setAssignmentDialogOpen(true);
  };

  // Close assignment dialog
  const closeAssignmentDialog = () => {
    setAssignmentDialogOpen(false);
    setSelectedTicket(null);
  };

  // Handle assignment form changes
  const handleAssignmentChange = (e) => {
    const { name, value } = e.target;
    setAssignmentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Assign ticket
  const assignTicket = async () => {
    if (!selectedTicket) return;

    try {
      const updatedTicket = {
        ...selectedTicket,
        assigned_to: assignmentForm.assignee ? users.find(u => u._id === assignmentForm.assignee) : null,
        group: assignmentForm.group,
        priority: assignmentForm.priority,
        sla_due_date: assignmentForm.dueDate,
        status: assignmentForm.assignee ? "Assigned" : "New",
        notes: assignmentForm.notes,
      };

      // Update ticket in API
      // await itHelpdeskAPI.tickets.update(selectedTicket._id, updatedTicket);

      // Update local state
      const updatedTickets = tickets.map(ticket => 
        ticket._id === selectedTicket._id ? updatedTicket : ticket
      );
      setTickets(updatedTickets);

      toast.success("Ticket assigned successfully");
      closeAssignmentDialog();
      fetchData();
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast.error("Failed to assign ticket");
    }
  };

  // Reassign ticket
  const reassignTicket = async (ticketId, newAssignee) => {
    try {
      const ticket = tickets.find(t => t._id === ticketId);
      if (!ticket) return;

      const updatedTicket = {
        ...ticket,
        assigned_to: newAssignee ? users.find(u => u._id === newAssignee) : null,
        status: newAssignee ? "Assigned" : "New",
      };

      // Update ticket in API
      // await itHelpdeskAPI.tickets.update(ticketId, updatedTicket);

      // Update local state
      const updatedTickets = tickets.map(t => 
        t._id === ticketId ? updatedTicket : t
      );
      setTickets(updatedTickets);

      toast.success("Ticket reassigned successfully");
      fetchData();
    } catch (error) {
      console.error("Error reassigning ticket:", error);
      toast.error("Failed to reassign ticket");
    }
  };

  // Update ticket status
  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const ticket = tickets.find(t => t._id === ticketId);
      if (!ticket) return;

      const updatedTicket = { ...ticket, status: newStatus };

      // Update ticket in API
      // await itHelpdeskAPI.tickets.update(ticketId, updatedTicket);

      // Update local state
      const updatedTickets = tickets.map(t => 
        t._id === ticketId ? updatedTicket : t
      );
      setTickets(updatedTickets);

      toast.success(`Ticket status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Failed to update ticket status");
    }
  };

  return (
    <Box p={3}>
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <AssignmentIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Ticket Assignment
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <AssignmentIcon color="primary" />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Tickets
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <WarningIcon color="warning" />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.unassigned}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Unassigned
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PeopleIcon color="info" />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.assigned}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assigned
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ErrorIcon color="error" />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.overdue}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Overdue
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant={viewMode === "all" ? "contained" : "outlined"}
                onClick={() => setViewMode("all")}
                startIcon={<AssignmentIcon />}
              >
                All Tickets
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant={viewMode === "unassigned" ? "contained" : "outlined"}
                onClick={() => setViewMode("unassigned")}
                startIcon={<WarningIcon />}
                color="warning"
              >
                Unassigned
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant={viewMode === "assigned" ? "contained" : "outlined"}
                onClick={() => setViewMode("assigned")}
                startIcon={<PeopleIcon />}
                color="info"
              >
                Assigned
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant={viewMode === "overdue" ? "contained" : "outlined"}
                onClick={() => setViewMode("overdue")}
                startIcon={<ErrorIcon />}
                color="error"
              >
                Overdue
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Tickets"
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Advanced Filters */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {TICKET_STATUSES.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  {TICKET_PRIORITIES.map(priority => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {TICKET_CATEGORIES.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Assignee</InputLabel>
                <Select
                  value={filters.assignee}
                  onChange={(e) => setFilters(f => ({ ...f, assignee: e.target.value }))}
                  label="Assignee"
                >
                  <MenuItem value="">All Assignees</MenuItem>
                  {users.map(user => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.username} {user.first_name ? `(${user.first_name})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({ status: "", priority: "", category: "", assignee: "", search: "" })}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {/* Tickets Table */}
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
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
                    <TableCell>Assignee</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No tickets found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets.map((ticket) => (
                      <TableRow key={ticket._id} hover>
                        <TableCell>{ticket.ticket_id || ticket._id}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>{ticket.category}</TableCell>
                        <TableCell>
                          <Chip label={ticket.priority} color={getPriorityColor(ticket.priority)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.status} 
                            color={getStatusColor(ticket.status)} 
                            size="small"
                            variant={ticket.status === "Overdue" ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell>
                          {ticket.assigned_to ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                {ticket.assigned_to.first_name ? ticket.assigned_to.first_name[0] : "U"}
                              </Avatar>
                              <span>{ticket.assigned_to.username}</span>
                            </Box>
                          ) : (
                            <span style={{ color: "text.secondary" }}>Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ticket.due_date ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <CalendarTodayIcon fontSize="small" />
                              <span>{new Date(ticket.due_date).toLocaleDateString()}</span>
                              {new Date(ticket.due_date) < new Date() && ticket.status !== "Closed" && ticket.status !== "Resolved" && (
                                <Chip label="Overdue" color="error" size="small" />
                              )}
                            </Box>
                          ) : (
                            <span style={{ color: "text.secondary" }}>Not set</span>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {ticket.status === "New" && (
                            <Tooltip title="Assign Ticket">
                              <IconButton size="small" onClick={() => openAssignmentDialog(ticket)}>
                                <AssignmentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {ticket.status === "Assigned" && (
                            <>
                              <Tooltip title="Reassign">
                                <IconButton size="small" onClick={() => openAssignmentDialog(ticket)}>
                                  <SwapVertIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Start Work">
                                <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "In Progress")}>
                                  <PlayArrowIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {ticket.status === "In Progress" && (
                            <>
                              <Tooltip title="Mark Resolved">
                                <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "Resolved")}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reassign">
                                <IconButton size="small" onClick={() => openAssignmentDialog(ticket)}>
                                  <SwapVertIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {ticket.status === "Resolved" && (
                            <Tooltip title="Close Ticket">
                              <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "Closed")}>
                                <DoneAllIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {ticket.status === "Pending" && (
                            <>
                              <Tooltip title="Process">
                                <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "In Progress")}>
                                  <PlayArrowIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "Closed")}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Assignment Dialog */}
          <Dialog open={assignmentDialogOpen} onClose={closeAssignmentDialog} maxWidth="sm" fullWidth>
            <DialogTitle>
              {selectedTicket?.status === "New" ? "Assign Ticket" : "Reassign Ticket"}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {selectedTicket?.title}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Assign To</InputLabel>
                    <Select
                      name="assignee"
                      value={assignmentForm.assignee}
                      onChange={handleAssignmentChange}
                      label="Assign To"
                    >
                      <MenuItem value="">Unassign</MenuItem>
                      {users.map(user => (
                        <MenuItem key={user._id} value={user._id}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              {user.first_name ? user.first_name[0] : "U"}
                            </Avatar>
                            <span>{user.username} {user.first_name ? `(${user.first_name})` : ""}</span>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Group</InputLabel>
                    <Select
                      name="group"
                      value={assignmentForm.group}
                      onChange={handleAssignmentChange}
                      label="Group"
                    >
                      <MenuItem value="">Select Group</MenuItem>
                      {groups.map(group => (
                        <MenuItem key={group.id} value={group.id}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <GroupIcon fontSize="small" />
                            {group.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      name="priority"
                      value={assignmentForm.priority}
                      onChange={handleAssignmentChange}
                      label="Priority"
                    >
                      {TICKET_PRIORITIES.map(priority => (
                        <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Due Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    name="dueDate"
                    value={assignmentForm.dueDate}
                    onChange={handleAssignmentChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    fullWidth
                    multiline
                    rows={3}
                    name="notes"
                    value={assignmentForm.notes}
                    onChange={handleAssignmentChange}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeAssignmentDialog}>Cancel</Button>
              <Button onClick={assignTicket} variant="contained" disabled={!assignmentForm.assignee && !assignmentForm.group}>
                Assign Ticket
              </Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    </Box>
  );
}

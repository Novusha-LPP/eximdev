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
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  PlayArrow as PlayArrowIcon,
  SwapVert as SwapVertIcon,
  CheckCircle as CheckCircleIcon,
  DoneAll as DoneAllIcon,
  Replay as ReplayIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  FilterList as FilterListIcon,
  ViewColumn as ViewColumnIcon,
  TableChart as TableChartIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

const TICKET_STATUSES = ["New", "Open", "In Progress", "Pending", "Resolved", "Closed"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];

export default function TicketStatusDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ status: "", category: "", priority: "", search: "" });
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
  });
  const [viewMode, setViewMode] = useState("all"); // "all", "open", "pending", "resolved", "closed"

  // Fetch tickets from API
  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Filter tickets based on view mode
      let statusFilter = "";
      if (viewMode === "open") statusFilter = "Open";
      else if (viewMode === "pending") statusFilter = "Pending";
      else if (viewMode === "resolved") statusFilter = "Resolved";
      else if (viewMode === "closed") statusFilter = "Closed";

      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      try {
        const response = await itHelpdeskAPI.tickets.getAll(params);
        const apiTickets = response.data || [];
        setTickets(apiTickets);
        console.log("Tickets loaded from API:", apiTickets.length);
        return;
      } catch (apiError) {
        console.warn("API call failed, using mock data:", apiError.message);
      }

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

      // Apply filters
      let filteredTickets = mockTickets;
      if (statusFilter) {
        filteredTickets = filteredTickets.filter(ticket => ticket.status === statusFilter);
      }
      if (filters.category) {
        filteredTickets = filteredTickets.filter(ticket => ticket.category === filters.category);
      }
      if (filters.priority) {
        filteredTickets = filteredTickets.filter(ticket => ticket.priority === filters.priority);
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
      const open = mockTickets.filter(t => t.status === "Open" || t.status === "In Progress").length;
      const pending = mockTickets.filter(t => t.status === "Pending").length;
      const resolved = mockTickets.filter(t => t.status === "Resolved").length;
      const closed = mockTickets.filter(t => t.status === "Closed").length;
      const critical = mockTickets.filter(t => t.priority === "Critical").length;

      setStats({ total, open, pending, resolved, closed, critical });
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
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

  // Update ticket status
  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const ticket = tickets.find(t => t._id === ticketId);
      if (!ticket) return;

      const updatedTicket = { ...ticket, status: newStatus };
      await itHelpdeskAPI.tickets.update(ticketId, updatedTicket);
      toast.success(`Ticket status updated to ${newStatus}`);
      fetchTickets();
    } catch (error) {
      toast.error("Failed to update ticket status");
      console.error(error);
    }
  };

  return (
    <Box p={3}>
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <DashboardIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Ticket Status Dashboard
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchTickets}>
                Refresh
              </Button>
              <Button variant="contained" startIcon={<AddIcon />}>
                Raise Ticket
              </Button>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ErrorIcon color="error" />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.open}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Open Tickets
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
                        {stats.pending}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Pending Tickets
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
                    <CheckCircleIcon color="success" />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.resolved}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Resolved Tickets
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
                    <DoneAllIcon color="default" />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.closed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Closed Tickets
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* View Mode Selector */}
          <Box display="flex" gap={1} mb={3}>
            <Button
              variant={viewMode === "all" ? "contained" : "outlined"}
              onClick={() => setViewMode("all")}
              size="small"
            >
              All ({stats.total})
            </Button>
            <Button
              variant={viewMode === "open" ? "contained" : "outlined"}
              onClick={() => setViewMode("open")}
              size="small"
              color="error"
            >
              Open ({stats.open})
            </Button>
            <Button
              variant={viewMode === "pending" ? "contained" : "outlined"}
              onClick={() => setViewMode("pending")}
              size="small"
              color="warning"
            >
              Pending ({stats.pending})
            </Button>
            <Button
              variant={viewMode === "resolved" ? "contained" : "outlined"}
              onClick={() => setViewMode("resolved")}
              size="small"
              color="success"
            >
              Resolved ({stats.resolved})
            </Button>
            <Button
              variant={viewMode === "closed" ? "contained" : "outlined"}
              onClick={() => setViewMode("closed")}
              size="small"
              color="default"
            >
              Closed ({stats.closed})
            </Button>
          </Box>

          {/* Filters */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Category"
                size="small"
                fullWidth
                value={filters.category}
                onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
              >
                <MenuItem value="">All Categories</MenuItem>
                {TICKET_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Priority"
                size="small"
                fullWidth
                value={filters.priority}
                onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
              >
                <MenuItem value="">All Priorities</MenuItem>
                {TICKET_PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
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
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
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

          {/* Tickets Table */}
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
                  {tickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
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
                          />
                        </TableCell>
                        <TableCell>
                          {ticket.assigned_to?.username || ticket.raised_by?.username || "—"}
                        </TableCell>
                        <TableCell align="right">
                          {/* Status Action Buttons */}
                          {ticket.status !== "Closed" && (
                            <>
                              {ticket.status === "New" && (
                                <Tooltip title="Assign Ticket">
                                  <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "Open")}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {ticket.status === "Open" && (
                                <>
                                  <Tooltip title="Start Work">
                                    <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "In Progress")}>
                                      <PlayArrowIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reassign">
                                    <IconButton size="small">
                                      <SwapVertIcon fontSize="small" />
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
                                    <IconButton size="small">
                                      <SwapVertIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                              {ticket.status === "Resolved" && (
                                <>
                                  <Tooltip title="Close Ticket">
                                    <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "Closed")}>
                                      <DoneAllIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Reopen">
                                    <IconButton size="small" onClick={() => updateTicketStatus(ticket._id, "Open")}>
                                      <ReplayIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
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
                            </>
                          )}

                          {/* Edit and Delete Buttons */}
                          <Tooltip title="Edit Details">
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
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

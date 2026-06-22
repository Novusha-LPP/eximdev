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
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Tabs,
  Tab,
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
  Chip,
} from "@mui/material";
import {
  AnalyticsIcon,
  BarChartIcon,
  PieChartIcon,
  LineChartIcon,
  TableChartIcon,
  RefreshIcon,
  CalendarIcon,
  PeopleIcon,
  AssignmentIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PriorityHighIcon,
  TimerIcon,
  CheckCircleIcon,
  DoneAllIcon,
  ErrorIcon,
  WarningIcon,
  InfoIcon,
  FilterListIcon,
  DownloadIcon,
  SettingsIcon,
  CloseIcon,
} from "@mui/icons-material";

const TIME_PERIODS = ["Today", "Last 7 Days", "Last 30 Days", "Last Quarter", "Last Year", "All Time"];
const TICKET_STATUSES = ["New", "Open", "In Progress", "Pending", "Resolved", "Closed"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];

export default function TicketAnalytics() {
  const [loading, setLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState("Last 30 Days");
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    criticalTickets: 0,
    averageResolutionTime: 0,
    ticketsByCategory: {},
    ticketsByPriority: {},
    ticketsByStatus: {},
    ticketsByAssignee: {},
    ticketsByMonth: {},
    resolutionTrend: [],
    workloadDistribution: [],
  });
  const [topPerformers, setTopPerformers] = useState([]);
  const [ticketsNeedingAttention, setTicketsNeedingAttention] = useState([]);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the API
      // const response = await itHelpdeskAPI.tickets.getAnalytics(timePeriod);
      // setStats(response.data.stats || {});
      // setTopPerformers(response.data.topPerformers || []);
      // setTicketsNeedingAttention(response.data.ticketsNeedingAttention || []);

      // Mock data for now
      const mockStats = {
        totalTickets: 156,
        openTickets: 42,
        resolvedTickets: 89,
        closedTickets: 25,
        criticalTickets: 8,
        averageResolutionTime: "2.5 days",
        ticketsByCategory: {
          Hardware: 45,
          Software: 62,
          Network: 28,
          Access: 15,
          Other: 6,
        },
        ticketsByPriority: {
          Low: 35,
          Medium: 78,
          High: 32,
          Critical: 11,
        },
        ticketsByStatus: {
          New: 12,
          Open: 18,
          "In Progress": 24,
          Pending: 8,
          Resolved: 65,
          Closed: 25,
        },
        ticketsByAssignee: {
          "John Doe": 32,
          "Jane Smith": 28,
          "Robert Johnson": 24,
          "Emily Davis": 18,
          "Michael Wilson": 15,
          "Unassigned": 39,
        },
        ticketsByMonth: {
          "Jan": 45,
          "Feb": 52,
          "Mar": 38,
          "Apr": 41,
          "May": 48,
          "Jun": 56,
        },
        resolutionTrend: [
          { month: "Jan", resolved: 32 },
          { month: "Feb", resolved: 38 },
          { month: "Mar", resolved: 29 },
          { month: "Apr", resolved: 35 },
          { month: "May", resolved: 42 },
          { month: "Jun", resolved: 48 },
        ],
        workloadDistribution: [
          { name: "John Doe", value: 32 },
          { name: "Jane Smith", value: 28 },
          { name: "Robert Johnson", value: 24 },
          { name: "Emily Davis", value: 18 },
          { name: "Michael Wilson", value: 15 },
          { name: "Unassigned", value: 39 },
        ],
      };

      const mockTopPerformers = [
        { name: "John Doe", resolvedTickets: 28, avgResolutionTime: "1.2 days" },
        { name: "Jane Smith", resolvedTickets: 24, avgResolutionTime: "1.5 days" },
        { name: "Robert Johnson", resolvedTickets: 20, avgResolutionTime: "1.8 days" },
      ];

      const mockTicketsNeedingAttention = [
        { id: "TKT-001", title: "Network connectivity issue", priority: "High", daysOpen: 5 },
        { id: "TKT-003", title: "Software installation request", priority: "Medium", daysOpen: 3 },
        { id: "TKT-005", title: "Printer not working", priority: "Low", daysOpen: 7 },
      ];

      setStats(mockStats);
      setTopPerformers(mockTopPerformers);
      setTicketsNeedingAttention(mockTicketsNeedingAttention);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

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

  return (
    <Box p={3}>
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <AnalyticsIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Ticket Analytics Dashboard
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Time Period</InputLabel>
                <Select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  label="Time Period"
                >
                  {TIME_PERIODS.map((period) => (
                    <MenuItem key={period} value={period}>
                      {period}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAnalytics}>
                Refresh
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />}>
                Export
              </Button>
            </Box>
          </Box>

          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
            <Tab label="Overview" icon={<BarChartIcon />} />
            <Tab label="Trends" icon={<LineChartIcon />} />
            <Tab label="Performance" icon={<PieChartIcon />} />
            <Tab label="Reports" icon={<TableChartIcon />} />
          </Tabs>

          {activeTab === 0 && (
            <>
              {/* Key Metrics */}
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <AssignmentIcon color="primary" />
                        <Box>
                          <Typography variant="h4" fontWeight={700}>
                            {stats.totalTickets}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Tickets
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <ErrorIcon color="error" />
                        <Box>
                          <Typography variant="h4" fontWeight={700}>
                            {stats.openTickets}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Open Tickets
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <CheckCircleIcon color="success" />
                        <Box>
                          <Typography variant="h4" fontWeight={700}>
                            {stats.resolvedTickets}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Resolved Tickets
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={2}>
                        <TimerIcon color="warning" />
                        <Box>
                          <Typography variant="h4" fontWeight={700}>
                            {stats.averageResolutionTime}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Avg. Resolution Time
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Charts and Stats */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={600}>
                          Tickets by Category
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container>
                        {Object.entries(stats.ticketsByCategory).map(([category, count]) => (
                          <Grid item xs={12} key={category} mb={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2">{category}</Typography>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight={500}>{count}</Typography>
                                <Box sx={{ width: 100, height: 8, bgcolor: "grey.200", borderRadius: 4, overflow: "hidden" }}>
                                  <Box
                                    sx={{
                                      height: "100%",
                                      bgcolor: "primary.main",
                                      width: `${(count / Math.max(...Object.values(stats.ticketsByCategory))) * 100}%`
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight={600}>
                          Tickets by Priority
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container>
                        {Object.entries(stats.ticketsByPriority).map(([priority, count]) => (
                          <Grid item xs={12} key={priority} mb={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box display="flex" alignItems="center" gap={1}>
                                <PriorityHighIcon color={getPriorityColor(priority)} />
                                <Typography variant="body2">{priority}</Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight={500}>{count}</Typography>
                                <Box sx={{ width: 100, height: 8, bgcolor: "grey.200", borderRadius: 4, overflow: "hidden" }}>
                                  <Box
                                    sx={{
                                      height: "100%",
                                      bgcolor: getPriorityColor(priority) === "error" ? "error.main" : 
                                              getPriorityColor(priority) === "warning" ? "warning.main" :
                                              getPriorityColor(priority) === "info" ? "info.main" : "success.main",
                                      width: `${(count / Math.max(...Object.values(stats.ticketsByPriority))) * 100}%`
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Tickets Needing Attention */}
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                      Tickets Needing Attention
                    </Typography>
                    <Button variant="outlined" size="small">
                      View All
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <List>
                    {ticketsNeedingAttention.map((ticket) => (
                      <ListItem key={ticket.id}>
                        <ListItemAvatar>
                          <Avatar>
                            <ErrorIcon color={getPriorityColor(ticket.priority)} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1">{ticket.title}</Typography>
                              <Chip 
                                label={ticket.id} 
                                size="small" 
                                variant="outlined" 
                                color={getPriorityColor(ticket.priority)}
                              />
                            </Box>
                          }
                          secondary={
                            <Box display="flex" alignItems="center" gap={2}>
                              <Typography variant="body2" color="text.secondary">
                                Open for {ticket.daysOpen} days
                              </Typography>
                              <Chip 
                                label={ticket.priority} 
                                size="small" 
                                color={getPriorityColor(ticket.priority)}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight={600}>
                        Resolution Trend
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ height: 300, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      {stats.resolutionTrend.map((item, index) => (
                        <Box key={index} display="flex" alignItems="center" gap={2}>
                          <Typography variant="body2" sx={{ minWidth: 50 }}>{item.month}</Typography>
                          <Box sx={{ width: "100%", height: 30, display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                              sx={{
                                height: "100%",
                                width: `${(item.resolved / Math.max(...stats.resolutionTrend.map(i => i.resolved))) * 100}%`,
                                bgcolor: "primary.main",
                                borderRadius: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                pr: 1,
                              }}
                            >
                              <Typography variant="caption" color="white">{item.resolved}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight={600}>
                        Workload Distribution
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ height: 300, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      {stats.workloadDistribution.map((item, index) => (
                        <Box key={index} display="flex" alignItems="center" gap={2}>
                          <Typography variant="body2" sx={{ minWidth: 100 }}>{item.name}</Typography>
                          <Box sx={{ width: "100%", height: 30, display: "flex", alignItems: "center", gap: 1 }}>
                            <Box
                              sx={{
                                height: "100%",
                                width: `${(item.value / Math.max(...stats.workloadDistribution.map(i => i.value))) * 100}%`,
                                bgcolor: "secondary.main",
                                borderRadius: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                pr: 1,
                              }}
                            >
                              <Typography variant="caption" color="white">{item.value}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight={600}>
                        Top Performers
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <List>
                      {topPerformers.map((performer, index) => (
                        <ListItem key={index}>
                          <ListItemAvatar>
                            <Avatar>
                              <TrendingUpIcon color="success" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body1">{performer.name}</Typography>
                                <Chip 
                                  label={`#${index + 1}`} 
                                  size="small" 
                                  color="primary"
                                />
                              </Box>
                            }
                            secondary={
                              <Box display="flex" alignItems="center" gap={2}>
                                <Typography variant="body2" color="text.secondary">
                                  {performer.resolvedTickets} tickets resolved
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Avg. {performer.avgResolutionTime}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight={600}>
                        Tickets by Status
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container>
                      {Object.entries(stats.ticketsByStatus).map(([status, count]) => (
                        <Grid item xs={12} key={status} mb={1}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center" gap={1}>
                              <CheckCircleIcon color={getStatusColor(status)} />
                              <Typography variant="body2">{status}</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" fontWeight={500}>{count}</Typography>
                              <Box sx={{ width: 100, height: 8, bgcolor: "grey.200", borderRadius: 4, overflow: "hidden" }}>
                                <Box
                                  sx={{
                                    height: "100%",
                                    bgcolor: getStatusColor(status) === "error" ? "error.main" : 
                                            getStatusColor(status) === "warning" ? "warning.main" :
                                            getStatusColor(status) === "info" ? "info.main" : "success.main",
                                    width: `${(count / Math.max(...Object.values(stats.ticketsByStatus))) * 100}%`
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Ticket Reports
                  </Typography>
                  <Button variant="contained" startIcon={<DownloadIcon />}>
                    Generate Report
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="body1" fontWeight={500}>Open Tickets Report</Typography>
                      <Typography variant="caption" color="text.secondary">List of all open tickets</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="body1" fontWeight={500}>Resolution Time Report</Typography>
                      <Typography variant="caption" color="text.secondary">Average resolution time by category</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: "center" }}>
                      <Typography variant="body1" fontWeight={500}>Performance Report</Typography>
                      <Typography variant="caption" color="text.secondary">Agent performance metrics</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

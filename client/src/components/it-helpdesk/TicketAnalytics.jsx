import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
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
  Analytics as AnalyticsIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
  TableChart as TableChartIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  PriorityHigh as PriorityHighIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  DoneAll as DoneAllIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
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
  const [reportTickets, setReportTickets] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range based on timePeriod
      const toDate = new Date();
      let fromDate = new Date();
      if (timePeriod === "Today") fromDate.setDate(fromDate.getDate() - 1);
      else if (timePeriod === "Last 7 Days") fromDate.setDate(fromDate.getDate() - 7);
      else if (timePeriod === "Last 30 Days") fromDate.setDate(fromDate.getDate() - 30);
      else if (timePeriod === "Last Quarter") fromDate.setMonth(fromDate.getMonth() - 3);
      else if (timePeriod === "Last Year") fromDate.setFullYear(fromDate.getFullYear() - 1);
      else fromDate = null; // All Time

      const params = {};
      if (fromDate) {
        params.from = fromDate.toISOString();
        params.to = toDate.toISOString();
      }

      const res = await itHelpdeskAPI.tickets.getReport(params);
      const { byStatus, byCategory, byPriority, byDepartment, recentActivity } = res.data;

      // Transform array data into mapped objects for the UI
      const mapData = (arr) => arr.reduce((acc, curr) => ({ ...acc, [curr._id || "Unknown"]: curr.count }), {});

      const transformedStats = {
        totalTickets: byStatus.reduce((acc, curr) => acc + curr.count, 0),
        openTickets: byStatus.find(s => s._id === "New" || s._id === "Assigned" || s._id === "In Progress")?.count || 0,
        resolvedTickets: byStatus.find(s => s._id === "Resolved")?.count || 0,
        closedTickets: byStatus.find(s => s._id === "Closed")?.count || 0,
        criticalTickets: byPriority.find(p => p._id === "Critical")?.count || 0,
        averageResolutionTime: "N/A", // Need a complex aggregation for accurate avg time
        ticketsByCategory: mapData(byCategory),
        ticketsByPriority: mapData(byPriority),
        ticketsByStatus: mapData(byStatus),
        ticketsByAssignee: mapData(byDepartment), // Repurposing assignee UI for department in this view
        ticketsByMonth: mapData(recentActivity),
        resolutionTrend: recentActivity.map(r => ({ month: r._id, resolved: r.count })),
        workloadDistribution: byDepartment.map(d => ({ name: d._id || "Unknown", value: d.count })),
      };

      setStats(transformedStats);
      setTopPerformers([]); // Optional: implement top performers query in backend
      setTicketsNeedingAttention([]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all tickets for the reports tab
  const fetchReportTickets = async () => {
    setReportLoading(true);
    try {
      const res = await itHelpdeskAPI.tickets.getAll({ limit: 10000 });
      setReportTickets(res.data || []);
    } catch (err) {
      console.error("Error fetching report tickets:", err);
      toast.error("Failed to load report data");
    } finally {
      setReportLoading(false);
    }
  };

  const handleGenerateReport = () => {
    if (!reportTickets.length) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: All Tickets
    const allData = [["Ticket ID", "Title", "Category", "Priority", "Status", "Department", "Assigned To", "Created Date"]];
    reportTickets.forEach(t => allData.push([
      t.ticket_id || t._id,
      t.title || "",
      t.category || "",
      t.priority || "",
      t.status || "",
      t.department || "—",
      t.assigned_to?.username || t.assigned_to?.email || "Unassigned",
      t.createdAt ? new Date(t.createdAt).toLocaleString() : ""
    ]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(allData), "All Tickets");

    // Sheet 2: Open Tickets
    const openStatuses = ["New", "Open", "In Progress", "Assigned", "Pending"];
    const openData = [["Ticket ID", "Title", "Priority", "Status", "Department", "Created Date"]];
    reportTickets.filter(t => openStatuses.includes(t.status)).forEach(t => openData.push([
      t.ticket_id || t._id,
      t.title || "",
      t.priority || "",
      t.status || "",
      t.department || "—",
      t.createdAt ? new Date(t.createdAt).toLocaleString() : ""
    ]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(openData), "Open Tickets");

    // Sheet 3: By Status Summary
    const statusMap = {};
    reportTickets.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
    const statusData = [["Status", "Count"]];
    Object.entries(statusMap).forEach(([k, v]) => statusData.push([k, v]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statusData), "By Status");

    // Sheet 4: By Priority Summary
    const priorityMap = {};
    reportTickets.forEach(t => { priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1; });
    const priorityData = [["Priority", "Count"]];
    Object.entries(priorityMap).forEach(([k, v]) => priorityData.push([k, v]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(priorityData), "By Priority");

    XLSX.writeFile(wb, `Ticket_Reports_${new Date().toLocaleDateString().replace(/\//g, "-")}.xlsx`);
    toast.success("Report downloaded successfully!");
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

  useEffect(() => {
    if (activeTab === 3) fetchReportTickets();
  }, [activeTab]);

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
            <Box>
              {/* Report Header */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>Ticket Reports</Typography>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleGenerateReport}
                  disabled={reportLoading || reportTickets.length === 0}
                >
                  {reportLoading ? "Loading..." : "Download Excel Report"}
                </Button>
              </Box>

              {reportLoading ? (
                <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
              ) : (
                <Grid container spacing={3}>
                  {/* Summary Cards */}
                  {[
                    { label: "Total Tickets", value: reportTickets.length, color: "primary.main" },
                    { label: "Open / In Progress", value: reportTickets.filter(t => ["New","Open","In Progress","Assigned","Pending"].includes(t.status)).length, color: "warning.main" },
                    { label: "Resolved", value: reportTickets.filter(t => t.status === "Resolved").length, color: "success.main" },
                    { label: "Critical Priority", value: reportTickets.filter(t => t.priority === "Critical").length, color: "error.main" },
                  ].map(card => (
                    <Grid item xs={6} md={3} key={card.label}>
                      <Card sx={{ border: `2px solid`, borderColor: card.color }}>
                        <CardContent sx={{ textAlign: "center", py: 2 }}>
                          <Typography variant="h4" fontWeight={700} color={card.color}>{card.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}

                  {/* Tickets by Status Table */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} mb={2}>Tickets by Status</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {Object.entries(
                          reportTickets.reduce((acc, t) => { acc[t.status || "Unknown"] = (acc[t.status || "Unknown"] || 0) + 1; return acc; }, {})
                        ).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                          <Box key={status} display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip label={status} size="small" color={getStatusColor(status)} />
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography fontWeight={600}>{count}</Typography>
                              <Box sx={{ width: 80, height: 8, bgcolor: "grey.200", borderRadius: 4, overflow: "hidden" }}>
                                <Box sx={{ height: "100%", bgcolor: "primary.main", width: `${(count / reportTickets.length) * 100}%` }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary">{Math.round((count / reportTickets.length) * 100)}%</Typography>
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Tickets by Priority Table */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} mb={2}>Tickets by Priority</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {Object.entries(
                          reportTickets.reduce((acc, t) => { acc[t.priority || "Unknown"] = (acc[t.priority || "Unknown"] || 0) + 1; return acc; }, {})
                        ).sort((a, b) => b[1] - a[1]).map(([priority, count]) => (
                          <Box key={priority} display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Chip label={priority} size="small" color={getPriorityColor(priority)} />
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography fontWeight={600}>{count}</Typography>
                              <Box sx={{ width: 80, height: 8, bgcolor: "grey.200", borderRadius: 4, overflow: "hidden" }}>
                                <Box sx={{ height: "100%", bgcolor: "error.main", width: `${(count / reportTickets.length) * 100}%` }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary">{Math.round((count / reportTickets.length) * 100)}%</Typography>
                            </Box>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Open Tickets List */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" fontWeight={600} mb={2}>
                          Open Tickets ({reportTickets.filter(t => ["New","Open","In Progress","Assigned","Pending"].includes(t.status)).length})
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                            <thead>
                              <tr style={{ background: "#f5f5f5" }}>
                                {["Ticket ID", "Title", "Category", "Priority", "Status", "Department", "Created"].map(col => (
                                  <th key={col} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #e0e0e0" }}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {reportTickets
                                .filter(t => ["New","Open","In Progress","Assigned","Pending"].includes(t.status))
                                .slice(0, 20)
                                .map((t, i) => (
                                  <tr key={t._id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontFamily: "monospace", fontSize: 12 }}>{t.ticket_id || t._id?.slice(-6)}</td>
                                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>{t.title}</td>
                                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>{t.category || "—"}</td>
                                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>{t.priority || "—"}</td>
                                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>{t.status}</td>
                                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>{t.department || "—"}</td>
                                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontSize: 12 }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
                                  </tr>
                                ))}
                              {reportTickets.filter(t => ["New","Open","In Progress","Assigned","Pending"].includes(t.status)).length === 0 && (
                                <tr><td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#999" }}>No open tickets found</td></tr>
                              )}
                            </tbody>
                          </table>
                          {reportTickets.filter(t => ["New","Open","In Progress","Assigned","Pending"].includes(t.status)).length > 20 && (
                            <Typography variant="caption" color="text.secondary" mt={1} display="block" textAlign="center">
                              Showing first 20 records. Download Excel for full list.
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

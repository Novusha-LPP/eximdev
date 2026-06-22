import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Button,
  LinearProgress,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
  ComputerIcon from "@mui/icons-material/Computer";
  LaptopMacIcon from "@mui/icons-material/LaptopMac";
  MonitorIcon from "@mui/icons-material/Monitor";
  PrintIcon from "@mui/icons-material/Print";
  RouterIcon from "@mui/icons-material/Router";
  PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
  SimCardIcon from "@mui/icons-material/SimCard";
  StorageIcon from "@mui/icons-material/Storage";
  CableIcon from "@mui/icons-material/Cable";
  DevicesOtherIcon from "@mui/icons-material/DevicesOther";
  AssignmentIcon from "@mui/icons-material/Assignment";
  CheckCircleIcon from "@mui/icons-material/CheckCircle";
  ErrorIcon from "@mui/icons-material/Error";
  HelpIcon from "@mui/icons-material/Help";
  TrendingUpIcon from "@mui/icons-material/TrendingUp";
  BarChartIcon from "@mui/icons-material/BarChart";
  PieChartIcon from "@mui/icons-material/PieChart";
  TableChartIcon from "@mui/icons-material/TableChart";

// Asset categories
const ASSET_CATEGORIES = [
  "Computers",
  "Laptops",
  "Monitors",
  "Printers",
  "Network Devices",
  "Software Inventory",
  "Phones",
  "SIM Cards",
  "Racks",
  "Cables",
  "Peripheral Devices",
  "Unmanaged Assets"
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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    openTickets: 0,
    closedTickets: 0,
    pendingRequests: 0,
    assetStatus: {},
    ticketAnalytics: {}
  });

  // Fetch dashboard data
  const fetchDashboardData = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockStats = {
        totalAssets: 245,
        openTickets: 24,
        closedTickets: 186,
        pendingRequests: 8,
        assetStatus: {
          Active: 180,
          "In Use": 30,
          Available: 15,
          "Under Maintenance": 12,
          Retired: 5,
          Disposed: 3
        },
        ticketAnalytics: {
          New: 5,
          Assigned: 8,
          "In Progress": 7,
          Pending: 4,
          Resolved: 12,
          Closed: 186
        }
      };
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  };

  // Initialize dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case "Computers":
        return <ComputerIcon />;
      case "Laptops":
        return <LaptopMacIcon />;
      case "Monitors":
        return <MonitorIcon />;
      case "Printers":
        return <PrintIcon />;
      case "Network Devices":
        return <RouterIcon />;
      case "Phones":
        return <PhoneAndroidIcon />;
      case "SIM Cards":
        return <SimCardIcon />;
      case "Software Inventory":
        return <Inventory2Icon />;
      case "Racks":
        return <StorageIcon />;
      case "Cables":
        return <CableIcon />;
      default:
        return <DevicesOtherIcon />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "success";
      case "In Use":
        return "info";
      case "Available":
        return "default";
      case "Under Maintenance":
        return "warning";
      case "Retired":
        return "secondary";
      case "Disposed":
        return "error";
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

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <DashboardIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          IT Asset & Helpdesk Management Portal
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="dashboard-tabs">
        <Tab label="Overview" value="overview" />
        <Tab label="Asset Analytics" value="assets" />
        <Tab label="Ticket Analytics" value="tickets" />
      </Tabs>

      <Box mt={2}>
        {activeTab === "overview" && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ComputerIcon color="primary" />
                    <Box>
                      <Typography variant="h4">{stats.totalAssets}</Typography>
                      <Typography variant="body2" color="text.secondary">Total Assets</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <ErrorIcon color="error" />
                    <Box>
                      <Typography variant="h4">{stats.openTickets}</Typography>
                      <Typography variant="body2" color="text.secondary">Open Tickets</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CheckCircleIcon color="success" />
                    <Box>
                      <Typography variant="h4">{stats.closedTickets}</Typography>
                      <Typography variant="body2" color="text.secondary">Closed Tickets</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <HelpIcon color="warning" />
                    <Box>
                      <Typography variant="h4">{stats.pendingRequests}</Typography>
                      <Typography variant="body2" color="text.secondary">Pending Requests</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Asset Status Summary</Typography>
                  {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {Object.entries(stats.assetStatus).map(([status, count]) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={status}>
                          <Box p={2} border="1px solid #eee" borderRadius={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="body1">{status}</Typography>
                              <Chip 
                                label={count} 
                                color={getStatusColor(status)} 
                                size="small" 
                              />
                            </Box>
                            <Box height={8} bgcolor="#f0f0f0" borderRadius={1} overflow="hidden">
                              <Box 
                                height="100%" 
                                bgcolor={getStatusColor(status) === "success" ? "#4caf50" : 
                                        getStatusColor(status) === "error" ? "#f44336" : 
                                        getStatusColor(status) === "warning" ? "#ff9800" : 
                                        getStatusColor(status) === "info" ? "#2196f3" : "#9e9e9e"}
                                width={`${(count / stats.totalAssets) * 100}%`}
                              />
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Ticket Analytics & Charts</Typography>
                  {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box p={2} border="1px solid #eee" borderRadius={1}>
                          <Typography variant="subtitle1" gutterBottom>Ticket Status Distribution</Typography>
                          <Box height={200} display="flex" alignItems="flex-end" gap={1}>
                            {Object.entries(stats.ticketAnalytics).map(([status, count]) => (
                              <Box key={status} flexGrow={1} display="flex" flexDirection="column" alignItems="center">
                                <Box 
                                  height={`${(count / stats.openTickets) * 100}%`}
                                  width="100%"
                                  bgcolor={getStatusColor(status) === "success" ? "#4caf50" : 
                                          getStatusColor(status) === "error" ? "#f44336" : 
                                          getStatusColor(status) === "warning" ? "#ff9800" : 
                                          getStatusColor(status) === "info" ? "#2196f3" : "#9e9e9e"}
                                  borderRadius={1}
                                />
                                <Typography variant="caption" mt={1}>{status}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box p={2} border="1px solid #eee" borderRadius={1}>
                          <Typography variant="subtitle1" gutterBottom>Ticket Resolution Rate</Typography>
                          <Box height={200} display="flex" flexDirection="column" justifyContent="center">
                            <Box display="flex" alignItems="center" mb={2}>
                              <Box width="100%" height={20} bgcolor="#e0e0e0" borderRadius={10} overflow="hidden">
                                <Box width="85%" height="100%" bgcolor="#4caf50" />
                              </Box>
                              <Typography variant="body1" ml={2}>85%</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {stats.closedTickets} of {stats.openTickets + stats.closedTickets} tickets resolved
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === "assets" && (
          <Grid container spacing={3}>
            {ASSET_CATEGORIES.map(category => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={category}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      {getCategoryIcon(category)}
                      <Typography variant="h6">{category}</Typography>
                    </Box>
                    <Typography variant="h4">24</Typography>
                    <Typography variant="body2" color="text.secondary">Assets</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {activeTab === "tickets" && (
          <Grid container spacing={3}>
            {TICKET_STATUSES.map(status => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={status}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Box width={10} height={10} borderRadius="50%" bgcolor={getStatusColor(status)} />
                      <Typography variant="h6">{status}</Typography>
                    </Box>
                    <Typography variant="h4">
                      {status === "New" ? 5 : 
                       status === "Assigned" ? 8 : 
                       status === "In Progress" ? 7 : 
                       status === "Pending" ? 4 : 
                       status === "Resolved" ? 12 : 186}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Tickets</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

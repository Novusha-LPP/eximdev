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
  TrendingUpIcon from "@mui/icons-material/TrendingUp";
  WarningIcon from "@mui/icons-material/Warning";
  CalendarTodayIcon from "@mui/icons-material/CalendarToday";

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

// Asset statuses
const ASSET_STATUSES = [
  "Active",
  "In Use",
  "Available",
  "Under Maintenance",
  "Retired",
  "Disposed"
];

export default function AssetDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeAssets: 0,
    underMaintenance: 0,
    warrantyExpiring: 0,
    assetsByCategory: {},
    assetsByStatus: {},
    recentAssets: [],
    maintenanceSchedule: []
  });

  // Fetch dashboard data
  const fetchDashboardData = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockStats = {
        totalAssets: 245,
        activeAssets: 210,
        underMaintenance: 12,
        warrantyExpiring: 8,
        assetsByCategory: {
          Computers: 45,
          Laptops: 62,
          Monitors: 38,
          Printers: 15,
          "Network Devices": 25,
          "Software Inventory": 18,
          Phones: 20,
          "SIM Cards": 5,
          Racks: 8,
          Cables: 4,
          "Peripheral Devices": 5
        },
        assetsByStatus: {
          Active: 180,
          "In Use": 30,
          Available: 15,
          "Under Maintenance": 12,
          Retired: 5,
          Disposed: 3
        },
        recentAssets: [
          { id: 1, tag: "TAG-001", category: "Computers", date: "2023-07-15" },
          { id: 2, tag: "TAG-002", category: "Laptops", date: "2023-07-12" },
          { id: 3, tag: "TAG-003", category: "Monitors", date: "2023-07-10" }
        ],
        maintenanceSchedule: [
          { id: 1, asset: "TAG-045", date: "2023-07-20", type: "Routine" },
          { id: 2, asset: "TAG-087", date: "2023-07-25", type: "Hardware" },
          { id: 3, asset: "TAG-123", date: "2023-07-28", type: "Software" }
        ]
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
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <DashboardIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Asset Dashboard
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="asset-dashboard-tabs">
        <Tab label="Overview" value="overview" />
        <Tab label="Category Breakdown" value="categories" />
        <Tab label="Maintenance Schedule" value="maintenance" />
        <Tab label="Warranty Status" value="warranty" />
      </Tabs>

      <Box mt={2}>
        {activeTab === "overview" && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <DashboardIcon color="primary" />
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
                    <TrendingUpIcon color="success" />
                    <Box>
                      <Typography variant="h4">{stats.activeAssets}</Typography>
                      <Typography variant="body2" color="text.secondary">Active Assets</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <WarningIcon color="warning" />
                    <Box>
                      <Typography variant="h4">{stats.underMaintenance}</Typography>
                      <Typography variant="body2" color="text.secondary">Under Maintenance</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CalendarTodayIcon color="error" />
                    <Box>
                      <Typography variant="h4">{stats.warrantyExpiring}</Typography>
                      <Typography variant="body2" color="text.secondary">Warranty Expiring</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Assets</Typography>
                  {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {stats.recentAssets.map(asset => (
                        <Grid item xs={12} sm={6} md={4} key={asset.id}>
                          <Box display="flex" alignItems="center" gap={2} p={2} border="1px solid #eee" borderRadius={1}>
                            {getCategoryIcon(asset.category)}
                            <Box>
                              <Typography variant="body1">{asset.tag}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {asset.category} • {asset.date}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === "categories" && (
          <Grid container spacing={3}>
            {ASSET_CATEGORIES.map(category => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={category}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      {getCategoryIcon(category)}
                      <Typography variant="h6">{category}</Typography>
                    </Box>
                    <Typography variant="h4">{stats.assetsByCategory[category] || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Assets</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {activeTab === "maintenance" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Maintenance Schedule</Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {stats.maintenanceSchedule.map(maintenance => (
                    <Grid item xs={12} sm={6} md={4} key={maintenance.id}>
                      <Box p={2} border="1px solid #eee" borderRadius={1}>
                        <Typography variant="body1">{maintenance.asset}</Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                          <Typography variant="caption" color="text.secondary">{maintenance.date}</Typography>
                          <Chip label={maintenance.type} size="small" />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "warranty" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Assets by Warranty Status</Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {Object.entries(stats.assetsByStatus).map(([status, count]) => (
                    <Grid item xs={12} sm={6} md={4} key={status}>
                      <Box p={2} border="1px solid #eee" borderRadius={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body1">{status}</Typography>
                          <Chip 
                            label={count} 
                            color={getStatusColor(status)} 
                            size="small" 
                          />
                        </Box>
                        <Box height={10} bgcolor="#f0f0f0" borderRadius={1} overflow="hidden">
                          <Box 
                            height="100%" 
                            bgcolor={getStatusColor(status).replace("default", "#ccc")} 
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
        )}
      </Box>
    </Box>
  );
}

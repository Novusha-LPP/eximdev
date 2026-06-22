import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Select,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toast } from "react-hot-toast";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// Audit action types
const AUDIT_ACTIONS = [
  "Login",
  "Logout",
  "User Created",
  "User Updated",
  "User Deleted",
  "Role Created",
  "Role Updated",
  "Role Deleted",
  "Permission Updated",
  "Ticket Created",
  "Ticket Updated",
  "Ticket Closed",
  "Asset Created",
  "Asset Updated",
  "Asset Deleted",
  "System Settings Updated",
  "Email Configuration Updated",
  "Backup Created",
  "Backup Restored"
];

// User options for filtering
const USER_OPTIONS = [
  "John Doe",
  "Jane Smith",
  "Robert Johnson",
  "Sarah Williams",
  "Michael Brown",
  "System Admin"
];

// IP address options for filtering
const IP_OPTIONS = [
  "192.168.1.100",
  "192.168.1.101",
  "192.168.1.102",
  "10.0.0.50",
  "10.0.0.51",
  "External"
];

export default function AuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterIp, setFilterIp] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  // Filter audit logs based on search term and filters
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUser = !filterUser || log.user === filterUser;
    const matchesAction = !filterAction || log.action === filterAction;
    const matchesIp = !filterIp || log.ip_address === filterIp;

    // Date filtering
    let matchesDate = true;
    if (dateRange.startDate || dateRange.endDate) {
      const logDate = new Date(log.timestamp);
      
      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && logDate >= startDate;
      }
      
      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && logDate <= endDate;
      }
    }

    return matchesSearch && matchesUser && matchesAction && matchesIp && matchesDate;
  });

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for IT Helpdesk audit logs
      const mockAuditLogs = [
        {
          id: 1,
          user: "John Doe",
          action: "Login",
          timestamp: "2023-07-16 09:30:15",
          ip_address: "192.168.1.100",
          user_agent: "Chrome/114.0.0.0",
          details: "Successful login from office network",
          severity: "info",
          module: "Authentication"
        },
        {
          id: 2,
          user: "Jane Smith",
          action: "Ticket Created",
          timestamp: "2023-07-15 14:20:30",
          ip_address: "192.168.1.101",
          user_agent: "Firefox/113.0.1",
          details: "Created ticket #TKT-20230715-001: Software installation request",
          severity: "info",
          module: "Ticket Management"
        },
        {
          id: 3,
          user: "John Doe",
          action: "User Created",
          timestamp: "2023-07-15 11:15:45",
          ip_address: "192.168.1.100",
          user_agent: "Chrome/114.0.0.0",
          details: "Created new user account for Robert Johnson with role 'Manager'",
          severity: "info",
          module: "User Management"
        },
        {
          id: 4,
          user: "Robert Johnson",
          action: "Asset Created",
          timestamp: "2023-07-14 16:45:20",
          ip_address: "10.0.0.50",
          user_agent: "Safari/16.5.1",
          details: "Added new asset: Laptop - Dell Latitude 5420 (SN: DL5420-789012)",
          severity: "info",
          module: "Asset Management"
        },
        {
          id: 5,
          user: "System Admin",
          action: "System Settings Updated",
          timestamp: "2023-07-13 10:30:10",
          ip_address: "192.168.1.102",
          user_agent: "Chrome/114.0.0.0",
          details: "Updated system configuration: Changed default ticket SLA to 24 hours",
          severity: "warning",
          module: "Administration"
        },
        {
          id: 6,
          user: "John Doe",
          action: "Login Failed",
          timestamp: "2023-07-12 09:05:25",
          ip_address: "External",
          user_agent: "Unknown",
          details: "Failed login attempt with incorrect password",
          severity: "error",
          module: "Authentication"
        },
        {
          id: 7,
          user: "Sarah Williams",
          action: "Role Updated",
          timestamp: "2023-07-11 15:20:40",
          ip_address: "10.0.0.51",
          user_agent: "Edge/114.0.1823.51",
          details: "Updated permissions for role 'IT Technician': Added asset assignment permission",
          severity: "info",
          module: "Role Management"
        },
        {
          id: 8,
          user: "Michael Brown",
          action: "Ticket Closed",
          timestamp: "2023-07-10 17:30:55",
          ip_address: "192.168.1.101",
          user_agent: "Firefox/113.0.1",
          details: "Closed ticket #TKT-20230708-003: Printer setup completed",
          severity: "info",
          module: "Ticket Management"
        },
        {
          id: 9,
          user: "System Admin",
          action: "Backup Created",
          timestamp: "2023-07-09 23:45:00",
          ip_address: "192.168.1.102",
          user_agent: "System",
          details: "System backup created successfully. Size: 2.4 GB",
          severity: "info",
          module: "Administration"
        },
        {
          id: 10,
          user: "Jane Smith",
          action: "Email Configuration Updated",
          timestamp: "2023-07-08 13:15:30",
          ip_address: "192.168.1.101",
          user_agent: "Firefox/113.0.1",
          details: "Updated SMTP server configuration for notifications",
          severity: "warning",
          module: "Administration"
        }
      ];

      setAuditLogs(mockAuditLogs);
      setLoading(false);
    }, 800);
  };

  // Open filter modal
  const handleOpenFilterModal = () => {
    setShowFilterModal(true);
  };

  // Close filter modal
  const handleCloseFilterModal = () => {
    setShowFilterModal(false);
  };

  // Apply filters
  const handleApplyFilters = () => {
    toast.success("Filters applied successfully");
    handleCloseFilterModal();
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterUser("");
    setFilterAction("");
    setFilterIp("");
    setDateRange({
      startDate: null,
      endDate: null
    });
    toast.success("Filters cleared");
    handleCloseFilterModal();
  };

  // View log details
  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  // Export logs
  const handleExportLogs = () => {
    // In a real app, this would generate and download a CSV/Excel file
    toast.success("Exporting audit logs...");
    setTimeout(() => {
      toast.success("Audit logs exported successfully");
    }, 1000);
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "info":
        return "info";
      case "warning":
        return "warning";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  // Get module color
  const getModuleColor = (module) => {
    switch (module) {
      case "Authentication":
        return "primary";
      case "User Management":
        return "success";
      case "Role Management":
        return "secondary";
      case "Ticket Management":
        return "error";
      case "Asset Management":
        return "warning";
      case "Administration":
        return "info";
      default:
        return "default";
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <HistoryIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Audit Logs
          </Typography>
        </Box>

        {/* Search and Filter Bar */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  label="Search Audit Logs"
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
                  label="User"
                  size="small"
                  fullWidth
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                >
                  <MenuItem value="">All Users</MenuItem>
                  {USER_OPTIONS.map(user => (
                    <MenuItem key={user} value={user}>{user}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={3}>
                <Select
                  label="Action"
                  size="small"
                  fullWidth
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {AUDIT_ACTIONS.map(action => (
                    <MenuItem key={action} value={action}>{action}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={handleOpenFilterModal}
                  fullWidth
                >
                  More Filters
                </Button>
              </Grid>
            </Grid>
            <Box mt={1}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredLogs.length} of {auditLogs.length} audit logs
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportLogs}
          >
            Export Logs
          </Button>
        </Box>

        {/* Audit Logs Table */}
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
                      <TableCell>Timestamp</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Module</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No audit logs found matching the criteria
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map(log => (
                        <TableRow key={log.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(log.timestamp)}
                            </Typography>
                          </TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            <Chip 
                              label={log.module} 
                              color={getModuleColor(log.module)} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={log.severity} 
                              color={getSeverityColor(log.severity)} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {log.ip_address}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {log.details}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleViewDetails(log)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
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

        {/* Filter Modal */}
        <Dialog open={showFilterModal} onClose={handleCloseFilterModal} maxWidth="sm" fullWidth>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Select
                  label="IP Address"
                  size="small"
                  fullWidth
                  value={filterIp}
                  onChange={(e) => setFilterIp(e.target.value)}
                >
                  <MenuItem value="">All IP Addresses</MenuItem>
                  {IP_OPTIONS.map(ip => (
                    <MenuItem key={ip} value={ip}>{ip}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Date range will filter logs based on timestamp
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClearFilters} color="error">
              Clear All
            </Button>
            <Button onClick={handleCloseFilterModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </DialogActions>
        </Dialog>

        {/* Log Details Modal */}
        <Dialog open={showDetailsModal} onClose={() => setShowDetailsModal(false)} maxWidth="md" fullWidth>
          {selectedLog && (
            <>
              <DialogTitle>Audit Log Details</DialogTitle>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User
                    </Typography>
                    <Typography variant="body1">{selectedLog.user}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Action
                    </Typography>
                    <Typography variant="body1">{selectedLog.action}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Timestamp
                    </Typography>
                    <Typography variant="body1">{selectedLog.timestamp}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      IP Address
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace">
                      {selectedLog.ip_address}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      User Agent
                    </Typography>
                    <Typography variant="body1">{selectedLog.user_agent}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Module
                    </Typography>
                    <Chip 
                      label={selectedLog.module} 
                      color={getModuleColor(selectedLog.module)} 
                      size="small" 
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Severity
                    </Typography>
                    <Chip 
                      label={selectedLog.severity} 
                      color={getSeverityColor(selectedLog.severity)} 
                      size="small" 
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Details
                    </Typography>
                    <Card variant="outlined" sx={{ mt: 1, p: 2, backgroundColor: 'action.hover' }}>
                      <Typography variant="body1">{selectedLog.details}</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
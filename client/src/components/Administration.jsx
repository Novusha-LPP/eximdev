import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
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
  Chip,
  FormControlLabel,
  Switch,
  Select,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SecurityIcon from "@mui/icons-material/Security";
import HistoryIcon from "@mui/icons-material/History";
import EmailIcon from "@mui/icons-material/Email";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";

const SYSTEM_SETTINGS = [
  { id: 1, name: "System Name", value: "IT Asset & Helpdesk Management Portal", type: "text" },
  { id: 2, name: "Organization Name", value: "ABC Corporation", type: "text" },
  { id: 3, name: "Default Ticket SLA", value: "P3 - Medium (24 hours)", type: "select", options: ["P1 - Critical (4 hours)", "P2 - High (8 hours)", "P3 - Medium (24 hours)", "P4 - Low (72 hours)"] },
  { id: 4, name: "Enable Two-Factor Authentication", value: true, type: "boolean" },
  { id: 5, name: "Enable Ticket Auto-Assignment", value: false, type: "boolean" },
  { id: 6, name: "Enable Email Notifications", value: true, type: "boolean" },
  { id: 7, name: "Session Timeout (minutes)", value: 30, type: "number" },
  { id: 8, name: "Max Login Attempts", value: 5, type: "number" }
];

const EMAIL_CONFIG = {
  smtp_server: "smtp.company.com",
  smtp_port: 587,
  username: "noreply@company.com",
  password: "********",
  use_tls: true,
  from_email: "it-helpdesk@company.com",
  from_name: "IT Helpdesk"
};

export default function Administration() {
  const [activeTab, setActiveTab] = useState("roles");
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [emailConfig, setEmailConfig] = useState(EMAIL_CONFIG);
  const [systemSettings, setSystemSettings] = useState(SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    setTimeout(() => {
      const mockRoles = [
        { id: 1, name: "Admin", description: "Full system access", permissions: ["All"] },
        { id: 2, name: "IT Team", description: "IT department access", permissions: ["Asset Management", "Ticket Management", "Reporting"] },
        { id: 3, name: "Manager", description: "Department manager access", permissions: ["Asset Management", "Ticket Management", "Reporting"] },
        { id: 4, name: "Employee", description: "Basic user access", permissions: ["Ticket Management"] }
      ];

      const mockPermissions = [
        { id: 1, name: "View Assets", category: "Asset Management" },
        { id: 2, name: "Add Assets", category: "Asset Management" },
        { id: 3, name: "Edit Assets", category: "Asset Management" },
        { id: 4, name: "Delete Assets", category: "Asset Management" },
        { id: 5, name: "View Tickets", category: "Ticket Management" },
        { id: 6, name: "Create Tickets", category: "Ticket Management" },
        { id: 7, name: "Edit Tickets", category: "Ticket Management" },
        { id: 8, name: "Delete Tickets", category: "Ticket Management" },
        { id: 9, name: "View Users", category: "User Management" },
        { id: 10, name: "Create Users", category: "User Management" },
        { id: 11, name: "Edit Users", category: "User Management" },
        { id: 12, name: "Delete Users", category: "User Management" },
        { id: 13, name: "View Vendors", category: "Vendor Management" },
        { id: 14, name: "Create Vendors", category: "Vendor Management" },
        { id: 15, name: "Edit Vendors", category: "Vendor Management" },
        { id: 16, name: "Delete Vendors", category: "Vendor Management" },
        { id: 17, name: "View Contracts", category: "Contract Management" },
        { id: 18, name: "Create Contracts", category: "Contract Management" },
        { id: 19, name: "Edit Contracts", category: "Contract Management" },
        { id: 20, name: "Delete Contracts", category: "Contract Management" },
        { id: 21, name: "View Licenses", category: "License Management" },
        { id: 22, name: "Create Licenses", category: "License Management" },
        { id: 23, name: "Edit Licenses", category: "License Management" },
        { id: 24, name: "Delete Licenses", category: "License Management" },
        { id: 25, name: "View Inventory", category: "Inventory Management" },
        { id: 26, name: "Create Inventory", category: "Inventory Management" },
        { id: 27, name: "Edit Inventory", category: "Inventory Management" },
        { id: 28, name: "Delete Inventory", category: "Inventory Management" },
        { id: 29, name: "View Reports", category: "Reporting" },
        { id: 30, name: "Generate Reports", category: "Reporting" },
        { id: 31, name: "Export Reports", category: "Reporting" }
      ];

      const mockAuditLogs = [
        { id: 1, user: "John Doe", action: "Login", timestamp: "2023-07-16 09:30:00", details: "Logged in from 192.168.1.100" },
        { id: 2, user: "Jane Smith", action: "User Created", timestamp: "2023-07-15 14:20:00", details: "Created new user: Robert Johnson" },
        { id: 3, user: "Robert Johnson", action: "Ticket Created", timestamp: "2023-07-14 11:15:00", details: "Created new ticket: Software installation request" }
      ];

      setRoles(mockRoles);
      setPermissions(mockPermissions);
      setAuditLogs(mockAuditLogs);
      setLoading(false);
    }, 500);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Admin":
        return "error";
      case "IT Team":
        return "primary";
      case "Manager":
        return "secondary";
      case "Employee":
        return "default";
      default:
        return "default";
    }
  };

  const updateSystemSetting = (id, value) => {
    setSystemSettings(prev =>
      prev.map(setting =>
        setting.id === id ? { ...setting, value } : setting
      )
    );
    toast.success("Setting updated successfully");
  };

  const saveEmailConfig = () => {
    setEmailConfig(emailConfig);
    toast.success("Email configuration saved successfully");
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <AdminPanelSettingsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Administration
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="admin tabs">
          <Tab label="Roles & Permissions" value="roles" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Audit Logs" value="audit" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Email Configuration" value="email" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="System Settings" value="settings" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box mt={2}>
        {activeTab === "roles" && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Roles & Permissions</Typography>
                <Button variant="contained" startIcon={<AddIcon />}>
                  Add Role
                </Button>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {roles.map(role => (
                    <Grid item xs={12} key={role.id}>
                      <Card sx={{ border: "1px solid #e0e0e0" }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Box>
                              <Typography variant="subtitle1">{role.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{role.description}</Typography>
                            </Box>
                            <Chip
                              label={role.name}
                              color={getRoleColor(role.name)}
                              size="small"
                            />
                          </Box>
                          <Box mt={1}>
                            <Typography variant="body2" gutterBottom>Permissions:</Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                              {role.permissions.map(permission => (
                                <Chip key={permission} label={permission} size="small" variant="outlined" />
                              ))}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "audit" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Audit Logs</Typography>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No audit logs found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell>{log.user}</TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>{log.timestamp}</TableCell>
                            <TableCell>{log.details}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "email" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Email Configuration</Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Server"
                    name="smtp_server"
                    value={emailConfig.smtp_server}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_server: e.target.value })}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Port"
                    name="smtp_port"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: e.target.value })}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Username"
                    name="username"
                    value={emailConfig.username}
                    onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={emailConfig.password}
                    onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="From Email"
                    name="from_email"
                    value={emailConfig.from_email}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from_email: e.target.value })}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="From Name"
                    name="from_name"
                    value={emailConfig.from_name}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from_name: e.target.value })}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailConfig.use_tls}
                        onChange={(e) => setEmailConfig({ ...emailConfig, use_tls: e.target.checked })}
                        name="use_tls"
                      />
                    }
                    label="Use TLS"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box display="flex" justifyContent="flex-end">
                    <Button variant="contained" onClick={saveEmailConfig}>
                      Save Configuration
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>System Settings</Typography>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {systemSettings.map(setting => (
                    <Grid item xs={12} md={6} key={setting.id}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" sx={{ mr: 2 }}>{setting.name}:</Typography>
                        {setting.type === "boolean" ? (
                          <Switch
                            checked={setting.value}
                            onChange={(e) => updateSystemSetting(setting.id, e.target.checked)}
                          />
                        ) : setting.type === "select" ? (
                          <Select
                            value={setting.value}
                            onChange={(e) => updateSystemSetting(setting.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: 200 }}
                          >
                            {setting.options.map(option => (
                              <MenuItem key={option} value={option}>{option}</MenuItem>
                            ))}
                          </Select>
                        ) : setting.type === "number" ? (
                          <TextField
                            type="number"
                            value={setting.value}
                            onChange={(e) => updateSystemSetting(setting.id, parseInt(e.target.value))}
                            size="small"
                            sx={{ width: 100 }}
                          />
                        ) : (
                          <TextField
                            value={setting.value}
                            onChange={(e) => updateSystemSetting(setting.id, e.target.value)}
                            size="small"
                            sx={{ width: 200 }}
                          />
                        )}
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
import React, { useState, useEffect } from "react";
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
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";
import HistoryIcon from "@mui/icons-material/History";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EmailIcon from "@mui/icons-material/Email";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

// User roles
const USER_ROLES = [
  "Admin",
  "IT Team",
  "Manager",
  "Employee"
];

// Groups
const GROUPS = [
  "IT Department",
  "Finance Team",
  "Marketing Group",
  "Operations Team",
  "Customer Support",
  "Research & Development"
];

// Permission categories
const PERMISSION_CATEGORIES = [
  "Asset Management",
  "Ticket Management",
  "User Management",
  "Vendor Management",
  "Contract Management",
  "License Management",
  "Inventory Management",
  "Reporting"
];

// Notification types
const NOTIFICATION_TYPES = [
  "Email",
  "SMS",
  "In-App",
  "Push"
];

// System settings
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

// Email configuration
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
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [emailConfig, setEmailConfig] = useState(EMAIL_CONFIG);
  const [systemSettings, setSystemSettings] = useState(SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Employee",
    group: "",
    permissions: [],
    status: "Active"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !filterRole || user.role === filterRole;
    const matchesGroup = !filterGroup || user.group === filterGroup;

    return matchesSearch && matchesRole && matchesGroup;
  });

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockUsers = [
        {
          id: 1,
          name: "John Doe",
          email: "john.doe@company.com",
          role: "Admin",
          group: "IT Department",
          permissions: ["All"],
          status: "Active",
          last_login: "2023-07-16 09:30:00"
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane.smith@company.com",
          role: "IT Team",
          group: "IT Department",
          permissions: ["Asset Management", "Ticket Management", "Reporting"],
          status: "Active",
          last_login: "2023-07-15 14:20:00"
        },
        {
          id: 3,
          name: "Robert Johnson",
          email: "robert.johnson@company.com",
          role: "Manager",
          group: "Finance Team",
          permissions: ["Asset Management", "Ticket Management", "Reporting"],
          status: "Active",
          last_login: "2023-07-14 11:15:00"
        }
      ];

      const mockGroups = [
        { id: 1, name: "IT Department", members: 5 },
        { id: 2, name: "Finance Team", members: 8 },
        { id: 3, name: "Marketing Group", members: 12 }
      ];

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

      const mockNotifications = [
        { id: 1, type: "Email", title: "Ticket Created", message: "New ticket created by John Doe", timestamp: "2023-07-16 09:30:00", status: "Sent" },
        { id: 2, type: "In-App", title: "Asset Assigned", message: "Asset TAG-045 assigned to Jane Smith", timestamp: "2023-07-15 14:20:00", status: "Delivered" },
        { id: 3, type: "SMS", title: "Urgent: System Maintenance", message: "Planned system maintenance on July 20, 2023", timestamp: "2023-07-14 11:15:00", status: "Failed" }
      ];

      setUsers(mockUsers);
      setGroups(mockGroups);
      setRoles(mockRoles);
      setPermissions(mockPermissions);
      setAuditLogs(mockAuditLogs);
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle permission change
  const handlePermissionChange = (permission) => {
    setForm(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };

  // Open modal for adding/editing user
  const handleOpenModal = (user = null) => {
    if (user) {
      setEditId(user.id);
      setForm({
        name: user.name,
        email: user.email,
        role: user.role,
        group: user.group,
        permissions: user.permissions,
        status: user.status
      });
    } else {
      setEditId(null);
      setForm({
        name: "",
        email: "",
        role: "Employee",
        group: "",
        permissions: [],
        status: "Active"
      });
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save user
  const handleSaveUser = () => {
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }

    if (editId) {
      // Update existing user
      setUsers(prev => prev.map(user => 
        user.id === editId ? { ...user, ...form } : user
      ));
      toast.success("User updated successfully");
    } else {
      // Add new user
      const newUser = {
        id: Date.now(),
        ...form,
        last_login: null
      };
      setUsers(prev => [...prev, newUser]);
      toast.success("User created successfully");
    }

    handleCloseModal();
  };

  // Delete user
  const handleDeleteUser = (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers(prev => prev.filter(user => user.id !== id));
      toast.success("User deleted successfully");
    }
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  // Get role color
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

  // Get notification type color
  const getNotificationTypeColor = (type) => {
    switch (type) {
      case "Email":
        return "info";
      case "SMS":
        return "warning";
      case "In-App":
        return "success";
      case "Push":
        return "primary";
      default:
        return "default";
    }
  };

  // Get notification status color
  const getNotificationStatusColor = (status) => {
    switch (status) {
      case "Sent":
        return "success";
      case "Delivered":
        return "info";
      case "Failed":
        return "error";
      case "Pending":
        return "warning";
      default:
        return "default";
    }
  };

  // Update system setting
  const updateSystemSetting = (id, value) => {
    setSystemSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
    toast.success("Setting updated successfully");
  };

  // Save email configuration
  const saveEmailConfig = () => {
    setEmailConfig(emailConfig);
    toast.success("Email configuration saved successfully");
  };

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
          <Tab label="User Management" value="users" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="Groups" value="groups" icon={<GroupIcon />} iconPosition="start" />
          <Tab label="Roles & Permissions" value="roles" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="Audit Logs" value="audit" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Notifications" value="notifications" icon={<NotificationsIcon />} iconPosition="start" />
          <Tab label="Email Configuration" value="email" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="System Settings" value="settings" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box mt={2}>
        {activeTab === "users" && (
          <Box>
            {/* Filters and Search */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Search Users"
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
                      label="Role"
                      size="small"
                      fullWidth
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                    >
                      <MenuItem value="">All Roles</MenuItem>
                      {USER_ROLES.map(role => (
                        <MenuItem key={role} value={role}>{role}</MenuItem>
                      ))}
                    </Select>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Select
                      label="Group"
                      size="small"
                      fullWidth
                      value={filterGroup}
                      onChange={(e) => setFilterGroup(e.target.value)}
                    >
                      <MenuItem value="">All Groups</MenuItem>
                      {GROUPS.map(group => (
                        <MenuItem key={group} value={group}>{group}</MenuItem>
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
                      Add User
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Users Table */}
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
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Group</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Last Login</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No users found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map(user => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={user.role} 
                                  color={getRoleColor(user.role)} 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>{user.group}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={user.status} 
                                  color={user.status === "Active" ? "success" : "error"} 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>{user.last_login}</TableCell>
                              <TableCell align="right">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpenModal(user)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteUser(user.id)}>
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
        )}

        {activeTab === "groups" && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">User Groups</Typography>
                <Button variant="contained" startIcon={<AddIcon />}>
                  Add Group
                </Button>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {groups.map(group => (
                    <Grid item xs={12} sm={6} md={4} key={group.id}>
                      <Card sx={{ border: "1px solid #e0e0e0" }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle1">{group.name}</Typography>
                            <Box display="flex" gap={1}>
                              <Tooltip title="Edit">
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {group.members} members
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

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

        {activeTab === "notifications" && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Notifications</Typography>
                <Button variant="contained" startIcon={<AddIcon />}>
                  Add Notification
                </Button>
              </Box>

              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {notifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No notifications found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        notifications.map(notification => (
                          <TableRow key={notification.id}>
                            <TableCell>
                              <Chip 
                                label={notification.type} 
                                color={getNotificationTypeColor(notification.type)} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>{notification.title}</TableCell>
                            <TableCell>{notification.message}</TableCell>
                            <TableCell>{notification.timestamp}</TableCell>
                            <TableCell>
                              <Chip 
                                label={notification.status} 
                                color={getNotificationStatusColor(notification.status)} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
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
                    onChange={(e) => setEmailConfig({...emailConfig, smtp_server: e.target.value})}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Port"
                    name="smtp_port"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({...emailConfig, smtp_port: e.target.value})}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Username"
                    name="username"
                    value={emailConfig.username}
                    onChange={(e) => setEmailConfig({...emailConfig, username: e.target.value})}
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
                    onChange={(e) => setEmailConfig({...emailConfig, password: e.target.value})}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="From Email"
                    name="from_email"
                    value={emailConfig.from_email}
                    onChange={(e) => setEmailConfig({...emailConfig, from_email: e.target.value})}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="From Name"
                    name="from_name"
                    value={emailConfig.from_name}
                    onChange={(e) => setEmailConfig({...emailConfig, from_name: e.target.value})}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailConfig.use_tls}
                        onChange={(e) => setEmailConfig({...emailConfig, use_tls: e.target.checked})}
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

      {/* User Edit Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Role"
                name="role"
                value={form.role}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              >
                {USER_ROLES.map(role => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Group"
                name="group"
                value={form.group}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              >
                <MenuItem value="">Select Group</MenuItem>
                {GROUPS.map(group => (
                  <MenuItem key={group} value={group}>{group}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Permissions:</Typography>
              <Grid container spacing={1}>
                {permissions.map(permission => (
                  <Grid item xs={12} sm={6} md={4} key={permission.id}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.permissions.includes(permission.name)}
                          onChange={() => handlePermissionChange(permission.name)}
                        />
                      }
                      label={permission.name}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            {editId ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

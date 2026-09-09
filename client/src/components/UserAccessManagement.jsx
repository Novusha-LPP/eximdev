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
import PersonIcon from "@mui/icons-material/Person";
  GroupIcon from "@mui/icons-material/Group";
  AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
  BusinessIcon from "@mui/icons-material/Business";
  AddIcon from "@mui/icons-material/Add";
  EditIcon from "@mui/icons-material/Edit";
  DeleteIcon from "@mui/icons-material/Delete";
  SearchIcon from "@mui/icons-material/Search";
  HistoryIcon from "@mui/icons-material/History";
  KeyIcon from "@mui/icons-material/Key";
  AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
  SettingsIcon from "@mui/icons-material/Settings";

// User roles
const USER_ROLES = [
  "Admin",
  "IT Team",
  "Manager",
  "Employee"
];

// Departments
const DEPARTMENTS = [
  "IT",
  "HR",
  "Finance",
  "Operations",
  "Marketing",
  "Sales",
  "Customer Support",
  "Research & Development"
];

// Permissions
const PERMISSIONS = [
  "View Assets",
  "Add Assets",
  "Edit Assets",
  "Delete Assets",
  "View Tickets",
  "Create Tickets",
  "Edit Tickets",
  "Delete Tickets",
  "View Reports",
  "Generate Reports",
  "Manage Users",
  "Manage Vendors",
  "Manage Contracts",
  "Manage Licenses"
];

// Activity types
const ACTIVITY_TYPES = [
  "Login",
  "Logout",
  "Password Change",
  "Profile Update",
  "Asset Created",
  "Asset Updated",
  "Asset Deleted",
  "Ticket Created",
  "Ticket Updated",
  "Ticket Deleted",
  "User Created",
  "User Updated",
  "User Deleted"
];

export default function UserAccessManagement() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Employee",
    department: "IT",
    permissions: [],
    status: "Active"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");

  // Filter users based on search term and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !filterRole || user.role === filterRole;
    const matchesDepartment = !filterDepartment || user.department === filterDepartment;

    return matchesSearch && matchesRole && matchesDepartment;
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
          department: "IT",
          permissions: ["View Assets", "Add Assets", "Edit Assets", "Delete Assets", "View Tickets", "Create Tickets", "Edit Tickets", "Delete Tickets", "View Reports", "Generate Reports", "Manage Users", "Manage Vendors", "Manage Contracts", "Manage Licenses"],
          status: "Active",
          last_login: "2023-07-16 09:30:00"
        },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane.smith@company.com",
          role: "IT Team",
          department: "IT",
          permissions: ["View Assets", "Add Assets", "Edit Assets", "View Tickets", "Create Tickets", "Edit Tickets", "View Reports"],
          status: "Active",
          last_login: "2023-07-15 14:20:00"
        },
        {
          id: 3,
          name: "Robert Johnson",
          email: "robert.johnson@company.com",
          role: "Manager",
          department: "Finance",
          permissions: ["View Assets", "View Tickets", "Create Tickets", "View Reports"],
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
        { id: 1, name: "Admin", description: "Full system access", permissions: ["View Assets", "Add Assets", "Edit Assets", "Delete Assets", "View Tickets", "Create Tickets", "Edit Tickets", "Delete Tickets", "View Reports", "Generate Reports", "Manage Users", "Manage Vendors", "Manage Contracts", "Manage Licenses"] },
        { id: 2, name: "IT Team", description: "IT department access", permissions: ["View Assets", "Add Assets", "Edit Assets", "View Tickets", "Create Tickets", "Edit Tickets", "View Reports"] },
        { id: 3, name: "Manager", description: "Department manager access", permissions: ["View Assets", "View Tickets", "Create Tickets", "View Reports"] },
        { id: 4, name: "Employee", description: "Basic user access", permissions: ["View Assets", "Create Tickets"] }
      ];

      const mockActivityLogs = [
        { id: 1, user: "John Doe", action: "Login", timestamp: "2023-07-16 09:30:00", details: "Logged in from 192.168.1.100" },
        { id: 2, user: "Jane Smith", action: "Asset Created", timestamp: "2023-07-15 14:20:00", details: "Created new asset: TAG-045" },
        { id: 3, user: "Robert Johnson", action: "Ticket Created", timestamp: "2023-07-14 11:15:00", details: "Created new ticket: Software installation request" }
      ];

      setUsers(mockUsers);
      setGroups(mockGroups);
      setRoles(mockRoles);
      setActivityLogs(mockLogs);
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
        department: user.department,
        permissions: user.permissions,
        status: user.status
      });
    } else {
      setEditId(null);
      setForm({
        name: "",
        email: "",
        role: "Employee",
        department: "IT",
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

  // Get activity icon
  const getActivityIcon = (action) => {
    switch (action) {
      case "Login":
        return <PersonIcon />;
      case "Logout":
        return <PersonIcon />;
      case "Password Change":
        return <KeyIcon />;
      case "Profile Update":
        return <AssignmentIndIcon />;
      case "Asset Created":
        return <AddIcon />;
      case "Asset Updated":
        return <EditIcon />;
      case "Asset Deleted":
        return <DeleteIcon />;
      case "Ticket Created":
        return <AddIcon />;
      case "Ticket Updated":
        return <EditIcon />;
      case "Ticket Deleted":
        return <DeleteIcon />;
      case "User Created":
        return <AddIcon />;
      case "User Updated":
        return <EditIcon />;
      case "User Deleted":
        return <DeleteIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <PersonIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          User & Access Management
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="user access tabs">
          <Tab label="Users" value="users" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="RBAC" value="rbac" icon={<AdminPanelSettingsIcon />} iconPosition="start" />
          <Tab label="Department Access" value="departments" icon={<BusinessIcon />} iconPosition="start" />
          <Tab label="Groups" value="groups" icon={<GroupIcon />} iconPosition="start" />
          <Tab label="Activity Logs" value="logs" icon={<HistoryIcon />} iconPosition="start" />
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
                      label="Department"
                      size="small"
                      fullWidth
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                    >
                      <MenuItem value="">All Departments</MenuItem>
                      {DEPARTMENTS.map(dept => (
                        <MenuItem key={dept} value={dept}>{dept}</MenuItem>
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
                          <TableCell>Department</TableCell>
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
                          filteredUsers.map((user) => (
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
                              <TableCell>{user.department}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={user.status} 
                                  color={user.status === "Active" ? "success" : "error"} 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>{user.last_login || "Never"}</TableCell>
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

        {activeTab === "rbac" && (
          <Box>
            {/* Roles Table */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Roles & Permissions</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    // Open role creation modal
                  }}>
                    Add Role
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Role</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Permissions</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roles.map(role => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <Chip 
                              label={role.name} 
                              color={getRoleColor(role.name)} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{role.description}</TableCell>
                          <TableCell>
                            <Box display="flex" flexWrap gap={0.5}>
                              {role.permissions.map(permission => (
                                <Chip key={permission} label={permission} size="small" />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => {
                                // Open role edit modal
                              }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => {
                                // Handle role deletion
                              }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Permissions Grid */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Available Permissions</Typography>
                <Grid container spacing={2}>
                  {PERMISSIONS.map(permission => (
                    <Grid item xs={12} sm={6} md={4} key={permission}>
                      <Box p={2} border="1px solid #eee" borderRadius={1}>
                        <FormControlLabel
                          control={<Switch />}
                          label={permission}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === "departments" && (
          <Box>
            {/* Departments Table */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Department Access</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    // Open department creation modal
                  }}>
                    Add Department
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Department</TableCell>
                        <TableCell>Access Level</TableCell>
                        <TableCell>Users</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {DEPARTMENTS.map(dept => (
                        <TableRow key={dept}>
                          <TableCell>{dept}</TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value="Standard"
                              onChange={(e) => {
                                // Handle department access level change
                              }}
                            >
                              <MenuItem value="Standard">Standard</MenuItem>
                              <MenuItem value="Full">Full</MenuItem>
                              <MenuItem value="Limited">Limited</MenuItem>
                              <MenuItem value="None">None</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {users.filter(u => u.department === dept).length}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => {
                                // Open department edit modal
                              }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => {
                                // Handle department deletion
                              }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Department Access Matrix */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Department Access Matrix</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Permission</TableCell>
                        {DEPARTMENTS.map(dept => (
                          <TableCell key={dept}>{dept}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {PERMISSIONS.map(permission => (
                        <TableRow key={permission}>
                          <TableCell>{permission}</TableCell>
                          {DEPARTMENTS.map(dept => (
                            <TableCell key={dept}>
                              <FormControlLabel
                                control={<Switch />}
                                label=""
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === "groups" && (
          <Box>
            {/* Groups Table */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">User Groups</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
                    // Open group creation modal
                  }}>
                    Add Group
                  </Button>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Group Name</TableCell>
                        <TableCell>Members</TableCell>
                        <TableCell>Created Date</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groups.map(group => (
                        <TableRow key={group.id}>
                          <TableCell>{group.name}</TableCell>
                          <TableCell>{group.members} members</TableCell>
                          <TableCell>2023-06-01</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => {
                                // Open group edit modal
                              }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => {
                                // Handle group deletion
                              }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Group Members */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Group Members</Typography>
                <Grid container spacing={2}>
                  {users.map(user => (
                    <Grid item xs={12} sm={6} md={4} key={user.id}>
                      <Box p={2} border="1px solid #eee" borderRadius={1}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <PersonIcon />
                          <Typography variant="body1">{user.name}</Typography>
                          <Chip 
                            label={user.role} 
                            color={getRoleColor(user.role)} 
                            size="small" 
                          />
                        </Box>
                        <Box mt={1}>
                          <FormControlLabel
                            control={<Switch />}
                            label="Add to group"
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === "logs" && (
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Activity Logs</Typography>
                <Button variant="outlined" onClick={() => {
                  // Export logs
                }}>
                  Export Logs
                </Button>
              </Box>
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
                    {activityLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>{log.user}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getActivityIcon(log.action)}
                            <Typography>{log.action}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{log.timestamp}</TableCell>
                        <TableCell>{log.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* User Edit Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Name"
                fullWidth
                value={form.name}
                onChange={handleInputChange}
                name="name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={handleInputChange}
                name="email"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Role"
                fullWidth
                value={form.role}
                onChange={handleInputChange}
                name="role"
              >
                {USER_ROLES.map(role => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Department"
                fullWidth
                value={form.department}
                onChange={handleInputChange}
                name="department"
              >
                {DEPARTMENTS.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Permissions</Typography>
              <Grid container spacing={1}>
                {PERMISSIONS.map(permission => (
                  <Grid item xs={12} sm={6} key={permission}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.permissions.includes(permission)}
                          onChange={() => handlePermissionChange(permission)}
                        />
                      }
                      label={permission}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.status === "Active"}
                    onChange={(e) => setForm({...form, status: e.target.checked ? "Active" : "Inactive"})}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            {editId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

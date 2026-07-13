import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
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
  Chip,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Paper,
  Avatar,
  alpha,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useAuditCRUD } from "./AuditLogs";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";

const USER_ROLES = ["Admin", "IT Team", "Manager", "Employee"];

const GROUPS = [
  "IT Department",
  "Finance Team",
  "Marketing Group",
  "Operations Team",
  "Customer Support",
  "Research & Development",
];

const PERMISSION_CATEGORIES = [
  "Asset Management",
  "Ticket Management",
  "User Management",
  "Vendor Management",
  "License Management",
  "Inventory Management",
  "Reporting",
];

const MODULES = {
  USER_MANAGEMENT: "User Management",
};

const ACTIONS = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  VIEW: "View",
};

export default function UserManagement() {
  const navigate = useNavigate();
  const { user: loggedInUser } = useContext(UserContext);

  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  // Audit logs
  const { logCreate, logRead, logUpdate, logDelete } = useAuditCRUD("User", "User");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Employee",
    group: "",
    permissions: [],
    status: "Active",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

  // Track filter changes
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (value) {
      logRead("user-search-filter", `Filtered users by search term: ${value}`, "info");
    }
  };

  const handleRoleFilterChange = (value) => {
    setFilterRole(value);
    if (value) {
      logRead("user-role-filter", `Filtered users by role: ${value}`, "info");
    }
  };

  const handleGroupFilterChange = (value) => {
    setFilterGroup(value);
    if (value) {
      logRead("user-group-filter", `Filtered users by group: ${value}`, "info");
    }
  };

  // Load users from localStorage
  const loadUsersFromStorage = () => {
    try {
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        return JSON.parse(savedUsers);
      }
    } catch (error) {
      console.error("Error loading users from localStorage:", error);
      localStorage.removeItem('users');
      localStorage.removeItem('usersLoaded');
    }
    return null;
  };

  // API load
  const fetchData = async () => {
    setLoading(true);

    try {
      // Log user list view action
      logRead("user-list-view", "Loaded user list", "info");

      // Try to load users from API
      const response = await itHelpdeskAPI.users.getAll();
      console.log("Get all users response:", response);

      // Try to load users from localStorage first as fallback
      const savedUsers = loadUsersFromStorage();
      if (savedUsers) {
        setUsers(savedUsers);
      } else if (response && response.data) {
        // Set users from API
        let usersData = Array.isArray(response.data) ? response.data : (response.data?.users || response.data || []);
        usersData = usersData.map(u => ({ ...u, id: u._id || u.id }));
        setUsers(usersData);
        // Save to localStorage as backup
        localStorage.setItem('users', JSON.stringify(usersData));
        localStorage.setItem('usersLoaded', 'true');
      } else {
        // Set initial users if no data exists
        const initialUsers = [
          {
            id: Date.now(),
            name: "John Doe",
            email: "john@company.com",
            role: "Admin",
            group: "IT Department",
            permissions: ["All"],
            status: "Active",
            last_login: "2023-07-16 09:30:00",
          },
        ];
        setUsers(initialUsers);
        // Save to localStorage as backup
        localStorage.setItem('users', JSON.stringify(initialUsers));
        localStorage.setItem('usersLoaded', 'true');
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      // Log error
      console.error("Failed to fetch users");

      // Fallback to mock data
      const fallbackUsers = [
        {
          id: Date.now(),
          name: "John Doe",
          email: "john@company.com",
          role: "Admin",
          group: "IT Department",
          permissions: ["All"],
          status: "Active",
          last_login: "2023-07-16 09:30:00",
        },
      ];
      setUsers(fallbackUsers);
      // Save to localStorage as backup
      localStorage.setItem('users', JSON.stringify(fallbackUsers));
      localStorage.setItem('usersLoaded', 'true');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Log module access
    logRead("user-module-access", "User Management module accessed", "info");

    // Load data
    fetchData();
  }, []);

  // Filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !filterRole || user.role === filterRole;
    const matchesGroup = !filterGroup || user.group === filterGroup;

    return matchesSearch && matchesRole && matchesGroup;
  });

  // Form change
  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Permission toggle
  const handlePermissionChange = (permission) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(permission);
      const action = exists ? "REMOVED" : "ADDED";

      // Log permission change action
      logRead(`permission-${action.toLowerCase()}`, `${action} permission: ${permission} for user: ${form.name || "New User"} (${form.email || "N/A"})`, "info");

      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  // Open modal
  const handleOpenModal = (user = null) => {
    if (user) {
      setEditId(user.id);
      setForm(user);

      // Log user view action
      logRead("user-view", `Viewed user details: ${user.name} (${user.email})`, "info");
    } else {
      setEditId(null);
      setForm({
        name: "",
        email: "",
        role: "Employee",
        group: "",
        permissions: [],
        status: "Active",
      });

      // Log user creation intent
      logRead("user-creation-intent", "Opened user creation form", "info");
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save User
  const handleSaveUser = async () => {
    const isAdmin = String(form.role).trim().toLowerCase() === 'admin';

    if (
      !form.name ||
      !form.email ||
      !form.group ||
      !form.role ||
      (!isAdmin && (!form.permissions || form.permissions.length === 0))
    ) {
      toast.error("Name, Email, Group, Role, and Permissions (for non-admins) are required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const payload = {
      ...form,
      permissions: isAdmin ? ['All'] : form.permissions
    };

    try {
      // API Call to backend
      console.log("Saving user:", payload);

      if (editId) {
        // Update existing user
        const response = await itHelpdeskAPI.users.update(editId, payload);
        console.log("Update response:", response);
        if (!response || response.error) {
          throw new Error(response?.error || "Failed to update user");
        }

        setUsers((prev) => {
          const updatedUsers = prev.map((u) => (u.id === editId ? { ...u, ...payload } : u));
          console.log("Updated users:", updatedUsers);
          // Save to localStorage
          localStorage.setItem('users', JSON.stringify(updatedUsers));
          localStorage.setItem('usersLoaded', 'true');
          return updatedUsers;
        });
        toast.success("User updated");
      } else {
        // Create new user
        const response = await itHelpdeskAPI.users.create(payload);
        console.log("Create user response:", response);
        if (!response || response.error) {
          throw new Error(response?.error || "Failed to create user");
        }
        const newUser = response.data?.user || response.data || { id: Date.now(), ...payload, last_login: null };
        console.log("New user:", newUser);

        // Map _id to id if missing
        if (!newUser.id && newUser._id) {
          newUser.id = newUser._id;
        }

        if (!newUser.id) {
          console.error("New user does not have an ID:", newUser);
          toast.error("Failed to create user - no ID returned");
          return;
        }
        setUsers((prev) => {
          const updatedUsers = [...prev, newUser];
          console.log("Updated users with new user:", updatedUsers);
          // Save to localStorage
          localStorage.setItem('users', JSON.stringify(updatedUsers));
          localStorage.setItem('usersLoaded', 'true');
          return updatedUsers;
        });
        toast.success("User added");
      }

      handleCloseModal();
    } catch (error) {
      console.error(error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save user";
      toast.error(errorMessage);

      // Log error
      console.error(`Failed to save user: ${form.name} (${form.email}). Error: ${errorMessage}`);
    }
  };

  // Delete User
  const handleDeleteUser = async (id) => {
    const user = users.find(u => u.id === id);
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        // Delete from backend
        const response = await itHelpdeskAPI.users.remove(id);
        console.log("Delete response:", response);
        if (!response || response.error) {
          throw new Error(response?.error || "Failed to delete user");
        }

        setUsers((prev) => {
          const updatedUsers = prev.filter((u) => u.id !== id);
          // Save to localStorage as backup
          localStorage.setItem('users', JSON.stringify(updatedUsers));
          return updatedUsers;
        });
        toast.success("User deleted");

        // Clear localStorage if no users left
        if (users.length === 1) {
          localStorage.removeItem('users');
          localStorage.removeItem('usersLoaded');
        }
      } catch (error) {
        console.error("Failed to delete user:", error);
        toast.error("Failed to delete user");

        // Log error
        console.error(`Failed to delete user: ${user?.name} (${user?.email}). Error: ${error.message}`);
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Admin":
        return "error";
      case "IT Team":
        return "primary";
      case "Manager":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={handleBack} 
            color="primary" 
            sx={{ 
              mr: 1, 
              bgcolor: "white", 
              border: "1px solid",
              borderColor: "primary.main",
              color: "primary.main",
              "&:hover": { 
                bgcolor: "primary.light",
                color: "primary.dark"
              } 
            }}
          >
            <ArrowBackIcon sx={{ color: "primary.main" }} />
          </IconButton>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              User Management
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage system users, roles, and permissions
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenModal()}
            sx={{ borderRadius: 2, boxShadow: 3 }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Filters Card */}
      <Paper elevation={2} sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={filterRole}
                label="Role"
                onChange={(e) => handleRoleFilterChange(e.target.value)}
              >
                <MenuItem value="">All Roles</MenuItem>
                {USER_ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Group</InputLabel>
              <Select
                value={filterGroup}
                label="Group"
                onChange={(e) => handleGroupFilterChange(e.target.value)}
              >
                <MenuItem value="">All Groups</MenuItem>
                {GROUPS.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Card */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="user table">
            <TableHead sx={{ bgcolor: alpha('#000', 0.05) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Group</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Permissions</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="textSecondary">
                      No users found matching your filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {user.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" fontSize="0.85rem">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.group}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {String(user.role).trim().toLowerCase() === "admin" ? (
                        <Chip label="All Permissions" size="small" color="success" variant="outlined" />
                      ) : user.permissions && user.permissions.length > 0 ? (
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {user.permissions.map((p) => (
                            <Chip
                              key={p}
                              label={p}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary" fontStyle="italic">
                          No permissions
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {user.role !== 'Admin' && (
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                          <Tooltip title="Edit User" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenModal(user)}
                              sx={{ color: 'primary.main', bgcolor: alpha('#000', 0.04), '&:hover': { bgcolor: alpha('#000', 0.08) } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User" arrow>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteUser(user.id)}
                              sx={{ bgcolor: alpha('#000', 0.04), '&:hover': { bgcolor: alpha('#000', 0.08) } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            {editId ? "Edit User" : "Add New User"}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="name"
                label="Full Name"
                value={form.name}
                onChange={handleInputChange}
                variant="outlined"
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="email"
                label="Email Address"
                value={form.email}
                onChange={handleInputChange}
                variant="outlined"
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select name="role" value={form.role} label="Role" onChange={handleInputChange}>
                  {USER_ROLES.map((r) => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Group</InputLabel>
                <Select name="group" value={form.group} label="Group" onChange={handleInputChange}>
                  {GROUPS.map((g) => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1 }}>
                Permissions
              </Typography>

              <Box display="flex" gap={1} flexWrap="wrap">
                {PERMISSION_CATEGORIES.map((p) => {
                  const isAdmin = String(form.role).trim().toLowerCase() === 'admin';
                  const hasPermission = isAdmin || form.permissions.includes(p);

                  return (
                    <Chip
                      key={p}
                      label={p}
                      clickable={!isAdmin}
                      color={hasPermission ? "primary" : "default"}
                      onClick={() => !isAdmin && handlePermissionChange(p)}
                      disabled={isAdmin}
                      variant={hasPermission ? "filled" : "outlined"}
                      sx={{
                        ...(isAdmin && {
                          opacity: 0.6,
                          cursor: "not-allowed",
                          bgcolor: 'action.disabledBackground'
                        })
                      }}
                    />
                  );
                })}
              </Box>

              {String(form.role).trim().toLowerCase() === 'admin' && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Admin accounts automatically have full access to all modules.
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
          <Button onClick={handleCloseModal} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveUser}
            sx={{ borderRadius: 2, boxShadow: 2 }}
          >
            {editId ? "Update User" : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

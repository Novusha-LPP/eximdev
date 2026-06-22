import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useAuditCRUD } from "./AuditLogs";
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
  "Contract Management",
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
  const addAuditLog = async (logData) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_STRING}/audit-trail/custom`, logData);
    } catch (err) {
      console.error('Failed to save audit log', err);
    }
  };

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
      addAuditLog({
        action: "Filter",
        module: "User Management",
        details: `Filtered users by search term: ${value}`,
        severity: "info"
      });
    }
  };

  const handleRoleFilterChange = (value) => {
    setFilterRole(value);
    if (value) {
      addAuditLog({
        action: "Filter",
        module: "User Management",
        details: `Filtered users by role: ${value}`,
        severity: "info"
      });
    }
  };

  const handleGroupFilterChange = (value) => {
    setFilterGroup(value);
    if (value) {
      addAuditLog({
        action: "Filter",
        module: "User Management",
        details: `Filtered users by group: ${value}`,
        severity: "info"
      });
    }
  };

  // Load users from localStorage
  const loadUsersFromStorage = () => {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      return JSON.parse(savedUsers);
    }
    return null;
  };

  // Mock API load
  const fetchData = () => {
    setLoading(true);

    // Log user list view action
    addAuditLog({
      action: "View",
      module: "User Management",
      details: "Loaded user list",
      severity: "info"
    });

    setTimeout(() => {
      // Try to load users from localStorage first
      const savedUsers = loadUsersFromStorage();
      if (savedUsers) {
        setUsers(savedUsers);
      } else {
        // Set initial users if no saved users exist
        setUsers([
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
        ]);
      }
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    // Log module access
    addAuditLog({
      action: "Module Access",
      module: "User Management",
      details: "User Management module accessed",
      severity: "info"
    });

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
      addAuditLog({
        action: `Permission ${action}`,
        module: "User Management",
        details: `${action} permission: ${permission} for user: ${form.name || "New User"} (${form.email || "N/A"})`,
        severity: "info"
      });

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
      addAuditLog({
        action: "View",
        module: "User Management",
        details: `Viewed user details: ${user.name} (${user.email})`,
        severity: "info"
      });
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
      addAuditLog({
        action: "Create Intent",
        module: "User Management",
        details: "Opened user creation form",
        severity: "info"
      });
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

    const payload = {
      ...form,
      permissions: isAdmin ? ['All'] : form.permissions
    };

    try {
      // Mock API Call
      console.log("Saving user:", payload);

      if (editId) {
        setUsers((prev) => {
          const updatedUsers = prev.map((u) => (u.id === editId ? { ...u, ...payload } : u));
          console.log("Updated users:", updatedUsers);
          // Save to localStorage
          localStorage.setItem('users', JSON.stringify(updatedUsers));
          localStorage.setItem('usersLoaded', 'true');
          return updatedUsers;
        });
        toast.success("User updated");

        // Log user update action
        addAuditLog({
          action: "Update",
          module: "User Management",
          details: `Updated user: ${form.name} (${form.email}). Role: ${form.role}, Group: ${form.group}`,
          severity: "info"
        });
      } else {
        const newUser = { id: Date.now(), ...payload, last_login: null };
        setUsers((prev) => {
          const updatedUsers = [...prev, newUser];
          console.log("Updated users with new user:", updatedUsers);
          // Save to localStorage
          localStorage.setItem('users', JSON.stringify(updatedUsers));
          localStorage.setItem('usersLoaded', 'true');
          return updatedUsers;
        });
        toast.success("User added");

        // Log user creation action
        addAuditLog({
          action: "Create",
          module: "User Management",
          details: `Created new user: ${form.name} (${form.email}). Role: ${form.role}, Group: ${form.group}`,
          severity: "info"
        });
      }

      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save user");

      // Log error
      addAuditLog({
        action: "Error",
        module: "User Management",
        details: `Failed to save user: ${form.name} (${form.email}). Error: ${error.message}`,
        severity: "error"
      });
    }
  };

  // Delete User
  const handleDeleteUser = (id) => {
    const user = users.find(u => u.id === id);
    if (window.confirm("Are you sure you want to delete this user?")) {
      setUsers((prev) => {
        const updatedUsers = prev.filter((u) => u.id !== id);
        // Save to localStorage
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        return updatedUsers;
      });
      toast.success("User deleted");

      // Log user deletion action
      if (user) {
        addAuditLog({
          action: "Delete",
          module: "User Management",
          details: `Deleted user: ${user.name} (${user.email}). Role: ${user.role}, Group: ${user.group}`,
          severity: "warning"
        });
      }

      // Clear localStorage if no users left
      if (users.length === 1) {
        localStorage.removeItem('users');
        localStorage.removeItem('usersLoaded');
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
    <Box p={2}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <PersonIcon />
        <Typography variant="h5">User Management</Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
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
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={filterRole}
                  label="Role"
                  onChange={(e) => handleRoleFilterChange(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
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
                  <MenuItem value="">All</MenuItem>
                  {GROUPS.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button fullWidth variant="contained" onClick={() => handleOpenModal()}>
                Add User
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box textAlign="center">
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
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.role} color={getRoleColor(user.role)} />
                      </TableCell>
                      <TableCell>{user.group}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          color={user.status === "Active" ? "success" : "error"}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpenModal(user)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteUser(user.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} fullWidth maxWidth="md">
        <DialogTitle>{editId ? "Edit User" : "Add User"}</DialogTitle>

        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth name="name" label="Name" value={form.name} onChange={handleInputChange} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth name="email" label="Email" value={form.email} onChange={handleInputChange} />
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
              <Typography variant="subtitle1" gutterBottom>Permissions</Typography>

              {String(form.role).trim().toLowerCase() === 'admin' ? (
                <Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Permissions: All (Full Access)
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {PERMISSION_CATEGORIES.map((p) => (
                      <Chip
                        key={p}
                        label={p}
                        // 'default' color makes them look grey/faded
                        color="default"
                        // disabled makes them unclickable and faded
                        disabled
                        sx={{
                          opacity: 0.5, // Manually reduce opacity to look "faded"
                          cursor: "not-allowed"
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box display="flex" gap={1} flexWrap="wrap">
                  {PERMISSION_CATEGORIES.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      clickable
                      color={form.permissions.includes(p) ? "primary" : "default"}
                      onClick={() => handlePermissionChange(p)}
                    />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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
  Tooltip,
  Chip,
  Select,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import { toast } from "react-hot-toast";

// User roles for IT Helpdesk
const USER_ROLES = [
  "Admin",
  "IT Team",
  "Manager",
  "Employee"
];

// Groups for IT Helpdesk
const GROUPS = [
  "IT Department",
  "Finance Team",
  "Marketing Group",
  "Operations Team",
  "Customer Support",
  "Research & Development"
];

// Permissions categories for IT Helpdesk
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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
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
      // Mock data for IT Helpdesk users
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
        },
        {
          id: 4,
          name: "Sarah Williams",
          email: "sarah.williams@company.com",
          role: "Employee",
          group: "Customer Support",
          permissions: ["Ticket Management"],
          status: "Active",
          last_login: "2023-07-13 16:45:00"
        },
        {
          id: 5,
          name: "Michael Brown",
          email: "michael.brown@company.com",
          role: "Employee",
          group: "Operations Team",
          permissions: ["Ticket Management"],
          status: "Inactive",
          last_login: "2023-06-30 10:20:00"
        }
      ];

      setUsers(mockUsers);
      setLoading(false);
    }, 500);
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

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <PersonIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          User Management
        </Typography>
      </Box>

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

      {/* Add/Edit User Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Full Name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Role"
                name="role"
                value={form.role}
                onChange={handleInputChange}
                fullWidth
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
              >
                <MenuItem value="">Select Group</MenuItem>
                {GROUPS.map(group => (
                  <MenuItem key={group} value={group}>{group}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={handleInputChange}
                fullWidth
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Permissions
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {PERMISSION_CATEGORIES.map(permission => (
                  <Chip
                    key={permission}
                    label={permission}
                    onClick={() => handlePermissionChange(permission)}
                    color={form.permissions.includes(permission) ? "primary" : "default"}
                    variant={form.permissions.includes(permission) ? "filled" : "outlined"}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            {editId ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
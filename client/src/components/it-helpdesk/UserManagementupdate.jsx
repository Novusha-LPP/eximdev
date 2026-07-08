import React, { useEffect, useState } from "react";
import { userAPI } from "../../api/userAPI";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  Box,
  Chip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Paper,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

const USER_ROLES = ["Admin", "IT Team", "Manager", "Employee"];

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

const EMPTY_FORM = {
  name: "",
  email: "",
  role: "Employee",
  permissions: [],
  group: "",
  status: "Active",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await userAPI.getAll();
      setUsers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingUser(null);
  };

  const handleCreate = async () => {
    const payload = { ...form };
    if (payload.role === "Admin") {
      payload.permissions = PERMISSION_CATEGORIES;
    }
    await userAPI.create(payload);
    resetForm();
    setShowDialog(false);
    fetchUsers();
  };

  const handleEdit = (user) => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "Employee",
      permissions: user.permissions || [],
      group: user.group || "",
      status: user.status || "Active",
    });
    setEditingUser(user);
    setShowDialog(true);
  };

  const handleUpdate = async () => {
    const payload = { ...form };
    if (payload.role === "Admin") {
      payload.permissions = PERMISSION_CATEGORIES;
    }
    await userAPI.update(editingUser._id, payload);
    setShowDialog(false);
    resetForm();
    fetchUsers();
  };

  const handleDelete = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await userAPI.remove(userId);
      fetchUsers();
    }
  };

  const handlePermissionChange = (permission) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(permission);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permission)
          : [...prev.permissions, permission],
      };
    });
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    resetForm();
  };

  const isAdmin = form.role === "Admin";

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowDialog(true)}
        >
          Add User
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "action.hover" }}>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Group</strong></TableCell>
              <TableCell><strong>Permissions</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No users found. Click &quot;Add User&quot; to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {u.name || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      size="small"
                      color={
                        u.role === "Admin"
                          ? "error"
                          : u.role === "IT Team"
                          ? "primary"
                          : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{u.group || "-"}</Typography>
                  </TableCell>
                  <TableCell>
                    {u.role === "Admin" ? (
                      <Chip
                        label="All Permissions"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ) : u.permissions && u.permissions.length > 0 ? (
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {u.permissions.map((p) => (
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
                      <Typography variant="body2" color="text.secondary">
                        No permissions
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.status || "Active"}
                      color={u.status === "Active" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(u)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(u._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              autoFocus
              label="Full Name"
              fullWidth
              variant="outlined"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              variant="outlined"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Group"
              fullWidth
              variant="outlined"
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel>Role</InputLabel>
              <Select
                value={form.role}
                label="Role"
                onChange={(e) => {
                  const newRole = e.target.value;
                  setForm({
                    ...form,
                    role: newRole,
                    permissions:
                      newRole === "Admin" ? PERMISSION_CATEGORIES : form.permissions,
                  });
                }}
              >
                {USER_ROLES.map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel>Status</InputLabel>
              <Select
                value={form.status}
                label="Status"
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Permissions
              </Typography>
              {isAdmin ? (
                <Typography variant="body2" color="success.main">
                  ✓ Admin has all permissions (Full Access)
                </Typography>
              ) : (
                <Box display="flex" gap={1} flexWrap="wrap">
                  {PERMISSION_CATEGORIES.map((p) => {
                    const hasPermission = form.permissions.includes(p);
                    return (
                      <Chip
                        key={p}
                        label={p}
                        clickable
                        color={hasPermission ? "primary" : "default"}
                        onClick={() => handlePermissionChange(p)}
                        variant={hasPermission ? "filled" : "outlined"}
                      />
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={editingUser ? handleUpdate : handleCreate}
            variant="contained"
          >
            {editingUser ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


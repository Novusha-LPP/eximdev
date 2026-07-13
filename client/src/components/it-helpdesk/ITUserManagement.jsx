import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, TextField,
  MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, IconButton, Grid
} from "@mui/material";
import axios from "axios";
import PeopleIcon from "@mui/icons-material/People";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import MonitorIcon from "@mui/icons-material/Monitor";
import ComputerIcon from "@mui/icons-material/Computer";
import HeadsetIcon from "@mui/icons-material/Headset";
import MouseIcon from "@mui/icons-material/Mouse";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_STRING || "http://192.168.2.12:9006/api",
  withCredentials: true,
});

const ROLES = ["Admin", "IT Team", "Manager", "Employee"];

const ASSET_TYPES = [
  "System",
  "Laptop",
  "Keyboard",
  "Monitor",
  "Headset",
  "Dongle",
  "Mouse",
  "Other"
];

export default function ITUserManagement() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate("/it-helpdesk");
  };
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "Employee", department: "" });

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAssets, setUserAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [assetForm, setAssetForm] = useState({
    userId: "",
    assetType: ["Laptop"],
    serialNumber: "",
    assignedDate: "",
    status: "Assigned",
    remarks: "",
    assetId: ""
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/get-all-users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleITAccess = async (userId, hasAccess) => {
    try {
      await api.put(`/users/${userId}/it-access`, { hasAccess });
      fetchUsers();
    } catch (err) {
      console.error("Failed to update IT access:", err);
    }
  };

  const handleDelete = async (e, userId) => {
    e.stopPropagation();
    if (!window.confirm("Deactivate this user?")) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err) {
      console.error("Failed to deactivate user:", err);
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post("/users", newUser);
      setShowCreateModal(false);
      setNewUser({ username: "", password: "", role: "Employee", department: "" });
      fetchUsers();
    } catch (err) {
      console.error("Failed to create user:", err);
      alert("Failed to create user: " + (err.response?.data?.message || err.message));
    }
  };

  const fetchAssets = async (userId) => {
    setLoadingAssets(true);
    try {
      const res = await api.get(`/users/${userId}/assets`);
      setUserAssets(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch assets:", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const openAssetManager = (user) => {
    setSelectedUser(user);
    setAssetForm({
      userId: user._id,
      assetType: ["Laptop"],
      serialNumber: "",
      assignedDate: new Date().toISOString().substring(0, 10),
      status: "Assigned",
      remarks: "",
      assetId: ""
    });
    fetchAssets(user._id);
    setShowAssetModal(true);
  };

  const handleSaveAsset = async () => {
    try {
      if (assetForm.assetId) {
        // Edit mode (single asset)
        const payload = {
          type: assetForm.assetType[0] || "Laptop",
          serialNumber: assetForm.serialNumber,
          assignedDate: assetForm.assignedDate,
          status: assetForm.status,
          remarks: assetForm.remarks,
        };
        await api.put(`/users/${assetForm.userId}/assets/${assetForm.assetId}`, payload);
      } else {
        // Add mode (multiple assets)
        const payload = {
          module: "IT Helpdesk",
          assets: assetForm.assetType.map(type => ({
            type: type,
            serialNumber: assetForm.serialNumber,
            assignedDate: assetForm.assignedDate,
            status: assetForm.status,
            remarks: assetForm.remarks,
          }))
        };
        await api.post(`/users/${assetForm.userId}/assets`, payload);
      }
      fetchAssets(assetForm.userId);
      fetchUsers(); // Refresh the main table to show updated assets
      setAssetForm({
        userId: assetForm.userId,
        assetType: ["Laptop"],
        serialNumber: "",
        assignedDate: new Date().toISOString().substring(0, 10),
        status: "Assigned",
        remarks: "",
        assetId: "",
      });
    } catch (err) {
      alert("Failed to save asset: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEditAsset = (asset) => {
    setAssetForm({
      userId: selectedUser._id,
      assetType: [asset.type],
      serialNumber: asset.serialNumber || "",
      assignedDate: asset.assignedDate ? new Date(asset.assignedDate).toISOString().substring(0, 10) : "",
      status: asset.status || "Assigned",
      remarks: asset.remarks || "",
      assetId: asset._id,
    });
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm("Delete this asset record?")) return;
    try {
      await api.delete(`/users/${selectedUser._id}/assets/${assetId}`);
      fetchAssets(selectedUser._id);
    } catch (err) {
      alert("Failed to delete asset: " + (err.response?.data?.message || err.message));
    }
  };

  const filteredUsers = users.filter(u => !userRoleFilter || u.role === userRoleFilter);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
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
          <PeopleIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>User & Access Management</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsers}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreateModal(true)}>Create User</Button>
        </Box>
      </Box>

      <TextField
        select
        label="Filter by Role"
        size="small"
        value={userRoleFilter}
        onChange={(e) => setUserRoleFilter(e.target.value)}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">All Roles</MenuItem>
        {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
      </TextField>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>IT Access</TableCell>
                <TableCell>Equipment Assign</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">No users found</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell><Chip label={u.role} size="small" /></TableCell>
                    <TableCell>{u.department || "—"}</TableCell>
                    <TableCell>
                      <Chip label={u.isActive !== false ? "Active" : "Inactive"}
                        color={u.isActive !== false ? "success" : "default"} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.modules?.includes("IT Helpdesk") ? "Granted" : "Denied"}
                        color={u.modules?.includes("IT Helpdesk") ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Array.from(new Map((u.userAssets || []).map(asset => [`${asset.type}-${asset.serialNumber || 'no-sn'}`, asset])).values()).map((asset, idx) => (
                          <Chip
                            key={`a-${idx}`}
                            label={`${asset.type}${asset.serialNumber ? ` (${asset.serialNumber})` : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ height: 22, fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Assign Assets">
                        <IconButton size="small" color="primary" onClick={() => openAssetManager(u)}>
                          <MonitorIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.modules?.includes("IT Helpdesk") ? "Remove IT Access" : "Grant IT Access"}>
                        <IconButton size="small" onClick={() => toggleITAccess(u._id, !u.modules?.includes("IT Helpdesk"))}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate User">
                        <IconButton size="small" color="error" onClick={(e) => handleDelete(e, u._id)}>
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

      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Role"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                fullWidth
                size="small"
              >
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Department"
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateUser}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showAssetModal} onClose={() => setShowAssetModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Asset Manager — {selectedUser ? `${selectedUser.username} (${selectedUser.first_name || ""} ${selectedUser.last_name || ""})` : ""}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: '#475569' }}>
                Assigned Assets
              </Typography>
              {loadingAssets ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : userAssets.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No assets assigned yet</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {userAssets.map((asset) => (
                    <Box
                      key={asset._id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        border: '1px solid #e2e8f0',
                        borderRadius: 1,
                        bgcolor: '#f8fafc',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{asset.type}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          S/N: {asset.serialNumber || "â€”"} | Status: {asset.status}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Assigned: {asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "â€”"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="text" onClick={() => handleEditAsset(asset)}>Edit</Button>
                        <Button size="small" color="error" variant="text" onClick={() => handleDeleteAsset(asset._id)}>Delete</Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: '#475569' }}>
                {assetForm.assetId ? "Update Asset" : "Add New Assets"}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" sx={{ mb: 1, color: '#64748b', display: 'block' }}>
                Select asset types to assign:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {ASSET_TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    clickable
                    color={assetForm.assetType.includes(type) ? 'primary' : 'default'}
                    onClick={() => {
                      const newTypes = assetForm.assetType.includes(type)
                        ? assetForm.assetType.filter(t => t !== type)
                        : [...assetForm.assetType, type];
                      setAssetForm({ ...assetForm, assetType: newTypes });
                    }}
                    sx={{ borderRadius: '6px' }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Serial Number(s)"
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                fullWidth
                size="small"
                placeholder="e.g. SN001, SN002"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Assigned Date"
                type="date"
                value={assetForm.assignedDate}
                onChange={(e) => setAssetForm({ ...assetForm, assignedDate: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Status"
                value={assetForm.status}
                onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                fullWidth
                size="small"
              >
                <MenuItem value="Assigned">Assigned</MenuItem>
                <MenuItem value="Returned">Returned</MenuItem>
                <MenuItem value="Damaged">Damaged</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Remarks"
                value={assetForm.remarks}
                onChange={(e) => setAssetForm({ ...assetForm, remarks: e.target.value })}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssetModal(false)}>Close</Button>
          <Button onClick={handleSaveAsset} variant="contained">
            {assetForm.assetId ? "Update Asset" : "Add Asset"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

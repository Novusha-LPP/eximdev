import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import axios from "axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import Inventory2Icon from "@mui/icons-material/Inventory2";

const ASSET_TYPES = ["Computer", "Laptop", "Monitor", "Printer", "Network Device", "Software", "Phone", "SIM Card", "Rack", "Cable", "Peripheral", "Unmanaged"];
const STATUSES = ["Available", "Assigned", "In Repair", "Retired", "Lost"];
const USERS_FETCH_LIMIT = 200;

const EMPTY_FORM = {
  asset_tag: "",
  serial_number: "",
  asset_type: "Laptop",
  manufacturer: "",
  model: "",
  purchase_date: "",
  warranty_expiry: "",
  status: "Available",
  assigned_to: "",
  assigned_date: "",
  location: "",
  purchase_cost: "",
  vendor: "",
  description: "",
};

export default function AssetManagement() {
  const [data, setData] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "", status: "", location: "", search: "" });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.limit };
        if (filters.type) params.type = filters.type;
        if (filters.status) params.status = filters.status;
        if (filters.location) params.location = filters.location;
        if (filters.search) params.search = filters.search;

        const res = await itHelpdeskAPI.assets.getAll(params);
        setData(res.data || []);
        setPagination(res.pagination || { total: 0, page: 1, limit: params.limit });
      } catch (err) {
        toast.error("Failed to load assets");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit]
  );

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, {
        withCredentials: true,
        params: { limit: USERS_FETCH_LIMIT },
      });
      setUsers(res.data || []);
      console.log("Fetched users:", res.data?.length || 0);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.vendors.getAll();
      setVendors(res.data || []);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, [fetchUsers, fetchVendors]);

  const handleOpen = (record = null) => {
    if (record) {
      setEditId(record._id);
      setForm({
        asset_tag: record.asset_tag || "",
        serial_number: record.serial_number || "",
        asset_type: record.asset_type || "Laptop",
        manufacturer: record.manufacturer || "",
        model: record.model || "",
        purchase_date: record.purchase_date ? record.purchase_date.slice(0, 10) : "",
        warranty_expiry: record.warranty_expiry ? record.warranty_expiry.slice(0, 10) : "",
        status: record.status || "Available",
        assigned_to: record.assigned_to?._id || record.assigned_to || "",
        assigned_date: record.assigned_date ? record.assigned_date.slice(0, 10) : "",
        location: record.location || "",
        purchase_cost: record.purchase_cost ?? "",
        vendor: record.vendor?._id || record.vendor || "",
        description: record.description || "",
      });
    } else {
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      purchase_cost: form.purchase_cost === "" ? undefined : Number(form.purchase_cost),
      assigned_to: form.assigned_to || undefined,
      vendor: form.vendor || undefined,
      purchase_date: form.purchase_date || undefined,
      warranty_expiry: form.warranty_expiry || undefined,
      assigned_date: form.assigned_date || undefined,
    };
    setSaving(true);
    try {
      if (editId) {
        await itHelpdeskAPI.assets.update(editId, payload);
        toast.success("Asset updated");
      } else {
        await itHelpdeskAPI.assets.create(payload);
        toast.success("Asset created");
      }
      setShowModal(false);
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this asset?")) return;
    try {
      await itHelpdeskAPI.assets.remove(id);
      toast.success("Deleted");
      fetchData(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "Available":
        return "success";
      case "Assigned":
        return "info";
      case "In Repair":
        return "warning";
      case "Retired":
        return "default";
      case "Lost":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Inventory2Icon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Asset Management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchData(pagination.page)}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Asset
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Asset Type"
                size="small"
                fullWidth
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                <MenuItem value="">All Types</MenuItem>
                {ASSET_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Search Asset Tag / Serial"
                size="small"
                fullWidth
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset Tag</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Manufacturer</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No assets found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((a) => (
                      <TableRow key={a._id} hover>
                        <TableCell>{a.asset_tag}</TableCell>
                        <TableCell>{a.asset_type}</TableCell>
                        <TableCell>{a.manufacturer || "—"}</TableCell>
                        <TableCell>{a.model || "—"}</TableCell>
                        <TableCell>
                          <Chip label={a.status} color={statusColor(a.status)} size="small" />
                        </TableCell>
                        <TableCell>{a.location || "—"}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpen(a)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={(e) => handleDelete(e, a._id)}>
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

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Typography variant="caption" color="text.secondary">
              Total: {pagination.total}
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                disabled={pagination.page <= 1}
                onClick={() => fetchData(pagination.page - 1)}
              >
                Prev
              </Button>
              <Typography variant="caption" sx={{ alignSelf: "center" }}>
                Page {pagination.page}
              </Typography>
              <Button
                size="small"
                disabled={pagination.page * pagination.limit >= pagination.total}
                onClick={() => fetchData(pagination.page + 1)}
              >
                Next
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Asset" : "New Asset"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                label="Asset Tag"
                required
                size="small"
                fullWidth
                value={form.asset_tag}
                onChange={(e) => setForm((f) => ({ ...f, asset_tag: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Serial Number"
                size="small"
                fullWidth
                value={form.serial_number}
                onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Asset Type"
                size="small"
                fullWidth
                value={form.asset_type}
                onChange={(e) => setForm((f) => ({ ...f, asset_type: e.target.value }))}
              >
                {ASSET_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Manufacturer"
                size="small"
                fullWidth
                value={form.manufacturer}
                onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Model"
                size="small"
                fullWidth
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Purchase Date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.purchase_date}
                onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Warranty Expiry"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.warranty_expiry}
                onChange={(e) => setForm((f) => ({ ...f, warranty_expiry: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Assigned To"
                select
                size="small"
                fullWidth
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u._id} value={u._id}>
                    {u.username} {u.first_name ? `(${u.first_name})` : ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Assigned Date"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.assigned_date}
                onChange={(e) => setForm((f) => ({ ...f, assigned_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Location"
                size="small"
                fullWidth
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Purchase Cost"
                type="number"
                size="small"
                fullWidth
                value={form.purchase_cost}
                onChange={(e) => setForm((f) => ({ ...f, purchase_cost: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Vendor"
                size="small"
                fullWidth
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              >
                <MenuItem value="">No Vendor</MenuItem>
                {vendors.map((v) => (
                  <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.asset_tag}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

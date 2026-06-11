import React, { useState, useEffect } from "react";
import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Typography, CircularProgress, IconButton, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem
} from "@mui/material";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const EMPTY_FORM = {
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  vendor_type: "General",
};

export default function VendorManagement() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await itHelpdeskAPI.vendors.getAll();
      setData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpen = (record = null) => {
    if (record) {
      setEditId(record._id);
      setForm({
        name: record.name || "",
        contact_person: record.contact_person || "",
        email: record.email || "",
        phone: record.phone || "",
        address: record.address || "",
        vendor_type: record.vendor_type || "General",
      });
    } else {
      setEditId(null);
      setForm({ ...EMPTY_FORM });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await itHelpdeskAPI.vendors.update(editId, form);
      } else {
        await itHelpdeskAPI.vendors.create(form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this vendor?")) return;
    await itHelpdeskAPI.vendors.remove(id);
    fetchData();
  };

  const typeColor = (t) => {
    switch (t) {
      case "Hardware": return "primary";
      case "Software": return "success";
      case "Network": return "warning";
      default: return "default";
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Vendors & Suppliers</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Vendor
        </Button>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No vendors found. Click "Add Vendor" to create one.</TableCell>
                </TableRow>
              ) : (
                data.map((v) => (
                  <TableRow key={v._id} hover>
                    <TableCell>{v.name}</TableCell>
                    <TableCell>{v.contact_person || "—"}</TableCell>
                    <TableCell>{v.email || "—"}</TableCell>
                    <TableCell>{v.phone || "—"}</TableCell>
                    <TableCell>
                      <Chip label={v.vendor_type} color={typeColor(v.vendor_type)} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpen(v)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={(e) => handleDelete(e, v._id)}>
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

      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        <DialogContent>
          <TextField label="Vendor Name *" size="small" fullWidth sx={{ mb: 2, mt: 1 }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <TextField label="Contact Person" size="small" fullWidth sx={{ mb: 2 }} value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} />
          <TextField label="Email" type="email" size="small" fullWidth sx={{ mb: 2 }} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <TextField label="Phone" size="small" fullWidth sx={{ mb: 2 }} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <TextField label="Address" size="small" fullWidth sx={{ mb: 2 }} multiline minRows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          <TextField select label="Vendor Type" size="small" fullWidth sx={{ mb: 2 }} value={form.vendor_type} onChange={(e) => setForm((f) => ({ ...f, vendor_type: e.target.value }))}>
            <MenuItem value="Hardware">Hardware</MenuItem>
            <MenuItem value="Software">Software</MenuItem>
            <MenuItem value="Network">Network</MenuItem>
            <MenuItem value="General">General</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.name}>{saving ? "Saving..." : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
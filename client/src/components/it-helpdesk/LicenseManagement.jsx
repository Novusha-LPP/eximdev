import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from "@mui/material";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const EMPTY_FORM = {
  software_name: "",
  license_key: "",
  vendor: "",
  total_seats: "",
  used_seats: "0",
  purchase_date: "",
  expiry_date: "",
  cost: "",
};

export default function LicenseManagement() {
  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await itHelpdeskAPI.licenses.getAll();
      setData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); fetchVendors(); }, []);

  const fetchVendors = async () => {
    try {
      const res = await itHelpdeskAPI.vendors.getAll();
      setVendors(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      total_seats: Number(form.total_seats),
      used_seats: Number(form.used_seats),
      cost: form.cost ? Number(form.cost) : undefined,
      vendor: form.vendor || undefined,
    };
    try {
      if (editId) {
        await itHelpdeskAPI.licenses.update(editId, payload);
      } else {
        await itHelpdeskAPI.licenses.create(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this license?")) return;
    await itHelpdeskAPI.licenses.remove(id);
    fetchData();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Software Licenses</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setForm({...EMPTY_FORM}); setShowModal(true); }}>
          Add License
        </Button>
      </Box>
      {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
        <TableContainer>
          <Table>
            <TableHead><TableRow>
              <TableCell>Software Name</TableCell><TableCell>License Key</TableCell><TableCell>Total Seats</TableCell><TableCell>Used</TableCell><TableCell>Expiry Date</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.length === 0 ? <TableRow><TableCell colSpan={6} align="center">No licenses found</TableCell></TableRow> :
                data.map((l) => <TableRow key={l._id}><TableCell>{l.software_name}</TableCell><TableCell>{l.license_key || "—"}</TableCell><TableCell>{l.total_seats}</TableCell><TableCell>{l.used_seats}</TableCell><TableCell>{l.expiry_date ? new Date(l.expiry_date).toLocaleDateString() : "—"}</TableCell><TableCell align="right"><Button size="small" onClick={() => { setEditId(l._id); setForm({...l}); setShowModal(true); }}>Edit</Button>&nbsp;<Button size="small" color="error" onClick={(e) => handleDelete(e, l._id)}>Delete</Button></TableCell></TableRow>)
              }
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit" : "New"} License</DialogTitle>
        <DialogContent>
          <TextField label="Software Name *" size="small" fullWidth sx={{ mb: 2, mt: 1 }} value={form.software_name} onChange={(e) => setForm((f) => ({ ...f, software_name: e.target.value }))} />
          <TextField select label="Vendor" size="small" fullWidth sx={{ mb: 2 }} value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}>
            <MenuItem value="">No Vendor</MenuItem>
            {vendors.map((v) => <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>)}
          </TextField>
          <TextField label="License Key" size="small" fullWidth sx={{ mb: 2 }} value={form.license_key} onChange={(e) => setForm((f) => ({ ...f, license_key: e.target.value }))} />
          <TextField label="Total Seats" type="number" size="small" fullWidth sx={{ mb: 2 }} value={form.total_seats} onChange={(e) => setForm((f) => ({ ...f, total_seats: e.target.value }))} />
          <TextField label="Used Seats" type="number" size="small" fullWidth sx={{ mb: 2 }} value={form.used_seats} onChange={(e) => setForm((f) => ({ ...f, used_seats: e.target.value }))} />
          <TextField label="Expiry Date" type="date" size="small" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
          <TextField label="Cost" type="number" size="small" fullWidth sx={{ mb: 2 }} value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
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
  contract_type: "AMC",
  vendor: "",
  contract_number: "",
  start_date: "",
  end_date: "",
  coverage_details: "",
  renewal_reminder_days: "30",
};

export default function ContractManagement() {
  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await itHelpdeskAPI.contracts.getAll();
      setData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
      contract_type: form.contract_type,
      contract_number: form.contract_number,
      coverage_details: form.coverage_details || undefined,
      renewal_reminder_days: form.renewal_reminder_days || 30,
    };
    if (form.vendor) payload.vendor = form.vendor;
    if (form.start_date) payload.start_date = form.start_date;
    if (form.end_date) payload.end_date = form.end_date;
    try {
      if (editId) { await itHelpdeskAPI.contracts.update(editId, payload); }
      else { await itHelpdeskAPI.contracts.create(payload); }
      setShowModal(false); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this contract?")) return;
    await itHelpdeskAPI.contracts.remove(id);
    fetchData();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Contracts (AMC / Warranty)</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setForm({...EMPTY_FORM}); setShowModal(true); }}>
          Add Contract
        </Button>
      </Box>
      {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
        <TableContainer>
          <Table>
            <TableHead><TableRow>
              <TableCell>Type</TableCell><TableCell>Contract No</TableCell><TableCell>Start Date</TableCell><TableCell>End Date</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.length === 0 ? <TableRow><TableCell colSpan={6} align="center">No contracts found</TableCell></TableRow> :
                data.map((c) => <TableRow key={c._id}><TableCell>{c.contract_type}</TableCell><TableCell>{c.contract_number}</TableCell><TableCell>{c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"}</TableCell><TableCell>{c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}</TableCell><TableCell>{c.status}</TableCell><TableCell align="right"><Button size="small" onClick={() => { setEditId(c._id); setForm({...c}); setShowModal(true); }}>Edit</Button>&nbsp;<Button size="small" color="error" onClick={(e) => handleDelete(e, c._id)}>Delete</Button></TableCell></TableRow>)
              }
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit" : "New"} Contract</DialogTitle>
        <DialogContent>
          <TextField select label="Contract Type" size="small" fullWidth sx={{ mb: 2, mt: 1 }} value={form.contract_type} onChange={(e) => setForm((f) => ({ ...f, contract_type: e.target.value }))}>
            <MenuItem value="AMC">AMC</MenuItem><MenuItem value="Warranty">Warranty</MenuItem>
          </TextField>
          <TextField select label="Vendor" size="small" fullWidth sx={{ mb: 2 }} value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}>
            <MenuItem value="">Select Vendor</MenuItem>
            {vendors.map((v) => <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>)}
          </TextField>
          <TextField label="Contract Number *" size="small" fullWidth sx={{ mb: 2 }} value={form.contract_number} onChange={(e) => setForm((f) => ({ ...f, contract_number: e.target.value }))} />
          <TextField label="Start Date" type="date" size="small" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          <TextField label="End Date" type="date" size="small" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          <TextField label="Coverage Details" size="small" fullWidth sx={{ mb: 2 }} multiline minRows={2} value={form.coverage_details} onChange={(e) => setForm((f) => ({ ...f, coverage_details: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
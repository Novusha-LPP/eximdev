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

const CATEGORIES = ["Hardware Stock", "Consumables", "Spare Parts"];
const EMPTY_FORM = {
  item_name: "",
  category: "Hardware Stock",
  sku: "",
  quantity: "0",
  reorder_level: "5",
  unit: "pcs",
  vendor: "",
  location: "",
  notes: "",
};

export default function InventoryManagement() {
  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await itHelpdeskAPI.inventory.getAll();
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
      ...form,
      quantity: Number(form.quantity),
      reorder_level: Number(form.reorder_level),
      vendor: form.vendor || undefined,
    };
    try {
      if (editId) { await itHelpdeskAPI.inventory.update(editId, payload); }
      else { await itHelpdeskAPI.inventory.create(payload); }
      setShowModal(false); fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this item?")) return;
    await itHelpdeskAPI.inventory.remove(id);
    fetchData();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Inventory & Stock</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditId(null); setForm({...EMPTY_FORM}); setShowModal(true); }}>
          Add Item
        </Button>
      </Box>
      {loading ? <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box> : (
        <TableContainer>
          <Table>
            <TableHead><TableRow>
              <TableCell>Item Name</TableCell><TableCell>Category</TableCell><TableCell>Qty</TableCell><TableCell>Unit</TableCell><TableCell>Location</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.length === 0 ? <TableRow><TableCell colSpan={6} align="center">No items found</TableCell></TableRow> :
                data.map((item) => <TableRow key={item._id}><TableCell>{item.item_name}</TableCell><TableCell>{item.category}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{item.unit}</TableCell><TableCell>{item.location || "—"}</TableCell><TableCell align="right"><Button size="small" onClick={() => { setEditId(item._id); setForm({...item}); setShowModal(true); }}>Edit</Button>&nbsp;<Button size="small" color="error" onClick={(e) => handleDelete(e, item._id)}>Delete</Button></TableCell></TableRow>)
              }
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit" : "New"} Inventory Item</DialogTitle>
        <DialogContent>
          <TextField label="Item Name *" size="small" fullWidth sx={{ mb: 2, mt: 1 }} value={form.item_name} onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))} />
          <TextField select label="Category" size="small" fullWidth sx={{ mb: 2 }} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField select label="Vendor" size="small" fullWidth sx={{ mb: 2 }} value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}>
            <MenuItem value="">No Vendor</MenuItem>
            {vendors.map((v) => <MenuItem key={v._id} value={v._id}>{v.name}</MenuItem>)}
          </TextField>
          <TextField label="Quantity" type="number" size="small" fullWidth sx={{ mb: 2 }} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <TextField label="Reorder Level" type="number" size="small" fullWidth sx={{ mb: 2 }} value={form.reorder_level} onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value }))} />
          <TextField label="Unit" size="small" fullWidth sx={{ mb: 2 }} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          <TextField label="Location" size="small" fullWidth sx={{ mb: 2 }} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          <TextField label="Notes" size="small" fullWidth sx={{ mb: 2 }} multiline minRows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
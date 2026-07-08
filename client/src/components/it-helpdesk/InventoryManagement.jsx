import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import NewReleasesIcon from "@mui/icons-material/NewReleases";

import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";

const CATEGORIES = [
  "Computer",
  "Laptop",
  "Printer",
  "Monitor",
  "Server",
  "Network Device",
  "Mobile Device",
  "Software License",
  "Other",
];

const EMPTY_FORM = {
  item_id: "",
  brand: "",
  model: "",
  category: "Computer",
  inventory_type: "Old",
  warranty_start_date: "",
  warranty_end_date: "",
};

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("old");
  const [oldData, setOldData] = useState([]);
  const [newData, setNewData] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const {
    logCreate,
    logUpdate,
    logDelete,
  } = useModuleAuditLogs("Inventory");

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      const [oldRes, newRes, assetsRes] = await Promise.all([
        itHelpdeskAPI.inventory.getAll({
          inventory_type: "Old",
        }),
        itHelpdeskAPI.inventory.getAll({
          inventory_type: "New",
        }),
        itHelpdeskAPI.assets.getAll(),
      ]);

      setOldData(oldRes.data || []);
      setNewData(newRes.data || []);
      setAssetsList(assetsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);

    setForm({
      ...EMPTY_FORM,
      inventory_type: activeTab === "old" ? "Old" : "New",
    });

    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);

    setForm({
      item_id: item.item_id || "",
      brand: item.brand || "",
      model: item.model || "",
      category: item.category || "Computer",
      inventory_type: item.inventory_type || "Old",
      warranty_start_date: formatDateForInput(item.warranty_start_date),
      warranty_end_date: formatDateForInput(item.warranty_end_date),
    });

    setShowModal(true);
  };

  const handleSave = async () => {
    if (
      !form.item_id.trim() ||
      !form.brand.trim() ||
      !form.model.trim() ||
      !form.category ||
      !form.warranty_start_date ||
      !form.warranty_end_date
    ) {
      alert("Please fill all required fields.");
      return;
    }

    const payload = {
      item_id: form.item_id.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      category: form.category,
      inventory_type: form.inventory_type,
      warranty_start_date: new Date(form.warranty_start_date),
      warranty_end_date: new Date(form.warranty_end_date),
    };

    try {
      if (editId) {
        await itHelpdeskAPI.inventory.update(editId, payload);

        logUpdate(
          editId,
          `Updated inventory item: ${form.item_id}`
        );
      } else {
        await itHelpdeskAPI.inventory.create(payload);

        logCreate(
          "new-item",
          `Created inventory item: ${form.item_id}`
        );
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      console.error("Error saving inventory:", err);

      alert(
        err.response?.data?.message ||
        err.message ||
        "Failed to save inventory."
      );
    }
  };

  const handleDelete = async (e, id, itemId) => {
    e.stopPropagation();

    if (!window.confirm(`Delete "${itemId}"?`)) return;

    try {
      await itHelpdeskAPI.inventory.remove(id);

      logDelete(
        id,
        `Deleted inventory item: ${itemId}`
      );

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete inventory item.");
    }
  };

  const currentData =
    activeTab === "old"
      ? oldData
      : newData;

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" fontWeight={700}>
          Inventory & Stock
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
        >
          Add {activeTab === "old" ? "Old" : "New"} Item
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
        >
          <Tab
            value="old"
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Inventory2Icon fontSize="small" />
                Old Inventory
                <Chip
                  label={oldData.length}
                  size="small"
                  color="default"
                />
              </Box>
            }
          />

          <Tab
            value="new"
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <NewReleasesIcon fontSize="small" />
                New Inventory
                <Chip
                  label={newData.length}
                  size="small"
                  color="primary"
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Item ID</strong></TableCell>
                <TableCell><strong>Brand</strong></TableCell>
                <TableCell><strong>Model</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell><strong>Warranty Start</strong></TableCell>
                <TableCell><strong>Warranty End</strong></TableCell>
                <TableCell align="right">
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {currentData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                  >
                    No Inventory Found
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((item) => (
                  <TableRow
                    key={item._id}
                    hover
                  >
                    <TableCell>
                      {item.item_id}
                    </TableCell>

                    <TableCell>
                      {item.brand}
                    </TableCell>

                    <TableCell>
                      {item.model}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={item.category}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      {item.warranty_start_date
                        ? new Date(item.warranty_start_date).toISOString().split('T')[0]
                        : "-"}
                    </TableCell>

                    <TableCell>
                      {item.warranty_end_date
                        ? new Date(item.warranty_end_date).toISOString().split('T')[0]
                        : "-"}
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        sx={{ mr: 1 }}
                        onClick={() => handleOpenEdit(item)}
                      >
                        Edit
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={(e) => handleDelete(e, item._id, item.item_id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editId ? "Edit Inventory Item" : `Add ${activeTab === "old" ? "Old" : "New"} Item`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              select
              autoFocus
              margin="dense"
              label="Item ID (Asset ID)"
              fullWidth
              variant="outlined"
              value={form.item_id}
              onChange={(e) => setForm({ ...form, item_id: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {assetsList.map((asset) => (
                <MenuItem key={asset._id} value={asset.asset_tag}>
                  {asset.asset_tag} {asset.asset_name ? `- ${asset.asset_name}` : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              label="Brand"
              fullWidth
              variant="outlined"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Model"
              fullWidth
              variant="outlined"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              select
              margin="dense"
              label="Category"
              fullWidth
              variant="outlined"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              sx={{ mb: 2 }}
            >
              {CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              margin="dense"
              label="Warranty Start Date"
              fullWidth
              variant="outlined"
              value={form.warranty_start_date}
              onChange={(e) => setForm({ ...form, warranty_start_date: e.target.value })}
              sx={{ mb: 3, width: "100%", position: "relative", zIndex: 1 }}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              type="date"
              margin="dense"
              label="Warranty End Date"
              fullWidth
              variant="outlined"
              value={form.warranty_end_date}
              onChange={(e) => setForm({ ...form, warranty_end_date: e.target.value })}
              sx={{ mb: 3, width: "100%", position: "relative", zIndex: 1 }}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editId ? "Update" : `Add ${activeTab === "old" ? "Old" : "New"} Item`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

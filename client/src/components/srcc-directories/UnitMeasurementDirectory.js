import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function UnitMeasurementDirectory() {
  const [units, setUnits] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({ name: "", measurements: [] });
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [newMeasurement, setNewMeasurement] = useState({
    unit: "",
    symbol: "",
    decimal_places: 2,
  });
  const [editingMeasurementIndex, setEditingMeasurementIndex] = useState(null);
  const [errors, setErrors] = useState({});

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  const fetchUnits = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-unit-measurements`);
      setUnits(response.data);
    } catch (error) {
      console.error("Error fetching unit measurements:", error);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ name: "", measurements: [] });
    setOpenModal(true);
    setSelectedUnit(null);
    setErrors({});
  };

  const handleEdit = (unit) => {
    setModalMode("edit");
    setFormData({ name: unit.name, measurements: unit.measurements });
    setEditData(unit);
    setOpenModal(true);
    setSelectedUnit(unit);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this unit measurement?")
    ) {
      try {
        await axios.delete(`${API_URL}/delete-unit-measurement/${id}`);
        fetchUnits();
      } catch (error) {
        console.error("Error deleting unit measurement:", error);
      }
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setErrors({ name: "Category name is required" });
      return;
    }
    if (formData.measurements.length === 0) {
      setErrors({ measurements: "At least one measurement is required" });
      return;
    }
    try {
      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-unit-measurement`, formData);
      } else {
        await axios.put(
          `${API_URL}/update-unit-measurement/${editData._id}`,
          formData
        );
      }
      setOpenModal(false);
      fetchUnits();
    } catch (error) {
      console.error("Error saving unit measurement:", error);
      alert(error.response?.data?.error || "An error occurred");
    }
  };

  const handleAddMeasurement = () => {
    const { unit, symbol, decimal_places } = newMeasurement;
    if (!unit.trim() || !symbol.trim() || decimal_places === "") {
      setErrors({ newMeasurement: "All measurement fields are required" });
      return;
    }
    if (editingMeasurementIndex !== null) {
      const updated = [...formData.measurements];
      updated[editingMeasurementIndex] = newMeasurement;
      setFormData({ ...formData, measurements: updated });
      setEditingMeasurementIndex(null);
    } else {
      setFormData((prev) => ({
        ...prev,
        measurements: [...prev.measurements, newMeasurement],
      }));
    }
    setNewMeasurement({ unit: "", symbol: "", decimal_places: 2 });
    setErrors({});
  };

  const handleEditMeasurement = (index) => {
    setNewMeasurement(formData.measurements[index]);
    setEditingMeasurementIndex(index);
  };

  const handleDeleteMeasurement = (index) => {
    setFormData((prev) => ({
      ...prev,
      measurements: prev.measurements.filter((_, i) => i !== index),
    }));
    if (editingMeasurementIndex === index) {
      setNewMeasurement({ unit: "", symbol: "", decimal_places: 2 });
      setEditingMeasurementIndex(null);
    }
  };

  const handleFieldChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleMeasurementFieldChange = (e) => {
    setNewMeasurement({ ...newMeasurement, [e.target.name]: e.target.value });
    setErrors({ ...errors, newMeasurement: "" });
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Unit Measurement
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Category Name</strong>
              </TableCell>
              <TableCell>
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit._id}>
                <TableCell>
                  <Button onClick={() => handleEdit(unit)}>{unit.name}</Button>
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(unit)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(unit._id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add" : "Edit"} Unit Measurement
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Category Name"
            name="name"
            value={formData.name}
            onChange={handleFieldChange}
            error={!!errors.name}
            helperText={errors.name}
          />

          <Typography variant="h6" sx={{ mt: 2 }}>
            Measurements
          </Typography>
          {errors.measurements && (
            <Typography color="error" variant="body2">
              {errors.measurements}
            </Typography>
          )}
          <List dense>
            {formData.measurements.map((m, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <>
                    <IconButton
                      edge="end"
                      color="primary"
                      onClick={() => handleEditMeasurement(index)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleDeleteMeasurement(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={`${m.unit} (${m.symbol})`}
                  secondary={`Decimal Places: ${m.decimal_places}`}
                />
              </ListItem>
            ))}
          </List>

          <Box display="flex" gap={2} mt={2}>
            <TextField
              label="Unit"
              name="unit"
              value={newMeasurement.unit}
              onChange={handleMeasurementFieldChange}
            />
            <TextField
              label="Symbol"
              name="symbol"
              value={newMeasurement.symbol}
              onChange={handleMeasurementFieldChange}
            />
            <TextField
              label="Decimal Places"
              name="decimal_places"
              type="number"
              value={newMeasurement.decimal_places}
              onChange={handleMeasurementFieldChange}
            />
            <Button onClick={handleAddMeasurement} variant="outlined">
              {editingMeasurementIndex !== null ? "Update" : "Add"}
            </Button>
          </Box>
          {errors.newMeasurement && (
            <Typography color="error" variant="body2" mt={1}>
              {errors.newMeasurement}
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UnitMeasurementDirectory;

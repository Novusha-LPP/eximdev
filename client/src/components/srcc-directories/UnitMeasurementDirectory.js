import React, { useState, useEffect, useCallback } from "react";
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
  const [newMeasurement, setNewMeasurement] = useState({
    unit: "",
    symbol: "",
    decimal_places: 2,
  });
  const [editingMeasurementIndex, setEditingMeasurementIndex] = useState(null);
  const [errors, setErrors] = useState({});

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";
  const fetchUnits = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/get-unit-measurements`);
      setUnits(response.data);
    } catch (error) {
      console.error("Error fetching unit measurements:", error);
    }
  }, [API_URL]);
  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);
  const handleAdd = () => {
    setModalMode("add");
    setFormData({ name: "", measurements: [] });
    setOpenModal(true);
    setErrors({});
  };
  const handleEdit = (unit) => {
    setModalMode("edit");
    setFormData({ name: unit.name, measurements: unit.measurements });
    setEditData(unit);
    setOpenModal(true);
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

    // Client-side duplicate check before sending to server
    const unitSymbolPairs = new Set();
    for (const measurement of formData.measurements) {
      const pair = `${measurement.unit
        .toLowerCase()
        .trim()}-${measurement.symbol.toLowerCase().trim()}`;
      if (unitSymbolPairs.has(pair)) {
        setErrors({
          measurements: `Duplicate measurement found: ${measurement.unit} (${measurement.symbol})`,
        });
        return;
      }
      unitSymbolPairs.add(pair);
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
      setFormData({ name: "", measurements: [] });
      setErrors({});
      fetchUnits();
    } catch (error) {
      console.error("Error saving unit measurement:", error);
      const errorMessage = error.response?.data?.error || "An error occurred";
      setErrors({ server: errorMessage });
    }
  };
  const handleAddMeasurement = () => {
    const { unit, symbol, decimal_places } = newMeasurement;
    if (!unit.trim() || !symbol.trim() || decimal_places === "") {
      setErrors({ newMeasurement: "All measurement fields are required" });
      return;
    }

    // Check for duplicate measurements - both unit and symbol combination should be unique
    const isDuplicate = formData.measurements.some((measurement, index) => {
      // Skip the current editing measurement when checking for duplicates
      if (
        editingMeasurementIndex !== null &&
        index === editingMeasurementIndex
      ) {
        return false;
      }
      return (
        measurement.unit.toLowerCase().trim() === unit.toLowerCase().trim() &&
        measurement.symbol.toLowerCase().trim() === symbol.toLowerCase().trim()
      );
    });

    if (isDuplicate) {
      setErrors({
        newMeasurement: `Measurement "${unit.trim()} (${symbol.trim()})" already exists in this category`,
      });
      return;
    }

    // Trim whitespace from inputs
    const trimmedMeasurement = {
      unit: unit.trim(),
      symbol: symbol.trim(),
      decimal_places: parseInt(decimal_places),
    };

    if (editingMeasurementIndex !== null) {
      const updated = [...formData.measurements];
      updated[editingMeasurementIndex] = trimmedMeasurement;
      setFormData({ ...formData, measurements: updated });
      setEditingMeasurementIndex(null);
    } else {
      setFormData((prev) => ({
        ...prev,
        measurements: [...prev.measurements, trimmedMeasurement],
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
          </Box>{" "}
          {errors.newMeasurement && (
            <Typography color="error" variant="body2" mt={1}>
              {errors.newMeasurement}
            </Typography>
          )}
          {errors.server && (
            <Typography color="error" variant="body2" mt={1}>
              {errors.server}
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

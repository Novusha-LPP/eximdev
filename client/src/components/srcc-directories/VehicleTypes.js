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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  Checkbox,
  ListItemText,
  FormControl,
  InputLabel,
  Grid,
  Autocomplete,
  Typography,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import useCommodities from "../../customHooks/Transport/useCommodities";

// -----------------------------------------------------
// Validation schema with Yup
// -----------------------------------------------------
const validationSchema = Yup.object({
  vehicleType: Yup.string().required("Vehicle Type is required"),
  shortName: Yup.string().required("Short Name is required"),
  loadCapacityValue: Yup.number()
    .required("Load Capacity is required")
    .min(0, "Cannot be negative"),
  loadCapacityUnit: Yup.string().required("Load Capacity Unit is required"),
  engineCapacityValue: Yup.number()
    .required("Engine Capacity is required")
    .min(0, "Cannot be negative"),
  engineCapacityUnit: Yup.string().required("Engine Capacity Unit is required"),
  cargoTypeAllowed: Yup.array()
    .min(1, "At least one cargo type must be selected")
    .required("Cargo type is required"),
  CommodityCarry: Yup.array()
    .min(1, "At least one commodity must be selected")
    .required("Commodity carry is required"),
});

const VehicleTypes = () => {
  const [vehicles, setVehicles] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");

  // Form data
  const [formData, setFormData] = useState({
    vehicleType: "",
    shortName: "",
    loadCapacityValue: "",
    loadCapacityUnit: "",
    engineCapacityValue: "",
    engineCapacityUnit: "",
    cargoTypeAllowed: [],
    CommodityCarry: [],
  });

  // States for units from the API
  const [loadUnits, setLoadUnits] = useState([]); // from "Weight"
  const [engineUnits, setEngineUnits] = useState([]); // from "Volumes"

  // Custom hook for fetching commodity data.
  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";
  const { commodities, loading, error } = useCommodities(API_URL);

  // -----------------------------------------------------
  // 1. Fetch existing vehicle types
  // -----------------------------------------------------
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/vehicle-types`);
      setVehicles(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching vehicles:", error);
    }
  };

  // -----------------------------------------------------
  // 2. Fetch all unit measurements
  // -----------------------------------------------------
  const fetchUnits = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-unit-measurements`);
      // Find "Weight" category for load capacity
      const weightCategory = response.data.find(
        (item) => item.name === "Weights"
      );
      if (weightCategory) {
        setLoadUnits(weightCategory.measurements);
      }
      // Find "Volumes" category for engine capacity
      const volumeCategory = response.data.find(
        (item) => item.name === "Volumes"
      );
      if (volumeCategory) {
        setEngineUnits(volumeCategory.measurements);
      }
    } catch (err) {
      console.error("❌ Error fetching unit measurements:", err);
    }
  };

  // -----------------------------------------------------
  // useEffect: fetch vehicles & units on mount
  // -----------------------------------------------------
  useEffect(() => {
    fetchVehicles();
    fetchUnits();
  }, []);

  // -----------------------------------------------------
  // Handler: Add
  // -----------------------------------------------------
  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      vehicleType: "",
      shortName: "",
      loadCapacityValue: "",
      loadCapacityUnit: "",
      engineCapacityValue: "",
      engineCapacityUnit: "",
      cargoTypeAllowed: [],
      CommodityCarry: [],
    });
    setOpenModal(true);
  };

  // -----------------------------------------------------
  // Handler: Edit
  // -----------------------------------------------------
  const handleEdit = (vehicle) => {
    setModalMode("edit");
    setFormData({
      _id: vehicle._id,
      vehicleType: vehicle.vehicleType || "",
      shortName: vehicle.shortName || "",
      loadCapacityValue: vehicle.loadCapacity?.value || "",
      loadCapacityUnit: vehicle.loadCapacity?.unit || "",
      engineCapacityValue: vehicle.engineCapacity?.value || "",
      engineCapacityUnit: vehicle.engineCapacity?.unit || "",
      cargoTypeAllowed: vehicle.cargoTypeAllowed || [],
      CommodityCarry: vehicle.CommodityCarry || [],
    });
    setOpenModal(true);
  };

  // -----------------------------------------------------
  // Handler: Delete
  // -----------------------------------------------------
  const handleDelete = async (id) => {
    if (
      window.confirm("❗ Are you sure you want to delete this vehicle type?")
    ) {
      try {
        const response = await axios.delete(`${API_URL}/vehicle-types/${id}`);
        if (response.status === 200) {
          alert("✅ Vehicle type deleted successfully!");
          fetchVehicles();
        }
      } catch (error) {
        console.error("❌ Error deleting vehicle:", error);
        alert(
          `⚠️ Failed to delete vehicle: ${
            error.response?.data?.error || "Server error"
          }`
        );
      }
    }
  };

  // -----------------------------------------------------
  // Handler: Save (Add or Edit)
  // -----------------------------------------------------
  const handleSave = async (values) => {
    const {
      _id,
      vehicleType,
      shortName,
      loadCapacityValue,
      loadCapacityUnit,
      engineCapacityValue,
      engineCapacityUnit,
      cargoTypeAllowed,
      CommodityCarry,
    } = values;

    // Format data to match Node.js schema
    const formattedData = {
      vehicleType: vehicleType.trim(),
      shortName: shortName.trim(),
      loadCapacity: {
        value: loadCapacityValue,
        unit: loadCapacityUnit,
      },
      engineCapacity: {
        value: engineCapacityValue,
        unit: engineCapacityUnit,
      },
      cargoTypeAllowed,
      CommodityCarry,
    };

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/vehicle-types`, formattedData);
        alert("✅ Vehicle type added successfully!");
      } else {
        response = await axios.put(
          `${API_URL}/vehicle-types/${_id}`,
          formattedData
        );
        alert("✅ Vehicle type updated successfully!");
      }

      if (response.status === 200 || response.status === 201) {
        setOpenModal(false);
        fetchVehicles();
      }
    } catch (error) {
      console.error("❌ Error saving vehicle:", error);
      alert(
        `⚠️ Failed to save vehicle: ${
          error.response?.data?.error || "Server error"
        }`
      );
    }
  };

  // -----------------------------------------------------
  // Render
  // -----------------------------------------------------
  return (
    <Box>
      {/* Add Button */}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Vehicle Type
        </Button>
      </Box>

      {/* Vehicles Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Vehicle Type</TableCell>
              <TableCell>Short Name</TableCell>
              <TableCell>Load Capacity</TableCell>
              <TableCell>Engine Capacity</TableCell>
              <TableCell>Cargo Type Allowed</TableCell>
              <TableCell>Commodity Carry</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle._id}>
                <TableCell>{vehicle.vehicleType}</TableCell>
                <TableCell>{vehicle.shortName}</TableCell>
                <TableCell>
                  {vehicle.loadCapacity?.value} {vehicle.loadCapacity?.unit}
                </TableCell>
                <TableCell>
                  {vehicle.engineCapacity?.value} {vehicle.engineCapacity?.unit}
                </TableCell>
                <TableCell>
                  {vehicle.cargoTypeAllowed?.length
                    ? vehicle.cargoTypeAllowed.join(", ")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {vehicle.CommodityCarry?.length
                    ? vehicle.CommodityCarry.join(", ")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(vehicle)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(vehicle._id)}
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

      {/* Dialog (Formik Form) */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add New Vehicle Type" : "Edit Vehicle Type"}
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={formData}
            validationSchema={validationSchema}
            enableReinitialize
            onSubmit={handleSave}
          >
            {({
              values,
              handleChange,
              handleBlur,
              errors,
              touched,
              setFieldValue,
            }) => (
              <Form>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  {/* Vehicle Type & Short Name */}
                  <TextField
                    name="vehicleType"
                    label="Vehicle Type"
                    value={values.vehicleType}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    error={touched.vehicleType && Boolean(errors.vehicleType)}
                    helperText={touched.vehicleType && errors.vehicleType}
                  />

                  <TextField
                    name="shortName"
                    label="Short Name"
                    value={values.shortName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    error={touched.shortName && Boolean(errors.shortName)}
                    helperText={touched.shortName && errors.shortName}
                  />

                  {/* Load Capacity Value & Unit */}
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        type="number"
                        name="loadCapacityValue"
                        label="Load Capacity Value"
                        value={values.loadCapacityValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        error={
                          touched.loadCapacityValue &&
                          Boolean(errors.loadCapacityValue)
                        }
                        helperText={
                          touched.loadCapacityValue && errors.loadCapacityValue
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Unit (Weights)</InputLabel>
                        <Select
                          name="loadCapacityUnit"
                          label="Unit (Weights)"
                          value={values.loadCapacityUnit || ""}
                          onChange={(e) =>
                            setFieldValue("loadCapacityUnit", e.target.value)
                          }
                          onBlur={handleBlur}
                        >
                          <MenuItem value="">
                            <em>Unit (Weights)</em>
                          </MenuItem>
                          {loadUnits.map((u) => (
                            <MenuItem key={u._id} value={u.symbol}>
                              {u.unit} ({u.symbol})
                            </MenuItem>
                          ))}
                        </Select>
                        {touched.loadCapacityUnit &&
                          errors.loadCapacityUnit && (
                            <Typography
                              sx={{ color: "red", fontSize: 12, mt: 0.5 }}
                            >
                              {errors.loadCapacityUnit}
                            </Typography>
                          )}
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Engine Capacity Value & Unit */}
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        type="number"
                        name="engineCapacityValue"
                        label="Engine Capacity Value"
                        value={values.engineCapacityValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        error={
                          touched.engineCapacityValue &&
                          Boolean(errors.engineCapacityValue)
                        }
                        helperText={
                          touched.engineCapacityValue &&
                          errors.engineCapacityValue
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Unit (Volumes)</InputLabel>
                        <Select
                          name="engineCapacityUnit"
                          label="Unit (Volumes)"
                          value={values.engineCapacityUnit || ""}
                          onChange={(e) =>
                            setFieldValue("engineCapacityUnit", e.target.value)
                          }
                          onBlur={handleBlur}
                        >
                          <MenuItem value="">
                            <em>Select Unit</em>
                          </MenuItem>
                          {engineUnits.map((u) => (
                            <MenuItem key={u._id} value={u.symbol}>
                              {u.unit} ({u.symbol})
                            </MenuItem>
                          ))}
                        </Select>
                        {touched.engineCapacityUnit &&
                          errors.engineCapacityUnit && (
                            <Typography
                              sx={{ color: "red", fontSize: 12, mt: 0.5 }}
                            >
                              {errors.engineCapacityUnit}
                            </Typography>
                          )}
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* Cargo Type Allowed */}
                  <FormControl fullWidth>
                    <Autocomplete
                      multiple
                      id="cargo-type-allowed"
                      options={["Package", "LiquidBulk", "Bulk", "Container"]}
                      disableCloseOnSelect
                      getOptionLabel={(option) => option}
                      value={values.cargoTypeAllowed || []}
                      onChange={(event, newValue) => {
                        setFieldValue("cargoTypeAllowed", newValue);
                      }}
                      renderOption={(props, option, { selected }) => (
                        <li {...props}>
                          <Checkbox
                            style={{ marginRight: 8 }}
                            checked={selected}
                          />
                          {option}
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Cargo Type Allowed"
                          name="cargoTypeAllowed"
                          fullWidth
                          error={
                            touched.cargoTypeAllowed &&
                            Boolean(errors.cargoTypeAllowed)
                          }
                          helperText={
                            touched.cargoTypeAllowed && errors.cargoTypeAllowed
                          }
                        />
                      )}
                    />
                  </FormControl>

                  {/* Commodity Carry */}
                  <FormControl fullWidth>
                    <Autocomplete
                      multiple
                      id="commodity-carry"
                      options={commodities}
                      getOptionLabel={(option) => option.label}
                      getOptionDisabled={() => loading || !!error}
                      disableCloseOnSelect
                      value={
                        commodities.filter((c) =>
                          values.CommodityCarry?.includes(c.value)
                        ) || []
                      }
                      onChange={(event, newValue) => {
                        const selectedValues = newValue.map(
                          (item) => item.value
                        );
                        setFieldValue("CommodityCarry", selectedValues);
                      }}
                      loading={loading}
                      renderOption={(props, option, { selected }) => (
                        <li {...props}>
                          <Checkbox
                            checked={selected}
                            style={{ marginRight: 8 }}
                          />
                          {option.label}
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Commodity Carry"
                          name="CommodityCarry"
                          fullWidth
                          error={
                            touched.CommodityCarry &&
                            Boolean(errors.CommodityCarry)
                          }
                          helperText={
                            touched.CommodityCarry && errors.CommodityCarry
                          }
                        />
                      )}
                    />
                  </FormControl>
                </Box>

                <DialogActions sx={{ mt: 2 }}>
                  <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                  <Button variant="contained" type="submit">
                    {modalMode === "add" ? "Add" : "Save"}
                  </Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VehicleTypes;

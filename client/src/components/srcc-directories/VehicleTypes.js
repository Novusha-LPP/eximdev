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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import useCommodities from "../../customHooks/Transport/useCommodities";

// ✅ Validation schema with Yup
const validationSchema = Yup.object({
  vehicleType: Yup.string().required("Vehicle Type is required"),
  shortName: Yup.string().required("Short Name is required"),
  loadCapacity: Yup.string().required("Load Capacity is required"),
  engineCapacity: Yup.string().required("Engine Capacity is required"),
  cargoTypeAllowed: Yup.string().required("Cargo Type Allowed is required"),
  CommodityCarry: Yup.string().required("Commodity Carry is required"),
});

const VehicleTypes = () => {
  const [vehicles, setVehicles] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    vehicleType: "",
    shortName: "",
    loadCapacity: "",
    engineCapacity: "",
    cargoTypeAllowed: "",
    CommodityCarry: "",
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";
  const { commodities, loading, error } = useCommodities(API_URL);

  // ✅ Fetch vehicle data from API
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-vehicle-type`);
      setVehicles(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching vehicles:", error);
    }
  };

  useEffect(() => {
    fetchVehicles(); // ✅ Fetch data on mount
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      vehicleType: "",
      shortName: "",
      loadCapacity: "",
      engineCapacity: "",
      cargoTypeAllowed: "",
      CommodityCarry: "",
    });
    setOpenModal(true);
  };

  const handleEdit = (vehicle) => {
    setModalMode("edit");
    setFormData({
      _id: vehicle._id,
      vehicleType: vehicle.vehicleType,
      shortName: vehicle.shortName,
      loadCapacity: vehicle.loadCapacity,
      engineCapacity: vehicle.engineCapacity,
      cargoTypeAllowed: vehicle.cargoTypeAllowed,
      CommodityCarry: vehicle.CommodityCarry,
    });
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(`❗ Are you sure you want to delete this vehicle type?`)
    ) {
      try {
        const response = await axios.delete(
          `${API_URL}/delete-vehicle-type/${id}`
        );
        if (response.status === 200) {
          alert("✅ Vehicle type deleted successfully!");
          fetchVehicles(); // ✅ Refresh data without page reload
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

  const handleSave = async (values) => {
    const {
      _id,
      vehicleType,
      shortName,
      loadCapacity,
      engineCapacity,
      cargoTypeAllowed,
      CommodityCarry,
    } = values;

    try {
      const formattedData = {
        vehicleType: vehicleType.trim(),
        shortName: shortName.trim(),
        loadCapacity: loadCapacity.trim(),
        engineCapacity: engineCapacity.trim(),
        cargoTypeAllowed,
        CommodityCarry,
      };

      let response;

      if (modalMode === "add") {
        response = await axios.post(
          `${API_URL}/add-vehicle-type`,
          formattedData
        );
        alert("✅ Vehicle type added successfully!");
      } else {
        response = await axios.put(
          `${API_URL}/update-vehicle-type/${_id}`,
          formattedData
        );
        alert("✅ Vehicle type updated successfully!");
      }

      if (response.status === 200 || response.status === 201) {
        setOpenModal(false); // ✅ Close modal
        fetchVehicles(); // ✅ Refresh data automatically
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

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Vehicle Type
        </Button>
      </Box>

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
                <TableCell>{vehicle.loadCapacity}</TableCell>
                <TableCell>{vehicle.engineCapacity}</TableCell>
                <TableCell>{vehicle.cargoTypeAllowed}</TableCell>
                <TableCell>{vehicle.CommodityCarry}</TableCell>
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

      {/* ✅ Formik Modal for Adding & Editing Vehicle Types */}
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
            onSubmit={handleSave}
          >
            {({ values, handleChange, handleBlur, errors, touched }) => (
              <Form>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <TextField
                    name="vehicleType"
                    label="Vehicle Type"
                    value={values.vehicleType}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                  />
                  <TextField
                    name="shortName"
                    label="Short Name"
                    value={values.shortName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                  />
                  <TextField
                    name="loadCapacity"
                    label="Load Capacity"
                    value={values.loadCapacity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                  />
                  <TextField
                    name="engineCapacity"
                    label="Engine Capacity"
                    value={values.engineCapacity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                  />
                  <TextField
                    select
                    name="cargoTypeAllowed"
                    label="Cargo Type Allowed"
                    value={values.cargoTypeAllowed}
                    onChange={handleChange}
                    fullWidth
                    required
                  >
                    <MenuItem value="Package">Package</MenuItem>
                    <MenuItem value="LiquidBulk">Liquid Bulk</MenuItem>
                    <MenuItem value="Bulk">Bulk</MenuItem>
                    <MenuItem value="Container">Container</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Commodity Carry"
                    name="CommodityCarry"
                    value={values.CommodityCarry}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.CommodityCarry && Boolean(errors.CommodityCarry)
                    }
                    helperText={touched.CommodityCarry && errors.CommodityCarry}
                  >
                    {loading ? (
                      <MenuItem disabled>Loading...</MenuItem>
                    ) : error ? (
                      <MenuItem disabled>Error loading commodities</MenuItem>
                    ) : (
                      commodities.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))
                    )}
                  </TextField>
                </Box>
                <DialogActions>
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

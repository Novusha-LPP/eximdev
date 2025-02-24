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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import useCommodities from "../../customHooks/Transport/useCommodities";
import { MenuItem } from "@mui/material";

// Validation schema with Yup
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

  // Fetch vehicle data from API
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-vehicle-type`);
      const vehicleList = response.data.data || [];
      setVehicles(vehicleList);
    } catch (error) {
      console.error("❌ Error fetching vehicles:", error);
    }
  };

  useEffect(() => {
    fetchVehicles();
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
      vehicleType: vehicle.vehicleType,
      shortName: vehicle.shortName,
      loadCapacity: vehicle.loadCapacity,
      engineCapacity: vehicle.engineCapacity,
      cargoTypeAllowed: vehicle.cargoTypeAllowed,
      CommodityCarry: vehicle.CommodityCarry,
    });
    setOpenModal(true);
  };

  const handleDelete = async (vehicleType) => {
    if (
      window.confirm(
        `Are you sure you want to delete this vehicle type: ${vehicleType}?`
      )
    ) {
      try {
        await axios.delete(`${API_URL}/delete-vehicle-type/${vehicleType}`);
        fetchVehicles();
      } catch (error) {
        console.error("❌ Error deleting vehicle:", error);
      }
    }
  };

  const handleSave = async (values) => {
    try {
      const response =
        modalMode === "add"
          ? await axios.post(`${API_URL}/add-vehicle-type`, values)
          : await axios.put(
              `${API_URL}/update-vehicle-type/${values.vehicleType}`,
              values
            );

      if (response.status === 200 || response.status === 201) {
        setOpenModal(false);
        fetchVehicles();
      }
    } catch (error) {
      console.error("❌ Error saving vehicle:", error);
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
                    onClick={() => handleDelete(vehicle.vehicleType)}
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

      {/* Formik Modal for Adding & Editing Vehicle Types */}
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
                    disabled={modalMode === "edit"} // Prevents editing in edit mode
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
                    required
                    error={touched.shortName && Boolean(errors.shortName)}
                    helperText={touched.shortName && errors.shortName}
                  />
                  <TextField
                    name="loadCapacity"
                    label="Load Capacity"
                    value={values.loadCapacity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.loadCapacity && Boolean(errors.loadCapacity)}
                    helperText={touched.loadCapacity && errors.loadCapacity}
                  />
                  <TextField
                    name="engineCapacity"
                    label="Engine Capacity"
                    value={values.engineCapacity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.engineCapacity && Boolean(errors.engineCapacity)
                    }
                    helperText={touched.engineCapacity && errors.engineCapacity}
                  />
                  <TextField
                    select
                    label="Cargo Type Allowed"
                    name="cargoTypeAllowed"
                    value={values.cargoTypeAllowed}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.cargoTypeAllowed &&
                      Boolean(errors.cargoTypeAllowed)
                    }
                    helperText={
                      touched.cargoTypeAllowed && errors.cargoTypeAllowed
                    }
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

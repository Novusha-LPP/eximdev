import React, { useEffect, useState } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";

// -------------------
// Validation Schema
// -------------------
const validationSchema = Yup.object({
  startingLocation: Yup.string().required("Starting Location is required"),
  destinationLocation: Yup.string().required(
    "Destination Location is required"
  ),
  returnLocation: Yup.string().required("Return Location is required"),
  vehicleType: Yup.string().required("Vehicle Type is required"),
  loadVehicleKms: Yup.number()
    .typeError("Must be a number")
    .required("Load Vehicle kms is required")
    .min(0, "Cannot be negative"),
  emptyVehicleKms: Yup.number()
    .typeError("Must be a number")
    .required("Empty Vehicle kms is required")
    .min(0, "Cannot be negative"),
  loadVehicleMileage: Yup.number()
    .typeError("Must be a number")
    .required("Load vehicle mileage is required")
    .min(0, "Cannot be negative"),
  emptyVehicleMileage: Yup.number()
    .typeError("Must be a number")
    .required("Empty vehicle mileage is required")
    .min(0, "Cannot be negative"),
  loadingExtraFuelVolume: Yup.number()
    .typeError("Must be a number")
    .required("Loading extra fuel volume is required")
    .min(0, "Cannot be negative"),
  unloadingExtraFuelVolume: Yup.number()
    .typeError("Must be a number")
    .required("Unloading extra fuel volume is required")
    .min(0, "Cannot be negative"),
  totalRequiredFuelVolume: Yup.number()
    .typeError("Must be a number")
    .required("Total required Fuel volume is required")
    .min(0, "Cannot be negative"),
  fuelRate: Yup.number()
    .typeError("Must be a number")
    .required("Fuel Rate is required")
    .min(0, "Cannot be negative"),
  cash: Yup.number()
    .typeError("Must be a number")
    .required("Cash is required")
    .min(0, "Cannot be negative"),
  totalAdvancePayableAmount: Yup.number()
    .typeError("Must be a number")
    .required("Total advance payable amount is required")
    .min(0, "Cannot be negative"),
});

const AdvanceToDriver = () => {
  // ---------------
  // Local States
  // ---------------
  const [advanceData, setAdvanceData] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");

  // We'll store the form data here
  const [formData, setFormData] = useState({
    startingLocation: "",
    destinationLocation: "",
    returnLocation: "",
    vehicleType: "",
    loadVehicleKms: "",
    emptyVehicleKms: "",
    loadVehicleMileage: "",
    emptyVehicleMileage: "",
    loadingExtraFuelVolume: "",
    unloadingExtraFuelVolume: "",
    totalRequiredFuelVolume: "",
    fuelRate: "",
    cash: "",
    totalAdvancePayableAmount: "",
  });

  // ---------------
  // API URL
  // ---------------
  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // ---------------
  // Fetch all
  // ---------------
  const fetchAdvanceData = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-advance-to-driver`);
      setAdvanceData(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching AdvanceToDriver:", error);
    }
  };

  // ---------------
  // Fetch vehicle types
  // ---------------
  const fetchVehicleTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/vehicle-types`);
      // Typically response.data might be { data: [...]}
      // Adjust if your API returns a different structure
      const list = response.data.data || [];
      setVehicleTypes(list);
    } catch (error) {
      console.error("❌ Error fetching vehicle types:", error);
    }
  };

  // ---------------
  // useEffect
  // ---------------
  useEffect(() => {
    fetchAdvanceData();
    fetchVehicleTypes();
  }, []);

  // ---------------
  // CRUD Handlers
  // ---------------

  // Handle Add
  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      startingLocation: "",
      destinationLocation: "",
      returnLocation: "",
      vehicleType: "",
      loadVehicleKms: "",
      emptyVehicleKms: "",
      loadVehicleMileage: "",
      emptyVehicleMileage: "",
      loadingExtraFuelVolume: "",
      unloadingExtraFuelVolume: "",
      totalRequiredFuelVolume: "",
      fuelRate: "",
      cash: "",
      totalAdvancePayableAmount: "",
    });
    setOpenModal(true);
  };

  // Handle Edit
  const handleEdit = (item) => {
    setModalMode("edit");
    setFormData({
      _id: item._id, // for updating only
      startingLocation: item.startingLocation || "",
      destinationLocation: item.destinationLocation || "",
      returnLocation: item.returnLocation || "",
      vehicleType: item.vehicleType || "",
      loadVehicleKms: item.loadVehicleKms ?? "",
      emptyVehicleKms: item.emptyVehicleKms ?? "",
      loadVehicleMileage: item.loadVehicleMileage ?? "",
      emptyVehicleMileage: item.emptyVehicleMileage ?? "",
      loadingExtraFuelVolume: item.loadingExtraFuelVolume ?? "",
      unloadingExtraFuelVolume: item.unloadingExtraFuelVolume ?? "",
      totalRequiredFuelVolume: item.totalRequiredFuelVolume ?? "",
      fuelRate: item.fuelRate ?? "",
      cash: item.cash ?? "",
      totalAdvancePayableAmount: item.totalAdvancePayableAmount ?? "",
    });
    setOpenModal(true);
  };

  // Handle Delete
  const handleDelete = async (item) => {
    if (
      window.confirm(
        `Are you sure you want to delete startingLocation: ${item.startingLocation}?`
      )
    ) {
      try {
        await axios.delete(`${API_URL}/delete-advance-to-driver/${item._id}`);
        fetchAdvanceData();
      } catch (error) {
        console.error("❌ Error deleting AdvanceToDriver:", error);
      }
    }
  };

  // Handle Save (Add/Edit)
  const handleSave = async (values) => {
    const { _id, ...restValues } = values;

    // Convert numeric fields to Number
    const formattedData = {
      ...restValues,
      loadVehicleKms: Number(restValues.loadVehicleKms),
      emptyVehicleKms: Number(restValues.emptyVehicleKms),
      loadVehicleMileage: Number(restValues.loadVehicleMileage),
      emptyVehicleMileage: Number(restValues.emptyVehicleMileage),
      loadingExtraFuelVolume: Number(restValues.loadingExtraFuelVolume),
      unloadingExtraFuelVolume: Number(restValues.unloadingExtraFuelVolume),
      totalRequiredFuelVolume: Number(restValues.totalRequiredFuelVolume),
      fuelRate: Number(restValues.fuelRate),
      cash: Number(restValues.cash),
      totalAdvancePayableAmount: Number(restValues.totalAdvancePayableAmount),
    };

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(
          `${API_URL}/add-advance-to-driver`,
          formattedData
        );
        responseHandler(response, "added");
      } else {
        response = await axios.put(
          `${API_URL}/update-advance-to-driver/${_id}`,
          formattedData
        );
        responseHandler(response, "updated");
      }
    } catch (error) {
      console.error("❌ Error saving AdvanceToDriver:", error);
      alert(
        `Failed to save data: ${error.response?.data?.error || "Server error"}`
      );
    }
  };

  // Show success/failure
  const responseHandler = (response, action) => {
    if (response.status === 200 || response.status === 201) {
      alert(`Advance to Driver ${action} successfully!`);
      setOpenModal(false);
      fetchAdvanceData();
    } else {
      alert(`Failed to ${action} data: ${response.statusText}`);
    }
  };

  // ---------------
  // Render
  // ---------------
  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Advance To Driver
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Starting Location</TableCell>
              <TableCell>Destination Location</TableCell>
              <TableCell>Return Location</TableCell>
              <TableCell>Vehicle Type</TableCell>
              <TableCell>Load Vehicle kms</TableCell>
              <TableCell>Empty Vehicle kms</TableCell>
              <TableCell>Load Vehicle Mileage</TableCell>
              <TableCell>Empty Vehicle Mileage</TableCell>
              <TableCell>Loading Extra Fuel</TableCell>
              <TableCell>Unloading Extra Fuel</TableCell>
              <TableCell>Total Required Fuel</TableCell>
              <TableCell>Fuel Rate</TableCell>
              <TableCell>Cash</TableCell>
              <TableCell>Total Advance Payable</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {advanceData.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.startingLocation}</TableCell>
                <TableCell>{item.destinationLocation}</TableCell>
                <TableCell>{item.returnLocation}</TableCell>
                <TableCell>{item.vehicleType}</TableCell>
                <TableCell>{item.loadVehicleKms}</TableCell>
                <TableCell>{item.emptyVehicleKms}</TableCell>
                <TableCell>{item.loadVehicleMileage}</TableCell>
                <TableCell>{item.emptyVehicleMileage}</TableCell>
                <TableCell>{item.loadingExtraFuelVolume}</TableCell>
                <TableCell>{item.unloadingExtraFuelVolume}</TableCell>
                <TableCell>{item.totalRequiredFuelVolume}</TableCell>
                <TableCell>{item.fuelRate}</TableCell>
                <TableCell>{item.cash}</TableCell>
                <TableCell>{item.totalAdvancePayableAmount}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(item)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(item)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add"
            ? "Add Advance To Driver"
            : "Edit Advance To Driver"}
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={formData}
            validationSchema={validationSchema}
            onSubmit={handleSave}
            enableReinitialize
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
                    name="startingLocation"
                    label="Starting Location"
                    value={values.startingLocation}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.startingLocation &&
                      Boolean(errors.startingLocation)
                    }
                    helperText={
                      touched.startingLocation && errors.startingLocation
                    }
                  />

                  <TextField
                    name="destinationLocation"
                    label="Destination Location"
                    value={values.destinationLocation}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.destinationLocation &&
                      Boolean(errors.destinationLocation)
                    }
                    helperText={
                      touched.destinationLocation && errors.destinationLocation
                    }
                  />

                  <TextField
                    name="returnLocation"
                    label="Return Location"
                    value={values.returnLocation}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.returnLocation && Boolean(errors.returnLocation)
                    }
                    helperText={touched.returnLocation && errors.returnLocation}
                  />

                  {/* vehicleType dropdown */}
                  <FormControl fullWidth required>
                    <InputLabel>Vehicle Type</InputLabel>
                    <Select
                      name="vehicleType"
                      label="Vehicle Type"
                      value={values.vehicleType}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.vehicleType && Boolean(errors.vehicleType)}
                    >
                      {vehicleTypes.map((vt) => (
                        <MenuItem key={vt._id} value={vt.vehicleType}>
                          {vt.vehicleType}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    name="loadVehicleKms"
                    label="Load Vehicle kms"
                    type="number"
                    value={values.loadVehicleKms}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.loadVehicleKms && Boolean(errors.loadVehicleKms)
                    }
                    helperText={touched.loadVehicleKms && errors.loadVehicleKms}
                  />

                  <TextField
                    name="emptyVehicleKms"
                    label="Empty Vehicle kms"
                    type="number"
                    value={values.emptyVehicleKms}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.emptyVehicleKms && Boolean(errors.emptyVehicleKms)
                    }
                    helperText={
                      touched.emptyVehicleKms && errors.emptyVehicleKms
                    }
                  />

                  <TextField
                    name="loadVehicleMileage"
                    label="Load Vehicle Mileage"
                    type="number"
                    value={values.loadVehicleMileage}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.loadVehicleMileage &&
                      Boolean(errors.loadVehicleMileage)
                    }
                    helperText={
                      touched.loadVehicleMileage && errors.loadVehicleMileage
                    }
                  />

                  <TextField
                    name="emptyVehicleMileage"
                    label="Empty Vehicle Mileage"
                    type="number"
                    value={values.emptyVehicleMileage}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.emptyVehicleMileage &&
                      Boolean(errors.emptyVehicleMileage)
                    }
                    helperText={
                      touched.emptyVehicleMileage && errors.emptyVehicleMileage
                    }
                  />

                  <TextField
                    name="loadingExtraFuelVolume"
                    label="Loading Extra Fuel"
                    type="number"
                    value={values.loadingExtraFuelVolume}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.loadingExtraFuelVolume &&
                      Boolean(errors.loadingExtraFuelVolume)
                    }
                    helperText={
                      touched.loadingExtraFuelVolume &&
                      errors.loadingExtraFuelVolume
                    }
                  />

                  <TextField
                    name="unloadingExtraFuelVolume"
                    label="Unloading Extra Fuel"
                    type="number"
                    value={values.unloadingExtraFuelVolume}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.unloadingExtraFuelVolume &&
                      Boolean(errors.unloadingExtraFuelVolume)
                    }
                    helperText={
                      touched.unloadingExtraFuelVolume &&
                      errors.unloadingExtraFuelVolume
                    }
                  />

                  <TextField
                    name="totalRequiredFuelVolume"
                    label="Total Required Fuel Volume"
                    type="number"
                    value={values.totalRequiredFuelVolume}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.totalRequiredFuelVolume &&
                      Boolean(errors.totalRequiredFuelVolume)
                    }
                    helperText={
                      touched.totalRequiredFuelVolume &&
                      errors.totalRequiredFuelVolume
                    }
                  />

                  <TextField
                    name="fuelRate"
                    label="Fuel Rate"
                    type="number"
                    value={values.fuelRate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.fuelRate && Boolean(errors.fuelRate)}
                    helperText={touched.fuelRate && errors.fuelRate}
                  />

                  <TextField
                    name="cash"
                    label="Cash"
                    type="number"
                    value={values.cash}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.cash && Boolean(errors.cash)}
                    helperText={touched.cash && errors.cash}
                  />

                  <TextField
                    name="totalAdvancePayableAmount"
                    label="Total Advance Payable"
                    type="number"
                    value={values.totalAdvancePayableAmount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.totalAdvancePayableAmount &&
                      Boolean(errors.totalAdvancePayableAmount)
                    }
                    helperText={
                      touched.totalAdvancePayableAmount &&
                      errors.totalAdvancePayableAmount
                    }
                  />

                  <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                    <Button variant="contained" type="submit">
                      {modalMode === "add" ? "Add" : "Save"}
                    </Button>
                  </DialogActions>
                </Box>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdvanceToDriver;

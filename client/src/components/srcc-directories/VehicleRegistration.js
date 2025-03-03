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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";

// For the date picker
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

// Validation schema with Yup
const validationSchema = Yup.object({
  registrationName: Yup.string().required("Registration Name is required"),
  type: Yup.string().required("Type is required"),
  shortName: Yup.string().required("Short Name is required"),
  depotName: Yup.string().required("Depot Name is required"),
  initialOdometer: Yup.number()
    .required("Initial Odometer is required")
    .min(0, "Odometer must be a positive number"),
  loadCapacity: Yup.string().required("Load Capacity is required"),
  driver: Yup.string().required("Driver name is required"),
  purchase: Yup.date()
    .typeError("Please select a valid date")
    .required("Purchase date is required"),
  vehicleManufacturingDetails: Yup.string().required(
    "Manufacturing Details are required"
  ),
});

const VehicleRegistration = () => {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [depots, setDepots] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [modalMode, setModalMode] = useState("add");
  const [openModal, setOpenModal] = useState(false);

  const [formData, setFormData] = useState({
    registrationName: "",
    type: "",
    shortName: "",
    depotName: "",
    initialOdometer: "",
    loadCapacity: "",
    driver: "",
    purchase: "",
    vehicleManufacturingDetails: "",
  });

  // Adjust these URLs to match your actual endpoints.
  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // --------------------------
  // Fetchers for each dropdown
  // --------------------------

  // 1. Vehicle Registrations
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-vehicle-registration`);
      setVehicles(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching vehicles:", error);
    }
  };

  // 2. Vehicle Types
  const fetchVehicleTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-vehicle-type`);
      const list = response.data.data || [];
      setVehicleTypes(list);
    } catch (error) {
      console.error("❌ Error fetching vehicle types:", error);
    }
  };

  // 3. Depot Names (Ports)
  const fetchDepots = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-port-types`);
      const list = response.data.data || [];
      setDepots(list);
    } catch (error) {
      console.error("❌ Error fetching port/depot data:", error);
    }
  };

  // 4. Drivers
  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/all-drivers`);
      const list = response.data.data || response.data || [];
      // Adjust if your API returns data in a different shape
      setDrivers(list);
    } catch (error) {
      console.error("❌ Error fetching drivers:", error);
    }
  };

  // -----------------
  // useEffect
  // -----------------
  useEffect(() => {
    fetchVehicles();
    fetchVehicleTypes();
    fetchDepots();
    fetchDrivers();
  }, []);

  // -----------------
  // CRUD Handlers
  // -----------------

  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      registrationName: "",
      type: "",
      shortName: "",
      depotName: "",
      initialOdometer: "",
      loadCapacity: "",
      driver: "",
      purchase: "",
      vehicleManufacturingDetails: "",
    });
    setOpenModal(true);
  };

  const handleEdit = (vehicle) => {
    setModalMode("edit");
    setFormData({
      _id: vehicle._id, // Used only for updates
      registrationName: vehicle.registrationName || "",
      type: vehicle.type || "",
      shortName: vehicle.shortName || "",
      depotName: vehicle.depotName || "",
      initialOdometer: vehicle.initialOdometer || "",
      loadCapacity: vehicle.loadCapacity || "",
      driver: vehicle.driver || "",
      // Convert to a string or DayJS date so DatePicker can handle it
      purchase: vehicle.purchase
        ? new Date(vehicle.purchase).toISOString()
        : "",
      vehicleManufacturingDetails: vehicle.vehicleManufacturingDetails || "",
    });
    setOpenModal(true);
  };

  const handleDelete = async (vehicle) => {
    if (
      window.confirm(
        `Are you sure you want to delete registration: ${vehicle.registrationName}?`
      )
    ) {
      try {
        await axios.delete(
          `${API_URL}/delete-vehicle-registration/${vehicle._id}`
        );
        fetchVehicles();
      } catch (error) {
        console.error("❌ Error deleting vehicle:", error);
      }
    }
  };

  const handleSave = async (values) => {
    const { _id, ...restValues } = values;

    // Format data before sending
    const formattedData = {
      ...restValues,
      registrationName: restValues.registrationName.trim(),
      type: restValues.type.trim(),
      shortName: restValues.shortName.trim(),
      depotName: restValues.depotName.trim(),
      loadCapacity: restValues.loadCapacity.trim(),
      driver: restValues.driver.trim(),
      vehicleManufacturingDetails:
        restValues.vehicleManufacturingDetails.trim(),
      purchase: new Date(restValues.purchase).toISOString(),
    };

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(
          `${API_URL}/add-vehicle-registration`,
          formattedData
        );
        responseHandler(response, "added");
      } else {
        response = await axios.put(
          `${API_URL}/update-vehicle-registration/${_id}`,
          formattedData
        );
        responseHandler(response, "updated");
      }
    } catch (error) {
      console.error("❌ Error saving vehicle:", error);
      alert(
        `Failed to save vehicle: ${
          error.response?.data?.error || "Server error"
        }`
      );
    }
  };

  const responseHandler = (response, action) => {
    if (response.status === 200 || response.status === 201) {
      alert(`Vehicle ${action} successfully!`);
      setOpenModal(false);
      fetchVehicles();
    } else {
      alert(`Failed to ${action} vehicle: ${response.statusText}`);
    }
  };

  // -----------------
  // Render
  // -----------------
  return (
    <Box>
      {/* Add Button */}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Vehicle Registration
        </Button>
      </Box>

      {/* Vehicles Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Registration Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Short Name</TableCell>
              <TableCell>Depot Name</TableCell>
              <TableCell>Initial Odometer</TableCell>
              <TableCell>Load Capacity</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Purchase Date</TableCell>
              <TableCell>Manufacturing Details</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle._id}>
                <TableCell>{vehicle.registrationName}</TableCell>
                <TableCell>{vehicle.type}</TableCell>
                <TableCell>{vehicle.shortName}</TableCell>
                <TableCell>{vehicle.depotName}</TableCell>
                <TableCell>{vehicle.initialOdometer}</TableCell>
                <TableCell>{vehicle.loadCapacity}</TableCell>
                <TableCell>{vehicle.driver}</TableCell>
                <TableCell>
                  {vehicle.purchase
                    ? new Date(vehicle.purchase).toDateString()
                    : ""}
                </TableCell>
                <TableCell>{vehicle.vehicleManufacturingDetails}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(vehicle)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(vehicle)}
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

      {/* Modal for Add/Edit Vehicle */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add New Vehicle" : "Edit Vehicle"}
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={formData}
            validationSchema={validationSchema}
            onSubmit={handleSave}
            enableReinitialize
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
                  {/* Registration Name */}
                  <TextField
                    name="registrationName"
                    label="Registration Name"
                    value={values.registrationName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.registrationName &&
                      Boolean(errors.registrationName)
                    }
                    helperText={
                      touched.registrationName && errors.registrationName
                    }
                  />

                  {/* Type Dropdown */}
                  <FormControl fullWidth required>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      label="Type"
                      value={values.type}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.type && Boolean(errors.type)}
                    >
                      {vehicleTypes.map((v) => (
                        <MenuItem key={v._id} value={v.vehicleType}>
                          {v.vehicleType}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Short Name */}
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

                  {/* Depot Name Dropdown */}
                  <FormControl fullWidth required>
                    <InputLabel>Depot Name</InputLabel>
                    <Select
                      name="depotName"
                      label="Depot Name"
                      value={values.depotName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.depotName && Boolean(errors.depotName)}
                    >
                      {depots.map((d) => (
                        <MenuItem key={d._id} value={d.name}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Initial Odometer */}
                  <TextField
                    name="initialOdometer"
                    label="Initial Odometer"
                    type="number"
                    value={values.initialOdometer}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.initialOdometer && Boolean(errors.initialOdometer)
                    }
                    helperText={
                      touched.initialOdometer && errors.initialOdometer
                    }
                  />

                  {/* Load Capacity */}
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

                  {/* Driver Dropdown */}
                  <FormControl fullWidth required>
                    <InputLabel>Driver</InputLabel>
                    <Select
                      name="driver"
                      label="Driver"
                      value={values.driver}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.driver && Boolean(errors.driver)}
                    >
                      {drivers.map((dr) => (
                        <MenuItem key={dr._id} value={dr.name}>
                          {dr.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Purchase Date (Date Picker) */}
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Purchase Date"
                      value={values.purchase ? dayjs(values.purchase) : null}
                      onChange={(val) =>
                        setFieldValue("purchase", val ? val.toISOString() : "")
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          name="purchase"
                          onBlur={handleBlur}
                          error={touched.purchase && Boolean(errors.purchase)}
                          helperText={touched.purchase && errors.purchase}
                          fullWidth
                          required
                        />
                      )}
                    />
                  </LocalizationProvider>

                  {/* Vehicle Manufacturing Details */}
                  <TextField
                    name="vehicleManufacturingDetails"
                    label="Manufacturing Details"
                    value={values.vehicleManufacturingDetails}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.vehicleManufacturingDetails &&
                      Boolean(errors.vehicleManufacturingDetails)
                    }
                    helperText={
                      touched.vehicleManufacturingDetails &&
                      errors.vehicleManufacturingDetails
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

export default VehicleRegistration;

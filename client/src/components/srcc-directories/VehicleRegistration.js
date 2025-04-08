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
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";

// Date Picker
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

// Validation schema with Yup
const validationSchema = Yup.object({
  vehicleNumber: Yup.string()
    .required("Vehicle Number is required")
    .matches(
      /^[A-Za-z]{2}[0-9]{2}[A-Za-z]{1,2}[0-9]{4}$/,
      "Vehicle number must be in format MH12V1234 or MH12VV1234"
    ),

  registrationName: Yup.string().required("Registration Name is required"),
  type: Yup.string().required("Type is required"),
  shortName: Yup.string().required("Short Name is required"),
  depotName: Yup.string().required("Depot Name is required"),
  initialOdometer: Yup.object({
    value: Yup.number()
      .required("Initial Odometer is required")
      .min(0, "Odometer must be a positive number"),
    unit: Yup.string().required("Odometer unit is required"),
  }),
  loadCapacity: Yup.object({
    value: Yup.number()
      .required("Load Capacity is required")
      .min(0, "Load Capacity must be a positive number"),
    unit: Yup.string().required("Load Capacity unit is required"),
  }),
  driver: Yup.object({
    _id: Yup.string().required("Driver ID is required"),
    name: Yup.string().required("Driver name is required"),
  }).required("Driver is required"),
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
  const [lengthUnits, setLengthUnits] = useState([]);
  const [weightUnits, setWeightUnits] = useState([]);
  const [unitMeasurements, setUnitMeasurements] = useState([]);

  // Toggles for "More..." logic
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [showAllWeightUnits, setShowAllWeightUnits] = useState(false);

  const [modalMode, setModalMode] = useState("add");
  const [openModal, setOpenModal] = useState(false);

  // Default form data (Formik will override these with initialValues if set differently)
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    registrationName: "",
    type: "",
    shortName: "",
    depotName: "",
    initialOdometer: { value: "", unit: "" },
    loadCapacity: { value: "", unit: "" },
    driver: { _id: "", name: "" },
    purchase: "",
    vehicleManufacturingDetails: "",
  });

  // Adjust this URL to match your actual endpoints
  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // 1. Fetch existing vehicles
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-vehicle-registration`);
      setVehicles(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching vehicles:", error);
    }
  };

  // 2. Fetch vehicle types for Type dropdown
  const fetchVehicleTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/vehicle-types`);
      setVehicleTypes(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching vehicle types:", error);
    }
  };

  // 3. Fetch Depots
  const fetchDepots = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-port-types`);
      setDepots(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching depots:", error);
    }
  };

  // 4. Fetch drivers by selected vehicle type
  const fetchDriversByType = async (selectedTypeId) => {
    try {
      const selectedType = vehicleTypes.find((v) => v._id === selectedTypeId);
      if (!selectedType) {
        console.error("❌ Selected type not found in vehicleTypes");
        return;
      }

      const response = await axios.get(
        `${API_URL}/available-drivers/${selectedType.vehicleType}` // Pass the vehicleType string
      );

      // Filter out drivers already assigned to existing vehicles
      const assignedDriverIds = vehicles.map((vehicle) => vehicle.driver?._id);
      const availableDrivers = response.data.filter(
        (driver) => !assignedDriverIds.includes(driver._id)
      );

      setDrivers(availableDrivers);
    } catch (error) {
      console.error("❌ Error fetching available drivers:", error);
      setDrivers([]);
    }
  };

  // 5. Fetch UnitMeasurements
  const fetchUnitMeasurements = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-unit-measurements`);
      setUnitMeasurements(response.data);

      const lengthCategory = response.data.find(
        (item) => item.name === "Lengths"
      );
      if (lengthCategory) {
        setLengthUnits(lengthCategory.measurements);
      }

      const weightCategory = response.data.find(
        (item) => item.name === "Weight"
      );
      if (weightCategory) {
        setWeightUnits(weightCategory.measurements);
      }
    } catch (error) {
      console.error("❌ Error fetching unit measurements:", error);
    }
  };

  // useEffect: initial fetch calls
  useEffect(() => {
    fetchVehicles();
    fetchVehicleTypes();
    fetchDepots();
    fetchUnitMeasurements();
  }, []);

  // CRUD Handlers
  const handleAdd = () => {
    setModalMode("add");

    // Provide meaningful defaults
    setFormData({
      vehicleNumber: "",
      registrationName: "",
      type: "",
      shortName: "",
      depotName: "",
      initialOdometer: { value: "", unit: "km" },
      loadCapacity: { value: "", unit: "kg" },
      driver: { _id: "", name: "" },
      purchase: "",
      vehicleManufacturingDetails: "",
    });

    // Clear old driver list
    setDrivers([]);
    // Make sure toggles are reset
    setShowAllUnits(false);
    setShowAllWeightUnits(false);

    setOpenModal(true);
  };

  const handleEdit = async (vehicle) => {
    setModalMode("edit");

    setFormData({
      _id: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber || "",
      registrationName: vehicle.registrationName || "",
      type: vehicle.type?._id || "", // Ensure type is set to the ObjectId
      shortName: vehicle.shortName || "",
      depotName: vehicle.depotName || "",
      initialOdometer: vehicle.initialOdometer || { value: "", unit: "km" },
      loadCapacity: vehicle.loadCapacity || { value: "", unit: "kg" },
      driver: vehicle.driver || { _id: "", name: "" }, // Ensure driver is set correctly
      purchase: vehicle.purchase
        ? new Date(vehicle.purchase).toISOString()
        : "",
      vehicleManufacturingDetails: vehicle.vehicleManufacturingDetails || "",
    });

    if (vehicle.type?._id) {
      await fetchDriversByType(vehicle.type._id); // Fetch drivers for the selected type
    }

    // Reset toggles
    setShowAllUnits(false);
    setShowAllWeightUnits(false);

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
    console.log("🚀 Final values before saving:", values);

    const { _id, ...restValues } = values;

    // Format data before sending
    const formattedData = {
      ...restValues,
      vehicleNumber: restValues.vehicleNumber.trim(),
      registrationName: restValues.registrationName.trim(),
      type: restValues.type.trim(),
      shortName: restValues.shortName.trim(),
      depotName: restValues.depotName.trim(),
      // initialOdometer and loadCapacity are already objects
      initialOdometer: {
        value: restValues.initialOdometer.value,
        unit: restValues.initialOdometer.unit,
      },
      loadCapacity: {
        value: restValues.loadCapacity.value,
        unit: restValues.loadCapacity.unit,
      },
      driver: restValues.driver,
      vehicleManufacturingDetails:
        restValues.vehicleManufacturingDetails.trim(),
      purchase: restValues.purchase
        ? new Date(restValues.purchase).toISOString()
        : "",
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
      if (error.response?.status === 400 && error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        console.error("❌ Error saving vehicle:", error);
        alert(
          `Failed to save vehicle: ${
            error.response?.data?.error || "Server error"
          }`
        );
      }
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

  // RENDER
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
              <TableCell>Vehicle Number</TableCell>
              <TableCell>Registration Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Short Name</TableCell>
              <TableCell>Depot Name</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Purchase Date</TableCell>
              <TableCell>Manufacturing Details</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle._id}>
                <TableCell>{vehicle.vehicleNumber}</TableCell>
                <TableCell>{vehicle.registrationName}</TableCell>
                <TableCell>{vehicle.type?.vehicleType}</TableCell>
                <TableCell>{vehicle.type?.shortName}</TableCell>
                <TableCell>{vehicle.depotName}</TableCell>
                <TableCell>{vehicle.driver?.name}</TableCell>
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
                  {/* Vehicle Number */}
                  <TextField
                    name="vehicleNumber"
                    label="Vehicle Number (e.g., MH12AB1234)"
                    value={values.vehicleNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.vehicleNumber && Boolean(errors.vehicleNumber)
                    }
                    helperText={touched.vehicleNumber && errors.vehicleNumber}
                  />

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

                  {/* Type Dropdown (triggers driver fetch and auto-populates load capacity) */}
                  <FormControl fullWidth required>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      label="Type"
                      value={values.type} // This will now be the ObjectId
                      onChange={async (event) => {
                        const selectedTypeId = event.target.value;
                        setFieldValue("type", selectedTypeId);

                        // Fetch available drivers for the selected type
                        await fetchDriversByType(selectedTypeId);
                      }}
                      onBlur={handleBlur}
                      error={touched.type && Boolean(errors.type)}
                    >
                      {vehicleTypes.map((v) => (
                        <MenuItem key={v._id} value={v._id}>
                          {v.vehicleType} ({v.shortName})
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

                  {/* Odometer row */}
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        name="initialOdometer.value"
                        label="Initial Odometer"
                        type="number"
                        value={values.initialOdometer.value}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                        error={
                          touched.initialOdometer?.value &&
                          Boolean(errors.initialOdometer?.value)
                        }
                        helperText={
                          touched.initialOdometer?.value &&
                          errors.initialOdometer?.value
                        }
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Unit</InputLabel>
                        <Select
                          name="initialOdometer.unit"
                          label="Unit"
                          value={values.initialOdometer.unit || ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={
                            touched.initialOdometer?.unit &&
                            Boolean(errors.initialOdometer?.unit)
                          }
                        >
                          {lengthUnits.map((u) => (
                            <MenuItem key={u._id} value={u.symbol}>
                              {u.unit} ({u.symbol})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  {/* Load Capacity row */}
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        name="loadCapacity.value"
                        label="Load Capacity"
                        type="number"
                        value={values.loadCapacity.value}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                        error={
                          touched.loadCapacity?.value &&
                          Boolean(errors.loadCapacity?.value)
                        }
                        helperText={
                          touched.loadCapacity?.value &&
                          errors.loadCapacity?.value
                        }
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Unit</InputLabel>
                        <Select
                          name="loadCapacity.unit"
                          label="Unit"
                          value={values.loadCapacity.unit || ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={
                            touched.loadCapacity?.unit &&
                            Boolean(errors.loadCapacity?.unit)
                          }
                        >
                          {weightUnits.map((u) => (
                            <MenuItem key={u._id} value={u.symbol}>
                              {u.unit} ({u.symbol})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  {/* Driver Dropdown (only show if 'type' is selected) */}
                  {values.type && (
                    <FormControl fullWidth required>
                      <InputLabel>Driver</InputLabel>
                      <Select
                        name="driver._id"
                        label="Driver"
                        value={values.driver?._id || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedDriver = drivers.find(
                            (d) => d._id === selectedId
                          );
                          setFieldValue(
                            "driver",
                            selectedDriver || { _id: "", name: "" }
                          );
                        }}
                        onBlur={handleBlur}
                        error={touched.driver && Boolean(errors.driver?._id)}
                      >
                        {drivers.map((dr) => (
                          <MenuItem key={dr._id} value={dr._id}>
                            {dr.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {/* Purchase Date (Date Picker) */}
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Purchase Date"
                      value={values.purchase ? dayjs(values.purchase) : null}
                      onChange={(val) =>
                        setFieldValue("purchase", val ? val.toISOString() : "")
                      }
                      maxDate={dayjs()} // only allows today or earlier
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

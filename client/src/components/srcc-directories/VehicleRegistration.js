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
  purchase: Yup.date().required("Purchase date is required"),
  vehicleManufacturingDetails: Yup.string().required(
    "Manufacturing Details are required"
  ),
});

// Only these fields will be rendered in the form
const fieldsToEdit = [
  { name: "registrationName", label: "Registration Name" },
  { name: "type", label: "Type" },
  { name: "shortName", label: "Short Name" },
  { name: "depotName", label: "Depot Name" },
  { name: "initialOdometer", label: "Initial Odometer" },
  { name: "loadCapacity", label: "Load Capacity" },
  { name: "driver", label: "Driver" },
  { name: "purchase", label: "Purchase Date" },
  {
    name: "vehicleManufacturingDetails",
    label: "Manufacturing Details",
  },
];

const VehicleRegistration = () => {
  const [vehicles, setVehicles] = useState([]);
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

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // Fetch all vehicles
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-vehicle-registration`);
      setVehicles(response.data.data || []);
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
    // Store the _id separately (not shown in the form)
    // so we can pass it along during updates.
    setModalMode("edit");
    setFormData({
      _id: vehicle._id, // We'll use it for updating but won't render it in the form
      registrationName: vehicle.registrationName || "",
      type: vehicle.type || "",
      shortName: vehicle.shortName || "",
      depotName: vehicle.depotName || "",
      initialOdometer: vehicle.initialOdometer || "",
      loadCapacity: vehicle.loadCapacity || "",
      driver: vehicle.driver || "",
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
    // We keep _id separate, so let's grab it (if present).
    const { _id, ...restValues } = values;

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
        // For "edit" mode, we do a PUT and include _id in the endpoint
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
            enableReinitialize // Important to update form data correctly on edit
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
                  {/* Render only fields we want to edit */}
                  {fieldsToEdit.map((field) => (
                    <TextField
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      value={values[field.name] || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      fullWidth
                      required
                      error={touched[field.name] && Boolean(errors[field.name])}
                      helperText={touched[field.name] && errors[field.name]}
                      // If you want to prevent editing "registrationName" or any field in edit mode:
                      // disabled={modalMode === "edit" && field.name === "registrationName"}
                    />
                  ))}

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

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
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";

// ✅ Validation Schema (Matches Backend Rules)
const validationSchema = Yup.object({
  name: Yup.string().required("Driver Name is required (eg. Atul Nagose)"),
  alias: Yup.string().required("Alias is required (eg.  MH1234567890123)"),
  licenseNumber: Yup.string()
    .matches(
      /^[A-Za-z]{2}\d{13}$/,
      "License Number must start with 2 letters followed by 13 digits"
    )
    .required("License Number is required"),
  licenseIssueAuthority: Yup.string().required(
    "License Issue Authority is required"
  ),
  licenseExpiryDate: Yup.date()
    .required("License Expiry Date is required")
    .test(
      "valid-date",
      "Invalid License Expiry Date",
      (value) => !isNaN(new Date(value))
    ),
  phoneNumber: Yup.string()
    .matches(/^\d{10}$/, "Phone Number must be exactly 10 digits")
    .required("Phone Number is required"),
  alternateNumber: Yup.string()
    .matches(/^\d{10}$/, "Alternate Phone Number must be exactly 10 digits")
    .required("Alternate Phone Number is required"),
  residentialAddress: Yup.string().required("Residential Address is required"),
  drivingVehicleTypes: Yup.string().required(
    "Driving Vehicle Types are required"
  ),
  remarks: Yup.string().required("Remarks are required"),
});

const DriversListDirectory = () => {
  const [drivers, setDrivers] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [serverErrors, setServerErrors] = useState(""); // Stores backend validation errors
  const [formData, setFormData] = useState({
    name: "",
    alias: "",
    licenseNumber: "",
    licenseIssueAuthority: "",
    licenseExpiryDate: "",
    phoneNumber: "",
    alternateNumber: "",
    residentialAddress: "",
    drivingVehicleTypes: "",
    remarks: "",
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // ✅ Fetch drivers data from API
  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/all-drivers`);
      setDrivers(response.data || []);
    } catch (error) {
      console.error("❌ Error fetching drivers:", error);
    }
  };

  useEffect(() => {
    fetchDrivers(); // ✅ Fetch data when component mounts
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      name: "",
      alias: "",
      licenseNumber: "",
      licenseIssueAuthority: "",
      licenseExpiryDate: "",
      phoneNumber: "",
      alternateNumber: "",
      residentialAddress: "",
      drivingVehicleTypes: "",
      remarks: "",
    });
    setServerErrors(""); // Clear previous errors
    setOpenModal(true);
  };

  const handleEdit = (driver) => {
    setModalMode("edit");
    setFormData({
      name: driver.name,
      alias: driver.alias,
      licenseNumber: driver.licenseNumber,
      licenseIssueAuthority: driver.licenseIssueAuthority,
      licenseExpiryDate: driver.licenseExpiryDate,
      phoneNumber: driver.phoneNumber,
      alternateNumber: driver.alternateNumber,
      residentialAddress: driver.residentialAddress,
      drivingVehicleTypes: driver.drivingVehicleTypes,
      remarks: driver.remarks,
    });
    setServerErrors(""); // Clear previous errors
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(`❗ Are you sure you want to delete this driver?`)) {
      try {
        const response = await axios.delete(`${API_URL}/delete-driver/${id}`);
        if (response.status === 200) {
          alert("✅ Driver deleted successfully!");
          fetchDrivers(); // ✅ Refresh data automatically
        }
      } catch (error) {
        console.error("❌ Error deleting driver:", error);
        alert(
          `⚠️ Failed to delete driver: ${
            error.response?.data?.message || "Server error"
          }`
        );
      }
    }
  };

  const handleSave = async (values, { setSubmitting }) => {
    const { _id, ...driverData } = values;
    setServerErrors(""); // Reset server error messages

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/create-driver`, driverData);
        alert("✅ Driver added successfully!");
      } else {
        response = await axios.put(
          `${API_URL}/update-driver/${_id}`,
          driverData
        );
        alert("✅ Driver updated successfully!");
      }

      if (response.status === 200 || response.status === 201) {
        setOpenModal(false);
        fetchDrivers(); // ✅ Refresh data automatically
      }
    } catch (error) {
      console.error("❌ Error saving driver:", error);
      setServerErrors(error.response?.data?.message || "Server error occurred");
    }
    setSubmitting(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Driver
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Alias</TableCell>
              <TableCell>License Number</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Residential Address</TableCell>
              <TableCell>Driving Vehicle Types</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver._id}>
                <TableCell>{driver.name}</TableCell>
                <TableCell>{driver.alias}</TableCell>
                <TableCell>{driver.licenseNumber}</TableCell>
                <TableCell>{driver.phoneNumber}</TableCell>
                <TableCell>{driver.residentialAddress}</TableCell>
                <TableCell>{driver.drivingVehicleTypes}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(driver)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(driver._id)}
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

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add New Driver" : "Edit Driver"}
        </DialogTitle>
        <DialogContent>
          {serverErrors && (
            <Typography sx={{ color: "red", mb: 2 }}>{serverErrors}</Typography>
          )}
          <Formik
            initialValues={formData}
            validationSchema={validationSchema}
            onSubmit={handleSave}
          >
            {({ values, handleChange, handleBlur, errors, touched }) => (
              <Form>
                {Object.keys(formData).map((field) => (
                  <Box key={field} sx={{ mb: 2 }}>
                    <TextField
                      name={field}
                      label={field}
                      value={values[field]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      fullWidth
                      required
                    />
                    <ErrorMessage name={field}>
                      {(msg) => (
                        <Typography sx={{ color: "red", fontSize: "12px" }}>
                          {msg}
                        </Typography>
                      )}
                    </ErrorMessage>
                  </Box>
                ))}
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

export default DriversListDirectory;

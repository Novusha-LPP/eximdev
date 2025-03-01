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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import FileUpload from "../../components/gallery/FileUpload";
import ImagePreview from "../../components/gallery/ImagePreview";
import ConfirmDialog from "../../components/gallery/ConfirmDialog";
import useVehicleTypes from "../../customHooks/Transport/useVehicleTypes";

// -------------------------
// Validation Schema with proper date handling
// -------------------------
const validationSchema = Yup.object({
  name: Yup.string().required("Driver Name is required"),
  alias: Yup.string().required("Alias is required"),
  licenseNumber: Yup.string()
    .matches(
      /^[A-Za-z]{2}\d{13}$/,
      "License Number must start with 2 letters followed by 13 digits"
    )
    .required("License Number is required"),
  licenseIssueAuthority: Yup.string().required(
    "License Issue Authority is required"
  ),
  licenseExpiryDate: Yup.string() // Keeping as string to handle date input
    .required("License Expiry Date is required")
    .test(
      "valid-date",
      "Invalid License Expiry Date",
      (value) => !isNaN(new Date(value))
    ),
  phoneNumber: Yup.string()
    .matches(/^\d{10}$/, "Phone Number must be exactly 10 digits")
    .required("Phone Number is required"),
  residentialAddress: Yup.string().required("Residential Address is required"),
  // drivingVehicleTypes: Yup.string().required(
  //   "Driving Vehicle Types are required"
  // ),
  remarks: Yup.string(),
  photoUpload: Yup.array().min(1, "At least one photo is required"),
  licenseUpload: Yup.array().min(
    1,
    "At least one license document is required"
  ),
  notes: Yup.array().of(
    Yup.object({
      date: Yup.string(), // using string for date input (YYYY-MM-DD)
      note: Yup.string().required("Note is required"),
      attachment: Yup.array(), // optional
    })
  ),
});

// -------------------------
// Initial form data for new driver (without _id)
// -------------------------
const initialFormData = {
  _id: "",
  name: "",
  alias: "",
  licenseNumber: "",
  licenseIssueAuthority: "",
  licenseExpiryDate: "",
  phoneNumber: "",
  alternateNumber: "",
  residentialAddress: "",
  drivingVehicleTypes: [],
  remarks: "",
  photoUpload: [],
  licenseUpload: [],
  notes: [],
};

const DriversListDirectory = () => {
  const [drivers, setDrivers] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [serverErrors, setServerErrors] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    onConfirm: () => {},
  });
  const [formData, setFormData] = useState(initialFormData);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  const { vehicleTypes, loading, error } = useVehicleTypes(API_URL);

  // -------------------------
  // Fetch drivers from API
  // -------------------------
  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/all-drivers`);
      setDrivers(response.data || []);
    } catch (error) {
      console.error("❌ Error fetching drivers:", error);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // -------------------------
  // Handlers: Add, Edit, Delete
  // -------------------------
  const handleAdd = () => {
    setModalMode("add");
    setFormData(initialFormData);
    setServerErrors("");
    setOpenModal(true);
  };

  const handleEdit = (driver) => {
    setModalMode("edit");
    // Format licenseExpiryDate as YYYY-MM-DD if available
    const formattedDriver = {
      ...driver,
      licenseExpiryDate: driver.licenseExpiryDate
        ? new Date(driver.licenseExpiryDate).toISOString().split("T")[0]
        : "",
      notes: (driver.notes || []).map((note) => ({
        ...note,
        date: note.date
          ? new Date(note.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      })),
    };
    setFormData(formattedDriver);
    setServerErrors("");
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this driver? This action cannot be undone."
    );
    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/delete-driver/${id}`);
        alert("✅ Driver deleted successfully!");
        fetchDrivers();
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

  // -------------------------
  // Handle Save: Create or Update
  // -------------------------
  const handleSave = async (values, { setSubmitting }) => {
    setServerErrors("");
    try {
      // Destructure _id and create driverData without _id when adding a new driver.
      const { _id, ...driverData } = values;
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/create-driver`, driverData);
        alert("✅ Driver added successfully!");
      } else {
        response = await axios.put(`${API_URL}/update-driver/${_id}`, values);
        alert("✅ Driver updated successfully!");
      }

      if (response.status === 200 || response.status === 201) {
        setOpenModal(false);
        fetchDrivers();
      }
    } catch (error) {
      console.error("❌ Error saving driver:", error);
      setServerErrors(error.response?.data?.message || "Server error occurred");
    }
    setSubmitting(false);
  };

  // -------------------------
  // Component JSX
  // -------------------------
  return (
    <Box sx={{ p: 2 }}>
      <Button variant="contained" onClick={handleAdd}>
        Add Driver
      </Button>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Alias</TableCell>
              <TableCell>License Number</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Vehicle Types</TableCell>
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
                <TableCell>
                  {driver.drivingVehicleTypes?.join(", ") || "N/A"}
                </TableCell>
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

      {/* -------------------------
          Modal for Adding/Editing Driver
      ------------------------- */}
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
            <Typography color="error" sx={{ mb: 2 }}>
              {serverErrors}
            </Typography>
          )}
          <Formik
            initialValues={formData}
            validationSchema={validationSchema}
            onSubmit={handleSave}
            enableReinitialize={true}
          >
            {({ values, handleChange, handleBlur, setFieldValue }) => (
              <Form>
                <Grid container spacing={2}>
                  {/* Left Column: Text & Date Fields */}
                  <Grid item xs={6}>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="name"
                        label="Driver Name"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                      />
                      <ErrorMessage
                        name="name"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="alias"
                        label="Alias"
                        value={values.alias}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                      />
                      <ErrorMessage
                        name="alias"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="licenseNumber"
                        label="License Number"
                        value={values.licenseNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                      />
                      <ErrorMessage
                        name="licenseNumber"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="licenseIssueAuthority"
                        label="License Issue Authority"
                        value={values.licenseIssueAuthority}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                      />
                      <ErrorMessage
                        name="licenseIssueAuthority"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="licenseExpiryDate"
                        label="License Expiry Date"
                        type="date"
                        value={values.licenseExpiryDate}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                      <ErrorMessage
                        name="licenseExpiryDate"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="phoneNumber"
                        label="Phone Number"
                        value={values.phoneNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                      />
                      <ErrorMessage
                        name="phoneNumber"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="alternateNumber"
                        label="Alternate Number"
                        value={values.alternateNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                      />
                      <ErrorMessage
                        name="alternateNumber"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="residentialAddress"
                        label="Residential Address"
                        value={values.residentialAddress}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                      
                        rows={2}
                        required
                      />
                      <ErrorMessage
                        name="residentialAddress"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    {/* <Box sx={{ mb: 2 }}>
                      <TextField
                        name="drivingVehicleTypes"
                        label="Driving Vehicle Types"
                        value={values.drivingVehicleTypes}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        required
                      />
                      <ErrorMessage
                        name="drivingVehicleTypes"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box> */}
                    <FormControl fullWidth sx={{ mb: 2 }} required>
                      <InputLabel id="drivingVehicleTypes-label">
                        Driving Vehicle Types
                      </InputLabel>
                      <Select
                        multiple
                        labelId="drivingVehicleTypes-label"
                        id="drivingVehicleTypes"
                        name="drivingVehicleTypes"
                        value={values.drivingVehicleTypes}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Driving Vehicle Types"
                      >
                        {vehicleTypes.map((vehicle) => (
                          <MenuItem key={vehicle.value} value={vehicle.value}>
                            {vehicle.label}
                          </MenuItem>
                        ))}
                      </Select>
                      <ErrorMessage
                        name="drivingVehicleTypes"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </FormControl>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        name="remarks"
                        label="Remarks"
                        value={values.remarks}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        fullWidth
                        
                        rows={2}
                      />
                      <ErrorMessage
                        name="remarks"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>

                    {/* Notes Section */}
                    <FieldArray name="notes">
                      {({ push, remove }) => (
                        <Box>
                          <Button
                            variant="outlined"
                            onClick={() =>
                              push({
                                date: new Date().toISOString().split("T")[0],
                                note: "",
                                attachment: [],
                              })
                            }
                            sx={{ mb: 1 }}
                          >
                            Create Note
                          </Button>
                          {values.notes &&
                            values.notes.length > 0 &&
                            values.notes.map((note, index) => (
                              <Box
                                key={index}
                                sx={{ border: "1px solid #ccc", p: 2, mb: 2 }}
                              >
                                <TextField
                                  name={`notes[${index}].note`}
                                  label={`Note ${index + 1}`}
                                  value={note.note}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  fullWidth
                                  
                                  rows={2}
                                  required
                                  sx={{ mb: 1 }}
                                />
                                <ErrorMessage
                                  name={`notes[${index}].note`}
                                  component={Typography}
                                  color="error"
                                  variant="caption"
                                />
                                <Box sx={{ mt: 1 }}>
                                  <FileUpload
                                    label={`Note ${index + 1} Attachment`}
                                    bucketPath="noteAttachments"
                                    multiple={true}
                                    onFilesUploaded={(files) => {
                                      const updatedAttachments = note.attachment
                                        ? [...note.attachment, ...files]
                                        : [...files];
                                      setFieldValue(
                                        `notes[${index}].attachment`,
                                        updatedAttachments
                                      );
                                    }}
                                  />
                                  <ImagePreview
                                    images={note.attachment || []}
                                    onDeleteImage={(fileIndex) => {
                                      const updatedAttachments = [
                                        ...(note.attachment || []),
                                      ];
                                      updatedAttachments.splice(fileIndex, 1);
                                      setFieldValue(
                                        `notes[${index}].attachment`,
                                        updatedAttachments
                                      );
                                    }}
                                  />
                                </Box>
                                <Button
                                  variant="text"
                                  color="error"
                                  onClick={() => remove(index)}
                                  sx={{ mt: 1 }}
                                >
                                  Remove Note
                                </Button>
                              </Box>
                            ))}
                        </Box>
                      )}
                    </FieldArray>
                  </Grid>

                  {/* Right Column: File Uploads for Photo and License */}
                  <Grid item xs={6}>
                    <Box sx={{ mb: 2 }}>
                      <FileUpload
                        label="Photo Upload"
                        bucketPath="photoUpload"
                        multiple={true}
                        onFilesUploaded={(files) =>
                          setFieldValue("photoUpload", files)
                        }
                      />
                      <ImagePreview
                        images={values.photoUpload}
                        onDeleteImage={(index) => {
                          const updatedFiles = [...values.photoUpload];
                          updatedFiles.splice(index, 1);
                          setFieldValue("photoUpload", updatedFiles);
                        }}
                      />
                      <ErrorMessage
                        name="photoUpload"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <FileUpload
                        label="License Upload"
                        bucketPath="licenseUpload"
                        multiple={true}
                        onFilesUploaded={(files) =>
                          setFieldValue("licenseUpload", files)
                        }
                      />
                      <ImagePreview
                        images={values.licenseUpload}
                        onDeleteImage={(index) => {
                          const updatedFiles = [...values.licenseUpload];
                          updatedFiles.splice(index, 1);
                          setFieldValue("licenseUpload", updatedFiles);
                        }}
                      />
                      <ErrorMessage
                        name="licenseUpload"
                        component={Typography}
                        color="error"
                        variant="caption"
                      />
                    </Box>
                  </Grid>
                </Grid>
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

      <ConfirmDialog
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
      />
    </Box>
  );
};

export default DriversListDirectory;

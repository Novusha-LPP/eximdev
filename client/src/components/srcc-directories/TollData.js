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
  Checkbox,
  Typography,
  ListItemText,
  Autocomplete,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import useVehicleTypes from "../../customHooks/Transport/useVehicleTypes";

// -----------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------
const validationSchema = Yup.object({
  tollBoothName: Yup.string().required("Toll Booth Name is required"),
  fastagClassId: Yup.string().required("Fastag Class ID is required"),
  singleAmount: Yup.number()
    .typeError("Single Amount must be a number")
    .min(0, "Cannot be negative"),
  returnAmount: Yup.number()
    .typeError("Return Amount must be a number")
    .min(0, "Cannot be negative"),
  secondPassTollBooth: Yup.string(),
  vehicleType: Yup.array()
    .of(
      Yup.object({
        name: Yup.string().required("Vehicle name is required"),
        shortName: Yup.string().required("Short name is required"),
        GVW: Yup.number() // Ensuring GVW (Load Capacity) is a number
          .typeError("GVW must be a number")
          .min(1, "GVW must be greater than zero"),
      })
    )
    .min(1, "At least one vehicle type is required"),
});

const TollData = () => {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const [tollItems, setTollItems] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");

  // This formData is used to populate Formik's initialValues
  const [formData, setFormData] = useState({
    tollBoothName: "",
    fastagClassId: "",
    singleAmount: "",
    returnAmount: "",
    secondPassTollBooth: "",
    vehicleType: [],
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";
  const { vehicleTypes } = useVehicleTypes(API_URL);

  // ---------------------------------------------------------
  // Fetch Toll Data
  // ---------------------------------------------------------
  const fetchTollData = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-toll-data`);
      setTollItems(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching toll data:", error);
    }
  };

  useEffect(() => {
    fetchTollData();
  }, []);

  // ---------------------------------------------------------
  // Derive possible second pass names from tollItems
  // ---------------------------------------------------------
  const tollBoothNames = tollItems.map((item) => item.tollBoothName);

  // ---------------------------------------------------------
  // Handlers: Add, Edit, Delete
  // ---------------------------------------------------------
  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      tollBoothName: "",
      fastagClassId: "",
      singleAmount: "",
      returnAmount: "",
      secondPassTollBooth: "",
      vehicleType: [],
    });
    setOpenModal(true);
  };

  const handleEdit = (item) => {
    setModalMode("edit");
    setFormData({
      _id: item._id || "",
      tollBoothName: item.tollBoothName || "",
      fastagClassId: item.fastagClassId || "",
      singleAmount: item.singleAmount?.toString() || "",
      returnAmount: item.returnAmount?.toString() || "",
      secondPassTollBooth: item.secondPassTollBooth || "",
      vehicleType: item.vehicleType || [],
    });
    setOpenModal(true);
  };

  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete toll booth: ${item.tollBoothName}?`
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/delete-toll-data/${item._id}`);
      // Re-fetch or remove locally
      fetchTollData();
    } catch (error) {
      console.error("❌ Error deleting toll data:", error);
    }
  };

  // ---------------------------------------------------------
  // Handle Save
  // ---------------------------------------------------------
  const handleSave = async (values) => {
    const { _id, ...restValues } = values;

    // Format data as required by backend
    const formattedData = {
      ...restValues,
      tollBoothName: restValues.tollBoothName.trim(),
      fastagClassId: restValues.fastagClassId.trim(),
      secondPassTollBooth: restValues.secondPassTollBooth?.trim() || "",
      singleAmount: Number(restValues.singleAmount),
      returnAmount: Number(restValues.returnAmount),
      vehicleType: restValues.vehicleType.map((v) => ({
        name: v.name,
        shortName: v.shortName,
        GVW: Number(v.loadCapacity || v.GVW), // handle both loadCapacity & GVW
      })),
    };

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/add-toll-data`, formattedData);
      } else {
        response = await axios.put(
          `${API_URL}/update-toll-data/${_id}`,
          formattedData
        );
      }
      responseHandler(response, modalMode === "add" ? "added" : "updated");
    } catch (error) {
      console.error("❌ Error saving toll data:", error);
      alert(
        `Failed to save toll data: ${
          error.response?.data?.error || "Server error"
        }`
      );
    }
  };

  // ---------------------------------------------------------
  // Response Handler
  // ---------------------------------------------------------
  const responseHandler = (response, action) => {
    if (response.status === 200 || response.status === 201) {
      alert(`Toll data ${action} successfully!`);
      setOpenModal(false);
      fetchTollData();
    } else {
      alert(`Failed to ${action} toll data: ${response.statusText}`);
    }
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Toll Data
        </Button>
      </Box>

      {/* Table Listing */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Toll Booth Name</TableCell>
              <TableCell>Vehicle Types-(GVW)</TableCell>
              <TableCell>Fastag Class ID</TableCell>
              <TableCell>Single Amount</TableCell>
              <TableCell>Return Amount</TableCell>
              <TableCell>Second Pass Toll Booth</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tollItems.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.tollBoothName}</TableCell>
                {/* Display vehicleType as comma-separated */}
                <TableCell>
                  {Array.isArray(item.vehicleType)
                    ? item.vehicleType
                        .map((v) => `${v.name} (${v.shortName}, GVW: ${v.GVW})`)
                        .join(", ")
                    : ""}
                </TableCell>
                <TableCell>{item.fastagClassId}</TableCell>
                <TableCell>{item.singleAmount}</TableCell>
                <TableCell>{item.returnAmount}</TableCell>
                <TableCell>{item.secondPassTollBooth || ""}</TableCell>
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

      {/* Modal for Add/Edit */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add New Toll Data" : "Edit Toll Data"}
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
                  {/* Toll Booth Name */}
                  <TextField
                    name="tollBoothName"
                    label="Toll Booth Name"
                    value={values.tollBoothName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.tollBoothName && Boolean(errors.tollBoothName)
                    }
                    helperText={touched.tollBoothName && errors.tollBoothName}
                  />

                  {/* Vehicle Types (Multi-Select) */}
                  <FormControl fullWidth required>
                    <InputLabel>Vehicle Types</InputLabel>
                    <Select
                      multiple
                      name="vehicleType"
                      label="Vehicle Types"
                      value={values.vehicleType.map((v) => v.shortName)} // Use shortName for selection
                      onChange={(e) => {
                        const selectedShortNames = e.target.value;
                        const selectedVehicles = vehicleTypes.filter((v) =>
                          selectedShortNames.includes(v.shortName)
                        );
                        setFieldValue("vehicleType", selectedVehicles);
                      }}
                      renderValue={(selected) =>
                        selected
                          .map((shortName) => {
                            const vehicle = vehicleTypes.find(
                              (v) => v.shortName === shortName
                            );
                            return vehicle ? vehicle.name : "";
                          })
                          .join(", ")
                      }
                    >
                      {vehicleTypes.map((v) => (
                        <MenuItem key={v.shortName} value={v.shortName}>
                          <Checkbox
                            checked={values.vehicleType.some(
                              (vt) => vt.shortName === v.shortName
                            )}
                          />
                          <ListItemText
                            primary={`${v.name} (${v.shortName}, GVW: ${v.loadCapacity})`}
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Display selected vehicle details */}
                  {values.vehicleType?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {values.vehicleType.map((selectedType) => (
                        <Typography
                          key={selectedType.shortName}
                          variant="body2"
                        >
                          {selectedType.name} ({selectedType.shortName}) – GVW:{" "}
                          {selectedType.loadCapacity
                            ? `${selectedType.loadCapacity.value} ${selectedType.loadCapacity.unit}`
                            : "N/A"}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Fastag Class ID */}
                  <TextField
                    name="fastagClassId"
                    label="Fastag Class ID"
                    value={values.fastagClassId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={
                      touched.fastagClassId && Boolean(errors.fastagClassId)
                    }
                    helperText={touched.fastagClassId && errors.fastagClassId}
                  />

                  {/* Single Amount */}
                  <TextField
                    name="singleAmount"
                    label="Single Amount"
                    type="number"
                    value={values.singleAmount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    error={touched.singleAmount && Boolean(errors.singleAmount)}
                    helperText={touched.singleAmount && errors.singleAmount}
                  />

                  {/* Return Amount */}
                  <TextField
                    name="returnAmount"
                    label="Return Amount"
                    type="number"
                    value={values.returnAmount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    error={touched.returnAmount && Boolean(errors.returnAmount)}
                    helperText={touched.returnAmount && errors.returnAmount}
                  />

                  {/* Second Pass Toll Booth (Autocomplete) */}
                  <FormControl fullWidth>
                    <Autocomplete
                      options={tollBoothNames}
                      value={values.secondPassTollBooth || ""}
                      onChange={(event, newValue) => {
                        setFieldValue("secondPassTollBooth", newValue || "");
                      }}
                      onBlur={handleBlur}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          name="secondPassTollBooth"
                          label="Second Pass Toll Booth"
                          error={
                            touched.secondPassTollBooth &&
                            Boolean(errors.secondPassTollBooth)
                          }
                          helperText={
                            touched.secondPassTollBooth &&
                            errors.secondPassTollBooth
                          }
                        />
                      )}
                    />
                  </FormControl>

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

export default TollData;

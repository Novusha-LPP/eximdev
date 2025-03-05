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
  tollBoothName: Yup.string().required("Toll Booth Name is required"),
  vehicleType: Yup.string().required("Vehicle Type is required"),
  fastagClassId: Yup.string().required("Fastag Class ID is required"),
  singleAmount: Yup.number()
    .typeError("Single Amount must be a number")
    .required("Single Amount is required")
    .min(0, "Cannot be negative"),
  returnAmount: Yup.number()
    .typeError("Return Amount must be a number")
    .required("Return Amount is required")
    .min(0, "Cannot be negative"),
  secondPassTollBooth: Yup.string(),
});

const TollData = () => {
  const [tollItems, setTollItems] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    tollBoothName: "",
    vehicleType: "",
    fastagClassId: "",
    singleAmount: "",
    returnAmount: "",
    secondPassTollBooth: "",
  });

  const API_URL = process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // Fetch all toll data
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

  // Handle Add
  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      tollBoothName: "",
      vehicleType: "",
      fastagClassId: "",
      singleAmount: "",
      returnAmount: "",
      secondPassTollBooth: "",
    });
    setOpenModal(true);
  };

  // Handle Edit
  const handleEdit = (item) => {
    setModalMode("edit");
    setFormData({
      _id: item._id, // for updates only, not displayed in form
      tollBoothName: item.tollBoothName || "",
      vehicleType: item.vehicleType || "",
      fastagClassId: item.fastagClassId || "",
      singleAmount: item.singleAmount || "",
      returnAmount: item.returnAmount || "",
      secondPassTollBooth: item.secondPassTollBooth || "",
    });
    setOpenModal(true);
  };

  // Handle Delete
  const handleDelete = async (item) => {
    if (
      window.confirm(
        `Are you sure you want to delete toll booth: ${item.tollBoothName}?`
      )
    ) {
      try {
        await axios.delete(`${API_URL}/delete-toll-data/${item._id}`);
        fetchTollData();
      } catch (error) {
        console.error("❌ Error deleting toll data:", error);
      }
    }
  };

  // Handle Save (Add/Edit)
  const handleSave = async (values) => {
    const { _id, ...restValues } = values;
    const formattedData = {
      ...restValues,
      // Example of trimming strings, if desired:
      tollBoothName: restValues.tollBoothName.trim(),
      vehicleType: restValues.vehicleType.trim(),
      fastagClassId: restValues.fastagClassId.trim(),
      secondPassTollBooth: restValues.secondPassTollBooth.trim(),
      singleAmount: Number(restValues.singleAmount),
      returnAmount: Number(restValues.returnAmount),
    };

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/add-toll-data`, formattedData);
        responseHandler(response, "added");
      } else {
        response = await axios.put(
          `${API_URL}/update-toll-data/${_id}`,
          formattedData
        );
        responseHandler(response, "updated");
      }
    } catch (error) {
      console.error("❌ Error saving toll data:", error);
      alert(`Failed to save toll data: ${error.response?.data?.error || "Server error"}`);
    }
  };

  const responseHandler = (response, action) => {
    if (response.status === 200 || response.status === 201) {
      alert(`Toll data ${action} successfully!`);
      setOpenModal(false);
      fetchTollData();
    } else {
      alert(`Failed to ${action} toll data: ${response.statusText}`);
    }
  };

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
              <TableCell>Vehicle Type</TableCell>
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
                <TableCell>{item.vehicleType}</TableCell>
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
                  {/* Toll Booth Name */}
                  <TextField
                    name="tollBoothName"
                    label="Toll Booth Name"
                    value={values.tollBoothName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.tollBoothName && Boolean(errors.tollBoothName)}
                    helperText={touched.tollBoothName && errors.tollBoothName}
                  />

                  {/* Vehicle Type */}
                  <TextField
                    name="vehicleType"
                    label="Vehicle Type"
                    value={values.vehicleType}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.vehicleType && Boolean(errors.vehicleType)}
                    helperText={touched.vehicleType && errors.vehicleType}
                  />

                  {/* Fastag Class ID */}
                  <TextField
                    name="fastagClassId"
                    label="Fastag Class ID"
                    value={values.fastagClassId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.fastagClassId && Boolean(errors.fastagClassId)}
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
                    required
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
                    required
                    error={touched.returnAmount && Boolean(errors.returnAmount)}
                    helperText={touched.returnAmount && errors.returnAmount}
                  />

                  {/* Second Pass Toll Booth */}
                  <TextField
                    name="secondPassTollBooth"
                    label="Second Pass Toll Booth"
                    value={values.secondPassTollBooth}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    error={
                      touched.secondPassTollBooth &&
                      Boolean(errors.secondPassTollBooth)
                    }
                    helperText={
                      touched.secondPassTollBooth && errors.secondPassTollBooth
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

export default TollData;
 
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";

// Validation with Yup
const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
});

const ShippingLine = () => {
  const [shippingLines, setShippingLines] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    name: "",
  });

  // Adjust your base URL
  const API_URL = process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // Fetch all shipping lines
  const fetchShippingLines = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-shipping-line`);
      setShippingLines(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching shipping lines:", error);
    }
  };

  useEffect(() => {
    fetchShippingLines();
  }, []);

  // Handle Add
  const handleAdd = () => {
    setModalMode("add");
    setFormData({ name: "" });
    setOpenModal(true);
  };

  // Handle Edit
  const handleEdit = (line) => {
    setModalMode("edit");
    setFormData({
      _id: line._id, // store the ID for updating
      name: line.name || "",
    });
    setOpenModal(true);
  };

  // Handle Delete
  const handleDelete = async (line) => {
    if (window.confirm(`Are you sure you want to delete shipping line: ${line.name}?`)) {
      try {
        await axios.delete(`${API_URL}/delete-shipping-line/${line._id}`);
        fetchShippingLines();
      } catch (error) {
        console.error("❌ Error deleting shipping line:", error);
      }
    }
  };

  // Handle Save (Add/Edit)
  const handleSave = async (values) => {
    const { _id, ...restValues } = values;

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/add-shipping-line`, restValues);
        responseHandler(response, "added");
      } else {
        response = await axios.put(
          `${API_URL}/update-shipping-line/${_id}`,
          restValues
        );
        responseHandler(response, "updated");
      }
    } catch (error) {
      console.error("❌ Error saving shipping line:", error);
      alert(`Failed to save shipping line: ${error.response?.data?.error || "Server error"}`);
    }
  };

  // Common success/failure logic
  const responseHandler = (response, action) => {
    if (response.status === 200 || response.status === 201) {
      alert(`Shipping line ${action} successfully!`);
      setOpenModal(false);
      fetchShippingLines();
    } else {
      alert(`Failed to ${action} shipping line: ${response.statusText}`);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Shipping Line
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shippingLines.map((line) => (
              <TableRow key={line._id}>
                <TableCell>{line.name}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(line)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(line)} color="error">
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
          {modalMode === "add" ? "Add New Shipping Line" : "Edit Shipping Line"}
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                  {/* Name Field */}
                  <TextField
                    name="name"
                    label="Name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
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

export default ShippingLine;

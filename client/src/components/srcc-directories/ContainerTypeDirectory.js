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

// Validation schema
const validationSchema = Yup.object({
  container_type: Yup.string().required("Container Type is required"),
  iso_code: Yup.string().required("ISO Code is required"),
  teu: Yup.number()
    .min(1, "TEU must be at least 1")
    .required("TEU is required"),
  outer_dimension: Yup.string().required("Outer Dimension is required"),
  tare_weight: Yup.number()
    .min(0, "Tare Weight cannot be negative")
    .required("Tare Weight is required"),
  payload: Yup.number()
    .min(0, "Payload cannot be negative")
    .required("Payload is required"),
});

const ContainerTypeDirectory = () => {
  const [containerTypes, setContainerTypes] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState({
    container_type: "",
    iso_code: "",
    teu: "",
    outer_dimension: "",
    tare_weight: "",
    payload: "",
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // Define fetchContainerTypes outside useEffect
  const fetchContainerTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-container-types`);
      setContainerTypes(response.data || []);
    } catch (error) {
      console.error("Error fetching container types:", error);
    }
  };

  useEffect(() => {
    fetchContainerTypes();
  }, []);

  const handleOpenModal = (mode, data = {}) => {
    setModalMode(mode);
    setEditData({
        _id: data._id,  // Ensure the _id is passed here for edit operations
        container_type: data.container_type || "",
        iso_code: data.iso_code || "",
        teu: data.teu || "",
        outer_dimension: data.outer_dimension || "",
        tare_weight: data.tare_weight || "",
        payload: data.payload || "",
    });
    setOpenModal(true);
};

const handleFormSubmit = async (values) => {
    const url = modalMode === "add"
      ? `${API_URL}/add-container-type`
      : `${API_URL}/update-container-type/${values._id}`;  // Use _id for PUT request
    try {
      await axios[modalMode === "add" ? 'post' : 'put'](url, values);
      fetchContainerTypes(); // re-fetch the updated list
      setOpenModal(false);
    } catch (error) {
      console.error("Error saving container type:", error);
    }
};


  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this container type?")
    ) {
      await axios.delete(`${API_URL}/delete-container-type/${id}`);
      fetchContainerTypes(); // Refresh list after deletion
    }
  };

  // const handleFormSubmit = async (values) => {
  //   const url =
  //     modalMode === "add"
  //       ? `${API_URL}/add-container-type`
  //       : `${API_URL}/update-container-type/${editData._id}`;
  //   try {
  //     await axios[modalMode === "add" ? "post" : "put"](url, values);
  //     fetchContainerTypes(); // re-fetch the updated list
  //     setOpenModal(false);
  //   } catch (error) {
  //     console.error("Error saving container type:", error);
  //   }
  // };

  return (
    <Box>
      <Button variant="contained" onClick={() => handleOpenModal("add")}>
        Add Container Type
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Container Type</TableCell>
              <TableCell>ISO Code</TableCell>
              <TableCell>TEU</TableCell>
              <TableCell>Outer Dimension</TableCell>
              <TableCell>Tare Weight</TableCell>
              <TableCell>Payload</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {containerTypes.map((container) => (
              <TableRow key={container._id}>
                <TableCell>{container.container_type}</TableCell>
                <TableCell>{container.iso_code}</TableCell>
                <TableCell>{container.teu}</TableCell>
                <TableCell>{container.outer_dimension}</TableCell>
                <TableCell>{container.tare_weight}</TableCell>
                <TableCell>{container.payload}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpenModal("edit", container)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(container._id)}
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

      {/* Formik Modal for Adding & Editing Container Types */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add"
            ? "Add New Container Type"
            : "Edit Container Type"}
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={editData}
            validationSchema={validationSchema}
            enableReinitialize
            onSubmit={handleFormSubmit}
          >
            {({ values, handleChange, handleBlur, errors, touched }) => (
              <Form>
                <TextField
                  name="container_type"
                  label="Container Type"
                  fullWidth
                  value={values.container_type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.container_type && Boolean(errors.container_type)
                  }
                  helperText={touched.container_type && errors.container_type}
                  margin="normal"
                />
                <TextField
                  name="iso_code"
                  label="ISO Code"
                  fullWidth
                  value={values.iso_code}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.iso_code && Boolean(errors.iso_code)}
                  helperText={touched.iso_code && errors.iso_code}
                  margin="normal"
                />
                <TextField
                  name="teu"
                  label="TEU"
                  fullWidth
                  value={values.teu}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.teu && Boolean(errors.teu)}
                  helperText={touched.teu && errors.teu}
                  margin="normal"
                />
                <TextField
                  name="outer_dimension"
                  label="Outer Dimension"
                  fullWidth
                  value={values.outer_dimension}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.outer_dimension && Boolean(errors.outer_dimension)
                  }
                  helperText={touched.outer_dimension && errors.outer_dimension}
                  margin="normal"
                />
                <TextField
                  name="tare_weight"
                  label="Tare Weight"
                  fullWidth
                  value={values.tare_weight}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.tare_weight && Boolean(errors.tare_weight)}
                  helperText={touched.tare_weight && errors.tare_weight}
                  margin="normal"
                />
                <TextField
                  name="payload"
                  label="Payload"
                  fullWidth
                  value={values.payload}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.payload && Boolean(errors.payload)}
                  helperText={touched.payload && errors.payload}
                  margin="normal"
                />
                <DialogActions>
                  <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                  <Button type="submit" variant="contained">
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

export default ContainerTypeDirectory;

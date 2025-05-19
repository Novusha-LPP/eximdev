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

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  description: Yup.string(),
});

const LrTrackingStagesDirectorie = () => {
  const [stages, setStages] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  const fetchStages = async () => {
    try {
      const response = await axios.get(`${API_URL}/lr-tracking-stages/all`);
      setStages(response.data || []);
    } catch (error) {
      console.error("❌ Error fetching tracking stages:", error);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ name: "", description: "" });
    setOpenModal(true);
  };

  const handleEdit = (stage) => {
    setModalMode("edit");
    setFormData({
      _id: stage._id,
      name: stage.name || "",
      description: stage.description || "",
    });
    setOpenModal(true);
  };

  const handleDelete = async (stage) => {
    if (
      window.confirm(`Are you sure you want to delete stage: ${stage.name}?`)
    ) {
      try {
        await axios.delete(`${API_URL}/lr-tracking-stages/${stage._id}`);
        fetchStages();
      } catch (error) {
        console.error("❌ Error deleting tracking stage:", error);
      }
    }
  };

  const handleSave = async (values) => {
    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(
          `${API_URL}/lr-tracking-stages/create`,
          values
        );
      } else {
        const { _id, ...updateData } = values;
        response = await axios.put(
          `${API_URL}/lr-tracking-stages/${_id}`,
          updateData
        );
      }

      if (response.status === 200 || response.status === 201) {
        alert(
          `Tracking stage ${
            modalMode === "add" ? "added" : "updated"
          } successfully!`
        );
        setOpenModal(false);
        fetchStages();
      }
    } catch (error) {
      console.error("❌ Error saving tracking stage:", error);
      alert(
        `Failed to save tracking stage: ${
          error.response?.data?.message || "Server error"
        }`
      );
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Tracking Stage
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage._id}>
                <TableCell>{stage.name}</TableCell>
                <TableCell>{stage.description || "-"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(stage)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(stage)} color="error">
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add"
            ? "Add New Tracking Stage"
            : "Edit Tracking Stage"}
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
                    name="name"
                    label="Stage Name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />

                  <TextField
                    name="description"
                    label="Description"
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    multiline
                    rows={3}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
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

export default LrTrackingStagesDirectorie;

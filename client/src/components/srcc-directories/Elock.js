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
  FAssetID: Yup.string().required("FAssetID is required"),
  FAgentGUID: Yup.string().required("FAgentGUID is required"),
  AssetGUID: Yup.string().required("AssetGUID is required"),
});

const Elock = () => {
  const [elocks, setElocks] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    FAssetID: "",
    FAgentGUID: "",
    AssetGUID: "",
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  const fetchElocks = async () => {
    try {
      const response = await axios.get(`${API_URL}/elock/get-elocks`);
      setElocks(response.data.data || []);
    } catch (error) {
      console.error("❌ Error fetching Elocks:", error);
    }
  };

  useEffect(() => {
    fetchElocks();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ FAssetID: "", FAgentGUID: "", AssetGUID: "" });
    setOpenModal(true);
  };

  const handleEdit = (elock) => {
    setModalMode("edit");
    setFormData({
      _id: elock._id,
      FAssetID: elock.FAssetID || "",
      FAgentGUID: elock.FAgentGUID || "",
      AssetGUID: elock.AssetGUID || "",
    });
    setOpenModal(true);
  };

  const handleDelete = async (elock) => {
    if (
      window.confirm(
        `Are you sure you want to delete Elock with FAssetID: ${elock.FAssetID}?`
      )
    ) {
      try {
        await axios.delete(`${API_URL}/elock/delete-elock/${elock._id}`);
        fetchElocks();
      } catch (error) {
        console.error("❌ Error deleting Elock:", error);
      }
    }
  };

  const handleSave = async (values) => {
    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/elock/create-elock`, values);
        responseHandler(response, "added");
      } else {
        response = await axios.put(
          `${API_URL}/elock/update-elock/${values._id}`,
          values
        );
        responseHandler(response, "updated");
      }
    } catch (error) {
      console.error("❌ Error saving Elock:", error);
      alert(
        `Failed to save Elock: ${error.response?.data?.error || "Server error"}`
      );
    }
  };

  const responseHandler = (response, action) => {
    if (response.status === 200 || response.status === 201) {
      alert(`Elock ${action} successfully!`);
      setOpenModal(false);
      fetchElocks();
    } else {
      alert(`Failed to ${action} Elock: ${response.statusText}`);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Elock
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>FAssetID</TableCell>
              <TableCell>FAgentGUID</TableCell>
              <TableCell>AssetGUID</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {elocks.map((elock) => (
              <TableRow key={elock._id}>
                <TableCell>{elock.FAssetID}</TableCell>
                <TableCell>{elock.FAgentGUID}</TableCell>
                <TableCell>{elock.AssetGUID}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(elock)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(elock)} color="error">
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
          {modalMode === "add" ? "Add New Elock" : "Edit Elock"}
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
                    name="FAssetID"
                    label="FAssetID"
                    value={values.FAssetID}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.FAssetID && Boolean(errors.FAssetID)}
                    helperText={touched.FAssetID && errors.FAssetID}
                  />

                  <TextField
                    name="FAgentGUID"
                    label="FAgentGUID"
                    value={values.FAgentGUID}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.FAgentGUID && Boolean(errors.FAgentGUID)}
                    helperText={touched.FAgentGUID && errors.FAgentGUID}
                  />

                  <TextField
                    name="AssetGUID"
                    label="AssetGUID"
                    value={values.AssetGUID}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.AssetGUID && Boolean(errors.AssetGUID)}
                    helperText={touched.AssetGUID && errors.AssetGUID}
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

export default Elock;

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
  Autocomplete,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  code: Yup.string().required("Code is required"),
  organization: Yup.object({
    _id: Yup.string().required("Organization ID is required"),
    name: Yup.string().required("Organization name is required"),
  }).required("Organization is required"),
});

const ShippingLine = () => {
  const [shippingLines, setShippingLines] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    organization: { _id: "", name: "" },
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

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

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ name: "", code: "", organization: { _id: "", name: "" } });
    setOpenModal(true);
  };

  const handleEdit = (line) => {
    setModalMode("edit");
    setFormData({
      _id: line._id,
      name: line.name || "",
      code: line.code || "",
      organization: line.organisation || { _id: "", name: "" },
    });
    setOpenModal(true);
  };

  const handleDelete = async (line) => {
    if (
      window.confirm(
        `Are you sure you want to delete shipping line: ${line.name}?`
      )
    ) {
      try {
        await axios.delete(`${API_URL}/delete-shipping-line/${line._id}`);
        fetchShippingLines();
      } catch (error) {
        console.error("❌ Error deleting shipping line:", error);
      }
    }
  };

  const handleSave = async (values) => {
    const { _id, organization, ...restValues } = values;
    const payload = { ...restValues, organisation: organization };

    try {
      let response;
      if (modalMode === "add") {
        response = await axios.post(`${API_URL}/add-shipping-line`, payload);
        responseHandler(response, "added");
      } else {
        response = await axios.put(
          `${API_URL}/update-shipping-line/${_id}`,
          payload
        );
        responseHandler(response, "updated");
      }
    } catch (error) {
      console.error("❌ Error saving shipping line:", error);
      alert(
        `Failed to save shipping line: ${
          error.response?.data?.error || "Server error"
        }`
      );
    }
  };

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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Organisation</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shippingLines.map((line) => (
              <TableRow key={line._id}>
                <TableCell>{line.name}</TableCell>
                <TableCell>{line.code}</TableCell>
                <TableCell>{line.organisation?.name || "-"}</TableCell>
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
                  <TextField
                    name="name"
                    label="Shipping Line Name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />

                  <TextField
                    name="code"
                    label="Shipping Line Code"
                    value={values.code}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.code && Boolean(errors.code)}
                    helperText={touched.code && errors.code}
                  />

                  <Autocomplete
                    options={orgOptions}
                    getOptionLabel={(option) => option.name || ""}
                    filterOptions={(x) => x}
                    onInputChange={async (e, value) => {
                      if (value.length < 2) return;
                      try {
                        const res = await axios.get(
                          `${API_URL}/organisations/autocomplete?q=${value}`
                        );
                        setOrgOptions(res.data.data || []);
                      } catch (err) {
                        console.error("❌ Error searching organizations:", err);
                      }
                    }}
                    onChange={(event, newValue) => {
                      setFieldValue(
                        "organization",
                        newValue || { _id: "", name: "" }
                      );
                    }}
                    value={values.organization || null}
                    isOptionEqualToValue={(option, value) =>
                      option._id === value._id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Organization"
                        name="organization"
                        onBlur={handleBlur}
                        error={
                          touched.organization && Boolean(errors.organization)
                        }
                        helperText={
                          touched.organization && errors.organization?.name
                        }
                      />
                    )}
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

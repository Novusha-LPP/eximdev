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
  name: Yup.string().required("Commodity Name is required"),
  hsn_code: Yup.string()
    .required("HSN Code is required")
    .matches(/^\S*$/, "HSN Code must not contain spaces"),
  description: Yup.string().required("Description is required"),
});

const Commoditys = () => {
  const [commodities, setCommodities] = useState([]);
  const [existingHsn, setExistingHsn] = useState([]);
  const [modalMode, setModalMode] = useState("add");
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    hsn_code: "",
    description: "",
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // Fetch commodity data from API
  const fetchCommodities = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-commodity-type`);
      const commodityList = response.data.data || [];
      setCommodities(commodityList);
      setExistingHsn(commodityList.map((item) => item.hsn_code.toLowerCase()));
    } catch (error) {
      console.error("❌ Error fetching commodities:", error);
    }
  };

  useEffect(() => {
    fetchCommodities();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      name: "",
      hsn_code: "",
      description: "",
    });
    setOpenModal(true);
  };

  const handleEdit = (commodity) => {
    setModalMode("edit");
    setFormData({
      name: commodity.name,
      hsn_code: commodity.hsn_code,
      description: commodity.description,
    });
    setOpenModal(true);
  };

  const handleDelete = async (hsn_code) => {
    if (
      window.confirm(`Are you sure you want to delete HSN code: ${hsn_code}?`)
    ) {
      try {
        await axios.delete(`${API_URL}/delete-commodity-type/${hsn_code}`);
        fetchCommodities();
      } catch (error) {
        console.error("❌ Error deleting commodity:", error);
      }
    }
  };

  const handleSave = async (values) => {
    try {
      const formattedData = {
        ...values,
        hsn_code: values.hsn_code.trim(),
        name: values.name.trim(),
        description: values.description.trim(),
      };

      if (
        modalMode === "add" &&
        existingHsn.includes(formattedData.hsn_code.toLowerCase())
      ) {
        alert(`⚠️ HSN Code "${formattedData.hsn_code}" already exists!`);
        return;
      }

      if (modalMode === "add") {
        // Add new commodity
        const response = await axios.post(
          `${API_URL}/add-commodity-type`,
          formattedData
        );
        if (response.status === 201) {
          setOpenModal(false);
          fetchCommodities();
        }
      } else {
        // Update existing commodity
        const response = await axios.put(
          `${API_URL}/update-commodity-type/${formattedData.hsn_code}`,
          formattedData
        );
        if (response.status === 200) {
          setOpenModal(false);
          fetchCommodities();
        }
      }
    } catch (error) {
      console.error("❌ Error saving commodity:", error);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Commodity
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Commodity Name</TableCell>
              <TableCell>HSN Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {commodities.map((commodity) => (
              <TableRow key={commodity.hsn_code}>
                <TableCell>{commodity.name}</TableCell>
                <TableCell>{commodity.hsn_code}</TableCell>
                <TableCell>{commodity.description}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(commodity)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(commodity.hsn_code)}
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

      {/* Formik Modal for Adding & Editing Commodities */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add New Commodity" : "Edit Commodity"}
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={formData}
            validationSchema={validationSchema}
            onSubmit={handleSave}
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
                    label="Commodity Name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                  <TextField
                    name="hsn_code"
                    label="HSN Code"
                    value={values.hsn_code}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    disabled={modalMode === "edit"} // 👈 Prevents editing in edit mode
                    error={touched.hsn_code && Boolean(errors.hsn_code)}
                    helperText={touched.hsn_code && errors.hsn_code}
                  />

                  <TextField
                    name="description"
                    label="Description"
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
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

export default Commoditys;

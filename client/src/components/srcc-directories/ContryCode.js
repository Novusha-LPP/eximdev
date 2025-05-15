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
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function CountryCode() {
  const [countries, setCountries] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({
    cntry_cd: "",
    cntry_nm: "",
    // dgcis_cd: "",
    // cntry_cd_old: "",
    // aepc_cntry_cd: "",
    // cntry_grp: "",
    // ref_cntry_cd: "",
    // status: "",
  });
  const [errors, setErrors] = useState({});

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api/countries";

  const fetchCountries = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-countries`);
      setCountries(response.data);
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      cntry_cd: "",
      cntry_nm: "",
      // dgcis_cd: "",
      // cntry_cd_old: "",
      // aepc_cntry_cd: "",
      // cntry_grp: "",
      // ref_cntry_cd: "",
      // status: "",
    });
    setOpenModal(true);
    setErrors({});
  };

  const handleEdit = (country) => {
    setModalMode("edit");
    setFormData(country);
    setEditData(country);
    setOpenModal(true);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this country?")) {
      try {
        await axios.delete(`${API_URL}/delete-country/${id}`);
        fetchCountries();
      } catch (error) {
        console.error("Error deleting country:", error);
      }
    }
  };

  const handleSave = async () => {
    const requiredFields = ["cntry_cd", "cntry_nm"];
    let newErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field].trim()) newErrors[field] = "This field is required";
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-country`, formData);
      } else {
        await axios.put(`${API_URL}/update-country/${editData._id}`, formData);
      }
      setOpenModal(false);
      fetchCountries();
    } catch (error) {
      console.error("Error saving country:", error);
      alert(error.response?.data?.error || "An error occurred");
    }
  };

  const handleFieldChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Country
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Country Code</strong>
              </TableCell>
              <TableCell>
                <strong>Country Name</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {countries.map((country) => (
              <TableRow key={country._id}>
                <TableCell>{country.cntry_cd}</TableCell>
                <TableCell>{country.cntry_nm}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(country)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(country._id)}
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

      {/* Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add" : "Edit"} Country
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Country Code"
            name="cntry_cd"
            value={formData.cntry_cd}
            onChange={handleFieldChange}
            error={!!errors.cntry_cd}
            helperText={errors.cntry_cd}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Country Name"
            name="cntry_nm"
            value={formData.cntry_nm}
            onChange={handleFieldChange}
            error={!!errors.cntry_nm}
            helperText={errors.cntry_nm}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CountryCode;

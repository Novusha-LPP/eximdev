import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

function CurrencyDirectory() {
  const [currencies, setCurrencies] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({
    currency_name: "",
    iso_code: "",
    country_name: "",
  });
  const [errors, setErrors] = useState({});

  const API_URL = "http://localhost:9000/api";

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-currency`);
      setCurrencies(response.data);
    } catch (error) {
      console.error("Error fetching currencies:", error);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({ currency_name: "", iso_code: "", country_name: "" });
    setOpenModal(true);
    setErrors({});
  };

  const handleEdit = (currency) => {
    setModalMode("edit");
    setEditData(currency);
    setFormData(currency);
    setOpenModal(true);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this currency?")) {
      try {
        await axios.delete(`${API_URL}/delete-currency/${id}`);
        fetchCurrencies();
      } catch (error) {
        console.error("Error deleting currency:", error);
      }
    }
  };

  const handleSave = async () => {
    const requiredFields = ["currency_name", "iso_code", "country_name"];
    let newErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field]?.trim()) newErrors[field] = "Required";
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-currency`, formData);
      } else {
        await axios.put(`${API_URL}/update-currency/${editData._id}`, formData);
      }
      setOpenModal(false);
      fetchCurrencies();
    } catch (error) {
      console.error("Error saving currency:", error);
      alert(error.response?.data?.error || "Something went wrong");
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
          Add Currency
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Currency Name</strong></TableCell>
              <TableCell><strong>ISO Code</strong></TableCell>
              <TableCell><strong>Country Name</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currencies.map((currency) => (
              <TableRow key={currency._id}>
                <TableCell>{currency.currency_name}</TableCell>
                <TableCell>{currency.iso_code}</TableCell>
                <TableCell>{currency.country_name}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(currency)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(currency._id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="sm">
        <DialogTitle>{modalMode === "add" ? "Add" : "Edit"} Currency</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Currency Name"
            name="currency_name"
            value={formData.currency_name}
            onChange={handleFieldChange}
            error={!!errors.currency_name}
            helperText={errors.currency_name}
          />
          <TextField
            fullWidth
            margin="dense"
            label="ISO Code"
            name="iso_code"
            value={formData.iso_code}
            onChange={handleFieldChange}
            error={!!errors.iso_code}
            helperText={errors.iso_code}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Country Name"
            name="country_name"
            value={formData.country_name}
            onChange={handleFieldChange}
            error={!!errors.country_name}
            helperText={errors.country_name}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CurrencyDirectory;
// 
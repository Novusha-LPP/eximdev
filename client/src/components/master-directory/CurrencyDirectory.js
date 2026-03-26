import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton,
  TableBody, TableCell, TableHead, TableRow
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const CurrencyDirectory = () => {
  const [currencies, setCurrencies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    country: "",
    active: "Yes"
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-currencies`);
      setCurrencies(res.data);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      handleSnackbar("Failed to fetch currencies", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.country) {
      handleSnackbar("Name, Code and Country are required", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-currency/${editingId}`, formData);
        handleSnackbar("Currency updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-currency`, formData);
        handleSnackbar("Currency added successfully", "success");
      }
      handleClose();
      fetchCurrencies();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save currency", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this currency?")) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-currency/${id}`);
        handleSnackbar("Currency deleted successfully", "success");
        fetchCurrencies();
      } catch (error) {
        handleSnackbar("Failed to delete currency", "error");
      }
    }
  };

  const handleEdit = (currency) => {
    setEditingId(currency._id);
    setFormData({
      name: currency.name,
      code: currency.code,
      country: currency.country || "",
      active: currency.active || "Yes"
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      code: "",
      country: "",
      active: "Yes"
    });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredCurrencies = currencies.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.country && c.country.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link 
          underline="hover" 
          color="inherit" 
          href="#" 
          onClick={(e) => { e.preventDefault(); navigate("/master-directory"); }}
        >
          Master Directory
        </Link>
        <Typography color="text.primary">Currency Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Currency Directory</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Currency
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name or code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Paper sx={{ width: "100%", overflow: "auto" }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Currency Name</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Currency Code</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Country</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Active</TableCell>
                <TableCell align="center" sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCurrencies.map((currency, index) => (
                <TableRow key={index} hover>
                  <TableCell>{currency.name}</TableCell>
                  <TableCell>{currency.code}</TableCell>
                  <TableCell>{currency.country}</TableCell>
                  <TableCell>{currency.active}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit(currency)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(currency._id)} color="error">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCurrencies.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ p: 4 }}>
                      No currencies found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editingId ? "Edit Currency" : "Add New Currency"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Currency Name"
              placeholder="e.g. Indian Rupee"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Currency Code"
              placeholder="e.g. INR"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
            <TextField
              fullWidth
              label="Country"
              placeholder="e.g. India"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <TextField
              select
              label="Active"
              SelectProps={{ native: true }}
              value={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.value })}
            >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">{editingId ? "Update" : "Add"}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CurrencyDirectory;

import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const CountryDirectory = () => {
  const [countries, setCountries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-countries`);
      setCountries(res.data);
    } catch (error) {
      console.error("Error fetching countries:", error);
      handleSnackbar("Failed to fetch countries", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
        setLoading(true);
        await axios.post(`${process.env.REACT_APP_API_STRING}/seed-countries`);
        handleSnackbar("Initial countries seeded successfully", "success");
        fetchCountries();
    } catch (error) {
        handleSnackbar("Failed to seed countries", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      handleSnackbar("Please fill all fields", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-country/${editingId}`, formData);
        handleSnackbar("Country updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-country`, formData);
        handleSnackbar("Country added successfully", "success");
      }
      handleClose();
      fetchCountries();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save country", "error");
    }
  };

  const handleEdit = (country) => {
    setEditingId(country._id);
    setFormData({ name: country.name, code: country.code });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ name: "", code: "" });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Typography color="text.primary">Country Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Country Directory</Typography>
        <Box>
            {countries.length === 0 && (
                <Button variant="outlined" onClick={handleSeed} sx={{ mr: 2 }}>
                    Seed Initial Data
                </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                Add Country
            </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by country name or code..."
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

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>Country Name</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>Country Code</Box>
                <Box component="th" sx={{ p: 2, textAlign: "center", background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>Action</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredCountries.map((country, index) => (
                <Box component="tr" key={index} sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #eee" }}>{country.name}</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #eee" }}>{country.code}</Box>
                  <Box component="td" sx={{ p: 1, borderBottom: "1px solid #eee", textAlign: "center" }}>
                    <IconButton size="small" onClick={() => handleEdit(country)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {filteredCountries.length === 0 && (
                <Box component="tr">
                    <Box component="td" colSpan={3} sx={{ p: 4, textAlign: "center" }}>
                      No countries found matching your search.
                    </Box>
                </Box>
              )}
            </Box>
          </Table>
        )}
      </Paper>

      {/* Country Dialog */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingId ? "Edit Country" : "Add New Country"}</DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 2 }}>
          <TextField
            fullWidth
            label="Country Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Country Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            inputProps={{ maxLength: 2 }}
          />
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

export default CountryDirectory;

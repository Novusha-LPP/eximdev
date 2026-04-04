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

const CustomHouseDirectory = () => {
  const [customHouses, setCustomHouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", code: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomHouses();
  }, []);

  const fetchCustomHouses = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-custom-houses`);
      setCustomHouses(res.data);
    } catch (error) {
      console.error("Error fetching custom houses:", error);
      handleSnackbar("Failed to fetch custom houses", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
        setLoading(true);
        const res = await axios.post(`${process.env.REACT_APP_API_STRING}/seed-custom-houses`);
        handleSnackbar(res.data.message || "Custom Houses seeded successfully", "success");
        fetchCustomHouses();
    } catch (error) {
        handleSnackbar("Failed to seed custom houses", "error");
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
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-custom-house/${editingId}`, formData);
        handleSnackbar("Custom House updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-custom-house`, formData);
        handleSnackbar("Custom House added successfully", "success");
      }
      handleClose();
      fetchCustomHouses();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save custom house", "error");
    }
  };

  const handleEdit = (house) => {
    setEditingId(house._id);
    setFormData({ name: house.name, code: house.code });
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

  const filteredHouses = customHouses.filter((house) =>
    house.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    house.code.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Typography color="text.primary">Custom House Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>Custom House Directory</Typography>
        <Box>
            {customHouses.length === 0 && (
                <Button variant="outlined" onClick={handleSeed} sx={{ mr: 2, borderRadius: '8px' }}>
                    Seed Initial Data
                </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ borderRadius: '8px', bgcolor: '#1a237e' }}>
                Add Custom House
            </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by custom house name or code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          sx: { borderRadius: '12px' },
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Custom House Name</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Custom House Code</Box>
                <Box component="th" sx={{ p: 2, textAlign: "center", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Action</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredHouses.map((house, index) => (
                <Box component="tr" key={index} sx={{ "&:hover": { backgroundColor: "#fcfcff" } }}>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>{house.name}</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>
                    <Typography variant="body2" sx={{ bgcolor: '#e8eaf6', color: '#1a237e', display: 'inline-block', px: 1, py: 0.5, borderRadius: '4px', fontWeight: 600 }}>
                        {house.code}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ p: 1, borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                    <IconButton size="small" onClick={() => handleEdit(house)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {filteredHouses.length === 0 && (
                <Box component="tr">
                    <Box component="td" colSpan={3} sx={{ p: 4, textAlign: "center", color: '#999' }}>
                      No custom houses found matching your search.
                    </Box>
                </Box>
              )}
            </Box>
          </Table>
        )}
      </Paper>

      {/* Custom House Dialog */}
      <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? "Edit Custom House" : "Add New Custom House"}</DialogTitle>
        <DialogContent sx={{ minWidth: 350, pt: 2 }}>
          <TextField
            fullWidth
            label="Name"
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 3, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Code"
            variant="outlined"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} sx={{ color: '#666' }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#1a237e', borderRadius: '8px', px: 3 }}>{editingId ? "Update" : "Add"}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomHouseDirectory;

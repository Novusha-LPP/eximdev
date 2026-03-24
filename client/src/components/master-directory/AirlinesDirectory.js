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

const AirlinesDirectory = () => {
  const [airlines, setAirlines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    prefix: "",
    checkDigit: "Yes",
    active: "Yes",
    awbFormat: ""
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const navigate = useNavigate();

  useEffect(() => {
    fetchAirlines();
  }, []);

  const fetchAirlines = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-airlines`);
      setAirlines(res.data);
    } catch (error) {
      console.error("Error fetching airlines:", error);
      handleSnackbar("Failed to fetch airlines", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
        setLoading(true);
        await axios.post(`${process.env.REACT_APP_API_STRING}/seed-airlines`);
        handleSnackbar("Initial airlines seeded successfully", "success");
        fetchAirlines();
    } catch (error) {
        handleSnackbar("Failed to seed airlines", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code || !formData.prefix) {
      handleSnackbar("Name, Code and Prefix are required", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-airline/${editingId}`, formData);
        handleSnackbar("Airline updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-airline`, formData);
        handleSnackbar("Airline added successfully", "success");
      }
      handleClose();
      fetchAirlines();
    } catch (error) {
      handleSnackbar("Failed to save airline", "error");
    }
  };

  const handleEdit = (airline) => {
    setEditingId(airline._id);
    setFormData({
      name: airline.name,
      code: airline.code,
      prefix: airline.prefix,
      checkDigit: airline.checkDigit || "Yes",
      active: airline.active || "Yes",
      awbFormat: airline.awbFormat || ""
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      code: "",
      prefix: "",
      checkDigit: "Yes",
      active: "Yes",
      awbFormat: ""
    });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredAirlines = airlines.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.prefix.includes(searchTerm)
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
        <Typography color="text.primary">Airlines Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Airlines Directory</Typography>
        <Box>
            {airlines.length === 0 && (
                <Button variant="outlined" onClick={handleSeed} sx={{ mr: 2 }}>
                    Seed Initial Data
                </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                Add Airline
            </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name, code or prefix..."
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
          <Table stickyHeader sx={{ minWidth: 800 }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Airline Name</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Code</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Prefix</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Check Digit</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Active</Box>
                <Box component="th" sx={{ p: 2, textAlign: "center", background: "#f5f5f5", fontWeight: 'bold' }}>Action</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredAirlines.map((airline, index) => (
                <Box component="tr" key={index} sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{airline.name}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{airline.code}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{airline.prefix}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{airline.checkDigit}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{airline.active}</Box>
                  <Box component="td" sx={{ p: 1, borderBottom: "1px solid #eee", textAlign: "center" }}>
                    <IconButton size="small" onClick={() => handleEdit(airline)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {filteredAirlines.length === 0 && (
                <Box component="tr">
                    <Box component="td" colSpan={6} sx={{ p: 4, textAlign: "center" }}>
                      No airlines found matching your search.
                    </Box>
                </Box>
              )}
            </Box>
          </Table>
        )}
      </Paper>

      {/* Airline Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Edit Airline" : "Add New Airline"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <TextField
              label="Airline Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
            <TextField
              label="Prefix"
              value={formData.prefix}
              onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
            />
            <TextField
              select
              label="Check Digit"
              SelectProps={{ native: true }}
              value={formData.checkDigit}
              onChange={(e) => setFormData({ ...formData, checkDigit: e.target.value })}
            >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </TextField>
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
            <TextField
              label="AWB Format"
              value={formData.awbFormat}
              onChange={(e) => setFormData({ ...formData, awbFormat: e.target.value })}
            />
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

export default AirlinesDirectory;

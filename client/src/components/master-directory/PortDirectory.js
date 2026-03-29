import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton,
  MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const PortDirectory = () => {
  const [ports, setPorts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    port_name: "", 
    port_code: "", 
    mode: "SEA", 
    country: "" 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchPorts();
  }, []);

  const fetchPorts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-ports`);
      setPorts(res.data);
    } catch (error) {
      console.error("Error fetching ports:", error);
      handleSnackbar("Failed to fetch ports", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
        setLoading(true);
        const res = await axios.post(`${process.env.REACT_APP_API_STRING}/seed-ports`);
        handleSnackbar(res.data.message || "Ports seeded successfully", "success");
        fetchPorts();
    } catch (error) {
        handleSnackbar("Failed to seed ports", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.port_name || !formData.port_code) {
      handleSnackbar("Please fill required fields", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-port/${editingId}`, formData);
        handleSnackbar("Port updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-port`, formData);
        handleSnackbar("Port added successfully", "success");
      }
      handleClose();
      fetchPorts();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save port", "error");
    }
  };

  const handleEdit = (port) => {
    setEditingId(port._id);
    setFormData({ 
      port_name: port.port_name, 
      port_code: port.port_code, 
      mode: port.mode || "SEA", 
      country: port.country || "" 
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ port_name: "", port_code: "", mode: "SEA", country: "" });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredPorts = ports.filter((port) =>
    port.port_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    port.port_code.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Typography color="text.primary">Port Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>Port Directory</Typography>
        <Box>
            {ports.length === 0 && (
                <Button 
                    variant="outlined" 
                    onClick={handleSeed} 
                    sx={{ mr: 2, borderRadius: '8px' }}
                >
                    Seed Initial Data
                </Button>
            )}
            <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => setOpen(true)}
                sx={{ borderRadius: '8px', bgcolor: '#1a237e' }}
            >
                Add Port
            </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by port name or code..."
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
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Port Name</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Port Code</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Mode</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Country</Box>
                <Box component="th" sx={{ p: 2, textAlign: "center", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Action</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredPorts.map((port, index) => (
                <Box component="tr" key={index} sx={{ "&:hover": { backgroundColor: "#fcfcff" } }}>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>{port.port_name}</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>
                    <Typography variant="body2" sx={{ bgcolor: '#e8eaf6', color: '#1a237e', display: 'inline-block', px: 1, py: 0.5, borderRadius: '4px', fontWeight: 600 }}>
                        {port.port_code}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>{port.mode}</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>{port.country}</Box>
                  <Box component="td" sx={{ p: 1, borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                    <IconButton size="small" onClick={() => handleEdit(port)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {filteredPorts.length === 0 && (
                <Box component="tr">
                    <Box component="td" colSpan={5} sx={{ p: 4, textAlign: "center", color: '#999' }}>
                      No ports found matching your search.
                    </Box>
                </Box>
              )}
            </Box>
          </Table>
        )}
      </Paper>

      {/* Port Dialog */}
      <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? "Edit Port" : "Add New Port"}</DialogTitle>
        <DialogContent sx={{ minWidth: 350, pt: 2 }}>
          <TextField
            fullWidth
            label="Port Name"
            variant="outlined"
            value={formData.port_name}
            onChange={(e) => setFormData({ ...formData, port_name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Port Code"
            variant="outlined"
            value={formData.port_code}
            onChange={(e) => {
                const code = e.target.value.toUpperCase();
                setFormData({ 
                    ...formData, 
                    port_code: code,
                    country: code.length >= 2 ? code.substring(0, 2) : formData.country
                });
            }}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 10 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Mode</InputLabel>
            <Select
              value={formData.mode}
              label="Mode"
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
            >
              <MenuItem value="SEA">SEA</MenuItem>
              <MenuItem value="AIR">AIR</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Country Code"
            variant="outlined"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
            inputProps={{ maxLength: 2 }}
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

export default PortDirectory;

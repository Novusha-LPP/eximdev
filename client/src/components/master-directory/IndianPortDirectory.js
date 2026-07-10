import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const IndianPortDirectory = () => {
  const [ports, setPorts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    port_code: "", 
    address: "", 
    place: "", 
    pincode: "" 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchPorts();
  }, []);

  const fetchPorts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-indian-ports`);
      setPorts(res.data);
    } catch (error) {
      console.error("Error fetching Indian ports:", error);
      handleSnackbar("Failed to fetch Indian ports", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.port_code) {
      handleSnackbar("Please fill required fields (Port Code)", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-indian-port/${editingId}`, formData);
        handleSnackbar("Indian port updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-indian-port`, formData);
        handleSnackbar("Indian port added successfully", "success");
      }
      handleClose();
      fetchPorts();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save Indian port", "error");
    }
  };

  const handleEdit = (port) => {
    setEditingId(port._id);
    setFormData({ 
      port_code: port.port_code, 
      address: port.address || "", 
      place: port.place || "", 
      pincode: port.pincode || "" 
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ port_code: "", address: "", place: "", pincode: "" });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Indian port?")) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-indian-port/${id}`);
        handleSnackbar("Indian port deleted successfully", "success");
        fetchPorts();
      } catch (error) {
        handleSnackbar(error.response?.data?.message || "Failed to delete Indian port", "error");
      }
    }
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredPorts = ports.filter((port) =>
    (port.port_code?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (port.place?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (port.address?.toLowerCase() || "").includes(searchTerm.toLowerCase())
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
        <Typography color="text.primary">Indian Port Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a237e' }}>Indian Port Directory</Typography>
        <Box>
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
        placeholder="Search by port code, place, or address..."
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
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Port Code</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Place</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Address</Box>
                <Box component="th" sx={{ p: 2, textAlign: "left", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Pincode</Box>
                <Box component="th" sx={{ p: 2, textAlign: "center", background: "#f8f9fa", color: '#555', fontWeight: 600, borderBottom: "2px solid #eee" }}>Action</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredPorts.map((port, index) => (
                <Box component="tr" key={index} sx={{ "&:hover": { backgroundColor: "#fcfcff" } }}>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>
                    <Typography variant="body2" sx={{ bgcolor: '#e8eaf6', color: '#1a237e', display: 'inline-block', px: 1, py: 0.5, borderRadius: '4px', fontWeight: 600 }}>
                        {port.port_code}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>{port.place}</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>{port.address}</Box>
                  <Box component="td" sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>{port.pincode}</Box>
                  <Box component="td" sx={{ p: 1, borderBottom: "1px solid #f0f0f0", textAlign: "center" }}>
                    <IconButton size="small" onClick={() => handleEdit(port)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(port._id)} color="error" sx={{ ml: 1 }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {filteredPorts.length === 0 && (
                <Box component="tr">
                    <Box component="td" colSpan={5} sx={{ p: 4, textAlign: "center", color: '#999' }}>
                      No Indian ports found matching your search.
                    </Box>
                </Box>
              )}
            </Box>
          </Table>
        )}
      </Paper>

      {/* Port Dialog */}
      <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{editingId ? "Edit Indian Port" : "Add New Indian Port"}</DialogTitle>
        <DialogContent sx={{ minWidth: 350, pt: 2 }}>
          <TextField
            fullWidth
            label="Port Code"
            variant="outlined"
            value={formData.port_code}
            onChange={(e) => setFormData({ ...formData, port_code: e.target.value.toUpperCase() })}
            sx={{ mb: 2, mt: 1 }}
            inputProps={{ maxLength: 10 }}
          />
          <TextField
            fullWidth
            label="Place"
            variant="outlined"
            value={formData.place}
            onChange={(e) => setFormData({ ...formData, place: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Address"
            variant="outlined"
            multiline
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Pincode"
            variant="outlined"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
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

export default IndianPortDirectory;

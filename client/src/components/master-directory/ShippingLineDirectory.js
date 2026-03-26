import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton,
  TableBody, TableCell, TableHead, TableRow, Accordion,
  AccordionSummary, AccordionDetails, Divider
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import BusinessIcon from "@mui/icons-material/Business";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ShippingLineDirectory = () => {
  const [shippingLines, setShippingLines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    gst: "",
    tds: "",
    pan: "",
    active: "Yes",
    branches: []
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const navigate = useNavigate();

  useEffect(() => {
    fetchShippingLines();
  }, []);

  const addBranch = () => {
    setFormData({
      ...formData,
      branches: [
        ...formData.branches,
        {
          branchName: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          country: "",
          gst: "",
          pan: "",
          bankName: "",
          accountNo: "",
          ifsc: "",
          adCode: ""
        }
      ]
    });
  };

  const removeBranch = (index) => {
    const updatedBranches = [...formData.branches];
    updatedBranches.splice(index, 1);
    setFormData({ ...formData, branches: updatedBranches });
  };

  const handleBranchChange = (index, field, value) => {
    const updatedBranches = [...formData.branches];
    updatedBranches[index][field] = value;
    setFormData({ ...formData, branches: updatedBranches });
  };

  const fetchShippingLines = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-shipping-lines`);
      setShippingLines(res.data);
    } catch (error) {
      console.error("Error fetching shipping lines:", error);
      handleSnackbar("Failed to fetch shipping lines", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      handleSnackbar("Name is required", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-shipping-line/${editingId}`, formData);
        handleSnackbar("Shipping Line updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-shipping-line`, formData);
        handleSnackbar("Shipping Line added successfully", "success");
      }
      handleClose();
      fetchShippingLines();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save shipping line", "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this shipping line?")) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_STRING}/delete-shipping-line/${id}`);
        handleSnackbar("Shipping Line deleted successfully", "success");
        fetchShippingLines();
      } catch (error) {
        handleSnackbar("Failed to delete shipping line", "error");
      }
    }
  };

  const handleEdit = (line) => {
    setEditingId(line._id);
    setFormData({
      name: line.name,
      address: line.address || "",
      city: line.city || "",
      state: line.state || "",
      country: line.country || "",
      pincode: line.pincode || "",
      gst: line.gst || "",
      tds: line.tds || "",
      pan: line.pan || "",
      active: line.active || "Yes",
      branches: line.branches || []
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
      gst: "",
      tds: "",
      pan: "",
      active: "Yes",
      branches: []
    });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredLines = shippingLines.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.gst && l.gst.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (l.pan && l.pan.toLowerCase().includes(searchTerm.toLowerCase()))
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
        <Typography color="text.primary">Shipping Lines</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Shipping Lines Directory</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Add Shipping Line
        </Button>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name, GST or PAN..."
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
          <Table stickyHeader sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Address & Location</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>GST / PAN / TDS</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Active</TableCell>
                <TableCell align="center" sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLines.map((line, index) => (
                <TableRow key={index} hover>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{line.address}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {line.city ? `${line.city}, ` : ""}{line.state ? `${line.state}, ` : ""}{line.country} {line.pincode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">GST: {line.gst || "N/A"}</Typography>
                    <Typography variant="caption" display="block">PAN: {line.pan || "N/A"}</Typography>
                    <Typography variant="caption" display="block">TDS: {line.tds || "N/A"}</Typography>
                  </TableCell>
                  <TableCell>{line.active}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit(line)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(line._id)} color="error">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLines.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ p: 4 }}>
                      No shipping lines found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? "Edit Shipping Line" : "Add New Shipping Line"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Shipping Line Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="GST Number"
              value={formData.gst}
              onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
            />
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              sx={{ gridColumn: 'span 2' }}
            />
            <TextField
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <TextField
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <TextField
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <TextField
              label="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
            <TextField
              label="PAN Number"
              value={formData.pan}
              onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
            />
            <TextField
              label="TDS"
              value={formData.tds}
              onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
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

            <Box sx={{ gridColumn: 'span 2', mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" /> Manage Branches ({formData.branches.length})
              </Typography>
              
              {formData.branches.map((branch, index) => (
                <Accordion key={index} elevation={0} sx={{ border: '1px solid #e0e0e0', mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {branch.branchName || `Branch ${index + 1}`} 
                      {branch.city ? ` - ${branch.city}` : ""}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, position: 'relative' }}>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => removeBranch(index)}
                        sx={{ position: 'absolute', right: -10, top: -45 }}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                      
                      <TextField 
                        label="Branch Name" 
                        fullWidth 
                        size="small"
                        value={branch.branchName} 
                        onChange={(e) => handleBranchChange(index, "branchName", e.target.value)} 
                      />
                      <TextField 
                        label="GST" 
                        fullWidth 
                        size="small"
                        value={branch.gst} 
                        onChange={(e) => handleBranchChange(index, "gst", e.target.value.toUpperCase())} 
                      />
                      <TextField 
                        label="Address" 
                        fullWidth 
                        size="small"
                        multiline
                        rows={2}
                        value={branch.address} 
                        onChange={(e) => handleBranchChange(index, "address", e.target.value)} 
                        sx={{ gridColumn: 'span 2' }}
                      />
                      <TextField 
                        label="City" 
                        fullWidth 
                        size="small"
                        value={branch.city} 
                        onChange={(e) => handleBranchChange(index, "city", e.target.value)} 
                      />
                      <TextField 
                        label="State" 
                        fullWidth 
                        size="small"
                        value={branch.state} 
                        onChange={(e) => handleBranchChange(index, "state", e.target.value)} 
                      />
                      <TextField 
                        label="Pincode" 
                        fullWidth 
                        size="small"
                        value={branch.pincode} 
                        onChange={(e) => handleBranchChange(index, "pincode", e.target.value)} 
                      />
                      <TextField 
                        label="Country" 
                        fullWidth 
                        size="small"
                        value={branch.country} 
                        onChange={(e) => handleBranchChange(index, "country", e.target.value)} 
                      />
                      <TextField 
                        label="PAN Card" 
                        fullWidth 
                        size="small"
                        value={branch.pan} 
                        onChange={(e) => handleBranchChange(index, "pan", e.target.value.toUpperCase())} 
                      />
                      <Box sx={{ gridColumn: 'span 2', mt: 1 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>Account Information</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <TextField 
                            label="Bank Name" 
                            fullWidth 
                            size="small"
                            value={branch.bankName} 
                            onChange={(e) => handleBranchChange(index, "bankName", e.target.value)} 
                          />
                          <TextField 
                            label="Account No" 
                            fullWidth 
                            size="small"
                            value={branch.accountNo} 
                            onChange={(e) => handleBranchChange(index, "accountNo", e.target.value)} 
                          />
                          <TextField 
                            label="IFSC Code" 
                            fullWidth 
                            size="small"
                            value={branch.ifsc} 
                            onChange={(e) => handleBranchChange(index, "ifsc", e.target.value)} 
                          />
                          <TextField 
                            label="AD Code" 
                            fullWidth 
                            size="small"
                            value={branch.adCode} 
                            onChange={(e) => handleBranchChange(index, "adCode", e.target.value)} 
                          />
                        </Box>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
              
              <Button 
                startIcon={<AddIcon />} 
                variant="outlined" 
                fullWidth 
                onClick={addBranch}
                sx={{ mt: 1 }}
              >
                Add New Branch
              </Button>
            </Box>
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

export default ShippingLineDirectory;

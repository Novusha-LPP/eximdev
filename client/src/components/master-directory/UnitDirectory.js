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

const UnitDirectory = () => {
  const [units, setUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", pluralUnit: "", code: "", unitType: "Number", active: "Yes", conversionFactor: "", decimal: 0, ediCode: "", numericCode: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-units`);
      setUnits(res.data);
    } catch (error) {
      console.error("Error fetching units:", error);
      handleSnackbar("Failed to fetch units", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
        setLoading(true);
        await axios.post(`${process.env.REACT_APP_API_STRING}/seed-units`);
        handleSnackbar("Initial units seeded successfully", "success");
        fetchUnits();
    } catch (error) {
        handleSnackbar("Failed to seed units", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      handleSnackbar("Name and Code are required", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/update-unit/${editingId}`, formData);
        handleSnackbar("Unit updated successfully", "success");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/add-unit`, formData);
        handleSnackbar("Unit added successfully", "success");
      }
      handleClose();
      fetchUnits();
    } catch (error) {
      handleSnackbar("Failed to save unit", "error");
    }
  };

  const handleEdit = (unit) => {
    setEditingId(unit._id);
    setFormData({
      name: unit.name,
      pluralUnit: unit.pluralUnit || "",
      code: unit.code,
      unitType: unit.unitType || "Number",
      active: unit.active || "Yes",
      conversionFactor: unit.conversionFactor || "",
      decimal: unit.decimal || 0,
      ediCode: unit.ediCode || "",
      numericCode: unit.numericCode || ""
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({ name: "", pluralUnit: "", code: "", unitType: "Number", active: "Yes", conversionFactor: "", decimal: 0, ediCode: "", numericCode: "" });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.unitType.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Typography color="text.primary">Unit Directory</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Unit Directory</Typography>
        <Box>
            {units.length === 0 && (
                <Button variant="outlined" onClick={handleSeed} sx={{ mr: 2 }}>
                    Seed Initial Data
                </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                Add Unit
            </Button>
        </Box>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name, code or type..."
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
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Name</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Code</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Type</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Conversion Factor</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Decimal</Box>
                <Box component="th" sx={{ p: 1.5, textAlign: "left", background: "#f5f5f5", fontWeight: 'bold' }}>Active</Box>
                <Box component="th" sx={{ p: 2, textAlign: "center", background: "#f5f5f5", fontWeight: 'bold' }}>Action</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredUnits.map((unit, index) => (
                <Box component="tr" key={index} sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{unit.name}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{unit.code}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{unit.unitType}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{unit.conversionFactor}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{unit.decimal}</Box>
                  <Box component="td" sx={{ p: 1.5, borderBottom: "1px solid #eee" }}>{unit.active}</Box>
                  <Box component="td" sx={{ p: 1, borderBottom: "1px solid #eee", textAlign: "center" }}>
                    <IconButton size="small" onClick={() => handleEdit(unit)} color="primary">
                        <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {filteredUnits.length === 0 && (
                <Box component="tr">
                    <Box component="td" colSpan={7} sx={{ p: 4, textAlign: "center" }}>
                      No units found matching your search.
                    </Box>
                </Box>
              )}
            </Box>
          </Table>
        )}
      </Paper>

      {/* Unit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? "Edit Unit" : "Add New Unit"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, pt: 1 }}>
            <TextField
              label="Unit Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Plural Unit"
              value={formData.pluralUnit}
              onChange={(e) => setFormData({ ...formData, pluralUnit: e.target.value })}
            />
            <TextField
              label="Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
            <TextField
              label="Unit Type"
              value={formData.unitType}
              onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
              placeholder="e.g. Number, Weight, Volume"
            />
            <TextField
              label="Conversion Factor"
              value={formData.conversionFactor}
              onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
            />
            <TextField
              type="number"
              label="Decimal Points"
              value={formData.decimal}
              onChange={(e) => setFormData({ ...formData, decimal: parseInt(e.target.value) || 0 })}
            />
            <TextField
              label="EDI Code"
              value={formData.ediCode}
              onChange={(e) => setFormData({ ...formData, ediCode: e.target.value })}
            />
            <TextField
              label="Numeric Code"
              value={formData.numericCode}
              onChange={(e) => setFormData({ ...formData, numericCode: e.target.value })}
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

export default UnitDirectory;

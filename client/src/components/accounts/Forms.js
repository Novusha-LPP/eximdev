// Forms.js - CORRECTED VERSION
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardHeader,
  Stack,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  Fade,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Visibility,
  Business,
  Assignment,
  Settings,
  Category,
  Home,
  ElectricalServices,
  LocalShipping,
  Restaurant,
  FitnessCenter,
  School,
  LocalHospital,
  FilterList,
} from "@mui/icons-material";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";

const Forms = () => {
  const [masterTypes, setMasterTypes] = useState([]);
  const [masterEntries, setMasterEntries] = useState([]);
  const [selectedMasterType, setSelectedMasterType] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openMasterTypeDialog, setOpenMasterTypeDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [viewEntry, setViewEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Master Type Management
  const [masterTypeFormData, setMasterTypeFormData] = useState({
    name: "",
    icon: "Business",
  });
  const [editingMasterType, setEditingMasterType] = useState(null);

  // Available icons
  const availableIcons = [
    { name: "Business", icon: <Business /> },
    { name: "Assignment", icon: <Assignment /> },
    { name: "Category", icon: <Category /> },
    { name: "Home", icon: <Home /> },
    { name: "ElectricalServices", icon: <ElectricalServices /> },
    { name: "LocalShipping", icon: <LocalShipping /> },
    { name: "Restaurant", icon: <Restaurant /> },
    { name: "FitnessCenter", icon: <FitnessCenter /> },
    { name: "School", icon: <School /> },
    { name: "LocalHospital", icon: <LocalHospital /> },
  ];

  // Form state
  const [formData, setFormData] = useState({
    masterType: "",
    companyName: "",
    address: "",
    phoneNumber: "",
    email: "",
    gstNumber: "",
    firstDueDate: "",
    amount: "",
    description: "",
    documents: [],
  });

  // Generate year options (current year and previous 10 years)
// Replace the existing getYearOptions function with this dynamic version:

// Generate dynamic year options based on actual entries
const getYearOptions = () => {
  if (masterEntries.length === 0) {
    // If no entries, show current year and previous 5 years
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  }

  // Extract all unique years from entries
  const yearsSet = new Set();
  masterEntries.forEach((entry) => {
    if (entry.defaultFields && entry.defaultFields.dueDate) {
      const year = new Date(entry.defaultFields.dueDate).getFullYear();
      yearsSet.add(year);
    }
  });

  // Convert to sorted array (newest first)
  const years = Array.from(yearsSet).sort((a, b) => b - a);
  
  // If no years found, return current year
  if (years.length === 0) {
    return [new Date().getFullYear()];
  }

  return years;
};

// Add this useEffect after the existing ones:
useEffect(() => {
  // Auto-select current year or first available year
  const availableYears = getYearOptions();
  const currentYear = new Date().getFullYear();
  
  // If current year exists in available years, select it
  if (availableYears.includes(currentYear)) {
    setSelectedYear(currentYear);
  } else if (availableYears.length > 0) {
    // Otherwise select the first (most recent) available year
    setSelectedYear(availableYears[0]);
  }
}, [masterEntries]);


  // Snackbar helpers
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const hideSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Date formatting function
  const formatDate = (dateString) => {
    const options = { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };

  const formatDateTime = (dateString) => {
    const options = { 
      day: "numeric", 
      month: "long", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    };
    return new Date(dateString).toLocaleDateString("en-GB", options);
  };

  useEffect(() => {
    loadMasterTypes();
    loadMasterEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [selectedMasterType, selectedYear, masterEntries]);

  // ==================== API CALLS ====================
  
  const loadMasterTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/master-types`
      );
      const data = await response.json();
      setMasterTypes(data);
    } catch (error) {
      console.error("Error fetching master types:", error);
      showSnackbar("Failed to load master types", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMasterEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/masters`
      );
      const data = await response.json();
      setMasterEntries(data);
    } catch (error) {
      console.error("Error fetching master entries:", error);
      showSnackbar("Failed to load entries", "error");
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = masterEntries;
    
    // Filter by master type
    if (selectedMasterType) {
      filtered = filtered.filter(
        (entry) => entry.masterTypeName === selectedMasterType
      );
    }
    
    // Filter by year
    filtered = filtered.filter((entry) => {
      const entryYear = new Date(entry.defaultFields.dueDate).getFullYear();
      return entryYear === selectedYear;
    });
    
    setFilteredEntries(filtered);
  };

  // ==================== MASTER TYPE MANAGEMENT ====================

  const handleOpenMasterTypeDialog = () => {
    setOpenMasterTypeDialog(true);
    setEditingMasterType(null);
    setMasterTypeFormData({ name: "", icon: "Business" });
  };

  const handleCloseMasterTypeDialog = () => {
    setOpenMasterTypeDialog(false);
    setEditingMasterType(null);
    setMasterTypeFormData({ name: "", icon: "Business" });
  };

  const handleMasterTypeInputChange = (e) => {
    const { name, value } = e.target;
    setMasterTypeFormData({ ...masterTypeFormData, [name]: value });
  };

  const handleAddMasterType = async () => {
    if (!masterTypeFormData.name.trim()) {
      showSnackbar("Please enter a master type name", "warning");
      return;
    }

    try {
      setLoading(true);
      const url = editingMasterType
        ? `${process.env.REACT_APP_API_STRING}/master-types/${editingMasterType._id}`
        : `${process.env.REACT_APP_API_STRING}/master-types`;
      
      const method = editingMasterType ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(masterTypeFormData),
      });

      if (response.ok) {
        await loadMasterTypes();
        handleCloseMasterTypeDialog();
        showSnackbar(
          editingMasterType 
            ? "Master type updated successfully" 
            : "Master type added successfully", 
          "success"
        );
      } else {
        const error = await response.json();
        showSnackbar(error.message || "Failed to save master type", "error");
      }
    } catch (error) {
      console.error("Error saving master type:", error);
      showSnackbar("Failed to save master type", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMasterType = (type) => {
    setEditingMasterType(type);
    setMasterTypeFormData({
      name: type.name,
      icon: type.icon || "Business",
    });
    setOpenMasterTypeDialog(true);
  };

  const confirmDeleteMasterType = (id) => {
    setDeleteItem({ type: "masterType", id });
    setOpenConfirmDialog(true);
  };

  const handleDeleteMasterType = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/master-types/${deleteItem.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await loadMasterTypes();
        showSnackbar("Master type deleted successfully", "success");
      } else {
        const error = await response.json();
        showSnackbar(error.message || "Failed to delete master type", "error");
      }
    } catch (error) {
      console.error("Error deleting master type:", error);
      showSnackbar("Failed to delete master type", "error");
    } finally {
      setLoading(false);
      setOpenConfirmDialog(false);
      setDeleteItem(null);
    }
  };

  // ==================== ENTRY MANAGEMENT ====================

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setIsEditing(false);
    resetForm();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      masterType: "",
      companyName: "",
      address: "",
      phoneNumber: "",
      email: "",
      gstNumber: "",
      firstDueDate: "",
      amount: "",
      description: "",
      documents: [],
    });
    setCurrentEntry(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileUpload = (files) => {
    setFormData({ ...formData, documents: files });
  };

  const handleSubmit = async () => {
    if (!formData.companyName || !formData.firstDueDate || !formData.masterType) {
      showSnackbar("Please fill in required fields: Master Type, Company Name and First Due Date", "warning");
      return;
    }

    try {
      setLoading(true);
      const url = isEditing
        ? `${process.env.REACT_APP_API_STRING}/masters/${currentEntry._id}`
        : `${process.env.REACT_APP_API_STRING}/masters`;
      
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        masterType: formData.masterType,
        defaultFields: {
          companyName: formData.companyName,
          address: formData.address,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          gstNumber: formData.gstNumber,
          dueDate: formData.firstDueDate,
          amount: formData.amount,
          description: formData.description,
          documents: formData.documents,
        }
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadMasterEntries();
        handleCloseDialog();
        showSnackbar(
          isEditing ? "Entry updated successfully" : "Entry created successfully", 
          "success"
        );
      } else {
        const error = await response.json();
        showSnackbar(error.message || "Failed to save entry", "error");
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      showSnackbar("Failed to save entry", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    if (entry.defaultFields.isPaid) {
      showSnackbar("Cannot edit paid entries!", "warning");
      return;
    }

    setCurrentEntry(entry);
    setFormData({
      masterType: entry.masterTypeName,
      companyName: entry.defaultFields.companyName,
      address: entry.defaultFields.address || "",
      phoneNumber: entry.defaultFields.phoneNumber || "",
      email: entry.defaultFields.email || "",
      gstNumber: entry.defaultFields.gstNumber || "",
      firstDueDate: entry.defaultFields.dueDate ? 
        new Date(entry.defaultFields.dueDate).toISOString().split("T")[0] : "",
      amount: entry.defaultFields.amount || "",
      description: entry.defaultFields.description || "",
      documents: entry.defaultFields.documents || [],
    });
    setIsEditing(true);
    setOpenDialog(true);
  };

  const confirmDeleteEntry = (id) => {
    setDeleteItem({ type: "entry", id });
    setOpenConfirmDialog(true);
  };

  const handleDeleteEntry = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/masters/${deleteItem.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        await loadMasterEntries();
        showSnackbar("Entry deleted successfully", "success");
      } else {
        const error = await response.json();
        showSnackbar(error.message || "Failed to delete entry", "error");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      showSnackbar("Failed to delete entry", "error");
    } finally {
      setLoading(false);
      setOpenConfirmDialog(false);
      setDeleteItem(null);
    }
  };

  const handleView = (entry) => {
    setViewEntry(entry);
    setOpenViewDialog(true);
  };

  const handlePaymentToggle = async (entry) => {
    if (entry.defaultFields.isPaid) {
      showSnackbar("Payment already recorded!", "info");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/masters/${entry._id}/mark-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.ok) {
        await loadMasterEntries();
        showSnackbar("Payment marked successfully and next month entry created!", "success");
      } else {
        const error = await response.json();
        showSnackbar(error.message || "Failed to mark payment", "error");
      }
    } catch (error) {
      console.error("Error marking payment:", error);
      showSnackbar("Failed to mark payment", "error");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Added proper null checking for isPaid
  const getPaymentStatus = (entry) => {
    // Check if isPaid exists and is true
    if (entry.defaultFields && entry.defaultFields.isPaid === true) {
      return "paid";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    const dueDate = new Date(entry.defaultFields.dueDate);
    dueDate.setHours(0, 0, 0, 0); // Reset time to start of day

    if (dueDate < today) return "overdue";
    return "unpaid";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "overdue":
        return "error";
      case "unpaid":
        return "warning";
      default:
        return "default";
    }
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      Business: <Business />,
      Assignment: <Assignment />,
      Category: <Category />,
      Home: <Home />,
      ElectricalServices: <ElectricalServices />,
      LocalShipping: <LocalShipping />,
      Restaurant: <Restaurant />,
      FitnessCenter: <FitnessCenter />,
      School: <School />,
      LocalHospital: <LocalHospital />,
    };
    return iconMap[iconName] || <Business />;
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Card 
        sx={{ 
          mb: 2, 
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid #f0f0f0" 
        }}
      >
        <CardHeader
          title={
            <Typography variant="h5" sx={{ fontWeight: 600, color: "#1976d2" }}>
              Master Entries Management
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              Manage recurring payment entries with automatic monthly generation
            </Typography>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={handleOpenMasterTypeDialog}
                sx={{ minWidth: "auto" }}
              >
                Types
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={handleOpenDialog}
              >
                New Entry
              </Button>
            </Stack>
          }
          sx={{ pb: 1 }}
        />
      </Card>

      {/* Compact Filter Section */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 2, 
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          border: "1px solid #f0f0f0"
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Master Type</InputLabel>
              <Select
                value={selectedMasterType}
                onChange={(e) => setSelectedMasterType(e.target.value)}
                label="Master Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {masterTypes.map((type) => (
                  <MenuItem key={type._id} value={type.name}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getIconComponent(type.icon)}
                      <span>{type.name}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                label="Year"
              >
                {getYearOptions().map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterList color="action" />
              <Typography variant="body2" color="text.secondary">
                {filteredEntries.length} entries found
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Compact Entries Table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid #f0f0f0"
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
              <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Payment Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No entries found for {selectedYear}
                    {selectedMasterType && ` in ${selectedMasterType}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create your first entry to get started!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const status = getPaymentStatus(entry);
                // FIXED: Proper isPaid checking with default to false
                const isPaid = entry.defaultFields?.isPaid === true;
                
                return (
                  <TableRow
                    key={entry._id}
                    sx={{
                      backgroundColor: isPaid ? "#f8f9fa" : "inherit",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {entry.defaultFields.companyName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getIconComponent(
                          masterTypes.find((t) => t.name === entry.masterTypeName)
                            ?.icon
                        )}
                        label={entry.masterTypeName}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(entry.defaultFields.dueDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        ₹{entry.defaultFields.amount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={status.toUpperCase()}
                        color={getStatusColor(status)}
                        size="small"
                        sx={{ fontSize: "0.75rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={isPaid}
                        onChange={() => handlePaymentToggle(entry)}
                        disabled={isPaid}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {entry.defaultFields.paymentDate
                          ? formatDateTime(entry.defaultFields.paymentDate)
                          : "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View">
                          <IconButton
                            size="small"
                            onClick={() => handleView(entry)}
                            color="primary"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(entry)}
                            color="primary"
                            disabled={isPaid}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => confirmDeleteEntry(entry._id)}
                            color="error"
                            disabled={isPaid}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert 
          onClose={hideSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        TransitionComponent={Fade}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteItem?.type === "masterType" ? "master type" : "entry"}? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
          <Button 
            onClick={deleteItem?.type === "masterType" ? handleDeleteMasterType : handleDeleteEntry}
            color="error" 
            variant="contained"
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Master Type Management Dialog */}
      <Dialog
        open={openMasterTypeDialog}
        onClose={handleCloseMasterTypeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingMasterType ? "Edit Master Type" : "Manage Master Types"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Add/Edit Form */}
            <Paper sx={{ p: 2, mb: 2, backgroundColor: "#f8f9fa" }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                {editingMasterType ? "Edit Type" : "Add New Type"}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Type Name *"
                    name="name"
                    value={masterTypeFormData.name}
                    onChange={handleMasterTypeInputChange}
                    required
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Icon</InputLabel>
                    <Select
                      name="icon"
                      value={masterTypeFormData.icon}
                      onChange={handleMasterTypeInputChange}
                      label="Icon"
                    >
                      {availableIcons.map((iconOption) => (
                        <MenuItem key={iconOption.name} value={iconOption.name}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {iconOption.icon}
                            <span>{iconOption.name}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddMasterType}
                    disabled={loading}
                    size="small"
                  >
                    {editingMasterType ? "Update Type" : "Add Type"}
                  </Button>
                  {editingMasterType && (
                    <Button
                      fullWidth
                      sx={{ mt: 1 }}
                      onClick={() => {
                        setEditingMasterType(null);
                        setMasterTypeFormData({ name: "", icon: "Business" });
                      }}
                      size="small"
                    >
                      Cancel Edit
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* Existing Types List */}
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Existing Master Types ({masterTypes.length})
            </Typography>
            <List dense>
              {masterTypes.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No master types found. Add your first type!" />
                </ListItem>
              ) : (
                masterTypes.map((type, index) => (
                  <React.Fragment key={type._id}>
                    <ListItem>
                      <Stack direction="row" spacing={2} alignItems="center">
                        {getIconComponent(type.icon)}
                        <ListItemText primary={type.name} />
                      </Stack>
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleEditMasterType(type)}
                          color="primary"
                          size="small"
                          sx={{ mr: 0.5 }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => confirmDeleteMasterType(type._id)}
                          color="error"
                          size="small"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < masterTypes.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMasterTypeDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Entry Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? "Edit Entry" : "Create New Entry"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Master Type *</InputLabel>
                <Select
                  name="masterType"
                  value={formData.masterType}
                  onChange={handleInputChange}
                  label="Master Type *"
                  disabled={isEditing}
                >
                  {masterTypes.map((type) => (
                    <MenuItem key={type._id} value={type.name}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {getIconComponent(type.icon)}
                        <span>{type.name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name *"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                required
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                multiline
                rows={2}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="GST Number"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="First Due Date *"
                name="firstDueDate"
                type="date"
                value={formData.firstDueDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <FileUpload
                onFilesSelected={handleFileUpload}
                existingFiles={formData.documents}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Entry Details</DialogTitle>
        <DialogContent>
          {viewEntry && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {viewEntry.defaultFields.companyName}
                  </Typography>
                  <Chip
                    label={getPaymentStatus(viewEntry).toUpperCase()}
                    color={getStatusColor(getPaymentStatus(viewEntry))}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Master Type
                  </Typography>
                  <Typography variant="body1">
                    {viewEntry.masterTypeName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(viewEntry.defaultFields.dueDate)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    ₹{viewEntry.defaultFields.amount}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Typography variant="body1">
                    {viewEntry.defaultFields.isPaid ? "Paid" : "Unpaid"}
                  </Typography>
                </Grid>
                {viewEntry.defaultFields.paymentDate && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Date & Time
                    </Typography>
                    <Typography variant="body1">
                      {formatDateTime(viewEntry.defaultFields.paymentDate)}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {viewEntry.defaultFields.address || "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">
                    {viewEntry.defaultFields.phoneNumber || "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {viewEntry.defaultFields.email || "N/A"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {viewEntry.defaultFields.description || "N/A"}
                  </Typography>
                </Grid>
                {viewEntry.defaultFields.documents && viewEntry.defaultFields.documents.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Documents
                    </Typography>
                    <ImagePreview images={viewEntry.defaultFields.documents} />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Forms;

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Tooltip,
  Chip,
  FormControlLabel,
  Switch,
  Select,
} from "@mui/material";
import ComputerIcon from "@mui/icons-material/Computer";
import LaptopMacIcon from "@mui/icons-material/LaptopMac";
import MonitorIcon from "@mui/icons-material/Monitor";
import PrintIcon from "@mui/icons-material/Print";
import RouterIcon from "@mui/icons-material/Router";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import SimCardIcon from "@mui/icons-material/SimCard";
import StorageIcon from "@mui/icons-material/Storage";
import CableIcon from "@mui/icons-material/Cable";
import DevicesOtherIcon from "@mui/icons-material/DevicesOther";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import HistoryIcon from "@mui/icons-material/History";

// Asset categories
const ASSET_CATEGORIES = [
  "Computers",
  "Laptops",
  "Monitors",
  "Printers",
  "Network Devices",
  "Software Inventory",
  "Phones",
  "SIM Cards",
  "Racks",
  "Cables",
  "Peripheral Devices",
  "Unmanaged Assets"
];

// Asset features
const ASSET_FEATURES = [
  "Asset Tag Number",
  "Serial Number",
  "Model & Manufacturer",
  "Purchase Date",
  "Warranty Details",
  "Asset Assignment",
  "Asset Location",
  "Asset Status",
  "Asset History"
];

// Asset statuses
const ASSET_STATUSES = [
  "Active",
  "In Use",
  "Available",
  "Under Maintenance",
  "Retired",
  "Disposed"
];

// Asset locations
const ASSET_LOCATIONS = [
  "Office 1 - Floor 1",
  "Office 1 - Floor 2",
  "Office 2 - Floor 1",
  "Office 2 - Floor 2",
  "Server Room",
  "Warehouse",
  "Remote Site 1",
  "Remote Site 2"
];

export default function AssetManagement() {
  const [activeTab, setActiveTab] = useState("modules");
  const [assetModule, setAssetModule] = useState("Computers");
  const [assetFeature, setAssetFeature] = useState("Asset Tag Number");
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    category: "Computers",
    tag_number: "",
    serial_number: "",
    model: "",
    manufacturer: "",
    purchase_date: "",
    warranty_expiry: "",
    assigned_to: "",
    location: "",
    status: "Active",
    description: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  // Filter assets based on search term and filters
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.tag_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || asset.status === filterStatus;
    const matchesLocation = !filterLocation || asset.location === filterLocation;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  // Fetch assets based on category
  const fetchAssets = (category) => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockAssets = [
        {
          id: 1,
          category,
          tag_number: "TAG-001",
          serial_number: "SN123456",
          model: "Dell OptiPlex 3050",
          manufacturer: "Dell",
          purchase_date: "2022-01-15",
          warranty_expiry: "2025-01-14",
          assigned_to: "John Doe",
          location: "Office 1 - Floor 1",
          status: "Active",
          description: "Office computer for accounting department"
        },
        {
          id: 2,
          category,
          tag_number: "TAG-002",
          serial_number: "SN789012",
          model: "HP EliteDesk 800",
          manufacturer: "HP",
          purchase_date: "2022-03-22",
          warranty_expiry: "2025-03-21",
          assigned_to: "Jane Smith",
          location: "Office 1 - Floor 2",
          status: "In Use",
          description: "Development workstation"
        }
      ];
      setAssets(mockAssets);
      setLoading(false);
    }, 500);
  };

  // Handle tab change for modules
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === "modules") {
      fetchAssets(assetModule);
    }
  };

  // Handle module change
  const handleModuleChange = (event, newValue) => {
    setAssetModule(newValue);
    fetchAssets(newValue);
  };

  // Handle feature change
  const handleFeatureChange = (event, newValue) => {
    setAssetFeature(newValue);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    fetchAssets(newValue);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open modal for adding/editing asset
  const handleOpenModal = (asset = null) => {
    if (asset) {
      setEditId(asset.id);
      setForm({
        category: asset.category,
        tag_number: asset.tag_number,
        serial_number: asset.serial_number,
        model: asset.model,
        manufacturer: asset.manufacturer,
        purchase_date: asset.purchase_date,
        warranty_expiry: asset.warranty_expiry,
        assigned_to: asset.assigned_to,
        location: asset.location,
        status: asset.status,
        description: asset.description,
      });
    } else {
      setEditId(null);
      setForm({
        category: activeTab,
        tag_number: "",
        serial_number: "",
        model: "",
        manufacturer: "",
        purchase_date: "",
        warranty_expiry: "",
        assigned_to: "",
        location: "",
        status: "Active",
        description: "",
      });
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save asset
  const handleSaveAsset = () => {
    if (!form.tag_number || !form.serial_number) {
      toast.error("Tag Number and Serial Number are required");
      return;
    }

    if (editId) {
      // Update existing asset
      setAssets(prev => prev.map(asset => 
        asset.id === editId ? { ...asset, ...form } : asset
      ));
      toast.success("Asset updated successfully");
    } else {
      // Add new asset
      const newAsset = {
        id: Date.now(),
        ...form
      };
      setAssets(prev => [...prev, newAsset]);
      toast.success("Asset added successfully");
    }

    handleCloseModal();
  };

  // Delete asset
  const handleDeleteAsset = (id) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      setAssets(prev => prev.filter(asset => asset.id !== id));
      toast.success("Asset deleted successfully");
    }
  };

  // Initialize with computers data
  useEffect(() => {
    fetchAssets("Computers");
  }, []);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "success";
      case "In Use":
        return "info";
      case "Available":
        return "default";
      case "Under Maintenance":
        return "warning";
      case "Retired":
        return "secondary";
      case "Disposed":
        return "error";
      default:
        return "default";
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case "Computers":
        return <ComputerIcon />;
      case "Laptops":
        return <LaptopMacIcon />;
      case "Monitors":
        return <MonitorIcon />;
      case "Printers":
        return <PrintIcon />;
      case "Network Devices":
        return <RouterIcon />;
      case "Phones":
        return <PhoneAndroidIcon />;
      case "SIM Cards":
        return <SimCardIcon />;
      case "Software Inventory":
        return <Inventory2Icon />;
      case "Racks":
        return <StorageIcon />;
      case "Cables":
        return <CableIcon />;
      default:
        return <DevicesOtherIcon />;
    }
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="asset categories">
          <Tab label="Modules" value="modules" />
          <Tab label="Features" value="features" />
        </Tabs>
      </Box>

      <Box mt={2}>
        {activeTab === "modules" && (
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
            <Tabs value={assetModule} onChange={(e, newValue) => setAssetModule(newValue)} aria-label="asset modules">
              {ASSET_CATEGORIES.map(category => (
                <Tab key={category} value={category} label={category} icon={getCategoryIcon(category)} iconPosition="start" />
              ))}
            </Tabs>
          </Box>
        )}

        {activeTab === "features" && (
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
            <Tabs value={assetFeature} onChange={(e, newValue) => setAssetFeature(newValue)} aria-label="asset features">
              {ASSET_FEATURES.map(feature => (
                <Tab key={feature} value={feature} label={feature} />
              ))}
            </Tabs>
          </Box>
        )}

        <Box mt={2}>
        {/* Filters and Search */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Search Assets"
                  size="small"
                  fullWidth
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Select
                  label="Status"
                  size="small"
                  fullWidth
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {ASSET_STATUSES.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={3}>
                <Select
                  label="Location"
                  size="small"
                  fullWidth
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                >
                  <MenuItem value="">All Locations</MenuItem>
                  {ASSET_LOCATIONS.map(location => (
                    <MenuItem key={location} value={location}>{location}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={() => handleOpenModal()}
                  fullWidth
                >
                  Add Asset
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card>
          <CardContent>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tag Number</TableCell>
                      <TableCell>Serial Number</TableCell>
                      <TableCell>Model</TableCell>
                      <TableCell>Manufacturer</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No assets found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssets.map(asset => (
                        <TableRow key={asset.id}>
                          <TableCell>{asset.tag_number}</TableCell>
                          <TableCell>{asset.serial_number}</TableCell>
                          <TableCell>{asset.model}</TableCell>
                          <TableCell>{asset.manufacturer}</TableCell>
                          <TableCell>
                            <Chip label={asset.status} color={getStatusColor(asset.status)} size="small" />
                          </TableCell>
                          <TableCell>{asset.location}</TableCell>
                          <TableCell>{asset.assigned_to || "Unassigned"}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenModal(asset)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteAsset(asset.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Asset Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Asset" : "Add Asset"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Asset Details</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Category"
                size="small"
                fullWidth
                value={form.category}
                onChange={handleInputChange}
                name="category"
                disabled={!!editId}
              >
                {ASSET_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Asset Tag Number"
                required
                size="small"
                fullWidth
                value={form.tag_number}
                onChange={handleInputChange}
                name="tag_number"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Serial Number"
                required
                size="small"
                fullWidth
                value={form.serial_number}
                onChange={handleInputChange}
                name="serial_number"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Model"
                size="small"
                fullWidth
                value={form.model}
                onChange={handleInputChange}
                name="model"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Manufacturer"
                size="small"
                fullWidth
                value={form.manufacturer}
                onChange={handleInputChange}
                name="manufacturer"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Purchase Date"
                type="date"
                size="small"
                fullWidth
                value={form.purchase_date}
                onChange={handleInputChange}
                name="purchase_date"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Warranty Expiry"
                type="date"
                size="small"
                fullWidth
                value={form.warranty_expiry}
                onChange={handleInputChange}
                name="warranty_expiry"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Assigned To"
                size="small"
                fullWidth
                value={form.assigned_to}
                onChange={handleInputChange}
                name="assigned_to"
              />
            </Grid>
            <Grid item xs={6}>
              <Select
                label="Location"
                size="small"
                fullWidth
                value={form.location}
                onChange={handleInputChange}
                name="location"
              >
                {ASSET_LOCATIONS.map(location => (
                  <MenuItem key={location} value={location}>{location}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={6}>
              <Select
                label="Status"
                size="small"
                fullWidth
                value={form.status}
                onChange={handleInputChange}
                name="status"
              >
                {ASSET_STATUSES.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={form.description}
                onChange={handleInputChange}
                name="description"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSaveAsset} variant="contained" disabled={!form.tag_number || !form.serial_number}>
            {editId ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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

  // Handle tab change
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
        category: assetModule,
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

  // Get feature description
  const getFeatureDescription = (feature) => {
    switch (feature) {
      case "Asset Tag Number":
        return "Unique identifier for each asset";
      case "Serial Number":
        return "Manufacturer's serial number for tracking";
      case "Model & Manufacturer":
        return "Product model and manufacturer details";
      case "Purchase Date":
        return "Date when the asset was purchased";
      case "Warranty Details":
        return "Warranty period and coverage information";
      case "Asset Assignment":
        return "Details of who the asset is assigned to";
      case "Asset Location":
        return "Physical location of the asset";
      case "Asset Status":
        return "Current status of the asset";
      case "Asset History":
        return "Historical record of asset changes and events";
      default:
        return "";
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <ComputerIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Asset Management
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="asset categories">
          <Tab label="Modules" value="modules" />
          <Tab label="Features" value="features" />
        </Tabs>
      </Box>

      <Box mt={2}>
        {activeTab === "modules" && (
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
            <Tabs value={assetModule} onChange={handleModuleChange} aria-label="asset modules">
              {ASSET_CATEGORIES.map(category => (
                <Tab key={category} value={category} label={category} icon={getCategoryIcon(category)} iconPosition="start" />
              ))}
            </Tabs>
          </Box>
        )}

        {activeTab === "features" && (
          <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
            <Tabs value={assetFeature} onChange={handleFeatureChange} aria-label="asset features">
              {ASSET_FEATURES.map(feature => (
                <Tab key={feature} value={feature} label={feature} />
              ))}
            </Tabs>
          </Box>
        )}

        <Box mt={2}>
          {/* Filters and Search */}
          {activeTab === "modules" && (
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
          )}

          {/* Assets Table */}
          {activeTab === "modules" && (
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
                          filteredAssets.map((asset) => (
                            <TableRow key={asset.id}>
                              <TableCell>{asset.tag_number}</TableCell>
                              <TableCell>{asset.serial_number}</TableCell>
                              <TableCell>{asset.model}</TableCell>
                              <TableCell>{asset.manufacturer}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={asset.status} 
                                  color={getStatusColor(asset.status)} 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>{asset.location}</TableCell>
                              <TableCell>{asset.assigned_to}</TableCell>
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
          )}

          {/* Feature Details */}
          {activeTab === "features" && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{assetFeature}</Typography>
                <Typography variant="body1" mb={3}>{getFeatureDescription(assetFeature)}</Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Implementation Details</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assetFeature === "Asset Tag Number" && (
                        "Implement a unique tagging system for all assets. Use barcode or QR codes for easy scanning and tracking."
                      )}
                      {assetFeature === "Serial Number" && (
                        "Record the manufacturer's serial number for warranty validation and manufacturer tracking."
                      )}
                      {assetFeature === "Model & Manufacturer" && (
                        "Maintain detailed information about the asset model and manufacturer for compatibility and support purposes."
                      )}
                      {assetFeature === "Purchase Date" && (
                        "Track the purchase date for depreciation calculations and warranty validation."
                      )}
                      {assetFeature === "Warranty Details" && (
                        "Record warranty period, coverage details, and warranty provider for maintenance and support planning."
                      )}
                      {assetFeature === "Asset Assignment" && (
                        "Track which employee or department the asset is assigned to for accountability and resource management."
                      )}
                      {assetFeature === "Asset Location" && (
                        "Maintain accurate location information for all assets, including building, floor, and room details."
                      )}
                      {assetFeature === "Asset Status" && (
                        "Track the current status of each asset (Active, In Use, Available, Under Maintenance, Retired, Disposed)."
                      )}
                      {assetFeature === "Asset History" && (
                        "Maintain a complete history of all asset-related events, including assignments, transfers, and maintenance."
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>Benefits</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assetFeature === "Asset Tag Number" && (
                        "Provides a unique identifier for each asset, making it easier to track and manage assets throughout their lifecycle."
                      )}
                      {assetFeature === "Serial Number" && (
                        "Enables warranty validation and manufacturer support by providing the original serial number."
                      )}
                      {assetFeature === "Model & Manufacturer" && (
                        "Helps in identifying compatible parts, software, and accessories, and determining support options."
                      )}
                      {assetFeature === "Purchase Date" && (
                        "Essential for calculating depreciation, warranty expiration, and asset lifecycle management."
                      )}
                      {assetFeature === "Warranty Details" && (
                        "Ensures timely maintenance and repairs within warranty period, reducing unexpected costs."
                      )}
                      {assetFeature === "Asset Assignment" && (
                        "Improves accountability and resource utilization by tracking who is using each asset."
                      )}
                      {assetFeature === "Asset Location" && (
                        "Helps in locating assets quickly, especially in large organizations with multiple locations."
                      )}
                      {assetFeature === "Asset Status" && (
                        "Provides a clear view of asset availability and condition for better resource planning."
                      )}
                      {assetFeature === "Asset History" && (
                        "Provides a complete audit trail of asset events, supporting compliance and decision-making."
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Asset Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Category"
                name="category"
                value={form.category}
                onChange={handleInputChange}
                fullWidth
                select
                disabled={editId}
              >
                {ASSET_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Tag Number"
                name="tag_number"
                value={form.tag_number}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Serial Number"
                name="serial_number"
                value={form.serial_number}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Model"
                name="model"
                value={form.model}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Manufacturer"
                name="manufacturer"
                value={form.manufacturer}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Purchase Date"
                name="purchase_date"
                type="date"
                value={form.purchase_date}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Warranty Expiry"
                name="warranty_expiry"
                type="date"
                value={form.warranty_expiry}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Assigned To"
                name="assigned_to"
                value={form.assigned_to}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={handleInputChange}
                fullWidth
              >
                {ASSET_STATUSES.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Location"
                name="location"
                value={form.location}
                onChange={handleInputChange}
                fullWidth
              >
                {ASSET_LOCATIONS.map(location => (
                  <MenuItem key={location} value={location}>{location}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAsset}>
            {editId ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

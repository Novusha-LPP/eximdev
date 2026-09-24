import React, { useState } from "react";
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
  Tooltip,
  Chip,
  Tabs,
  Tab,
  Select,
} from "@mui/material";
import ComputerIcon from "@mui/icons-material/Computer";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import HistoryIcon from "@mui/icons-material/History";
  EditIcon from "@mui/icons-material/Edit";
  DeleteIcon from "@mui/icons-material/Delete";
  CalendarTodayIcon from "@mui/icons-material/CalendarToday";
  PersonIcon from "@mui/icons-material/Person";
  LocationOnIcon from "@mui/icons-material/LocationOn";

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

export default function AssetDetails({ asset, onUpdate, onDelete }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ ...asset });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open edit modal
  const handleOpenEditModal = () => {
    setEditForm({ ...asset });
    setShowEditModal(true);
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  // Save asset changes
  const handleSaveAsset = () => {
    onUpdate(editForm);
    setShowEditModal(false);
    toast.success("Asset updated successfully");
  };

  // Delete asset
  const handleDeleteAsset = () => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      onDelete(asset.id);
      toast.success("Asset deleted successfully");
    }
  };

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
      case "Software Inventory":
        return <Inventory2Icon />;
      case "Phones":
        return <PhoneAndroidIcon />;
      case "SIM Cards":
        return <SimCardIcon />;
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          {getCategoryIcon(asset.category)}
          <Typography variant="h5" fontWeight={700}>
            {asset.tag_number}
          </Typography>
          <Chip 
            label={asset.status} 
            color={getStatusColor(asset.status)} 
            size="small" 
          />
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => {
            // Navigate to asset history
          }}>
            History
          </Button>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleOpenEditModal}>
            Edit
          </Button>
          <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteAsset}>
            Delete
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="asset-details-tabs">
            <Tab label="Basic Information" value="basic" />
            <Tab label="Assignment & Location" value="assignment" />
            <Tab label="Warranty & Maintenance" value="warranty" />
            <Tab label="History" value="history" />
          </Tabs>

          <Box mt={2}>
            {activeTab === "basic" && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Basic Information</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell width={150}>Category:</TableCell>
                          <TableCell>{asset.category}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Model:</TableCell>
                          <TableCell>{asset.model}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Manufacturer:</TableCell>
                          <TableCell>{asset.manufacturer}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Serial Number:</TableCell>
                          <TableCell>{asset.serial_number}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Purchase Date:</TableCell>
                          <TableCell>{asset.purchase_date}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Description</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {asset.description || "No description available"}
                  </Typography>
                </Grid>
              </Grid>
            )}

            {activeTab === "assignment" && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Assignment</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell width={150}>Assigned To:</TableCell>
                          <TableCell>{asset.assigned_to || "Not assigned"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Status:</TableCell>
                          <TableCell>
                            <Chip 
                              label={asset.status} 
                              color={getStatusColor(asset.status)} 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Location</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell width={150}>Building/Floor:</TableCell>
                          <TableCell>{asset.location || "Not specified"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Room:</TableCell>
                          <TableCell>{asset.room || "Not specified"}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            )}

            {activeTab === "warranty" && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Warranty Information</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell width={150}>Purchase Date:</TableCell>
                          <TableCell>{asset.purchase_date || "Not specified"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Warranty Expiry:</TableCell>
                          <TableCell>{asset.warranty_expiry || "Not specified"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Warranty Status:</TableCell>
                          <TableCell>
                            {asset.warranty_expiry ? (
                              new Date(asset.warranty_expiry) > new Date() ? (
                                <Chip label="Active" color="success" size="small" />
                              ) : (
                                <Chip label="Expired" color="error" size="small" />
                              )
                            ) : (
                              <Chip label="Not specified" color="default" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Maintenance Information</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {asset.maintenance_notes || "No maintenance records available"}
                  </Typography>
                </Grid>
              </Grid>
            )}

            {activeTab === "history" && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>Recent History</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Performed By</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {asset.history?.length > 0 ? (
                        asset.history.map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>{entry.date}</TableCell>
                            <TableCell>
                              <Chip 
                                label={entry.type} 
                                color={getHistoryTypeColor(entry.type)} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell>{entry.performed_by}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No history entries available
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Edit Asset Modal */}
      <Dialog open={showEditModal} onClose={handleCloseEditModal} maxWidth="md" fullWidth>
        <DialogTitle>Edit Asset</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Basic Information</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Category"
                name="category"
                size="small"
                fullWidth
                value={editForm.category}
                onChange={handleInputChange}
              >
                {ASSET_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Model"
                name="model"
                size="small"
                fullWidth
                value={editForm.model}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Manufacturer"
                name="manufacturer"
                size="small"
                fullWidth
                value={editForm.manufacturer}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Serial Number"
                name="serial_number"
                size="small"
                fullWidth
                value={editForm.serial_number}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={editForm.description}
                onChange={handleInputChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Assignment & Location</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Status"
                name="status"
                size="small"
                fullWidth
                value={editForm.status}
                onChange={handleInputChange}
              >
                {ASSET_STATUSES.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Assigned To"
                name="assigned_to"
                size="small"
                fullWidth
                value={editForm.assigned_to}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Location"
                name="location"
                size="small"
                fullWidth
                value={editForm.location}
                onChange={handleInputChange}
              >
                {ASSET_LOCATIONS.map(location => (
                  <MenuItem key={location} value={location}>{location}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Room"
                name="room"
                size="small"
                fullWidth
                value={editForm.room}
                onChange={handleInputChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Warranty Information</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Purchase Date"
                name="purchase_date"
                type="date"
                size="small"
                fullWidth
                value={editForm.purchase_date}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Warranty Expiry"
                name="warranty_expiry"
                type="date"
                size="small"
                fullWidth
                value={editForm.warranty_expiry}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Maintenance Notes"
                name="maintenance_notes"
                size="small"
                fullWidth
                multiline
                minRows={2}
                value={editForm.maintenance_notes}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button onClick={handleSaveAsset} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

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
  KeyIcon from "@mui/icons-material/Key";
  CalendarTodayIcon from "@mui/icons-material/CalendarToday";
  BarChartIcon from "@mui/icons-material/BarChart";
  AssignmentIcon from "@mui/icons-material/Assignment";
  AddIcon from "@mui/icons-material/Add";
  EditIcon from "@mui/icons-material/Edit";
  DeleteIcon from "@mui/icons-material/Delete";
  SearchIcon from "@mui/icons-material/Search";
  DescriptionIcon from "@mui/icons-material/Description";
  VerifiedIcon from "@mui/icons-material/Verified";
  WarningIcon from "@mui/icons-material/Warning";
  ErrorIcon from "@mui/icons-material/Error";

// Software categories
const SOFTWARE_CATEGORIES = [
  "Operating System",
  "Productivity",
  "Security",
  "Development",
  "Database",
  "Other"
];

// License types
const LICENSE_TYPES = [
  "Perpetual",
  "Subscription",
  "Trial",
  "Open Source",
  "Freeware"
];

// License statuses
const LICENSE_STATUSES = [
  "Active",
  "Expiring",
  "Expired",
  "Cancelled"
];

// License usage statuses
const USAGE_STATUSES = [
  { value: "under", label: "Under Utilized", color: "success" },
  { value: "optimal", label: "Optimal", color: "info" },
  { value: "over", label: "Over Utilized", color: "warning" },
  { value: "expired", label: "Expired", color: "error" }
];

export default function SoftwareLicenseManagement() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [softwareInventory, setSoftwareInventory] = useState([]);
  const [licenseKeys, setLicenseKeys] = useState([]);
  const [expiryTracking, setExpiryTracking] = useState([]);
  const [licenseUsageReport, setLicenseUsageReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    version: "",
    category: "Productivity",
    license_type: "Perpetual",
    license_key: "",
    purchase_date: "",
    expiry_date: "",
    quantity: 1,
    assigned_users: 0,
    status: "Active",
    vendor: "",
    description: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Filter software based on search term and filters
  const filteredSoftware = softwareInventory.filter(software => {
    const matchesSearch = 
      software.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      software.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
      software.vendor?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !filterCategory || software.category === filterCategory;
    const matchesStatus = !filterStatus || software.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Fetch data
  const fetchData = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockSoftwareInventory = [
        {
          id: 1,
          name: "Microsoft Office 365",
          version: "2021",
          category: "Productivity",
          license_type: "Subscription",
          quantity: 100,
          assigned_users: 75,
          status: "Active",
          vendor: "Microsoft Corporation",
          description: "Office productivity suite"
        },
        {
          id: 2,
          name: "Adobe Photoshop",
          version: "2023",
          category: "Design",
          license_type: "Perpetual",
          quantity: 25,
          assigned_users: 20,
          status: "Active",
          vendor: "Adobe Inc.",
          description: "Image editing software"
        },
        {
          id: 3,
          name: "Kaspersky Antivirus",
          version: "2023",
          category: "Security",
          license_type: "Subscription",
          quantity: 50,
          assigned_users: 45,
          status: "Expiring",
          vendor: "Kaspersky Lab",
          description: "Antivirus and security software"
        }
      ];

      const mockLicenseKeys = [
        {
          id: 1,
          software: "Microsoft Office 365",
          license_key: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
          type: "Subscription",
          expiry_date: "2024-12-31",
          status: "Active",
          assigned_users: 75,
          total_seats: 100
        },
        {
          id: 2,
          software: "Adobe Photoshop",
          license_key: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
          type: "Perpetual",
          expiry_date: "2025-06-30",
          status: "Active",
          assigned_users: 20,
          total_seats: 25
        },
        {
          id: 3,
          software: "Kaspersky Antivirus",
          license_key: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
          type: "Subscription",
          expiry_date: "2023-09-30",
          status: "Expiring",
          assigned_users: 45,
          total_seats: 50
        }
      ];

      const mockExpiryTracking = [
        {
          id: 1,
          software: "Kaspersky Antivirus",
          expiry_date: "2023-09-30",
          days_remaining: 75,
          status: "Expiring",
          assigned_users: 45,
          total_seats: 50
        },
        {
          id: 2,
          software: "Microsoft Office 365",
          expiry_date: "2024-12-31",
          days_remaining: 500,
          status: "Active",
          assigned_users: 75,
          total_seats: 100
        }
      ];

      const mockLicenseUsageReport = [
        {
          id: 1,
          software: "Microsoft Office 365",
          total_seats: 100,
          assigned_seats: 75,
          available_seats: 25,
          utilization_rate: "75%",
          status: "optimal"
        },
        {
          id: 2,
          software: "Adobe Photoshop",
          total_seats: 25,
          assigned_seats: 20,
          available_seats: 5,
          utilization_rate: "80%",
          status: "optimal"
        },
        {
          id: 3,
          software: "Kaspersky Antivirus",
          total_seats: 50,
          assigned_seats: 45,
          available_seats: 5,
          utilization_rate: "90%",
          status: "over"
        }
      ];

      setSoftwareInventory(mockSoftwareInventory);
      setLicenseKeys(mockLicenseKeys);
      setExpiryTracking(mockExpiryTracking);
      setLicenseUsageReport(mockLicenseUsageReport);
      setLoading(false);
    }, 500);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open modal for adding/editing software
  const handleOpenModal = (software = null) => {
    if (software) {
      setEditId(software.id);
      setForm({
        name: software.name,
        version: software.version,
        category: software.category,
        license_type: software.license_type,
        license_key: "",
        purchase_date: "",
        expiry_date: "",
        quantity: software.quantity,
        assigned_users: software.assigned_users,
        status: software.status,
        vendor: software.vendor,
        description: software.description
      });
    } else {
      setEditId(null);
      setForm({
        name: "",
        version: "",
        category: "Productivity",
        license_type: "Perpetual",
        license_key: "",
        purchase_date: "",
        expiry_date: "",
        quantity: 1,
        assigned_users: 0,
        status: "Active",
        vendor: "",
        description: ""
      });
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save software
  const handleSaveSoftware = () => {
    if (!form.name || !form.version) {
      toast.error("Name and Version are required");
      return;
    }

    if (editId) {
      // Update existing software
      setSoftwareInventory(prev => prev.map(software => 
        software.id === editId ? { ...software, ...form } : software
      ));
      toast.success("Software updated successfully");
    } else {
      // Add new software
      const newSoftware = {
        id: Date.now(),
        ...form
      };
      setSoftwareInventory(prev => [...prev, newSoftware]);
      toast.success("Software created successfully");
    }

    handleCloseModal();
  };

  // Delete software
  const handleDeleteSoftware = (id) => {
    if (window.confirm("Are you sure you want to delete this software?")) {
      setSoftwareInventory(prev => prev.filter(software => software.id !== id));
      toast.success("Software deleted successfully");
    }
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "success";
      case "Expiring":
        return "warning";
      case "Expired":
        return "error";
      case "Cancelled":
        return "secondary";
      default:
        return "default";
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case "Operating System":
        return <ComputerIcon />;
      case "Productivity":
        return <DescriptionIcon />;
      case "Security":
        return <SecurityIcon />;
      case "Development":
        return <CodeIcon />;
      case "Database":
        return <StorageIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  // Get usage status color
  const getUsageStatusColor = (status) => {
    const statusObj = USAGE_STATUSES.find(s => s.value === status);
    return statusObj ? statusObj.color : "default";
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <ComputerIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Software License Management
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="license tabs">
          <Tab label="Software Inventory" value="inventory" icon={<ComputerIcon />} iconPosition="start" />
          <Tab label="License Key Storage" value="licenses" icon={<KeyIcon />} iconPosition="start" />
          <Tab label="Expiry Tracking" value="expiry" icon={<CalendarTodayIcon />} iconPosition="start" />
          <Tab label="License Usage Report" value="usage" icon={<BarChartIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box mt={2}>
        {activeTab === "inventory" && (
          <Box>
            {/* Filters and Search */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Search Software"
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
                      label="Category"
                      size="small"
                      fullWidth
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {SOFTWARE_CATEGORIES.map(category => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
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
                      {LICENSE_STATUSES.map(status => (
                        <MenuItem key={status} value={status}>{status}</MenuItem>
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
                      Add Software
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Software Table */}
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
                          <TableCell>Software</TableCell>
                          <TableCell>Version</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>License Type</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Assigned Users</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredSoftware.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No software found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredSoftware.map(software => (
                            <TableRow key={software.id}>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  {getCategoryIcon(software.category)}
                                  <Typography>{software.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{software.version}</TableCell>
                              <TableCell>{software.category}</TableCell>
                              <TableCell>{software.license_type}</TableCell>
                              <TableCell>{software.quantity}</TableCell>
                              <TableCell>{software.assigned_users}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={software.status} 
                                  color={getStatusColor(software.status)} 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpenModal(software)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteSoftware(software.id)}>
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
        )}

        {activeTab === "licenses" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>License Keys</Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Software</TableCell>
                        <TableCell>License Key</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Expiry Date</TableCell>
                        <TableCell>Assigned Users</TableCell>
                        <TableCell>Total Seats</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {licenseKeys.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body2" color="text.secondary">
                              No license keys found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        licenseKeys.map(license => (
                          <TableRow key={license.id}>
                            <TableCell>{license.software}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                                {license.license_key}
                              </Typography>
                            </TableCell>
                            <TableCell>{license.type}</TableCell>
                            <TableCell>{license.expiry_date}</TableCell>
                            <TableCell>{license.assigned_users}</TableCell>
                            <TableCell>{license.total_seats}</TableCell>
                            <TableCell>
                              <Chip 
                                label={license.status} 
                                color={getStatusColor(license.status)} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit">
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error">
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

        {activeTab === "expiry" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>License Expiry Tracking</Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {expiryTracking.map(tracking => (
                    <Grid item xs={12} sm={6} md={4} key={tracking.id}>
                      <Card sx={{ border: 1, borderColor: "divider" }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle1">{tracking.software}</Typography>
                            <Chip 
                              label={tracking.status} 
                              color={getStatusColor(tracking.status)} 
                              size="small" 
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Expires on: {tracking.expiry_date}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                            <Typography variant="body2">
                              {tracking.days_remaining} days remaining
                            </Typography>
                            <Typography variant="body2">
                              {tracking.assigned_users}/{tracking.total_seats} seats
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "usage" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>License Usage Report</Typography>
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {licenseUsageReport.map(report => (
                    <Grid item xs={12} sm={6} md={4} key={report.id}>
                      <Card sx={{ border: 1, borderColor: "divider" }}>
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle1">{report.software}</Typography>
                            <Chip 
                              label={report.utilization_rate} 
                              color={getUsageStatusColor(report.status)} 
                              size="small" 
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Usage Status: {USAGE_STATUSES.find(s => s.value === report.status)?.label}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                            <Typography variant="body2">
                              {report.assigned_seats} assigned seats
                            </Typography>
                            <Typography variant="body2">
                              {report.available_seats} available seats
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Software Edit Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Software" : "Add Software"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Software Name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Version"
                name="version"
                value={form.version}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Category"
                name="category"
                value={form.category}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              >
                {SOFTWARE_CATEGORIES.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="License Type"
                name="license_type"
                value={form.license_type}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              >
                {LICENSE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="License Key"
                name="license_key"
                value={form.license_key}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Purchase Date"
                name="purchase_date"
                type="date"
                value={form.purchase_date}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiry Date"
                name="expiry_date"
                type="date"
                value={form.expiry_date}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantity"
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Assigned Users"
                name="assigned_users"
                type="number"
                value={form.assigned_users}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Select
                label="Status"
                name="status"
                value={form.status}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              >
                {LICENSE_STATUSES.map(status => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Vendor"
                name="vendor"
                value={form.vendor}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSoftware}>
            {editId ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

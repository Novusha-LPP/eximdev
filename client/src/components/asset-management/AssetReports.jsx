import React, { useState } from "react";
import { toast } from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
  BarChartIcon from "@mui/icons-material/BarChart";
  PieChartIcon from "@mui/icons-material/PieChart";
  TableChartIcon from "@mui/icons-material/TableChart";
  DownloadIcon from "@mui/icons-material/Download";

// Report types
const REPORT_TYPES = [
  { value: "summary", label: "Asset Summary" },
  { value: "by-category", label: "Assets by Category" },
  { value: "by-location", label: "Assets by Location" },
  { value: "by-status", label: "Assets by Status" },
  { value: "warranty-expiry", label: "Warranty Expiry Report" },
  { value: "maintenance-schedule", label: "Maintenance Schedule" },
  { value: "depreciation", label: "Asset Depreciation" }
];

// Export formats
const EXPORT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" }
];

// Filter options
const FILTER_OPTIONS = {
  categories: [
    "All",
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
  ],
  statuses: [
    "All",
    "Active",
    "In Use",
    "Available",
    "Under Maintenance",
    "Retired",
    "Disposed"
  ],
  locations: [
    "All",
    "Office 1 - Floor 1",
    "Office 1 - Floor 2",
    "Office 2 - Floor 1",
    "Office 2 - Floor 2",
    "Server Room",
    "Warehouse",
    "Remote Site 1",
    "Remote Site 2"
  ]
};

export default function AssetReports() {
  const [activeTab, setActiveTab] = useState("generate");
  const [reportType, setReportType] = useState("summary");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [filters, setFilters] = useState({
    category: "All",
    status: "All",
    location: "All",
    dateRange: {
      from: "",
      to: ""
    }
  });
  const [loading, setLoading] = useState(false);

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date range change
  const handleDateRangeChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  // Generate report
  const handleGenerateReport = () => {
    setLoading(true);
    // In a real app, this would make an API call to generate the report
    setTimeout(() => {
      setLoading(false);
      toast.success("Report generated successfully");
    }, 1500);
  };

  // Export report
  const handleExportReport = () => {
    setLoading(true);
    // In a real app, this would make an API call to export the report
    setTimeout(() => {
      setLoading(false);
      toast.success(`Report exported as ${exportFormat.toUpperCase()}`);
    }, 1500);
  };

  // Get report type icon
  const getReportTypeIcon = (type) => {
    switch (type) {
      case "summary":
        return <BarChartIcon />;
      case "by-category":
      case "by-location":
      case "by-status":
        return <PieChartIcon />;
      default:
        return <TableChartIcon />;
    }
  };

  // Get report description
  const getReportDescription = (type) => {
    switch (type) {
      case "summary":
        return "Provides a comprehensive overview of all assets including total count, value, and distribution.";
      case "by-category":
        return "Shows asset distribution across different categories with counts and values.";
      case "by-location":
        return "Displays assets grouped by their physical locations.";
      case "by-status":
        return "Lists assets categorized by their current status.";
      case "warranty-expiry":
        return "Shows assets with expiring warranties and those already expired.";
      case "maintenance-schedule":
        return "Lists upcoming maintenance activities for assets.";
      case "depreciation":
        return "Calculates and displays asset depreciation values over time.";
      default:
        return "No description available.";
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <BarChartIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Asset Reports
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="asset-reports-tabs">
            <Tab label="Generate Reports" value="generate" />
            <Tab label="Scheduled Reports" value="scheduled" />
            <Tab label="Report History" value="history" />
          </Tabs>

          <Box mt={2}>
            {activeTab === "generate" && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Report Configuration</Typography>

                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Report Type</InputLabel>
                        <Select
                          value={reportType}
                          onChange={(e) => setReportType(e.target.value)}
                          label="Report Type"
                        >
                          {REPORT_TYPES.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        {getReportTypeIcon(reportType)}
                        <Typography variant="body2">
                          {getReportDescription(reportType)}
                        </Typography>
                      </Box>

                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Export Format</InputLabel>
                        <Select
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value)}
                          label="Export Format"
                        >
                          {EXPORT_FORMATS.format => (
                            <MenuItem key={format.value} value={format.value}>
                              {format.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Filters</Typography>

                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={filters.category}
                          onChange={(e) => handleFilterChange("category", e.target.value)}
                          label="Category"
                        >
                          {FILTER_OPTIONS.categories.map(category => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={filters.status}
                          onChange={(e) => handleFilterChange("status", e.target.value)}
                          label="Status"
                        >
                          {FILTER_OPTIONS.statuses.map(status => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Location</InputLabel>
                        <Select
                          value={filters.location}
                          onChange={(e) => handleFilterChange("location", e.target.value)}
                          label="Location"
                        >
                          {FILTER_OPTIONS.locations.map(location => (
                            <MenuItem key={location} value={location}>
                              {location}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Typography variant="subtitle1" gutterBottom>Date Range</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            label="From"
                            type="date"
                            size="small"
                            fullWidth
                            value={filters.dateRange.from}
                            onChange={(e) => handleDateRangeChange("from", e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="To"
                            type="date"
                            size="small"
                            fullWidth
                            value={filters.dateRange.to}
                            onChange={(e) => handleDateRangeChange("to", e.target.value)}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button variant="outlined" onClick={handleGenerateReport} disabled={loading}>
                      {loading ? <CircularProgress size={20} /> : "Generate Report"}
                    </Button>
                    <Button 
                      variant="contained" 
                      startIcon={<DownloadIcon />} 
                      onClick={handleExportReport} 
                      disabled={loading}
                    >
                      Export Report
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}

            {activeTab === "scheduled" && (
              <Box>
                <Typography variant="h6" gutterBottom>Scheduled Reports</Typography>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography>Monthly Asset Summary</Typography>
                      <Chip label="Active" color="success" size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Generated on the 1st of each month and sent to department heads.
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ mt: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography>Quarterly Warranty Report</Typography>
                      <Chip label="Active" color="success" size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Generated quarterly to alert about expiring warranties.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}

            {activeTab === "history" && (
              <Box>
                <Typography variant="h6" gutterBottom>Report History</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Report Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Generated Date</TableCell>
                        <TableCell>Format</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Asset Summary Report</TableCell>
                        <TableCell>Summary</TableCell>
                        <TableCell>2023-07-15</TableCell>
                        <TableCell>PDF</TableCell>
                        <TableCell>
                          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Assets by Category</TableCell>
                        <TableCell>By Category</TableCell>
                        <TableCell>2023-07-10</TableCell>
                        <TableCell>Excel</TableCell>
                        <TableCell>
                          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Warranty Expiry Report</TableCell>
                        <TableCell>Warranty Expiry</TableCell>
                        <TableCell>2023-07-05</TableCell>
                        <TableCell>PDF</TableCell>
                        <TableCell>
                          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

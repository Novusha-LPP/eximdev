import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PreviewIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import axios from "axios";

const BillingReportsUtility = () => {
  const [branches, setBranches] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState("");
  
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    reportType: "pb",
    dateFilterType: "job_year",
    year: "",
    startDate: "",
    endDate: "",
    branchId: "all",
    mode: "all",
    detailedStatus: "billing_pending",
  });

  const reportTypeOptions = [
    { value: "pb", label: "Purchase Book Report" },
    { value: "pr", label: "Payment Request Report" },
    { value: "pr_no_pb", label: "PR Pending Purchase Book" },
    { value: "all", label: "Unified PB & PR Report" },
  ];

  const dateFilterTypeOptions = [
    { value: "job_year", label: "Job Financial Year" },
    { value: "request_date", label: "Request Date Range" },
    { value: "completion_date", label: "Completion Date Range" },
  ];

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "billing_pending", label: "Billing Pending" },
    { value: "eta_date_pending", label: "ETA Date Pending" },
    { value: "estimated_time_of_arrival", label: "Estimated Time of Arrival" },
    { value: "gateway_igm_filed", label: "Gateway IGM Filed" },
    { value: "discharged", label: "Discharged" },
    { value: "rail_out", label: "Rail Out" },
    { value: "be_noted_arrival_pending", label: "BE Noted, Arrival Pending" },
    { value: "be_noted_clearance_pending", label: "BE Noted, Clearance Pending" },
    { value: "pcv_done_duty_payment_pending", label: "PCV Done, Duty Payment Pending" },
    { value: "custom_clearance_completed", label: "Custom Clearance Completed" },
  ];

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const API_URL = process.env.REACT_APP_API_STRING;

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await axios.get(`${API_URL}/admin/my-branches`, { withCredentials: true });
        const branchesData = Array.isArray(res.data) ? res.data : [];
        
        const uniqueBranches = [];
        const seenCodes = new Set();
        branchesData.forEach(b => {
          if (b && b.branch_code && !seenCodes.has(b.branch_code)) {
            seenCodes.add(b.branch_code);
            uniqueBranches.push(b);
          }
        });
        setBranches(uniqueBranches);
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };

    const fetchYears = async () => {
      try {
        const res = await axios.get(`${API_URL}/get-years`, { withCredentials: true });
        const yearsData = Array.isArray(res.data) ? res.data : [];
        const filteredYears = yearsData.filter(y => y !== null);
        setYears(filteredYears);
        
        if (filteredYears.length > 0) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;
          const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
          const currentTwoDigits = String(currentYear).slice(-2);
          const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

          let defaultYear = currentMonth >= 4
              ? `${currentTwoDigits}-${nextTwoDigits}`
              : `${prevTwoDigits}-${currentTwoDigits}`;
          
          if (filteredYears.includes(defaultYear)) {
            setFilters(prev => ({ ...prev, year: defaultYear }));
          } else {
            setFilters(prev => ({ ...prev, year: filteredYears[0] }));
          }
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    };

    const loadAll = async () => {
      setLoading(true);
      await Promise.allSettled([fetchBranches(), fetchYears()]);
      setLoading(false);
    };

    loadAll();
  }, [API_URL]);

  const handlePreview = async () => {
    if (filters.dateFilterType === "job_year" && !filters.year) {
      setNotification({
        open: true,
        message: "Please select a financial year",
        severity: "warning",
      });
      return;
    }
    if ((filters.dateFilterType === "request_date" || filters.dateFilterType === "completion_date") && (!filters.startDate || !filters.endDate)) {
      setNotification({
        open: true,
        message: "Please select both start and end dates",
        severity: "warning",
      });
      return;
    }

    setPreviewLoading(true);
    setPreviewError("");
    setPreviewData(null);
    setPage(0);
    setSearchQuery("");

    try {
      const response = await axios.get(`${API_URL}/report/billing-charges-excel`, {
        params: {
          type: filters.reportType,
          year: filters.dateFilterType === "job_year" ? filters.year : undefined,
          branchId: filters.branchId,
          mode: filters.mode,
          detailedStatus: filters.detailedStatus,
          dateFilterType: filters.dateFilterType,
          startDate: filters.startDate,
          endDate: filters.endDate,
          format: "json",
        },
        withCredentials: true
      });

      const data = Array.isArray(response.data) ? response.data : [];
      setPreviewData(data);
      if (data.length === 0) {
        setPreviewError("No matching records found for the selected filters.");
      } else {
        setNotification({
          open: true,
          message: `Successfully loaded ${data.length} records in preview.`,
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error loading preview:", error);
      let errMsg = "Failed to load preview data";
      if (error.response && error.response.data && error.response.data.error) {
        errMsg = error.response.data.error;
      }
      setPreviewError(errMsg);
      setNotification({
        open: true,
        message: errMsg,
        severity: "error",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (filters.dateFilterType === "job_year" && !filters.year) {
        setNotification({
            open: true,
            message: "Please select a year",
            severity: "warning",
        });
        return;
    }
    if ((filters.dateFilterType === "request_date" || filters.dateFilterType === "completion_date") && (!filters.startDate || !filters.endDate)) {
      setNotification({
        open: true,
        message: "Please select both start and end dates",
        severity: "warning",
      });
      return;
    }

    setDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/report/billing-charges-excel`, {
        params: {
          type: filters.reportType,
          year: filters.dateFilterType === "job_year" ? filters.year : undefined,
          branchId: filters.branchId,
          mode: filters.mode,
          detailedStatus: filters.detailedStatus,
          dateFilterType: filters.dateFilterType,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
        responseType: 'blob',
        withCredentials: true
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const dateLabel = filters.dateFilterType === "job_year" 
        ? filters.year 
        : `${filters.startDate}_to_${filters.endDate}`;

      const filenames = {
        pr: `Payment_Request_Report_${dateLabel}.xlsx`,
        pb: `Purchase_Book_Report_${dateLabel}.xlsx`,
        pr_no_pb: `PR_Pending_PB_Report_${dateLabel}.xlsx`,
        all: `Unified_Billing_Charges_Report_${dateLabel}.xlsx`
      };
      const filename = filenames[filters.reportType] || `Report_${dateLabel}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setNotification({
        open: true,
        message: "Report downloaded successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      
      let errorMessage = "No records found or error generating report";
      
      if (error.response && error.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            setNotification({
              open: true,
              message: errorData.error || errorMessage,
              severity: "error",
            });
          } catch (e) {
            setNotification({
              open: true,
              message: errorMessage,
              severity: "error",
            });
          }
        };
        reader.readAsText(error.response.data);
        return;
      } else if (error.response && error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
      }

      setNotification({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setPage(0);
  };

  const filteredPreviewRows = useMemo(() => {
    if (!previewData) return [];
    if (!searchQuery.trim()) return previewData;
    const query = searchQuery.toLowerCase();
    return previewData.filter((row) => {
      return Object.values(row).some((val) => 
        String(val).toLowerCase().includes(query)
      );
    });
  }, [previewData, searchQuery]);

  const headers = useMemo(() => {
    if (previewData && previewData.length > 0) {
      return Object.keys(previewData[0]);
    }
    return [];
  }, [previewData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", p: 3 }}>
      {/* Configuration Card */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <AssessmentIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
          <Typography variant="h5" fontWeight="700">
            Billing Charges Utility
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={4}>
          Generate, preview, and download Excel reports for Purchase Book and Payment Request charges. 
          Use custom date range filters for creation date (Request Date) or approval dates (Completion Date).
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select
                value={filters.reportType}
                label="Report Type"
                onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
              >
                {reportTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Filter Type</InputLabel>
              <Select
                value={filters.dateFilterType}
                label="Date Filter Type"
                onChange={(e) => setFilters({ ...filters, dateFilterType: e.target.value })}
              >
                {dateFilterTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Conditional Year / Date Pickers */}
          {filters.dateFilterType === "job_year" ? (
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Financial Year</InputLabel>
                <Select
                  value={filters.year}
                  label="Financial Year"
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ) : (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="End Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select
                value={filters.branchId}
                label="Branch"
                onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
              >
                <MenuItem value="all">All Branches</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id}>
                    {branch.branch_name} ({branch.branch_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Mode</InputLabel>
              <Select
                value={filters.mode}
                label="Mode"
                onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
              >
                <MenuItem value="all">All Modes</MenuItem>
                <MenuItem value="SEA">SEA</MenuItem>
                <MenuItem value="AIR">AIR</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Detailed Status</InputLabel>
              <Select
                value={filters.detailedStatus}
                label="Detailed Status"
                onChange={(e) => setFilters({ ...filters, detailedStatus: e.target.value })}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            color="primary"
            startIcon={previewLoading ? <CircularProgress size={20} color="inherit" /> : <PreviewIcon />}
            onClick={handlePreview}
            disabled={previewLoading || downloading}
            sx={{
              flexGrow: 1,
              py: 1.5,
              fontWeight: "600",
              textTransform: "none",
              boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
              transition: "all 0.2s",
              "&:hover": { transform: "translateY(-1px)" },
            }}
          >
            {previewLoading ? "Loading Preview..." : "Preview Report Data"}
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownload}
            disabled={downloading || previewLoading}
            sx={{
              flexGrow: 1,
              py: 1.5,
              fontWeight: "600",
              textTransform: "none",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)",
              transition: "all 0.2s",
              "&:hover": {
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                transform: "translateY(-1px)",
              },
            }}
          >
            {downloading ? "Downloading..." : "Download Excel Report"}
          </Button>
        </Box>
      </Paper>

      {/* Preview Section */}
      {previewLoading && (
        <Paper elevation={1} sx={{ p: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 2 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Fetching charges data. Please wait...
          </Typography>
        </Paper>
      )}

      {previewError && !previewLoading && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {previewError}
        </Alert>
      )}

      {previewData && previewData.length > 0 && !previewLoading && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, overflow: "hidden" }}>
          {/* Table Toolbar */}
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
            <Box>
              <Typography variant="h6" fontWeight="700">
                Report Preview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Showing {filteredPreviewRows.length} of {previewData.length} records matching search criteria
              </Typography>
            </Box>
            
            <TextField
              size="small"
              placeholder="Search preview data..."
              value={searchQuery}
              onChange={handleSearchChange}
              sx={{ width: 280 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size="small" style={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} edge="end">
                      <ClearIcon size="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          {/* Data Table Grid */}
          <TableContainer sx={{ maxHeight: 450, overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: "600",
                        backgroundColor: "#f8fafc",
                        color: "#475569",
                        whiteSpace: "nowrap",
                        py: 1.5,
                        borderBottom: "2px solid #e2e8f0",
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPreviewRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length} align="center" sx={{ py: 6, color: "text.secondary" }}>
                      No matching records found in this preview.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPreviewRows
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, idx) => (
                      <TableRow key={idx} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                        {headers.map((header) => (
                          <TableCell
                            key={header}
                            sx={{
                              whiteSpace: "nowrap",
                              fontSize: "0.85rem",
                              color: "#334155",
                              py: 1.2,
                            }}
                          >
                            {row[header] !== undefined && row[header] !== null ? String(row[header]) : ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Table Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredPreviewRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            sx={{ borderTop: "1px solid #e2e8f0", mt: 1 }}
          />
        </Paper>
      )}

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BillingReportsUtility;

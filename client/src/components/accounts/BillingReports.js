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
  Grow,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PreviewIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ==================== MAIN COMPONENT ====================
const BillingReports = () => {
  const [activeView, setActiveView] = useState("pending"); // "pending" | "completed"
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sidebarWidth = isSidebarCollapsed ? 70 : 280;

  return (
    <Box sx={{ display: "flex", minHeight: "calc(100vh - 100px)", m: -2.5, bgcolor: "#f8fafc" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          flexShrink: 0,
          bgcolor: "white",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflowX: "hidden",
          position: "sticky",
          top: 0,
          height: "calc(100vh - 100px)",
          zIndex: 10,
        }}
      >
        {/* Brand / Toggle */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "space-between",
            borderBottom: "1px solid #f1f5f9",
            minHeight: 64,
          }}
        >
          {!isSidebarCollapsed && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: "#1a73e8", borderRadius: "50%" }} />
              <Typography variant="subtitle1" fontWeight="800" color="#0f172a" noWrap>
                Billing Reports Hub
              </Typography>
            </Box>
          )}
          <IconButton onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Box>

        {/* Navigation List */}
        <List sx={{ px: 1, py: 2, flexGrow: 1 }}>
          {[
            { id: "pending", label: "Billing Charges Reports", icon: <AssessmentIcon /> },
            { id: "completed", label: "Completed Billing Jobs", icon: <TaskAltIcon /> },
          ].map((item) => {
            const isActive = activeView === item.id;
            return (
              <Tooltip key={item.id} title={isSidebarCollapsed ? item.label : ""} placement="right">
                <ListItemButton
                  onClick={() => setActiveView(item.id)}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                    px: isSidebarCollapsed ? 1 : 2,
                    bgcolor: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#1a73e8" : "#475569",
                    "&:hover": {
                      bgcolor: isActive ? "#eff6ff" : "#f8fafc",
                      color: isActive ? "#1a73e8" : "#0f172a",
                    },
                    transition: "all 0.2s",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: isSidebarCollapsed ? 0 : 40,
                      color: isActive ? "#1a73e8" : "#94a3b8",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!isSidebarCollapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.85rem",
                        fontWeight: isActive ? "700" : "600",
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, p: 4, overflow: "auto", minWidth: 0 }}>
        {activeView === "pending" && (
          <PendingBillingUtility />
        )}

        {activeView === "completed" && (
          <CompletedBillingUtility />
        )}
      </Box>
    </Box>
  );
};


const PendingBillingUtility = () => {
  const [branches, setBranches] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState("");
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoaded, setInitialLoaded] = useState(false);

  const totalAmount = useMemo(() => {
    if (!previewData) return 0;
    return previewData.reduce((acc, row) => {
      const amt = parseFloat(row["Net Payable"]) || parseFloat(row["Basic Amount"]) || 0;
      return acc + amt;
    }, 0);
  }, [previewData]);

  const modeData = useMemo(() => {
    if (!previewData) return [];
    const counts = {};
    previewData.forEach(row => {
      const mode = row["Mode"] || "UNKNOWN";
      const amt = parseFloat(row["Net Payable"]) || parseFloat(row["Basic Amount"]) || 0;
      if (!counts[mode]) counts[mode] = { name: mode, count: 0, amount: 0 };
      counts[mode].count += 1;
      counts[mode].amount += amt;
    });
    return Object.values(counts);
  }, [previewData]);

  const branchData = useMemo(() => {
    if (!previewData) return [];
    const counts = {};
    previewData.forEach(row => {
      const branch = row["Branch"] || "UNKNOWN";
      const amt = parseFloat(row["Net Payable"]) || parseFloat(row["Basic Amount"]) || 0;
      if (!counts[branch]) counts[branch] = { name: branch, count: 0, amount: 0 };
      counts[branch].count += 1;
      counts[branch].amount += amt;
    });
    return Object.values(counts).sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [previewData]);

  const chargeHeadData = useMemo(() => {
    if (!previewData) return [];
    const counts = {};
    previewData.forEach(row => {
      const head = row["Charge Head"] || "UNKNOWN";
      const amt = parseFloat(row["Net Payable"]) || parseFloat(row["Basic Amount"]) || 0;
      if (!counts[head]) counts[head] = { name: head, count: 0, amount: 0 };
      counts[head].count += 1;
      counts[head].amount += amt;
    });
    return Object.values(counts).sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [previewData]);

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

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
    { value: "tds", label: "TDS Payable Register" },
    { value: "gpj", label: "General Pending Jobs" },
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

  const handlePreview = async (overrideFilters = {}) => {
    const activeFilters = { ...filters, ...overrideFilters };
    if (activeFilters.dateFilterType === "job_year" && !activeFilters.year) {
      setNotification({
        open: true,
        message: "Please select a financial year",
        severity: "warning",
      });
      return;
    }
    if ((activeFilters.dateFilterType === "request_date" || activeFilters.dateFilterType === "completion_date") && (!activeFilters.startDate || !activeFilters.endDate)) {
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
          type: activeFilters.reportType,
          year: activeFilters.dateFilterType === "job_year" ? activeFilters.year : undefined,
          branchId: activeFilters.branchId,
          mode: activeFilters.mode,
          detailedStatus: activeFilters.detailedStatus,
          dateFilterType: activeFilters.dateFilterType,
          startDate: activeFilters.startDate,
          endDate: activeFilters.endDate,
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

  useEffect(() => {
    if (years.length > 0 && filters.year && !initialLoaded && !loading) {
      setInitialLoaded(true);
      handlePreview({ year: filters.year });
    }
  }, [years, filters.year, initialLoaded, loading]);

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
        tds: `TDS_Payable_Register_${dateLabel}.xlsx`,
        all: `Unified_Billing_Charges_Report_${dateLabel}.xlsx`,
        gpj: `General_Pending_Jobs_${dateLabel}.xlsx`
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
    <Box sx={{ width: "100%", p: 0.5 }}>
      {/* Header Panel */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, bgcolor: "#eff6ff", borderRadius: 2, display: "flex", alignItems: "center" }}>
            <AssessmentIcon sx={{ color: "#1a73e8", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: "#0f172a", lineHeight: 1.2 }}>
              Billing Charges Reports
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Generate, preview, and download reports for Purchase Book and Payment Request charges pending billing
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Filters Control Panel */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: "#fafafa" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select value={filters.reportType} label="Report Type" onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}>
                {reportTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Filter Type</InputLabel>
              <Select value={filters.dateFilterType} label="Date Filter Type" onChange={(e) => setFilters({ ...filters, dateFilterType: e.target.value })}>
                {dateFilterTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {filters.dateFilterType === "job_year" ? (
            <Grid item xs={12} sm={6} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Financial Year</InputLabel>
                <Select value={filters.year} label="Financial Year" onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ) : (
            <>
              <Grid item xs={12} sm={6} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    let nextDateStr = "";
                    if (newStart) {
                      const parts = newStart.split("-");
                      if (parts.length === 3) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const day = parseInt(parts[2], 10);
                        const d = new Date(year, month, day);
                        d.setDate(d.getDate() + 1);
                        const pad = (n) => String(n).padStart(2, "0");
                        nextDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                      }
                    }
                    setFilters({ ...filters, startDate: newStart, endDate: nextDateStr });
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={1.5}>
                <TextField fullWidth size="small" label="End Date" type="date" InputLabelProps={{ shrink: true }} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select value={filters.branchId} label="Branch" onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}>
                <MenuItem value="all">All Branches</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id}>{branch.branch_name} ({branch.branch_code})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Mode</InputLabel>
              <Select value={filters.mode} label="Mode" onChange={(e) => setFilters({ ...filters, mode: e.target.value })}>
                <MenuItem value="all">All Modes</MenuItem>
                <MenuItem value="SEA">SEA</MenuItem>
                <MenuItem value="AIR">AIR</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Detailed Status</InputLabel>
              <Select value={filters.detailedStatus} label="Detailed Status" onChange={(e) => setFilters({ ...filters, detailedStatus: e.target.value })}>
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 0.5 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={previewLoading ? <CircularProgress size={16} color="inherit" /> : <PreviewIcon />}
              onClick={() => handlePreview()}
              disabled={previewLoading || downloading}
              sx={{ px: 3, py: 0.8, fontWeight: "600", textTransform: "none", borderRadius: 1.5 }}
            >
              {previewLoading ? "Loading..." : "Preview Data"}
            </Button>

            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownload}
              disabled={downloading || previewLoading}
              sx={{
                px: 3,
                py: 0.8,
                fontWeight: "600",
                textTransform: "none",
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              {downloading ? "Downloading..." : "Download Excel"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Preview Grid */}
      {previewLoading && (
        <Paper elevation={1} sx={{ p: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 2 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Fetching charges data...</Typography>
        </Paper>
      )}

      {previewError && !previewLoading && <Alert severity="info" sx={{ borderRadius: 2 }}>{previewError}</Alert>}



      {previewData && previewData.length > 0 && !previewLoading && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, overflow: "hidden" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
            <Box>
              <Typography variant="h6" fontWeight="700">Report Preview</Typography>
              <Typography variant="caption" color="text.secondary">Showing {filteredPreviewRows.length} of {previewData.length} records</Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Search preview data..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              sx={{ width: 280 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon size="small" style={{ color: "#94a3b8" }} /></InputAdornment>,
                endAdornment: searchQuery && <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearchQuery(""); setPage(0); }} edge="end"><ClearIcon size="small" /></IconButton></InputAdornment>
              }}
            />
          </Box>

          <TableContainer sx={{ maxHeight: 650, overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell key={header} sx={{ fontWeight: "700", backgroundColor: "#f1f5f9", color: "#475569", whiteSpace: "nowrap", py: 0.8, fontSize: "0.78rem" }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPreviewRows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: 6 }}>No records matching search.</TableCell></TableRow>
                ) : (
                  filteredPreviewRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                    <TableRow key={idx} hover>
                      {headers.map((header) => (
                        <TableCell key={header} sx={{ whiteSpace: "nowrap", fontSize: "0.78rem", color: "#1e293b", py: 0.5 }}>
                          {row[header] !== undefined && row[header] !== null ? String(row[header]) : ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredPreviewRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Paper>
      )}

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} variant="filled">{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
};


// ==================== COMPLETED BILLING REPORT UTILITY ====================
const CompletedBillingUtility = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState("");
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoaded, setInitialLoaded] = useState(false);

  const modeData = useMemo(() => {
    if (!previewData) return [];
    const counts = {};
    previewData.forEach(row => {
      const mode = row["Mode"] || "UNKNOWN";
      if (!counts[mode]) counts[mode] = { name: mode, value: 0 };
      counts[mode].value += 1;
    });
    return Object.values(counts);
  }, [previewData]);

  const branchData = useMemo(() => {
    if (!previewData) return [];
    const counts = {};
    previewData.forEach(row => {
      const branch = row["Branch"] || "UNKNOWN";
      if (!counts[branch]) counts[branch] = { name: branch, count: 0 };
      counts[branch].count += 1;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [previewData]);

  const importerData = useMemo(() => {
    if (!previewData) return [];
    const counts = {};
    previewData.forEach(row => {
      const importer = row["Importer Name"] || "UNKNOWN";
      if (!counts[importer]) counts[importer] = { name: importer, count: 0 };
      counts[importer].count += 1;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [previewData]);

  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899"];

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const [filters, setFilters] = useState({
    filterType: "day",
    dayDate: new Date().toISOString().split('T')[0],
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    startDate: "",
    endDate: "",
    branchId: "all",
    mode: "all"
  });

  const getDates = () => {
    if (filters.filterType === "day") {
      return {
        startDate: filters.dayDate,
        endDate: filters.dayDate
      };
    }
    if (filters.filterType === "month") {
      const m = parseInt(filters.month, 10);
      const y = parseInt(filters.year, 10);
      const lastDay = new Date(y, m, 0).getDate();
      const pad = (num) => String(num).padStart(2, '0');
      return {
        startDate: `${y}-${pad(m)}-01`,
        endDate: `${y}-${pad(m)}-${pad(lastDay)}`
      };
    }
    return {
      startDate: filters.startDate,
      endDate: filters.endDate
    };
  };

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

    const loadAll = async () => {
      setLoading(true);
      await fetchBranches();
      setLoading(false);
    };

    loadAll();
  }, [API_URL]);

  const handlePreview = async () => {
    const { startDate, endDate } = getDates();
    if (!startDate || !endDate) {
      setNotification({
        open: true,
        message: "Please select both start and end billing dates",
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
      const response = await axios.get(`${API_URL}/report/billing-completed-excel`, {
        params: {
          branchId: filters.branchId,
          mode: filters.mode,
          startDate,
          endDate,
          format: "json",
        },
        withCredentials: true
      });

      const data = Array.isArray(response.data) ? response.data : [];
      setPreviewData(data);
      if (data.length === 0) {
        setPreviewError("No completed billing records found for the selected filters.");
      } else {
        setNotification({
          open: true,
          message: `Successfully loaded ${data.length} completed records in preview.`,
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

  useEffect(() => {
    if (branches.length > 0 && !initialLoaded && !loading) {
      setInitialLoaded(true);
      handlePreview();
    }
  }, [branches, initialLoaded, loading]);

  const handleDownload = async () => {
    const { startDate, endDate } = getDates();
    if (!startDate || !endDate) {
      setNotification({
        open: true,
        message: "Please select both start and end billing dates",
        severity: "warning",
      });
      return;
    }

    setDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/report/billing-completed-excel`, {
        params: {
          branchId: filters.branchId,
          mode: filters.mode,
          startDate,
          endDate,
        },
        responseType: 'blob',
        withCredentials: true
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Billing_Completed_Report_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setNotification({
        open: true,
        message: "Completed billing report downloaded successfully",
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
    <Box sx={{ width: "100%", p: 0.5 }}>
      {/* Header Panel */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{ p: 1, bgcolor: "#e8f5e9", borderRadius: 2, display: "flex", alignItems: "center" }}>
            <TaskAltIcon sx={{ color: "#2e7d32", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: "#0f172a", lineHeight: 1.2 }}>
              Billing Completed Jobs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Generate, preview, and download reports for jobs with completed billing details, filtered by Billing Date
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Filters Control Panel */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: "#fafafa" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter By</InputLabel>
              <Select
                value={filters.filterType}
                label="Filter By"
                onChange={(e) => setFilters({ ...filters, filterType: e.target.value })}
              >
                <MenuItem value="day">Single Day</MenuItem>
                <MenuItem value="month">Month</MenuItem>
                <MenuItem value="custom">Custom Date Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {filters.filterType === "day" && (
            <Grid item xs={12} sm={6} md={3.5}>
              <TextField
                fullWidth
                size="small"
                label="Select Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.dayDate}
                onChange={(e) => setFilters({ ...filters, dayDate: e.target.value })}
              />
            </Grid>
          )}

          {filters.filterType === "month" && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={filters.month}
                    label="Month"
                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  >
                    {months.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={filters.year}
                    label="Year"
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  >
                    {yearOptions.map((y) => (
                      <MenuItem key={y} value={String(y)}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {filters.filterType === "custom" && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Billing Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    let nextDateStr = "";
                    if (newStart) {
                      const parts = newStart.split("-");
                      if (parts.length === 3) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const day = parseInt(parts[2], 10);
                        const d = new Date(year, month, day);
                        d.setDate(d.getDate() + 1);
                        const pad = (n) => String(n).padStart(2, "0");
                        nextDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                      }
                    }
                    setFilters({ ...filters, startDate: newStart, endDate: nextDateStr });
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Billing End Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Branch</InputLabel>
              <Select value={filters.branchId} label="Branch" onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}>
                <MenuItem value="all">All Branches</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id}>{branch.branch_name} ({branch.branch_code})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Mode</InputLabel>
              <Select value={filters.mode} label="Mode" onChange={(e) => setFilters({ ...filters, mode: e.target.value })}>
                <MenuItem value="all">All Modes</MenuItem>
                <MenuItem value="SEA">SEA</MenuItem>
                <MenuItem value="AIR">AIR</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} display="flex" gap={2} justifyContent="flex-end" sx={{ mt: 0.5 }}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={previewLoading ? <CircularProgress size={16} color="inherit" /> : <PreviewIcon />}
              onClick={handlePreview}
              disabled={previewLoading || downloading}
              sx={{ px: 3, py: 0.8, fontWeight: "600", textTransform: "none", borderRadius: 1.5 }}
            >
              {previewLoading ? "Loading..." : "Preview Completed Jobs"}
            </Button>

            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownload}
              disabled={downloading || previewLoading}
              sx={{
                px: 3,
                py: 0.8,
                fontWeight: "600",
                textTransform: "none",
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              }}
            >
              {downloading ? "Downloading..." : "Download Excel"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Preview Grid */}
      {previewLoading && (
        <Paper elevation={1} sx={{ p: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 2 }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">Fetching completed billing records...</Typography>
        </Paper>
      )}

      {previewError && !previewLoading && <Alert severity="info" sx={{ borderRadius: 2 }}>{previewError}</Alert>}



      {previewData && previewData.length > 0 && !previewLoading && (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, overflow: "hidden" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
            <Box>
              <Typography variant="h6" fontWeight="700">Completed Jobs Preview</Typography>
              <Typography variant="caption" color="text.secondary">Showing {filteredPreviewRows.length} of {previewData.length} records</Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Search preview data..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              sx={{ width: 280 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon size="small" style={{ color: "#94a3b8" }} /></InputAdornment>,
                endAdornment: searchQuery && <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearchQuery(""); setPage(0); }} edge="end"><ClearIcon size="small" /></IconButton></InputAdornment>
              }}
            />
          </Box>

          <TableContainer sx={{ maxHeight: 650, overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell key={header} sx={{ fontWeight: "700", backgroundColor: "#f1f5f9", color: "#475569", whiteSpace: "nowrap", py: 0.8, fontSize: "0.78rem" }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPreviewRows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: 6 }}>No records matching search.</TableCell></TableRow>
                ) : (
                  filteredPreviewRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                    <TableRow key={idx} hover>
                      {headers.map((header) => (
                        <TableCell key={header} sx={{ whiteSpace: "nowrap", fontSize: "0.78rem", color: "#1e293b", py: 0.5 }}>
                          {row[header] !== undefined && row[header] !== null ? String(row[header]) : ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 250]}
            component="div"
            count={filteredPreviewRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Paper>
      )}

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} variant="filled">{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default BillingReports;

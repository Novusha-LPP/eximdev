import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableFooter,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Chip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PreviewIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import TuneIcon from "@mui/icons-material/Tune";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import axios from "axios";

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
            minHeight: 60,
          }}
        >
          {!isSidebarCollapsed && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: "#2563eb", borderRadius: "50%" }} />
              <Typography variant="subtitle1" fontWeight="800" color="#0f172a" noWrap>
                Billing Reports Hub
              </Typography>
            </Box>
          )}
          <IconButton onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} size="small">
            {isSidebarCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Box>

        {/* Navigation List */}
        <List sx={{ px: 1, py: 1.5, flexGrow: 1 }}>
          {[
            { id: "pending", label: "Billing Charges Reports", icon: <AssessmentIcon fontSize="small" /> },
            { id: "completed", label: "Completed Billing Jobs", icon: <TaskAltIcon fontSize="small" /> },
          ].map((item) => {
            const isActive = activeView === item.id;
            return (
              <Tooltip key={item.id} title={isSidebarCollapsed ? item.label : ""} placement="right">
                <ListItemButton
                  onClick={() => setActiveView(item.id)}
                  sx={{
                    mb: 0.8,
                    borderRadius: 2,
                    justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                    px: isSidebarCollapsed ? 1 : 1.8,
                    py: 0.9,
                    bgcolor: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#2563eb" : "#475569",
                    "&:hover": {
                      bgcolor: isActive ? "#eff6ff" : "#f8fafc",
                      color: isActive ? "#2563eb" : "#0f172a",
                    },
                    transition: "all 0.2s",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: isSidebarCollapsed ? 0 : 36,
                      color: isActive ? "#2563eb" : "#94a3b8",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!isSidebarCollapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.82rem",
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
      <Box sx={{ flexGrow: 1, p: 2.5, overflow: "auto", minWidth: 0 }}>
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

// ==================== PENDING BILLING UTILITY ====================
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

  const [filters, setFilters] = useState({
    reportType: "pb",
    year: "",
    startDate: "",
    endDate: "",
    completionStartDate: "",
    completionEndDate: "",
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

  const handleApplyPreset = (preset, target = "completion") => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start = "";
    let end = "";

    if (preset === "today") {
      start = formatDate(today);
      end = formatDate(today);
    } else if (preset === "this_month") {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = formatDate(s);
      end = formatDate(e);
    } else if (preset === "last_month") {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      start = formatDate(s);
      end = formatDate(e);
    } else if (preset === "current_fy") {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      const endYear = startYear + 1;
      start = `${startYear}-04-01`;
      end = `${endYear}-03-31`;
    }

    if (target === "completion") {
      setFilters(prev => ({ ...prev, completionStartDate: start, completionEndDate: end }));
    } else {
      setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    }
  };

  const handleResetFilters = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
    const currentTwoDigits = String(currentYear).slice(-2);
    const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");
    const defaultYear = currentMonth >= 4 ? `${currentTwoDigits}-${nextTwoDigits}` : `${prevTwoDigits}-${currentTwoDigits}`;

    setFilters({
      reportType: "pb",
      year: defaultYear,
      startDate: "",
      endDate: "",
      completionStartDate: "",
      completionEndDate: "",
      branchId: "all",
      mode: "all",
      detailedStatus: "billing_pending",
    });
  };

  const handlePreview = useCallback(async (overrideFilters = {}) => {
    const activeFilters = { ...filters, ...overrideFilters };

    setPreviewLoading(true);
    setPreviewError("");
    setPreviewData(null);
    setPage(0);
    setSearchQuery("");

    try {
      const response = await axios.get(`${API_URL}/report/billing-charges-excel`, {
        params: {
          type: activeFilters.reportType,
          year: activeFilters.year && activeFilters.year !== "all" ? activeFilters.year : undefined,
          branchId: activeFilters.branchId,
          mode: activeFilters.mode,
          detailedStatus: activeFilters.detailedStatus,
          startDate: activeFilters.startDate || undefined,
          endDate: activeFilters.endDate || undefined,
          completionStartDate: activeFilters.completionStartDate || undefined,
          completionEndDate: activeFilters.completionEndDate || undefined,
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
  }, [API_URL, filters]);

  useEffect(() => {
    if (years.length > 0 && filters.year && !initialLoaded && !loading) {
      setInitialLoaded(true);
      handlePreview({ year: filters.year });
    }
  }, [years, filters.year, initialLoaded, loading, handlePreview]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/report/billing-charges-excel`, {
        params: {
          type: filters.reportType,
          year: filters.year && filters.year !== "all" ? filters.year : undefined,
          branchId: filters.branchId,
          mode: filters.mode,
          detailedStatus: filters.detailedStatus,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          completionStartDate: filters.completionStartDate || undefined,
          completionEndDate: filters.completionEndDate || undefined,
        },
        responseType: 'blob',
        withCredentials: true
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      let dateLabel = filters.year && filters.year !== "all" ? filters.year : "All";
      if (filters.completionStartDate && filters.completionEndDate) {
        dateLabel = `Comp_${filters.completionStartDate}_to_${filters.completionEndDate}`;
      } else if (filters.startDate && filters.endDate) {
        dateLabel = `${filters.startDate}_to_${filters.endDate}`;
      }

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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.year && filters.year !== "all") count += 1;
    if (filters.branchId && filters.branchId !== "all") count += 1;
    if (filters.mode && filters.mode !== "all") count += 1;
    if (filters.detailedStatus && filters.detailedStatus !== "all") count += 1;
    if (filters.startDate || filters.endDate) count += 1;
    if (filters.completionStartDate || filters.completionEndDate) count += 1;
    return count;
  }, [filters]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: 0 }}>
      {/* COMPACT & MODERN FILTER CARD */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 2.5,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Compact Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <TuneIcon sx={{ color: "#2563eb", fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight="800" color="#0f172a" fontSize="0.82rem" letterSpacing={0.2}>
              REPORT PARAMETERS & FILTERS
            </Typography>
            {activeFilterCount > 0 && (
              <Chip
                label={`${activeFilterCount} Active`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  bgcolor: "#dbeafe",
                  color: "#1d4ed8",
                  borderRadius: "4px",
                }}
              />
            )}
          </Box>

          <Button
            size="small"
            variant="text"
            startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
            onClick={handleResetFilters}
            sx={{
              textTransform: "none",
              color: "#64748b",
              fontWeight: 600,
              fontSize: "0.72rem",
              py: 0.2,
              px: 1,
              "&:hover": { color: "#ef4444", bgcolor: "#fef2f2" },
            }}
          >
            Reset Filters
          </Button>
        </Box>

        {/* Row 1: Primary Dimensions (5 Dropdowns) */}
        <Grid container spacing={1.5} mb={1.5}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Report Type</InputLabel>
              <Select
                value={filters.reportType}
                label="Report Type"
                onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                {reportTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.8rem" }}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Financial Year</InputLabel>
              <Select
                value={filters.year}
                label="Financial Year"
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                <MenuItem value="all" sx={{ fontSize: "0.8rem" }}>All Years</MenuItem>
                {years.map((year) => (
                  <MenuItem key={year} value={year} sx={{ fontSize: "0.8rem" }}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Branch</InputLabel>
              <Select
                value={filters.branchId}
                label="Branch"
                onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                <MenuItem value="all" sx={{ fontSize: "0.8rem" }}>All Branches</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id} sx={{ fontSize: "0.8rem" }}>
                    {branch.branch_name} ({branch.branch_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Mode</InputLabel>
              <Select
                value={filters.mode}
                label="Mode"
                onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                <MenuItem value="all" sx={{ fontSize: "0.8rem" }}>All Modes</MenuItem>
                <MenuItem value="SEA" sx={{ fontSize: "0.8rem" }}>SEA</MenuItem>
                <MenuItem value="AIR" sx={{ fontSize: "0.8rem" }}>AIR</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Detailed Status</InputLabel>
              <Select
                value={filters.detailedStatus}
                label="Detailed Status"
                onChange={(e) => setFilters({ ...filters, detailedStatus: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.8rem" }}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Row 2: Date Filters & Action Buttons (Compact Row) */}
        <Grid container spacing={1.5} alignItems="center">
          {/* Charge Date Range */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                fullWidth
                size="small"
                label="Date From"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    startDate: val,
                    endDate: prev.endDate && prev.endDate >= val ? prev.endDate : val
                  }));
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    fontSize: "0.78rem",
                    height: 36,
                    bgcolor: "#f8fafc",
                  }
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Date To"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    fontSize: "0.78rem",
                    height: 36,
                    bgcolor: "#f8fafc",
                  }
                }}
              />
            </Box>
          </Grid>

          {/* Completion Date Range */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                fullWidth
                size="small"
                label="Comp. Date From"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.completionStartDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    completionStartDate: val,
                    completionEndDate: prev.completionEndDate && prev.completionEndDate >= val ? prev.completionEndDate : val
                  }));
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    fontSize: "0.78rem",
                    height: 36,
                    bgcolor: "#f8fafc",
                  }
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Comp. Date To"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.completionEndDate}
                onChange={(e) => setFilters(prev => ({ ...prev, completionEndDate: e.target.value }))}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    fontSize: "0.78rem",
                    height: 36,
                    bgcolor: "#f8fafc",
                  }
                }}
              />
            </Box>
          </Grid>

          {/* Quick Presets for Completion Date + Clear Dates */}
          <Grid item xs={12} md={2.5}>
            <Box display="flex" alignItems="center" gap={0.6} flexWrap="nowrap">
              {["This Month", "Last Month"].map((label) => {
                const key = label === "This Month" ? "this_month" : "last_month";
                return (
                  <Chip
                    key={key}
                    label={label}
                    size="small"
                    clickable
                    onClick={() => handleApplyPreset(key, "completion")}
                    sx={{
                      height: 24,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      bgcolor: "#f1f5f9",
                      borderRadius: "5px",
                      "&:hover": { bgcolor: "#e2e8f0" }
                    }}
                  />
                );
              })}
              {(filters.startDate || filters.endDate || filters.completionStartDate || filters.completionEndDate) && (
                <IconButton
                  size="small"
                  title="Clear All Dates"
                  onClick={() => setFilters(prev => ({ ...prev, startDate: "", endDate: "", completionStartDate: "", completionEndDate: "" }))}
                  sx={{ p: 0.5, color: "#ef4444" }}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12} md={3.5} display="flex" justifyContent="flex-end" gap={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={previewLoading ? <CircularProgress size={14} color="inherit" /> : <PreviewIcon sx={{ fontSize: 17 }} />}
              onClick={() => handlePreview()}
              disabled={previewLoading || downloading}
              sx={{
                px: 2.2,
                height: 36,
                fontWeight: 700,
                fontSize: "0.78rem",
                textTransform: "none",
                borderRadius: 1.8,
                bgcolor: "#2563eb",
                boxShadow: "none",
                "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
              }}
            >
              {previewLoading ? "Loading..." : "Preview Data"}
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon sx={{ fontSize: 17 }} />}
              onClick={handleDownload}
              disabled={downloading || previewLoading}
              sx={{
                px: 2.2,
                height: 36,
                fontWeight: 700,
                fontSize: "0.78rem",
                textTransform: "none",
                borderRadius: 1.8,
                bgcolor: "#059669",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                boxShadow: "none",
                "&:hover": { background: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
              }}
            >
              {downloading ? "Exporting..." : "Download Excel"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Preview Grid */}
      {previewLoading && (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2.5,
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          <CircularProgress size={28} sx={{ mb: 1.5, color: "#2563eb" }} />
          <Typography variant="caption" color="#64748b" fontWeight="600">
            Querying records & rendering preview table...
          </Typography>
        </Paper>
      )}

      {previewError && !previewLoading && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 2.5,
            mb: 2.5,
            py: 0.5,
            border: "1px solid #bfdbfe",
            bgcolor: "#eff6ff",
            color: "#1e40af",
            fontSize: "0.8rem",
          }}
        >
          {previewError}
        </Alert>
      )}

      {previewData && previewData.length > 0 && !previewLoading && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2.5,
            overflow: "hidden",
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
          }}
        >
          {/* Preview Header & Search */}
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={1.5}>
            <Box>
              <Typography variant="subtitle2" fontWeight="800" color="#0f172a" fontSize="0.85rem">
                Report Preview
              </Typography>
              <Typography variant="caption" color="#64748b">
                Showing {filteredPreviewRows.length} of {previewData.length} records
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Search in preview..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              sx={{
                width: 260,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  height: 34,
                  fontSize: "0.78rem"
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} /></InputAdornment>,
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchQuery(""); setPage(0); }} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <TableContainer sx={{ maxHeight: 650, overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 2 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: "700",
                        backgroundColor: "#f8fafc",
                        color: "#475569",
                        whiteSpace: "nowrap",
                        py: 0.8,
                        fontSize: "0.74rem",
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
                  <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: 4, color: "#64748b", fontSize: "0.8rem" }}>No records matching search query.</TableCell></TableRow>
                ) : (
                  filteredPreviewRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                    <TableRow
                      key={idx}
                      hover
                      sx={{
                        "&:nth-of-type(even)": { bgcolor: "#fafcff" },
                        "&:hover": { bgcolor: "#f1f5f9" }
                      }}
                    >
                      {headers.map((header) => {
                        const val = row[header];
                        const isStatusCol = header.toLowerCase().includes("status");
                        
                        if (isStatusCol && val) {
                          const statusStr = String(val).toLowerCase();
                          const isPending = statusStr.includes("pending");
                          const isCompleted = statusStr.includes("completed") || statusStr.includes("approved") || statusStr.includes("paid");
                          const isRejected = statusStr.includes("rejected") || statusStr.includes("cancelled");

                          let chipBg = "#f1f5f9";
                          let chipText = "#475569";

                          if (isPending) {
                            chipBg = "#fffbeb";
                            chipText = "#b45309";
                          } else if (isCompleted) {
                            chipBg = "#ecfdf5";
                            chipText = "#047857";
                          } else if (isRejected) {
                            chipBg = "#fef2f2";
                            chipText = "#b91c1c";
                          }

                          return (
                            <TableCell key={header} sx={{ whiteSpace: "nowrap", fontSize: "0.74rem", py: 0.5 }}>
                              <Chip
                                label={String(val)}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  bgcolor: chipBg,
                                  color: chipText,
                                  borderRadius: 1,
                                }}
                              />
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={header} sx={{ whiteSpace: "nowrap", fontSize: "0.74rem", color: "#1e293b", py: 0.5 }}>
                            {val !== undefined && val !== null ? String(val) : ""}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
              {filteredPreviewRows.length > 0 && (
                <TableFooter sx={{ position: "sticky", bottom: 0, zIndex: 2, backgroundColor: "#f1f5f9" }}>
                  <TableRow sx={{ borderTop: "2px solid #cbd5e1" }}>
                    {headers.map((header, index) => {
                      if (index === 0) {
                        return <TableCell key={`total-${index}`} sx={{ fontWeight: "800", fontSize: "0.8rem", py: 1, color: "#0f172a" }}>Total</TableCell>;
                      }
                      const amountHeaders = [
                        "Net Payable", "Net Amount", "Net Amount (INR)"
                      ];
                      const isAmountColumn = amountHeaders.includes(header);
                      if (isAmountColumn) {
                        const total = filteredPreviewRows.reduce((acc, row) => {
                          const val = parseFloat(row[header]);
                          return acc + (isNaN(val) ? 0 : val);
                        }, 0);
                        return (
                          <TableCell key={`total-${index}`} sx={{ fontWeight: "800", fontSize: "0.8rem", color: "#047857", py: 1 }}>
                            {total.toFixed(2)}
                          </TableCell>
                        );
                      }
                      return <TableCell key={`total-${index}`} />;
                    })}
                  </TableRow>
                </TableFooter>
              )}
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
            sx={{
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                fontSize: "0.75rem",
                color: "#64748b"
              }
            }}
          />
        </Paper>
      )}

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
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
    const yearsArr = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      yearsArr.push(y);
    }
    return yearsArr;
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

  const getDates = useCallback(() => {
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
  }, [filters.filterType, filters.dayDate, filters.month, filters.year, filters.startDate, filters.endDate]);

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

  const handlePreview = useCallback(async () => {
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
  }, [API_URL, filters.branchId, filters.mode, getDates]);

  useEffect(() => {
    if (branches.length > 0 && !initialLoaded && !loading) {
      setInitialLoaded(true);
      handlePreview();
    }
  }, [branches, initialLoaded, loading, handlePreview]);

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
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: 0 }}>
      {/* Header Banner */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              p: 1,
              bgcolor: "#ecfdf5",
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              border: "1px solid #a7f3d0",
            }}
          >
            <TaskAltIcon sx={{ color: "#059669", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#0f172a", lineHeight: 1.2 }}>
              Billing Completed Jobs
            </Typography>
            <Typography variant="caption" color="#64748b" fontWeight="500">
              Generate, preview, and download reports for jobs with completed billing details
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Filters Control Panel */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 2.5,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <TuneIcon sx={{ color: "#059669", fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight="800" color="#1e293b" fontSize="0.82rem">
              FILTER BY BILLING DATE
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Filter By</InputLabel>
              <Select
                value={filters.filterType}
                label="Filter By"
                onChange={(e) => setFilters({ ...filters, filterType: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                <MenuItem value="day" sx={{ fontSize: "0.8rem" }}>Single Day</MenuItem>
                <MenuItem value="month" sx={{ fontSize: "0.8rem" }}>Month</MenuItem>
                <MenuItem value="custom" sx={{ fontSize: "0.8rem" }}>Custom Date Range</MenuItem>
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
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    bgcolor: "#f8fafc",
                    fontSize: "0.78rem",
                    height: 36,
                  }
                }}
              />
            </Grid>
          )}

          {filters.filterType === "month" && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: "0.78rem" }}>Month</InputLabel>
                  <Select
                    value={filters.month}
                    label="Month"
                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                    sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
                  >
                    {months.map((m) => (
                      <MenuItem key={m.value} value={m.value} sx={{ fontSize: "0.8rem" }}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: "0.78rem" }}>Year</InputLabel>
                  <Select
                    value={filters.year}
                    label="Year"
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
                  >
                    {yearOptions.map((y) => (
                      <MenuItem key={y} value={String(y)} sx={{ fontSize: "0.8rem" }}>
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
                    setFilters(prev => ({
                      ...prev,
                      startDate: newStart,
                      endDate: prev.endDate && prev.endDate >= newStart ? prev.endDate : newStart
                    }));
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.78rem", height: 36 } }}
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
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.78rem", height: 36 } }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Branch</InputLabel>
              <Select
                value={filters.branchId}
                label="Branch"
                onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                <MenuItem value="all" sx={{ fontSize: "0.8rem" }}>All Branches</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch._id} value={branch._id} sx={{ fontSize: "0.8rem" }}>{branch.branch_name} ({branch.branch_code})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: "0.78rem" }}>Mode</InputLabel>
              <Select
                value={filters.mode}
                label="Mode"
                onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                sx={{ borderRadius: 1.5, bgcolor: "#f8fafc", fontSize: "0.8rem", height: 36 }}
              >
                <MenuItem value="all" sx={{ fontSize: "0.8rem" }}>All Modes</MenuItem>
                <MenuItem value="SEA" sx={{ fontSize: "0.8rem" }}>SEA</MenuItem>
                <MenuItem value="AIR" sx={{ fontSize: "0.8rem" }}>AIR</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} display="flex" gap={1.5} justifyContent="flex-end" sx={{ mt: 0.5 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={previewLoading ? <CircularProgress size={14} color="inherit" /> : <PreviewIcon sx={{ fontSize: 17 }} />}
              onClick={handlePreview}
              disabled={previewLoading || downloading}
              sx={{
                px: 2.2,
                height: 36,
                fontWeight: 700,
                fontSize: "0.78rem",
                textTransform: "none",
                borderRadius: 1.8,
                bgcolor: "#2563eb",
                boxShadow: "none",
                "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" }
              }}
            >
              {previewLoading ? "Loading..." : "Preview Completed Jobs"}
            </Button>

            <Button
              variant="contained"
              size="small"
              startIcon={downloading ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon sx={{ fontSize: 17 }} />}
              onClick={handleDownload}
              disabled={downloading || previewLoading}
              sx={{
                px: 2.2,
                height: 36,
                fontWeight: 700,
                fontSize: "0.78rem",
                textTransform: "none",
                borderRadius: 1.8,
                bgcolor: "#059669",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                boxShadow: "none",
                "&:hover": { background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }
              }}
            >
              {downloading ? "Exporting..." : "Download Excel"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Preview Grid */}
      {previewLoading && (
        <Paper elevation={0} sx={{ p: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 2.5, border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
          <CircularProgress size={28} sx={{ mb: 1.5, color: "#059669" }} />
          <Typography variant="caption" color="#64748b" fontWeight="600">Fetching completed billing records...</Typography>
        </Paper>
      )}

      {previewError && !previewLoading && (
        <Alert severity="info" sx={{ borderRadius: 2.5, mb: 2.5, py: 0.5, border: "1px solid #bfdbfe", bgcolor: "#eff6ff", color: "#1e40af", fontSize: "0.8rem" }}>
          {previewError}
        </Alert>
      )}

      {previewData && previewData.length > 0 && !previewLoading && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2.5,
            overflow: "hidden",
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={1.5}>
            <Box>
              <Typography variant="subtitle2" fontWeight="800" color="#0f172a" fontSize="0.85rem">
                Completed Jobs Preview
              </Typography>
              <Typography variant="caption" color="#64748b">
                Showing {filteredPreviewRows.length} of {previewData.length} records
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Search preview data..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              sx={{
                width: 260,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  height: 34,
                  fontSize: "0.78rem"
                }
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} /></InputAdornment>,
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setSearchQuery(""); setPage(0); }} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <TableContainer sx={{ maxHeight: 650, overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 2 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: "700",
                        backgroundColor: "#f8fafc",
                        color: "#475569",
                        whiteSpace: "nowrap",
                        py: 0.8,
                        fontSize: "0.74rem",
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
                  <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: 4, color: "#64748b", fontSize: "0.8rem" }}>No records matching search query.</TableCell></TableRow>
                ) : (
                  filteredPreviewRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
                    <TableRow
                      key={idx}
                      hover
                      sx={{
                        "&:nth-of-type(even)": { bgcolor: "#fafcff" },
                        "&:hover": { bgcolor: "#f1f5f9" }
                      }}
                    >
                      {headers.map((header) => (
                        <TableCell key={header} sx={{ whiteSpace: "nowrap", fontSize: "0.74rem", color: "#1e293b", py: 0.5 }}>
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
            sx={{
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                fontSize: "0.75rem",
                color: "#64748b"
              }
            }}
          />
        </Paper>
      )}

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BillingReports;

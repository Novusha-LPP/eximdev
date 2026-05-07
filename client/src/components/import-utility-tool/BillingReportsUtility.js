import React, { useState, useEffect } from "react";
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
  TextField,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import AssessmentIcon from "@mui/icons-material/Assessment";
import axios from "axios";

const BillingReportsUtility = () => {
  const [branches, setBranches] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const [filters, setFilters] = useState({
    year: "",
    branchId: "all",
    mode: "all",
    detailedStatus: "billing_pending",
    month: "all",
    startDate: "",
    endDate: "",
  });

  const monthOptions = [
    { value: "all", label: "All Months" },
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

  const handleDownload = async (type) => {
    if (!filters.year && !filters.startDate) {
        setNotification({
            open: true,
            message: "Please select a year or date range",
            severity: "warning",
        });
        return;
    }

    setDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/report/billing-charges-excel`, {
        params: {
          type,
          year: filters.year,
          branchId: filters.branchId,
          mode: filters.mode,
          detailedStatus: filters.detailedStatus,
          month: filters.month,
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
      
      let dateSuffix = filters.year;
      if (filters.month !== 'all') {
          const monthLabel = monthOptions.find(m => m.value === filters.month)?.label || filters.month;
          dateSuffix += `_${monthLabel}`;
      }
      if (filters.startDate) {
          dateSuffix = `${filters.startDate}_to_${filters.endDate || 'now'}`;
      }

      const filenames = {
        pr: `Payment_Request_Report_${dateSuffix}.xlsx`,
        pb: `Purchase_Book_Report_${dateSuffix}.xlsx`,
        pr_no_pb: `PR_Pending_PB_Report_${dateSuffix}.xlsx`,
        all: `Unified_Billing_Charges_Report_${dateSuffix}.xlsx`
      };
      const filename = filenames[type] || `Report_${dateSuffix}.xlsx`;
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
      
      // If the response is a blob, we need to read it as text to see the error message
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
        return; // Early return as notification is set in onload
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, margin: "0 auto", p: 3 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <AssessmentIcon color="primary" sx={{ fontSize: 32, mr: 2 }} />
          <Typography variant="h5" fontWeight="700">
            Billing Charges Utility
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" mb={4}>
          Generate and download Excel reports for Purchase Book and Payment Request charges. 
          Filter by year, branch, mode, and detailed status.
        </Typography>

        <Divider sx={{ mb: 4 }} />

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
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

          <Grid item xs={12} md={3}>
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

          <Grid item xs={12} md={3}>
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

          <Grid item xs={12} md={3}>
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

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Month</InputLabel>
              <Select
                value={filters.month}
                label="Month"
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              >
                {monthOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownload('pb')}
            disabled={downloading}
            sx={{ flexGrow: 1, py: 1.5, fontWeight: '600' }}
          >
            Download Purchase Book Report
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownload('pr')}
            disabled={downloading}
            sx={{ flexGrow: 1, py: 1.5, fontWeight: '600' }}
          >
            Download Payment Request Report
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownload('pr_no_pb')}
            disabled={downloading}
            sx={{ flexGrow: 1, py: 1.5, fontWeight: '600' }}
          >
            PR Pending Purchase Book
          </Button>
          <Button
            variant="contained"
            color="info"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownload('all')}
            disabled={downloading}
            sx={{ flexGrow: 1, py: 1.5, fontWeight: '600' }}
          >
            Unified PB & PR Report
          </Button>
        </Box>
      </Paper>

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

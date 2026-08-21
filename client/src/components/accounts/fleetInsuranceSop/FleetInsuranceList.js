import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  TablePagination,
  CircularProgress,
  Stack,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  Alert,
  AlertTitle,
  Chip,
  Grid,
  Avatar,
  Tooltip
} from "@mui/material";
import { toast } from "react-hot-toast";

import { Edit, Delete, GetApp, Add, FileDownload, Visibility, Autorenew, CheckCircle, HourglassEmpty, History, DirectionsCar } from "@mui/icons-material";

import FleetInsuranceHistory from "./FleetInsuranceHistory";

function FleetInsuranceList({ onViewHistory, onRenew, onCreate, onOpenApproval, onOpenPaymentUtr, onEdit, onView }) {
  const [mainTab, setMainTab] = useState(0); // 0 = Vehicle Records, 1 = Policy History Dashboard, 2 = Approval, 3 = Payment & UTR
  const [selectedHistoryRegNo, setSelectedHistoryRegNo] = useState("");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  const [approvalRecords, setApprovalRecords] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [paymentUtrRecords, setPaymentUtrRecords] = useState([]);
  const [paymentUtrLoading, setPaymentUtrLoading] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    regNo: "",
    owner: "",
    size: "",
    modelType: "",
    premiumAmount: "",
    newTotalPolicyPremium: "",
    expiryDate: "",
    renewalDate: "",
    renewed: ""
  });

  const [filterOptions, setFilterOptions] = useState({
    owners: [],
    sizes: [],
    models: []
  });

  const fetchFilterOptions = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/filters/options`);
      setFilterOptions({
        owners: res.data.owners || [],
        sizes: res.data.sizes || [],
        models: res.data.models || []
      });
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  const fetchApprovalRecords = async () => {
    setApprovalLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/approvals/list`);
      setApprovalRecords(res.data.data || []);
    } catch (err) {
      console.error("Error fetching approval records:", err);
    } finally {
      setApprovalLoading(false);
    }
  };

  const fetchPaymentUtrRecords = async () => {
    setPaymentUtrLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/payment-utr/list`);
      setPaymentUtrRecords(res.data.data || []);
    } catch (err) {
      console.error("Error fetching payment UTR records:", err);
    } finally {
      setPaymentUtrLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchApprovalRecords();
    fetchPaymentUtrRecords();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop`, {
        params: {
          search,
          month,
          year,
          page: page + 1,
          limit: rowsPerPage,
          ...filters
        },
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching Fleet Insurance SOP list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchRecords();
    }, 500);
    return () => clearTimeout(delay);
  }, [page, rowsPerPage, search, month, year, filters]);

  // const handleDelete = async (id) => {
  //   if (!window.confirm("Are you sure you want to delete this Record?")) return;
  //   try {
  //     await axios.delete(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${id}`);
  //     fetchRecords();
  //     fetchApprovalRecords();
  //   } catch (err) {
  //     console.error("Error deleting Record:", err);
  //     alert("Failed to delete Record");
  //   }
  // };

  const handleExport = async (id, registrationNo) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Fleet_Insurance_${registrationNo || "Export"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting excel:", err);
      alert("Failed to export Excel");
    }
  };

  const handleBulkExport = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/export/bulk`, {
        params: { search, month, year },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      let filename = "Fleet_Insurance_Export.xlsx";
      if (month && year) filename = `Fleet_Insurance_${month}_${year}.xlsx`;
      else if (year) filename = `Fleet_Insurance_${year}.xlsx`;
      else if (month) filename = `Fleet_Insurance_Month_${month}.xlsx`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error bulk exporting excel:", err);
      alert("Failed to export bulk Excel");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/template/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Fleet_Insurance_SOP_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template");
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this fleet insurance record?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${id}`);
      toast.success("Record deleted successfully");
      fetchRecords();
      fetchApprovalRecords();
      fetchPaymentUtrRecords();
    } catch (err) {
      console.error("Error deleting record:", err);
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getExpiryDateColor = (dateStr) => {
    if (!dateStr) return "inherit";
    const expiry = new Date(dateStr);
    const now = new Date();
    expiry.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "red";
    if (diffDays <= 7) return "orange";
    return "green";
  };

  // Determine which stage a record is currently at
  const getStageStatus = (row) => {
    if (String(row.renewed).toUpperCase() === "YES" || row.renewalStatus === "Renewed") {
      return { label: "Renewed", color: "success" };
    }
    if (row.paymentUtr) {
      return { label: "Payment Done", color: "success" };
    }
    if (row.financialApprovalStatus === "Approved") {
      return { label: "Payment & UTR", color: "info" };
    }
    if (row.financialApprovalStatus === "Rejected") {
      return { label: "Approval Rejected", color: "error" };
    }
    if (row.prNumber) {
      return { label: "Finance Approval", color: "warning" };
    }
    if (row.readyForPr === "Yes") {
      return { label: "PR Generation", color: "primary" };
    }
    return { label: "Policy Proposal", color: "default" };
  };


  // Compute contextual row values based on selected Month and Year filter
  const getContextualRowDetails = (row, filterMonth, filterYear) => {
    const pDateStr = row.policyToDate;
    const nDateStr = row.newPolicyToDate || row.newExpiryDate;
    const rDateStr = row.renewalDate || row.renewedDate || row.paymentDate;

    const pDate = pDateStr ? new Date(pDateStr) : null;
    const nDate = nDateStr ? new Date(nDateStr) : null;
    const rDate = rDateStr ? new Date(rDateStr) : null;

    const reqMonth = filterMonth ? parseInt(filterMonth, 10) : null;
    const reqYear = filterYear ? parseInt(filterYear, 10) : null;

    let isMatchingNewPolicy = false;
    let isMatchingOldPolicy = false;
    let isMatchingRenewalDate = false;

    if (reqYear && reqMonth) {
      if (nDate && !isNaN(nDate.getTime()) && nDate.getFullYear() === reqYear && (nDate.getMonth() + 1) === reqMonth) {
        isMatchingNewPolicy = true;
      }
      if (pDate && !isNaN(pDate.getTime()) && pDate.getFullYear() === reqYear && (pDate.getMonth() + 1) === reqMonth) {
        isMatchingOldPolicy = true;
      }
      if (rDate && !isNaN(rDate.getTime()) && rDate.getFullYear() === reqYear && (rDate.getMonth() + 1) === reqMonth) {
        isMatchingRenewalDate = true;
      }
    } else if (reqYear) {
      if (nDate && !isNaN(nDate.getTime()) && nDate.getFullYear() === reqYear) {
        isMatchingNewPolicy = true;
      }
      if (pDate && !isNaN(pDate.getTime()) && pDate.getFullYear() === reqYear) {
        isMatchingOldPolicy = true;
      }
      if (rDate && !isNaN(rDate.getTime()) && rDate.getFullYear() === reqYear) {
        isMatchingRenewalDate = true;
      }
    } else if (reqMonth) {
      if (nDate && !isNaN(nDate.getTime()) && (nDate.getMonth() + 1) === reqMonth) {
        isMatchingNewPolicy = true;
      }
      if (pDate && !isNaN(pDate.getTime()) && (pDate.getMonth() + 1) === reqMonth) {
        isMatchingOldPolicy = true;
      }
      if (rDate && !isNaN(rDate.getTime()) && (rDate.getMonth() + 1) === reqMonth) {
        isMatchingRenewalDate = true;
      }
    }

    const isOldRenewed = String(row.renewed).toUpperCase() === "YES" ||
      row.renewalStatus === "Renewed" ||
      Boolean(nDate) ||
      Boolean(row.paymentUtr) ||
      Boolean(row.paymentDate) ||
      Boolean(row.renewalDate) ||
      Boolean(row.renewedDate);

    if (isMatchingNewPolicy && !isMatchingOldPolicy && !isMatchingRenewalDate) {
      // In the renewed policy cycle (e.g. August 2027), the policy expiring is nDate.
      // Has it been renewed AGAIN for the next year? Not yet!
      return {
        displayExpiry: nDate,
        displayRenewalDate: null,
        isRenewed: false,
        stageStatus: { label: "Policy Proposal", color: "default" },
        previousPremium: row.newTotalPolicyPremium || row.newPremiumAmount || row.newPremium || row.totalPolicyPremium || row.premiumAmount,
        renewedPremium: null,
      };
    }

    // Default or matching old policy cycle (e.g. August 2026):
    return {
      displayExpiry: pDate || nDate,
      displayRenewalDate: isOldRenewed ? rDate : null,
      isRenewed: isOldRenewed,
      stageStatus: isOldRenewed ? { label: "Renewed", color: "success" } : getStageStatus(row),
      previousPremium: row.totalPolicyPremium || row.premiumAmount,
      renewedPremium: isOldRenewed ? (row.newTotalPolicyPremium || row.newPremiumAmount || row.newPremium || row.totalPolicyPremium || row.premiumAmount) : null,
    };
  };

  // Identify expiring records (within 7 days of today's date and not yet renewed)
  const expiringRecords = data.filter((row) => {
    const ctx = getContextualRowDetails(row, month, year);
    if (ctx.isRenewed) return false;
    if (!ctx.displayExpiry) return false;
    const expiry = new Date(ctx.displayExpiry);
    const now = new Date();
    expiry.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });

  return (
    <Box sx={{ width: "100%" }}>
      {/* Top Fleet Operational Metrics Header Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider",
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(37, 99, 235, 0.1)", color: "#2563eb", width: 48, height: 48 }}>
              <DirectionsCar />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Total Fleet Records
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {total}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider",
              background: "linear-gradient(135deg, #ffffff 0%, #fffbe6 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(217, 119, 6, 0.1)", color: "#d97706", width: 48, height: 48 }}>
              <HourglassEmpty />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Expiring Soon (7 Days)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: expiringRecords.length > 0 ? "#dc2626" : "#0f172a" }}>
                {expiringRecords.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider",
              background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", width: 48, height: 48 }}>
              <CheckCircle />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Approval Pending
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {approvalRecords.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider",
              background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(22, 163, 74, 0.1)", color: "#16a34a", width: 48, height: 48 }}>
              <Autorenew />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Payment & UTR Pending
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {paymentUtrRecords.filter((r) => !r.paymentUtr).length}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Surface Card */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: "12px", border: "1px solid", borderColor: "divider" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px" }}>
              Fleet Insurance Tracker
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Monitor vehicle policies, renewals, financial approvals, and payment UTRs
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              color="success"
              startIcon={<FileDownload />}
              onClick={handleBulkExport}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#bbf7d0",
                color: "#166534",
                "&:hover": { borderColor: "#86efac", bgcolor: "#f0fdf4" },
              }}
            >
              Monthly Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleDownloadTemplate}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#cbd5e1",
                color: "#475569",
                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
              }}
            >
              Excel Template
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreate}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 600,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                "&:hover": {
                  background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                },
              }}
            >
              Add Vehicle Record
            </Button>
          </Stack>
        </Stack>

        {/* Four Subtabs: Vehicle Records, Policy History & Dashboard, Approval, Payment & UTR */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
          <Tabs
            value={mainTab}
            onChange={(e, val) => setMainTab(val)}
            aria-label="fleet insurance top tabs"
            sx={{
              minHeight: 40,
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 2.5,
                borderRadius: 2,
              },
            }}
          >
            <Tab
              label="Vehicle Records"
              id="fleet-tab-0"
              sx={{ fontWeight: 600, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
            />
            <Tab
              label="Policy History & Dashboard"
              id="fleet-tab-1"
              sx={{ fontWeight: 600, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
            />
            <Tab
              label={
                <Badge badgeContent={approvalRecords.length} color="error" offset={[10, 0]}>
                  Approval
                </Badge>
              }
              id="fleet-tab-2"
              sx={{ fontWeight: 600, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
            />
            <Tab
              label={
                <Badge badgeContent={paymentUtrRecords.filter((r) => !r.paymentUtr).length} color="success" offset={[10, 0]}>
                  Payment & UTR
                </Badge>
              }
              id="fleet-tab-3"
              sx={{ fontWeight: 600, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
            />
          </Tabs>
        </Box>

        {mainTab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={6}>
              <TextField
                placeholder="Search by Reg No, Owner, Insurer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "#f8fafc",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={3}>
              <TextField
                select
                label="Month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "#f8fafc",
                  },
                }}
              >
                <MenuItem value="">All Months</MenuItem>
                <MenuItem value="1">January</MenuItem>
                <MenuItem value="2">February</MenuItem>
                <MenuItem value="3">March</MenuItem>
                <MenuItem value="4">April</MenuItem>
                <MenuItem value="5">May</MenuItem>
                <MenuItem value="6">June</MenuItem>
                <MenuItem value="7">July</MenuItem>
                <MenuItem value="8">August</MenuItem>
                <MenuItem value="9">September</MenuItem>
                <MenuItem value="10">October</MenuItem>
                <MenuItem value="11">November</MenuItem>
                <MenuItem value="12">December</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3} md={3}>
              <TextField
                select
                label="Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    bgcolor: "#f8fafc",
                  },
                }}
              >
                <MenuItem value="">All Years</MenuItem>
                <MenuItem value="2024">2024</MenuItem>
                <MenuItem value="2025">2025</MenuItem>
                <MenuItem value="2026">2026</MenuItem>
                <MenuItem value="2027">2027</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Notification Alert for Expiring Policies */}
      {expiringRecords.length > 0 && mainTab === 0 && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "#fde68a",
            bgcolor: "#fffbeb",
          }}
        >
          <AlertTitle sx={{ fontWeight: 700, color: "#b45309" }}>Policy Expiry Notice (7 Days Threshold)</AlertTitle>
          There {expiringRecords.length === 1 ? "is 1 vehicle policy" : `are ${expiringRecords.length} vehicle policies`} expiring within 7
          days or past due requiring renewal:{" "}
          <strong>{expiringRecords.map((r) => r.registrationNo).join(", ")}</strong>.
        </Alert>
      )}

      {/* TAB 1: VEHICLE RECORDS */}
      {mainTab === 0 && (
        <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
              <CircularProgress size={32} sx={{ color: "#2563eb" }} />
            </Box>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#0f172a" }}>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Reg No</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Owner</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Size</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Model</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Previous Premium (₹)</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Renewed Premium (₹)</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Expiry Date</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Renewal Date</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Renewed?</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Stage Status</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }} align="center">
                      Actions
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField size="small" placeholder="Filter..." value={filters.regNo} onChange={(e) => handleFilterChange("regNo", e.target.value)} variant="standard" fullWidth />
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField select size="small" value={filters.owner} onChange={(e) => handleFilterChange("owner", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }}>
                        <MenuItem value="">All</MenuItem>
                        {filterOptions.owners.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField select size="small" value={filters.size} onChange={(e) => handleFilterChange("size", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }}>
                        <MenuItem value="">All</MenuItem>
                        {filterOptions.sizes.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField select size="small" value={filters.modelType} onChange={(e) => handleFilterChange("modelType", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }}>
                        <MenuItem value="">All</MenuItem>
                        {filterOptions.models.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                      </TextField>
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField size="small" placeholder="Filter..." value={filters.premiumAmount} onChange={(e) => handleFilterChange("premiumAmount", e.target.value)} variant="standard" fullWidth />
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField size="small" placeholder="Filter..." value={filters.newTotalPolicyPremium} onChange={(e) => handleFilterChange("newTotalPolicyPremium", e.target.value)} variant="standard" fullWidth />
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField size="small" placeholder="Filter date..." value={filters.expiryDate} onChange={(e) => handleFilterChange("expiryDate", e.target.value)} variant="standard" fullWidth />
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField size="small" placeholder="Filter date..." value={filters.renewalDate} onChange={(e) => handleFilterChange("renewalDate", e.target.value)} variant="standard" fullWidth />
                    </TableCell>
                    <TableCell padding="none" sx={{ px: 1, py: 0.5 }}>
                      <TextField select size="small" value={filters.renewed} onChange={(e) => handleFilterChange("renewed", e.target.value)} variant="standard" fullWidth SelectProps={{ displayEmpty: true }}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="YES">Yes</MenuItem>
                        <MenuItem value="NO">No</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 6, color: "#64748b" }}>
                        No fleet insurance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => {
                      const ctx = getContextualRowDetails(row, month, year);
                      return (
                        <TableRow key={row._id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                          <TableCell
                            sx={{ fontWeight: 700, color: "#2563eb", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                            onClick={() => onEdit(row)}
                            title="Click to Edit Current Details"
                          >
                            {row.registrationNo}
                          </TableCell>
                          <TableCell sx={{ color: "#334155" }}>{row.owner || "-"}</TableCell>
                          <TableCell sx={{ color: "#334155" }}>{row.size || "-"}</TableCell>
                          <TableCell sx={{ color: "#334155" }}>{row.modelType || "-"}</TableCell>
                          <TableCell sx={{ color: "#0f172a", fontWeight: 600 }}>
                            {ctx.previousPremium
                              ? Number(ctx.previousPremium).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                              : "-"}
                          </TableCell>
                          <TableCell
                            sx={{
                              color: ctx.renewedPremium && ctx.previousPremium ? (Number(ctx.renewedPremium) > Number(ctx.previousPremium) ? "#dc2626" : Number(ctx.renewedPremium) < Number(ctx.previousPremium) ? "#16a34a" : "inherit") : "inherit",
                              fontWeight: ctx.renewedPremium && ctx.previousPremium && Number(ctx.renewedPremium) !== Number(ctx.previousPremium) ? 700 : 400,
                            }}
                          >
                            {ctx.renewedPremium ? Number(ctx.renewedPremium).toLocaleString("en-IN", { style: "currency", currency: "INR" }) : "-"}
                          </TableCell>
                          <TableCell sx={{ color: getExpiryDateColor(ctx.displayExpiry), fontWeight: 700 }}>
                            {ctx.displayExpiry ? new Date(ctx.displayExpiry).toLocaleDateString("en-IN") : "-"}
                          </TableCell>
                          <TableCell sx={{ color: "#16a34a", fontWeight: 700 }}>
                            {ctx.displayRenewalDate ? new Date(ctx.displayRenewalDate).toLocaleDateString("en-IN") : "-"}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: ctx.isRenewed ? "#16a34a" : "#64748b" }}>
                            <Chip
                              label={ctx.isRenewed ? "YES" : "NO"}
                              size="small"
                              sx={{
                                bgcolor: ctx.isRenewed ? "#dcfce7" : "#f1f5f9",
                                color: ctx.isRenewed ? "#15803d" : "#475569",
                                fontWeight: 700,
                                borderRadius: "6px",
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ctx.stageStatus.label}
                              size="small"
                              sx={{
                                borderRadius: "6px",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                              }}
                              color={ctx.stageStatus.color}
                            />
                          </TableCell>
                          <TableCell align="center">

                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Edit Details">
                              <IconButton size="small" onClick={() => onEdit(row)} sx={{ color: "#2563eb", "&:hover": { bgcolor: "#eff6ff" } }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Renew Policy">
                              <IconButton size="small" onClick={() => onRenew(row)} sx={{ color: "#16a34a", "&:hover": { bgcolor: "#f0fdf4" } }}>
                                <Autorenew fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="History Dashboard">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedHistoryRegNo(row.registrationNo);
                                  setMainTab(1);
                                }}
                                sx={{ color: "#0284c7", "&:hover": { bgcolor: "#e0f2fe" } }}
                              >
                                <History fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Export Record">
                              <IconButton size="small" onClick={() => handleExport(row._id, row.registrationNo)} sx={{ color: "#64748b", "&:hover": { bgcolor: "#f1f5f9" } }}>
                                <GetApp fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Record">
                              <IconButton size="small" onClick={() => handleDelete(row._id)} sx={{ color: "#dc2626", "&:hover": { bgcolor: "#fef2f2" } }}>
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
          )}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ borderTop: "1px solid", borderColor: "divider" }}
          />
        </Paper>
      )}

      {/* TAB 2: POLICY HISTORY DASHBOARD */}
      {mainTab === 1 && (
        <FleetInsuranceHistory
          registrationNo={selectedHistoryRegNo}
          onEdit={onEdit}
          onRenew={onRenew}
          onView={onView}
        />
      )}

      {/* TAB 3: APPROVAL */}
      {mainTab === 2 && (
        <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
          <Box sx={{ p: 2.5, bgcolor: "#f8fafc", borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
              Financial Approvals Stage
            </Typography>
            <Typography variant="body2" color="#64748b">
              Entries requiring approval assigned to Finance Manager. Click "Review & Approve" to navigate directly to the approval stage.
            </Typography>
          </Box>

          {approvalLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
              <CircularProgress size={32} sx={{ color: "#2563eb" }} />
            </Box>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#0f172a" }}>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Reg No</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Owner</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>PR Number</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>PR Date</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Premium Amount (₹)</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Approval Stage</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Assigned Role</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }} align="center">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvalRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: "#64748b" }}>
                        No pending approvals at this time
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvalRecords.map((row) => (
                      <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => onOpenApproval(row)}>
                        <TableCell sx={{ fontWeight: 700, color: "#2563eb" }}>{row.registrationNo}</TableCell>
                        <TableCell sx={{ color: "#334155" }}>{row.owner || "-"}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.prNumber || "N/A"}</TableCell>
                        <TableCell>{row.prDate ? new Date(row.prDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>
                          ₹ {Number(row.newTotalPolicyPremium || row.newPremiumAmount || row.newPremium || row.totalPolicyPremium || row.premiumQuote || row.premiumAmount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Chip label="3. Finance Approval" size="small" variant="outlined" sx={{ color: "#2563eb", borderColor: "#bfdbfe" }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#16a34a" }}>Finance Manager</TableCell>
                        <TableCell>
                          <Chip
                            label={row.financialApprovalStatus || "Pending"}
                            size="small"
                            color={row.financialApprovalStatus === "Approved" ? "success" : row.financialApprovalStatus === "Rejected" ? "error" : "warning"}
                            sx={{ fontWeight: 600, borderRadius: "6px" }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircle fontSize="small" />}
                            onClick={() => onOpenApproval(row)}
                            sx={{
                              borderRadius: "8px",
                              textTransform: "none",
                              fontWeight: 600,
                              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                            }}
                          >
                            Review & Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* TAB 4: PAYMENT & UTR STAGE */}
      {mainTab === 3 && (
        <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
          <Box sx={{ p: 2.5, bgcolor: "#f8fafc", borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
              Payment & UTR Stage (Approved Policies)
            </Typography>
            <Typography variant="body2" color="#64748b">
              Policies approved by Finance Manager. Enter UTR details to complete renewal.
            </Typography>
          </Box>

          {paymentUtrLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
              <CircularProgress size={32} sx={{ color: "#2563eb" }} />
            </Box>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#0f172a" }}>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Reg No</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Owner</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>PR Number</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Financial Approval</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Renewed Premium (₹)</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Payment UTR</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Payment Date</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Renewal Status</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }} align="center">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentUtrRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: "#64748b" }}>
                        No approved policies pending payment UTR at this time
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentUtrRecords.map((row) => (
                      <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => onOpenPaymentUtr && onOpenPaymentUtr(row)}>
                        <TableCell sx={{ fontWeight: 700, color: "#2563eb" }}>{row.registrationNo}</TableCell>
                        <TableCell sx={{ color: "#334155" }}>{row.owner || "-"}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.prNumber || "N/A"}</TableCell>
                        <TableCell>
                          <Chip label={row.financialApprovalStatus || "Approved"} size="small" color="success" sx={{ borderRadius: "6px", fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>
                          ₹ {Number(row.newTotalPolicyPremium || row.totalPolicyPremium || row.premiumQuote || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.paymentUtr || "Pending UTR"}</TableCell>
                        <TableCell>{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.renewalStatus || (row.paymentUtr ? "Renewed" : "Pending")}
                            size="small"
                            color={row.renewalStatus === "Renewed" || row.paymentUtr ? "success" : "warning"}
                            sx={{ borderRadius: "6px", fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircle fontSize="small" />}
                            onClick={() => onOpenPaymentUtr && onOpenPaymentUtr(row)}
                            sx={{
                              borderRadius: "8px",
                              textTransform: "none",
                              fontWeight: 600,
                              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                            }}
                          >
                            {row.paymentUtr ? "View / Edit UTR" : "Enter UTR & Complete"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default React.memo(FleetInsuranceList);


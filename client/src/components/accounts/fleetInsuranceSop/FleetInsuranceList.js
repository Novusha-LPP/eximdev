import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { UserContext } from "../../../contexts/UserContext";
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
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import { toast } from "react-hot-toast";

import {
  Edit,
  Delete,
  GetApp,
  Add,
  FileDownload,
  Visibility,
  Autorenew,
  CheckCircle,
  HourglassEmpty,
  History,
  DirectionsCar,
  Sync,
  Search,
  Clear
} from "@mui/icons-material";

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

  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin" || user?.role === "admin";
  const [allowedUserTabs, setAllowedUserTabs] = useState([]);

  useEffect(() => {
    async function fetchUserTabs() {
      if (user?.username && !isAdmin) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/user-tabs/${user.username}`
          );
          if (res.data?.success && Array.isArray(res.data.allowed_tabs)) {
            setAllowedUserTabs(res.data.allowed_tabs);
          }
        } catch (err) {
          console.error("Error fetching fleet insurance user tabs:", err);
        }
      }
    }
    fetchUserTabs();
  }, [user, isAdmin]);

  const isTabVisible = React.useCallback((tabIndex) => {
    if (isAdmin || allowedUserTabs.length === 0) return true;
    switch (tabIndex) {
      case 0: // Vehicle Records
      case 1: // Policy History & Dashboard (auto-included with Vehicle Records)
        return allowedUserTabs.includes("Vehicle Records");
      case 2: // Approval
        return allowedUserTabs.includes("Approval");
      case 3: // Payment & UTR
        return allowedUserTabs.includes("Payment & UTR");
      default:
        return true;
    }
  }, [isAdmin, allowedUserTabs]);

  useEffect(() => {
    if (!isAdmin && allowedUserTabs.length > 0 && !isTabVisible(mainTab)) {
      const firstAllowed = [0, 1, 2, 3].find((idx) => isTabVisible(idx));
      if (firstAllowed !== undefined) {
        setMainTab(firstAllowed);
      }
    }
  }, [allowedUserTabs, mainTab, isAdmin, isTabVisible]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [filters, setFilters] = useState({
    regNo: "",
    owner: "",
    size: "",
    modelType: "",
    premiumAmount: "",
    newTotalPolicyPremium: "",
    expiryDate: "",
    renewalDate: "",
    tat: "",
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

  // Inline Financial Approval Dialog state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedApprovalRow, setSelectedApprovalRow] = useState(null);
  const [approvalDecision, setApprovalDecision] = useState("Approved");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Inline Payment & UTR Dialog state
  const [paymentUtrDialogOpen, setPaymentUtrDialogOpen] = useState(false);
  const [selectedPaymentRow, setSelectedPaymentRow] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [submittingPaymentUtr, setSubmittingPaymentUtr] = useState(false);

  const handleOpenInlineApproval = (row) => {
    setSelectedApprovalRow(row);
    setApprovalDecision(row.financialApprovalStatus === "Rejected" ? "Rejected" : "Approved");
    setApprovalRemarks(row.financialApprovalRemarks || row.remarks || "");
    setApprovalDialogOpen(true);
  };

  const handleSaveInlineApproval = async () => {
    if (!selectedApprovalRow?._id) return;
    setSubmittingApproval(true);
    try {
      const payload = {
        ...selectedApprovalRow,
        financialApprovalStatus: approvalDecision,
        financialApprovalRemarks: approvalRemarks,
        workflowStage: approvalDecision === "Approved" ? 4 : 3,
        stageStatus: approvalDecision === "Approved" ? "Approved" : "Pending",
      };
      await axios.put(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${selectedApprovalRow._id}`, payload);
      toast.success(`Approval status updated to "${approvalDecision}" for ${selectedApprovalRow.registrationNo}`);
      setApprovalDialogOpen(false);
      setSelectedApprovalRow(null);
      fetchApprovalRecords();
      fetchPaymentUtrRecords();
      fetchRecords();
    } catch (err) {
      console.error("Error saving financial approval:", err);
      toast.error(err.response?.data?.message || "Failed to update financial approval");
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleOpenInlinePaymentUtr = (row) => {
    setSelectedPaymentRow(row);
    setUtrNumber(row.paymentUtr || "");
    const today = new Date().toISOString().split("T")[0];
    const pDate = row.paymentDate ? new Date(row.paymentDate).toISOString().split("T")[0] : today;
    const rDate = row.renewalDate ? new Date(row.renewalDate).toISOString().split("T")[0] : pDate;
    setPaymentDate(pDate);
    setRenewalDate(rDate);
    setPaymentUtrDialogOpen(true);
  };

  const handleSaveInlinePaymentUtr = async () => {
    if (!selectedPaymentRow?._id) return;
    if (!utrNumber.trim()) {
      toast.error("Please enter the Payment UTR Number");
      return;
    }
    setSubmittingPaymentUtr(true);
    try {
      const payload = {
        ...selectedPaymentRow,
        paymentUtr: utrNumber.trim().toUpperCase(),
        paymentDate: paymentDate || new Date().toISOString().split("T")[0],
        renewalDate: renewalDate || paymentDate || new Date().toISOString().split("T")[0],
        renewed: "YES",
        renewalStatus: "Renewed",
        stageStatus: "Renewed",
        workflowStage: 4,
      };

      if (selectedPaymentRow.newInsuranceCompany) payload.insuranceCompany = selectedPaymentRow.newInsuranceCompany;
      if (selectedPaymentRow.newPolicyNo) payload.policyNo = selectedPaymentRow.newPolicyNo;
      if (selectedPaymentRow.newPolicyFromDate) payload.policyFromDate = selectedPaymentRow.newPolicyFromDate;
      if (selectedPaymentRow.newPolicyToDate) payload.policyToDate = selectedPaymentRow.newPolicyToDate;
      if (selectedPaymentRow.newTotalIdv) payload.totalIdv = selectedPaymentRow.newTotalIdv;
      if (selectedPaymentRow.newTotalPolicyPremium) payload.totalPolicyPremium = selectedPaymentRow.newTotalPolicyPremium;
      if (selectedPaymentRow.newPremiumAmount) payload.premiumAmount = selectedPaymentRow.newPremiumAmount;

      await axios.put(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${selectedPaymentRow._id}`, payload);
      toast.success(`Payment UTR saved successfully for ${selectedPaymentRow.registrationNo}! Policy renewed.`);
      setPaymentUtrDialogOpen(false);
      setSelectedPaymentRow(null);
      fetchPaymentUtrRecords();
      fetchApprovalRecords();
      fetchRecords();
    } catch (err) {
      console.error("Error saving payment UTR:", err);
      toast.error(err.response?.data?.message || "Failed to save payment UTR");
    } finally {
      setSubmittingPaymentUtr(false);
    }
  };

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

  const handleSyncVehicles = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/sync-from-vehicles`);
      toast.success(res.data?.message || "Vehicles synced from directory!");
      fetchRecords();
      fetchFilterOptions();
    } catch (err) {
      console.error("Error syncing vehicles:", err);
      toast.error(err.response?.data?.message || "Failed to sync vehicles");
    } finally {
      setSyncing(false);
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

    if (diffDays <= 7) return "#dc2626"; // Expired or within 7 days threshold -> RED
    if (diffDays <= 15) return "#d97706"; // 8 to 15 days upcoming warning -> ORANGE
    return "#16a34a"; // More than 15 days -> GREEN
  };

  // Determine which stage a record is currently at
  const getStageStatus = (row) => {
    // 1-Month Before Expiry Rule:
    // If active policy expires within 30 days (1 month) or is already expired,
    // the "Renewed" status must be removed to initiate next year's renewal workflow.
    const expStr = row.policyToDate || row.newPolicyToDate || row.newExpiryDate;
    let isWithinOneMonth = false;
    if (expStr) {
      const exp = new Date(expStr);
      const now = new Date();
      exp.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) {
        isWithinOneMonth = true;
      }
    }

    if (!isWithinOneMonth && (String(row.renewed).toUpperCase() === "YES" || row.renewalStatus === "Renewed")) {
      return { label: "Renewed", color: "success" };
    }
    if (!isWithinOneMonth && row.paymentUtr) {
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

    // 1-Month Before Expiry Rule:
    // If active expiry date is within 30 days from now or past due, it is due for upcoming renewal
    // so the "Renewed" status must be removed.
    const activeExpiry = pDate || nDate;
    let isWithinOneMonthOfExpiry = false;
    if (activeExpiry) {
      const exp = new Date(activeExpiry);
      const now = new Date();
      exp.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);
      const daysToExpiry = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToExpiry <= 30) {
        isWithinOneMonthOfExpiry = true;
      }
    }

    const isOldRenewed = !isWithinOneMonthOfExpiry && (
      String(row.renewed).toUpperCase() === "YES" ||
      row.renewalStatus === "Renewed" ||
      Boolean(row.paymentUtr)
    );

    let rowTat = null;
    if (row.tat !== undefined && row.tat !== null && row.tat !== "") {
      rowTat = Number(row.tat);
    } else if (row.prDate && (row.paymentDate || row.renewalDate || row.renewedDate)) {
      const pr = new Date(row.prDate);
      const pay = new Date(row.paymentDate || row.renewalDate || row.renewedDate);
      if (!isNaN(pr.getTime()) && !isNaN(pay.getTime())) {
        rowTat = Math.max(0, Math.ceil((pay - pr) / (1000 * 60 * 60 * 24)));
      }
    }

    if (isMatchingNewPolicy && !isMatchingOldPolicy && !isMatchingRenewalDate) {
      // In the renewed policy cycle (e.g. August 2027), the policy expiring is nDate.
      // Has it been renewed AGAIN for the next year? Not yet!
      return {
        displayExpiry: nDate,
        displayRenewalDate: null,
        tat: null,
        isRenewed: false,
        stageStatus: { label: "Policy Proposal", color: "default" },
        previousPremium: row.newTotalPolicyPremium || row.newPremiumAmount || row.newPremium || row.totalPolicyPremium || row.premiumAmount,
        renewedPremium: null,
      };
    }

    // Default or matching old policy cycle (e.g. August 2026):
    return {
      displayExpiry: pDate || nDate,
      displayRenewalDate: rDate || row.renewalDate || row.renewedDate || null,
      tat: rowTat,
      isRenewed: isOldRenewed,
      stageStatus: isOldRenewed ? { label: "Renewed", color: "success" } : getStageStatus(row),
      previousPremium: row.totalPolicyPremium || row.premiumAmount,
      renewedPremium: isOldRenewed ? (row.newTotalPolicyPremium || row.newPremiumAmount || row.newPremium) : null,
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
      {/* Top Operational Metrics Header Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.8,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(37, 99, 235, 0.1)", color: "#2563eb", width: 44, height: 44 }}>
              <DirectionsCar sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Fleet Records
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {total}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.8,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "linear-gradient(135deg, #ffffff 0%, #fffbe6 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(217, 119, 6, 0.1)", color: "#d97706", width: 44, height: 44 }}>
              <HourglassEmpty sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Expiring Soon (7 Days)
              </Typography>
              <Typography sx={{ fontWeight: 700, color: expiringRecords.length > 0 ? "#dc2626" : "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {expiringRecords.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.8,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", width: 44, height: 44 }}>
              <CheckCircle sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Approval Pending
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {approvalRecords.length}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 1.8,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: "rgba(22, 163, 74, 0.1)", color: "#16a34a", width: 44, height: 44 }}>
              <Autorenew sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Payment & UTR Pending
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {paymentUtrRecords.filter((r) => !r.paymentUtr).length}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Surface Card */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "17px", letterSpacing: "-0.2px" }}>
              Fleet Insurance Tracker
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "12.5px" }}>
              Monitor vehicle policies, renewals, financial approvals, and payment UTRs
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              color="primary"
              size="medium"
              startIcon={syncing ? <CircularProgress size={16} /> : <Sync sx={{ fontSize: 18 }} />}
              disabled={syncing}
              onClick={handleSyncVehicles}
              sx={{
                borderRadius: "6px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12.5px",
                height: "36px",
                px: 2,
                borderColor: "#bfdbfe",
                color: "#1d4ed8",
                "&:hover": { borderColor: "#93c5fd", bgcolor: "#eff6ff" },
              }}
            >
              {syncing ? "Syncing..." : "Sync Directory"}
            </Button>
            <Button
              variant="outlined"
              color="success"
              size="medium"
              startIcon={<FileDownload sx={{ fontSize: 18 }} />}
              onClick={handleBulkExport}
              sx={{
                borderRadius: "6px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12.5px",
                height: "36px",
                px: 2,
                borderColor: "#bbf7d0",
                color: "#166534",
                "&:hover": { borderColor: "#86efac", bgcolor: "#f0fdf4" },
              }}
            >
              Monthly Report
            </Button>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<FileDownload sx={{ fontSize: 18 }} />}
              onClick={handleDownloadTemplate}
              sx={{
                borderRadius: "6px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12.5px",
                height: "36px",
                px: 2,
                borderColor: "#cbd5e1",
                color: "#475569",
                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
              }}
            >
              Excel Template
            </Button>
            {isTabVisible(0) && (
              <Button
                variant="contained"
                size="medium"
                startIcon={<Add sx={{ fontSize: 18 }} />}
                onClick={onCreate}
                sx={{
                  borderRadius: "6px",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "12.5px",
                  height: "36px",
                  px: 2.2,
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                  },
                }}
              >
                Add Vehicle Record
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Four Subtabs: Vehicle Records, Policy History & Dashboard, Approval, Payment & UTR */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1.8 }}>
          <Tabs
            value={mainTab}
            onChange={(e, val) => setMainTab(val)}
            aria-label="fleet insurance top tabs"
            sx={{
              minHeight: 40,
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 2.5,
                borderRadius: 1,
              },
            }}
          >
            {isTabVisible(0) && (
              <Tab
                label="Vehicle Records"
                value={0}
                id="fleet-tab-0"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
            {isTabVisible(1) && (
              <Tab
                label="Policy History & Dashboard"
                value={1}
                id="fleet-tab-1"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
            {isTabVisible(2) && (
              <Tab
                label={
                  <Badge badgeContent={approvalRecords.length} color="error" offset={[10, 0]}>
                    Approval
                  </Badge>
                }
                value={2}
                id="fleet-tab-2"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
            {isTabVisible(3) && (
              <Tab
                label={
                  <Badge badgeContent={paymentUtrRecords.filter((r) => !r.paymentUtr).length} color="success" offset={[10, 0]}>
                    Payment & UTR
                  </Badge>
                }
                value={3}
                id="fleet-tab-3"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
          </Tabs>
        </Box>

        {mainTab === 0 && (
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={6}>
              <TextField
                placeholder="Search by Reg No, Owner, Insurer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch("")}>
                        <Clear sx={{ color: "#94a3b8", fontSize: 18 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "6px",
                    bgcolor: "#fafaff",
                    height: 38,
                    fontSize: "13px",
                    "& fieldset": { borderColor: "#cbd5e1" },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={3}>
              <TextField
                select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "6px",
                    bgcolor: "#fafaff",
                    height: 38,
                    fontSize: "13px",
                    "& fieldset": { borderColor: "#cbd5e1" },
                  },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "13px" }}>All Months</MenuItem>
                <MenuItem value="1" sx={{ fontSize: "13px" }}>January</MenuItem>
                <MenuItem value="2" sx={{ fontSize: "13px" }}>February</MenuItem>
                <MenuItem value="3" sx={{ fontSize: "13px" }}>March</MenuItem>
                <MenuItem value="4" sx={{ fontSize: "13px" }}>April</MenuItem>
                <MenuItem value="5" sx={{ fontSize: "13px" }}>May</MenuItem>
                <MenuItem value="6" sx={{ fontSize: "13px" }}>June</MenuItem>
                <MenuItem value="7" sx={{ fontSize: "13px" }}>July</MenuItem>
                <MenuItem value="8" sx={{ fontSize: "13px" }}>August</MenuItem>
                <MenuItem value="9" sx={{ fontSize: "13px" }}>September</MenuItem>
                <MenuItem value="10" sx={{ fontSize: "13px" }}>October</MenuItem>
                <MenuItem value="11" sx={{ fontSize: "13px" }}>November</MenuItem>
                <MenuItem value="12" sx={{ fontSize: "13px" }}>December</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3} md={3}>
              <TextField
                select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "6px",
                    bgcolor: "#fafaff",
                    height: 38,
                    fontSize: "13px",
                    "& fieldset": { borderColor: "#cbd5e1" },
                  },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "13px" }}>All Years</MenuItem>
                <MenuItem value="2024" sx={{ fontSize: "13px" }}>2024</MenuItem>
                <MenuItem value="2025" sx={{ fontSize: "13px" }}>2025</MenuItem>
                <MenuItem value="2026" sx={{ fontSize: "13px" }}>2026</MenuItem>
                <MenuItem value="2027" sx={{ fontSize: "13px" }}>2027</MenuItem>
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
        <Paper elevation={0} sx={{ borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={28} sx={{ color: "#2563eb" }} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead
                  sx={{
                    "& .MuiTableCell-head": {
                      bgcolor: "#0f172a !important",
                      color: "#ffffff !important",
                      fontWeight: "700 !important",
                      fontSize: "12.5px !important",
                      py: "10px !important",
                      px: "12px !important",
                      borderBottom: "none",
                    },
                  }}
                >
                  <TableRow>
                    <TableCell>Reg No</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Previous Premium (₹)</TableCell>
                    <TableCell>Renewed Premium (₹)</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Renewal Date</TableCell>
                    <TableCell align="center">TAT (Days)</TableCell>
                    <TableCell>Renewed?</TableCell>
                    <TableCell>Stage Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 4, color: "#64748b", fontSize: "12px" }}>
                        No fleet insurance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => {
                      const ctx = getContextualRowDetails(row, month, year);
                      return (
                        <TableRow key={row._id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                          <TableCell
                            sx={{ fontWeight: 700, color: "#2563eb", cursor: "pointer", fontSize: "11.5px", py: 0.4, px: 0.8, "&:hover": { textDecoration: "underline" } }}
                            onClick={() => onEdit(row)}
                            title="Click to Edit Current Details"
                          >
                            {row.registrationNo}
                          </TableCell>
                          <TableCell sx={{ color: "#334155", fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.owner || "-"}</TableCell>
                          <TableCell sx={{ color: "#334155", fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.size || "-"}</TableCell>
                          <TableCell sx={{ color: "#334155", fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.modelType || "-"}</TableCell>
                          <TableCell sx={{ color: "#0f172a", fontWeight: 600, fontSize: "11.5px", py: 0.4, px: 0.8 }}>
                            {ctx.previousPremium
                              ? Number(ctx.previousPremium).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                              : "-"}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontSize: "11.5px",
                              py: 0.4,
                              px: 0.8,
                              color: ctx.renewedPremium && ctx.previousPremium ? (Number(ctx.renewedPremium) > Number(ctx.previousPremium) ? "#dc2626" : Number(ctx.renewedPremium) < Number(ctx.previousPremium) ? "#16a34a" : "inherit") : "inherit",
                              fontWeight: ctx.renewedPremium && ctx.previousPremium && Number(ctx.renewedPremium) !== Number(ctx.previousPremium) ? 700 : 400,
                            }}
                          >
                            {ctx.renewedPremium ? Number(ctx.renewedPremium).toLocaleString("en-IN", { style: "currency", currency: "INR" }) : "-"}
                          </TableCell>
                          <TableCell sx={{ color: getExpiryDateColor(ctx.displayExpiry), fontWeight: 700, fontSize: "11.5px", py: 0.4, px: 0.8 }}>
                            {ctx.displayExpiry ? new Date(ctx.displayExpiry).toLocaleDateString("en-IN") : "-"}
                          </TableCell>
                          <TableCell sx={{ color: "#16a34a", fontWeight: 700, fontSize: "11.5px", py: 0.4, px: 0.8 }}>
                            {ctx.displayRenewalDate ? new Date(ctx.displayRenewalDate).toLocaleDateString("en-IN") : "-"}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.4, px: 0.8 }}>
                            {ctx.tat !== null && ctx.tat !== undefined ? (
                              <Chip
                                label={`${ctx.tat} ${ctx.tat === 1 ? "day" : "days"}`}
                                size="small"
                                sx={{
                                  bgcolor: "#f1f5f9",
                                  color: "#334155",
                                  fontWeight: 700,
                                  fontSize: "10px",
                                  height: 19,
                                  borderRadius: "4px",
                                }}
                              />
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: "11.5px", py: 0.4, px: 0.8, color: ctx.isRenewed ? "#16a34a" : "#64748b" }}>
                            <Chip
                              label={ctx.isRenewed ? "YES" : "NO"}
                              size="small"
                              sx={{
                                bgcolor: ctx.isRenewed ? "#dcfce7" : "#f1f5f9",
                                color: ctx.isRenewed ? "#15803d" : "#475569",
                                fontWeight: 700,
                                fontSize: "10px",
                                height: 19,
                                borderRadius: "4px",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 0.4, px: 0.8 }}>
                            <Chip
                              label={ctx.stageStatus.label}
                              size="small"
                              sx={{
                                borderRadius: "4px",
                                fontWeight: 600,
                                fontSize: "10px",
                                height: 20,
                              }}
                              color={ctx.stageStatus.color}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.4, px: 0.5 }}>

                            <Stack direction="row" spacing={0.3} justifyContent="center">
                              <Tooltip title="Edit Details">
                                <IconButton size="small" onClick={() => onEdit(row)} sx={{ p: 0.3, color: "#2563eb" }}>
                                  <Edit sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Renew Policy">
                                <IconButton size="small" onClick={() => onRenew(row)} sx={{ p: 0.3, color: "#16a34a" }}>
                                  <Autorenew sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="History Dashboard">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedHistoryRegNo(row.registrationNo);
                                    setMainTab(1);
                                  }}
                                  sx={{ p: 0.3, color: "#0284c7" }}
                                >
                                  <History sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Export Record">
                                <IconButton size="small" onClick={() => handleExport(row._id, row.registrationNo)} sx={{ p: 0.3, color: "#64748b" }}>
                                  <GetApp sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <Tooltip title="Delete Record">
                                  <IconButton size="small" onClick={() => handleDelete(row._id)} sx={{ p: 0.3, color: "#dc2626" }}>
                                    <Delete sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
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

      {/* TAB 3: APPROVAL STAGE */}
      {mainTab === 2 && (
        <Paper elevation={0} sx={{ borderRadius: "6px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
              Pending Financial Approvals
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "11px" }}>
              Approve or reject PRs generated for vehicle insurance renewals.
            </Typography>
          </Box>

          {approvalLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={32} sx={{ color: "#2563eb" }} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead
                  sx={{
                    "& .MuiTableCell-head": {
                      bgcolor: "#0f172a !important",
                      color: "#ffffff !important",
                      fontWeight: "700 !important",
                      fontSize: "12.5px !important",
                      py: "10px !important",
                      px: "12px !important",
                      borderBottom: "none",
                    },
                  }}
                >
                  <TableRow>
                    <TableCell>Reg No</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>PR Number</TableCell>
                    <TableCell>PR Date</TableCell>
                    <TableCell>Premium Amount (₹)</TableCell>
                    <TableCell>Approval Stage</TableCell>
                    <TableCell>Assigned Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {approvalRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: "#64748b", fontSize: "13px" }}>
                        No pending approvals at this time
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvalRecords.map((row) => (
                      <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => handleOpenInlineApproval(row)}>
                        <TableCell sx={{ fontWeight: 700, color: "#2563eb", fontSize: "13px", py: 1, px: 1.2 }}>{row.registrationNo}</TableCell>
                        <TableCell sx={{ color: "#334155", fontSize: "12.5px", py: 1, px: 1.2 }}>{row.owner || "-"}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: "12.5px", py: 1, px: 1.2 }}>{row.prNumber || "N/A"}</TableCell>
                        <TableCell sx={{ fontSize: "12.5px", py: 1, px: 1.2 }}>{row.prDate ? new Date(row.prDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: "13px", py: 1, px: 1.2 }}>
                          ₹ {Number(row.newTotalPolicyPremium || row.newPremiumAmount || row.newPremium || row.totalPolicyPremium || row.premiumQuote || row.premiumAmount || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1.2 }}>
                          <Chip label="3. Finance Approval" size="small" variant="outlined" sx={{ color: "#2563eb", borderColor: "#bfdbfe", fontSize: "11px", height: 22 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#16a34a", fontSize: "12.5px", py: 1, px: 1.2 }}>Finance Manager</TableCell>
                        <TableCell sx={{ py: 1, px: 1.2 }}>
                          <Chip
                            label={row.financialApprovalStatus || "Pending"}
                            size="small"
                            color={row.financialApprovalStatus === "Approved" ? "success" : row.financialApprovalStatus === "Rejected" ? "error" : "warning"}
                            sx={{ fontWeight: 700, borderRadius: "6px", fontSize: "11px", height: 22 }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1, px: 1.2 }} onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                            onClick={() => handleOpenInlineApproval(row)}
                            sx={{
                              borderRadius: "6px",
                              textTransform: "none",
                              fontWeight: 600,
                              fontSize: "12px",
                              height: "30px",
                              px: 1.5,
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
        <Paper elevation={0} sx={{ borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "15px" }}>
              Payment & UTR Stage (Approved Policies)
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "12.5px" }}>
              Policies approved by Finance Manager. Enter UTR details to complete renewal.
            </Typography>
          </Box>

          {paymentUtrLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={32} sx={{ color: "#2563eb" }} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead
                  sx={{
                    "& .MuiTableCell-head": {
                      bgcolor: "#0f172a !important",
                      color: "#ffffff !important",
                      fontWeight: "700 !important",
                      fontSize: "12.5px !important",
                      py: "10px !important",
                      px: "12px !important",
                      borderBottom: "none",
                    },
                  }}
                >
                  <TableRow>
                    <TableCell>Reg No</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>PR Number</TableCell>
                    <TableCell>Financial Approval</TableCell>
                    <TableCell>Renewed Premium (₹)</TableCell>
                    <TableCell>Payment UTR</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Renewal Status</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentUtrRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: "#64748b", fontSize: "12px" }}>
                        No approved policies pending payment UTR at this time
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentUtrRecords.map((row) => (
                      <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => handleOpenInlinePaymentUtr(row)}>
                        <TableCell sx={{ fontWeight: 700, color: "#2563eb", fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.registrationNo}</TableCell>
                        <TableCell sx={{ color: "#334155", fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.owner || "-"}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.prNumber || "N/A"}</TableCell>
                        <TableCell sx={{ py: 0.4, px: 0.8 }}>
                          <Chip label={row.financialApprovalStatus || "Approved"} size="small" color="success" sx={{ borderRadius: "4px", fontWeight: 600, fontSize: "10px", height: 19 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: "11.5px", py: 0.4, px: 0.8 }}>
                          ₹ {Number(row.newTotalPolicyPremium || row.totalPolicyPremium || row.premiumQuote || 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.paymentUtr || "Pending UTR"}</TableCell>
                        <TableCell sx={{ fontSize: "11.5px", py: 0.4, px: 0.8 }}>{row.paymentDate ? new Date(row.paymentDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                        <TableCell sx={{ py: 0.4, px: 0.8 }}>
                          <Chip
                            label={row.renewalStatus || (row.paymentUtr ? "Renewed" : "Pending")}
                            size="small"
                            color={row.renewalStatus === "Renewed" || row.paymentUtr ? "success" : "warning"}
                            sx={{ borderRadius: "4px", fontWeight: 600, fontSize: "10px", height: 19 }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.4, px: 0.8 }} onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                            onClick={() => handleOpenInlinePaymentUtr(row)}
                            sx={{
                              borderRadius: "4px",
                              textTransform: "none",
                              fontWeight: 600,
                              fontSize: "11px",
                              height: "26px",
                              px: 1.2,
                              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                            }}
                          >
                            {row.paymentUtr ? "View / Edit UTR" : "Enter UTR"}
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

      {/* ─── INLINE FINANCIAL APPROVAL DIALOG ─── */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => !submittingApproval && setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "10px", overflow: "hidden" },
        }}
      >
        <DialogTitle sx={{ bgcolor: "#0f172a", color: "#ffffff", py: 1.5, px: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "16px" }}>Financial Approval Review</Typography>
              <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
                {selectedApprovalRow?.registrationNo} &bull; PR #{selectedApprovalRow?.prNumber || "N/A"}
              </Typography>
            </Box>
            <Chip
              label={approvalDecision}
              color={approvalDecision === "Approved" ? "success" : approvalDecision === "Rejected" ? "error" : "warning"}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
          {selectedApprovalRow && (
            <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: "6px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>REGISTRATION NO</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#2563eb", fontSize: "13px" }}>{selectedApprovalRow.registrationNo}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>OWNER</Typography>
                  <Typography sx={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>{selectedApprovalRow.owner || "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>INSURANCE COMPANY</Typography>
                  <Typography sx={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                    {selectedApprovalRow.newInsuranceCompany || selectedApprovalRow.insuranceCompany || "-"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>REQUESTED PREMIUM</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#166534", fontSize: "14px" }}>
                    ₹ {Number(selectedApprovalRow.newTotalPolicyPremium || selectedApprovalRow.totalPolicyPremium || selectedApprovalRow.premiumAmount || 0).toLocaleString("en-IN")}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#334155", mb: 0.5 }}>
                APPROVAL STATUS *
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={approvalDecision}
                onChange={(e) => setApprovalDecision(e.target.value)}
                sx={{ bgcolor: "#ffffff" }}
              >
                <MenuItem value="Approved" sx={{ color: "#166534", fontWeight: 600 }}>
                  ✓ Approved
                </MenuItem>
                <MenuItem value="Pending" sx={{ color: "#b45309", fontWeight: 600 }}>
                  ⏳ Pending
                </MenuItem>
                <MenuItem value="Rejected" sx={{ color: "#dc2626", fontWeight: 600 }}>
                  ✕ Rejected
                </MenuItem>
              </TextField>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#334155", mb: 0.5 }}>
                APPROVAL REMARKS / NOTES (OPTIONAL)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Enter any approval condition, remarks or notes..."
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                sx={{ bgcolor: "#ffffff" }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => setApprovalDialogOpen(false)}
            disabled={submittingApproval}
            sx={{ textTransform: "none", color: "#64748b", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveInlineApproval}
            disabled={submittingApproval}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              background: approvalDecision === "Approved" ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" : approvalDecision === "Rejected" ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            }}
          >
            {submittingApproval ? "Saving..." : `Confirm & Save (${approvalDecision})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── INLINE PAYMENT & UTR DIALOG ─── */}
      <Dialog
        open={paymentUtrDialogOpen}
        onClose={() => !submittingPaymentUtr && setPaymentUtrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "10px", overflow: "hidden" },
        }}
      >
        <DialogTitle sx={{ bgcolor: "#0f172a", color: "#ffffff", py: 1.5, px: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "16px" }}>Record Payment & UTR</Typography>
              <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
                {selectedPaymentRow?.registrationNo} &bull; PR #{selectedPaymentRow?.prNumber || "N/A"}
              </Typography>
            </Box>
            <Chip
              label="Approved by Finance"
              color="success"
              size="small"
              sx={{ fontWeight: 700, height: 22, fontSize: "11px" }}
            />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
          {selectedPaymentRow && (
            <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: "6px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>REGISTRATION NO</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#2563eb", fontSize: "13px" }}>{selectedPaymentRow.registrationNo}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>OWNER</Typography>
                  <Typography sx={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>{selectedPaymentRow.owner || "-"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>INSURANCE COMPANY</Typography>
                  <Typography sx={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                    {selectedPaymentRow.newInsuranceCompany || selectedPaymentRow.insuranceCompany || "-"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>RENEWED PREMIUM</Typography>
                  <Typography sx={{ fontWeight: 800, color: "#166534", fontSize: "14px" }}>
                    ₹ {Number(selectedPaymentRow.newTotalPolicyPremium || selectedPaymentRow.totalPolicyPremium || selectedPaymentRow.premiumAmount || 0).toLocaleString("en-IN")}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#334155", mb: 0.5 }}>
                PAYMENT UTR NO. *
              </Typography>
              <TextField
                fullWidth
                size="small"
                autoFocus
                placeholder="e.g. UTR12345678 or Bank Ref No"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                sx={{
                  bgcolor: "#ffffff",
                  "& input": { fontWeight: 700, color: "#1e40af", letterSpacing: 0.5 },
                }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#334155", mb: 0.5 }}>
                  PAYMENT DATE
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  sx={{ bgcolor: "#ffffff" }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography sx={{ fontWeight: 600, fontSize: "12px", color: "#334155", mb: 0.5 }}>
                  RENEWAL DATE
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  sx={{ bgcolor: "#ffffff" }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => setPaymentUtrDialogOpen(false)}
            disabled={submittingPaymentUtr}
            sx={{ textTransform: "none", color: "#64748b", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveInlinePaymentUtr}
            disabled={submittingPaymentUtr}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            }}
          >
            {submittingPaymentUtr ? "Saving..." : "Save UTR & Complete Renewal"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default React.memo(FleetInsuranceList);



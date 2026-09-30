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
  Drawer,
  Snackbar,
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
  Clear,
  AttachFile,
  RestartAlt,
  CalendarToday,
  Close,
  Cancel,
  FlashOn,
  Launch
} from "@mui/icons-material";
import FleetInsuranceHistory from "./FleetInsuranceHistory";
import FleetInsuranceAttachmentsModal from "./FleetInsuranceAttachmentsModal";

function FleetInsuranceList({ onViewHistory, onRenew, onCreate, onOpenApproval, onOpenPaymentUtr, onEdit, onView }) {
  const [mainTab, setMainTab] = useState(0); // 0 = Vehicle Records, 1 = Policy History Dashboard, 2 = Approval, 3 = Payment & UTR
  const [selectedHistoryRegNo, setSelectedHistoryRegNo] = useState("");
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [selectedAttachmentsVehicle, setSelectedAttachmentsVehicle] = useState(null);

  const handleOpenAttachments = (row) => {
    setSelectedAttachmentsVehicle(row);
    setAttachmentsModalOpen(true);
  };

  const [approvalRecords, setApprovalRecords] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [selectedApprovalRecord, setSelectedApprovalRecord] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalSnackbar, setApprovalSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [paymentUtrRecords, setPaymentUtrRecords] = useState([]);
  const [paymentUtrLoading, setPaymentUtrLoading] = useState(false);

  const { user } = useContext(UserContext);
  const userRole = (user?.role || "").toLowerCase();
  const userIdentity = [user?.username, user?.first_name, user?.middle_name, user?.last_name]
    .filter(Boolean).join(" ").replace(/[^a-z]/gi, "").toLowerCase();
  const isAjay = (user?.username || "").toLowerCase().includes("ajay") || userIdentity.includes("ajay");
  const isGlobalAdmin = userRole === "admin" || userRole === "superadmin" || isAjay;

  const [allowedUserTabs, setAllowedUserTabs] = useState([]);
  const [tabsLoaded, setTabsLoaded] = useState(false);

  useEffect(() => {
    async function fetchUserTabs() {
      if (!user?.username) return;
      if (isGlobalAdmin) {
        setTabsLoaded(true);
        return;
      }
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/user-tabs/${user.username}`
        );
        if (res.data?.success && Array.isArray(res.data.allowed_tabs)) {
          setAllowedUserTabs(res.data.allowed_tabs);
        }
      } catch (err) {
        console.error("Error fetching fleet insurance user tabs:", err);
      } finally {
        setTabsLoaded(true);
      }
    }
    fetchUserTabs();
  }, [user, isGlobalAdmin]);

  // If user has no restricted tabs assigned (allowedUserTabs.length === 0), they get unrestricted admin rights for this module by default
  const hasModuleAdmin = isGlobalAdmin || (tabsLoaded && allowedUserTabs.length === 0) || allowedUserTabs.includes("Policy History & Dashboard");
  const isAdmin = hasModuleAdmin;
  const canDelete = hasModuleAdmin;

  const isTabVisible = React.useCallback((tabIndex) => {
    if (isGlobalAdmin || allowedUserTabs.length === 0) return true;
    switch (tabIndex) {
      case 0: // Vehicle Records
        return allowedUserTabs.includes("Vehicle Records");
      case 1: // Policy History & Dashboard
        return allowedUserTabs.includes("Policy History & Dashboard");
      case 2: // Approval
        return allowedUserTabs.includes("Approval");
      case 3: // Payment & UTR
        return allowedUserTabs.includes("Payment & UTR");
      default:
        return true;
    }
  }, [isGlobalAdmin, allowedUserTabs]);

  useEffect(() => {
    if (!isGlobalAdmin && allowedUserTabs.length > 0 && !isTabVisible(mainTab)) {
      const firstAllowed = [0, 1, 2, 3].find((idx) => isTabVisible(idx));
      if (firstAllowed !== undefined) {
        setMainTab(firstAllowed);
      }
    }
  }, [allowedUserTabs, mainTab, isGlobalAdmin, isTabVisible]);

  const getSavedFleetFilters = () => {
    try {
      const saved = localStorage.getItem("fleet_insurance_list_filters");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error loading fleet insurance filters from storage:", e);
    }
    return null;
  };

  const savedFleetFilters = React.useMemo(() => getSavedFleetFilters(), []);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [page, setPage] = useState(() => (savedFleetFilters?.page !== undefined ? savedFleetFilters.page : 0));
  const [rowsPerPage, setRowsPerPage] = useState(() => savedFleetFilters?.rowsPerPage || 10);
  const [search, setSearch] = useState(() => savedFleetFilters?.search || "");
  const [month, setMonth] = useState(() => (savedFleetFilters?.month !== undefined ? savedFleetFilters.month : String(currentMonth)));
  const [year, setYear] = useState(() => (savedFleetFilters?.year !== undefined ? savedFleetFilters.year : String(currentYear)));
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [filters, setFilters] = useState(() => savedFleetFilters?.filters || {
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

  // Persist fleet filters
  useEffect(() => {
    try {
      const toSave = {
        search,
        month,
        year,
        page,
        rowsPerPage,
        filters
      };
      localStorage.setItem("fleet_insurance_list_filters", JSON.stringify(toSave));
    } catch (e) {
      console.error("Error saving fleet insurance filters to storage:", e);
    }
  }, [search, month, year, page, rowsPerPage, filters]);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (search && search.trim()) count++;
    if (month && month !== String(currentMonth)) count++;
    if (year && year !== String(currentYear)) count++;
    if (filters) {
      Object.values(filters).forEach(val => {
        if (val && String(val).trim()) count++;
      });
    }
    return count;
  }, [search, month, year, filters, currentMonth, currentYear]);

  const hasActiveFilters = Boolean(
    search.trim() ||
    (month !== "" && month !== String(currentMonth)) ||
    (year !== "" && year !== String(currentYear)) ||
    Object.values(filters).some(v => Boolean(v && String(v).trim()))
  );

  const handleClearAllFilters = () => {
    setSearch("");
    setMonth("");
    setYear("");
    setFilters({
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
    setPage(0);
    try {
      localStorage.removeItem("fleet_insurance_list_filters");
    } catch (e) { }
    toast.success("All filters cleared");
  };

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

  const handleOneClickApprove = async (record) => {
    if (!record || !record._id) return;
    setIsApproving(true);
    try {
      const payload = {
        financialApprovalStatus: "Approved",
        financialApprovalDate: new Date(),
        renewalStatus: "Pending"
      };
      await axios.put(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${record._id}`, payload);
      setApprovalSnackbar({
        open: true,
        message: `✓ Policy for ${record.registrationNo} approved successfully! Moved to Payment & UTR stage.`,
        severity: "success"
      });
      toast.success(`Vehicle ${record.registrationNo} approved!`);
      setSelectedApprovalRecord(null);
      fetchApprovalRecords();
      fetchPaymentUtrRecords();
      fetchRecords();
      window.dispatchEvent(new Event("fleet-insurance-updated"));
    } catch (err) {
      console.error("Error approving fleet insurance record:", err);
      setApprovalSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to approve record",
        severity: "error"
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleOneClickReject = async (record) => {
    if (!record || !record._id) return;
    const reason = window.prompt("Please specify a reason for rejecting this policy proposal:", "Premium quotation rejected by Finance Manager");
    if (reason === null) return;
    setIsApproving(true);
    try {
      const payload = {
        financialApprovalStatus: "Rejected",
        financialRejectionReason: reason || "Rejected by Finance Manager"
      };
      await axios.put(`${process.env.REACT_APP_API_STRING}/fleet-insurance-sop/${record._id}`, payload);
      setApprovalSnackbar({
        open: true,
        message: `✕ Proposal for ${record.registrationNo} marked as Rejected.`,
        severity: "info"
      });
      toast.error(`Vehicle ${record.registrationNo} rejected.`);
      setSelectedApprovalRecord(null);
      fetchApprovalRecords();
      fetchRecords();
      window.dispatchEvent(new Event("fleet-insurance-updated"));
    } catch (err) {
      console.error("Error rejecting record:", err);
      setApprovalSnackbar({
        open: true,
        message: err.response?.data?.message || "Failed to reject record",
        severity: "error"
      });
    } finally {
      setIsApproving(false);
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
      fetchApprovalRecords();
      fetchPaymentUtrRecords();
    }, 500);
    return () => clearTimeout(delay);
  }, [page, rowsPerPage, search, month, year, filters]);



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
      window.dispatchEvent(new Event("fleet-insurance-updated"));
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
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>Vehicle Records</span>
                    {expiringRecords.length > 0 && (
                      <Badge
                        badgeContent={expiringRecords.length}
                        color="error"
                        sx={{
                          ml: 0.5,
                          "& .MuiBadge-badge": {
                            fontSize: "10px",
                            height: "18px",
                            minWidth: "18px",
                            fontWeight: 700,
                            px: 0.5,
                          },
                        }}
                      />
                    )}
                  </Box>
                }
                value={0}
                id="fleet-tab-0"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: mainTab === 0 ? "#2563eb" : "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
            {isTabVisible(1) && (
              <Tab
                label="Policy History & Dashboard"
                value={1}
                id="fleet-tab-1"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: mainTab === 1 ? "#2563eb" : "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
            {isTabVisible(2) && (
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>Approval</span>
                    {approvalRecords.length > 0 && (
                      <Badge
                        badgeContent={approvalRecords.length}
                        color="error"
                        sx={{
                          ml: 0.5,
                          "& .MuiBadge-badge": {
                            fontSize: "10px",
                            height: "18px",
                            minWidth: "18px",
                            fontWeight: 700,
                            px: 0.5,
                          },
                        }}
                      />
                    )}
                  </Box>
                }
                value={2}
                id="fleet-tab-2"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: mainTab === 2 ? "#2563eb" : "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
            {isTabVisible(3) && (
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>Payment & UTR</span>
                    {paymentUtrRecords.filter((r) => !r.paymentUtr).length > 0 && (
                      <Badge
                        badgeContent={paymentUtrRecords.filter((r) => !r.paymentUtr).length}
                        color="warning"
                        sx={{
                          ml: 0.5,
                          "& .MuiBadge-badge": {
                            fontSize: "10px",
                            height: "18px",
                            minWidth: "18px",
                            fontWeight: 700,
                            px: 0.5,
                          },
                        }}
                      />
                    )}
                  </Box>
                }
                value={3}
                id="fleet-tab-3"
                sx={{ fontWeight: 600, fontSize: "13px", minHeight: 40, py: 1, px: 2, textTransform: "none", color: mainTab === 3 ? "#2563eb" : "#64748b", "&.Mui-selected": { color: "#2563eb", fontWeight: 700 } }}
              />
            )}
          </Tabs>
        </Box>

        {mainTab === 0 && (
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={6} md={5}>
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
            <Grid item xs={6} sm={3} md={2.5}>
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
            <Grid item xs={6} sm={3} md={2.5}>
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
            <Grid item xs={12} sm={12} md={2}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                fullWidth
                startIcon={<RestartAlt />}
                onClick={handleClearAllFilters}
                disabled={!hasActiveFilters}
                sx={{
                  height: 38,
                  borderRadius: "6px",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "12px",
                  borderColor: hasActiveFilters ? "#fca5a5" : "#e2e8f0",
                  color: hasActiveFilters ? "#dc2626" : "#94a3b8",
                  bgcolor: hasActiveFilters ? "#fef2f2" : "#f8fafc",
                  "&:hover": {
                    bgcolor: "#fee2e2",
                    borderColor: "#f87171",
                    color: "#b91c1c"
                  }
                }}
              >
                Clear All {activeFiltersCount > 0 ? `(${activeFiltersCount})` : "Filters"}
              </Button>
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
                    <TableCell>PR No</TableCell>
                    <TableCell>PR Date</TableCell>
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
                    <TableCell align="center">Attachments</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 4, color: "#64748b", fontSize: "12px" }}>
                        No fleet insurance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => {
                      const ctx = getContextualRowDetails(row, month, year);
                      let isExpiringSoon = false;
                      if (!ctx.isRenewed && ctx.displayExpiry) {
                        const exp = new Date(ctx.displayExpiry);
                        const now = new Date();
                        exp.setHours(0, 0, 0, 0);
                        now.setHours(0, 0, 0, 0);
                        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays <= 7) isExpiringSoon = true;
                      }

                      return (
                        <TableRow
                          key={row._id}
                          hover
                          sx={{
                            bgcolor: isExpiringSoon ? "#fff1f2 !important" : undefined,
                            borderLeft: isExpiringSoon ? "4px solid #dc2626 !important" : undefined,
                            "&:hover": { bgcolor: isExpiringSoon ? "#ffe4e6 !important" : "#f8fafc" }
                          }}
                        >
                          <TableCell
                            sx={{ fontWeight: 700, color: "#2563eb", cursor: "pointer", fontSize: "11.5px", py: 0.4, px: 0.8, "&:hover": { textDecoration: "underline" } }}
                            onClick={() => onEdit(row)}
                            title="Click to Edit Current Details"
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <span>{row.registrationNo}</span>
                              {isExpiringSoon && (
                                <Chip
                                  label="EXPIRING"
                                  size="small"
                                  color="error"
                                  sx={{ fontSize: "8.5px", height: 16, fontWeight: 800, px: 0.2 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: "#0284c7", fontWeight: 700, fontSize: "11.5px", py: 0.4, px: 0.8 }}>
                            {row.prNumber || "-"}
                          </TableCell>
                          <TableCell sx={{ color: "#334155", fontSize: "11.5px", py: 0.4, px: 0.8 }}>
                            {row.prDate ? new Date(row.prDate).toLocaleDateString("en-IN") : "-"}
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

                          {/* New Column: Attachments (Year-Wise Policy Documents) */}
                          <TableCell align="center" sx={{ py: 0.4, px: 0.8 }}>
                            {(() => {
                              const attList = Array.isArray(row.attachments) ? row.attachments : [];
                              const hasDoc = Boolean(row.policyDocumentUrl || row.policyDocument || row.previousPolicyDocumentUrl || attList.length > 0);
                              const totalCount = (row.policyDocumentUrl || row.policyDocument ? 1 : 0) + (row.previousPolicyDocumentUrl ? 1 : 0) + attList.length;

                              if (hasDoc) {
                                return (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AttachFile sx={{ fontSize: 13 }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAttachments(row);
                                    }}
                                    sx={{
                                      borderRadius: "16px",
                                      fontSize: "10.5px",
                                      fontWeight: 700,
                                      py: 0.2,
                                      px: 1,
                                      height: "22px",
                                      textTransform: "none",
                                      borderColor: "#93c5fd",
                                      color: "#1d4ed8",
                                      bgcolor: "#eff6ff",
                                      "&:hover": { bgcolor: "#dbeafe", borderColor: "#3b82f6" },
                                    }}
                                    title="Click to view year-wise policy documents"
                                  >
                                    {totalCount} {totalCount === 1 ? "Doc" : "Docs"}
                                  </Button>
                                );
                              }

                              return (
                                <Button
                                  variant="text"
                                  size="small"
                                  startIcon={<AttachFile sx={{ fontSize: 12, color: "#94a3b8" }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAttachments(row);
                                  }}
                                  sx={{
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    fontWeight: 600,
                                    py: 0.1,
                                    px: 0.8,
                                    height: "22px",
                                    textTransform: "none",
                                    color: "#64748b",
                                    "&:hover": { bgcolor: "#f1f5f9", color: "#1e293b" },
                                  }}
                                  title="Add or view year-wise policy attachments"
                                >
                                  + Doc
                                </Button>
                              );
                            })()}
                          </TableCell>

                          <TableCell align="center" sx={{ py: 0.4, px: 0.5 }}>

                            <Stack direction="row" spacing={0.3} justifyContent="center">
                              <Tooltip title="View Record">
                                <IconButton size="small" onClick={() => onView ? onView(row) : onEdit(row)} sx={{ p: 0.3, color: "#475569" }}>
                                  <Visibility sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
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
                              {isTabVisible(1) && (
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
                              )}
                              <Tooltip title="Export Record">
                                <IconButton size="small" onClick={() => handleExport(row._id, row.registrationNo)} sx={{ p: 0.3, color: "#64748b" }}>
                                  <GetApp sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              {canDelete && (
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
          canDelete={canDelete}
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
                      <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => setSelectedApprovalRecord(row)}>
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
                        <TableCell align="center" sx={{ py: 1, px: 1.2 }}>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApprovalRecord(row);
                            }}
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
                      <TableRow key={row._id} hover style={{ cursor: "pointer" }} onClick={() => onOpenPaymentUtr ? onOpenPaymentUtr(row) : onEdit(row)}>
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
                        <TableCell align="center" sx={{ py: 0.4, px: 0.8 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                            onClick={() => onOpenPaymentUtr ? onOpenPaymentUtr(row) : onEdit(row)}
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

      {/* Year-Wise Policy Attachments Modal */}
      {attachmentsModalOpen && (
        <FleetInsuranceAttachmentsModal
          open={attachmentsModalOpen}
          onClose={() => {
            setAttachmentsModalOpen(false);
            setSelectedAttachmentsVehicle(null);
          }}
          vehicleRecord={selectedAttachmentsVehicle}
          onUpdated={() => {
            fetchRecords();
            fetchApprovalRecords();
            fetchPaymentUtrRecords();
          }}
        />
      )}

      {/* ─── QUICK REVIEW & 1-CLICK APPROVAL DRAWER / SNACKBAR MODAL ─── */}
      <Drawer
        anchor="bottom"
        open={Boolean(selectedApprovalRecord)}
        onClose={() => setSelectedApprovalRecord(null)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            maxHeight: "90vh",
            maxWidth: "1050px",
            mx: "auto",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -8px 32px rgba(15, 23, 42, 0.25)",
            border: "1px solid #cbd5e1",
            bgcolor: "#fff"
          }
        }}
      >
        {selectedApprovalRecord && (() => {
          const row = selectedApprovalRecord;
          const expStr = row.policyToDate || row.newPolicyToDate || row.newExpiryDate;
          const expDate = expStr ? new Date(expStr) : null;
          const now = new Date();
          const diffDays = expDate ? Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)) : null;
          const isExpired = diffDays !== null && diffDays < 0;
          const isUrgent = diffDays !== null && diffDays >= 0 && diffDays <= 7;

          const totalPremium = Number(
            row.newTotalPolicyPremium ||
            row.newPremiumAmount ||
            row.newPremium ||
            row.totalPolicyPremium ||
            row.premiumQuote ||
            row.premiumAmount ||
            0
          );

          return (
            <>
              {/* Drawer Top Header */}
              <Box sx={{
                bgcolor: "#0f172a",
                color: "#ffffff",
                px: 3,
                py: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5
              }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                    <Chip
                      label="3. FINANCE APPROVAL • 1-CLICK REVIEW"
                      size="small"
                      sx={{ bgcolor: "#1e293b", color: "#60a5fa", fontWeight: 800, fontSize: "10.5px", height: 22 }}
                    />
                    <Typography sx={{ fontSize: "18px", fontWeight: 900, color: "#38bdf8", letterSpacing: "0.02em" }}>
                      {row.registrationNo}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "12.5px", color: "#94a3b8" }}>
                    Owner: <strong style={{ color: "#f8fafc" }}>{row.owner || "-"}</strong> • PR No: <strong style={{ color: "#f8fafc" }}>{row.prNumber || "N/A"}</strong> • PR Date: <strong style={{ color: "#f8fafc" }}>{row.prDate ? new Date(row.prDate).toLocaleDateString("en-IN") : "-"}</strong>
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={isApproving}
                    startIcon={isApproving ? <CircularProgress size={16} color="inherit" /> : <FlashOn sx={{ fontSize: 18 }} />}
                    onClick={() => handleOneClickApprove(row)}
                    sx={{
                      bgcolor: "#16a34a",
                      "&:hover": { bgcolor: "#15803d" },
                      fontWeight: 800,
                      fontSize: "13px",
                      textTransform: "none",
                      px: 2.5,
                      py: 0.8,
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(22, 163, 74, 0.4)"
                    }}
                  >
                    {isApproving ? "Approving..." : "1-Click Approve"}
                  </Button>
                  <IconButton onClick={() => setSelectedApprovalRecord(null)} sx={{ color: "#94a3b8", "&:hover": { color: "#fff", bgcolor: "#1e293b" } }}>
                    <Close />
                  </IconButton>
                </Box>
              </Box>

              {/* Drawer Body - Scrollable */}
              <Box sx={{ p: 3, overflowY: "auto", flex: 1, bgcolor: "#f8fafc" }}>
                {/* ─── HIGHLIGHTED EXPIRY DATE BANNER ─── */}
                <Box sx={{
                  background: isExpired 
                    ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)" 
                    : isUrgent 
                      ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" 
                      : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  border: isExpired 
                    ? "2.5px solid #dc2626" 
                    : isUrgent 
                      ? "2.5px solid #d97706" 
                      : "2.5px solid #2563eb",
                  borderRadius: "12px",
                  p: "14px 20px",
                  mb: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 2,
                  boxShadow: isExpired 
                    ? "0 4px 16px rgba(220, 38, 38, 0.22)" 
                    : "0 4px 14px rgba(37, 99, 235, 0.15)"
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      bgcolor: isExpired ? "#dc2626" : isUrgent ? "#d97706" : "#2563eb",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                    }}>
                      <CalendarToday sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography sx={{
                        fontSize: "11.5px",
                        fontWeight: 900,
                        color: isExpired ? "#991b1b" : isUrgent ? "#92400e" : "#1e40af",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.8
                      }}>
                        <span>⚠️</span> CURRENT POLICY EXPIRY DATE (HIGHLIGHTED)
                      </Typography>
                      <Typography sx={{
                        fontSize: "22px",
                        fontWeight: 900,
                        color: isExpired ? "#b91c1c" : isUrgent ? "#b45309" : "#1d4ed8",
                        letterSpacing: "-0.01em"
                      }}>
                        {expDate ? expDate.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "Date Not Available"}
                      </Typography>
                    </Box>
                  </Box>

                  <Chip
                    label={
                      isExpired 
                        ? `⚠️ EXPIRED ${Math.abs(diffDays)} DAYS AGO` 
                        : diffDays === 0 
                          ? "🔥 EXPIRES TODAY!" 
                          : `⏳ EXPIRES IN ${diffDays} DAYS`
                    }
                    sx={{
                      fontWeight: 900,
                      fontSize: "13px",
                      height: 38,
                      px: 2,
                      bgcolor: isExpired ? "#dc2626" : isUrgent ? "#ea580c" : "#2563eb",
                      color: "#fff",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                    }}
                  />
                </Box>

                {/* ─── 3. PROPOSED RENEWED POLICY & PREMIUM BREAKDOWN IN TABLE FORM ─── */}
                <Paper elevation={0} sx={{ borderRadius: "10px", border: "1px solid #cbd5e1", overflow: "hidden", mb: 2 }}>
                  <Box sx={{
                    bgcolor: "#f1f5f9",
                    px: 2.5,
                    py: 1.5,
                    borderBottom: "1px solid #cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <Typography sx={{ fontWeight: 800, color: "#1e40af", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      3. Proposed Renewed Policy & Premium Breakdown
                    </Typography>
                    <Typography sx={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                      Review breakdown before 1-click approval
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: "#0f172a" }}>
                        <TableRow>
                          <TableCell sx={{ color: "#ffffff !important", fontWeight: 700, fontSize: "12px", py: 1.2 }}>Component / Coverage Description</TableCell>
                          <TableCell sx={{ color: "#ffffff !important", fontWeight: 700, fontSize: "12px", py: 1.2, textAlign: "right" }}>Proposed Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow hover>
                          <TableCell sx={{ fontWeight: 600, color: "#334155", fontSize: "12.5px" }}>New Insurance Company</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: "#1e40af", fontSize: "13px", textAlign: "right" }}>
                            {row.newInsuranceCompany || row.insuranceCompany || "-"}
                          </TableCell>
                        </TableRow>
                        <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                          <TableCell sx={{ fontWeight: 600, color: "#334155", fontSize: "12.5px" }}>Proposed Renewal Period</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: "12.5px", textAlign: "right" }}>
                            {row.newPolicyFromDate ? new Date(row.newPolicyFromDate).toLocaleDateString("en-IN") : "-"} to{" "}
                            <span style={{ color: "#dc2626", fontWeight: 800, background: "#fee2e2", padding: "2px 8px", borderRadius: "4px" }}>
                              {row.newPolicyToDate ? new Date(row.newPolicyToDate).toLocaleDateString("en-IN") : "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                        <TableRow hover>
                          <TableCell sx={{ fontWeight: 600, color: "#334155", fontSize: "12.5px" }}>New Basic IDV (₹)</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: "12.5px", textAlign: "right" }}>
                            ₹ {Number(row.newIdv || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                          <TableCell sx={{ fontWeight: 700, color: "#0f172a", fontSize: "12.5px" }}>New Total IDV (₹)</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: "#0f172a", fontSize: "13px", textAlign: "right" }}>
                            ₹ {Number(row.newTotalIdv || row.newIdv || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        {/* Section 3 OD Breakdown Group */}
                        <TableRow sx={{ bgcolor: "#eff6ff" }}>
                          <TableCell colSpan={2} sx={{ fontWeight: 800, color: "#1e40af", fontSize: "12px", py: 0.8, textTransform: "uppercase" }}>
                            Own Damage (OD) Breakdown
                          </TableCell>
                        </TableRow>
                        <TableRow hover>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New OD Premium</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newOdPremium || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New IMT 23</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newImt23 || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New IMT 24</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newImt24 || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New IMT 25</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newImt25 || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New NCB Amount (₹)</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600, color: "#16a34a" }}>
                            - ₹ {Number(row.newNcbAmount || row.newNcb || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover sx={{ bgcolor: "#f1f5f9" }}>
                          <TableCell sx={{ pl: 3.5, fontWeight: 700, fontSize: "12.5px", color: "#0f172a" }}>= New Total OD Premium</TableCell>
                          <TableCell sx={{ fontWeight: 800, fontSize: "13px", textAlign: "right", color: "#0f172a" }}>
                            ₹ {Number(row.newTotalOdPremium || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>

                        {/* Section 3 Additional Covers Group */}
                        <TableRow sx={{ bgcolor: "#eff6ff" }}>
                          <TableCell colSpan={2} sx={{ fontWeight: 800, color: "#1e40af", fontSize: "12px", py: 0.8, textTransform: "uppercase" }}>
                            Additional Covers & Taxes
                          </TableCell>
                        </TableRow>
                        <TableRow hover>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New IMT 17</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newImt17 || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New IMT 252</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newImt252 || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New IMT 28 / IMT 29</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newImt28 || row.newImt29 || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover sx={{ bgcolor: "#f8fafc" }}>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New Liability Premium</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newLiabilityPremium || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                        <TableRow hover>
                          <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• New GST 18%</TableCell>
                          <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                            ₹ {Number(row.newTotalGst || 0).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>

                        {/* Custom Fields if any */}
                        {(row.section3CustomFields || []).map((cf, idx) => (
                          <TableRow key={`s3-${idx}`} hover>
                            <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• {cf.label || `Custom Field ${idx + 1}`}</TableCell>
                            <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>{String(cf.value ?? "-")}</TableCell>
                          </TableRow>
                        ))}
                        {(row.section3BCustomFields || []).map((cf, idx) => (
                          <TableRow key={`s3b-${idx}`} hover>
                            <TableCell sx={{ pl: 3.5, fontSize: "12.5px", color: "#475569" }}>• {cf.label || `Custom Field ${idx + 1}`}</TableCell>
                            <TableCell sx={{ fontSize: "12.5px", textAlign: "right", fontWeight: 600 }}>
                              {cf.value ? `₹ ${Number(cf.value).toLocaleString("en-IN")}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Grand Total Row */}
                        <TableRow sx={{ bgcolor: "#ecfdf5", borderTop: "2.5px solid #10b981" }}>
                          <TableCell sx={{ fontWeight: 900, fontSize: "14px", color: "#065f46", py: 1.5 }}>
                            RENEWED TOTAL POLICY PREMIUM
                          </TableCell>
                          <TableCell sx={{ textAlign: "right", fontWeight: 900, fontSize: "19px", color: "#047857", py: 1.5 }}>
                            ₹ {totalPremium.toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>

              {/* Drawer Footer Actions */}
              <Box sx={{
                bgcolor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                px: 3,
                py: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5
              }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Launch sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    setSelectedApprovalRecord(null);
                    if (onOpenApproval) onOpenApproval(row);
                    else onEdit(row);
                  }}
                  sx={{ textTransform: "none", fontWeight: 600, fontSize: "12.5px", borderColor: "#cbd5e1", color: "#475569" }}
                >
                  Open Full SOP Form
                </Button>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    onClick={() => setSelectedApprovalRecord(null)}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "12.5px", color: "#64748b" }}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={isApproving}
                    startIcon={<Cancel sx={{ fontSize: 16 }} />}
                    onClick={() => handleOneClickReject(row)}
                    sx={{ textTransform: "none", fontWeight: 700, fontSize: "12.5px" }}
                  >
                    Reject Proposal
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    disabled={isApproving}
                    startIcon={isApproving ? <CircularProgress size={16} color="inherit" /> : <CheckCircle sx={{ fontSize: 18 }} />}
                    onClick={() => handleOneClickApprove(row)}
                    sx={{
                      bgcolor: "#16a34a",
                      "&:hover": { bgcolor: "#15803d" },
                      fontWeight: 800,
                      fontSize: "13.5px",
                      textTransform: "none",
                      px: 3,
                      py: 1,
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)"
                    }}
                  >
                    {isApproving ? "Approving..." : "✓ 1-Click Approve"}
                  </Button>
                </Box>
              </Box>
            </>
          );
        })()}
      </Drawer>

      {/* Floating Pending Approvals Quick-Action Snackbar Bar */}
      {mainTab === 2 && approvalRecords.length > 0 && !selectedApprovalRecord && (
        <Snackbar
          open={true}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            severity="info"
            icon={<FlashOn sx={{ color: "#2563eb" }} />}
            sx={{
              bgcolor: "#0f172a",
              color: "#ffffff",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              border: "1px solid #334155",
              alignItems: "center",
              "& .MuiAlert-icon": { color: "#60a5fa" }
            }}
            action={
              <Button
                color="primary"
                size="small"
                variant="contained"
                onClick={() => setSelectedApprovalRecord(approvalRecords[0])}
                sx={{
                  bgcolor: "#2563eb",
                  fontWeight: 700,
                  fontSize: "12px",
                  textTransform: "none",
                  borderRadius: "6px",
                  px: 1.5,
                  py: 0.5
                }}
              >
                Review First Record
              </Button>
            }
          >
            <strong>{approvalRecords.length}</strong> Pending Financial Approval{approvalRecords.length > 1 ? "s" : ""} • Click any record to review breakdown & approve in 1 click
          </Alert>
        </Snackbar>
      )}

      {/* Notification Toast / Feedback Snackbar */}
      <Snackbar
        open={approvalSnackbar.open}
        autoHideDuration={5000}
        onClose={() => setApprovalSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setApprovalSnackbar(prev => ({ ...prev, open: false }))}
          severity={approvalSnackbar.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 700, fontSize: "13px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
        >
          {approvalSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default React.memo(FleetInsuranceList);



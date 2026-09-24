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
  Tabs,
  Tab,
  Chip,
  Grid,
  Tooltip,
  InputAdornment,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  Edit,
  Delete,
  GetApp,
  Add,
  FileDownload,
  Visibility,
  Search,
  Clear,
  Assignment,
  MonetizationOn,
  LocalShipping,
  CheckCircle,
  AccountBalance,
  AttachFile,
} from "@mui/icons-material";
import { toast } from "react-hot-toast";

const stageTabsList = [
  { label: "All PRs", value: "0" },
  { label: "1. Purchase Request", value: "1" },
  { label: "2. Supplier Quotation", value: "2" },
  { label: "3. Finance Approval", value: "3" },
  { label: "4. Payment & UTR", value: "4" },
  { label: "5. Order & Dispatch", value: "5" },
  { label: "6. Site GRN", value: "6" },
  { label: "7. Completed", value: "7" },
];

const isCompletedSiteGrn = (row) => {
  const approvals = row.stage6?.approvals || [];
  const allApprovalsDone = approvals.length >= 3 && approvals.every(
    (item) => item && (item.checked || item.status === "Done" || item.status === "DONE" || item.date)
  );
  return allApprovalsDone || ["GRN Done", "GRN Completed", "Closed"].includes(row.status);
};

// Supplier invoice attachments recorded at Site GRN (stage 6)
const getGrnInvoiceAttachments = (row) =>
  (row.stage6?.referenceInfos || []).filter((info) => info && info.invoiceAttachment);

function TyreProcurementList({ onEdit, onView, onCreate }) {
  const { user } = useContext(UserContext);
  const userRole = (user?.role || "").toLowerCase();

  const userIdentity = [user?.username, user?.first_name, user?.middle_name, user?.last_name]
    .filter(Boolean).join(" ").replace(/[^a-z]/gi, "").toLowerCase();
  const isAjay = (user?.username || "").toLowerCase().includes("ajay") || userIdentity.includes("ajay");
  const isAdmin = userRole === "admin" || userRole === "superadmin" || isAjay;
  const canOverrideSignOffLock = isAdmin;

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [stageTab, setStageTab] = useState("0");
  const [loading, setLoading] = useState(false);
  const [allowedUserTabs, setAllowedUserTabs] = useState([]);

  useEffect(() => {
    async function fetchUserTabs() {
      if (user?.username && !isAdmin) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/tyre-procurement/user-tabs/${user.username}`
          );
          if (res.data?.success && res.data.allowed_tabs?.length > 0) {
            setAllowedUserTabs(res.data.allowed_tabs);
          }
        } catch (err) {
          console.error("Error fetching allowed tabs:", err);
        }
      }
    }
    fetchUserTabs();
  }, [user, isAdmin]);

  const isTabVisible = (tabLabel, tabValue) => {
    if (isAdmin || allowedUserTabs.length === 0 || tabValue === "0") return true;
    return allowedUserTabs.includes(tabLabel);
  };

  const [allRecords, setAllRecords] = useState([]);

  const fetchAllRecords = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement`, {
        params: { limit: 1000 },
      });
      setAllRecords(res.data.data || []);
    } catch (err) {
      console.error("Error fetching all Tyre SOP records for badge counts:", err);
    }
  };

  const tabStatusMap = {
    "1. Purchase Request": ["Draft"],
    "2. Supplier Quotation": ["PR Raised", "Preparing for Quotation", "HoD Validated"],
    "3. Finance Approval": ["Quotation Received", "Quotation Updated"],
    "4. Payment & UTR": ["Finance Approved", "Finance Review"],
    "5. Order & Dispatch": ["Payment Done", "Advance Paid", "Order Placed", "Dispatched"],
    "6. Site GRN": ["Dispatched / Site GRN Ready", "GRN Ready", "In Transit", "GRN Received"],
    "7. Completed": ["GRN Done", "GRN Completed", "Closed"],
  };

  const getTabCount = (value) => {
    const list = allRecords.length > 0 ? allRecords : data;
    if (value === "0") {
      if (!isAdmin && allowedUserTabs.length > 0) {
        const allowedStatuses = allowedUserTabs.flatMap((t) => tabStatusMap[t] || []);
        return list.filter((d) => allowedStatuses.includes(d.status)).length;
      }
      return list.filter((d) => d.status !== "GRN Done" && d.status !== "Closed" && d.status !== "GRN Completed").length;
    }
    switch (value) {
      case "1":
        return list.filter((d) => d.status === "Draft" || !d.status).length;
      case "2":
        return list.filter((d) => d.status === "PR Raised" || d.status === "Preparing for Quotation" || d.status === "HoD Validated").length;
      case "3":
        return list.filter((d) => d.status === "Quotation Received" || d.status === "Quotation Updated").length;
      case "4":
        return list.filter((d) => d.status === "Finance Approved").length;
      case "5":
        return list.filter((d) => d.status === "Payment Done" || d.status === "Order Placed" || d.status === "Dispatched").length;
      case "6":
        return list.filter((d) => d.status === "Dispatched / Site GRN Ready" || d.status === "GRN Ready" || d.status === "GRN Received").length;
      case "7":
        return list.filter((d) => d.status === "GRN Done" || d.status === "Closed" || d.status === "GRN Completed").length;
      default:
        return 0;
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement`, {
        params: {
          search,
          stageTab,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching Tyre SOP list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchAllRecords();
  }, [page, rowsPerPage, search, stageTab]);

  // Quick Finance Approval Dialog state
  const [quickApprovalOpen, setQuickApprovalOpen] = useState(false);
  const [quickApprovalRow, setQuickApprovalRow] = useState(null);
  const [quickDecision, setQuickDecision] = useState("APPROVED");
  const [quickApproverName, setQuickApproverName] = useState("");
  const [quickApprovalDate, setQuickApprovalDate] = useState("");
  const [quickApprovalRemarks, setQuickApprovalRemarks] = useState("");
  const [quickApprovalSubmitting, setQuickApprovalSubmitting] = useState(false);

  // Quick Payment & UTR Dialog state
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [quickPaymentRow, setQuickPaymentRow] = useState(null);
  const [quickSupplierPayments, setQuickSupplierPayments] = useState([]);
  const [quickPaymentSubmitting, setQuickPaymentSubmitting] = useState(false);

  const canApproveFinance = (row) => {
    return stageTab === "3";
  };

  const canEnterPaymentUtr = (row) => {
    return stageTab === "4";
  };

  const handleOpenQuickApproval = (row) => {
    setQuickApprovalRow(row);
    setQuickDecision(row.stage3?.decision?.decision === "REJECTED" ? "REJECTED" : "APPROVED");
    setQuickApproverName(
      row.stage3?.signOff?.financeManagerName || user?.first_name || "CHIRAG SHAH"
    );
    const today = new Date().toISOString().split("T")[0];
    const existingDate = row.stage3?.signOff?.dateOfApproval
      ? row.stage3.signOff.dateOfApproval.split("T")[0]
      : today;
    setQuickApprovalDate(existingDate);
    setQuickApprovalRemarks(row.stage3?.decision?.remarks || "");
    setQuickApprovalOpen(true);
  };

  const handleSaveQuickApproval = async () => {
    if (!quickApprovalRow?._id) return;
    setQuickApprovalSubmitting(true);
    try {
      const now = new Date();
      const today = quickApprovalDate || now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });

      const updatedPayload = {
        ...quickApprovalRow,
        status: quickDecision === "APPROVED" ? "Finance Approved" : "Rejected",
        stage3: {
          ...(quickApprovalRow.stage3 || {}),
          selectedSupplierL1: quickApprovalRow.stage2?.selectedSupplierL1 || quickApprovalRow.stage3?.selectedSupplierL1 || "",
          totalOrderValue: quickApprovalRow.stage2?.totalOrderValue || quickApprovalRow.stage3?.totalOrderValue || 0,
          decision: {
            ...(quickApprovalRow.stage3?.decision || {}),
            decision: quickDecision,
            remarks: quickApprovalRemarks,
          },
          signOff: {
            ...(quickApprovalRow.stage3?.signOff || {}),
            financeManagerName: quickApproverName,
            dateOfApproval: quickDecision === "APPROVED" ? today : "",
            timeOfApproval: quickDecision === "APPROVED" ? timeStr : "",
          },
        },
      };

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/tyre-procurement/${quickApprovalRow._id}`,
        updatedPayload
      );
      toast.success(`Finance Approval updated to "${quickDecision}" for PR #${quickApprovalRow.prNumber}!`);
      setQuickApprovalOpen(false);
      setQuickApprovalRow(null);
      fetchRecords();
      fetchAllRecords();
    } catch (err) {
      console.error("Error saving quick finance approval:", err);
      toast.error(err.response?.data?.message || "Failed to update Finance Approval");
    } finally {
      setQuickApprovalSubmitting(false);
    }
  };

  const handleOpenQuickPaymentUtr = (row) => {
    setQuickPaymentRow(row);
    const stage2Suppliers = row.stage2?.suppliers || [];
    const selectedSuppliers = row.stage2?.selectedSuppliers || [];

    let targetSuppliers = stage2Suppliers.filter((s) => {
      const sName = (s.supplierName || "").toUpperCase();
      return selectedSuppliers.some((sel) => {
        const selName = (sel.selectedSupplier || "").toUpperCase();
        return selName === sName || String(sel.selectedSupplier) === String(s._id);
      });
    });

    if (targetSuppliers.length === 0 && selectedSuppliers.length > 0) {
      targetSuppliers = selectedSuppliers.map((sel) => ({
        supplierName: sel.selectedSupplier,
        totalOrderValue: sel.totalOrderValue,
        poNumber: sel.poNumber,
      }));
    } else if (targetSuppliers.length === 0 && stage2Suppliers.length > 0) {
      targetSuppliers = stage2Suppliers;
    } else if (targetSuppliers.length === 0) {
      targetSuppliers = [{
        supplierName: row.stage2?.selectedSupplierL1 || "Supplier 1",
        totalOrderValue: row.stage2?.totalOrderValue || 0,
      }];
    }

    const today = new Date().toISOString().split("T")[0];
    const existingPayments = row.stage4?.supplierPayments || [];

    const paymentsList = targetSuppliers.map((sup, idx) => {
      const existing = existingPayments[idx] || {};
      const matchedSelected = selectedSuppliers.find(
        (sel) => sel.selectedSupplier === sup.supplierName || sel.selectedSupplier === sup._id
      );
      const val = matchedSelected?.totalOrderValue || sup.totalOrderValue || row.stage2?.totalOrderValue || 0;

      return {
        supplierName: sup.supplierName || `Supplier ${idx + 1}`,
        supplierNameInBank: sup.supplierNameInBank || sup.supplierName || "",
        bankName: sup.bankName || "",
        bankAccountNo: sup.bankAccountNo || "",
        bankIfscCode: sup.bankIfscCode || "",
        paymentTerms: sup.paymentTerms || "100% ADVANCE",
        paymentMethod: existing.paymentMethod || "NEFT",
        utrNumber: existing.utrNumber || row.stage4?.paymentDetails?.paymentReferenceUtr || "",
        paymentDate: existing.paymentDate ? existing.paymentDate.split("T")[0] : today,
        amountPaid: existing.amountPaid || val,
        isPaid: Boolean(existing.isPaid || existing.utrNumber),
      };
    });

    setQuickSupplierPayments(paymentsList);
    setQuickPaymentOpen(true);
  };

  const handleQuickPaymentFieldChange = (index, field, value) => {
    const today = new Date().toISOString().split("T")[0];
    setQuickSupplierPayments((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
        ...(field === "utrNumber" && value && value.trim() ? { isPaid: true, paymentDate: next[index].paymentDate || today } : {}),
      };
      return next;
    });
  };

  const handleAutoFillAllPayments = () => {
    const today = new Date().toISOString().split("T")[0];
    setQuickSupplierPayments((prev) =>
      prev.map((sp) => ({
        ...sp,
        utrNumber: sp.utrNumber?.trim() ? sp.utrNumber : `UTR${Date.now().toString().slice(-8)}`,
        paymentDate: sp.paymentDate || today,
        isPaid: true,
      }))
    );
  };

  const handleSaveQuickPaymentUtr = async () => {
    if (!quickPaymentRow?._id) return;
    const hasAnyUtr = quickSupplierPayments.some((sp) => Boolean(sp.utrNumber?.trim()));
    if (!hasAnyUtr) {
      toast.error("Please enter at least one Payment UTR Number.");
      return;
    }
    setQuickPaymentSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const updatedSupplierPayments = quickSupplierPayments.map((sp) => ({
        supplierName: sp.supplierName,
        paymentTerms: sp.paymentTerms,
        paymentMethod: sp.paymentMethod || "NEFT",
        utrNumber: (sp.utrNumber || "").trim().toUpperCase(),
        paymentDate: sp.paymentDate || today,
        isPaid: Boolean(sp.isPaid || sp.utrNumber?.trim()),
        amountPaid: sp.amountPaid,
      }));

      const primaryPayment = updatedSupplierPayments.find((sp) => sp.utrNumber?.trim()) || updatedSupplierPayments[0];

      const updatedPayload = {
        ...quickPaymentRow,
        status: "Payment Done",
        stage4: {
          ...(quickPaymentRow.stage4 || {}),
          supplierPayments: updatedSupplierPayments,
          paymentDetails: {
            ...(quickPaymentRow.stage4?.paymentDetails || {}),
            paymentReferenceUtr: primaryPayment?.utrNumber || "",
            paymentDate: primaryPayment?.paymentDate || today,
            paymentMethod: primaryPayment?.paymentMethod || "NEFT",
            amountPaid: updatedSupplierPayments.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0) || quickPaymentRow.stage2?.totalOrderValue,
          },
        },
      };

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/tyre-procurement/${quickPaymentRow._id}`,
        updatedPayload
      );
      toast.success(`Payment & UTR saved successfully for PR #${quickPaymentRow.prNumber}! Forwarded to Order & Dispatch.`);
      setQuickPaymentOpen(false);
      setQuickPaymentRow(null);
      fetchRecords();
      fetchAllRecords();
    } catch (err) {
      console.error("Error saving quick payment UTR:", err);
      toast.error(err.response?.data?.message || "Failed to save Payment UTR");
    } finally {
      setQuickPaymentSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PR?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${id}`);
      fetchRecords();
    } catch (err) {
      console.error("Error deleting PR:", err);
      alert("Failed to delete PR");
    }
  };

  const handleExport = async (id, prNumber) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/${id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Tyre_Procurement_${prNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting excel:", err);
      alert("Failed to export Excel");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/tyre-procurement/template/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Tyre_Procurement_SOP_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error downloading template:", err);
      alert("Failed to download template");
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Compute status metrics for visual KPI bar
  const totalCount = total;
  const pendingQuotationCount = data.filter((d) => d.status === "PR Raised" || d.status === "Preparing for Quotation").length;
  const paymentDoneCount = data.filter((d) => d.status === "Payment Done" || d.status === "Order Placed").length;
  const grnCompletedCount = data.filter((d) => d.status === "GRN Done" || d.status === "Closed").length;

  const getStatusChipProps = (status) => {
    switch (status) {
      case "Closed":
      case "GRN Done":
        return { label: status || "GRN Done", bg: "#dcfce7", color: "#15803d" };
      case "Payment Done":
      case "Order Placed":
        return { label: status, bg: "#e0f2fe", color: "#0369a1" };
      case "Finance Approved":
        return { label: status, bg: "#e0e7ff", color: "#4338ca" };
      case "PR Raised":
      case "Quotation Received":
      case "Preparing for Quotation":
        return { label: status, bg: "#fef3c7", color: "#b45309" };
      default:
        return { label: status || "Draft", bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
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
              <Assignment sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total PRs
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {totalCount}
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
              <MonetizationOn sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                In Quotation / Review
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {pendingQuotationCount}
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
              <LocalShipping sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Payment & Order Active
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {paymentDoneCount}
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
              <CheckCircle sx={{ fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#64748b", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                GRN Completed
              </Typography>
              <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "22px", lineHeight: 1.2 }}>
                {grnCompletedCount}
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
              Procurement SOP
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "12.5px" }}>
              Manage purchase requests, supplier quotations, finance approvals, and GRNs
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
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
              Create Purchase Request
            </Button>
          </Stack>
        </Stack>

        {/* Stage Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1.8 }}>
          <Tabs
            value={stageTab}
            onChange={(e, val) => {
              setStageTab(val);
              setPage(0);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTabs-indicator": {
                backgroundColor: "#2563eb",
                height: 2.5,
                borderRadius: 1,
              },
            }}
          >
            {stageTabsList.map((tab) => {
              if (!isTabVisible(tab.label, tab.value)) return null;
              const count = getTabCount(tab.value);
              const showNotificationBadge = count > 0;

              let badgeColor = "primary";
              if (tab.value === "1") badgeColor = "info";
              else if (tab.value === "2") badgeColor = "warning";
              else if (tab.value === "3" || tab.value === "4") badgeColor = "error";
              else if (tab.value === "5") badgeColor = "info";
              else if (tab.value === "6") badgeColor = "warning";
              else if (tab.value === "7") badgeColor = "success";
              else if (tab.value === "0") badgeColor = "primary";

              return (
                <Tab
                  key={tab.value}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>{tab.label}</span>
                      {showNotificationBadge ? (
                        <Badge
                          badgeContent={count}
                          color={badgeColor}
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
                      ) : (
                        <Box
                          component="span"
                          sx={{
                            fontSize: "11px",
                            fontWeight: 700,
                            px: 0.8,
                            py: 0.2,
                            borderRadius: "10px",
                            backgroundColor: stageTab === tab.value ? "#eff6ff" : "#f1f5f9",
                            color: stageTab === tab.value ? "#1d4ed8" : "#64748b",
                          }}
                        >
                          {count}
                        </Box>
                      )}
                    </Box>
                  }
                  value={tab.value}
                  sx={{
                    fontWeight: 600,
                    fontSize: "13px",
                    textTransform: "none",
                    color: stageTab === tab.value ? "#1d4ed8" : "#64748b",
                    minHeight: 40,
                    py: 1,
                    px: 2,
                  }}
                />
              );
            })}
          </Tabs>
        </Box>

        {/* Search Bar */}
        <TextField
          placeholder="Search PR Number, PO, Prepared By, Supplier..."
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
      </Paper>

      {/* Table Container */}
      <Paper elevation={0} sx={{ borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
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
                    px: "14px !important",
                    borderBottom: "none",
                  },
                }}
              >
                <TableRow>
                  <TableCell>PR Number</TableCell>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Prepared By</TableCell>
                  <TableCell>L1 Supplier</TableCell>
                  <TableCell>Total Value (₹)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  {stageTab === "7" && <TableCell>Invoice</TableCell>}
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={stageTab === "7" ? 9 : 8} align="center" sx={{ py: 4, color: "#64748b" }}>
                      <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
                        No procurement records found for this view.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => {
                    const chipStyle = getStatusChipProps(row.status);
                    const editLocked = isCompletedSiteGrn(row) && !canOverrideSignOffLock;
                    return (
                      <TableRow
                        key={row._id}
                        hover
                        sx={{
                          transition: "background-color 0.15s ease",
                          "&:hover": { bgcolor: "#f8fafc" },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 700, fontSize: "13px", py: 1, px: 1.5 }}>
                          <Box
                            component="span"
                            onClick={() => !editLocked && onEdit(row)}
                            sx={{
                              cursor: editLocked ? "default" : "pointer",
                              color: editLocked ? "#64748b" : "#2563eb",
                              "&:hover": editLocked ? {} : { color: "#1d4ed8", textDecoration: "underline" },
                            }}
                          >
                            {row.prNumber}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: "#334155", fontWeight: 600, fontSize: "12.5px", py: 1, px: 1.5 }}>
                          {(() => {
                            const supPos = Array.from(
                              new Set(
                                (row.stage2?.selectedSuppliers || [])
                                  .map((s) => s.poNumber)
                                  .filter(Boolean)
                              )
                            );
                            if (supPos.length > 0) {
                              return supPos.join(", ");
                            }
                            return row.poNumber || "-";
                          })()}
                        </TableCell>
                        <TableCell sx={{ color: "#334155", fontSize: "12.5px", py: 1, px: 1.5 }}>{row.stage1?.preparedBy || "-"}</TableCell>
                        <TableCell sx={{ color: "#334155", fontWeight: 500, fontSize: "12.5px", py: 1, px: 1.5 }}>{row.stage2?.selectedSupplierL1 || "-"}</TableCell>
                        <TableCell sx={{ color: "#0f172a", fontWeight: 700, fontSize: "13px", py: 1, px: 1.5 }}>
                          {row.stage2?.totalOrderValue
                            ? Number(row.stage2.totalOrderValue).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                            : "-"}
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 1.5 }}>
                          <Chip
                            label={chipStyle.label}
                            size="small"
                            sx={{
                              bgcolor: chipStyle.bg,
                              color: chipStyle.color,
                              fontWeight: 700,
                              fontSize: "11.5px",
                              height: 24,
                              borderRadius: "6px",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: "#64748b", fontSize: "12.5px", py: 1, px: 1.5 }}>
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-GB") : "-"}
                        </TableCell>
                        {stageTab === "7" && (
                          <TableCell sx={{ py: 1, px: 1.5 }}>
                            {(() => {
                              const invoices = getGrnInvoiceAttachments(row);
                              if (invoices.length === 0) {
                                return <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>—</Typography>;
                              }
                              return (
                                <Stack spacing={0.2}>
                                  {invoices.map((info) => (
                                    <Tooltip
                                      key={info._id || info.invoiceAttachment}
                                      title={[
                                        info.supplierName,
                                        info.invoiceAttachmentName || "Invoice",
                                        info.invoiceAmount ? `₹${Number(info.invoiceAmount).toLocaleString("en-IN")}` : null,
                                      ].filter(Boolean).join(" — ")}
                                    >
                                      <a
                                        href={info.invoiceAttachment}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                          fontSize: "11.5px",
                                          fontWeight: 600,
                                          color: "#2563eb",
                                          textDecoration: "none",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <AttachFile sx={{ fontSize: 13 }} />
                                        {info.invoiceNumber || info.invoiceAttachmentName || "View Invoice"}
                                      </a>
                                    </Tooltip>
                                  ))}
                                </Stack>
                              );
                            })()}
                          </TableCell>
                        )}
                        <TableCell align="center" sx={{ py: 1, px: 1.5 }}>
                          <Stack direction="row" spacing={0.8} justifyContent="center" alignItems="center">
                            {canApproveFinance(row) && (
                              <Tooltip title="Review & Financial Approval">
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<CheckCircle sx={{ fontSize: 13 }} />}
                                  onClick={() => handleOpenQuickApproval(row)}
                                  sx={{
                                    bgcolor: "#2563eb",
                                    color: "#ffffff",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    height: 28,
                                    px: 1.2,
                                    textTransform: "none",
                                    borderRadius: "6px",
                                    boxShadow: "none",
                                    whiteSpace: "nowrap",
                                    "&:hover": { bgcolor: "#1d4ed8" },
                                  }}
                                >
                                  Approve
                                </Button>
                              </Tooltip>
                            )}
                            {canEnterPaymentUtr(row) && (
                              <Tooltip title="Enter Payment & UTR">
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<AccountBalance sx={{ fontSize: 13 }} />}
                                  onClick={() => handleOpenQuickPaymentUtr(row)}
                                  sx={{
                                    bgcolor: "#16a34a",
                                    color: "#ffffff",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    height: 28,
                                    px: 1.2,
                                    textTransform: "none",
                                    borderRadius: "6px",
                                    boxShadow: "none",
                                    whiteSpace: "nowrap",
                                    "&:hover": { bgcolor: "#15803d" },
                                  }}
                                >
                                  Enter UTR
                                </Button>
                              </Tooltip>
                            )}
                            <Tooltip title="View PR">
                              <IconButton
                                size="small"
                                onClick={() => onView(row)}
                                sx={{
                                  color: "#0284c7",
                                  bgcolor: "#e0f2fe",
                                  "&:hover": { bgcolor: "#bae6fd" },
                                }}
                              >
                                <Visibility sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={editLocked ? "Completed Site GRN — view only" : "Edit PR"}>
                              <IconButton
                                size="small"
                                onClick={() => onEdit(row)}
                                disabled={editLocked}
                                sx={{
                                  color: "#2563eb",
                                  bgcolor: "#eff6ff",
                                  "&:hover": { bgcolor: "#dbeafe" },
                                }}
                              >
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Excel">
                              <IconButton
                                size="small"
                                onClick={() => handleExport(row._id, row.prNumber)}
                                sx={{
                                  color: "#16a34a",
                                  bgcolor: "#f0fdf4",
                                  "&:hover": { bgcolor: "#dcfce7" },
                                }}
                              >
                                <GetApp sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title="Delete PR">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(row._id)}
                                  sx={{
                                    color: "#ef4444",
                                    bgcolor: "#fef2f2",
                                    "&:hover": { bgcolor: "#fee2e2" },
                                  }}
                                >
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
      {/* ─── QUICK FINANCE APPROVAL DIALOG ─── */}
      <Dialog
        open={quickApprovalOpen}
        onClose={() => !quickApprovalSubmitting && setQuickApprovalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}
      >
        <DialogTitle sx={{ bgcolor: "#0f172a", color: "#ffffff", py: 1.5, px: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "16px" }}>
                Finance Approval & Sign-Off
              </Typography>
              <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
                PR #{quickApprovalRow?.prNumber} &bull; PO #{quickApprovalRow?.poNumber || quickApprovalRow?.stage2?.selectedSuppliers?.[0]?.poNumber || "N/A"}
              </Typography>
            </Box>
            <Chip
              label={quickDecision === "APPROVED" ? "APPROVED" : "REJECTED"}
              color={quickDecision === "APPROVED" ? "success" : "error"}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
          {quickApprovalRow && (
            <>
              {/* Reference & Awarded Supplier summary */}
              <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: "6px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                      PR NUMBER
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: "#2563eb", fontSize: "14px" }}>
                      {quickApprovalRow.prNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                      PREPARED BY
                    </Typography>
                    <Typography sx={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                      {quickApprovalRow.stage1?.preparedBy || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                      OVERALL TOTAL ORDER VALUE
                    </Typography>
                    <Typography sx={{ fontWeight: 800, color: "#166534", fontSize: "15px" }}>
                      ₹ {Number(quickApprovalRow.stage2?.totalOrderValue || quickApprovalRow.stage3?.totalOrderValue || 0).toLocaleString("en-IN")}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Selected suppliers table */}
                {(() => {
                  const sups = quickApprovalRow.stage2?.selectedSuppliers?.length > 0
                    ? quickApprovalRow.stage2.selectedSuppliers
                    : [{
                        selectedSupplier: quickApprovalRow.stage2?.selectedSupplierL1 || "-",
                        priceQuoted: quickApprovalRow.stage2?.l1PriceQuoted || 0,
                        totalOrderValue: quickApprovalRow.stage2?.totalOrderValue || 0,
                        poNumber: quickApprovalRow.poNumber || "-",
                      }];
                  return (
                    <Box sx={{ mt: 1.5, borderTop: "1px solid #f1f5f9", pt: 1.5 }}>
                      <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#334155", mb: 1 }}>
                        Awarded Supplier(s) Summary:
                      </Typography>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: "11px", py: 0.5 }}>Supplier</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: "11px", py: 0.5 }}>PO No</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: "11px", py: 0.5 }}>Price Quoted (₹)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: "11px", py: 0.5 }}>Total Value (₹)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sups.map((s, idx) => (
                            <TableRow key={idx}>
                              <TableCell sx={{ fontWeight: 600, color: "#1d4ed8", fontSize: "12px", py: 0.5 }}>{s.selectedSupplier}</TableCell>
                              <TableCell sx={{ fontSize: "12px", py: 0.5 }}>{s.poNumber || quickApprovalRow.poNumber || "-"}</TableCell>
                              <TableCell align="right" sx={{ fontSize: "12px", py: 0.5 }}>₹ {Number(s.priceQuoted || 0).toLocaleString("en-IN")}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: "#0f172a", fontSize: "12px", py: 0.5 }}>₹ {Number(s.totalOrderValue || 0).toLocaleString("en-IN")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  );
                })()}
              </Paper>

              {/* Decision and Signoff Inputs */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: "6px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
                <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#0f172a", mb: 1.5 }}>
                  Approval Decision & Sign-Off
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography sx={{ fontWeight: 600, fontSize: "11.5px", color: "#334155", mb: 0.5 }}>
                      FINANCE DECISION *
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={quickDecision}
                      onChange={(e) => setQuickDecision(e.target.value)}
                    >
                      <MenuItem value="APPROVED" sx={{ color: "#166534", fontWeight: 700 }}>
                        ✓ APPROVED
                      </MenuItem>
                      <MenuItem value="REJECTED" sx={{ color: "#dc2626", fontWeight: 700 }}>
                        ✕ REJECTED
                      </MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography sx={{ fontWeight: 600, fontSize: "11.5px", color: "#334155", mb: 0.5 }}>
                      FINANCE MANAGER NAME *
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={quickApproverName}
                      onChange={(e) => setQuickApproverName(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Typography sx={{ fontWeight: 600, fontSize: "11.5px", color: "#334155", mb: 0.5 }}>
                      APPROVAL DATE
                    </Typography>
                    <TextField
                      fullWidth
                      type="date"
                      size="small"
                      value={quickApprovalDate}
                      onChange={(e) => setQuickApprovalDate(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography sx={{ fontWeight: 600, fontSize: "11.5px", color: "#334155", mb: 0.5 }}>
                      APPROVAL REMARKS (OPTIONAL)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      placeholder="Add any finance review remarks or notes..."
                      value={quickApprovalRemarks}
                      onChange={(e) => setQuickApprovalRemarks(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => setQuickApprovalOpen(false)}
            disabled={quickApprovalSubmitting}
            sx={{ textTransform: "none", color: "#64748b", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveQuickApproval}
            disabled={quickApprovalSubmitting}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              background: quickDecision === "APPROVED" ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            }}
          >
            {quickApprovalSubmitting ? "Submitting..." : `Confirm Approval (${quickDecision})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── QUICK PAYMENT & UTR DIALOG ─── */}
      <Dialog
        open={quickPaymentOpen}
        onClose={() => !quickPaymentSubmitting && setQuickPaymentOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "10px", overflow: "hidden" } }}
      >
        <DialogTitle sx={{ bgcolor: "#0f172a", color: "#ffffff", py: 1.5, px: 2.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "16px" }}>
                Enter Payment & UTR Details
              </Typography>
              <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
                PR #{quickPaymentRow?.prNumber} &bull; PO #{quickPaymentRow?.poNumber || "N/A"}
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={handleAutoFillAllPayments}
              sx={{
                bgcolor: "#16a34a",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "11px",
                height: 28,
                "&:hover": { bgcolor: "#15803d" },
              }}
            >
              ✓ Auto-fill / Mark All Paid
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
          {quickPaymentRow && (
            <>
              {quickSupplierPayments.map((sp, idx) => (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    bgcolor: "#ffffff",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, borderBottom: "1px solid #f1f5f9", pb: 1 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "14px", color: "#1d4ed8" }}>
                        {idx + 1}. {sp.supplierName}
                      </Typography>
                      <Typography sx={{ fontSize: "11.5px", color: "#64748b" }}>
                        Bank: <strong>{sp.bankName || "N/A"}</strong> &bull; A/C: <strong>{sp.bankAccountNo || "N/A"}</strong> &bull; IFSC: <strong>{sp.bankIfscCode || "N/A"}</strong>
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Chip
                        label={sp.paymentTerms || "100% ADVANCE"}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: "11px", height: 22 }}
                      />
                      <Typography sx={{ fontWeight: 800, color: "#166534", fontSize: "14px", mt: 0.3 }}>
                        ₹ {Number(sp.amountPaid || 0).toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography sx={{ fontWeight: 600, fontSize: "11.5px", color: "#334155", mb: 0.5 }}>
                        PAYMENT METHOD
                      </Typography>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={sp.paymentMethod || "NEFT"}
                        onChange={(e) => handleQuickPaymentFieldChange(idx, "paymentMethod", e.target.value)}
                      >
                        {["NEFT", "RTGS", "IMPS", "Cheque", "UPI"].map((m) => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontWeight: 600, fontSize: "11.5px", color: "#334155", mb: 0.5 }}>
                        UTR / REF NUMBER *
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="e.g. UTR12345678"
                        value={sp.utrNumber || ""}
                        onChange={(e) => handleQuickPaymentFieldChange(idx, "utrNumber", e.target.value.toUpperCase())}
                        sx={{
                          "& input": { fontWeight: 700, color: "#1e40af" }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Typography sx={{ fontWeight: 600, fontSize: "11.5px", color: "#334155", mb: 0.5 }}>
                        PAYMENT DATE
                      </Typography>
                      <TextField
                        fullWidth
                        type="date"
                        size="small"
                        value={sp.paymentDate || ""}
                        onChange={(e) => handleQuickPaymentFieldChange(idx, "paymentDate", e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={2} sx={{ display: "flex", alignItems: "center", pt: "24px !important" }}>
                      <Button
                        variant={sp.isPaid ? "contained" : "outlined"}
                        color={sp.isPaid ? "success" : "primary"}
                        size="small"
                        fullWidth
                        onClick={() => handleQuickPaymentFieldChange(idx, "isPaid", !sp.isPaid)}
                        sx={{ height: 36, textTransform: "none", fontWeight: 700, fontSize: "11.5px" }}
                      >
                        {sp.isPaid ? "✓ Paid" : "Mark Paid"}
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => setQuickPaymentOpen(false)}
            disabled={quickPaymentSubmitting}
            sx={{ textTransform: "none", color: "#64748b", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveQuickPaymentUtr}
            disabled={quickPaymentSubmitting}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            }}
          >
            {quickPaymentSubmitting ? "Saving..." : "Save Payment & Forward to Stage 5"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default React.memo(TyreProcurementList);


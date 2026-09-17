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
} from "@mui/icons-material";

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

function TyreProcurementList({ onEdit, onView, onCreate }) {
  const { user } = useContext(UserContext);
  const userRole = (user?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

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
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#64748b" }}>
                      <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
                        No procurement records found for this view.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => {
                    const chipStyle = getStatusChipProps(row.status);
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
                            onClick={() => onEdit(row)}
                            sx={{
                              cursor: "pointer",
                              color: "#2563eb",
                              "&:hover": { color: "#1d4ed8", textDecoration: "underline" },
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
                        <TableCell align="center" sx={{ py: 1, px: 1.5 }}>
                          <Stack direction="row" spacing={0.8} justifyContent="center">
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
                            <Tooltip title="Edit PR">
                              <IconButton
                                size="small"
                                onClick={() => onEdit(row)}
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
    </Box>
  );
}

export default React.memo(TyreProcurementList);


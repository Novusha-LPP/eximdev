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
  Tabs,
  Tab,
  Chip,
  Grid,
  Tooltip,
  InputAdornment,
  Avatar,
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
];

function TyreProcurementList({ onEdit, onView, onCreate }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [stageTab, setStageTab] = useState("0");
  const [loading, setLoading] = useState(false);

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
              <Assignment />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Total PRs
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {totalCount}
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
              <MonetizationOn />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                In Quotation / Review
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {pendingQuotationCount}
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
              <LocalShipping />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Payment & Order Active
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {paymentDoneCount}
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
              <CheckCircle />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                GRN Completed
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {grnCompletedCount}
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
              Tyre Procurement SOP
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Manage purchase requests, supplier quotations, finance approvals, and GRNs
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5}>
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
              Create Tyre PR
            </Button>
          </Stack>
        </Stack>

        {/* Stage Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
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
                borderRadius: 2,
              },
            }}
          >
            {stageTabsList.map((tab) => (
              <Tab
                key={tab.value}
                label={tab.label}
                value={tab.value}
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  color: "#64748b",
                  minHeight: 40,
                  px: 2,
                  "&.Mui-selected": {
                    color: "#2563eb",
                    fontWeight: 700,
                  },
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Search Bar */}
        <TextField
          placeholder="Search PR Number, PO, Prepared By, Supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "#94a3b8" }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")}>
                  <Clear fontSize="small" sx={{ color: "#94a3b8" }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              bgcolor: "#f8fafc",
              "&:hover": { bgcolor: "#ffffff" },
              "&.Mui-focused": { bgcolor: "#ffffff" },
            },
          }}
        />
      </Paper>

      {/* Table Container */}
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
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>PR Number</TableCell>
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>PO Number</TableCell>
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Prepared By</TableCell>
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>L1 Supplier</TableCell>
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Total Value (₹)</TableCell>
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Status</TableCell>
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }}>Created At</TableCell>
                  <TableCell sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", py: 1.5 }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#64748b" }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
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
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
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
                        <TableCell sx={{ color: "#334155", fontWeight: 500 }}>{row.poNumber || "-"}</TableCell>
                        <TableCell sx={{ color: "#334155" }}>{row.stage1?.preparedBy || "-"}</TableCell>
                        <TableCell sx={{ color: "#334155", fontWeight: 500 }}>{row.stage2?.selectedSupplierL1 || "-"}</TableCell>
                        <TableCell sx={{ color: "#0f172a", fontWeight: 600 }}>
                          {row.stage2?.totalOrderValue
                            ? Number(row.stage2.totalOrderValue).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={chipStyle.label}
                            size="small"
                            sx={{
                              bgcolor: chipStyle.bg,
                              color: chipStyle.color,
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              borderRadius: "6px",
                              px: 0.5,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                          {new Date(row.createdAt).toLocaleDateString("en-GB")}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => onView(row)} sx={{ color: "#0284c7", "&:hover": { bgcolor: "#e0f2fe" } }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit PR">
                              <IconButton size="small" onClick={() => onEdit(row)} sx={{ color: "#2563eb", "&:hover": { bgcolor: "#eff6ff" } }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Excel">
                              <IconButton size="small" onClick={() => handleExport(row._id, row.prNumber)} sx={{ color: "#16a34a", "&:hover": { bgcolor: "#f0fdf4" } }}>
                                <GetApp fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete PR">
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
    </Box>
  );
}

export default React.memo(TyreProcurementList);


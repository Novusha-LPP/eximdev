import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Chip,
  Pagination,
  Grid,
  Tooltip,
  InputAdornment,
  Avatar,
  Stack,
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  FileDownload,
  Search,
  Visibility,
  Clear,
  Inventory2,
  MonetizationOn,
  LocalShipping,
  CheckCircle,
} from "@mui/icons-material";

function RmProcurementList({ onEdit, onView, onCreate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/rm-procurement`, {
        params: { search, page, limit },
      });
      setItems(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching RM Procurement PRs:", err);
      alert("Failed to fetch PRs");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this PR?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/rm-procurement/${id}`);
      fetchItems();
    } catch (err) {
      console.error("Error deleting PR:", err);
      alert("Failed to delete PR");
    }
  };

  const handleExport = async (id, prNumber) => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/rm-procurement/${id}/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RM_Procurement_${prNumber || id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error exporting PR:", err);
      alert("Failed to export PR");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const getStatusChipProps = (status) => {
    switch (status) {
      case "Closed":
      case "GRN Done":
        return { label: status || "Closed", bg: "#dcfce7", color: "#15803d" };
      case "Rejected":
        return { label: status, bg: "#fef2f2", color: "#b91c1c" };
      case "Draft":
        return { label: status, bg: "#f1f5f9", color: "#475569" };
      default:
        return { label: status || "Active", bg: "#e0f2fe", color: "#0369a1" };
    }
  };

  const totalCount = total;
  const pendingQuotationCount = items.filter((d) => d.status === "PR Raised" || d.status === "Quotation Pending").length;
  const activeOrderCount = items.filter((d) => d.status === "Order Placed" || d.status === "Payment Done").length;
  const closedCount = items.filter((d) => d.status === "Closed" || d.status === "GRN Done").length;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Metrics Summary Header Bar */}
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
              <Inventory2 />
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Total RM PRs
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
                Quotation Pending
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
                Active Orders
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {activeOrderCount}
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
                Completed & Closed
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {closedCount}
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
              Raw Material Procurement SOP
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Track raw material sales orders, pricing validations, suppliers, and site GRNs
            </Typography>
          </Box>
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
            New RM PR
          </Button>
        </Stack>

        {/* Search Bar */}
        <Box component="form" onSubmit={handleSearch}>
          <TextField
            placeholder="Search PR Number, Customer, or Supplier..."
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
              },
            }}
          />
        </Box>
      </Paper>

      {/* Table Container */}
      <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress size={32} sx={{ color: "#2563eb" }} />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#0f172a" }}>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>PR Number</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>SO Ref. No.</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Customer</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Supplier (L1)</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }}>Created</TableCell>
                    <TableCell sx={{ color: "#f8fafc", fontWeight: 700 }} align="center">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748b" }}>
                        No raw material procurement requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const chipStyle = getStatusChipProps(item.status);
                      return (
                        <TableRow key={item._id} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                          <TableCell sx={{ fontWeight: 700, color: "#2563eb", cursor: "pointer", "&:hover": { textDecoration: "underline" } }} onClick={() => onEdit(item)}>
                            {item.prNumber}
                          </TableCell>
                          <TableCell sx={{ color: "#334155", fontWeight: 500 }}>{item.salesOrderRefNo || "-"}</TableCell>
                          <TableCell sx={{ color: "#334155" }}>{item.stage1?.customerName || "-"}</TableCell>
                          <TableCell sx={{ color: "#334155", fontWeight: 500 }}>
                            {item.stage3?.selectedSupplierL1 || item.stage6?.supplierName || "-"}
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
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: "#64748b", fontSize: "0.85rem" }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "-"}
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="View Details">
                                <IconButton size="small" onClick={() => onView(item)} sx={{ color: "#0284c7", "&:hover": { bgcolor: "#e0f2fe" } }}>
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit PR">
                                <IconButton size="small" onClick={() => onEdit(item)} sx={{ color: "#2563eb", "&:hover": { bgcolor: "#eff6ff" } }}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Export Excel">
                                <IconButton size="small" onClick={() => handleExport(item._id, item.prNumber)} sx={{ color: "#16a34a", "&:hover": { bgcolor: "#f0fdf4" } }}>
                                  <FileDownload fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete PR">
                                <IconButton size="small" onClick={() => handleDelete(item._id)} sx={{ color: "#dc2626", "&:hover": { bgcolor: "#fef2f2" } }}>
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
            <Box sx={{ display: "flex", justifyContent: "center", p: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Pagination count={Math.ceil(total / limit)} page={page} onChange={(e, v) => setPage(v)} color="primary" />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}

export default React.memo(RmProcurementList);


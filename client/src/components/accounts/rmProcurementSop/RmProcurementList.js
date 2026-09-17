import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { UserContext } from "../../../contexts/UserContext";
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
  Tabs,
  Tab,
  Badge,
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

function RmProcurementList({ onEdit, onView, onCreate }) {
  const { user } = useContext(UserContext);
  const userRole = (user?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [stageTab, setStageTab] = useState("0");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [allowedUserTabs, setAllowedUserTabs] = useState([]);
  const limit = 20;

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

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/rm-procurement`, {
        params: { search, stageTab, page, limit },
      });
      setItems(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error("Error fetching RM Procurement PRs:", err);
      alert("Failed to fetch PRs");
    } finally {
      setLoading(false);
    }
  }, [search, stageTab, page]);

  const [allRecords, setAllRecords] = useState([]);

  const fetchAllRecords = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/rm-procurement`, {
        params: { limit: 1000 },
      });
      setAllRecords(res.data.data || []);
    } catch (err) {
      console.error("Error fetching all RM SOP records for badge counts:", err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchAllRecords();
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

        {/* Stage Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={stageTab}
            onChange={(e, val) => setStageTab(val)}
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
              const count = (() => {
                const list = allRecords.length > 0 ? allRecords : items;
                if (tab.value === "0") {
                  if (!isAdmin && allowedUserTabs.length > 0) {
                    const tabStatusMap = {
                      "1. Purchase Request": ["Draft"],
                      "2. Supplier Quotation": ["PR Raised", "Quotation Pending", "Preparing for Quotation"],
                      "3. Finance Approval": ["Quotation Received", "Pending Finance Approval"],
                      "4. Payment & UTR": ["Finance Approved", "Payment Pending"],
                      "5. Order & Dispatch": ["Order Placed", "Payment Done"],
                      "6. Site GRN": ["Dispatched", "GRN Ready"],
                      "7. Completed": ["GRN Done", "Closed", "Completed"],
                    };
                    const allowedStatuses = allowedUserTabs.flatMap((t) => tabStatusMap[t] || []);
                    return list.filter((d) => allowedStatuses.includes(d.status)).length;
                  }
                  return list.filter((d) => d.status !== "GRN Done" && d.status !== "Closed" && d.status !== "Completed").length;
                }
                switch (tab.value) {
                  case "1":
                    return list.filter((d) => d.status === "Draft" || !d.status).length;
                  case "2":
                    return list.filter((d) => d.status === "PR Raised" || d.status === "Quotation Pending" || d.status === "Preparing for Quotation").length;
                  case "3":
                    return list.filter((d) => d.status === "Quotation Received" || d.status === "Pending Finance Approval").length;
                  case "4":
                    return list.filter((d) => d.status === "Finance Approved" || d.status === "Payment Pending").length;
                  case "5":
                    return list.filter((d) => d.status === "Order Placed" || d.status === "Payment Done").length;
                  case "6":
                    return list.filter((d) => d.status === "Dispatched" || d.status === "GRN Ready").length;
                  case "7":
                    return list.filter((d) => d.status === "GRN Done" || d.status === "Closed" || d.status === "Completed").length;
                  default:
                    return 0;
                }
              })();
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
                    "&.Mui-selected": {
                      fontWeight: 700,
                      color: "#1d4ed8",
                    },
                  }}
                />
              );
            })}
          </Tabs>
        </Box>

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
                  {(() => {
                    const filteredItems = items.filter((d) => {
                      if (stageTab === "0") return d.status !== "GRN Done" && d.status !== "Closed" && d.status !== "Completed" && d.status !== "GRN Completed";
                      if (stageTab === "1") return d.status === "Draft" || !d.status;
                      if (stageTab === "2") return d.status === "PR Raised" || d.status === "Quotation Pending" || d.status === "Preparing for Quotation";
                      if (stageTab === "3") return d.status === "Quotation Received" || d.status === "Pending Finance Approval";
                      if (stageTab === "4") return d.status === "Finance Approved" || d.status === "Payment Pending";
                      if (stageTab === "5") return d.status === "Order Placed" || d.status === "Payment Done";
                      if (stageTab === "6") return d.status === "Dispatched" || d.status === "GRN Ready";
                      if (stageTab === "7") return d.status === "GRN Done" || d.status === "Closed" || d.status === "Completed";
                      return true;
                    });

                    if (filteredItems.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748b" }}>
                            No raw material procurement requests found for this stage.
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return filteredItems.map((item) => {
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
                    });
                  })()}
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


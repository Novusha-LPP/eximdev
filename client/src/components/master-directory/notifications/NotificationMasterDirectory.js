import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Snackbar,
  Alert,
  CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";

import NotificationTable from "./NotificationTable";
import NotificationFormDialog from "./NotificationFormDialog";
import RateHistoryDialog from "./RateHistoryDialog";
import MasterDataSyncDialog from "./MasterDataSyncDialog";

export default function NotificationMasterDirectory() {
  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_STRING || "";

  // Active section tab: "b", "c", or "d"
  const [activeTab, setActiveTab] = useState("b");

  // Sync Dialog state
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  // Data states
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRules: 0,
    totalVariances: 0,
    sectionB: { count: 0, variances: 0 },
    sectionC: { count: 0, variances: 0 },
    sectionD: { count: 0, variances: 0 }
  });

  // Filter states
  const [search, setSearch] = useState("");
  const [dutyHead, setDutyHead] = useState("ALL");
  const [varianceStatus, setVarianceStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [seeding, setSeeding] = useState(false);

  // Notifications / Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fetchOverallStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/notifications/overall/stats`);
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching notification stats:", err);
    }
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/notifications/${activeTab}`, {
        params: {
          search,
          dutyHead,
          varianceStatus,
          page,
          limit: 30
        }
      });
      if (res.data.success) {
        setItems(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching notifications list:", err);
      setSnackbar({ open: true, message: "Failed to load notifications", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [API_BASE, activeTab, search, dutyHead, varianceStatus, page]);

  useEffect(() => {
    fetchOverallStats();
  }, [activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(1);
    setDutyHead("ALL");
    setVarianceStatus("ALL");
    setSearch("");
  };

  const handleOpenAdd = () => {
    setEditingNotification(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingNotification(item);
    setFormOpen(true);
  };

  const handleOpenHistory = (item) => {
    setSelectedNotification(item);
    setHistoryOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete notification ${item.notn_no} (Sr: ${item.notn_sno}) for ${item.duty_head}?`)) {
      return;
    }
    try {
      const res = await axios.delete(`${API_BASE}/notifications/${activeTab}/${item._id}`);
      if (res.data.success) {
        setSnackbar({ open: true, message: "Notification deleted successfully", severity: "success" });
        fetchNotifications();
        fetchOverallStats();
      }
    } catch (err) {
      setSnackbar({ open: true, message: "Failed to delete notification", severity: "error" });
    }
  };

  const handleSeedFromJobs = async () => {
    setSeeding(true);
    try {
      const res = await axios.post(`${API_BASE}/notifications/seed-from-jobs`);
      if (res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || "Seeding complete!",
          severity: "success"
        });
        fetchNotifications();
        fetchOverallStats();
      }
    } catch (err) {
      console.error("Error seeding notifications:", err);
      setSnackbar({ open: true, message: "Failed to seed notifications from jobs", severity: "error" });
    } finally {
      setSeeding(false);
    }
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      setSnackbar({ open: true, message: "No items to export", severity: "warning" });
      return;
    }

    const exportRows = items.map((row) => ({
      "Section": `Section ${activeTab.toUpperCase()}`,
      "Notification No": row.notn_no,
      "Notification Sr No": row.notn_sno,
      "Duty Head": row.duty_head,
      "CTH Code": row.cth_code,
      "Current Rate": row.current_rate,
      "Unit": row.unit || "%",
      "Duty Flag": row.current_duty_flag,
      "COO / FTA": row.coo,
      "Description": row.description,
      "Usage Count": row.usage_count,
      "Has Rate Variance": row.has_rate_variance ? "YES" : "NO",
      "Variance Status": row.variance_status,
      "Last Used Date": row.last_used_date ? new Date(row.last_used_date).toLocaleDateString("en-IN") : ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Section_${activeTab.toUpperCase()}_Notifications`);
    XLSX.writeFile(workbook, `Notification_Directory_Section_${activeTab.toUpperCase()}_${Date.now()}.xlsx`);
  };

  const getSectionTitle = () => {
    if (activeTab === "b") return "Section B: Item Duty Notifications";
    if (activeTab === "c") return "Section C: Other Duties Notifications";
    return "Section D: Other Duties - A Notifications";
  };

  return (
    <Box sx={{ p: 3, maxWidth: "1600px", margin: "0 auto" }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate("/master-directory")}
          sx={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 0.5 }}
        >
          <AccountBalanceIcon sx={{ fontSize: 18 }} />
          Master Directory
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 700 }}>
          Notification Directory
        </Typography>
      </Breadcrumbs>

      {/* Header Banner */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
        <div>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: 1.5 }}>
            <span>Notification Master Directory</span>
          </Typography>
          <Typography variant="body1" sx={{ color: "#64748b", mt: 0.5 }}>
            Centralized repository for Customs & Tariff Exemption Notifications harvested from BOE Part-III Duty (Sections B, C, & D).
          </Typography>
        </div>

        {/* Global Action Buttons */}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={() => setSyncDialogOpen(true)}
            startIcon={<SyncIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#2563eb",
              color: "#2563eb",
              background: "#eff6ff",
              "&:hover": { background: "#dbeafe", borderColor: "#1d4ed8" }
            }}
          >
            Master BOE Data Sync
          </Button>
          <Button
            variant="outlined"
            onClick={handleExportExcel}
            startIcon={<FileDownloadIcon />}
            sx={{ textTransform: "none", fontWeight: 600, borderColor: "#cbd5e1" }}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            onClick={handleOpenAdd}
            startIcon={<AddIcon />}
            sx={{ textTransform: "none", fontWeight: 700, background: "#2563eb", "&:hover": { background: "#1d4ed8" } }}
          >
            Add Notification
          </Button>
        </Box>
      </Box>

      {/* Top Stat Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2, background: "#f8fafc" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Total Active Rules
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", mt: 0.5 }}>
                {stats.totalRules}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            onClick={() => setActiveTab("b")}
            sx={{
              border: activeTab === "b" ? "2px solid #2563eb" : "1px solid #e2e8f0",
              borderRadius: 2,
              background: activeTab === "b" ? "#eff6ff" : "#ffffff",
              cursor: "pointer"
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "#2563eb", fontWeight: 700, textTransform: "uppercase" }}>
                Section B (Item Duty)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#1e3a8a", mt: 0.5 }}>
                {stats.sectionB.count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            onClick={() => setActiveTab("c")}
            sx={{
              border: activeTab === "c" ? "2px solid #059669" : "1px solid #e2e8f0",
              borderRadius: 2,
              background: activeTab === "c" ? "#ecfdf5" : "#ffffff",
              cursor: "pointer"
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, textTransform: "uppercase" }}>
                Section C (Other Duties)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#065f46", mt: 0.5 }}>
                {stats.sectionC.count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            onClick={() => setActiveTab("d")}
            sx={{
              border: activeTab === "d" ? "2px solid #d97706" : "1px solid #e2e8f0",
              borderRadius: 2,
              background: activeTab === "d" ? "#fffbeb" : "#ffffff",
              cursor: "pointer"
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "#d97706", fontWeight: 700, textTransform: "uppercase" }}>
                Section D (Other Duties-A)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#92400e", mt: 0.5 }}>
                {stats.sectionD.count}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            sx={{
              border: stats.totalVariances > 0 ? "1.5px solid #f59e0b" : "1px solid #e2e8f0",
              borderRadius: 2,
              background: stats.totalVariances > 0 ? "#fffbeb" : "#f8fafc"
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" sx={{ color: "#b45309", fontWeight: 700, textTransform: "uppercase" }}>
                ⚡ Rate Variances
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: stats.totalVariances > 0 ? "#b45309" : "#64748b", mt: 0.5 }}>
                {stats.totalVariances}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Container with Sub-Directory Tabs */}
      <Paper elevation={0} sx={{ border: "1px solid #cbd5e1", borderRadius: 3, overflow: "hidden" }}>
        {/* Section Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", background: "#f8fafc", px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            textColor="primary"
            indicatorColor="primary"
            sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 700, py: 1.5, fontSize: "0.95rem" } }}
          >
            <Tab label="📑 Section B: Item Duty (BCD, SWS, IGST, CVD, SAD)" value="b" />
            <Tab label="📑 Section C: Other Duties (CAIDC, EAIDC, EDC, NCD, CHCESS)" value="c" />
            <Tab label="📑 Section D: Other Duties - A (INFRA CES, PETR CUS, OTHCUS)" value="d" />
          </Tabs>
        </Box>

        {/* Filters & Search Toolbar */}
        <Box sx={{ p: 2.5, background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by Notification No, Sr No, CTH, or Description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Variance Status Filter */}
            <Grid item xs={6} md={3.5}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Health / Variance Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  label="Health / Variance Status"
                  value={varianceStatus}
                  onChange={(e) => {
                    setVarianceStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="STABLE">🟢 Stable / Verified</MenuItem>
                  <MenuItem value="AMENDED_VERIFIED">🔵 Verified Amendments</MenuItem>
                  <MenuItem value="HAS_VARIANCE">⚡ Has Rate Variance (Review Needed)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Active Items Count Indicator */}
            <Grid item xs={6} md={3.5} sx={{ textAlign: "right" }}>
              <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                Showing <strong>{items.length}</strong> record(s) in {getSectionTitle()}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Notification Table */}
        <Box sx={{ p: 2 }}>
          <NotificationTable
            items={items}
            loading={loading}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onViewHistory={handleOpenHistory}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, val) => setPage(val)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Add / Edit Form Modal */}
      <NotificationFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        section={activeTab}
        editingNotification={editingNotification}
        onSuccess={() => {
          setSnackbar({
            open: true,
            message: editingNotification ? "Notification updated successfully" : "Notification created successfully",
            severity: "success"
          });
          fetchNotifications();
          fetchOverallStats();
        }}
      />

      {/* Rate History & Variance Resolution Dialog */}
      <RateHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        notification={selectedNotification}
        section={activeTab}
        onResolved={() => {
          fetchNotifications();
          fetchOverallStats();
        }}
      />

      {/* Master Data Sync Dialog (Deep BOE Sync & Fast Duties Sync) */}
      <MasterDataSyncDialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSyncSuccess={() => {
          fetchNotifications();
          fetchOverallStats();
        }}
      />

      {/* Snackbar alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

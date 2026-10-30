import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
  Avatar,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  ShowChart,
  Clear,
  Assignment,
  Receipt,
  LocalShipping,
  Visibility,
  Today,
  DateRange,
  CalendarToday,
} from "@mui/icons-material";

const formatDisplayDate = (dStr) => {
  if (!dStr) return "";
  const d = new Date(dStr + "T00:00:00");
  if (isNaN(d.getTime())) return dStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getDaysDiff = (s, e) => {
  if (!s || !e) return 1;
  const d1 = new Date(s + "T00:00:00");
  const d2 = new Date(e + "T00:00:00");
  const diffTime = d2.getTime() - d1.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 1;
};

const getTodayStr = () => new Date().toISOString().split("T")[0];

export default function ProcurementPulseModal({ open, onClose, onView }) {
  const [startDate, setStartDate] = useState(getTodayStr);
  const [endDate, setEndDate] = useState(getTodayStr);
  const [activePreset, setActivePreset] = useState("today");
  const [loading, setLoading] = useState(false);
  const [pulseData, setPulseData] = useState({
    counts: { prCount: 0, poCount: 0, grnCount: 0 },
    prs: [],
    pos: [],
    grns: [],
  });
  const [activeTab, setActiveTab] = useState(0);

  const fetchPulse = async (start, end) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/tyre-procurement/pulse?startDate=${start}&endDate=${end}`
      );
      if (res.data?.success) {
        setPulseData({
          counts: res.data.counts || { prCount: 0, poCount: 0, grnCount: 0 },
          prs: res.data.prs || [],
          pos: res.data.pos || [],
          grns: res.data.grns || [],
        });
      }
    } catch (err) {
      console.error("Error fetching pulse data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPulse(startDate, endDate);
    }
  }, [open, startDate, endDate]);

  const handlePreset = (presetKey) => {
    const now = new Date();
    const todayStr = getTodayStr();
    setActivePreset(presetKey);

    if (presetKey === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetKey === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split("T")[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (presetKey === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (presetKey === "last30") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (presetKey === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setStartDate(val);
    if (endDate && val > endDate) {
      setEndDate(val);
    }
    setActivePreset("custom");
  };

  const handleEndDateChange = (e) => {
    const val = e.target.value;
    setEndDate(val);
    if (startDate && val < startDate) {
      setStartDate(val);
    }
    setActivePreset("custom");
  };

  const counts = pulseData.counts || { prCount: 0, poCount: 0, grnCount: 0 };
  const isRange = startDate !== endDate;
  const daysSelected = getDaysDiff(startDate, endDate);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#0f172a",
          color: "#ffffff",
          py: 2,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: "#2563eb", width: 38, height: 38 }}>
            <ShowChart sx={{ fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#ffffff", letterSpacing: "0.2px" }}>
              Procurement Pulse & Activity
            </Typography>
            <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
              Activity tracking for PR, PO, and GRN operations across date ranges
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
          <Clear sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: "#f8fafc" }}>
        {/* Date Range Selector Header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            mb: 2.5,
            p: 2,
            borderRadius: "8px",
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          {/* Top row: Inputs + Quick Presets */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            {/* Date Pickers */}
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                  From Date:
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={handleStartDateChange}
                  sx={{
                    width: 155,
                    "& .MuiOutlinedInput-root": {
                      height: 36,
                      fontSize: "12.5px",
                      fontWeight: 600,
                      bgcolor: "#f8fafc",
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "12.5px", fontWeight: 700, color: "#334155" }}>
                  To Date:
                </Typography>
                <TextField
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={handleEndDateChange}
                  sx={{
                    width: 155,
                    "& .MuiOutlinedInput-root": {
                      height: 36,
                      fontSize: "12.5px",
                      fontWeight: 600,
                      bgcolor: "#f8fafc",
                    },
                  }}
                />
              </Box>
            </Stack>

            {/* Quick Presets */}
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Presets:
              </Typography>
              {[
                { id: "today", label: "Today", icon: Today },
                { id: "yesterday", label: "Yesterday", icon: CalendarToday },
                { id: "last7", label: "Last 7 Days", icon: DateRange },
                { id: "last30", label: "Last 30 Days", icon: DateRange },
                { id: "thisMonth", label: "This Month", icon: CalendarToday },
              ].map((p) => {
                const isSelected = activePreset === p.id;
                const IconComp = p.icon;
                return (
                  <Button
                    key={p.id}
                    variant={isSelected ? "contained" : "outlined"}
                    size="small"
                    startIcon={<IconComp sx={{ fontSize: 14 }} />}
                    onClick={() => handlePreset(p.id)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "12px",
                      height: 32,
                      px: 1.3,
                      borderRadius: "6px",
                      bgcolor: isSelected ? "#2563eb" : "transparent",
                      color: isSelected ? "#ffffff" : "#475569",
                      borderColor: isSelected ? "#2563eb" : "#cbd5e1",
                      "&:hover": {
                        bgcolor: isSelected ? "#1d4ed8" : "#f1f5f9",
                        borderColor: isSelected ? "#1d4ed8" : "#94a3b8",
                      },
                    }}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>

          {/* Bottom row: Active Range summary */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              borderTop: "1px dashed #e2e8f0",
              pt: 1.2,
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: "12.5px", color: "#475569" }}>
              {!isRange ? (
                <>
                  Showing records for <strong>{formatDisplayDate(startDate)}</strong>
                </>
              ) : (
                <>
                  Showing records from <strong>{formatDisplayDate(startDate)}</strong> to <strong>{formatDisplayDate(endDate)}</strong>
                </>
              )}
            </Typography>

            <Chip
              label={!isRange ? "Single Day" : `${daysSelected} Days Period`}
              size="small"
              sx={{
                fontSize: "11px",
                height: 22,
                bgcolor: "#eff6ff",
                color: "#2563eb",
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>

        {/* 3 Metric Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              onClick={() => setActiveTab(0)}
              sx={{
                p: 2,
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: activeTab === 0 ? "#2563eb" : "#e2e8f0",
                bgcolor: activeTab === 0 ? "#eff6ff" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "#2563eb", transform: "translateY(-1px)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                  1. PRs Raised
                </Typography>
                <Assignment sx={{ color: "#2563eb", fontSize: 20 }} />
              </Box>
              <Typography sx={{ fontSize: "28px", fontWeight: 800, color: "#1e3a8a", mt: 0.5 }}>
                {counts.prCount}
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                {!isRange ? "Purchase requests raised on this date" : `Purchase requests raised in ${daysSelected}-day period`}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              onClick={() => setActiveTab(1)}
              sx={{
                p: 2,
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: activeTab === 1 ? "#7c3aed" : "#e2e8f0",
                bgcolor: activeTab === 1 ? "#faf5ff" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "#7c3aed", transform: "translateY(-1px)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#6b21a8", textTransform: "uppercase" }}>
                  2. POs Placed / Approved
                </Typography>
                <Receipt sx={{ color: "#7c3aed", fontSize: 20 }} />
              </Box>
              <Typography sx={{ fontSize: "28px", fontWeight: 800, color: "#5b21b6", mt: 0.5 }}>
                {counts.poCount}
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                {!isRange ? "Purchase orders placed on this date" : `Purchase orders placed in ${daysSelected}-day period`}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              onClick={() => setActiveTab(2)}
              sx={{
                p: 2,
                borderRadius: "8px",
                border: "1.5px solid",
                borderColor: activeTab === 2 ? "#059669" : "#e2e8f0",
                bgcolor: activeTab === 2 ? "#ecfdf5" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "#059669", transform: "translateY(-1px)" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#065f46", textTransform: "uppercase" }}>
                  3. GRNs Processed
                </Typography>
                <LocalShipping sx={{ color: "#059669", fontSize: 20 }} />
              </Box>
              <Typography sx={{ fontSize: "28px", fontWeight: 800, color: "#064e3b", mt: 0.5 }}>
                {counts.grnCount}
              </Typography>
              <Typography sx={{ fontSize: "11px", color: "#64748b" }}>
                {!isRange ? "Goods received notes on this date" : `Goods received notes in ${daysSelected}-day period`}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tab Header */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{
              minHeight: 38,
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "13px", minHeight: 38, py: 0.8 },
            }}
          >
            <Tab label={`PRs Raised (${counts.prCount})`} />
            <Tab label={`POs Placed (${counts.poCount})`} />
            <Tab label={`GRNs Processed (${counts.grnCount})`} />
          </Tabs>
        </Box>

        {/* Tables */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: "8px", maxHeight: 400 }}>
            {activeTab === 0 && (
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PR Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PR Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Department / Branch</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Prepared By</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px", textAlign: "right" }}>Est. Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "12px" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pulseData.prs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: "#64748b", fontSize: "12.5px" }}>
                        No Purchase Requests raised in the selected date range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pulseData.prs.map((pr, idx) => (
                      <TableRow key={pr._id || idx} hover>
                        <TableCell sx={{ fontWeight: 700, color: "#2563eb", fontSize: "12px" }}>
                          {pr.prNumber}
                        </TableCell>
                        <TableCell sx={{ fontSize: "11.5px", color: "#64748b" }}>
                          {formatDisplayDate(pr.stage1?.prDate || (pr.createdAt ? String(pr.createdAt).slice(0, 10) : ""))}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px", fontWeight: 600 }}>
                          {pr.companyShortName || pr.companyName || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px" }}>
                          {pr.stage1?.departmentLocation || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px" }}>
                          {pr.stage1?.preparedBy || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 700 }}>
                          {pr.stage1?.estimatedTotalCost
                            ? Number(pr.stage1.estimatedTotalCost).toLocaleString("en-IN", { style: "currency", currency: "INR" })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip label={pr.status || "Draft"} size="small" sx={{ fontSize: "10.5px", fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility sx={{ fontSize: 13 }} />}
                            onClick={() => {
                              onClose();
                              onView && onView(pr);
                            }}
                            sx={{ fontSize: "11px", textTransform: "none", py: 0.2, px: 1 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === 1 && (
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PO Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PR Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PO Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "12px" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pulseData.pos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: "#64748b", fontSize: "12.5px" }}>
                        No Purchase Orders generated or approved in the selected date range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pulseData.pos.map((po, idx) => (
                      <TableRow key={po._id || idx} hover>
                        <TableCell sx={{ fontWeight: 700, color: "#7c3aed", fontSize: "12px" }}>
                          {po.poNumber || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>
                          {po.prNumber}
                        </TableCell>
                        <TableCell sx={{ fontSize: "11.5px", color: "#64748b" }}>
                          {formatDisplayDate(po.stage2?.poDate || po.stage3?.poDate || (po.createdAt ? String(po.createdAt).slice(0, 10) : ""))}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px" }}>
                          {po.companyShortName || po.companyName || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px" }}>
                          {po.stage2?.selectedSupplierL1 || "-"}
                        </TableCell>
                        <TableCell>
                          <Chip label={po.status || "Quotation Received"} size="small" color="primary" sx={{ fontSize: "10.5px", fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility sx={{ fontSize: 13 }} />}
                            onClick={() => {
                              onClose();
                              onView && onView(po);
                            }}
                            sx={{ fontSize: "11px", textTransform: "none", py: 0.2, px: 1 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === 2 && (
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PR Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>PO Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>GRN Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "12px" }}>Invoice / GRN Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: "12px" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pulseData.grns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: "#64748b", fontSize: "12.5px" }}>
                        No Goods Received Notes processed in the selected date range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pulseData.grns.map((grn, idx) => (
                      <TableRow key={grn._id || idx} hover>
                        <TableCell sx={{ fontWeight: 700, color: "#2563eb", fontSize: "12px" }}>
                          {grn.prNumber}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px", color: "#047857", fontWeight: 600 }}>
                          {grn.poNumber || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "11.5px", color: "#64748b" }}>
                          {formatDisplayDate(grn.stage6?.grnDate || (grn.updatedAt ? String(grn.updatedAt).slice(0, 10) : ""))}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px" }}>
                          {grn.companyShortName || grn.companyName || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "12px" }}>
                          {grn.stage6?.supplierName || "-"}
                        </TableCell>
                        <TableCell>
                          <Chip label={grn.status || "GRN Done"} size="small" color="success" sx={{ fontSize: "10.5px", fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility sx={{ fontSize: 13 }} />}
                            onClick={() => {
                              onClose();
                              onView && onView(grn);
                            }}
                            sx={{ fontSize: "11px", textTransform: "none", py: 0.2, px: 1 }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, color: "#64748b" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

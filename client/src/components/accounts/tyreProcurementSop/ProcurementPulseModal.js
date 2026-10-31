import React, { useState, useEffect, useMemo } from "react";
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
  InputAdornment,
} from "@mui/material";
import {
  ShowChart,
  Clear,
  Assignment,
  Description,
  MonetizationOn,
  AssignmentTurnedIn,
  ReceiptLong,
  LocalShipping,
  Inventory,
  CheckCircle,
  Visibility,
  Today,
  DateRange,
  CalendarToday,
  Search,
  AllInclusive,
} from "@mui/icons-material";

const formatDisplayDate = (dStr) => {
  if (!dStr) return "-";
  const d = new Date(String(dStr).slice(0, 10) + "T00:00:00");
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

// The 8 Lifecycle Stages
export const PULSE_STAGES = [
  {
    value: "0",
    label: "All PRs",
    shortLabel: "Total PRs",
    fullLabel: "All PRs",
    color: "#2563eb",
    bgLight: "rgba(37, 99, 235, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)",
    icon: Assignment,
    desc: "All PR records in the selected period",
  },
  {
    value: "1",
    label: "1. Purchase Request",
    shortLabel: "1. Purchase Req",
    fullLabel: "1. Purchase Request",
    color: "#4f46e5",
    bgLight: "rgba(79, 70, 229, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #eef2ff 100%)",
    icon: Description,
    desc: "Draft & pending quotation",
  },
  {
    value: "2",
    label: "2. Supplier Quotation",
    shortLabel: "2. Supplier Quote",
    fullLabel: "2. Supplier Quotation",
    color: "#d97706",
    bgLight: "rgba(217, 119, 6, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #fffbe6 100%)",
    icon: MonetizationOn,
    desc: "PR Raised & Quotation Collection",
  },
  {
    value: "3",
    label: "3. Finance Approval",
    shortLabel: "3. Finance Appr",
    fullLabel: "3. Finance Approval",
    color: "#7c3aed",
    bgLight: "rgba(124, 58, 237, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)",
    icon: AssignmentTurnedIn,
    desc: "Quotations Received & Pending Approval",
  },
  {
    value: "4",
    label: "4. Payment & UTR",
    shortLabel: "4. Payment & UTR",
    fullLabel: "4. Payment & UTR",
    color: "#dc2626",
    bgLight: "rgba(220, 38, 38, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
    icon: ReceiptLong,
    desc: "Finance Approved / Due Payment & UTR",
  },
  {
    value: "5",
    label: "5. Order & Dispatch",
    shortLabel: "5. Order & Disp",
    fullLabel: "5. Order & Dispatch",
    color: "#0284c7",
    bgLight: "rgba(2, 132, 199, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
    icon: LocalShipping,
    desc: "PO Placed & In-Transit Dispatch",
  },
  {
    value: "6",
    label: "6. Site GRN",
    shortLabel: "6. Site GRN",
    fullLabel: "6. Site GRN",
    color: "#ea580c",
    bgLight: "rgba(234, 88, 12, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
    icon: Inventory,
    desc: "Material Arrived & Pending Site GRN",
  },
  {
    value: "7",
    label: "7. Completed",
    shortLabel: "7. Completed",
    fullLabel: "7. Completed",
    color: "#16a34a",
    bgLight: "rgba(22, 163, 74, 0.1)",
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
    icon: CheckCircle,
    desc: "GRN Done, Verified & Closed",
  },
];

export default function ProcurementPulseModal({ open, onClose, onView }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activePreset, setActivePreset] = useState("allTime");
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState("0");
  const [searchTerm, setSearchTerm] = useState("");

  const [pulseData, setPulseData] = useState({
    counts: {
      total: 0,
      stage0: 0,
      stage1: 0,
      stage2: 0,
      stage3: 0,
      stage4: 0,
      stage5: 0,
      stage6: 0,
      stage7: 0,
    },
    stages: {
      "0": [],
      "1": [],
      "2": [],
      "3": [],
      "4": [],
      "5": [],
      "6": [],
      "7": [],
    },
  });

  const fetchPulse = async (start, end, presetKey) => {
    try {
      setLoading(true);
      let url = `${process.env.REACT_APP_API_STRING}/tyre-procurement/pulse`;
      if (presetKey === "allTime" || (!start && !end)) {
        url += `?allTime=true`;
      } else {
        url += `?startDate=${start}&endDate=${end}`;
      }

      const res = await axios.get(url);
      if (res.data?.success) {
        setPulseData({
          counts: res.data.counts || {
            total: 0,
            stage0: 0,
            stage1: 0,
            stage2: 0,
            stage3: 0,
            stage4: 0,
            stage5: 0,
            stage6: 0,
            stage7: 0,
          },
          stages: res.data.stages || {
            "0": res.data.all || [],
            "1": [],
            "2": [],
            "3": [],
            "4": [],
            "5": [],
            "6": [],
            "7": [],
          },
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
      fetchPulse(startDate, endDate, activePreset);
    }
  }, [open, startDate, endDate, activePreset]);

  const handlePreset = (presetKey) => {
    const now = new Date();
    const todayStr = getTodayStr();
    setActivePreset(presetKey);

    if (presetKey === "allTime") {
      setStartDate("");
      setEndDate("");
    } else if (presetKey === "today") {
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

  const isAllTime = activePreset === "allTime" || (!startDate && !endDate);
  const isRange = Boolean(startDate && endDate && startDate !== endDate);
  const daysSelected = startDate && endDate ? getDaysDiff(startDate, endDate) : 0;

  // Active Stage List & Filtered Rows
  const activeStageConfig = useMemo(() => {
    return PULSE_STAGES.find((s) => s.value === activeStage) || PULSE_STAGES[0];
  }, [activeStage]);

  const stageRawRows = pulseData.stages[activeStage] || [];

  const stageFilteredRows = useMemo(() => {
    if (!searchTerm.trim()) return stageRawRows;
    const q = searchTerm.toLowerCase().trim();
    return stageRawRows.filter((row) => {
      return (
        row.prNumber?.toLowerCase().includes(q) ||
        row.poNumber?.toLowerCase().includes(q) ||
        row.displayPoNumber?.toLowerCase().includes(q) ||
        row.companyName?.toLowerCase().includes(q) ||
        row.companyShortName?.toLowerCase().includes(q) ||
        row.stage1?.preparedBy?.toLowerCase().includes(q) ||
        row.stage1?.departmentLocation?.toLowerCase().includes(q) ||
        row.displaySupplier?.toLowerCase().includes(q) ||
        row.stage2?.selectedSupplierL1?.toLowerCase().includes(q) ||
        row.status?.toLowerCase().includes(q)
      );
    });
  }, [stageRawRows, searchTerm]);

  // Stage Total Value
  const stageTotalVolume = useMemo(() => {
    return stageRawRows.reduce((acc, row) => {
      const val = Number(row.displayTotalValue || row.stage2?.selectedSupplierL1Amount || row.stage1?.estimatedTotalCost || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [stageRawRows]);

  const getStatusChipProps = (status, row) => {
    const ci = row?.creditInfo;
    if (ci?.isCredit && !ci?.isPaid) {
      if (ci.diffDays <= 0) {
        return {
          label: ci.diffDays === 0 ? "OVERDUE (TODAY)" : `OVERDUE (${Math.abs(ci.diffDays)}D)`,
          bg: "#fee2e2",
          color: "#dc2626",
        };
      }
      if (ci.diffDays <= 7) {
        return {
          label: `DUE IN ${ci.diffDays} DAYS`,
          bg: "#fef3c7",
          color: "#b45309",
        };
      }
    }

    switch (status) {
      case "Closed":
      case "GRN Done":
      case "GRN Completed":
        return { label: status || "GRN Done", bg: "#dcfce7", color: "#15803d" };
      case "Payment Done":
      case "Order Placed":
        return { label: status, bg: "#e0f2fe", color: "#0369a1" };
      case "Dispatched / Site GRN Ready":
        return { label: "GRN Ready (Credit)", bg: "#ecfdf5", color: "#047857" };
      case "GRN Ready":
      case "GRN Received":
        return { label: status || "GRN Ready", bg: "#ecfdf5", color: "#047857" };
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
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
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
          <Avatar sx={{ bgcolor: "#7c3aed", width: 40, height: 40 }}>
            <ShowChart sx={{ fontSize: 24 }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "17px", color: "#ffffff", letterSpacing: "0.2px" }}>
              Procurement Pulse & Lifecycle Activity
            </Typography>
            <Typography sx={{ color: "#94a3b8", fontSize: "12px" }}>
              Live stage-wise activity tracking across all procurement lifecycle stages
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
          <Clear sx={{ fontSize: 22 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
        {/* Date Range Selector Header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            mb: 2,
            p: 2,
            borderRadius: "8px",
            bgcolor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          {/* Top row: Inputs + Quick Presets */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
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
                      height: 34,
                      fontSize: "12px",
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
                      height: 34,
                      fontSize: "12px",
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
                { id: "allTime", label: "All Records", icon: AllInclusive },
                { id: "thisMonth", label: "This Month", icon: CalendarToday },
                { id: "last30", label: "Last 30 Days", icon: DateRange },
                { id: "last7", label: "Last 7 Days", icon: DateRange },
                { id: "today", label: "Today", icon: Today },
                { id: "yesterday", label: "Yesterday", icon: CalendarToday },
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
                      fontSize: "11.5px",
                      height: 30,
                      px: 1.2,
                      borderRadius: "6px",
                      bgcolor: isSelected ? "#7c3aed" : "transparent",
                      color: isSelected ? "#ffffff" : "#475569",
                      borderColor: isSelected ? "#7c3aed" : "#cbd5e1",
                      "&:hover": {
                        bgcolor: isSelected ? "#6d28d9" : "#f1f5f9",
                        borderColor: isSelected ? "#6d28d9" : "#94a3b8",
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
              pt: 1,
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: "12.5px", color: "#475569" }}>
              {isAllTime ? (
                <>
                  Showing <strong>All Historical Records</strong> across the entire procurement lifecycle
                </>
              ) : !isRange ? (
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
              label={isAllTime ? "All Records" : !isRange ? "Single Day" : `${daysSelected} Days Period`}
              size="small"
              sx={{
                fontSize: "11px",
                height: 22,
                bgcolor: isAllTime ? "#ede9fe" : "#eff6ff",
                color: isAllTime ? "#7c3aed" : "#2563eb",
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>

        {/* ─── 8 STAGES METRIC KPI CARDS GRID ─── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(4, 1fr)",
              md: "repeat(4, 1fr)",
              lg: "repeat(8, 1fr)",
            },
            gap: 1,
            mb: 2,
          }}
        >
          {PULSE_STAGES.map((item) => {
            const count = pulseData.counts[`stage${item.value}`] || 0;
            const isSelected = activeStage === item.value;
            const IconComponent = item.icon;

            return (
              <Tooltip
                key={item.value}
                title={`${item.fullLabel}: ${count} PR(s) — Click to view`}
                placement="top"
                arrow
              >
                <Paper
                  elevation={0}
                  onClick={() => {
                    setActiveStage(item.value);
                  }}
                  sx={{
                    py: 1,
                    px: 1.2,
                    borderRadius: "8px",
                    border: "1.5px solid",
                    borderColor: isSelected ? item.color : "#e2e8f0",
                    background: isSelected
                      ? item.bgGradient
                      : "linear-gradient(135deg, #ffffff 0%, #fcfcfd 100%)",
                    boxShadow: isSelected
                      ? `0 3px 10px ${item.color}30`
                      : "0 1px 2px rgba(0,0,0,0.02)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    transition: "all 0.18s ease-in-out",
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 52,
                    "&:hover": {
                      borderColor: item.color,
                      transform: "translateY(-1px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      "& .pulse-avatar": {
                        transform: "scale(1.08)",
                      },
                    },
                    "&::after": isSelected
                      ? {
                          content: '""',
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: "3px",
                          backgroundColor: item.color,
                          borderRadius: "0 0 8px 8px",
                        }
                      : {},
                  }}
                >
                  <Avatar
                    className="pulse-avatar"
                    sx={{
                      bgcolor: item.bgLight,
                      color: item.color,
                      width: 32,
                      height: 32,
                      borderRadius: "6px",
                      transition: "transform 0.18s ease",
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                    <Typography
                      sx={{
                        color: isSelected ? item.color : "#64748b",
                        fontWeight: 700,
                        fontSize: "9.5px",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.15,
                      }}
                    >
                      {item.shortLabel}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: isSelected ? item.color : "#0f172a",
                        fontSize: "18px",
                        lineHeight: 1.1,
                        mt: 0.2,
                      }}
                    >
                      {count}
                    </Typography>
                  </Box>
                </Paper>
              </Tooltip>
            );
          })}
        </Box>

        {/* ─── 8 STAGES TABS & IN-TABLE SEARCH ─── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            mb: 1.5,
          }}
        >
          <Tabs
            value={activeStage}
            onChange={(e, val) => setActiveStage(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 700,
                fontSize: "12.5px",
                minHeight: 40,
                py: 0.8,
                px: 1.5,
              },
            }}
          >
            {PULSE_STAGES.map((stg) => {
              const count = pulseData.counts[`stage${stg.value}`] || 0;
              return (
                <Tab
                  key={stg.value}
                  value={stg.value}
                  label={`${stg.label} (${count})`}
                  sx={{
                    color: activeStage === stg.value ? `${stg.color} !important` : undefined,
                  }}
                />
              );
            })}
          </Tabs>

          <TextField
            size="small"
            placeholder={`Search ${activeStageConfig.fullLabel}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: "#94a3b8" }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm("")}>
                    <Clear sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              width: { xs: "100%", sm: 260 },
              "& .MuiOutlinedInput-root": {
                height: 32,
                fontSize: "12px",
                bgcolor: "#ffffff",
              },
            }}
          />
        </Box>

        {/* ─── TABLE FOR THE ACTIVE STAGE ─── */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 6 }}>
            <CircularProgress size={34} sx={{ color: activeStageConfig.color }} />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              maxHeight: 420,
              bgcolor: "#ffffff",
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ "& th": { bgcolor: "#f8fafc", color: "#334155", fontWeight: 700, fontSize: "11.5px" } }}>
                  <TableCell sx={{ minWidth: 120 }}>PR Number</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>PO Number</TableCell>
                  <TableCell sx={{ minWidth: 95 }}>Date</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>Company</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>Department / Location</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Supplier</TableCell>
                  <TableCell sx={{ minWidth: 110, textAlign: "right" }}>Total Value (₹)</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
                  <TableCell align="center" sx={{ minWidth: 80 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stageFilteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "#64748b", fontSize: "13px" }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ bgcolor: activeStageConfig.bgLight, color: activeStageConfig.color, width: 42, height: 42 }}>
                          {React.createElement(activeStageConfig.icon, { sx: { fontSize: 22 } })}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, color: "#475569" }}>
                          No records in <strong>{activeStageConfig.fullLabel}</strong> for the selected filter.
                        </Typography>
                        {isAllTime ? (
                          <Typography sx={{ fontSize: "11.5px", color: "#94a3b8" }}>
                            Currently no purchase requests are in this workflow stage.
                          </Typography>
                        ) : (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handlePreset("allTime")}
                            sx={{ fontSize: "12px", textTransform: "none", color: "#7c3aed" }}
                          >
                            Switch to All Records
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  stageFilteredRows.map((row, idx) => {
                    const statusProps = getStatusChipProps(row.status, row);
                    const formattedDate = formatDisplayDate(
                      row.stage1?.prDate || row.createdAt || row.updatedAt
                    );
                    const val = Number(
                      row.displayTotalValue ||
                      row.stage2?.selectedSupplierL1Amount ||
                      row.stage1?.estimatedTotalCost ||
                      0
                    );

                    return (
                      <TableRow key={row._id || idx} hover sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                        {/* PR Number */}
                        <TableCell sx={{ fontWeight: 700, color: "#2563eb", fontSize: "12px" }}>
                          {row.prNumber}
                        </TableCell>

                        {/* PO Number */}
                        <TableCell sx={{ fontSize: "12px", fontWeight: 600, color: row.displayPoNumber !== "-" ? "#7c3aed" : "#94a3b8" }}>
                          {row.displayPoNumber || "-"}
                        </TableCell>

                        {/* Date */}
                        <TableCell sx={{ fontSize: "11.5px", color: "#64748b", whiteSpace: "nowrap" }}>
                          {formattedDate}
                        </TableCell>

                        {/* Company */}
                        <TableCell sx={{ fontSize: "12px", fontWeight: 600 }}>
                          {row.companyShortName || row.companyName || "-"}
                        </TableCell>

                        {/* Department / Branch */}
                        <TableCell sx={{ fontSize: "11.5px", color: "#475569" }}>
                          {row.stage1?.departmentLocation || "-"}
                        </TableCell>

                        {/* Supplier */}
                        <TableCell sx={{ fontSize: "11.5px", fontWeight: 500 }}>
                          {row.displaySupplier || "-"}
                        </TableCell>

                        {/* Total Value */}
                        <TableCell sx={{ fontSize: "12px", textAlign: "right", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                          {val > 0
                            ? `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>

                        {/* Status Chip */}
                        <TableCell>
                          <Chip
                            label={statusProps.label}
                            size="small"
                            sx={{
                              bgcolor: statusProps.bg,
                              color: statusProps.color,
                              fontSize: "10px",
                              fontWeight: 700,
                              height: 22,
                              borderRadius: "4px",
                            }}
                          />
                        </TableCell>

                        {/* Action View */}
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility sx={{ fontSize: 13 }} />}
                            onClick={() => {
                              onClose();
                              onView && onView(row);
                            }}
                            sx={{
                              fontSize: "11px",
                              textTransform: "none",
                              py: 0.2,
                              px: 1,
                              borderRadius: "4px",
                              color: "#2563eb",
                              borderColor: "#bfdbfe",
                              bgcolor: "#eff6ff",
                              "&:hover": { bgcolor: "#dbeafe", borderColor: "#3b82f6" },
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f1f5f9", borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, pl: 1 }}>
          <Typography sx={{ fontSize: "12px", color: "#475569" }}>
            <strong>{activeStageConfig.fullLabel}:</strong> {stageRawRows.length} record(s)
          </Typography>
          {stageTotalVolume > 0 && (
            <Typography sx={{ fontSize: "12px", color: "#0f172a" }}>
              Total Order Value: <strong>₹{Number(stageTotalVolume).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </Typography>
          )}
        </Box>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e293b" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

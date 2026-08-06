import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Tabs,
  Tab,
  InputAdornment,
  Chip,
} from "@mui/material";
import {
  Search,
  Download,
  Refresh,
  Timer,
  CheckCircle,
  HourglassEmpty,
  TrendingUp,
} from "@mui/icons-material";
import axios from "axios";
import * as XLSX from "xlsx";
import { useFetchYears } from "../../utils/useFetchYears";
import { BranchContext } from "../../contexts/BranchContext";

const statCards = [
  {
    key: "totalJobs",
    title: "Billed Jobs",
    description: "Total billed in period",
    color: "#2563eb",
    icon: CheckCircle,
  },
  {
    key: "avgDeliveryToSent",
    title: "Avg Delivery to Sent",
    description: "Delivery to billing sent",
    color: "#7c3aed",
    icon: Timer,
  },
  {
    key: "avgSentToConfirm",
    title: "Avg Sent to Confirm",
    description: "Billing sheet confirmation",
    color: "#ea580c",
    icon: HourglassEmpty,
  },
  {
    key: "avgConfirmToBill",
    title: "Avg Confirm to Billed",
    description: "Bill generation date",
    color: "#0f766e",
    icon: CheckCircle,
  },
  {
    key: "avgTotal",
    title: "Avg Total TAT",
    description: "Delivery to bill date",
    color: "#0284c7",
    icon: TrendingUp,
  },
];

const tableHeadCellSx = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.04em",
  lineHeight: 1.2,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  backgroundColor: "#f8fafc",
  borderBottom: "1px solid #dbe3ef",
};

const tableBodyCellSx = {
  color: "#334155",
  fontSize: 13,
  borderBottom: "1px solid #edf2f7",
  verticalAlign: "top",
};

function BillingTATReport() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportType, setReportType] = useState("monthly"); // "monthly" or "daily"

  // Date filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCalendarYear, setSelectedCalendarYear] = useState(currentYear);
  const [dailyDate, setDailyDate] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10)
  );

  const { years: availableYears, selectedYear, setSelectedYear } = useFetchYears();
  const { selectedBranch, selectedCategory, loading: branchLoading } = useContext(BranchContext);

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const calendarYears = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

  const fetchTATData = useCallback(async (signal) => {
    if (!selectedYear || branchLoading) return;
    try {
      setLoading(true);
      setError(null);

      const apiBase = process.env.REACT_APP_API_STRING || "";
      const params = {
        year: selectedYear,
        branchId: selectedBranch && selectedBranch !== "all" ? selectedBranch : undefined,
        category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
      };

      if (reportType === "monthly") {
        params.month = `${selectedCalendarYear}-${String(selectedMonth).padStart(2, "0")}`;
      } else {
        params.startDate = dailyDate;
        params.endDate = dailyDate;
      }

      const response = await axios.get(`${apiBase}/report/billing-tat`, {
        signal,
        params,
        withCredentials: true,
      });

      if (response.data && response.data.success) {
        setData(response.data.data || []);
      } else {
        throw new Error(response.data.message || "Failed to load report data");
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error("Error fetching billing TAT data:", err);
      setError(err.message || "Failed to fetch billing TAT data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [
    selectedYear,
    selectedBranch,
    selectedCategory,
    branchLoading,
    reportType,
    selectedMonth,
    selectedCalendarYear,
    dailyDate,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTATData(controller.signal);
    return () => controller.abort();
  }, [fetchTATData]);

  // Search filter
  const filteredData = data.filter(
    (item) =>
      !searchTerm ||
      item.job_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.importer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.custom_house?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formatting helper for TAT columns
  const formatTATVal = (days) => {
    if (days === null || days === undefined) return "-";
    const totalHours = Math.round(days * 24);
    const d = Math.floor(totalHours / 24);
    const h = totalHours % 24;
    if (d === 0) return `${h}h`;
    return `${d}d ${h}h`;
  };

  const getTatTone = (days) => {
    if (days === null || days === undefined) {
      return { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
    }
    if (days <= 1) return { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" };
    if (days <= 3) return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
    return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
  };

  const TatChip = ({ value, strong = false }) => {
    const tone = getTatTone(value);
    return (
      <Chip
        label={formatTATVal(value)}
        size="small"
        sx={{
          minWidth: 68,
          height: 26,
          borderRadius: "6px",
          border: `1px solid ${tone.border}`,
          backgroundColor: tone.bg,
          color: tone.color,
          fontSize: 12,
          fontWeight: strong ? 800 : 700,
          "& .MuiChip-label": { px: 1 },
        }}
      />
    );
  };

  // Analytics calculations
  const calculateAverages = () => {
    const getAvgKey = (key) => {
      const validVals = filteredData
        .map((item) => item[key])
        .filter((val) => val !== null && val !== undefined);
      if (validVals.length === 0) return null;
      const sum = validVals.reduce((acc, val) => acc + val, 0);
      return sum / validVals.length;
    };

    return {
      totalJobs: filteredData.length,
      avgDeliveryToSent: getAvgKey("tatDeliveryToSent"),
      avgSentToConfirm: getAvgKey("tatSentToConfirm"),
      avgConfirmToBill: getAvgKey("tatConfirmToBill"),
      avgTotal: getAvgKey("totalTat"),
    };
  };

  const stats = calculateAverages();

  // Export to Excel
  const handleExport = () => {
    const excelData = filteredData.map((row) => ({
      "Job Number": row.job_number || row.job_no,
      "Importer Name": row.importer,
      "Custom House": row.custom_house,
      "Mode": row.mode,
      "Delivery Date": row.deliveryDate || "-",
      "DO Sent to Billing": row.sentToBillingDate || "-",
      "Billing Confirmed Date": row.billingConfirmationDate || "-",
      "Bill Date": row.billDate || "-",
      "Delivery to Sent TAT (Days)": row.tatDeliveryToSent !== null ? row.tatDeliveryToSent : "-",
      "Sent to Confirm TAT (Days)": row.tatSentToConfirm !== null ? row.tatSentToConfirm : "-",
      "Confirm to Billed TAT (Days)": row.tatConfirmToBill !== null ? row.tatConfirmToBill : "-",
      "Total TAT (Days)": row.totalTat !== null ? row.totalTat : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Billing TAT Report");

    // File name based on month or daily type
    const dateString =
      reportType === "monthly"
        ? `${months.find((m) => m.value === selectedMonth)?.label}_${selectedCalendarYear}`
        : dailyDate;

    XLSX.writeFile(workbook, `Billing_TAT_Report_${dateString}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, backgroundColor: "#f8fafc", minHeight: "calc(100vh - 84px)" }}>
      {/* Header and Controls */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 3,
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={4}>
            <Typography variant="overline" sx={{ color: "#2563eb", fontWeight: 800, letterSpacing: "0.08em" }}>
              Reports
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5, letterSpacing: 0 }}>
              Billing TAT Report
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", maxWidth: 440 }}>
              Track turnaround times across the delivery, submission, and invoicing flow.
            </Typography>
          </Grid>

          {/* Report Type Tabs */}
          <Grid item xs={12} md={4} sx={{ display: "flex", justifyContent: { md: "center", xs: "flex-start" } }}>
            <Tabs
              value={reportType}
              onChange={(_, val) => setReportType(val)}
              TabIndicatorProps={{ sx: { display: "none" } }}
              sx={{
                minHeight: 40,
                p: 0.5,
                border: "1px solid #dbeafe",
                borderRadius: "8px",
                backgroundColor: "#eff6ff",
                "& .MuiTab-root": {
                  minHeight: 32,
                  px: 2,
                  borderRadius: "6px",
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "none",
                },
                "& .Mui-selected": {
                  backgroundColor: "#ffffff",
                  color: "#1d4ed8",
                  boxShadow: "0 1px 4px rgba(37, 99, 235, 0.16)",
                },
              }}
            >
              <Tab label="Monthly Report" value="monthly" />
              <Tab label="Daily Report" value="daily" />
            </Tabs>
          </Grid>

          <Grid item xs={12} md={4} sx={{ display: "flex", gap: 1, justifyContent: { xs: "flex-start", md: "flex-end" }, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Refresh />}
              onClick={() => fetchTATData()}
              disabled={loading}
              sx={{ borderRadius: "6px", fontWeight: 700, textTransform: "none" }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={loading || filteredData.length === 0}
              sx={{
                borderRadius: "6px",
                backgroundColor: "#0f766e",
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { backgroundColor: "#115e59" },
              }}
            >
              Export Excel
            </Button>
          </Grid>
        </Grid>

        {/* Date Filter Inputs */}
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #e2e8f0" }}>
          <Grid container spacing={2} alignItems="center">
            {reportType === "monthly" ? (
              <>
                <Grid item xs={12} sm={4} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="month-select-label">Select Month</InputLabel>
                    <Select
                      labelId="month-select-label"
                      value={selectedMonth}
                      label="Select Month"
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                      {months.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="year-select-label">Select Year</InputLabel>
                    <Select
                      labelId="year-select-label"
                      value={selectedCalendarYear}
                      label="Select Year"
                      onChange={(e) => setSelectedCalendarYear(Number(e.target.value))}
                    >
                      {calendarYears.map((yr) => (
                        <MenuItem key={yr} value={yr}>
                          {yr}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            ) : (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Select Bill Date"
                  type="date"
                  fullWidth
                  size="small"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="fy-select-label">Financial Year</InputLabel>
                <Select
                  labelId="fy-select-label"
                  value={selectedYear}
                  label="Financial Year"
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {availableYears.map((yr) => (
                    <MenuItem key={yr.value} value={yr.value}>
                      {yr.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={12} md={3} sx={{ ml: "auto" }}>
              <TextField
                placeholder="Search job or importer..."
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ "& .MuiOutlinedInput-root": { backgroundColor: "#ffffff" } }}
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Analytics Summaries */}
      {!loading && !error && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {statCards.map((card) => {
            const Icon = card.icon;
            const value = card.key === "totalJobs" ? stats.totalJobs : formatTATVal(stats[card.key]);

            return (
              <Grid item xs={12} sm={6} md={2.4} key={card.key}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    border: "1px solid #e2e8f0",
                    borderTop: `4px solid ${card.color}`,
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <CardContent sx={{ p: 2, pb: "16px !important" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.25 }}>
                        {card.title}
                      </Typography>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "8px",
                          backgroundColor: `${card.color}14`,
                          color: card.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "0 0 auto",
                        }}
                      >
                        <Icon sx={{ fontSize: 20 }} />
                      </Box>
                    </Box>
                    <Typography variant="h4" sx={{ color: "#0f172a", fontSize: { xs: 26, md: 28 }, fontWeight: 800, letterSpacing: 0, mb: 0.5 }}>
                      {value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                      {card.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Main Data Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : filteredData.length === 0 ? (
        <Alert severity="info">No billed jobs found for the selected filter criteria.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
            maxHeight: "calc(100vh - 330px)",
          }}
        >
          <Table stickyHeader sx={{ minWidth: 1180 }} size="small" aria-label="billing tat report table">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>Job Number</TableCell>
                <TableCell sx={tableHeadCellSx}>Importer Name</TableCell>
                <TableCell sx={tableHeadCellSx}>Port / CFS</TableCell>
                <TableCell sx={tableHeadCellSx}>Mode</TableCell>
                <TableCell sx={tableHeadCellSx}>Delivered</TableCell>
                <TableCell sx={tableHeadCellSx}>Sent to Billing</TableCell>
                <TableCell sx={tableHeadCellSx}>Confirmed</TableCell>
                <TableCell sx={tableHeadCellSx}>Billed Date</TableCell>
                <TableCell sx={tableHeadCellSx}>Delivery to Sent</TableCell>
                <TableCell sx={tableHeadCellSx}>Sent to Confirm</TableCell>
                <TableCell sx={tableHeadCellSx}>Confirm to Billed</TableCell>
                <TableCell sx={tableHeadCellSx}>Total TAT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((row, idx) => (
                <TableRow
                  key={row.job_no || idx}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfdff",
                    "&:last-child td, &:last-child th": { border: 0 },
                    "&:hover": { backgroundColor: "#eff6ff" },
                  }}
                >
                  <TableCell component="th" scope="row" sx={{ ...tableBodyCellSx, color: "#1d4ed8", fontWeight: 800, whiteSpace: "nowrap" }}>
                    {row.job_number || row.job_no}
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, minWidth: 220, fontWeight: 600 }}>{row.importer || "-"}</TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, minWidth: 150 }}>{row.custom_house || "-"}</TableCell>
                  <TableCell sx={tableBodyCellSx}>
                    <Chip
                      label={row.mode || "-"}
                      size="small"
                      sx={{
                        height: 24,
                        borderRadius: "6px",
                        backgroundColor: "#eef2ff",
                        color: "#3730a3",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, whiteSpace: "nowrap" }}>{row.deliveryDate || "-"}</TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, whiteSpace: "nowrap" }}>{row.sentToBillingDate || "-"}</TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, whiteSpace: "nowrap" }}>{row.billingConfirmationDate || "-"}</TableCell>
                  <TableCell sx={{ ...tableBodyCellSx, color: "#0f172a", fontWeight: 800, whiteSpace: "nowrap" }}>{row.billDate || "-"}</TableCell>

                  {/* TAT columns */}
                  <TableCell sx={tableBodyCellSx}><TatChip value={row.tatDeliveryToSent} /></TableCell>
                  <TableCell sx={tableBodyCellSx}><TatChip value={row.tatSentToConfirm} /></TableCell>
                  <TableCell sx={tableBodyCellSx}><TatChip value={row.tatConfirmToBill} /></TableCell>
                  <TableCell sx={tableBodyCellSx}><TatChip value={row.totalTat} strong /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default BillingTATReport;

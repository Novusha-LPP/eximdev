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
  IconButton,
  Button,
  Tabs,
  Tab,
  InputAdornment,
} from "@mui/material";
import {
  Search,
  Download,
  Refresh,
  DateRange,
  Timer,
  CheckCircle,
  HourglassEmpty,
  TrendingUp,
} from "@mui/icons-material";
import axios from "axios";
import * as XLSX from "xlsx";
import { useFetchYears } from "../../utils/useFetchYears";
import { BranchContext } from "../../contexts/BranchContext";

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
    <Box sx={{ p: 1 }}>
      {/* Header and Controls */}
      <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={4}>
            <Typography variant="h5" sx={{ fontWeight: "700", color: "#1e293b", mb: 0.5 }}>
              Billing TAT Report
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Track turnaround times across the delivery, submission, and invoicing flow.
            </Typography>
          </Grid>

          {/* Report Type Tabs */}
          <Grid item xs={12} md={4} sx={{ display: "flex", justifyContent: { md: "center", xs: "flex-start" } }}>
            <Tabs
              value={reportType}
              onChange={(_, val) => setReportType(val)}
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="Monthly Report" value="monthly" sx={{ fontWeight: "600" }} />
              <Tab label="Daily Report" value="daily" sx={{ fontWeight: "600" }} />
            </Tabs>
          </Grid>

          <Grid item xs={12} md={4} sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Refresh />}
              onClick={() => fetchTATData()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Download />}
              onClick={handleExport}
              disabled={loading || filteredData.length === 0}
            >
              Export Excel
            </Button>
          </Grid>
        </Grid>

        {/* Date Filter Inputs */}
        <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #f1f5f9" }}>
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
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Analytics Summaries */}
      {!loading && !error && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Card 1: Billed Jobs */}
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderLeft: "5px solid #6366f1", height: "100%" }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "600" }}>
                    Billed Jobs
                  </Typography>
                  <CheckCircle sx={{ color: "#6366f1", fontSize: 22 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: "700", color: "#1e293b" }}>
                  {stats.totalJobs}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total billed in period
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 2: Delivery -> Sent to Billing */}
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderLeft: "5px solid #a855f7", height: "100%" }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "600" }}>
                    Avg Delivery → Sent
                  </Typography>
                  <Timer sx={{ color: "#a855f7", fontSize: 22 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: "700", color: "#1e293b" }}>
                  {formatTATVal(stats.avgDeliveryToSent)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Delivery to Billing Sent
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 3: Sent -> Confirm */}
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderLeft: "5px solid #f97316", height: "100%" }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "600" }}>
                    Avg Sent → Confirm
                  </Typography>
                  <HourglassEmpty sx={{ color: "#f97316", fontSize: 22 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: "700", color: "#1e293b" }}>
                  {formatTATVal(stats.avgSentToConfirm)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Billing Sheet Confirmation
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 4: Confirm -> Billed */}
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderLeft: "5px solid #14b8a6", height: "100%" }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "600" }}>
                    Avg Confirm → Billed
                  </Typography>
                  <CheckCircle sx={{ color: "#14b8a6", fontSize: 22 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: "700", color: "#1e293b" }}>
                  {formatTATVal(stats.avgConfirmToBill)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Bill Generation Date
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Card 5: Avg. Total TAT */}
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ borderLeft: "5px solid #0ea5e9", height: "100%" }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: "600" }}>
                    Avg Total TAT
                  </Typography>
                  <TrendingUp sx={{ color: "#0ea5e9", fontSize: 22 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: "700", color: "#1e293b" }}>
                  {formatTATVal(stats.avgTotal)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Delivery to Bill Date
                </Typography>
              </CardContent>
            </Card>
          </Grid>
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
        <TableContainer component={Paper} elevation={1}>
          <Table sx={{ minWidth: 650 }} size="small" aria-label="billing tat report table">
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Job Number</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Importer Name</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Port / CFS</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Mode</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Delivered</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Sent to Billing</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Confirmed</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Billed Date</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Delivery → Sent</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Sent → Confirm</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Confirm → Billed</TableCell>
                <TableCell sx={{ fontWeight: "700", color: "#475569" }}>Total TAT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.map((row, idx) => (
                <TableRow
                  key={row.job_no || idx}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 }, "&:hover": { backgroundColor: "#f8fafc" } }}
                >
                  <TableCell component="th" scope="row" sx={{ fontWeight: "600" }}>
                    {row.job_number || row.job_no}
                  </TableCell>
                  <TableCell>{row.importer}</TableCell>
                  <TableCell>{row.custom_house}</TableCell>
                  <TableCell>{row.mode}</TableCell>
                  <TableCell sx={{ color: "#334155" }}>{row.deliveryDate || "-"}</TableCell>
                  <TableCell sx={{ color: "#334155" }}>{row.sentToBillingDate || "-"}</TableCell>
                  <TableCell sx={{ color: "#334155" }}>{row.billingConfirmationDate || "-"}</TableCell>
                  <TableCell sx={{ color: "#334155", fontWeight: "600" }}>{row.billDate || "-"}</TableCell>

                  {/* TAT columns */}
                  <TableCell sx={{ color: "#475569" }}>{formatTATVal(row.tatDeliveryToSent)}</TableCell>
                  <TableCell sx={{ color: "#475569" }}>{formatTATVal(row.tatSentToConfirm)}</TableCell>
                  <TableCell sx={{ color: "#475569" }}>{formatTATVal(row.tatConfirmToBill)}</TableCell>
                  <TableCell sx={{ color: "#0ea5e9", fontWeight: "700" }}>{formatTATVal(row.totalTat)}</TableCell>
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

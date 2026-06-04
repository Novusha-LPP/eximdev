import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Grid,
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip as MuiTooltip,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const YEARS = [
  new Date().getFullYear() - 1,
  new Date().getFullYear(),
  new Date().getFullYear() + 1,
];

const MONTHS = [
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

const RAG_COLORS = {
  GREEN: "#38a169",
  AMBER: "#d69e2e",
  RED: "#e53e3e",
};

const RAG_BG = {
  GREEN: "#f0fff4",
  AMBER: "#fffff0",
  RED: "#fff5f5",
};

function KPIDashboard() {
  const selectMenuProps = {
    MenuProps: {
      PaperProps: {
        sx: {
          maxHeight: 250,
        },
      },
    },
  };

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ departmentAverages: [], ragDistribution: [], totalRecords: 0 });

  // Filters State
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [department, setDepartment] = useState("");
  const [ragStatus, setRagStatus] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  const [departments, setDepartments] = useState([]);

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch unique departments to populate filter list
  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/hr/employees`
        );
        const depts = [...new Set((res.data || []).map((e) => e.department).filter(Boolean))];
        setDepartments(depts);
      } catch (error) {
        console.error("Error fetching departments for filter:", error);
      }
    }
    fetchEmployees();
  }, []);

  // Fetch KPI data and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch KPI Records
      const recordsRes = await axios.get(
        `${process.env.REACT_APP_API_STRING}/hr/kpi`,
        {
          params: {
            year,
            month,
            department: department || undefined,
            rag_status: ragStatus || undefined,
            score_min: minScore || undefined,
            score_max: maxScore || undefined,
          },
        }
      );
      setData(recordsRes.data || []);

      // 2. Fetch Aggregated Stats
      const statsRes = await axios.get(
        `${process.env.REACT_APP_API_STRING}/hr/kpi/stats`,
        {
          params: {
            year,
            month,
          },
        }
      );
      setStats(statsRes.data || { departmentAverages: [], ragDistribution: [], totalRecords: 0 });
    } catch (error) {
      console.error("Error loading KPI data:", error);
      toast.error("Failed to load KPI dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month, department, ragStatus, minScore, maxScore]);

  const handleOpenDetails = (record) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedRecord(null);
    setDetailsOpen(false);
  };

  // PDF Export
  const exportPDF = () => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF("l", "mm", "a4");
    const monthLabel = MONTHS.find((m) => m.value === month)?.label || "";

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Employee KPI Performance Report - ${monthLabel} ${year}`, 14, 15);

    const headers = [
      ["Employee ID", "Employee Name", "Department", "Designation", "Attendance", "Quality", "Productivity", "Errors/Loss", "Open Tasks", "KPI Score", "RAG"],
    ];

    const rows = data.map((r) => [
      r.employee?.employee_code || "N/A",
      `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`,
      r.employee?.department || "N/A",
      r.employee?.designation || "N/A",
      r.attendance?.raw_score?.toFixed(2) || "0.00",
      r.quality_of_work?.raw_score?.toFixed(2) || "0.00",
      r.productivity?.raw_score?.toFixed(2) || "0.00",
      r.business_loss?.raw_score?.toFixed(2) || "0.00",
      r.open_tasks?.raw_score?.toFixed(2) || "0.00",
      r.total_kpi_score?.toFixed(2) || "0.00",
      r.rag_status || "RED",
    ]);

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 22,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [43, 108, 176] },
    });

    doc.save(`KPI_Report_${monthLabel}_${year}.pdf`);
    toast.success("PDF report downloaded successfully!");
  };

  // Excel Export
  const exportExcel = async () => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const ExcelJS = await import("exceljs");
      const { saveAs } = await import("file-saver");

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("KPI Performance");

      const monthLabel = MONTHS.find((m) => m.value === month)?.label || "";

      // Title block
      worksheet.addRow([`Employee KPI Performance Report - ${monthLabel} ${year}`]);
      worksheet.mergeCells("A1:K1");
      worksheet.getRow(1).font = { bold: true, size: 14 };
      worksheet.getRow(1).height = 30;
      worksheet.getRow(1).alignment = { vertical: "middle" };

      worksheet.addRow([]); // Spacer

      // Headers
      const headerRow = worksheet.addRow([
        "Employee ID",
        "Employee Name",
        "Department",
        "Designation",
        "Attendance Score (/10)",
        "Quality Score (/10)",
        "Productivity Score (/10)",
        "Errors/Loss Score (/10)",
        "Open Tasks Score (/10)",
        "Total KPI Score (/10)",
        "RAG Status",
      ]);

      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2B6CB0" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Data Rows
      data.forEach((r) => {
        const row = worksheet.addRow([
          r.employee?.employee_code || "N/A",
          `${r.employee?.first_name || ""} ${r.employee?.last_name || ""}`,
          r.employee?.department || "N/A",
          r.employee?.designation || "N/A",
          r.attendance?.raw_score || 0,
          r.quality_of_work?.raw_score || 0,
          r.productivity?.raw_score || 0,
          r.business_loss?.raw_score || 0,
          r.open_tasks?.raw_score || 0,
          r.total_kpi_score || 0,
          r.rag_status,
        ]);

        row.height = 20;

        // Alignment
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
        for (let i = 5; i <= 10; i++) {
          row.getCell(i).alignment = { horizontal: "center", vertical: "middle" };
        }
        row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };

        // Color coding for RAG cell
        const ragCell = row.getCell(11);
        let color = "FFFFFFFF";
        let bg = "FFE53E3E"; // Default Red
        if (r.rag_status === "GREEN") {
          bg = "FF38A169";
        } else if (r.rag_status === "AMBER") {
          bg = "FFD69E2E";
        }
        ragCell.font = { bold: true, color: { argb: color } };
        ragCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bg },
        };
      });

      // Widths
      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 25;
      worksheet.getColumn(3).width = 20;
      worksheet.getColumn(4).width = 25;
      for (let i = 5; i <= 10; i++) {
        worksheet.getColumn(i).width = 22;
      }
      worksheet.getColumn(11).width = 15;

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: "application/octet-stream" }),
        `KPI_Performance_Report_${monthLabel}_${year}.xlsx`
      );
      toast.success("Excel report downloaded successfully!");
    } catch (err) {
      console.error("Excel generation failed:", err);
      toast.error("Failed to generate Excel download");
    }
  };

  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Filters Section */}
      <div className="hr-compact-section">
        <div className="hr-section-header">Dashboard Filters</div>
        <div className="hr-section-body">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={2}>
              <div className="hr-compact-field">
                <label className="hr-field-label">Year</label>
                <TextField
                  select
                  fullWidth
                  className="hr-compact-input"
                  variant="filled"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  SelectProps={selectMenuProps}
                >
                  {YEARS.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </Grid>
            <Grid item xs={6} sm={2}>
              <div className="hr-compact-field">
                <label className="hr-field-label">Month</label>
                <TextField
                  select
                  fullWidth
                  className="hr-compact-input"
                  variant="filled"
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  SelectProps={selectMenuProps}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <div className="hr-compact-field">
                <label className="hr-field-label">Department</label>
                <TextField
                  select
                  fullWidth
                  className="hr-compact-input"
                  variant="filled"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  SelectProps={selectMenuProps}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </Grid>
            <Grid item xs={12} sm={2.5}>
              <div className="hr-compact-field">
                <label className="hr-field-label">RAG Status</label>
                <TextField
                  select
                  fullWidth
                  className="hr-compact-input"
                  variant="filled"
                  value={ragStatus}
                  onChange={(e) => setRagStatus(e.target.value)}
                  SelectProps={selectMenuProps}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="GREEN">GREEN (High Performer)</MenuItem>
                  <MenuItem value="AMBER">AMBER (Moderate Performer)</MenuItem>
                  <MenuItem value="RED">RED (Low Performer)</MenuItem>
                </TextField>
              </div>
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <div className="hr-compact-field">
                <label className="hr-field-label">Min Score</label>
                <TextField
                  type="number"
                  fullWidth
                  className="hr-compact-input"
                  variant="filled"
                  placeholder="0.0"
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                />
              </div>
            </Grid>
            <Grid item xs={6} sm={1.5}>
              <div className="hr-compact-field">
                <label className="hr-field-label">Max Score</label>
                <TextField
                  type="number"
                  fullWidth
                  className="hr-compact-input"
                  variant="filled"
                  placeholder="10.0"
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </div>
            </Grid>
          </Grid>
        </div>
      </div>

      {/* Analytics Charts */}
      {stats.totalRecords > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom style={{ fontWeight: 700, color: "#2b6cb0" }}>
                  DEPARTMENT PERFORMANCE AVERAGES
                </Typography>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={stats.departmentAverages}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                      <ChartTooltip />
                      <Bar dataKey="average" fill="#2b6cb0" radius={[4, 4, 0, 0]}>
                        {stats.departmentAverages.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#2b6cb0" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom style={{ fontWeight: 700, color: "#2b6cb0" }}>
                  TEAM RAG DISTRIBUTION
                </Typography>
                <div style={{ width: "100%", height: 260, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.ragDistribution.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.ragDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={RAG_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginLeft: "12px" }}>
                    {stats.ragDistribution.map((entry) => (
                      <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: RAG_COLORS[entry.name] }} />
                        <Typography variant="caption" style={{ fontWeight: 600 }}>
                          {entry.name}: {entry.value}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Table Grid */}
      <div className="hr-compact-section">
        <div className="hr-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Employee KPI Performance Grid ({data.length})</span>
          <Box style={{ display: "flex", gap: "8px" }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={exportExcel}
              style={{ backgroundColor: "#38a169", color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}
            >
              EXCEL
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={exportPDF}
              style={{ backgroundColor: "#2b6cb0", color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}
            >
              PDF
            </Button>
          </Box>
        </div>
        <div className="hr-section-body" style={{ padding: 0 }}>
          {loading ? (
            <Box style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <CircularProgress />
            </Box>
          ) : data.length === 0 ? (
            <Box style={{ display: "flex", justifyContent: "center", padding: "40px", color: "#718096" }}>
              No performance records found for this period.
            </Box>
          ) : (
            <TableContainer component={Paper} className="hr-compact-table">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">ID</TableCell>
                    <TableCell>Employee Name</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Designation</TableCell>
                    <TableCell align="center">KPI Score</TableCell>
                    <TableCell align="center">RAG Status</TableCell>
                    <TableCell align="center">Trend</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row) => {
                    const empName = row.employee
                      ? `${row.employee.first_name || ""} ${row.employee.last_name || ""}`
                      : "Unassigned User";

                    return (
                      <TableRow key={row._id}>
                        <TableCell align="center">{row.employee?.employee_code || "N/A"}</TableCell>
                        <TableCell style={{ fontWeight: 600, color: "#1a365d" }}>{empName}</TableCell>
                        <TableCell>{row.employee?.department || "N/A"}</TableCell>
                        <TableCell>{row.employee?.designation || "N/A"}</TableCell>
                        <TableCell align="center" style={{ fontWeight: 700 }}>
                          {row.total_kpi_score?.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <span
                            className="hr-compact-badge"
                            style={{
                              backgroundColor: RAG_BG[row.rag_status],
                              color: RAG_COLORS[row.rag_status],
                              border: `1px solid ${RAG_COLORS[row.rag_status]}`,
                            }}
                          >
                            {row.rag_status}
                          </span>
                        </TableCell>
                        <TableCell align="center">
                          {row.trend === "up" && (
                            <MuiTooltip title={`Score improved MoM (prev: ${row.prev_score?.toFixed(2)})`}>
                              <TrendingUpIcon style={{ color: "#38a169" }} />
                            </MuiTooltip>
                          )}
                          {row.trend === "down" && (
                            <MuiTooltip title={`Score declined MoM (prev: ${row.prev_score?.toFixed(2)})`}>
                              <TrendingDownIcon style={{ color: "#e53e3e" }} />
                            </MuiTooltip>
                          )}
                          {row.trend === "stable" && (
                            <MuiTooltip title={row.prev_score ? `Score remained stable (prev: ${row.prev_score?.toFixed(2)})` : "No baseline data"}>
                              <TrendingFlatIcon style={{ color: "#718096" }} />
                            </MuiTooltip>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleOpenDetails(row)}
                            style={{ color: "#2b6cb0", fontWeight: 700, fontSize: "0.75rem" }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>

      {/* Details View Dialog */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        {selectedRecord && (
          <>
            <DialogTitle style={{ fontWeight: 700, color: "#1a365d", borderBottom: "1px solid #cbd5e0" }}>
              KPI SCORE CARD DETAILS
            </DialogTitle>
            <DialogContent style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Employee info header */}
              <div className="hr-compact-employee-header">
                <div className="emp-avatar">
                  {selectedRecord.employee?.first_name?.charAt(0)}
                  {selectedRecord.employee?.last_name?.charAt(0)}
                </div>
                <div className="emp-info">
                  <div>
                    <span className="emp-name">
                      {selectedRecord.employee?.first_name} {selectedRecord.employee?.last_name || ""}
                    </span>
                    <span className="emp-detail" style={{ marginLeft: "12px" }}>
                      Code: {selectedRecord.employee?.employee_code || "N/A"}
                    </span>
                  </div>
                  <div className="emp-detail">Department: {selectedRecord.employee?.department || "N/A"}</div>
                  <div className="emp-detail">Designation: {selectedRecord.employee?.designation || "N/A"}</div>
                </div>
              </div>

              {/* Param Breakdowns */}
              <Typography variant="subtitle2" style={{ fontWeight: 700, color: "#2b6cb0", textTransform: "uppercase" }}>
                Parameter Scoring Calculations
              </Typography>
              <div className="hr-compact-table">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Parameter</TableCell>
                      <TableCell align="center">Weight</TableCell>
                      <TableCell align="center">Raw Metric Details</TableCell>
                      <TableCell align="center">Raw Score</TableCell>
                      <TableCell align="center">Weighted Contribution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Attendance */}
                    <TableRow>
                      <TableCell style={{ fontWeight: 600 }}>Attendance</TableCell>
                      <TableCell align="center">20%</TableCell>
                      <TableCell align="center">
                        {selectedRecord.attendance?.present_days || 0} / {selectedRecord.attendance?.working_days || 0} days present
                      </TableCell>
                      <TableCell align="center">{selectedRecord.attendance?.raw_score?.toFixed(2)}</TableCell>
                      <TableCell align="center" style={{ fontWeight: 600 }}>
                        {selectedRecord.attendance?.weighted_score?.toFixed(3)}
                      </TableCell>
                    </TableRow>
                    {/* Quality */}
                    <TableRow>
                      <TableCell style={{ fontWeight: 600 }}>Quality of Work</TableCell>
                      <TableCell align="center">25%</TableCell>
                      <TableCell align="center">Manager review rating</TableCell>
                      <TableCell align="center">{selectedRecord.quality_of_work?.raw_score?.toFixed(2)}</TableCell>
                      <TableCell align="center" style={{ fontWeight: 600 }}>
                        {selectedRecord.quality_of_work?.weighted_score?.toFixed(3)}
                      </TableCell>
                    </TableRow>
                    {/* Productivity */}
                    <TableRow>
                      <TableCell style={{ fontWeight: 600 }}>Quantity / Productivity</TableCell>
                      <TableCell align="center">30%</TableCell>
                      <TableCell align="center">
                        {selectedRecord.productivity?.completed_tasks || 0} / {selectedRecord.productivity?.assigned_targets || 0} targets
                      </TableCell>
                      <TableCell align="center">{selectedRecord.productivity?.raw_score?.toFixed(2)}</TableCell>
                      <TableCell align="center" style={{ fontWeight: 600 }}>
                        {selectedRecord.productivity?.weighted_score?.toFixed(3)}
                      </TableCell>
                    </TableRow>
                    {/* Business Loss */}
                    <TableRow>
                      <TableCell style={{ fontWeight: 600 }}>Business Loss / Errors</TableCell>
                      <TableCell align="center">15%</TableCell>
                      <TableCell align="center">
                        {selectedRecord.business_loss?.incidents || 0} incidents (deduction: {selectedRecord.business_loss?.deduction_per_incident || 1.0})
                      </TableCell>
                      <TableCell align="center">{selectedRecord.business_loss?.raw_score?.toFixed(2)}</TableCell>
                      <TableCell align="center" style={{ fontWeight: 600 }}>
                        {selectedRecord.business_loss?.weighted_score?.toFixed(3)}
                      </TableCell>
                    </TableRow>
                    {/* Open Tasks */}
                    <TableRow>
                      <TableCell style={{ fontWeight: 600 }}>Open Tasks / Open Points</TableCell>
                      <TableCell align="center">10%</TableCell>
                      <TableCell align="center">
                        {selectedRecord.open_tasks?.open_items || 0} open items (deduction: {selectedRecord.open_tasks?.deduction_per_item || 1.0})
                      </TableCell>
                      <TableCell align="center">{selectedRecord.open_tasks?.raw_score?.toFixed(2)}</TableCell>
                      <TableCell align="center" style={{ fontWeight: 600 }}>
                        {selectedRecord.open_tasks?.weighted_score?.toFixed(3)}
                      </TableCell>
                    </TableRow>
                    {/* Total Row */}
                    <TableRow style={{ backgroundColor: RAG_BG[selectedRecord.rag_status] }}>
                      <TableCell colSpan={3} style={{ fontWeight: 800, color: RAG_COLORS[selectedRecord.rag_status] }}>
                        TOTAL MONTHLY SCORE (RAG: {selectedRecord.rag_status})
                      </TableCell>
                      <TableCell align="center" style={{ fontWeight: 800 }}>-</TableCell>
                      <TableCell align="center" style={{ fontWeight: 800, color: RAG_COLORS[selectedRecord.rag_status], fontSize: "1rem" }}>
                        {selectedRecord.total_kpi_score?.toFixed(2)} / 10.00
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Review details */}
              <Box style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                <Box>
                  <Typography variant="caption" style={{ fontWeight: 700, color: "#718096", textTransform: "uppercase" }}>
                    Reviewer Comments
                  </Typography>
                  <Typography variant="body2" style={{ backgroundColor: "#f7fafc", padding: "12px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                    {selectedRecord.comments || "No comments registered."}
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" style={{ fontWeight: 700, color: "#718096", textTransform: "uppercase" }}>
                      Evaluated By
                    </Typography>
                    <Typography variant="body2" style={{ fontWeight: 600 }}>
                      {selectedRecord.reviewed_by?.first_name} {selectedRecord.reviewed_by?.last_name || ""}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" style={{ fontWeight: 700, color: "#718096", textTransform: "uppercase" }}>
                      Evaluation Date
                    </Typography>
                    <Typography variant="body2" style={{ fontWeight: 600 }}>
                      {new Date(selectedRecord.createdAt).toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions style={{ borderTop: "1px solid #cbd5e0", padding: "12px 20px" }}>
              <Button onClick={handleCloseDetails} variant="contained" style={{ backgroundColor: "#2b6cb0", fontWeight: 700 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default React.memo(KPIDashboard);

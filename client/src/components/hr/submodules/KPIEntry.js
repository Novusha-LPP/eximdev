import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Grid,
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";

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

function KPIEntry({ onSaveSuccess }) {
  const selectMenuProps = {
    MenuProps: {
      PaperProps: {
        sx: {
          maxHeight: 250,
        },
      },
    },
  };

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingMetrics, setFetchingMetrics] = useState(false);

  // Form State
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Parameter Inputs
  const [quantityScore, setQuantityScore] = useState("");
  const [qualityScore, setQualityScore] = useState("");
  const [attendanceScore, setAttendanceScore] = useState("");
  const [sopComplianceScore, setSopComplianceScore] = useState("");
  const [openTaskScore, setOpenTaskScore] = useState("");
  const [businessLossScore, setBusinessLossScore] = useState("");
  const [comments, setComments] = useState("");

  const resetMetricFields = () => {
    setQuantityScore("");
    setQualityScore("");
    setAttendanceScore("");
    setSopComplianceScore("");
    setOpenTaskScore("");
    setBusinessLossScore("");
    setComments("");
  };

  const handleAutoFetchMetrics = async (showToast = true) => {
    if (!selectedEmployee || !selectedYear || !selectedMonth) {
      if (showToast) toast.error("Please select employee, year, and month first");
      return;
    }
    setFetchingMetrics(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/hr/kpi/auto-populate`,
        {
          params: {
            employeeId: selectedEmployee,
            year: selectedYear,
            month: selectedMonth,
          },
          withCredentials: true
        }
      );

      const data = res.data;
      if (data) {
        setQuantityScore(data.quantityScore ?? 0);
        setQualityScore(data.qualityScore ?? 0);
        setAttendanceScore(data.attendanceScore ?? 0);
        setSopComplianceScore(data.sopComplianceScore ?? 10);
        setOpenTaskScore(data.openTaskScore ?? 10);
        setBusinessLossScore(data.businessLossScore ?? 10);
        if (showToast) toast.success("Successfully fetched metrics from other modules!");
      }
    } catch (error) {
      console.error("Error auto-populating metrics:", error);
      if (showToast) toast.error("Failed to fetch metrics automatically");
    } finally {
      setFetchingMetrics(false);
    }
  };

  // Load employees dropdown
  useEffect(() => {
    async function fetchEmployees() {
      setLoadingEmployees(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/hr/employees`
        );
        setEmployees(res.data || []);
      } catch (error) {
        console.error("Error loading employees:", error);
        toast.error("Failed to load employees list");
      } finally {
        setLoadingEmployees(false);
      }
    }
    fetchEmployees();
  }, []);

  // Fetch existing KPI sheet if it exists for the employee + year + month
  useEffect(() => {
    if (!selectedEmployee || !selectedYear || !selectedMonth) return;

    async function checkExistingKPI() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/hr/kpi`,
          {
            params: {
              year: selectedYear,
              month: selectedMonth,
            },
          }
        );
        const record = res.data.find(
          (r) => r.employee?._id === selectedEmployee
        );

        if (record) {
          // Prepopulate existing
          setQuantityScore(record.quantity_of_work?.raw_score ?? "");
          setQualityScore(record.quality_of_work?.raw_score ?? "");
          setAttendanceScore(record.attendance?.raw_score ?? "");
          setSopComplianceScore(record.sop_compliance?.raw_score ?? "");
          setOpenTaskScore(record.open_tasks?.raw_score ?? "");
          setBusinessLossScore(record.business_loss?.raw_score ?? "");
          setComments(record.comments || "");
          toast.success("Loaded existing KPI record for editing");
        } else {
          // Reset form values first
          resetMetricFields();
          // No existing record, automatically pull from attendance and kpi modules
          await handleAutoFetchMetrics(false);
        }
      } catch (error) {
        console.error("Error loading existing KPI:", error);
      }
    }
    checkExistingKPI();
  }, [selectedEmployee, selectedYear, selectedMonth]);

  const handleReset = () => {
    setSelectedEmployee("");
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth() + 1);
    resetMetricFields();
    toast.success("Form cleared");
  };

  // Calculations
  const qtyRaw = parseFloat(quantityScore) || 0;
  const qtyWeighted = qtyRaw * 0.25;

  const qualRaw = parseFloat(qualityScore) || 0;
  const qualWeighted = qualRaw * 0.25;

  const attRaw = parseFloat(attendanceScore) || 0;
  const attWeighted = attRaw * 0.15;

  const sopRaw = parseFloat(sopComplianceScore) || 0;
  const sopWeighted = sopRaw * 0.15;

  const openRaw = parseFloat(openTaskScore) || 0;
  const openWeighted = openRaw * 0.10;

  const lossRaw = parseFloat(businessLossScore) || 0;
  const lossWeighted = lossRaw * 0.10;

  const totalScore = parseFloat(
    (qtyWeighted + qualWeighted + attWeighted + sopWeighted + openWeighted + lossWeighted).toFixed(2)
  );

  // RAG determination
  let ragStatus = "RED";
  let ragColor = "#e53e3e"; // Red
  let ragBg = "#fff5f5";
  if (totalScore >= 8.0) {
    ragStatus = "GREEN";
    ragColor = "#38a169"; // Green
    ragBg = "#f0fff4";
  } else if (totalScore >= 5.0) {
    ragStatus = "AMBER";
    ragColor = "#d69e2e"; // Amber
    ragBg = "#fffff0";
  }

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    const scoresToValidate = [
      { name: "Quantity", val: qtyRaw },
      { name: "Quality", val: qualRaw },
      { name: "Attendance", val: attRaw },
      { name: "SOP Compliance", val: sopRaw },
      { name: "Open Tasks", val: openRaw },
      { name: "Business Loss/Error", val: lossRaw },
    ];
    for (const scoreObj of scoresToValidate) {
      if (scoreObj.val < 0 || scoreObj.val > 10) {
        toast.error(`${scoreObj.name} score must be between 0 and 10`);
        return;
      }
    }

    setSaving(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/hr/kpi`,
        {
          employee: selectedEmployee,
          year: selectedYear,
          month: selectedMonth,
          quantityScore: qtyRaw,
          qualityScore: qualRaw,
          attendanceScore: attRaw,
          sopComplianceScore: sopRaw,
          openTaskScore: openRaw,
          businessLossScore: lossRaw,
          comments,
        },
        { withCredentials: true }
      );
      toast.success("KPI evaluation saved successfully!");
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error("Error saving KPI:", error);
      toast.error(error.response?.data?.error || "Failed to save KPI evaluation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSave} className="hr-compact-layout">
      {/* Parameters Panel */}
      <Box style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="hr-compact-section">
          <div className="hr-section-header">Evaluation Selection</div>
          <div className="hr-section-body">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Employee</label>
                  {loadingEmployees ? (
                    <CircularProgress size={24} />
                  ) : (
                    <TextField
                      select
                      fullWidth
                      className="hr-compact-input"
                      variant="filled"
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      SelectProps={selectMenuProps}
                    >
                      {employees.map((emp) => (
                        <MenuItem key={emp._id} value={emp._id}>
                          {emp.first_name} {emp.last_name || ""} ({emp.username})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </div>
              </Grid>
              <Grid item xs={6} sm={3}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Year</label>
                  <TextField
                    select
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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
              <Grid item xs={6} sm={3}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Month</label>
                  <TextField
                    select
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
            </Grid>
          </div>
        </div>

        {/*        {/* Quantity Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Quantity of Work (25% Weight)</div>
          <div className="hr-section-body">
            <div className="hr-compact-field">
              <label className="hr-field-label">Quantity Score (Scale 0–10)</label>
              <TextField
                type="number"
                fullWidth
                className="hr-compact-input"
                variant="filled"
                placeholder="Scale 0 to 10 (e.g. 8.5)"
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                value={quantityScore}
                onChange={(e) => setQuantityScore(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Quality of Work Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Quality of Work (25% Weight)</div>
          <div className="hr-section-body">
            <div className="hr-compact-field">
              <label className="hr-field-label">Quality Score (Scale 0–10)</label>
              <TextField
                type="number"
                fullWidth
                className="hr-compact-input"
                variant="filled"
                placeholder="Scale 0 to 10 (e.g. 9.0)"
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                value={qualityScore}
                onChange={(e) => setQualityScore(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Attendance Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Attendance (15% Weight)</div>
          <div className="hr-section-body">
            <div className="hr-compact-field">
              <label className="hr-field-label">Attendance Score (Scale 0–10)</label>
              <TextField
                type="number"
                fullWidth
                className="hr-compact-input"
                variant="filled"
                placeholder="Scale 0 to 10 (e.g. 9.5)"
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                value={attendanceScore}
                onChange={(e) => setAttendanceScore(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SOP Compliance Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">SOP Compliance (15% Weight)</div>
          <div className="hr-section-body">
            <div className="hr-compact-field">
              <label className="hr-field-label">SOP Compliance Score (Scale 0–10)</label>
              <TextField
                type="number"
                fullWidth
                className="hr-compact-input"
                variant="filled"
                placeholder="Scale 0 to 10 (e.g. 10.0)"
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                value={sopComplianceScore}
                onChange={(e) => setSopComplianceScore(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Open Tasks Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Open Tasks (10% Weight)</div>
          <div className="hr-section-body">
            <div className="hr-compact-field">
              <label className="hr-field-label">Open Tasks Score (Scale 0–10)</label>
              <TextField
                type="number"
                fullWidth
                className="hr-compact-input"
                variant="filled"
                placeholder="Scale 0 to 10 (e.g. 8.0)"
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                value={openTaskScore}
                onChange={(e) => setOpenTaskScore(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Business Loss/Errors Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Business Loss / Errors (10% Weight)</div>
          <div className="hr-section-body">
            <div className="hr-compact-field">
              <label className="hr-field-label">Business Loss/Error Score (Scale 0–10)</label>
              <TextField
                type="number"
                fullWidth
                className="hr-compact-input"
                variant="filled"
                placeholder="Scale 0 to 10 (e.g. 10.0)"
                inputProps={{ step: 0.1, min: 0, max: 10 }}
                value={businessLossScore}
                onChange={(e) => setBusinessLossScore(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Box>

      {/* Calculator Summary Panel */}
      <Box style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Card variant="outlined" style={{ borderColor: "#cbd5e0" }}>
          <CardContent style={{ padding: "20px" }}>
            <Typography variant="h6" gutterBottom style={{ fontWeight: 700, color: "#1a365d" }}>
              KPI SCORE PREVIEW
            </Typography>
            <Divider style={{ margin: "12px 0" }} />

            {/* Calculations Breakdown */}
            <Box style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="textSecondary">
                  Quantity of Work (25%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {qtyRaw.toFixed(2)} × 0.25 = {qtyWeighted.toFixed(3)}
                </Typography>
              </Box>

              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="textSecondary">
                  Quality of Work (25%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {qualRaw.toFixed(2)} × 0.25 = {qualWeighted.toFixed(3)}
                </Typography>
              </Box>

              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="textSecondary">
                  Attendance (15%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {attRaw.toFixed(2)} × 0.15 = {attWeighted.toFixed(3)}
                </Typography>
              </Box>

              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="textSecondary">
                  SOP Compliance (15%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {sopRaw.toFixed(2)} × 0.15 = {sopWeighted.toFixed(3)}
                </Typography>
              </Box>

              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="textSecondary">
                  Open Tasks (10%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {openRaw.toFixed(2)} × 0.10 = {openWeighted.toFixed(3)}
                </Typography>
              </Box>

              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="textSecondary">
                  Business Loss/Error (10%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {lossRaw.toFixed(2)} × 0.10 = {lossWeighted.toFixed(3)}
                </Typography>
              </Box>
            </Box>

            <Divider style={{ margin: "16px 0" }} />

            {/* Total score box */}
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                borderRadius: "6px",
                backgroundColor: ragBg,
                border: `1px solid ${ragColor}`,
              }}
            >
              <Box>
                <Typography variant="h4" style={{ fontWeight: 800, color: ragColor }}>
                  {totalScore.toFixed(2)}
                </Typography>
                <Typography variant="caption" style={{ color: "#718096", fontWeight: 600 }}>
                  TOTAL KPI SCORE / 10
                </Typography>
              </Box>
              <Box
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  color: "#fff",
                  backgroundColor: ragColor,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  letterSpacing: "0.5px",
                }}
              >
                {ragStatus}
              </Box>
            </Box>

            {/* Reviewer Comments */}
            <Box style={{ marginTop: "20px" }}>
              <div className="hr-compact-field">
                <label className="hr-field-label">Reviewer Comments</label>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  className="hr-compact-input"
                  variant="filled"
                  placeholder="Enter comments about employee performance..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </Box>

            {/* Form Actions */}
            <Box style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "24px" }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || !selectedEmployee}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                style={{
                  backgroundColor: "#2b6cb0",
                  flex: "1 1 200px",
                  padding: "10px",
                  fontWeight: 700,
                }}
              >
                {saving ? "SAVING..." : "SAVE EVALUATION"}
              </Button>
              <Button
                type="button"
                variant="contained"
                disabled={fetchingMetrics || !selectedEmployee}
                startIcon={fetchingMetrics ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                onClick={() => handleAutoFetchMetrics(true)}
                style={{
                  backgroundColor: "#4a5568",
                  color: "#fff",
                  flex: "1 1 200px",
                  padding: "10px",
                  fontWeight: 700,
                }}
              >
                {fetchingMetrics ? "FETCHING..." : "AUTO-FETCH METRICS"}
              </Button>
              <Button
                type="button"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                style={{
                  borderColor: "#cbd5e0",
                  color: "#4a5568",
                  padding: "10px",
                  fontWeight: 700,
                  flex: "1 1 100px",
                }}
              >
                RESET
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default React.memo(KPIEntry);

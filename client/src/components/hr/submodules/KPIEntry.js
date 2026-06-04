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
  const [presentDays, setPresentDays] = useState("");
  const [workingDays, setWorkingDays] = useState("");
  const [qualityScore, setQualityScore] = useState("");
  const [completedTasks, setCompletedTasks] = useState("");
  const [assignedTargets, setAssignedTargets] = useState("");
  const [incidents, setIncidents] = useState("");
  const [deductionPerIncident, setDeductionPerIncident] = useState("1.0");
  const [openItems, setOpenItems] = useState("");
  const [deductionPerItem, setDeductionPerItem] = useState("1.0");
  const [comments, setComments] = useState("");

  const resetMetricFields = () => {
    setPresentDays("");
    setWorkingDays("");
    setQualityScore("");
    setCompletedTasks("");
    setAssignedTargets("");
    setIncidents("");
    setDeductionPerIncident("1.0");
    setOpenItems("");
    setDeductionPerItem("1.0");
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
        setPresentDays(data.attendance?.present_days ?? 0);
        setWorkingDays(data.attendance?.working_days ?? 22);
        setQualityScore(data.quality_of_work?.raw_score ?? 0);
        setCompletedTasks(data.productivity?.completed_tasks ?? 0);
        setAssignedTargets(data.productivity?.assigned_targets ?? 10);
        setIncidents(data.business_loss?.incidents ?? 0);
        setDeductionPerIncident(data.business_loss?.deduction_per_incident ?? "1.0");
        setOpenItems(data.open_tasks?.open_items ?? 0);
        setDeductionPerItem(data.open_tasks?.deduction_per_item ?? "1.0");
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
          setPresentDays(record.attendance?.present_days ?? "");
          setWorkingDays(record.attendance?.working_days ?? "");
          setQualityScore(record.quality_of_work?.raw_score ?? "");
          setCompletedTasks(record.productivity?.completed_tasks ?? "");
          setAssignedTargets(record.productivity?.assigned_targets ?? "");
          setIncidents(record.business_loss?.incidents ?? "");
          setDeductionPerIncident(record.business_loss?.deduction_per_incident ?? "1.0");
          setOpenItems(record.open_tasks?.open_items ?? "");
          setDeductionPerItem(record.open_tasks?.deduction_per_item ?? "1.0");
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
  const workingDaysNum = parseFloat(workingDays) || 0;
  const presentDaysNum = parseFloat(presentDays) || 0;
  const attRaw = workingDaysNum > 0 ? Math.min(10, (presentDaysNum / workingDaysNum) * 10) : 0;
  const attWeighted = attRaw * 0.20;

  const qualRaw = parseFloat(qualityScore) || 0;
  const qualWeighted = Math.min(2.5, qualRaw * 0.25);

  const assignedTargetsNum = parseFloat(assignedTargets) || 0;
  const completedTasksNum = parseFloat(completedTasks) || 0;
  const prodRaw = assignedTargetsNum > 0 ? Math.min(10, (completedTasksNum / assignedTargetsNum) * 10) : 0;
  const prodWeighted = prodRaw * 0.30;

  const incidentsNum = parseFloat(incidents) || 0;
  const lossDeductionNum = parseFloat(deductionPerIncident) || 1.0;
  const lossRaw = Math.max(0, 10 - incidentsNum * lossDeductionNum);
  const lossWeighted = lossRaw * 0.15;

  const openItemsNum = parseFloat(openItems) || 0;
  const openDeductionNum = parseFloat(deductionPerItem) || 1.0;
  const openRaw = Math.max(0, 10 - openItemsNum * openDeductionNum);
  const openWeighted = openRaw * 0.10;

  const totalScore = parseFloat(
    (attWeighted + qualWeighted + prodWeighted + lossWeighted + openWeighted).toFixed(2)
  );

  // RAG determination
  let ragStatus = "RED";
  let ragColor = "#e53e3e"; // Red
  let ragBg = "#fff5f5";
  if (totalScore >= 8.0) {
    ragStatus = "GREEN";
    ragColor = "#38a169"; // Green
    ragBg = "#f0fff4";
  } else if (totalScore >= 6.0) {
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
    if (workingDaysNum < presentDaysNum) {
      toast.error("Present days cannot exceed total working days");
      return;
    }
    if (completedTasksNum > assignedTargetsNum) {
      toast.error("Completed tasks cannot exceed assigned targets");
      return;
    }
    if (qualRaw < 0 || qualRaw > 10) {
      toast.error("Quality score must be between 1 and 10");
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/hr/kpi`,
        {
          employee: selectedEmployee,
          year: selectedYear,
          month: selectedMonth,
          attendance: {
            present_days: presentDaysNum,
            working_days: workingDaysNum,
          },
          quality_of_work: {
            raw_score: qualRaw,
          },
          productivity: {
            completed_tasks: completedTasksNum,
            assigned_targets: assignedTargetsNum,
          },
          business_loss: {
            incidents: incidentsNum,
            deduction_per_incident: lossDeductionNum,
          },
          open_tasks: {
            open_items: openItemsNum,
            deduction_per_item: openDeductionNum,
          },
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

        {/* Attendance Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Attendance Score (20% Weight)</div>
          <div className="hr-section-body">
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Working Days</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    placeholder="e.g. 24"
                    value={workingDays}
                    onChange={(e) => setWorkingDays(e.target.value)}
                  />
                </div>
              </Grid>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Present Days</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    placeholder="e.g. 22"
                    value={presentDays}
                    onChange={(e) => setPresentDays(e.target.value)}
                  />
                </div>
              </Grid>
            </Grid>
          </div>
        </div>

        {/* Quality of Work Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Quality of Work (25% Weight)</div>
          <div className="hr-section-body">
            <div className="hr-compact-field">
              <label className="hr-field-label">Manager Review Rating (Scale 1–10)</label>
              <TextField
                type="number"
                fullWidth
                className="hr-compact-input"
                variant="filled"
                placeholder="Scale 1 to 10 (e.g. 8.5)"
                inputProps={{ step: 0.1, min: 1, max: 10 }}
                value={qualityScore}
                onChange={(e) => setQualityScore(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Quantity/Productivity Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Quantity / Productivity (30% Weight)</div>
          <div className="hr-section-body">
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Assigned Targets</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    placeholder="e.g. 20"
                    value={assignedTargets}
                    onChange={(e) => setAssignedTargets(e.target.value)}
                  />
                </div>
              </Grid>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Completed Tasks</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    placeholder="e.g. 16"
                    value={completedTasks}
                    onChange={(e) => setCompletedTasks(e.target.value)}
                  />
                </div>
              </Grid>
            </Grid>
          </div>
        </div>

        {/* Business Loss/Errors Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Business Loss / Errors (15% Weight)</div>
          <div className="hr-section-body">
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Incidents Count</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    placeholder="e.g. 1"
                    value={incidents}
                    onChange={(e) => setIncidents(e.target.value)}
                  />
                </div>
              </Grid>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Deduction Per Incident</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    value={deductionPerIncident}
                    onChange={(e) => setDeductionPerIncident(e.target.value)}
                  />
                </div>
              </Grid>
            </Grid>
          </div>
        </div>

        {/* Open Tasks Parameters */}
        <div className="hr-compact-section">
          <div className="hr-section-header">Open Tasks / Open Points (10% Weight)</div>
          <div className="hr-section-body">
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Open Items Count</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    placeholder="e.g. 3"
                    value={openItems}
                    onChange={(e) => setOpenItems(e.target.value)}
                  />
                </div>
              </Grid>
              <Grid item xs={6}>
                <div className="hr-compact-field">
                  <label className="hr-field-label">Deduction Per Item</label>
                  <TextField
                    type="number"
                    fullWidth
                    className="hr-compact-input"
                    variant="filled"
                    value={deductionPerItem}
                    onChange={(e) => setDeductionPerItem(e.target.value)}
                  />
                </div>
              </Grid>
            </Grid>
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
                  Attendance (20%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {attRaw.toFixed(2)} × 0.20 = {attWeighted.toFixed(3)}
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
                  Productivity (30%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {prodRaw.toFixed(2)} × 0.30 = {prodWeighted.toFixed(3)}
                </Typography>
              </Box>

              <Box style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="textSecondary">
                  Errors/Loss (15%):
                </Typography>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  {lossRaw.toFixed(2)} × 0.15 = {lossWeighted.toFixed(3)}
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

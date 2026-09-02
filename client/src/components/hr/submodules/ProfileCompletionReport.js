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
  LinearProgress,
  IconButton,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";

function ProfileCompletionReport() {
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
  const [departments, setDepartments] = useState([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [completionFilter, setCompletionFilter] = useState("all");
  const [blockingFilter, setBlockingFilter] = useState("all");

  // Dialog State
  const [missingFieldsUser, setMissingFieldsUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Notification state
  const [notifyingUserId, setNotifyingUserId] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/hr/profile-completion`,
        { withCredentials: true }
      );
      setData(res.data || []);

      // Extract unique departments
      const depts = [
        ...new Set(res.data.map((r) => r.department).filter(Boolean)),
      ];
      setDepartments(depts.sort());
    } catch (error) {
      console.error("Error loading profile completion report:", error);
      toast.error("Failed to load profile completion report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Filter & Search Logic
  const filteredData = data.filter((row) => {
    // 1. Search Query
    const nameMatch = `${row.first_name || ""} ${row.last_name || ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const usernameMatch = row.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const codeMatch = row.employee_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || usernameMatch || codeMatch;

    // 2. Department
    const matchesDept = selectedDept === "" || row.department === selectedDept;

    // 3. Completion Range
    let matchesCompletion = true;
    if (completionFilter === "locked") {
      matchesCompletion = row.percentage < 70;
    } else if (completionFilter === "readonly") {
      matchesCompletion = row.percentage >= 70 && row.percentage < 100;
    } else if (completionFilter === "complete") {
      matchesCompletion = row.percentage === 100;
    }

    // 4. Blocking Status
    let matchesBlocking = true;
    if (blockingFilter === "blocking") {
      matchesBlocking = row.hasCriticalMissing === true;
    } else if (blockingFilter === "noblocking") {
      matchesBlocking = row.hasCriticalMissing === false;
    }

    return matchesSearch && matchesDept && matchesCompletion && matchesBlocking;
  });

  // Summary Metrics
  const totalEmployees = data.length;
  const lockedCount = data.filter((r) => r.percentage < 70).length;
  const readonlyCount = data.filter((r) => r.percentage >= 70 && r.percentage < 100).length;
  const completeCount = data.filter((r) => r.percentage === 100).length;
  const avgCompletion = totalEmployees
    ? Math.round(data.reduce((acc, curr) => acc + curr.percentage, 0) / totalEmployees)
    : 0;

  // Handle manual reminders
  const handleNotifyEmployee = async (employeeId) => {
    setNotifyingUserId(employeeId);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/hr/profile-completion/notify-employee`,
        { employeeId },
        { withCredentials: true }
      );
      toast.success("Reminder email sent to employee!");
      fetchReport(); // Refresh notification status
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error(error.response?.data?.error || "Failed to notify employee");
    } finally {
      setNotifyingUserId(null);
    }
  };

  const handleNotifyManager = async (employeeId) => {
    setNotifyingUserId(employeeId);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/hr/profile-completion/notify-manager`,
        { employeeId },
        { withCredentials: true }
      );
      toast.success("Escalation email sent to reporting manager!");
      fetchReport(); // Refresh notification status
    } catch (error) {
      console.error("Error sending escalation:", error);
      toast.error(error.response?.data?.error || "Failed to notify manager");
    } finally {
      setNotifyingUserId(null);
    }
  };

  const handleShowMissingFields = (row) => {
    setMissingFieldsUser(row);
    setDialogOpen(true);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    doc.text("AlVision Profile Completion Report", 40, 40);

    const headers = [
      ["Employee ID", "Name", "Department", "Designation", "Completion %", "Blocking Status", "Days Since Update", "Manager"]
    ];

    const body = filteredData.map((row) => [
      row.employee_code || "-",
      `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username,
      row.department || "-",
      row.designation || "-",
      `${row.percentage}%`,
      row.hasCriticalMissing ? "YES (Blocking Missing)" : "NO (Clean)",
      row.daysSinceLastUpdate,
      row.managerName || "-",
    ]);

    doc.autoTable({
      head: headers,
      body: body,
      startY: 60,
      styles: { fontSize: 8 },
    });

    doc.save("profile_completion_report.pdf");
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Employee ID,Name,Department,Designation,Completion %,Blocking Status,Days Since Update,Manager,Pending Fields"];
    const rows = filteredData.map((row) => {
      const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.username;
      const blocking = row.hasCriticalMissing ? "YES" : "NO";
      const pendingFields = (row.missingMandatoryFields || []).join("; ");
      return `"${row.employee_code || "-"}","${name}","${row.department || "-"}","${row.designation || "-"}","${row.percentage}%","${blocking}",${row.daysSinceLastUpdate},"${row.managerName || "-"}","${pendingFields}"`;
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "profile_completion_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getProgressColor = (percentage) => {
    if (percentage === 100) return "#38a169"; // Green
    if (percentage >= 70) return "#d69e2e"; // Amber/Orange
    return "#e53e3e"; // Red
  };

  return (
    <Box className="hr-compact-layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* Metric Summary Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" style={{ borderColor: "#e2e8f0" }}>
            <CardContent style={{ padding: "16px", textAlign: "center" }}>
              <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                TOTAL EMPLOYEES
              </Typography>
              <Typography variant="h4" style={{ fontWeight: 800, color: "#2b6cb0", marginTop: "4px" }}>
                {totalEmployees}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" style={{ borderColor: "#e2e8f0" }}>
            <CardContent style={{ padding: "16px", textAlign: "center" }}>
              <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                100% COMPLETE
              </Typography>
              <Typography variant="h4" style={{ fontWeight: 800, color: "#38a169", marginTop: "4px" }}>
                {completeCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" style={{ borderColor: "#e2e8f0" }}>
            <CardContent style={{ padding: "16px", textAlign: "center" }}>
              <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                READ-ONLY (70%-99%)
              </Typography>
              <Typography variant="h4" style={{ fontWeight: 800, color: "#d69e2e", marginTop: "4px" }}>
                {readonlyCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" style={{ borderColor: "#e2e8f0" }}>
            <CardContent style={{ padding: "16px", textAlign: "center" }}>
              <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                LOCKED (&lt; 70%)
              </Typography>
              <Typography variant="h4" style={{ fontWeight: 800, color: "#e53e3e", marginTop: "4px" }}>
                {lockedCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card variant="outlined" style={{ borderColor: "#e2e8f0" }}>
            <CardContent style={{ padding: "16px", textAlign: "center" }}>
              <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600 }}>
                AVG COMPLETION %
              </Typography>
              <Typography variant="h4" style={{ fontWeight: 800, color: "#4a5568", marginTop: "4px" }}>
                {avgCompletion}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Panel */}
      <div className="hr-compact-section">
        <div className="hr-section-header">Report Controls & Filters</div>
        <div className="hr-section-body">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                variant="filled"
                placeholder="Search name, ID, username..."
                className="hr-compact-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon style={{ marginRight: 8, color: "#718096" }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <TextField
                select
                fullWidth
                label="Department"
                variant="filled"
                className="hr-compact-input"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                SelectProps={selectMenuProps}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <TextField
                select
                fullWidth
                label="Completion Status"
                variant="filled"
                className="hr-compact-input"
                value={completionFilter}
                onChange={(e) => setCompletionFilter(e.target.value)}
                SelectProps={selectMenuProps}
              >
                <MenuItem value="all">All Completion Levels</MenuItem>
                <MenuItem value="complete">100% Complete</MenuItem>
                <MenuItem value="readonly">70%–99% (Read-Only)</MenuItem>
                <MenuItem value="locked">Below 70% (Locked)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.2}>
              <TextField
                select
                fullWidth
                label="Access Blockers"
                variant="filled"
                className="hr-compact-input"
                value={blockingFilter}
                onChange={(e) => setBlockingFilter(e.target.value)}
                SelectProps={selectMenuProps}
              >
                <MenuItem value="all">All Profiles</MenuItem>
                <MenuItem value="blocking">Critical Fields Missing</MenuItem>
                <MenuItem value="noblocking">Critical Fields Clean</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={1.8} style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <IconButton onClick={handleExportPDF} title="Export PDF" style={{ color: "#e53e3e", backgroundColor: "#fff5f5" }}>
                <FileDownloadIcon />
              </IconButton>
              <IconButton onClick={handleExportCSV} title="Export CSV/Excel" style={{ color: "#2b6cb0", backgroundColor: "#ebf8ff" }}>
                <FileDownloadIcon />
              </IconButton>
            </Grid>
          </Grid>
        </div>
      </div>

      {/* Main Report Table */}
      {loading ? (
        <Box style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" style={{ borderColor: "#cbd5e0" }}>
          <Table className="hr-table hr-compact-table">
            <TableHead style={{ backgroundColor: "#f7fafc" }}>
              <TableRow>
                <TableCell style={{ fontWeight: 700 }}>Employee Code / User</TableCell>
                <TableCell style={{ fontWeight: 700 }}>Role / Dept</TableCell>
                <TableCell style={{ fontWeight: 700 }}>Completion %</TableCell>
                <TableCell style={{ fontWeight: 700 }}>Access Restrictions</TableCell>
                <TableCell style={{ fontWeight: 700 }}>Days Since Update</TableCell>
                <TableCell style={{ fontWeight: 700 }}>Reporting Manager</TableCell>
                <TableCell style={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} style={{ textAlign: "center", color: "#718096" }}>
                    No matching employee profile records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => (
                  <TableRow key={row._id} hover>
                    {/* Employee Info */}
                    <TableCell>
                      <Typography style={{ fontWeight: 600, color: "#2d3748" }}>
                        {row.first_name || row.last_name
                          ? `${row.first_name || ""} ${row.last_name || ""}`.trim()
                          : row.username}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {row.employee_code || "N/A"} | Username: {row.username}
                      </Typography>
                    </TableCell>

                    {/* Role & Dept */}
                    <TableCell>
                      <Typography style={{ fontSize: "0.9rem", color: "#4a5568" }}>
                        {row.designation || "-"}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Dept: {row.department || "Unassigned"}
                      </Typography>
                    </TableCell>

                    {/* Completion score with progress bar */}
                    <TableCell>
                      <Box style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "120px" }}>
                        <Typography style={{ fontWeight: 700, fontSize: "0.85rem", color: getProgressColor(row.percentage) }}>
                          {row.percentage}%
                        </Typography>
                        <Box style={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={row.percentage}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: "#edf2f7",
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: getProgressColor(row.percentage),
                              },
                            }}
                          />
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Status restriction tag */}
                    <TableCell>
                      {row.percentage === 100 ? (
                        <span style={{ padding: "4px 8px", borderRadius: "4px", backgroundColor: "#f0fff4", color: "#38a169", fontWeight: 700, fontSize: "0.75rem" }}>
                          FULL ACCESS
                        </span>
                      ) : row.percentage >= 70 ? (
                        <span style={{ padding: "4px 8px", borderRadius: "4px", backgroundColor: "#fffff0", color: "#d69e2e", fontWeight: 700, fontSize: "0.75rem" }}>
                          READ-ONLY
                        </span>
                      ) : (
                        <span style={{ padding: "4px 8px", borderRadius: "4px", backgroundColor: "#fff5f5", color: "#e53e3e", fontWeight: 700, fontSize: "0.75rem" }}>
                          LOCKED ACCESS
                        </span>
                      )}
                      {row.hasCriticalMissing && (
                        <Box style={{ marginTop: "4px" }}>
                          <span style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "#fff5f5", color: "#e53e3e", fontWeight: 600, fontSize: "0.7rem", border: "1px solid #feb2b2" }}>
                            CRITICAL FIELDS MISSING
                          </span>
                        </Box>
                      )}
                    </TableCell>

                    {/* Days since update */}
                    <TableCell>
                      <Typography style={{ fontSize: "0.9rem", color: "#2d3748" }}>
                        {row.daysSinceLastUpdate} {row.daysSinceLastUpdate === 1 ? "day" : "days"} ago
                      </Typography>
                    </TableCell>

                    {/* Reporting Manager */}
                    <TableCell>
                      <Typography style={{ fontSize: "0.9rem", color: "#2d3748" }}>
                        {row.managerName}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Box style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<InfoIcon />}
                          onClick={() => handleShowMissingFields(row)}
                          style={{ borderColor: "#cbd5e0", color: "#4a5568", fontSize: "0.75rem" }}
                        >
                          Details
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={row.percentage === 100 || notifyingUserId === row._id}
                          startIcon={<MailOutlineIcon />}
                          onClick={() => handleNotifyEmployee(row._id)}
                          style={{
                            backgroundColor: row.percentage === 100 ? "#e2e8f0" : "#3182ce",
                            color: "#fff",
                            fontSize: "0.75rem",
                          }}
                        >
                          {row.profile_employee_notified_at ? "Reminded" : "Remind"}
                        </Button>
                        {row.hasCriticalMissing && (
                          <Button
                            variant="contained"
                            size="small"
                            color="warning"
                            disabled={notifyingUserId === row._id}
                            startIcon={<PriorityHighIcon />}
                            onClick={() => handleNotifyManager(row._id)}
                            style={{
                              backgroundColor: "#dd6b20",
                              color: "#fff",
                              fontSize: "0.75rem",
                            }}
                          >
                            {row.profile_manager_notified_at ? "Escalated" : "Escalate"}
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle style={{ fontWeight: 700, color: "#1a365d" }}>
          Profile Incomplete Details
        </DialogTitle>
        <DialogContent dividers>
          {missingFieldsUser && (
            <Box>
              <Typography variant="subtitle1" style={{ fontWeight: 700, marginBottom: "8px" }}>
                Employee: {missingFieldsUser.first_name} {missingFieldsUser.last_name || ""} ({missingFieldsUser.username})
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: "16px" }}>
                Current Profile Completion: <b>{missingFieldsUser.percentage}%</b>
              </Typography>

              {/* Missing Critical / Blocking Fields */}
              <Box style={{ marginBottom: "16px" }}>
                <Typography style={{ fontWeight: 700, color: "#e53e3e", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.95rem" }}>
                  <PriorityHighIcon fontSize="small" /> Critical Blocking Fields Missing (Block = Yes):
                </Typography>
                {missingFieldsUser.missingBlockingFields?.length === 0 ? (
                  <Typography variant="body2" style={{ color: "#38a169", marginLeft: "24px", marginTop: "4px" }}>
                    None (No access blocking fields missing)
                  </Typography>
                ) : (
                  <ul style={{ margin: "6px 0 0 24px", color: "#e53e3e", fontSize: "0.9rem" }}>
                    {missingFieldsUser.missingBlockingFields?.map((field) => (
                      <li key={field} style={{ fontWeight: 600 }}>{field}</li>
                    ))}
                  </ul>
                )}
              </Box>

              {/* Missing Non-blocking Fields */}
              <Box>
                <Typography style={{ fontWeight: 700, color: "#4a5568", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.95rem" }}>
                  <InfoIcon fontSize="small" /> Other Mandatory Fields Missing (Block = No):
                </Typography>
                {missingFieldsUser.missingMandatoryFields?.filter(f => !missingFieldsUser.missingBlockingFields?.includes(f)).length === 0 ? (
                  <Typography variant="body2" style={{ color: "#38a169", marginLeft: "24px", marginTop: "4px" }}>
                    None
                  </Typography>
                ) : (
                  <ul style={{ margin: "6px 0 0 24px", color: "#4a5568", fontSize: "0.9rem" }}>
                    {missingFieldsUser.missingMandatoryFields
                      ?.filter((field) => !missingFieldsUser.missingBlockingFields?.includes(field))
                      .map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                  </ul>
                )}
              </Box>

              {/* Notification Status */}
              <Box style={{ marginTop: "20px", background: "#f7fafc", padding: "12px", borderRadius: "6px" }}>
                <Typography variant="subtitle2" style={{ fontWeight: 700, color: "#2d3748", marginBottom: "4px" }}>
                  Notification History:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Employee Notified: {missingFieldsUser.profile_employee_notified_at
                    ? `Yes, on ${new Date(missingFieldsUser.profile_employee_notified_at).toLocaleString()}`
                    : "No notifications sent yet"}
                </Typography>
                <Typography variant="body2" color="textSecondary" style={{ marginTop: "4px" }}>
                  Manager Escalation: {missingFieldsUser.profile_manager_notified_at
                    ? `Yes, on ${new Date(missingFieldsUser.profile_manager_notified_at).toLocaleString()}`
                    : "No escalations sent yet"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} variant="contained" style={{ backgroundColor: "#4a5568" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default React.memo(ProfileCompletionReport);

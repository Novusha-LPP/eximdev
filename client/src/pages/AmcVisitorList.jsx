import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import {
  Search,
  Download,
  Printer,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  UserCheck,
} from "lucide-react";
import { amcVisitorAPI } from "../api/amcVisitorAPI";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function AmcVisitorList() {
  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [qrBaseUrl, setQrBaseUrl] = useState(window.location.origin);

  // Statistics
  const [stats, setStats] = useState({
    totalToday: 0,
    activeInside: 0,
    completedToday: 0,
  });

  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await amcVisitorAPI.getLogs({
        status: statusFilter,
        search: searchQuery,
        page: page + 1,
        limit: rowsPerPage,
      });
      if (data && data.success) {
        setLogs(data.data);
        setTotalLogs(data.total || data.data.length);

        // Calculate basic stats for display
        const activeCount = data.data.filter((l) => l.status === "Active").length;
        const completedCount = data.data.filter((l) => l.status === "Checked Out").length;
        setStats({
          totalToday: data.data.length,
          activeInside: activeCount,
          completedToday: completedCount,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load visitor logs");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(0);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(0);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (logs.length === 0) {
      toast.error("No logs to export");
      return;
    }
    const formatted = logs.map((log) => ({
      "Supplier Company": log.supplierCompany,
      "Technician Name": log.technicianName,
      "Mobile No": log.mobileNo,
      "Purpose": log.purpose,
      "AMC Category": log.amcCategory,
      "Department/Area": log.departmentArea,
      "Check-In Time": new Date(log.checkInTime).toLocaleString(),
      "Check-Out Time": log.checkOutTime ? new Date(log.checkOutTime).toLocaleString() : "Still Inside",
      "Work Status": log.workStatus || "Pending",
      "Employee Approval": log.employeeApprovalName || "N/A",
      "Remarks": log.remarks || "",
      "Status": log.status,
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AMC Visitors");
    XLSX.writeFile(wb, "amc_supplier_visitors.xlsx");
    toast.success("Excel exported successfully!");
  };

  // Delete Log
  const handleDeleteLog = async (id) => {
    if (!window.confirm("Are you sure you want to delete this visitor log?")) return;
    try {
      await amcVisitorAPI.deleteLog(id);
      toast.success("Log deleted successfully");
      fetchLogs();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete log");
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (log) => {
    setEditingLog({ ...log });
    setEditDialogOpen(true);
  };

  // Update Log (Edit dialog)
  const handleUpdateLog = async () => {
    try {
      await amcVisitorAPI.updateLog(editingLog._id, editingLog);
      toast.success("Log updated successfully");
      setEditDialogOpen(false);
      fetchLogs();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update log");
    }
  };

  // QR URLs
  const checkInQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    qrBaseUrl + "/amc-entry?mode=checkin"
  )}`;
  const checkOutQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    qrBaseUrl + "/amc-entry?mode=checkout"
  )}`;

  const handlePrintPoster = () => {
    const printContent = document.getElementById("qr-poster-print-area").innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore React state/bindings
  };

  return (
    <Box sx={{ p: 3, maxWidth: "1600px", margin: "0 auto" }}>
      {/* Page Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#1e293b", mb: 1 }}>
            AMC Supplier Logs Dashboard
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage AMC suppliers check-ins, check-outs, and print QR Codes.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Download size={18} />}
          onClick={handleExportExcel}
          sx={{ backgroundColor: "#0f766e", "&:hover": { backgroundColor: "#0d9488" } }}
        >
          Export Excel
        </Button>
      </Box>

      {/* Metrics Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: "5px solid #0f766e", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Active Visits Today
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: "#0f766e", mt: 1 }}>
                  {stats.activeInside}
                </Typography>
              </Box>
              <UserCheck size={36} color="#0f766e" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: "5px solid #16a34a", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Checked Out Today
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: "#16a34a", mt: 1 }}>
                  {stats.completedToday}
                </Typography>
              </Box>
              <Clock size={36} color="#16a34a" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderLeft: "5px solid #3b82f6", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Visitor Logs
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: "#3b82f6", mt: 1 }}>
                  {totalLogs}
                </Typography>
              </Box>
              <Calendar size={36} color="#3b82f6" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(e, val) => setTabValue(val)}
        sx={{
          mb: 3,
          borderBottom: "1px solid #e2e8f0",
          "& .MuiTabs-indicator": { backgroundColor: "#0f766e" },
          "& .MuiTab-root.Mui-selected": { color: "#0f766e", fontWeight: "bold" },
        }}
      >
        <Tab label="Visitor History Logs" />
        <Tab label="QR Poster Print" />
      </Tabs>

      {tabValue === 0 ? (
        // ─── VISITOR HISTORY TAB ───
        <Paper elevation={0} sx={{ p: 3, border: "1px solid #f1f5f9", borderRadius: "12px" }}>
          {/* Filters Bar */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <TextField
              placeholder="Search supplier, technician, mobile..."
              value={searchQuery}
              onChange={handleSearchChange}
              size="small"
              sx={{ flexGrow: 1, minWidth: "250px" }}
              InputProps={{
                startAdornment: <Search size={18} style={{ marginRight: 8, color: "#64748b" }} />,
              }}
            />
            <FormControl size="small" sx={{ minWidth: "180px" }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={handleStatusChange} label="Status">
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="Active">Active / Inside</MenuItem>
                <MenuItem value="Checked Out">Checked Out / Exited</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
              }}
              sx={{ borderColor: "#cbd5e1", color: "#475569" }}
            >
              Reset
            </Button>
          </Box>

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                <TableRow>
                  <TableCell fontWeight="bold">Supplier Company</TableCell>
                  <TableCell fontWeight="bold">Technician</TableCell>
                  <TableCell fontWeight="bold">Mobile No</TableCell>
                  <TableCell fontWeight="bold">AMC Category</TableCell>
                  <TableCell fontWeight="bold">Dept / Area</TableCell>
                  <TableCell fontWeight="bold">Check-In</TableCell>
                  <TableCell fontWeight="bold">Check-Out</TableCell>
                  <TableCell fontWeight="bold">Work Status</TableCell>
                  <TableCell fontWeight="bold">Approval By</TableCell>
                  <TableCell fontWeight="bold">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: "#64748b" }}>
                      No AMC supplier logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log._id} hover>
                      <TableCell>{log.supplierCompany}</TableCell>
                      <TableCell>{log.technicianName}</TableCell>
                      <TableCell>{log.mobileNo}</TableCell>
                      <TableCell>{log.amcCategory}</TableCell>
                      <TableCell>{log.departmentArea}</TableCell>
                      <TableCell>{new Date(log.checkInTime).toLocaleString()}</TableCell>
                      <TableCell>
                        {log.checkOutTime ? (
                          new Date(log.checkOutTime).toLocaleString()
                        ) : (
                          <Chip label="Inside" color="warning" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.workStatus || "Pending"}
                          size="small"
                          color={
                            log.workStatus === "Completed"
                              ? "success"
                              : log.workStatus === "In Progress"
                                ? "primary"
                                : "warning"
                          }
                        />
                      </TableCell>
                      <TableCell>{log.employeeApprovalName || "N/A"}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleOpenEdit(log)} color="primary">
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteLog(log._id)} color="error">
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalLogs}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Paper>
      ) : (
        // ─── QR CODE POSTER PRINT TAB ───
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: "100%" }}>
          <Box sx={{ maxWidth: "800px", width: "100%", p: 3, background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "left" }}>
            <Typography variant="subtitle2" fontWeight="bold" color="#0f766e" mb={1}>
              ⚙️ Mobile Scan Setup (Local Wi-Fi Testing)
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>
              If you access this page via <strong>localhost</strong>, scanning the QR code with your mobile phone will fail. Please replace <strong>localhost</strong> in the URL below with your PC's actual local IP address (e.g. <code>http://192.168.1.5:3000</code>) so that the phone can connect:
            </Typography>
            <TextField
              label="QR Code Base URL"
              variant="outlined"
              fullWidth
              size="small"
              value={qrBaseUrl}
              onChange={(e) => setQrBaseUrl(e.target.value)}
              placeholder="e.g. http://192.168.1.5:3000"
              helperText="Note: Ensure your mobile and PC are on the same Wi-Fi network."
            />
          </Box>

          <Button
            variant="contained"
            startIcon={<Printer size={18} />}
            onClick={handlePrintPoster}
            sx={{ backgroundColor: "#0f766e", "&:hover": { backgroundColor: "#0d9488" }, mb: 1 }}
          >
            Print QR Poster
          </Button>

          {/* Printable Poster Container */}
          <Paper
            id="qr-poster-print-area"
            elevation={2}
            sx={{
              p: 6,
              width: "100%",
              maxWidth: "800px",
              border: "4px double #0f766e",
              borderRadius: "16px",
              background: "#ffffff",
              color: "#0f172a",
              textAlign: "center",
            }}
          >
            {/* Poster Header */}
            <Typography variant="h3" fontWeight="bold" sx={{ color: "#0f766e", mb: 1 }}>
              AMC SUPPLIER CHECK-IN / CHECK-OUT
            </Typography>
            <Typography variant="h6" sx={{ color: "#475569", mb: 4, letterSpacing: "1px" }}>
              VISITOR MANAGEMENT SYSTEM
            </Typography>

            <Divider sx={{ my: 3, borderColor: "#0f766e", borderBottomWidth: "2px" }} />

            {/* QR Codes Grid */}
            <Grid container spacing={4} justifyContent="center" sx={{ my: 4 }}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 3, border: "2px solid #e2e8f0", borderRadius: "12px" }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: "#0f766e" }}>
                    1. CHECK-IN (ENTRY)
                  </Typography>
                  <Box
                    component="img"
                    src={checkInQRUrl}
                    alt="Check-In QR"
                    sx={{ width: "220px", height: "220px", mb: 2 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    Scan before entering the premises
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 3, border: "2px solid #e2e8f0", borderRadius: "12px" }}>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, color: "#b91c1c" }}>
                    2. CHECK-OUT (EXIT)
                  </Typography>
                  <Box
                    component="img"
                    src={checkOutQRUrl}
                    alt="Check-Out QR"
                    sx={{ width: "220px", height: "220px", mb: 2 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    Scan before leaving the premises
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: "#e2e8f0" }} />

            {/* Instructions */}
            <Box sx={{ textAlign: "left", p: 3, background: "#f8fafc", borderRadius: "12px", borderLeft: "6px solid #0f766e" }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5, color: "#0f766e" }}>
                Important Instructions:
              </Typography>
              <Box component="ul" sx={{ pl: 3, margin: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography component="li" variant="body1">
                  <strong>Scan Check-In QR</strong> when you arrive and fill in all mandatory details.
                </Typography>
                <Typography component="li" variant="body1">
                  <strong>Scan Check-Out QR</strong> before leaving to record your exit, work status, and supervisor approval.
                </Typography>
                <Typography component="li" variant="body1">
                  Unauthorized work or entry without check-in is strictly prohibited.
                </Typography>
                <Typography component="li" variant="body1">
                  Please coordinate with security at the main gate for any assistance.
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Edit/Approval Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: "bold" }}>Edit Visitor Log / Supervisor Approval</DialogTitle>
        <DialogContent dividers>
          {editingLog && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
              <TextField
                label="Supplier Company"
                value={editingLog.supplierCompany}
                onChange={(e) => setEditingLog({ ...editingLog, supplierCompany: e.target.value })}
                fullWidth
              />
              <TextField
                label="Technician Name"
                value={editingLog.technicianName}
                onChange={(e) => setEditingLog({ ...editingLog, technicianName: e.target.value })}
                fullWidth
              />
              <TextField
                label="Mobile Number"
                value={editingLog.mobileNo}
                onChange={(e) => setEditingLog({ ...editingLog, mobileNo: e.target.value })}
                fullWidth
              />
              <TextField
                label="Purpose of Visit"
                value={editingLog.purpose}
                onChange={(e) => setEditingLog({ ...editingLog, purpose: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              <FormControl fullWidth>
                <InputLabel>Work Status</InputLabel>
                <Select
                  value={editingLog.workStatus || "Pending"}
                  onChange={(e) => setEditingLog({ ...editingLog, workStatus: e.target.value })}
                  label="Work Status"
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Employee Approval Name"
                value={editingLog.employeeApprovalName || ""}
                onChange={(e) => setEditingLog({ ...editingLog, employeeApprovalName: e.target.value })}
                fullWidth
              />
              <TextField
                label="Remarks / Details"
                value={editingLog.remarks || ""}
                onChange={(e) => setEditingLog({ ...editingLog, remarks: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateLog} sx={{ backgroundColor: "#0f766e" }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>

  );
}

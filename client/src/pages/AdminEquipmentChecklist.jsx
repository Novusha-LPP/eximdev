import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  Box,
  Typography,
  Paper,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  Plus,
  Eye,
  Trash2,
  Calendar,
  Search,
  CheckCircle,
  AlertTriangle,
  Users,
} from "lucide-react";
import { equipmentChecklistAPI } from "../api/equipmentChecklistAPI";
import { UserContext } from "../contexts/UserContext";
import toast from "react-hot-toast";

const EQUIPMENT_ITEMS = [
  { name: "Desktop / Laptop", functionalChecks: ["OK", "Not OK"] },
  { name: "Printer / Scanner", functionalChecks: ["OK", "Not OK"] },
  { name: "Photocopier Machine", functionalChecks: ["OK", "Not OK"] },
  { name: "Water Dispenser / RO", functionalChecks: ["OK", "Not OK"] },
  { name: "Air Conditioner", functionalChecks: ["Cooling OK", "Not OK"] },
  { name: "Refrigerator", functionalChecks: ["Working", "Not OK"] },
  { name: "Microwave Oven", functionalChecks: ["Working", "Not OK"] },
  { name: "CCTV System", functionalChecks: ["Recording OK", "Not OK"] },
  { name: "Biometric Device", functionalChecks: ["Working", "Not OK"] },
  { name: "EPABX / Intercom", functionalChecks: ["Working", "Not OK"] },
  { name: "Fire Extinguisher", functionalChecks: ["Pressure OK", "Not OK"] },
  { name: "UPS / Inverter", functionalChecks: ["Backup OK", "Not OK"] },
];

export default function AdminEquipmentChecklist() {
  const { user } = useContext(UserContext);

  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Form State
  const [checkedBy, setCheckedBy] = useState(user?.username || "");
  const [checklistDate, setChecklistDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [formItems, setFormItems] = useState(
    EQUIPMENT_ITEMS.map((item) => ({
      equipmentName: item.name,
      assetId: "",
      location: "",
      condition: "Good",
      cleaningDone: "Yes",
      functionalCheck: item.functionalChecks[0],
      repairRequired: "No",
      amcVendor: "",
      remarks: "",
    }))
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await equipmentChecklistAPI.getAll({
        search: searchQuery,
        page: page + 1,
        limit: rowsPerPage,
      });
      if (res && res.success) {
        setLogs(res.data);
        setTotalLogs(res.total);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load equipment checklist history");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, rowsPerPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleOpenAddDialog = () => {
    setCheckedBy(user?.username || "");
    setChecklistDate(new Date().toISOString().substring(0, 10));
    setFormItems(
      EQUIPMENT_ITEMS.map((item) => ({
        equipmentName: item.name,
        assetId: "",
        location: "",
        condition: "Good",
        cleaningDone: "Yes",
        functionalCheck: item.functionalChecks[0],
        repairRequired: "No",
        amcVendor: "",
        remarks: "",
      }))
    );
    setAddDialogOpen(true);
  };

  const handleItemChange = (index, field, value) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkedBy) {
      toast.error("Please enter who checked the equipment");
      return;
    }

    try {
      const res = await equipmentChecklistAPI.create({
        checkedBy,
        date: new Date(checklistDate),
        items: formItems,
      });
      if (res && res.success) {
        toast.success("Maintenance Checklist Submitted!");
        setAddDialogOpen(false);
        fetchLogs();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit checklist");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this checklist entry?")) return;
    try {
      const res = await equipmentChecklistAPI.remove(id);
      if (res && res.success) {
        toast.success("Entry deleted");
        fetchLogs();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete checklist entry");
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setViewDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3, maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#1e293b", mb: 1 }}>
            Admin Equipment Maintenance Checklist
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Review functional checks, cleaning statuses, and maintenance history of core facility equipment.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleOpenAddDialog}
          sx={{ backgroundColor: "#0f766e", "&:hover": { backgroundColor: "#0d9488" } }}
        >
          Add New Checklist
        </Button>
      </Box>

      {/* Main Container */}
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #f1f5f9", borderRadius: "12px" }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search by Checker name or Equipment..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <Search size={18} style={{ marginRight: 8, color: "#64748b" }} />,
            }}
          />
          <Button
            variant="outlined"
            onClick={() => setSearchQuery("")}
            sx={{ borderColor: "#cbd5e1", color: "#475569" }}
          >
            Reset
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell fontWeight="bold">Checklist Date</TableCell>
                <TableCell fontWeight="bold">Checked By</TableCell>
                <TableCell fontWeight="bold">Total Equipment</TableCell>
                <TableCell fontWeight="bold">Repairs Required</TableCell>
                <TableCell fontWeight="bold">Created At</TableCell>
                <TableCell fontWeight="bold">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#64748b" }}>
                    No checklist records found. Click 'Add New Checklist' to create one.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const repairCount = log.items.filter((item) => item.repairRequired === "Yes").length;
                  return (
                    <TableRow key={log._id} hover>
                      <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                      <TableCell>{log.checkedBy}</TableCell>
                      <TableCell>{log.items.length}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {repairCount > 0 ? (
                            <>
                              <AlertTriangle size={16} color="#d97706" />
                              <Typography variant="body2" color="warning.main" fontWeight="bold">
                                {repairCount} Equipment(s)
                              </Typography>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} color="#16a34a" />
                              <Typography variant="body2" color="success.main">
                                All OK
                              </Typography>
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleViewDetails(log)} color="primary">
                          <Eye size={16} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(log._id)} color="error">
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
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
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ fontWeight: "bold" }}>New Admin Equipment Maintenance Checklist</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            <TextField
              label="Checked By"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Date"
              type="date"
              value={checklistDate}
              onChange={(e) => setChecklistDate(e.target.value)}
              required
              fullWidth
              size="small"
            />
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "60vh" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell fontWeight="bold">Sr. No</TableCell>
                  <TableCell fontWeight="bold">Equipment Name</TableCell>
                  <TableCell fontWeight="bold">Asset ID</TableCell>
                  <TableCell fontWeight="bold">Location</TableCell>
                  <TableCell fontWeight="bold" sx={{ minWidth: 100 }}>Condition</TableCell>
                  <TableCell fontWeight="bold">Cleaning Done</TableCell>
                  <TableCell fontWeight="bold" sx={{ minWidth: 130 }}>Functional Check</TableCell>
                  <TableCell fontWeight="bold">Repair Req.</TableCell>
                  <TableCell fontWeight="bold">AMC Vendor</TableCell>
                  <TableCell fontWeight="bold">Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formItems.map((item, idx) => {
                  const matchingConf = EQUIPMENT_ITEMS.find((c) => c.name === item.equipmentName);
                  return (
                    <TableRow key={item.equipmentName}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>{item.equipmentName}</TableCell>
                      <TableCell>
                        <TextField
                          value={item.assetId}
                          onChange={(e) => handleItemChange(idx, "assetId", e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.location}
                          onChange={(e) => handleItemChange(idx, "location", e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.condition}
                            onChange={(e) => handleItemChange(idx, "condition", e.target.value)}
                          >
                            <MenuItem value="Good">Good</MenuItem>
                            <MenuItem value="Fair">Fair</MenuItem>
                            <MenuItem value="Poor">Poor</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.cleaningDone}
                            onChange={(e) => handleItemChange(idx, "cleaningDone", e.target.value)}
                          >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.functionalCheck}
                            onChange={(e) => handleItemChange(idx, "functionalCheck", e.target.value)}
                          >
                            {matchingConf?.functionalChecks.map((chk) => (
                              <MenuItem key={chk} value={chk}>
                                {chk}
                              </MenuItem>
                            ))}
                            <MenuItem value="Not OK">Not OK</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={item.repairRequired}
                            onChange={(e) => handleItemChange(idx, "repairRequired", e.target.value)}
                          >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.amcVendor}
                          onChange={(e) => handleItemChange(idx, "amcVendor", e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.remarks}
                          onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ backgroundColor: "#0f766e", "&:hover": { backgroundColor: "#0d9488" } }}>
            Submit Checklist
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ fontWeight: "bold" }}>Equipment Checklist Details</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Calendar size={24} color="#0f766e" />
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Date Checked
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {new Date(selectedLog.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Users size={24} color="#0f766e" />
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Checked By
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {selectedLog.checkedBy}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <AlertTriangle size={24} color="#b91c1c" />
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Repairs Required
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="error.main">
                          {selectedLog.items.filter((item) => item.repairRequired === "Yes").length} Device(s)
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell fontWeight="bold">Sr. No</TableCell>
                      <TableCell fontWeight="bold">Equipment Name</TableCell>
                      <TableCell fontWeight="bold">Asset ID</TableCell>
                      <TableCell fontWeight="bold">Location</TableCell>
                      <TableCell fontWeight="bold">Condition</TableCell>
                      <TableCell fontWeight="bold">Cleaning Done</TableCell>
                      <TableCell fontWeight="bold">Functional Check</TableCell>
                      <TableCell fontWeight="bold">Repair Req.</TableCell>
                      <TableCell fontWeight="bold">AMC Vendor</TableCell>
                      <TableCell fontWeight="bold">Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedLog.items.map((item, idx) => (
                      <TableRow key={item.equipmentName} sx={item.repairRequired === "Yes" ? { backgroundColor: "#fffbeb" } : {}}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>{item.equipmentName}</TableCell>
                        <TableCell>{item.assetId || "—"}</TableCell>
                        <TableCell>{item.location || "—"}</TableCell>
                        <TableCell>{item.condition || "—"}</TableCell>
                        <TableCell>{item.cleaningDone || "—"}</TableCell>
                        <TableCell>{item.functionalCheck || "—"}</TableCell>
                        <TableCell sx={{ color: item.repairRequired === "Yes" ? "error.main" : "text.primary", fontWeight: item.repairRequired === "Yes" ? "bold" : "normal" }}>
                          {item.repairRequired || "—"}
                        </TableCell>
                        <TableCell>{item.amcVendor || "—"}</TableCell>
                        <TableCell>{item.remarks || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

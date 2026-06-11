import React, { useState } from "react";
import { toast } from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  Chip,
  Tabs,
  Tab,
  Select,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
  import PersonIcon from "@mui/icons-material/Person";

// Asset history types
const HISTORY_TYPES = [
  "Assigned",
  "Unassigned",
  "Transfer",
  "Maintenance",
  "Repair",
  "Upgrade",
  "Retirement",
  "Disposal"
];

// Asset status changes
const STATUS_CHANGES = [
  { from: "Available", to: "Active" },
  { from: "Active", to: "Under Maintenance" },
  { from: "Under Maintenance", to: "Active" },
  { from: "Active", to: "Retired" },
  { from: "Retired", to: "Disposed" }
];

export default function AssetHistory({ assetId, assetTag }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState({
    type: "Assigned",
    date: new Date().toISOString().split('T')[0],
    description: "",
    performed_by: "",
    details: {}
  });
  const [activeTab, setActiveTab] = useState("timeline");

  // Fetch asset history
  const fetchHistory = () => {
    setLoading(true);
    // In a real app, this would be an API call
    setTimeout(() => {
      // Mock data for demonstration
      const mockHistory = [
        {
          id: 1,
          type: "Assigned",
          date: "2023-01-15",
          description: "Assigned to John Doe",
          performed_by: "IT Admin",
          details: {
            assigned_to: "John Doe",
            previous_status: "Available",
            new_status: "Active"
          }
        },
        {
          id: 2,
          type: "Transfer",
          date: "2023-03-22",
          description: "Transferred from Office 1 to Office 2",
          performed_by: "IT Admin",
          details: {
            from_location: "Office 1 - Floor 1",
            to_location: "Office 1 - Floor 2"
          }
        },
        {
          id: 3,
          type: "Maintenance",
          date: "2023-06-10",
          description: "Routine hardware maintenance",
          performed_by: "Service Provider",
          details: {
            maintenance_type: "Routine",
            duration: "2 hours"
          }
        }
      ];
      setHistory(mockHistory);
      setLoading(false);
    }, 500);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open modal for adding/editing history entry
  const handleOpenModal = (entry = null) => {
    if (entry) {
      setEditingEntry(entry);
      setForm({
        type: entry.type,
        date: entry.date,
        description: entry.description,
        performed_by: entry.performed_by,
        details: entry.details || {}
      });
    } else {
      setEditingEntry(null);
      setForm({
        type: "Assigned",
        date: new Date().toISOString().split('T')[0],
        description: "",
        performed_by: "",
        details: {}
      });
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEntry(null);
  };

  // Save history entry
  const handleSaveEntry = () => {
    if (!form.type || !form.date || !form.description) {
      toast.error("Type, Date, and Description are required");
      return;
    }

    if (editingEntry) {
      // Update existing entry
      setHistory(prev => prev.map(entry => 
        entry.id === editingEntry.id ? { ...entry, ...form } : entry
      ));
      toast.success("History entry updated successfully");
    } else {
      // Add new entry
      const newEntry = {
        id: Date.now(),
        ...form
      };
      setHistory(prev => [...prev, newEntry]);
      toast.success("History entry added successfully");
    }

    handleCloseModal();
  };

  // Delete history entry
  const handleDeleteEntry = (id) => {
    if (window.confirm("Are you sure you want to delete this history entry?")) {
      setHistory(prev => prev.filter(entry => entry.id !== id));
      toast.success("History entry deleted successfully");
    }
  };

  // Initialize history data
  React.useEffect(() => {
    fetchHistory();
  }, [assetId]);

  // Get history type color
  const getHistoryTypeColor = (type) => {
    switch (type) {
      case "Assigned":
        return "success";
      case "Unassigned":
        return "info";
      case "Transfer":
        return "warning";
      case "Maintenance":
      case "Repair":
        return "secondary";
      case "Upgrade":
        return "primary";
      case "Retirement":
      case "Disposal":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <HistoryIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Asset History - {assetTag}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} aria-label="asset-history-tabs">
            <Tab label="Timeline" value="timeline" />
            <Tab label="Status Changes" value="status-changes" />
            <Tab label="Maintenance Records" value="maintenance" />
          </Tabs>

          <Box mt={2}>
            {activeTab === "timeline" && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Timeline</Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()}>
                    Add Entry
                  </Button>
                </Box>

                {loading ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Performed By</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No history entries found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          history.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{entry.date}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={entry.type} 
                                  color={getHistoryTypeColor(entry.type)} 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell>{entry.performed_by}</TableCell>
                              <TableCell align="right">
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => handleOpenModal(entry)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => handleDeleteEntry(entry.id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {activeTab === "status-changes" && (
              <Box>
                <Typography variant="h6" mb={2}>Status Changes</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>From</TableCell>
                        <TableCell>To</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Performed By</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.filter(entry => entry.type === "Assigned" || entry.type === "Unassigned").map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.details?.previous_status || "N/A"}</TableCell>
                          <TableCell>{entry.details?.new_status || "N/A"}</TableCell>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell>{entry.performed_by}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenModal(entry)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteEntry(entry.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {activeTab === "maintenance" && (
              <Box>
                <Typography variant="h6" mb={2}>Maintenance Records</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Performed By</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.filter(entry => entry.type === "Maintenance" || entry.type === "Repair").map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell>
                            <Chip 
                              label={entry.type} 
                              color={getHistoryTypeColor(entry.type)} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell>{entry.details?.duration || "N/A"}</TableCell>
                          <TableCell>{entry.performed_by}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleOpenModal(entry)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteEntry(entry.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* History Entry Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editingEntry ? "Edit History Entry" : "Add History Entry"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                select
                label="Type"
                size="small"
                fullWidth
                value={form.type}
                onChange={handleInputChange}
                name="type"
              >
                {HISTORY_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Date"
                type="date"
                size="small"
                fullWidth
                value={form.date}
                onChange={handleInputChange}
                name="date"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                value={form.description}
                onChange={handleInputChange}
                name="description"
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Performed By"
                size="small"
                fullWidth
                value={form.performed_by}
                onChange={handleInputChange}
                name="performed_by"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {form.type === "Assigned" && (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Previous Status"
                    size="small"
                    fullWidth
                    value={form.details?.previous_status || ""}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        previous_status: e.target.value
                      }
                    }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="New Status"
                    size="small"
                    fullWidth
                    value={form.details?.new_status || ""}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        new_status: e.target.value
                      }
                    }))}
                  />
                </Grid>
              </>
            )}
            {form.type === "Transfer" && (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="From Location"
                    size="small"
                    fullWidth
                    value={form.details?.from_location || ""}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        from_location: e.target.value
                      }
                    }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="To Location"
                    size="small"
                    fullWidth
                    value={form.details?.to_location || ""}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        to_location: e.target.value
                      }
                    }))}
                  />
                </Grid>
              </>
            )}
            {(form.type === "Maintenance" || form.type === "Repair") && (
              <>
                <Grid item xs={6}>
                  <TextField
                    label="Maintenance Type"
                    size="small"
                    fullWidth
                    value={form.details?.maintenance_type || ""}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        maintenance_type: e.target.value
                      }
                    }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Duration"
                    size="small"
                    fullWidth
                    value={form.details?.duration || ""}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      details: {
                        ...prev.details,
                        duration: e.target.value
                      }
                    }))}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSaveEntry} variant="contained">
            {editingEntry ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

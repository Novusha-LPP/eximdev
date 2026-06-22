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
  InputAdornment,
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
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_STATUSES = ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"];

const statusColor = (s) => {
  switch (s) {
    case "New":
      return "error";
    case "Assigned":
      return "info";
    case "In Progress":
      return "warning";
    case "Pending":
      return "default";
    case "Resolved":
      return "success";
    case "Closed":
      return "success";
    default:
      return "default";
  }
};

const priorityColor = (p) => {
  switch (p) {
    case "Critical":
      return "error";
    case "High":
      return "warning";
    case "Medium":
      return "info";
    case "Low":
      return "default";
    default:
      return "default";
  }
};

export default function IncidentManagement({ incidents, loading, setIncidents }) {
  const [filters, setFilters] = useState({ status: "", category: "", priority: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Hardware",
    priority: "High",
    status: "New",
    impact: "Low",
    urgency: "Medium",
  });

  const handleSave = () => {
    if (editId) {
      // Update existing incident
      setIncidents(incidents.map(incident => 
        incident.id === editId ? { ...form, id: editId } : incident
      ));
      toast.success("Incident updated");
    } else {
      // Add new incident
      setIncidents([...incidents, { ...form, id: Date.now() }]);
      toast.success("Incident created");
    }
    setShowModal(false);
    setEditId(null);
    setForm({
      title: "",
      description: "",
      category: "Hardware",
      priority: "High",
      status: "New",
      impact: "Low",
      urgency: "Medium",
    });
  };

  const handleEdit = (incident) => {
    setEditId(incident.id);
    setForm({
      title: incident.title,
      description: incident.description,
      category: incident.category,
      priority: incident.priority,
      status: incident.status,
      impact: incident.impact,
      urgency: incident.urgency,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this incident?")) {
      setIncidents(incidents.filter(incident => incident.id !== id));
      toast.success("Incident deleted");
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    return (
      (!filters.status || incident.status === filters.status) &&
      (!filters.category || incident.category === filters.category) &&
      (!filters.priority || incident.priority === filters.priority) &&
      (!filters.search || 
        incident.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        incident.description.toLowerCase().includes(filters.search.toLowerCase())
      )
    );
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Incident Management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => {
            // Refresh logic here
          }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowModal(true)}>
            Create Incident
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {TICKET_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Category"
                size="small"
                fullWidth
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              >
                <MenuItem value="">All Categories</MenuItem>
                {TICKET_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Priority"
                size="small"
                fullWidth
                value={filters.priority}
                onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
              >
                <MenuItem value="">All Priorities</MenuItem>
                {TICKET_PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Search Title / ID"
                size="small"
                fullWidth
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Impact</TableCell>
                    <TableCell>Urgency</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredIncidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No incidents found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell>{incident.id}</TableCell>
                        <TableCell>{incident.title}</TableCell>
                        <TableCell>{incident.category}</TableCell>
                        <TableCell>
                          <Chip label={incident.priority} color={priorityColor(incident.priority)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={incident.status} color={statusColor(incident.status)} size="small" />
                        </TableCell>
                        <TableCell>{incident.impact}</TableCell>
                        <TableCell>{incident.urgency}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEdit(incident)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(incident.id)}>
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
        </CardContent>
      </Card>

      {/* Incident Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Incident" : "Create Incident"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                required
                size="small"
                fullWidth
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                multiline
                minRows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Category"
                size="small"
                fullWidth
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {TICKET_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Priority"
                size="small"
                fullWidth
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Status"
                size="small"
                fullWidth
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {TICKET_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Impact"
                size="small"
                fullWidth
                value={form.impact}
                onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value }))}
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Urgency"
                size="small"
                fullWidth
                value={form.urgency}
                onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.title}>
            {editId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

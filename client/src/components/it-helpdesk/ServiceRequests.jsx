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
import BusinessIcon from "@mui/icons-material/Business";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

const SERVICE_TYPES = ["New Service", "Change Request", "Incident", "Information Request"];
const SERVICE_STATUSES = ["New", "In Progress", "Completed", "Cancelled", "On Hold"];
const SERVICE_PRIORITIES = ["Low", "Medium", "High", "Critical"];

const statusColor = (s) => {
  switch (s) {
    case "New":
      return "error";
    case "In Progress":
      return "warning";
    case "Completed":
      return "success";
    case "Cancelled":
      return "default";
    case "On Hold":
      return "info";
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

export default function ServiceRequests({ serviceRequests, loading, setServiceRequests }) {
  const [filters, setFilters] = useState({ status: "", type: "", priority: "", search: "" });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "New Service",
    priority: "Medium",
    status: "New",
    requester: "",
    department: "",
    estimated_completion: "",
  });

  const handleSave = () => {
    if (editId) {
      // Update existing service request
      setServiceRequests(serviceRequests.map(request => 
        request.id === editId ? { ...form, id: editId } : request
      ));
      toast.success("Service request updated");
    } else {
      // Add new service request
      setServiceRequests([...serviceRequests, { ...form, id: Date.now() }]);
      toast.success("Service request created");
    }
    setShowModal(false);
    setEditId(null);
    setForm({
      title: "",
      description: "",
      type: "New Service",
      priority: "Medium",
      status: "New",
      requester: "",
      department: "",
      estimated_completion: "",
    });
  };

  const handleEdit = (request) => {
    setEditId(request.id);
    setForm({
      title: request.title,
      description: request.description,
      type: request.type,
      priority: request.priority,
      status: request.status,
      requester: request.requester,
      department: request.department,
      estimated_completion: request.estimated_completion,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this service request?")) {
      setServiceRequests(serviceRequests.filter(request => request.id !== id));
      toast.success("Service request deleted");
    }
  };

  const filteredRequests = serviceRequests.filter(request => {
    return (
      (!filters.status || request.status === filters.status) &&
      (!filters.type || request.type === filters.type) &&
      (!filters.priority || request.priority === filters.priority) &&
      (!filters.search || 
        request.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        request.description.toLowerCase().includes(filters.search.toLowerCase())
      )
    );
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <BusinessIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Service Requests
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => {
            // Refresh logic here
          }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowModal(true)}>
            Create Request
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
                {SERVICE_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Type"
                size="small"
                fullWidth
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                <MenuItem value="">All Types</MenuItem>
                {SERVICE_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
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
                {SERVICE_PRIORITIES.map((p) => (
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
                    <TableCell>Type</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Requester</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No service requests found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.id}</TableCell>
                        <TableCell>{request.title}</TableCell>
                        <TableCell>{request.type}</TableCell>
                        <TableCell>
                          <Chip label={request.priority} color={priorityColor(request.priority)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={request.status} color={statusColor(request.status)} size="small" />
                        </TableCell>
                        <TableCell>{request.requester}</TableCell>
                        <TableCell>{request.department}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEdit(request)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(request.id)}>
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

      {/* Service Request Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Service Request" : "Create Service Request"}</DialogTitle>
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
                label="Type"
                size="small"
                fullWidth
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {SERVICE_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
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
                {SERVICE_PRIORITIES.map((p) => (
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
                {SERVICE_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Requester"
                size="small"
                fullWidth
                value={form.requester}
                onChange={(e) => setForm((f) => ({ ...f, requester: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Department"
                size="small"
                fullWidth
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Estimated Completion"
                type="date"
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.estimated_completion}
                onChange={(e) => setForm((f) => ({ ...f, estimated_completion: e.target.value }))}
              />
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

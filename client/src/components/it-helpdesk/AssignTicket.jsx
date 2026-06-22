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
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

const TICKET_STATUSES = ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];

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

export default function AssignTicket({ 
  data, 
  loading, 
  users, 
  filters, 
  setFilters, 
  pagination, 
  fetchData,
  selectedTicket,
  setSelectedTicket,
  showAssignModal,
  setShowAssignModal,
  form,
  setForm,
  saving,
  setSaving
}) {
  const handleAssign = async () => {
    setSaving(true);
    try {
      // Handle assignment logic here
      setShowAssignModal(false);
      toast.success("Ticket assigned successfully");
      fetchData(pagination.page);
    } catch (err) {
      toast.error("Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <ConfirmationNumberIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Assign Tickets
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => fetchData(pagination.page)}>
            Refresh
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={4}>
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
                    <TableCell>Ticket ID</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No tickets found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((t) => (
                      <TableRow key={t._id} hover>
                        <TableCell>{t.ticket_id || t._id}</TableCell>
                        <TableCell>{t.title}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>
                          <Chip label={t.priority} color={priorityColor(t.priority)} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={t.status} color={statusColor(t.status)} size="small" />
                        </TableCell>
                        <TableCell>
                          {t.assigned_to?.username || t.raised_by?.username || "—"}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Assign">
                            <IconButton size="small" onClick={() => {
                              setSelectedTicket(t);
                              setShowAssignModal(true);
                            }}>
                              <EditIcon fontSize="small" />
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

      {/* Assign Ticket Modal */}
      <Dialog open={showAssignModal} onClose={() => setShowAssignModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Ticket</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">Ticket: {selectedTicket?.title || ""}</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                label="Assign To"
                size="small"
                fullWidth
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {users.length > 0 ? (
                  users.map((u) => (
                    <MenuItem key={u._id} value={u._id}>
                      {u.username} {u.first_name ? `(${u.first_name})` : ""}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Loading users...</MenuItem>
                )}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAssignModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAssign} variant="contained" disabled={saving || !form.assigned_to}>
            {saving ? "Assigning..." : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

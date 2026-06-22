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
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_STATUSES = ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed"];

export default function TicketEscalation({ escalationRules, setEscalationRules }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    name: "",
    priority: "Medium",
    status: "New",
    time_threshold: 24,
    escalate_to: "manager",
    message: "",
    active: true,
  });

  const handleSave = () => {
    if (editingRule) {
      // Update existing escalation rule
      setEscalationRules(escalationRules.map(rule => 
        rule.id === editingRule.id ? { ...form, id: editingRule.id } : rule
      ));
      toast.success("Escalation rule updated");
    } else {
      // Add new escalation rule
      setEscalationRules([...escalationRules, { ...form, id: Date.now() }]);
      toast.success("Escalation rule added");
    }
    setShowModal(false);
    setEditingRule(null);
    setForm({
      name: "",
      priority: "Medium",
      status: "New",
      time_threshold: 24,
      escalate_to: "manager",
      message: "",
      active: true,
    });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      priority: rule.priority,
      status: rule.status,
      time_threshold: rule.time_threshold,
      escalate_to: rule.escalate_to,
      message: rule.message,
      active: rule.active,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this escalation rule?")) {
      setEscalationRules(escalationRules.filter(rule => rule.id !== id));
      toast.success("Escalation rule deleted");
    }
  };

  const handleToggleActive = (id) => {
    setEscalationRules(escalationRules.map(rule => 
      rule.id === id ? { ...rule, active: !rule.active } : rule
    ));
    toast.success("Escalation rule updated");
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
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

  const getStatusColor = (status) => {
    switch (status) {
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Ticket Escalation
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowModal(true)}>
          Add Rule
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rule Name</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time Threshold</TableCell>
                  <TableCell>Escalate To</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {escalationRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No escalation rules found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  escalationRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>
                        <Chip label={rule.priority} color={getPriorityColor(rule.priority)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={rule.status} color={getStatusColor(rule.status)} size="small" />
                      </TableCell>
                      <TableCell>{rule.time_threshold} hours</TableCell>
                      <TableCell>{rule.escalate_to}</TableCell>
                      <TableCell>
                        <Chip 
                          label={rule.active ? "Active" : "Inactive"} 
                          color={rule.active ? "success" : "default"} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Toggle Active">
                          <IconButton 
                            size="small" 
                            onClick={() => handleToggleActive(rule.id)}
                            color={rule.active ? "success" : "default"}
                          >
                            <Switch checked={rule.active} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(rule)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}>
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
        </CardContent>
      </Card>

      {/* Escalation Rule Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? "Edit Escalation Rule" : "Add Escalation Rule"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Rule Name"
                required
                size="small"
                fullWidth
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
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
                label="Time Threshold (hours)"
                type="number"
                required
                size="small"
                fullWidth
                value={form.time_threshold}
                onChange={(e) => setForm((f) => ({ ...f, time_threshold: parseInt(e.target.value) || 0 }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Escalate To"
                size="small"
                fullWidth
                value={form.escalate_to}
                onChange={(e) => setForm((f) => ({ ...f, escalate_to: e.target.value }))}
              >
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="team_lead">Team Lead</MenuItem>
                <MenuItem value="director">Director</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Escalation Message"
                size="small"
                fullWidth
                multiline
                minRows={3}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Enter the escalation message here. Use {ticket_id}, {title}, {priority}, etc. as placeholders."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.name}>
            {editingRule ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

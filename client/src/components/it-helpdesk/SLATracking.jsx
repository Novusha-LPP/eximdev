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
  Chip,
  Tooltip,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function SLATracking({ slaRules, setSlaRules }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category: "All",
    priority: "All",
    sla_hours: 24,
  });

  const handleSave = () => {
    if (editingRule) {
      // Update existing rule
      setSlaRules(slaRules.map(rule => 
        rule.id === editingRule.id ? { ...form, id: editingRule.id } : rule
      ));
      toast.success("SLA rule updated");
    } else {
      // Add new rule
      setSlaRules([...slaRules, { ...form, id: Date.now() }]);
      toast.success("SLA rule added");
    }
    setShowModal(false);
    setEditingRule(null);
    setForm({ name: "", category: "All", priority: "All", sla_hours: 24 });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      category: rule.category,
      priority: rule.priority,
      sla_hours: rule.sla_hours,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this SLA rule?")) {
      setSlaRules(slaRules.filter(rule => rule.id !== id));
      toast.success("SLA rule deleted");
    }
  };

  const getSlaStatus = (slaHours, createdAt) => {
    if (!createdAt) return "Unknown";

    const created = new Date(createdAt);
    const now = new Date();
    const elapsedHours = (now - created) / (1000 * 60 * 60);

    if (elapsedHours > slaHours) {
      return "Overdue";
    } else if (elapsedHours > slaHours * 0.8) {
      return "Urgent";
    } else {
      return "On Track";
    }
  };

  const getSlaStatusColor = (status) => {
    switch (status) {
      case "Overdue":
        return "error";
      case "Urgent":
        return "warning";
      case "On Track":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            SLA Tracking
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowModal(true)}>
          Add SLA Rule
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rule Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>SLA Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slaRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No SLA rules found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  slaRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{rule.category}</TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>{rule.sla_hours} hours</TableCell>
                      <TableCell>
                        <Chip 
                          label={getSlaStatus(rule.sla_hours, rule.created_at)} 
                          color={getSlaStatusColor(getSlaStatus(rule.sla_hours, rule.created_at))} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">
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

      {/* SLA Rule Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? "Edit SLA Rule" : "Add SLA Rule"}</DialogTitle>
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
                label="Category"
                size="small"
                fullWidth
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <MenuItem value="All">All Categories</MenuItem>
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
                <MenuItem value="All">All Priorities</MenuItem>
                {TICKET_PRIORITIES.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="SLA Hours"
                type="number"
                required
                size="small"
                fullWidth
                value={form.sla_hours}
                onChange={(e) => setForm((f) => ({ ...f, sla_hours: parseInt(e.target.value) || 0 }))}
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

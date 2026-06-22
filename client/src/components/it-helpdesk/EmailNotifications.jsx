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
import EmailIcon from "@mui/icons-material/Email";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const NOTIFICATION_TYPES = ["Ticket Created", "Ticket Updated", "Ticket Assigned", "Ticket Resolved", "Ticket Closed"];
const NOTIFICATION_TRIGGERS = ["Status Change", "Priority Change", "Assignment Change", "Comment Added", "Due Date Approaching"];

export default function EmailNotifications({ emailNotifications, setEmailNotifications }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "Ticket Created",
    trigger: "Status Change",
    recipients: "all",
    conditions: [],
    template: "",
    active: true,
  });

  const handleSave = () => {
    if (editingRule) {
      // Update existing notification rule
      setEmailNotifications(emailNotifications.map(rule => 
        rule.id === editingRule.id ? { ...form, id: editingRule.id } : rule
      ));
      toast.success("Notification rule updated");
    } else {
      // Add new notification rule
      setEmailNotifications([...emailNotifications, { ...form, id: Date.now() }]);
      toast.success("Notification rule added");
    }
    setShowModal(false);
    setEditingRule(null);
    setForm({
      name: "",
      type: "Ticket Created",
      trigger: "Status Change",
      recipients: "all",
      conditions: [],
      template: "",
      active: true,
    });
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      type: rule.type,
      trigger: rule.trigger,
      recipients: rule.recipients,
      conditions: rule.conditions || [],
      template: rule.template,
      active: rule.active,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this notification rule?")) {
      setEmailNotifications(emailNotifications.filter(rule => rule.id !== id));
      toast.success("Notification rule deleted");
    }
  };

  const handleToggleActive = (id) => {
    setEmailNotifications(emailNotifications.map(rule => 
      rule.id === id ? { ...rule, active: !rule.active } : rule
    ));
    toast.success("Notification rule updated");
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Email Notifications
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
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Trigger</TableCell>
                  <TableCell>Recipients</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emailNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No notification rules found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  emailNotifications.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{rule.type}</TableCell>
                      <TableCell>{rule.trigger}</TableCell>
                      <TableCell>{rule.recipients}</TableCell>
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

      {/* Notification Rule Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? "Edit Notification Rule" : "Add Notification Rule"}</DialogTitle>
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
                label="Notification Type"
                size="small"
                fullWidth
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {NOTIFICATION_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Trigger"
                size="small"
                fullWidth
                value={form.trigger}
                onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
              >
                {NOTIFICATION_TRIGGERS.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Recipients"
                size="small"
                fullWidth
                value={form.recipients}
                onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))}
              >
                <MenuItem value="all">All Users</MenuItem>
                <MenuItem value="assignees">Assignees Only</MenuItem>
                <MenuItem value="requesters">Requesters Only</MenuItem>
                <MenuItem value="admins">Admins Only</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
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
                label="Email Template"
                size="small"
                fullWidth
                multiline
                minRows={4}
                value={form.template}
                onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
                placeholder="Enter your email template here. Use {ticket_id}, {title}, {status}, etc. as placeholders."
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

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Switch,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SendIcon from "@mui/icons-material/Send";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast } from "react-hot-toast";

// Notification types with icons and colors
const NOTIFICATION_TYPES = [
  { id: "email", name: "Email", icon: <EmailIcon />, color: "info" },
  { id: "sms", name: "SMS", icon: <SmsIcon />, color: "warning" },
  { id: "in_app", name: "In-App", icon: <NotificationsActiveIcon />, color: "success" },
  { id: "push", name: "Push", icon: <SmartphoneIcon />, color: "primary" },
];

// Notification templates
const NOTIFICATION_TEMPLATES = [
  {
    id: 1,
    name: "Ticket Created",
    description: "Notification when a new ticket is created",
    type: ["email", "in_app"],
    trigger: "ticket_created",
    enabled: true,
    subject: "New Ticket Created: {ticket_number}",
    message: "A new ticket has been created with number {ticket_number}. Please check the system for details.",
    recipients: ["assignee", "creator", "admins"]
  },
  {
    id: 2,
    name: "Ticket Assigned",
    description: "Notification when a ticket is assigned to someone",
    type: ["email", "in_app", "push"],
    trigger: "ticket_assigned",
    enabled: true,
    subject: "Ticket Assigned: {ticket_number}",
    message: "Ticket {ticket_number} has been assigned to you. Please review and take action.",
    recipients: ["assignee"]
  },
  {
    id: 3,
    name: "Ticket Escalated",
    description: "Notification when a ticket is escalated",
    type: ["email", "sms"],
    trigger: "ticket_escalated",
    enabled: false,
    subject: "URGENT: Ticket Escalated - {ticket_number}",
    message: "Ticket {ticket_number} has been escalated to {priority}. Immediate attention required.",
    recipients: ["managers", "admins"]
  },
  {
    id: 4,
    name: "Asset Assigned",
    description: "Notification when an asset is assigned to an employee",
    type: ["email", "in_app"],
    trigger: "asset_assigned",
    enabled: true,
    subject: "Asset Assigned: {asset_tag}",
    message: "Asset {asset_tag} ({asset_name}) has been assigned to you. Please acknowledge receipt.",
    recipients: ["assignee", "asset_admin"]
  }
];

// Trigger events
const TRIGGER_EVENTS = [
  { id: "ticket_created", name: "Ticket Created" },
  { id: "ticket_assigned", name: "Ticket Assigned" },
  { id: "ticket_escalated", name: "Ticket Escalated" },
  { id: "asset_assigned", name: "Asset Assigned" },
  { id: "system_maintenance", name: "System Maintenance" },
  { id: "weekly_report", name: "Weekly Report" },
  { id: "sla_breach_warning", name: "SLA Breach Warning" }
];

// Recipient options
const RECIPIENT_OPTIONS = [
  { id: "assignee", name: "Assigned Person" },
  { id: "creator", name: "Ticket Creator" },
  { id: "admins", name: "Admins" },
  { id: "managers", name: "Managers" },
  { id: "asset_admin", name: "Asset Admin" }
];

export default function NotificationsManagement() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  const [notificationTemplates, setNotificationTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: [],
    trigger: "",
    enabled: true,
    subject: "",
    message: "",
    recipients: []
  });

  // Fetch notification templates
  const fetchData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setNotificationTemplates(NOTIFICATION_TEMPLATES);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Toggle template enabled status
  const handleToggleEnabled = (id) => {
    setNotificationTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, enabled: !template.enabled } : template
    ));
  };

  // Open modal for creating/editing template
  const handleOpenModal = (template = null) => {
    if (template) {
      setEditId(template.id);
      setForm({
        name: template.name,
        description: template.description,
        type: template.type,
        trigger: template.trigger,
        enabled: template.enabled,
        subject: template.subject,
        message: template.message,
        recipients: template.recipients
      });
    } else {
      setEditId(null);
      setForm({
        name: "",
        description: "",
        type: [],
        trigger: "",
        enabled: true,
        subject: "",
        message: "",
        recipients: []
      });
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setForm({
      name: "",
      description: "",
      type: [],
      trigger: "",
      enabled: true,
      subject: "",
      message: "",
      recipients: []
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Handle type selection
  const handleTypeChange = (typeId) => {
    setForm(prev => {
      const types = prev.type.includes(typeId)
        ? prev.type.filter(t => t !== typeId)
        : [...prev.type, typeId];
      return { ...prev, type: types };
    });
  };

  // Handle recipient selection
  const handleRecipientChange = (recipientId) => {
    setForm(prev => {
      const recipients = prev.recipients.includes(recipientId)
        ? prev.recipients.filter(r => r !== recipientId)
        : [...prev.recipients, recipientId];
      return { ...prev, recipients };
    });
  };

  // Save template
  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (!form.trigger) {
      toast.error("Trigger event is required");
      return;
    }

    if (form.type.length === 0) {
      toast.error("At least one notification type must be selected");
      return;
    }

    if (form.recipients.length === 0) {
      toast.error("At least one recipient must be selected");
      return;
    }

    if (editId) {
      // Update existing template
      setNotificationTemplates(prev => prev.map(template =>
        template.id === editId ? { ...template, ...form } : template
      ));
      toast.success("Notification template updated successfully");
    } else {
      // Add new template
      const newTemplate = {
        id: Date.now(),
        ...form
      };
      setNotificationTemplates(prev => [...prev, newTemplate]);
      toast.success("Notification template created successfully");
    }

    handleCloseModal();
  };

  // Delete template
  const handleDeleteTemplate = (id) => {
    if (window.confirm("Are you sure you want to delete this notification template?")) {
      setNotificationTemplates(prev => prev.filter(template => template.id !== id));
      toast.success("Notification template deleted successfully");
    }
  };

  // Test notification
  const handleTestNotification = (template) => {
    toast.success(`Test notification sent for "${template.name}"`);
    // In a real app, this would send a test notification
  };

  // Get type icon
  const getTypeIcon = (typeId) => {
    const type = NOTIFICATION_TYPES.find(t => t.id === typeId);
    return type ? type.icon : null;
  };

  // Get type color
  const getTypeColor = (typeId) => {
    const type = NOTIFICATION_TYPES.find(t => t.id === typeId);
    return type ? type.color : "default";
  };

  // Get trigger name
  const getTriggerName = (triggerId) => {
    const trigger = TRIGGER_EVENTS.find(t => t.id === triggerId);
    return trigger ? trigger.name : triggerId;
  };

  // Get recipient names
  const getRecipientNames = (recipientIds) => {
    return recipientIds.map(id => {
      const recipient = RECIPIENT_OPTIONS.find(r => r.id === id);
      return recipient ? recipient.name : id;
    }).join(", ");
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  // Filter templates based on search term
  const filteredTemplates = notificationTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Button
          onClick={handleBack}
          variant="contained"
          color="primary"
          startIcon={<ArrowBackIcon />}
          sx={{
            mr: 1,
            "&:hover": {
              bgcolor: "primary.dark"
            }
          }}
        >
          Back
        </Button>
        <NotificationsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Notifications Management
        </Typography>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                label="Search Notification Templates"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenModal()}
                fullWidth
              >
                Add Template
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Notification Templates Grid */}
      <Box mb={2}>
        <Grid container spacing={2}>
          {loading ? (
            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            </Grid>
          ) : filteredTemplates.length === 0 ? (
            <Grid item xs={12}>
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No notification templates found
                </Typography>
              </Box>
            </Grid>
          ) : (
            filteredTemplates.map(template => (
              <Grid item xs={12} key={template.id}>
                <Card sx={{ border: "1px solid #e0e0e0" }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {template.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={template.enabled}
                              onChange={() => handleToggleEnabled(template.id)}
                              size="small"
                            />
                          }
                          label={template.enabled ? "Enabled" : "Disabled"}
                        />
                        <Tooltip title="Test Notification">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleTestNotification(template)}
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleOpenModal(template)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box mt={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Notification Types:</strong>
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap">
                            {template.type.map(typeId => (
                              <Chip
                                key={typeId}
                                icon={getTypeIcon(typeId)}
                                label={NOTIFICATION_TYPES.find(t => t.id === typeId)?.name || typeId}
                                color={getTypeColor(typeId)}
                                size="small"
                              />
                            ))}
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Trigger Event:</strong>
                          </Typography>
                          <Typography variant="body2">
                            {getTriggerName(template.trigger)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Recipients:</strong>
                          </Typography>
                          <Typography variant="body2">
                            {getRecipientNames(template.recipients)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Email Subject:</strong>
                          </Typography>
                          <Typography variant="body2">
                            {template.subject}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Notification Message:</strong>
                          </Typography>
                          <Typography variant="body2">
                            {template.message}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      {/* Template Modal */}
      <Dialog
        open={showModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editId ? "Edit Notification Template" : "Create Notification Template"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Template Name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                fullWidth
                size="small"
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                fullWidth
                size="small"
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                <strong>Notification Types:</strong>
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {NOTIFICATION_TYPES.map(type => (
                  <Chip
                    key={type.id}
                    icon={type.icon}
                    label={type.name}
                    color={form.type.includes(type.id) ? type.color : "default"}
                    onClick={() => handleTypeChange(type.id)}
                    clickable
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                <strong>Trigger Event:</strong>
              </Typography>
              <Select
                name="trigger"
                value={form.trigger}
                onChange={handleInputChange}
                fullWidth
                size="small"
                margin="dense"
              >
                <MenuItem value="">Select Trigger Event</MenuItem>
                {TRIGGER_EVENTS.map(event => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                <strong>Recipients:</strong>
              </Typography>
              <FormGroup>
                {RECIPIENT_OPTIONS.map(recipient => (
                  <FormControlLabel
                    key={recipient.id}
                    control={
                      <Checkbox
                        checked={form.recipients.includes(recipient.id)}
                        onChange={() => handleRecipientChange(recipient.id)}
                        size="small"
                      />
                    }
                    label={recipient.name}
                  />
                ))}
              </FormGroup>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email Subject"
                name="subject"
                value={form.subject}
                onChange={handleInputChange}
                fullWidth
                size="small"
                margin="dense"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notification Message"
                name="message"
                value={form.message}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={3}
                size="small"
                margin="dense"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

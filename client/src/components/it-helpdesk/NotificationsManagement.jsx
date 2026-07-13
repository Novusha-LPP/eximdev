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
  },
  {
    id: 5,
    name: "System Maintenance",
    description: "Notification for scheduled system maintenance",
    type: ["email", "in_app", "push"],
    trigger: "system_maintenance",
    enabled: true,
    subject: "System Maintenance Scheduled",
    message: "System maintenance is scheduled for {maintenance_date}. The system will be unavailable from {start_time} to {end_time}.",
    recipients: ["all_users"]
  },
  {
    id: 6,
    name: "Password Reset",
    description: "Notification for password reset requests",
    type: ["email"],
    trigger: "password_reset",
    enabled: true,
    subject: "Password Reset Request",
    message: "A password reset has been requested for your account. If you did not request this, please contact IT support immediately.",
    recipients: ["user"]
  },
  {
    id: 7,
    name: "Weekly Report",
    description: "Weekly summary report notification",
    type: ["email"],
    trigger: "weekly_report",
    enabled: false,
    subject: "Weekly IT Helpdesk Report - {week_date}",
    message: "Your weekly IT helpdesk report is ready. Please find attached the summary for the week of {week_date}.",
    recipients: ["managers", "admins"]
  },
  {
    id: 8,
    name: "SLA Breach Warning",
    description: "Notification when ticket SLA is about to breach",
    type: ["email", "sms", "in_app"],
    trigger: "sla_breach_warning",
    enabled: true,
    subject: "SLA Warning: Ticket {ticket_number}",
    message: "Ticket {ticket_number} is approaching its SLA deadline. Current response time: {current_time}, SLA: {sla_time}.",
    recipients: ["assignee", "manager"]
  }
];

// Recipient options
const RECIPIENT_OPTIONS = [
  { id: "assignee", name: "Assignee", description: "Person assigned to the task" },
  { id: "creator", name: "Creator", description: "Person who created the item" },
  { id: "admins", name: "Administrators", description: "All system administrators" },
  { id: "managers", name: "Managers", description: "Department managers" },
  { id: "all_users", name: "All Users", description: "All system users" },
  { id: "user", name: "Specific User", description: "Individual user (context specific)" },
  { id: "asset_admin", name: "Asset Admin", description: "Asset management administrators" }
];

// Trigger events
const TRIGGER_EVENTS = [
  { id: "ticket_created", name: "Ticket Created", description: "When a new ticket is created" },
  { id: "ticket_assigned", name: "Ticket Assigned", description: "When a ticket is assigned to someone" },
  { id: "ticket_escalated", name: "Ticket Escalated", description: "When ticket priority is escalated" },
  { id: "ticket_closed", name: "Ticket Closed", description: "When a ticket is closed/resolved" },
  { id: "asset_assigned", name: "Asset Assigned", description: "When an asset is assigned to an employee" },
  { id: "asset_returned", name: "Asset Returned", description: "When an asset is returned" },
  { id: "user_created", name: "User Created", description: "When a new user account is created" },
  { id: "password_reset", name: "Password Reset", description: "When password reset is requested" },
  { id: "system_maintenance", name: "System Maintenance", description: "For system maintenance announcements" },
  { id: "weekly_report", name: "Weekly Report", description: "Weekly automated reports" },
  { id: "sla_breach_warning", name: "SLA Breach Warning", description: "When ticket SLA is about to breach" }
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

  // Filter notification templates
  const filteredTemplates = notificationTemplates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Fetch data
const fetchData = () => {
  setLoading(true);

  try {
    const data = NOTIFICATION_TEMPLATES.map(item => ({
      ...item,
      type: item.type || [],
      recipients: item.recipients || [],
      enabled: item.enabled ?? true
    }));

    setNotificationTemplates(data);

  } catch (error) {
    console.error("Notification loading error:", error);
    toast.error("Notification load failed");
  } finally {
    setLoading(false);
  }
};

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle notification type selection
  const handleTypeSelection = (typeId, checked) => {
    setForm(prev => {
      const types = checked
        ? [...prev.type, typeId]
        : prev.type.filter(id => id !== typeId);
      return { ...prev, type: types };
    });
  };

  // Handle recipient selection
  const handleRecipientSelection = (recipientId, checked) => {
    setForm(prev => {
      const recipients = checked
        ? [...prev.recipients, recipientId]
        : prev.recipients.filter(id => id !== recipientId);
      return { ...prev, recipients };
    });
  };

  // Toggle template enabled status
  const handleToggleEnabled = (id) => {
    setNotificationTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, enabled: !template.enabled } : template
    ));
    
    const template = notificationTemplates.find(t => t.id === id);
    toast.success(`Template "${template.name}" ${!template.enabled ? "enabled" : "disabled"}`);
  };

  // Open modal for adding/editing template
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
    setEditId(null);
  };

  // Save template
  const handleSaveTemplate = () => {
    if (!form.name || !form.trigger || !form.subject || !form.message) {
      toast.error("Name, trigger, subject and message are required");
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

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <IconButton 
          onClick={handleBack} 
          color="primary" 
          sx={{ 
            mr: 1, 
            bgcolor: "white", 
            border: "1px solid",
            borderColor: "primary.main",
            color: "primary.main",
            "&:hover": { 
              bgcolor: "primary.light",
              color: "primary.dark"
            } 
          }}
        >
          <ArrowBackIcon sx={{ color: "primary.main" }} />
        </IconButton>
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
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Trigger:</strong> {getTriggerName(template.trigger)}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>Recipients:</strong> {getRecipientNames(template.recipients)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Subject:</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {template.subject}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Message Preview:</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
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

      {/* Add/Edit Template Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Notification Template" : "Add New Notification Template"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Template Name"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="e.g., Ticket Created Notification"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Select
                label="Trigger Event"
                name="trigger"
                value={form.trigger}
                onChange={handleInputChange}
                fullWidth
                required
              >
                <MenuItem value="">Select Trigger</MenuItem>
                {TRIGGER_EVENTS.map(trigger => (
                  <MenuItem key={trigger.id} value={trigger.id}>
                    {trigger.name}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={form.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
                placeholder="Describe what this notification template does"
              />
            </Grid>
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Notification Types</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    {form.type.length} selected
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    <Grid container spacing={1}>
                      {NOTIFICATION_TYPES.map(type => (
                        <Grid item xs={12} sm={6} md={3} key={type.id}>
                          <Card
                            sx={{
                              border: form.type.includes(type.id) 
                                ? "2px solid #1976d2" 
                                : "1px solid #e0e0e0",
                              backgroundColor: form.type.includes(type.id) 
                                ? "rgba(25, 118, 210, 0.08)" 
                                : "white",
                            }}
                          >
                            <CardContent sx={{ p: 1.5 }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={form.type.includes(type.id)}
                                    onChange={(e) => handleTypeSelection(type.id, e.target.checked)}
                                    size="small"
                                  />
                                }
                                label={
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Box color={`${type.color}.main`}>
                                      {type.icon}
                                    </Box>
                                    <Typography variant="body2">{type.name}</Typography>
                                  </Box>
                                }
                                sx={{ width: "100%" }}
                              />
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            </Grid>
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Recipients</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    {form.recipients.length} selected
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    <Grid container spacing={1}>
                      {RECIPIENT_OPTIONS.map(recipient => (
                        <Grid item xs={12} sm={6} md={4} key={recipient.id}>
                          <Card
                            sx={{
                              border: form.recipients.includes(recipient.id) 
                                ? "2px solid #1976d2" 
                                : "1px solid #e0e0e0",
                              backgroundColor: form.recipients.includes(recipient.id) 
                                ? "rgba(25, 118, 210, 0.08)" 
                                : "white",
                            }}
                          >
                            <CardContent sx={{ p: 1.5 }}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={form.recipients.includes(recipient.id)}
                                    onChange={(e) => handleRecipientSelection(recipient.id, e.target.checked)}
                                    size="small"
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2">{recipient.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {recipient.description}
                                    </Typography>
                                  </Box>
                                }
                                sx={{ width: "100%" }}
                              />
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email Subject"
                name="subject"
                value={form.subject}
                onChange={handleInputChange}
                fullWidth
                required
                placeholder="Enter email subject (use {variables} for dynamic content)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Message Content"
                name="message"
                value={form.message}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={4}
                required
                placeholder="Enter notification message (use {variables} for dynamic content)"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                <strong>Available Variables:</strong> {form.trigger ? `{ticket_number}, {priority}, {assignee}, {creator}, etc.` : 'Select a trigger to see available variables'}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTemplate}>
            {editId ? "Update Template" : "Create Template"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
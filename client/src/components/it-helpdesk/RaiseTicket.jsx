import React, { useState, useContext } from "react";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  CircularProgress,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Chip,
  Divider,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarTodayIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityHighIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

import {
  List,
  ListItem,
  ListItemText,
  InputAdornment,
} from "@mui/material";

import { UserContext } from "../../contexts/UserContext";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_SUB_CATEGORIES = [
  "Desktop", "Laptop", "Printer", "Phone", "SIM",
  "Routing", "Switch", "Firewall", "Wi-Fi", "LAN", "WAN", "VPN",
  "Email", "Access Card", "Software Install", "License", "Other",
];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_SEVERITY = ["Low", "Medium", "High", "Critical"];
const TICKET_TYPES = ["Incident", "Service Request", "Problem", "Change Request", "Maintenance", "Other"];

// Statuses available to Admin when updating
const ADMIN_STATUSES = ["Open", "In Progress", "Closed"];

// Default assigned IT person
const DEFAULT_ASSIGNEE = "Vikash";

const INITIAL_FORM = {
  description: "",
  category: "Hardware",
  subCategory: "",
  priority: "",       // optional — no default
  severity: "Medium",
  type: "Incident",
  status: "New",      // default New for employees
  assigned_to: DEFAULT_ASSIGNEE,
  requesterName: "",
  department: "",
  contactInformation: "",
  location: "",
  dueDate: "",
  estimatedTime: "",
  tags: [],
};

export default function RaiseTicket() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";

  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [ticketForm, setTicketForm] = useState(INITIAL_FORM);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTicketForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file upload (optional)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Add tag
  const addTag = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      setTicketForm((prev) => ({
        ...prev,
        tags: [...prev.tags, e.target.value.trim()],
      }));
      e.target.value = "";
    }
  };

  // Remove tag
  const removeTag = (index) => {
    setTicketForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleReset = () => {
    setTicketForm(INITIAL_FORM);
    setAttachments([]);
  };

  // Submit ticket
  const handleSubmit = async () => {
    if (!ticketForm.description) {
      toast.error("Description is required");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      // Title is auto-generated from category + type since field is removed
      const autoTitle = `[${ticketForm.type}] ${ticketForm.category}${ticketForm.subCategory ? " - " + ticketForm.subCategory : ""}`;
      formData.append("title", autoTitle);
      formData.append("description", ticketForm.description);
      formData.append("category", ticketForm.category);
      formData.append("subcategory", ticketForm.subCategory);
      if (ticketForm.priority) formData.append("priority", ticketForm.priority);
      formData.append("severity", ticketForm.severity);
      formData.append("type", ticketForm.type);
      formData.append("status", ticketForm.status);
      formData.append("assigned_to_name", ticketForm.assigned_to);
      formData.append("requester_name", ticketForm.requesterName);
      formData.append("department", ticketForm.department);
      formData.append("contact_information", ticketForm.contactInformation);
      formData.append("location", ticketForm.location);
      if (ticketForm.dueDate) formData.append("sla_due_date", ticketForm.dueDate);
      if (ticketForm.estimatedTime) formData.append("estimated_time", ticketForm.estimatedTime);
      formData.append("tags", JSON.stringify(ticketForm.tags));

      // Attachments are optional
      attachments.forEach((file) => formData.append("attachments", file));

      await itHelpdeskAPI.tickets.create(formData);
      toast.success("Ticket raised successfully!");
      handleReset();
    } catch (error) {
      console.error("Error raising ticket:", error);
      toast.error("Failed to raise ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" gap={1} mb={3}>
            <AddIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Raise New Ticket
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* ── Basic Information ── */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={1}>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Description"
                name="description"
                value={ticketForm.description}
                onChange={handleInputChange}
                multiline
                rows={4}
                placeholder="Describe your issue in detail..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DescriptionIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Status — Admin sees limited options; Employee sees "New" fixed */}
            <Grid item xs={12} md={6}>
              {isAdmin ? (
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={ticketForm.status}
                    onChange={handleInputChange}
                    label="Status"
                  >
                    {ADMIN_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  label="Status"
                  value="New"
                  disabled
                  helperText="New tickets always start with status: New"
                />
              )}
            </Grid>

            {/* Assigned To — defaults to Vikash */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Assigned To"
                name="assigned_to"
                value={ticketForm.assigned_to}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="Default IT assignee: Vikash"
              />
            </Grid>

            {/* ── Category & Priority ── */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={1}>
                Category &amp; Priority
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={ticketForm.category}
                  onChange={handleInputChange}
                  label="Category"
                >
                  {TICKET_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CategoryIcon fontSize="small" />
                        {category}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Subcategory */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Subcategory</InputLabel>
                <Select
                  name="subCategory"
                  value={ticketForm.subCategory}
                  onChange={handleInputChange}
                  label="Subcategory"
                >
                  <MenuItem value="">Select Subcategory</MenuItem>
                  {TICKET_SUB_CATEGORIES.map((subcategory) => (
                    <MenuItem key={subcategory} value={subcategory}>
                      {subcategory}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Priority — optional */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority (Optional)</InputLabel>
                <Select
                  name="priority"
                  value={ticketForm.priority}
                  onChange={handleInputChange}
                  label="Priority (Optional)"
                >
                  <MenuItem value=""><em>Not specified</em></MenuItem>
                  {TICKET_PRIORITIES.map((priority) => (
                    <MenuItem key={priority} value={priority}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PriorityHighIcon fontSize="small" />
                        {priority}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Severity */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  name="severity"
                  value={ticketForm.severity}
                  onChange={handleInputChange}
                  label="Severity"
                >
                  {TICKET_SEVERITY.map((severity) => (
                    <MenuItem key={severity} value={severity}>
                      {severity}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Ticket Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Ticket Type</InputLabel>
                <Select
                  name="type"
                  value={ticketForm.type}
                  onChange={handleInputChange}
                  label="Ticket Type"
                >
                  {TICKET_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* ── Requester Information ── */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={1}>
                Requester Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Requester Name"
                name="requesterName"
                value={ticketForm.requesterName}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={ticketForm.department}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Information (Email / Phone)"
                name="contactInformation"
                value={ticketForm.contactInformation}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={ticketForm.location}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOnIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* ── Additional Information ── */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={1}>
                Additional Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Due Date"
                name="dueDate"
                type="date"
                value={ticketForm.dueDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Time (hours)"
                name="estimatedTime"
                type="number"
                value={ticketForm.estimatedTime}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScheduleIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Tags */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (optional)"
                onKeyPress={addTag}
                placeholder="Press Enter to add tags"
              />
              <Box mt={1} display="flex" flexWrap="wrap" gap={1}>
                {ticketForm.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => removeTag(index)}
                    color="primary"
                    size="small"
                  />
                ))}
              </Box>
            </Grid>

            {/* ── Attachments (Optional) ── */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={1}>
                Attachments{" "}
                <Typography component="span" variant="body2" color="text.secondary">
                  (Optional)
                </Typography>
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                sx={{ mb: 2 }}
              >
                Upload Files (Optional)
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={handleFileUpload}
                />
              </Button>

              {attachments.length > 0 && (
                <List dense>
                  {attachments.map((file, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024).toFixed(2)} KB`}
                      />
                      <Button
                        color="error"
                        size="small"
                        startIcon={<CloseIcon />}
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>

            {/* ── Submit Actions ── */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={handleReset}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Ticket"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

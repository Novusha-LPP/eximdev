import React, { useState } from "react";
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
  Alert,
  Stack,
} from "@mui/material";
import {
  AddIcon,
  SendIcon,
  AttachFileIcon,
  PersonIcon,
  BusinessIcon,
  EmailIcon,
  PhoneIcon,
  LocationOnIcon,
  CalendarTodayIcon,
  ScheduleIcon,
  PriorityHighIcon,
  CategoryIcon,
  DescriptionIcon,
  TitleIcon,
  CloseIcon,
} from "@mui/icons-material";

import {
  List,
  ListItem,
  ListItemText,
  InputAdornment
} from "@mui/material";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_SUB_CATEGORIES = ["Desktop", "Laptop", "Printer", "Phone", "SIM", "Routing", "Switch", "Firewall", "Wi-Fi", "LAN", "WAN", "VPN", "Email", "Access Card", "Software Install", "License", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_SEVERITY = ["Low", "Medium", "High", "Critical"];
const TICKET_TYPES = ["Incident", "Service Request", "Problem", "Change Request", "Maintenance", "Other"];

export default function RaiseTicket() {
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    category: "Hardware",
    subCategory: "",
    priority: "Medium",
    severity: "Medium",
    type: "Incident",
    requesterName: "",
    department: "",
    contactInformation: "",
    location: "",
    dueDate: "",
    estimatedTime: "",
    tags: [],
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTicketForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Add tag
  const addTag = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      setTicketForm(prev => ({
        ...prev,
        tags: [...prev.tags, e.target.value.trim()]
      }));
      e.target.value = "";
    }
  };

  // Remove tag
  const removeTag = (index) => {
    setTicketForm(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  // Submit ticket
  const handleSubmit = async () => {
    if (!ticketForm.title || !ticketForm.description) {
      toast.error("Title and description are required");
      return;
    }

    setLoading(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append("title", ticketForm.title);
      formData.append("description", ticketForm.description);
      formData.append("category", ticketForm.category);
      formData.append("subcategory", ticketForm.subCategory);
      formData.append("priority", ticketForm.priority);
      formData.append("severity", ticketForm.severity);
      formData.append("type", ticketForm.type);
      formData.append("requester_name", ticketForm.requesterName);
      formData.append("department", ticketForm.department);
      formData.append("contact_information", ticketForm.contactInformation);
      formData.append("location", ticketForm.location);
      formData.append("sla_due_date", ticketForm.sla_due_date);
      formData.append("estimated_time", ticketForm.estimatedTime);
      formData.append("tags", JSON.stringify(ticketForm.tags));

      // Add attachments
      attachments.forEach(file => {
        formData.append("attachments", file);
      });

      // Submit to API
      // const response = await itHelpdeskAPI.tickets.create(formData);
      // toast.success("Ticket raised successfully");

      // Mock implementation
      toast.success("Ticket raised successfully");

      // Reset form
      setTicketForm({
        title: "",
        description: "",
        category: "Hardware",
        subCategory: "",
        priority: "Medium",
        severity: "Medium",
        type: "Incident",
        requesterName: "",
        department: "",
        contactInformation: "",
        location: "",
        dueDate: "",
        estimatedTime: "",
        tags: [],
      });
      setAttachments([]);
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <AddIcon color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Raise New Ticket
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title / Subject"
                name="title"
                value={ticketForm.title}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TitleIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={ticketForm.description}
                onChange={handleInputChange}
                multiline
                rows={4}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DescriptionIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
<Grid item xs={6}>
<TextField
  select
  label="Status"
  size="small"
  fullWidth
  required
  value={ticketForm.status}
  onChange={(e) =>
    setTicketForm((prev) => ({
      ...prev,
      status: e.target.value
    }))
  }
>

    <MenuItem value="New">
      New
    </MenuItem>

    <MenuItem value="Assigned">
      Assigned
    </MenuItem>

    <MenuItem value="In Progress">
      In Progress
    </MenuItem>

    <MenuItem value="Pending">
      Pending
    </MenuItem>

    <MenuItem value="Resolved">
      Resolved
    </MenuItem>

    <MenuItem value="Closed">
      Closed
    </MenuItem>

  </TextField>
</Grid>

            {/* Category and Priority */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Category and Priority
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  value={ticketForm.category}
                  onChange={handleInputChange}
                  label="Category"
                >
                  {TICKET_CATEGORIES.map(category => (
                    <MenuItem key={category} value={category}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CategoryIcon />
                        {category}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

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
                  {TICKET_SUB_CATEGORIES
                    .filter(sub => sub.toLowerCase().includes(ticketForm.category.toLowerCase()) || ticketForm.category === "Other")
                    .map(subcategory => (
                    <MenuItem key={subcategory} value={subcategory}>
                      {subcategory}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={ticketForm.priority}
                  onChange={handleInputChange}
                  label="Priority"
                >
                  {TICKET_PRIORITIES.map(priority => (
                    <MenuItem key={priority} value={priority}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PriorityHighIcon />
                        {priority}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  name="severity"
                  value={ticketForm.severity}
                  onChange={handleInputChange}
                  label="Severity"
                >
                  {TICKET_SEVERITY.map(severity => (
                    <MenuItem key={severity} value={severity}>
                      {severity}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Ticket Type</InputLabel>
                <Select
                  name="type"
                  value={ticketForm.type}
                  onChange={handleInputChange}
                  label="Ticket Type"
                >
                  {TICKET_TYPES.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Requester Information */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={2}>
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
                label="Contact Information"
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

            {/* Additional Information */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={2}>
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
                label="Tags"
                onKeyPress={addTag}
                placeholder="Press Enter to add tags"
              />
              <Box mt={1} display="flex" flexWrap gap={1}>
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

            {/* Attachments */}
            <Grid item xs={12}>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Attachments
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
                Upload Files
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={handleFileUpload}
                />
              </Button>

              {attachments.length > 0 && (
                <List>
                  {attachments.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024).toFixed(2)} KB`}
                      />
                      <Button
                        color="error"
                        size="small"
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<CloseIcon />}
                  onClick={() => {
                    setTicketForm({
                      title: "",
                      description: "",
                      category: "Hardware",
                      subCategory: "",
                      priority: "Medium",
                      severity: "Medium",
                      type: "Incident",
                      requesterName: "",
                      department: "",
                      contactInformation: "",
                      location: "",
                      dueDate: "",
                      estimatedTime: "",
                      tags: [],
                    });
                    setAttachments([]);
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
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

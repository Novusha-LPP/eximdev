import React, { useState, useEffect } from "react";
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
  Tabs,
  Tab,
  Tooltip,
  Chip,
  FormControlLabel,
  Switch,
  Select,
  Badge,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
  EmailIcon from "@mui/icons-material/Email";
  CalendarTodayIcon from "@mui/icons-material/CalendarToday";
  WarningIcon from "@mui/icons-material/Warning";
  AssignmentIcon from "@mui/icons-material/Assignment";
  SettingsIcon from "@mui/icons-material/Settings";
  CheckCircleIcon from "@mui/icons-material/CheckCircle";
  ErrorIcon from "@mui/icons-material/Error";
  InfoIcon from "@mui/icons-material/Info";
  AddIcon from "@mui/icons-material/Add";
  EditIcon from "@mui/icons-material/Edit";
  DeleteIcon from "@mui/icons-material/Delete";
  SearchIcon from "@mui/icons-material/Search";

// Alert types
const ALERT_TYPES = [
  "Warranty Expiry",
  "License Expiry",
  "Contract Renewal",
  "Ticket Escalation",
  "System Alert"
];

// Alert priorities
const ALERT_PRIORITIES = [
  { value: "low", label: "Low", color: "default" },
  { value: "medium", label: "Medium", color: "warning" },
  { value: "high", label: "High", color: "error" },
  { value: "critical", label: "Critical", color: "error" }
];

// Notification channels
const NOTIFICATION_CHANNELS = [
  "Email",
  "SMS",
  "In-App",
  "Push"
];

// Notification templates
const NOTIFICATION_TEMPLATES = [
  {
    id: 1,
    name: "Warranty Expiry Alert",
    type: "Warranty Expiry",
    subject: "Warranty Expiring Soon: {{asset_name}}",
    message: "The warranty for asset {{asset_name}} ({{asset_tag}}) is expiring on {{expiry_date}}. Please take necessary action.",
    channels: ["Email", "In-App"]
  },
  {
    id: 2,
    name: "License Expiry Alert",
    type: "License Expiry",
    subject: "Software License Expiring: {{software_name}}",
    message: "The license for {{software_name}} is expiring on {{expiry_date}}. Please renew the license to avoid service disruption.",
    channels: ["Email", "SMS"]
  },
  {
    id: 3,
    name: "Contract Renewal Alert",
    type: "Contract Renewal",
    subject: "Contract Renewal Due: {{contract_name}}",
    message: "The contract {{contract_name}} with {{vendor_name}} is due for renewal on {{renewal_date}}. Please initiate the renewal process.",
    channels: ["Email", "In-App", "Push"]
  },
  {
    id: 4,
    name: "Ticket Escalation Alert",
    type: "Ticket Escalation",
    subject: "Ticket Escalated: {{ticket_id}} - {{ticket_title}}",
    message: "Ticket {{ticket_id}} - {{ticket_title}} has been escalated to {{escalated_to}} due to priority {{priority}}.",
    channels: ["Email", "In-App"]
  }
];

export default function Notifications() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [alerts, setAlerts] = useState([]);
  const [notificationTemplates, setNotificationTemplates] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    type: "Warranty Expiry",
    priority: "medium",
    title: "",
    message: "",
    channels: [],
    status: "Active"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Filter alerts based on search term and filters
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !filterType || alert.type === filterType;
    const matchesPriority = !filterPriority || alert.priority === filterPriority;
    const matchesStatus = !filterStatus || alert.status === filterStatus;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  // Fetch data
const fetchData = async () => {

try {

setLoading(true);


const [
 ticketRes,
 assetRes,
 licenseRes,
 contractRes
] = await Promise.all([


axios.get("/api/tickets"),

axios.get("/api/assets"),

axios.get("/api/licenses"),

axios.get("/api/contracts")


]);



let notifications = [];



// Ticket notifications

ticketRes.data.forEach(ticket=>{


if(
ticket.status === "Pending" ||
ticket.status === "New"
){

notifications.push({

id:ticket._id,

type:"Ticket Escalation",

priority:
ticket.priority?.toLowerCase() || "medium",

title:
`Ticket ${ticket.ticket_id} Pending`,

message:
`${ticket.title} requires action`,

channels:[
"Email",
"In-App"
],

status:"Active",

created_date:
ticket.createdAt

});

}



});





// License expiry

licenseRes.data.forEach(item=>{


if(item.expiry_date){


notifications.push({

id:item._id,

type:"License Expiry",

priority:"high",

title:
`${item.name} License Expiry`,

message:
`License expires on ${item.expiry_date}`,

channels:[
"Email"
],

status:"Active",

created_date:
item.createdAt


});


}



});






// Warranty expiry


assetRes.data.forEach(asset=>{


if(asset.warranty_end){


notifications.push({

id:asset._id,

type:"Warranty Expiry",

priority:"medium",

title:
`${asset.asset_name} Warranty Expiry`,


message:
`Warranty expires on ${asset.warranty_end}`,


channels:[
"Email",
"In-App"
],


status:"Active",


created_date:
asset.createdAt


});


}



});





setAlerts(notifications);



}
catch(err){

console.log(err);

toast.error(
"Notification loading failed"
);


}
finally{

setLoading(false);

}

};

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle channel change
  const handleChannelChange = (channel) => {
    setForm(prev => {
      const channels = prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel];
      return { ...prev, channels };
    });
  };

  // Open modal for adding/editing alert
  const handleOpenModal = (alert = null) => {
    if (alert) {
      setEditId(alert.id);
      setForm({
        type: alert.type,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        channels: alert.channels,
        status: alert.status
      });
    } else {
      setEditId(null);
      setForm({
        type: "Warranty Expiry",
        priority: "medium",
        title: "",
        message: "",
        channels: ["Email", "In-App"],
        status: "Active"
      });
    }
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  // Save alert
  const handleSaveAlert = () => {
    if (!form.title || !form.message) {
      toast.error("Title and Message are required");
      return;
    }

    if (editId) {
      // Update existing alert
      setAlerts(prev => prev.map(alert => 
        alert.id === editId ? { ...alert, ...form } : alert
      ));
      toast.success("Alert updated successfully");
    } else {
      // Add new alert
      const newAlert = {
        id: Date.now(),
        ...form,
        created_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      setAlerts(prev => [...prev, newAlert]);
      toast.success("Alert created successfully");
    }

    handleCloseModal();
  };

  // Delete alert
  const handleDeleteAlert = (id) => {
    if (window.confirm("Are you sure you want to delete this alert?")) {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
      toast.success("Alert deleted successfully");
    }
  };

  // Initialize data
  useEffect(() => {
    fetchData();
  }, []);

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "low":
        return "default";
      case "medium":
        return "warning";
      case "high":
        return "error";
      case "critical":
        return "error";
      default:
        return "default";
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "warning";
      case "Resolved":
        return "success";
      case "Cancelled":
        return "secondary";
      default:
        return "default";
    }
  };

  // Get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case "Warranty Expiry":
        return <CalendarTodayIcon />;
      case "License Expiry":
        return <WarningIcon />;
      case "Contract Renewal":
        return <AssignmentIcon />;
      case "Ticket Escalation":
        return <ErrorIcon />;
      case "System Alert":
        return <InfoIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  // Get channel icon
  const getChannelIcon = (channel) => {
    switch (channel) {
      case "Email":
        return <EmailIcon />;
      case "SMS":
        return <SmsIcon />;
      case "In-App":
        return <NotificationsIcon />;
      case "Push":
        return <PushPinIcon />;
      default:
        return <EmailIcon />;
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <NotificationsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Notifications & Alerts
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }} mb={2}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="notification tabs">
          <Tab label="Warranty Expiry Alert" value="warranty" icon={<CalendarTodayIcon />} iconPosition="start" />
          <Tab label="License Expiry Alert" value="license" icon={<WarningIcon />} iconPosition="start" />
          <Tab label="Contract Renewal Alert" value="contract" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="Ticket Escalation Alert" value="ticket" icon={<ErrorIcon />} iconPosition="start" />
          <Tab label="Email Notifications" value="email" icon={<EmailIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box mt={2}>
        {/* Filters and Search */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Search Alerts"
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
              <Grid item xs={12} md={3}>
                <Select
                  label="Alert Type"
                  size="small"
                  fullWidth
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {ALERT_TYPES.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={3}>
                <Select
                  label="Priority"
                  size="small"
                  fullWidth
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  {ALERT_PRIORITIES.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>{priority.label}</MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />} 
                  onClick={() => handleOpenModal()}
                  fullWidth
                >
                  Add Alert
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Channels</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No alerts found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlerts.map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getTypeIcon(alert.type)}
                            <Typography variant="body2">{alert.type}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{alert.title}</TableCell>
                        <TableCell>
                          <Chip 
                            label={alert.priority} 
                            color={getPriorityColor(alert.priority)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            {alert.channels.map(channel => (
                              <Tooltip key={channel} title={channel}>
                                <Box display="flex" alignItems="center">
                                  {getChannelIcon(channel)}
                                </Box>
                              </Tooltip>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={alert.status} 
                            color={getStatusColor(alert.status)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenModal(alert)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteAlert(alert.id)}>
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
      </Box>

      {/* Alert Modal */}
      <Dialog open={showModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {editId ? "Edit Alert" : "Add New Alert"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Alert Type"
                select
                fullWidth
                size="small"
                value={form.type}
                onChange={handleInputChange}
                name="type"
              >
                {ALERT_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Select
                label="Priority"
                size="small"
                fullWidth
                value={form.priority}
                onChange={handleInputChange}
                name="priority"
              >
                {ALERT_PRIORITIES.map(priority => (
                  <MenuItem key={priority.value} value={priority.value}>{priority.label}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                size="small"
                value={form.title}
                onChange={handleInputChange}
                name="title"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Message"
                fullWidth
                multiline
                rows={3}
                value={form.message}
                onChange={handleInputChange}
                name="message"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Notification Channels</Typography>
              <Box display="flex" gap={2}>
                {NOTIFICATION_CHANNELS.map(channel => (
                  <FormControlLabel
                    key={channel}
                    control={
                      <Switch
                        checked={form.channels.includes(channel)}
                        onChange={() => handleChannelChange(channel)}
                        name={channel}
                      />
                    }
                    label={channel}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Select
                label="Status"
                size="small"
                fullWidth
                value={form.status}
                onChange={handleInputChange}
                name="status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAlert}>
            {editId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

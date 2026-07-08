import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Tabs,
  Tab,
  Button,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
  MenuItem,
  Grid,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SendIcon from "@mui/icons-material/Send";
import toast from "react-hot-toast";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";

export default function TicketDetailDrawer({ open, onClose, ticketId, onUpdate, users = [] }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [assignData, setAssignData] = useState({ assigned_to: "", remarks: "" });
  const [statusData, setStatusData] = useState({ status: "", remarks: "" });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (open && ticketId) {
      fetchTicketDetails();
    }
  }, [open, ticketId]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const res = await itHelpdeskAPI.tickets.getById(ticketId);
      setTicket(res.data);
      setStatusData({ status: res.data.status, remarks: "" });
      setAssignData({ assigned_to: res.data.assigned_to?._id || "", remarks: "" });
    } catch (err) {
      toast.error("Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      await itHelpdeskAPI.tickets.addHistory(ticketId, { remarks: comment, action: "Comment" });
      setComment("");
      toast.success("Comment added");
      fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error("Failed to add comment");
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusData.status) return;
    setUpdatingStatus(true);
    try {
      await itHelpdeskAPI.tickets.update(ticketId, { status: statusData.status, resolution_notes: statusData.remarks });
      toast.success("Status updated");
      setStatusData({ ...statusData, remarks: "" });
      fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssign = async () => {
    if (!assignData.assigned_to) return;
    try {
      await itHelpdeskAPI.tickets.assign(ticketId, assignData);
      toast.success("Ticket assigned");
      setAssignData({ ...assignData, remarks: "" });
      fetchTicketDetails();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error("Failed to assign ticket");
    }
  };

  const handleFileUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      await itHelpdeskAPI.tickets.uploadAttachment(ticketId, formData);
      toast.success("Files uploaded");
      setFiles([]);
      fetchTicketDetails();
    } catch (err) {
      toast.error("File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "New": return "error";
      case "Assigned": return "info";
      case "In Progress": return "warning";
      case "Resolved": return "success";
      case "Closed": return "success";
      default: return "default";
    }
  };

  if (!open) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: 600 } } }}>
      <Box p={2} display="flex" justifyContent="space-between" alignItems="center" borderBottom={1} borderColor="divider">
        <Typography variant="h6" fontWeight="bold">
          {ticket ? `${ticket.ticket_id}: ${ticket.title}` : "Loading..."}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {loading && !ticket ? (
        <Box p={4} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : ticket ? (
        <Box display="flex" flexDirection="column" height="100%">
          <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} variant="fullWidth">
            <Tab label="Details" />
            <Tab label="History & Comments" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="Attachments" icon={<AttachFileIcon />} iconPosition="start" />
          </Tabs>

          <Box flex={1} overflow="auto" p={2}>
            {tabIndex === 0 && (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Status</Typography>
                    <Box mt={0.5}>
                      <Chip label={ticket.status} color={statusColor(ticket.status)} size="small" />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Priority</Typography>
                    <Box mt={0.5}>
                      <Chip label={ticket.priority} size="small" />
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Category</Typography>
                    <Typography variant="body2">{ticket.category} {ticket.subcategory && `- ${ticket.subcategory}`}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Department</Typography>
                    <Typography variant="body2">{ticket.department || "—"}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Raised By</Typography>
                    <Typography variant="body2">{ticket.requester_name || ticket.raised_by?.username || "—"}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">Assigned To</Typography>
                    <Typography variant="body2">{ticket.assigned_to?.username || ticket.assigned_to?.first_name || "Vikash"}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">Description</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5, bgcolor: "grey.50", p: 1, borderRadius: 1 }}>
                      {ticket.description}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" mb={1}>Update Status</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={4}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={statusData.status}
                      onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
                    >
                      {["Open", "In Progress", "Closed"].map(s => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Optional remarks"
                      value={statusData.remarks}
                      onChange={(e) => setStatusData({ ...statusData, remarks: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={updatingStatus || ticket.status === statusData.status}
                      onClick={handleUpdateStatus}
                    >
                      Update
                    </Button>
                  </Grid>
                </Grid>


              </Box>
            )}

            {tabIndex === 1 && (
              <Box display="flex" flexDirection="column" height="100%">
                <Box flex={1} overflow="auto" mb={2}>
                  <List>
                    {ticket.history?.slice().reverse().map((h, i) => (
                      <ListItem key={i} alignItems="flex-start" divider>
                        <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: "primary.main", fontSize: 14 }}>
                          {h.changed_by_name?.charAt(0) || "S"}
                        </Avatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2">
                              {h.changed_by_name || "System"} • <Typography component="span" variant="caption" color="textSecondary">{new Date(h.timestamp).toLocaleString()}</Typography>
                            </Typography>
                          }
                          secondary={
                            <Box mt={0.5}>
                              <Chip label={h.action} size="small" sx={{ mb: 1, mr: 1, height: 20, fontSize: "0.7rem" }} />
                              {h.old_value && h.new_value && (
                                <Typography variant="caption" display="block" color="textSecondary">
                                  {h.old_value} ➔ {h.new_value}
                                </Typography>
                              )}
                              <Typography variant="body2" color="textPrimary">{h.remarks}</Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
                <Box display="flex" gap={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Type a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    multiline
                    maxRows={3}
                  />
                  <IconButton color="primary" onClick={handleAddComment} disabled={!comment.trim()}>
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            )}

            {tabIndex === 2 && (
              <Box>
                <Box mb={3}>
                  <Typography variant="subtitle2" mb={1}>Upload New Attachments</Typography>
                  <Box display="flex" gap={1} alignItems="center">
                    <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
                      Select Files
                      <input
                        type="file"
                        hidden
                        multiple
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                      />
                    </Button>
                    {files.length > 0 && <Typography variant="caption">{files.length} file(s) selected</Typography>}
                    <Button
                      variant="contained"
                      disabled={files.length === 0 || uploading}
                      onClick={handleFileUpload}
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="subtitle2" mb={1}>Attached Files ({ticket.attachments?.length || 0})</Typography>
                <List>
                  {ticket.attachments?.length === 0 && (
                    <Typography variant="body2" color="textSecondary">No attachments yet.</Typography>
                  )}
                  {ticket.attachments?.map((f, i) => (
                    <ListItem key={i} divider>
                      <ListItemText
                        primary={<a href={f.file_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#1976d2' }}>{f.file_name}</a>}
                        secondary={`Uploaded on ${new Date(f.uploaded_at).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </Box>
      ) : null}
    </Drawer>
  );
}
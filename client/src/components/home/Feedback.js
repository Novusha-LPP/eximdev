// components/home/Feedback.js
import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Alert,
  Snackbar,
  Card,
  CardContent,
  IconButton,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Fab,
  CircularProgress,
  Divider,
  Link
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  FilterList as FilterIcon,
  Feedback as FeedbackIcon,
  VisibilityOff as VisibilityOffIcon,
  Visibility as VisibilityIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';
import { UserContext } from '../../contexts/UserContext';
import FileUpload from '../gallery/FileUpload';

const Feedback = () => {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === 'Admin';

  const [feedbackList, setFeedbackList] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAdminDialog, setOpenAdminDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showMyFeedback, setShowMyFeedback] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterModule, setFilterModule] = useState('all');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    type: 'bug',
    module: 'dsr',
    title: '',
    description: '',
    priority: 'medium',
    attachments: []
  });

  const [adminFormData, setAdminFormData] = useState({
    status: 'pending',
    adminNotes: ''
  });

  const modules = [
    { value: 'dsr', label: 'DSR' },
    { value: 'e-sanchit', label: 'E-Sanchit' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'submission', label: 'Submission' },
    { value: 'import-do', label: 'Import DO' },
    { value: 'import-operations', label: 'Import Operations' },
    { value: 'import-add', label: 'Import Add' },
    { value: 'import-utility-tools', label: 'Import Utility Tools' },
    { value: 'report', label: 'Report' },
    { value: 'audit-trail', label: 'Audit Trail' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (user) {
      fetchFeedback();
      if (!isAdmin) {
        fetchMyFeedback();
      }
    }
  }, [user, isAdmin, filterStatus, filterType, filterModule]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);
      if (filterModule !== 'all') params.append('module', filterModule);

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/feedback?${params.toString()}`
      );
      if (response.data?.success) {
        setFeedbackList(response.data.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showSnackbar('Failed to load feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyFeedback = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/feedback/user/${user.username}`
      );
      if (response.data?.success) {
        setMyFeedback(response.data.data);
      }
    } catch (err) {
      console.error('Fetch my feedback error:', err);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = () => {
    setFormData({
      type: 'bug',
      module: 'dsr',
      title: '',
      description: '',
      priority: 'medium',
      attachments: []
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFileUpload = (newFiles) => {
    setFormData(prev => ({
      ...prev,
      attachments: newFiles
    }));
  };

  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      showSnackbar('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const submitData = {
        ...formData,
        submittedBy: user.username,
        submittedByEmail: user.email
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/feedback`,
        submitData
      );
      if (response.data?.success) {
        showSnackbar('Feedback submitted successfully');
        fetchFeedback();
        if (!isAdmin) fetchMyFeedback();
        handleCloseDialog();
      }
    } catch (err) {
      console.error('Submit error:', err);
      showSnackbar(err.response?.data?.error || 'Failed to submit feedback', 'error');
    }
  };

  const handleOpenAdminDialog = (feedback) => {
    setSelectedFeedback(feedback);
    setAdminFormData({
      status: feedback.status,
      adminNotes: feedback.adminNotes || ''
    });
    setOpenAdminDialog(true);
  };

  const handleCloseAdminDialog = () => {
    setOpenAdminDialog(false);
    setSelectedFeedback(null);
  };

  const handleAdminUpdate = async () => {
    if (!selectedFeedback) return;

    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_STRING}/feedback/${selectedFeedback._id}`,
        adminFormData
      );
      if (response.data?.success) {
        showSnackbar('Feedback updated successfully');
        fetchFeedback();
        handleCloseAdminDialog();
      }
    } catch (err) {
      console.error('Update error:', err);
      showSnackbar(err.response?.data?.error || 'Failed to update feedback', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_STRING}/feedback/${id}`
      );
      if (response.data?.success) {
        showSnackbar('Feedback deleted successfully');
        fetchFeedback();
      }
    } catch (err) {
      console.error('Delete error:', err);
      showSnackbar(err.response?.data?.error || 'Failed to delete feedback', 'error');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug':
        return <BugReportIcon fontSize="small" />;
      case 'suggestion':
        return <LightbulbIcon fontSize="small" />;
      case 'improvement':
        return <TrendingUpIcon fontSize="small" />;
      default:
        return <FeedbackIcon fontSize="small" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'bug':
        return 'error';
      case 'suggestion':
        return 'info';
      case 'improvement':
        return 'success';
      case 'feature-request':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in-progress':
        return 'info';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      case 'wont-fix':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const displayData = showMyFeedback ? myFeedback : feedbackList;

  if (loading && !showMyFeedback) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <FeedbackIcon sx={{ fontSize: 28 }} />
            Feedback & Support
            {isAdmin && <AdminIcon sx={{ fontSize: 20, color: 'primary.main' }} />}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin 
              ? 'Manage user feedback, bugs, and suggestions'
              : 'Submit bugs, suggestions, and improvements'}
          </Typography>
        </Box>

        {!isAdmin && (
          <Button
            variant="outlined"
            size="small"
            startIcon={showMyFeedback ? <VisibilityIcon /> : <VisibilityOffIcon />}
            onClick={() => setShowMyFeedback(!showMyFeedback)}
          >
            {showMyFeedback ? 'View All' : 'My Submissions'}
          </Button>
        )}
      </Box>

      {/* Filters - Admin Only */}
      {isAdmin && !showMyFeedback && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <FilterIcon fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Filters
            </Typography>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="wont-fix">Won't Fix</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="bug">Bug</MenuItem>
                  <MenuItem value="suggestion">Suggestion</MenuItem>
                  <MenuItem value="improvement">Improvement</MenuItem>
                  <MenuItem value="feature-request">Feature Request</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Module</InputLabel>
                <Select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  label="Module"
                >
                  <MenuItem value="all">All Modules</MenuItem>
                  {modules.map((mod) => (
                    <MenuItem key={mod.value} value={mod.value}>
                      {mod.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Feedback Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f9f9f9' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Module</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>By</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Status</TableCell>
              {isAdmin && <TableCell sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    {showMyFeedback ? 'No submissions yet' : 'No feedback found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => (
                <TableRow key={item._id} hover sx={{ '&:hover': { backgroundColor: '#fafafa' } }}>
                  <TableCell>
                    <Chip
                      icon={getTypeIcon(item.type)}
                      label={item.type.replace('-', ' ').charAt(0).toUpperCase() + item.type.slice(1)}
                      size="small"
                      color={getTypeColor(item.type)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={modules.find(m => m.value === item.module)?.label || item.module}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {item.title}
                    </Typography>
                    {item.attachments && item.attachments.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <AttachFileIcon sx={{ fontSize: '0.75rem' }} />
                        <Typography variant="caption" color="text.secondary">
                          {item.attachments.length} file{item.attachments.length > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {item.submittedBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      size="small"
                      color={getPriorityColor(item.priority)}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status.replace('-', ' ').charAt(0).toUpperCase() + item.status.slice(1)}
                      size="small"
                      color={getStatusColor(item.status)}
                    />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Update">
                          <IconButton size="small" onClick={() => handleOpenAdminDialog(item)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(item._id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Submit Feedback FAB */}
      <Tooltip title="Submit Feedback">
        <Fab
          color="primary"
          aria-label="submit"
          onClick={handleOpenDialog}
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Submit Feedback Dialog */}
 {/* Submit Feedback Dialog */}
<Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
  <DialogTitle sx={{ pb: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6">Submit Feedback</Typography>
      <IconButton onClick={handleCloseDialog} size="small">
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>
  <Divider sx={{ mx: 0 }} />
  <DialogContent sx={{ pt: 2, pb: 2 }}>
    <Stack spacing={2}>
      {/* Type and Module Row */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Type *</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              label="Type *"
            >
              <MenuItem value="bug">Bug Report</MenuItem>
              <MenuItem value="suggestion">Suggestion</MenuItem>
              <MenuItem value="improvement">Improvement</MenuItem>
              <MenuItem value="feature-request">Feature Request</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Module *</InputLabel>
            <Select
              value={formData.module}
              onChange={(e) => setFormData(prev => ({ ...prev, module: e.target.value }))}
              label="Module *"
            >
              {modules.map((mod) => (
                <MenuItem key={mod.value} value={mod.value}>
                  {mod.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Priority */}
      <FormControl fullWidth size="small">
        <InputLabel>Priority</InputLabel>
        <Select
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
          label="Priority"
        >
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="critical">Critical</MenuItem>
        </Select>
      </FormControl>

      {/* Title */}
      <TextField
        label="Title *"
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        placeholder="Brief description"
        fullWidth
        size="small"
      />

      {/* Description */}
      <TextField
        label="Description *"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Detailed information"
        multiline
        rows={4}
        fullWidth
        size="small"
      />

      {/* File Upload Section */}
      <Box sx={{ pt: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.875rem' }}>
          Attachments
        </Typography>
        <FileUpload
          label="Upload Files"
          bucketPath="feedback"
          onFilesUploaded={handleFileUpload}
          multiple={true}
          acceptedFileTypes={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.zip']}
        />

        {/* Display uploaded files */}
        {formData.attachments.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
              Uploaded files ({formData.attachments.length}):
            </Typography>
            <Stack spacing={0.75}>
              {formData.attachments.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 0.75,
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
                    <AttachFileIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', flexShrink: 0 }} />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        fontSize: '0.8rem'
                      }}
                    >
                      {file.split('/').pop()}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveAttachment(index)}
                    color="error"
                    sx={{ ml: 1, flexShrink: 0 }}
                  >
                    <CloseIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mt: 1, fontSize: '0.8rem' }}>
        Submitted as <strong>{user?.username}</strong> on <strong>{format(new Date(), 'MMM dd, yyyy')}</strong>
      </Alert>
    </Stack>
  </DialogContent>
  <Divider sx={{ mx: 0 }} />
  <DialogActions sx={{ p: 1.5 }}>
    <Button onClick={handleCloseDialog} size="small">
      Cancel
    </Button>
    <Button variant="contained" onClick={handleSubmit} size="small">
      Submit
    </Button>
  </DialogActions>
</Dialog>


      {/* Admin Update Dialog */}
      <Dialog open={openAdminDialog} onClose={handleCloseAdminDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Update Feedback</Typography>
            <IconButton onClick={handleCloseAdminDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedFeedback && (
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ backgroundColor: '#f9f9f9' }}>
                <CardContent sx={{ pb: 1, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {selectedFeedback.title}
                  </Typography>
                  <Typography variant="body2" paragraph sx={{ mb: 1 }}>
                    {selectedFeedback.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={selectedFeedback.type}
                      size="small"
                      color={getTypeColor(selectedFeedback.type)}
                      variant="outlined"
                    />
                    <Chip
                      label={modules.find(m => m.value === selectedFeedback.module)?.label}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={selectedFeedback.priority}
                      size="small"
                      color={getPriorityColor(selectedFeedback.priority)}
                    />
                  </Box>
                  {selectedFeedback.attachments && selectedFeedback.attachments.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        Attachments:
                      </Typography>
                      {selectedFeedback.attachments.map((file, idx) => (
                        <Link
                          key={idx}
                          href={file}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          sx={{ display: 'block', mb: 0.25 }}
                        >
                          {file.split('/').pop()}
                        </Link>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={adminFormData.status}
                  onChange={(e) => setAdminFormData(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                  <MenuItem value="wont-fix">Won't Fix</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Admin Notes"
                value={adminFormData.adminNotes}
                onChange={(e) => setAdminFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                placeholder="Add internal notes"
                multiline
                rows={3}
                fullWidth
                size="small"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdminDialog} size="small">Cancel</Button>
          <Button variant="contained" onClick={handleAdminUpdate} size="small">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Feedback;

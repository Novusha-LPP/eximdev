// ReleaseNotes.js
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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Collapse,
  Tooltip,
  Fab
} from '@mui/material';
import {
  NewReleases as NewReleasesIcon,
  BugReport as BugReportIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { UserContext } from '../../contexts/UserContext';

const ReleaseNotes = () => {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === 'Admin';

  const [releaseNotes, setReleaseNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedVersions, setExpandedVersions] = useState(new Set([0]));
  const [openDialog, setOpenDialog] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    version: '',
    releaseDate: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    changes: [],
    isPublished: false
  });

  const [currentChange, setCurrentChange] = useState({
    category: 'feature',
    description: '',
    impact: 'medium'
  });

  useEffect(() => {
    fetchReleaseNotes();
  }, [isAdmin]);

  const fetchReleaseNotes = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    try {
      const endpoint = isAdmin ? '/release-notes/all' : '/release-notes';
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}${endpoint}`);
      if (response.data?.success) {
        setReleaseNotes(response.data.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view all release notes');
      } else {
        setError('Failed to load release notes. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const toggleExpanded = (index) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'feature':
        return <StarIcon fontSize="small" />;
      case 'improvement':
        return <TrendingUpIcon fontSize="small" />;
      case 'bugfix':
        return <BugReportIcon fontSize="small" />;
      case 'breaking':
        return <WarningIcon fontSize="small" />;
      case 'security':
        return <SecurityIcon fontSize="small" />;
      case 'performance':
        return <SpeedIcon fontSize="small" />;
      default:
        return <NewReleasesIcon fontSize="small" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'feature':
        return 'success';
      case 'improvement':
        return 'info';
      case 'bugfix':
        return 'warning';
      case 'breaking':
        return 'error';
      case 'security':
        return 'error';
      case 'performance':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getCategoryLabel = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const handleOpenDialog = (note = null) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        version: note.version,
        releaseDate: new Date(note.releaseDate).toISOString().split('T')[0],
        title: note.title,
        description: note.description || '',
        changes: note.changes || [],
        isPublished: note.isPublished
      });
    } else {
      setEditingNote(null);
      setFormData({
        version: '',
        releaseDate: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        changes: [],
        isPublished: false
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingNote(null);
    setCurrentChange({ category: 'feature', description: '', impact: 'medium' });
  };

  const handleAddChange = () => {
    if (!currentChange.description.trim()) {
      showSnackbar('Please enter a change description', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      changes: [...prev.changes, { ...currentChange }]
    }));
    setCurrentChange({ category: 'feature', description: '', impact: 'medium' });
  };

  const handleRemoveChange = (index) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.version || !formData.title || formData.changes.length === 0) {
      showSnackbar('Please fill in all required fields and add at least one change', 'warning');
      return;
    }

    try {
      if (editingNote) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/release-notes/${editingNote._id}`, formData);
        showSnackbar('Release note updated successfully');
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/release-notes`, formData);
        showSnackbar('Release note created successfully');
      }
      fetchReleaseNotes();
      handleCloseDialog();
    } catch (err) {
      console.error('Submit error:', err);
      showSnackbar(err.response?.data?.error || 'Failed to save release note', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this release note?')) return;
    
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/release-notes/${id}`);
      showSnackbar('Release note deleted successfully');
      fetchReleaseNotes();
    } catch (err) {
      showSnackbar('Failed to delete release note', 'error');
    }
  };

  // Render Release Notes Display
  const renderReleaseNotesDisplay = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    const displayNotes = releaseNotes.filter(note => isAdmin || note.isPublished);

    return (
      <Stack spacing={3}>
        {displayNotes.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No release notes available yet.
            </Typography>
          </Paper>
        ) : (
          displayNotes.map((note, index) => (
            <Card key={note._id} elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Version {note.version}
                      </Typography>
                      {!note.isPublished && isAdmin && (
                        <Chip label="Draft" size="small" color="warning" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Released on {format(new Date(note.releaseDate), 'MMMM dd, yyyy')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isAdmin && adminMode && (
                      <>
                        <IconButton size="small" onClick={() => handleOpenDialog(note)} color="primary">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(note._id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    <IconButton onClick={() => toggleExpanded(index)}>
                      {expandedVersions.has(index) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                </Box>

                {note.title && (
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {note.title}
                  </Typography>
                )}
                {note.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {note.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {['feature', 'improvement', 'bugfix', 'breaking', 'security', 'performance'].map(cat => {
                    const count = note.changes.filter(c => c.category === cat).length;
                    if (count === 0) return null;
                    return (
                      <Chip
                        key={cat}
                        icon={getCategoryIcon(cat)}
                        label={`${count} ${getCategoryLabel(cat)}${count > 1 ? 's' : ''}`}
                        size="small"
                        color={getCategoryColor(cat)}
                        variant="outlined"
                      />
                    );
                  })}
                </Box>

                <Collapse in={expandedVersions.has(index)}>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    {note.changes.map((change, changeIndex) => (
                      <Box key={changeIndex} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            icon={getCategoryIcon(change.category)}
                            label={getCategoryLabel(change.category)}
                            size="small"
                            color={getCategoryColor(change.category)}
                            sx={{ minWidth: 120 }}
                          />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {change.description}
                          </Typography>
                          {change.impact && change.impact !== 'low' && (
                            <Chip
                              label={`${change.impact.toUpperCase()} IMPACT`}
                              size="small"
                              sx={{ mt: 0.5 }}
                              color={change.impact === 'high' ? 'error' : 'warning'}
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
    );
  };

  // Render Admin Management Table
  const renderAdminTable = () => {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Manage Release Notes
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => setAdminMode(false)}
          >
            Back to View
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Release Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Changes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Published</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {releaseNotes.map((note) => (
                <TableRow key={note._id}>
                  <TableCell>{note.version}</TableCell>
                  <TableCell>{note.title}</TableCell>
                  <TableCell>{format(new Date(note.releaseDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{note.changes.length}</TableCell>
                  <TableCell>
                    <Chip
                      label={note.isPublished ? 'Published' : 'Draft'}
                      color={note.isPublished ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenDialog(note)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(note._id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, position: 'relative' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewReleasesIcon sx={{ fontSize: 36 }} />
          Release Notes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Stay updated with the latest features, improvements, and bug fixes in our application.
        </Typography>
      </Box>

      {/* Content */}
      {adminMode ? renderAdminTable() : renderReleaseNotesDisplay()}

      {/* Admin Settings FAB - Only show for admins */}
      {isAdmin && !adminMode && (
        <Tooltip title="Admin Management">
          <Fab
            color="primary"
            aria-label="admin"
            onClick={() => setAdminMode(true)}
            sx={{ position: 'fixed', bottom: 32, right: 32 }}
          >
            <SettingsIcon />
          </Fab>
        </Tooltip>
      )}

      {/* Add New Release Notes Button (when in admin mode) */}
      {isAdmin && adminMode && (
        <Tooltip title="Add Release Note">
          <Fab
            color="success"
            aria-label="add"
            onClick={() => handleOpenDialog()}
            sx={{ position: 'fixed', bottom: 32, right: 32 }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {editingNote ? 'Edit Release Note' : 'Create Release Note'}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Version *"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                placeholder="e.g., 1.2.0"
                fullWidth
              />
              <TextField
                label="Release Date *"
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              label="Title *"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Major UI Overhaul"
              fullWidth
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief overview of this release"
              multiline
              rows={3}
              fullWidth
            />

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                Add Change
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={currentChange.category}
                      onChange={(e) => setCurrentChange(prev => ({ ...prev, category: e.target.value }))}
                      label="Category"
                    >
                      <MenuItem value="feature">Feature</MenuItem>
                      <MenuItem value="improvement">Improvement</MenuItem>
                      <MenuItem value="bugfix">Bug Fix</MenuItem>
                      <MenuItem value="breaking">Breaking Change</MenuItem>
                      <MenuItem value="security">Security</MenuItem>
                      <MenuItem value="performance">Performance</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Impact</InputLabel>
                    <Select
                      value={currentChange.impact}
                      onChange={(e) => setCurrentChange(prev => ({ ...prev, impact: e.target.value }))}
                      label="Impact"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <TextField
                  label="Change Description"
                  value={currentChange.description}
                  onChange={(e) => setCurrentChange(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the change"
                  multiline
                  rows={2}
                  fullWidth
                />
                <Button variant="contained" onClick={handleAddChange} startIcon={<AddIcon />}>
                  Add Change
                </Button>
              </Stack>
            </Paper>

            {formData.changes.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
                  Changes ({formData.changes.length})
                </Typography>
                <Stack spacing={1}>
                  {formData.changes.map((change, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Chip label={change.category} size="small" color="primary" sx={{ mt: 0.5 }} />
                      <Typography variant="body2" sx={{ flex: 1, mt: 0.5 }}>
                        {change.description}
                      </Typography>
                      <Chip label={change.impact} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                      <IconButton size="small" onClick={() => handleRemoveChange(index)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublished}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                />
              }
              label="Publish immediately"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingNote ? 'Update' : 'Create'}
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

export default ReleaseNotes;

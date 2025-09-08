// MasterTypeManager.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack
} from '@mui/material';
import { Add, Delete, Edit, Save, Cancel, Visibility, Business, Clear, Assignment, TrendingUp, Schedule, PersonAdd } from '@mui/icons-material';
import FileUpload from '../gallery/FileUpload';
import ImagePreview from '../gallery/ImagePreview';

const MasterTypeManager = () => {
  const [masterTypes, setMasterTypes] = useState([]);
  const [masterEntries, setMasterEntries] = useState([]);
  const [selectedMasterType, setSelectedMasterType] = useState('');
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [masterData, setMasterData] = useState({
    id: null,
    masterType: '',
    defaultFields: {
      companyName: '',
      address: '',
      billingDate: '',
      dueDate: '',
      reminder: 'monthly'
    },
    customFields: []
  });

  const reminderOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half-yearly', label: 'Half Yearly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  useEffect(() => {
    fetchMasterTypes();
    fetchMasterEntries();
  }, []);

  useEffect(() => {
    if (selectedMasterType && masterEntries.length > 0) {
      const filtered = masterEntries.filter(entry => 
        entry.masterTypeName === selectedMasterType
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries([]);
    }
  }, [selectedMasterType, masterEntries]);

  const fetchMasterTypes = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_STRING}/master-types`);
      const data = await response.json();
      setMasterTypes(data);
    } catch (error) {
      console.error('Error fetching master types:', error);
    }
  };

  const fetchMasterEntries = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_STRING}/masters`);
      const data = await response.json();
      setMasterEntries(data);
    } catch (error) {
      console.error('Error fetching master entries:', error);
    }
  };

  // Get master type statistics
  const getMasterTypeStats = (masterTypeName) => {
    const entries = masterEntries.filter(entry => entry.masterTypeName === masterTypeName);
    const total = entries.length;
    const overdue = entries.filter(entry => {
      if (!entry.defaultFields.dueDate) return false;
      const today = new Date();
      const due = new Date(entry.defaultFields.dueDate);
      return due < today;
    }).length;
    const upcoming = entries.filter(entry => {
      if (!entry.defaultFields.dueDate) return false;
      const today = new Date();
      const due = new Date(entry.defaultFields.dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;
    
    return { total, overdue, upcoming };
  };

  const handleMasterTypeChange = (event) => {
    const value = event.target.value;
    setSelectedMasterType(value);
    
    if (value === 'CREATE_NEW') {
      resetForm();
      setShowInlineForm(false);
      setOpenDialog(true);
    } else if (value) {
      const existingMaster = masterTypes.find(mt => mt.name === value);
      if (existingMaster) {
        setMasterData(prev => ({
          ...prev,
          id: null,
          masterType: value,
          defaultFields: {
            companyName: '',
            address: '',
            billingDate: '',
            dueDate: '',
            reminder: 'monthly'
          },
          customFields: existingMaster.fields.map(field => ({
            id: Date.now() + Math.random(),
            name: field.name,
            value: '',
            type: field.type,
            required: field.required
          })) || []
        }));
      } else {
        resetFormForExisting(value);
      }
      setShowInlineForm(true);
      setEditMode(false);
    } else {
      setShowInlineForm(false);
    }
  };

  // Handle master type card click
  const handleMasterTypeCardClick = (masterTypeName) => {
    setSelectedMasterType(masterTypeName);
    const existingMaster = masterTypes.find(mt => mt.name === masterTypeName);
    if (existingMaster) {
      setMasterData(prev => ({
        ...prev,
        id: null,
        masterType: masterTypeName,
        defaultFields: {
          companyName: '',
          address: '',
          billingDate: '',
          dueDate: '',
          reminder: 'monthly'
        },
        customFields: existingMaster.fields.map(field => ({
          id: Date.now() + Math.random(),
          name: field.name,
          value: '',
          type: field.type,
          required: field.required
        })) || []
      }));
    }
    setShowInlineForm(true);
    setEditMode(false);
  };

  const resetForm = () => {
    setMasterData({
      id: null,
      masterType: '',
      defaultFields: {
        companyName: '',
        address: '',
        billingDate: '',
        dueDate: '',
        reminder: 'monthly'
      },
      customFields: []
    });
    setEditMode(false);
  };

  const resetFormForExisting = (masterType) => {
    setMasterData({
      id: null,
      masterType: masterType,
      defaultFields: {
        companyName: '',
        address: '',
        billingDate: '',
        dueDate: '',
        reminder: 'monthly'
      },
      customFields: []
    });
    setEditMode(false);
  };

  const clearInlineForm = () => {
    if (selectedMasterType && selectedMasterType !== 'CREATE_NEW') {
      const existingMaster = masterTypes.find(mt => mt.name === selectedMasterType);
      setMasterData(prev => ({
        ...prev,
        id: null,
        defaultFields: {
          companyName: '',
          address: '',
          billingDate: '',
          dueDate: '',
          reminder: 'monthly'
        },
        customFields: existingMaster ? existingMaster.fields.map(field => ({
          id: Date.now() + Math.random(),
          name: field.name,
          value: '',
          type: field.type,
          required: field.required
        })) : []
      }));
    }
    setEditMode(false);
  };

  const addCustomField = () => {
    setMasterData(prev => ({
      ...prev,
      customFields: [...prev.customFields, {
        id: Date.now(),
        name: '',
        value: '',
        type: 'text',
        required: false
      }]
    }));
  };

  const updateCustomField = (id, field, value) => {
    setMasterData(prev => ({
      ...prev,
      customFields: prev.customFields.map(cf => 
        cf.id === id ? { ...cf, [field]: value } : cf
      )
    }));
  };

  const removeCustomField = (id) => {
    setMasterData(prev => ({
      ...prev,
      customFields: prev.customFields.filter(cf => cf.id !== id)
    }));
  };

  const handleDefaultFieldChange = (field, value) => {
    setMasterData(prev => ({
      ...prev,
      defaultFields: {
        ...prev.defaultFields,
        [field]: value
      }
    }));
  };

  const handleEdit = (entry) => {
    setEditMode(true);
    setMasterData({
      id: entry._id,
      masterType: entry.masterTypeName,
      defaultFields: { ...entry.defaultFields },
      customFields: entry.customFields.map(cf => ({
        ...cf,
        id: cf.id || Date.now() + Math.random()
      })) || []
    });
    setShowInlineForm(true);
  };

  const handleInlineSubmit = async () => {
    try {
      const masterEntry = {
        masterType: selectedMasterType,
        defaultFields: masterData.defaultFields,
        customFields: masterData.customFields
      };

      const url = editMode 
        ? `${process.env.REACT_APP_API_STRING}/masters/${masterData.id}`
        : `${process.env.REACT_APP_API_STRING}/masters`;
      
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterEntry)
      });

      if (response.ok) {
        clearInlineForm();
        fetchMasterEntries();
      }
    } catch (error) {
      console.error('Error saving master:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const masterTypeStructure = {
        name: masterData.masterType,
        fields: masterData.customFields.map(cf => ({
          name: cf.name,
          type: cf.type,
          required: cf.required
        }))
      };

      await fetch(`${process.env.REACT_APP_API_STRING}/master-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterTypeStructure)
      });

      const masterEntry = {
        masterType: masterData.masterType,
        defaultFields: masterData.defaultFields,
        customFields: masterData.customFields
      };

      const response = await fetch(`${process.env.REACT_APP_API_STRING}/masters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterEntry)
      });

      if (response.ok) {
        setOpenDialog(false);
        setSelectedMasterType(masterData.masterType);
        fetchMasterTypes();
        fetchMasterEntries();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving master:', error);
    }
  };

  const getMasterTypeOptions = () => {
    const customTypes = masterTypes.map(mt => mt.name);
    const allTypes = [...new Set([...customTypes])];
    return allTypes;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (daysUntilDue) => {
    if (daysUntilDue === null) return 'default';
    if (daysUntilDue < 0) return 'error';
    if (daysUntilDue <= 7) return 'warning';
    return 'success';
  };

  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
    setViewDialog(true);
  };

  return (
    <Box sx={{ 
      p: 2, 
      maxWidth: 1400, 
      mx: 'auto',
      bgcolor: '#f8fafc',
      minHeight: '100vh'
    }}>

      {/* Master Type Selection */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.875rem' }}>Select Master Type</InputLabel>
              <Select
                value={selectedMasterType}
                label="Select Master Type"
                onChange={handleMasterTypeChange}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                    }
                  }
                }}
              >
                {getMasterTypeOptions().map((type) => (
                  <MenuItem key={type} value={type} sx={{ fontSize: '0.875rem' }}>
                    {type}
                  </MenuItem>
                ))}
                <MenuItem value="CREATE_NEW" sx={{ fontSize: '0.875rem', color: '#059669' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Add fontSize="small" />
                    Create New Master Type
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Inline Form */}
        {showInlineForm && selectedMasterType !== 'CREATE_NEW' && (
          <Grid item xs={12} lg={5}>
            <Card 
              elevation={2}
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                position: 'sticky',
                top: 20
              }}
            >
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      {editMode ? 'Edit Entry' : 'Add New Entry'}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={clearInlineForm}
                      sx={{ color: '#64748b' }}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  </Box>
                }
                sx={{ 
                  pb: 1,
                  '& .MuiCardHeader-title': { fontSize: '1.1rem' }
                }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={2}>
                  {/* Company Information */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#475569' }}>
                      Company Information
                    </Typography>
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        label="Company Name"
                        value={masterData.defaultFields.companyName}
                        onChange={(e) => handleDefaultFieldChange('companyName', e.target.value)}
                        size="small"
                        required
                      />
                      <TextField
                        fullWidth
                        label="Address"
                        value={masterData.defaultFields.address}
                        onChange={(e) => handleDefaultFieldChange('address', e.target.value)}
                        size="small"
                        multiline
                        rows={2}
                      />
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Billing Date"
                            type="date"
                            value={masterData.defaultFields.billingDate}
                            onChange={(e) => handleDefaultFieldChange('billingDate', e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Due Date"
                            type="date"
                            value={masterData.defaultFields.dueDate}
                            onChange={(e) => handleDefaultFieldChange('dueDate', e.target.value)}
                            size="small"
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </Grid>
                      <FormControl fullWidth size="small">
                        <InputLabel>Reminder</InputLabel>
                        <Select
                          value={masterData.defaultFields.reminder}
                          label="Reminder"
                          onChange={(e) => handleDefaultFieldChange('reminder', e.target.value)}
                        >
                          {reminderOptions.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>

                  {/* Custom Fields */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                        Additional Custom Fields
                      </Typography>
                      <Button 
                        startIcon={<Add />} 
                        onClick={addCustomField}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Add Field
                      </Button>
                    </Box>
                    {masterData.customFields.map((field) => (
                      <Paper 
                        key={field.id}
                        sx={{ 
                          p: 2, 
                          mb: 2,
                          bgcolor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 2
                        }}
                      >
                        <Grid container spacing={2} alignItems="flex-start">
                          {/* Field Name */}
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Field Name"
                              size="small"
                              value={field.name}
                              onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                            />
                          </Grid>
                          
                          {/* Value Field - Conditionally rendered based on type */}
                          <Grid item xs={12} md={field.type === 'upload' ? 6 : 3}>
                            {field.type === 'date' ? (
                              <TextField
                                fullWidth
                                label="Default Value"
                                size="small"
                                type="date"
                                value={field.value}
                                onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                              />
                            ) : field.type === 'upload' ? (
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <FileUpload
                                    bucketPath={`custom-fields/${field.name || 'unnamed-field'}`}
                                    onFilesUploaded={(newFiles) => {
                                      const existingFiles = Array.isArray(field.value) ? field.value : [];
                                      const updatedFiles = [...existingFiles, ...newFiles];
                                      updateCustomField(field.id, 'value', updatedFiles);
                                    }}
                                    multiple={true}
                                    style={{
                                      padding: "8px 16px",
                                      borderRadius: "6px",
                                      backgroundColor: "#3b82f6",
                                      color: "#fff",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "0.875rem",
                                      fontWeight: "600",
                                      textAlign: "center",
                                      textTransform: 'uppercase',
                                      transition: "background-color 0.3s",
                                      '&:hover': {
                                        backgroundColor: "#2563eb",
                                      }
                                    }}
                                    label="UPLOAD"
                                  />
                                  {field.value && Array.isArray(field.value) && field.value.length > 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                      {field.value.length} file(s) selected
                                    </Typography>
                                  )}
                                </Box>
                                
                                {/* Show uploaded files preview */}
                                {field.value && Array.isArray(field.value) && field.value.length > 0 && (
                                  <Box sx={{ 
                                    mt: 1, 
                                    p: 1, 
                                    bgcolor: 'white', 
                                    borderRadius: 1,
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    <ImagePreview
                                      images={field.value}
                                      onDeleteImage={(index) => {
                                        const updatedFiles = [...field.value];
                                        updatedFiles.splice(index, 1);
                                        updateCustomField(field.id, 'value', updatedFiles);
                                      }}
                                      showFileName={true}
                                    />
                                  </Box>
                                )}
                              </Box>
                            ) : (
                              <TextField
                                fullWidth
                                label="Default Value"
                                size="small"
                                type={field.type}
                                value={field.value}
                                onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                                {...(field.type === 'email' && { 
                                  inputProps: { 
                                    pattern: "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" 
                                  } 
                                })}
                                {...(field.type === 'phone' && { 
                                  inputProps: { 
                                    pattern: "[0-9]{3}-[0-9]{3}-[0-9]{4}" 
                                  } 
                                })}
                              />
                            )}
                          </Grid>
                          
                          {/* Type Selector */}
                          <Grid item xs={6} md={2}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Type</InputLabel>
                              <Select
                                value={field.type}
                                label="Type"
                                onChange={(e) => {
                                  updateCustomField(field.id, 'type', e.target.value);
                                  updateCustomField(field.id, 'value', e.target.value === 'upload' ? [] : '');
                                }}
                              >
                                <MenuItem value="text">Text</MenuItem>
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="date">Date</MenuItem>
                                <MenuItem value="email">Email</MenuItem>
                                <MenuItem value="phone">Phone</MenuItem>
                                <MenuItem value="upload">Upload</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          {/* Delete Button */}
                          <Grid item xs={2} md={1}>
                            <IconButton 
                              color="error" 
                              onClick={() => removeCustomField(field.id)}
                              size="small"
                              sx={{ '&:hover': { bgcolor: '#fee2e2' } }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleInlineSubmit}
                      disabled={!masterData.defaultFields.companyName}
                      size="small"
                      sx={{
                        flex: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        }
                      }}
                    >
                      {editMode ? 'Update' : 'Save Entry'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={clearInlineForm}
                      size="small"
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none'
                      }}
                    >
                      Clear
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Entries Table */}
        {selectedMasterType && selectedMasterType !== 'CREATE_NEW' && (
          <Grid item xs={12} lg={showInlineForm ? 7 : 12}>
            <Paper 
              elevation={2} 
              sx={{ 
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                p: 2.5, 
                bgcolor: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
                borderBottom: '1px solid #e2e8f0'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  {selectedMasterType} Entries ({filteredEntries.length})
                </Typography>
              </Box>

              {filteredEntries.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Business sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                  <Typography color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
                    No entries found for {selectedMasterType}
                  </Typography>
                  {!showInlineForm && (
                    <Typography variant="body2" color="text.secondary">
                      Select this master type to start adding entries
                    </Typography>
                  )}
                </Box>
              ) : (
                <TableContainer sx={{ maxHeight: 600 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                          Company
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                          Address
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                          Due Date
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                          Status
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569', width: 120 }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEntries.map((entry, index) => {
                        const daysUntilDue = getDaysUntilDue(entry.defaultFields.dueDate);
                        const statusColor = getStatusColor(daysUntilDue);
                        
                        return (
                          <TableRow 
                            key={entry._id} 
                            hover
                            sx={{
                              '&:hover': { 
                                bgcolor: '#f1f5f9',
                              },
                              bgcolor: editMode && masterData.id === entry._id ? '#eff6ff' : 'inherit'
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {entry.defaultFields.companyName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }}>
                                {entry.defaultFields.address ? 
                                  (entry.defaultFields.address.length > 30 ? 
                                    `${entry.defaultFields.address.substring(0, 30)}...` : 
                                    entry.defaultFields.address
                                  ) : 'Not provided'
                                }
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(entry.defaultFields.dueDate)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {daysUntilDue !== null && (
                                <Chip
                                  size="small"
                                  label={
                                    daysUntilDue < 0 
                                      ? `Overdue ${Math.abs(daysUntilDue)}d`
                                      : `${daysUntilDue}d left`
                                  }
                                  color={statusColor}
                                  sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleViewEntry(entry)}
                                  sx={{ 
                                    '&:hover': { 
                                      bgcolor: '#e0f2fe',
                                      color: '#0277bd'
                                    }
                                  }}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEdit(entry)}
                                  sx={{ 
                                    '&:hover': { 
                                      bgcolor: '#fff3e0',
                                      color: '#ef6c00'
                                    }
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        )}

        {/* Master Type Cards - Show when no master type is selected */}
        {!selectedMasterType && (
          <Grid item xs={12}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment sx={{ color: '#3b82f6' }} />
                Existing Master Types
              </Typography>
              
              {masterTypes.length === 0 ? (
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 6, 
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
                  }}
                >
                  <Business sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                  <Typography color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
                    No master types created yet
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      resetForm();
                      setOpenDialog(true);
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                      }
                    }}
                  >
                    Create Your First Master Type
                  </Button>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {masterTypes.map((masterType) => {
                    const stats = getMasterTypeStats(masterType.name);
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={masterType._id}>
                        <Card 
                          elevation={2}
                          sx={{ 
                            borderRadius: 3,
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(59, 130, 246, 0.15)',
                              borderColor: '#3b82f6'
                            }
                          }}
                          onClick={() => handleMasterTypeCardClick(masterType.name)}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Box 
                                sx={{ 
                                  p: 1.5, 
                                  borderRadius: 2, 
                                  bgcolor: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  mr: 2
                                }}
                              >
                                <Business sx={{ fontSize: 24, color: '#3b82f6' }} />
                              </Box>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                                  {masterType.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                  {masterType.fields?.length || 0} custom fields
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Grid container spacing={2}>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#3b82f6', fontSize: '1.2rem' }}>
                                    {stats.total}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                    Total
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.2rem' }}>
                                    {stats.upcoming}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                    Due Soon
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={4}>
                                <Box sx={{ textAlign: 'center' }}>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#dc2626', fontSize: '1.2rem' }}>
                                    {stats.overdue}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                    Overdue
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                            
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                              <Chip
                                label="Click to manage"
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  color: '#3b82f6', 
                                  borderColor: '#3b82f6',
                                  fontSize: '0.75rem'
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                  
                  {/* Create New Master Type Card */}
                  <Grid item xs={12} sm={6} md={4} lg={3}>
                    <Card 
                      elevation={1}
                      sx={{ 
                        borderRadius: 3,
                        border: '2px dashed #d1d5db',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: '#3b82f6',
                          bgcolor: '#f8fafc'
                        }
                      }}
                      onClick={() => {
                        resetForm();
                        setOpenDialog(true);
                      }}
                    >
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Box 
                          sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            bgcolor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            mb: 2,
                            mx: 'auto',
                            width: 'fit-content'
                          }}
                        >
                          <Add sx={{ fontSize: 32, color: '#3b82f6' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                          Create New Master
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                          Set up a new master type with custom fields
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Chip
                            label="+ New Master Type"
                            size="small"
                            sx={{ 
                              bgcolor: '#3b82f6', 
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Rest of the dialogs remain the same... */}
      {/* Create New Master Type Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3,
            maxHeight: '90vh'
          } 
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
          borderBottom: '1px solid #e2e8f0',
          color: '#1e293b',
          fontWeight: 700
        }}>
          Create New Master Type
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Master Type Name"
              value={masterData.masterType}
              onChange={(e) => setMasterData(prev => ({ ...prev, masterType: e.target.value }))}
              size="small"
              required
            />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569', mb: 2 }}>
                Company Information Fields
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={masterData.defaultFields.companyName}
                    onChange={(e) => handleDefaultFieldChange('companyName', e.target.value)}
                    size="small"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={masterData.defaultFields.address}
                    onChange={(e) => handleDefaultFieldChange('address', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Billing Date"
                    type="date"
                    value={masterData.defaultFields.billingDate}
                    onChange={(e) => handleDefaultFieldChange('billingDate', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Due Date"
                    type="date"
                    value={masterData.defaultFields.dueDate}
                    onChange={(e) => handleDefaultFieldChange('dueDate', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Reminder</InputLabel>
                    <Select
                      value={masterData.defaultFields.reminder}
                      label="Reminder"
                      onChange={(e) => handleDefaultFieldChange('reminder', e.target.value)}
                    >
                      {reminderOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                  Additional Custom Fields
                </Typography>
                <Button 
                  startIcon={<Add />} 
                  onClick={addCustomField}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Add Field
                </Button>
              </Box>
              
              {masterData.customFields.map((field) => (
                <Paper 
                  key={field.id}
                  sx={{ 
                    p: 2, 
                    mb: 2,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2
                  }}
                >
                  <Grid container spacing={2} alignItems="flex-start">
                    {/* Field Name */}
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Field Name"
                        size="small"
                        value={field.name}
                        onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                      />
                    </Grid>
                    
                    {/* Value Field - Conditionally rendered based on type */}
                    <Grid item xs={12} md={field.type === 'upload' ? 6 : 3}>
                      {field.type === 'date' ? (
                        <TextField
                          fullWidth
                          label="Default Value"
                          size="small"
                          type="date"
                          value={field.value}
                          onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : field.type === 'upload' ? (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <FileUpload
                              bucketPath={`custom-fields/${field.name || 'unnamed-field'}`}
                              onFilesUploaded={(newFiles) => {
                                const existingFiles = Array.isArray(field.value) ? field.value : [];
                                const updatedFiles = [...existingFiles, ...newFiles];
                                updateCustomField(field.id, 'value', updatedFiles);
                              }}
                              multiple={true}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "6px",
                                backgroundColor: "#3b82f6",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                fontWeight: "600",
                                textAlign: "center",
                                textTransform: 'uppercase',
                                transition: "background-color 0.3s",
                                '&:hover': {
                                  backgroundColor: "#2563eb",
                                }
                              }}
                              label="UPLOAD"
                            />
                            {field.value && Array.isArray(field.value) && field.value.length > 0 && (
                              <Typography variant="body2" color="text.secondary">
                                {field.value.length} file(s) selected
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Show uploaded files preview */}
                          {field.value && Array.isArray(field.value) && field.value.length > 0 && (
                            <Box sx={{ 
                              mt: 1, 
                              p: 1, 
                              bgcolor: 'white', 
                              borderRadius: 1,
                              border: '1px solid #e2e8f0'
                            }}>
                              <ImagePreview
                                images={field.value}
                                onDeleteImage={(index) => {
                                  const updatedFiles = [...field.value];
                                  updatedFiles.splice(index, 1);
                                  updateCustomField(field.id, 'value', updatedFiles);
                                }}
                                showFileName={true}
                              />
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <TextField
                          fullWidth
                          label="Default Value"
                          size="small"
                          type={field.type}
                          value={field.value}
                          onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                          {...(field.type === 'email' && { 
                            inputProps: { 
                              pattern: "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$" 
                            } 
                          })}
                          {...(field.type === 'phone' && { 
                            inputProps: { 
                              pattern: "[0-9]{3}-[0-9]{3}-[0-9]{4}" 
                            } 
                          })}
                        />
                      )}
                    </Grid>
                    
                    {/* Type Selector */}
                    <Grid item xs={6} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          label="Type"
                          onChange={(e) => {
                            updateCustomField(field.id, 'type', e.target.value);
                            updateCustomField(field.id, 'value', e.target.value === 'upload' ? [] : '');
                          }}
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="date">Date</MenuItem>
                          <MenuItem value="email">Email</MenuItem>
                          <MenuItem value="phone">Phone</MenuItem>
                          <MenuItem value="upload">Upload</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    {/* Delete Button */}
                    <Grid item xs={2} md={1}>
                      <IconButton 
                        color="error" 
                        onClick={() => removeCustomField(field.id)}
                        size="small"
                        sx={{ '&:hover': { bgcolor: '#fee2e2' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={!masterData.masterType || !masterData.defaultFields.companyName}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              }
            }}
          >
            Create Master Type
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#f8fafc', 
          borderBottom: '1px solid #e2e8f0',
          color: '#1e293b',
          fontWeight: 700
        }}>
          {selectedEntry?.defaultFields.companyName}
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          {selectedEntry && (
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Type
                </Typography>
                <Chip 
                  label={selectedEntry.masterTypeName} 
                  size="small" 
                  color="primary"
                  sx={{ mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Address
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {selectedEntry.defaultFields.address || 'Not provided'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Billing Date
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {formatDate(selectedEntry.defaultFields.billingDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Due Date
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {formatDate(selectedEntry.defaultFields.dueDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Reminder
                </Typography>
                <Typography variant="body1" sx={{ textTransform: 'capitalize', mt: 0.5 }}>
                  {selectedEntry.defaultFields.reminder}
                </Typography>
              </Grid>

              {selectedEntry.customFields && selectedEntry.customFields.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                      Additional Information
                    </Typography>
                  </Grid>
                  {selectedEntry.customFields.map((field, index) => (
                    <Grid item xs={6} key={index}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {field.name}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {field.value || 'Not provided'}
                      </Typography>
                    </Grid>
                  ))}
                </>
              )}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button 
            onClick={() => setViewDialog(false)}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Edit />}
            onClick={() => {
              setViewDialog(false);
              handleEdit(selectedEntry);
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              }
            }}
          >
            Edit Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MasterTypeManager;

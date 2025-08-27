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
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Alert
} from '@mui/material';
import { Add, Delete, Edit, Save, Cancel, Visibility, Business, Clear } from '@mui/icons-material';

const MasterTypeManager = () => {
  const [masterTypes, setMasterTypes] = useState([]);
  const [masterEntries, setMasterEntries] = useState([]);
  const [selectedMasterType, setSelectedMasterType] = useState('');
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

  // Helper function to format date for input fields (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Not set';
    return date.toLocaleDateString();
  };

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

  const handleMasterTypeChange = (event) => {
    const value = event.target.value;
    setSelectedMasterType(value);
    
    if (value === 'CREATE_NEW') {
      resetForm();
      setShowInlineForm(false);
      setOpenDialog(true);
    } else if (value) {
      const existingEntry = masterEntries.find(entry => entry.masterTypeName === value);
      const masterTypeStructure = masterTypes.find(mt => mt.name === value);
      
      if (existingEntry) {
        setMasterData({
          id: existingEntry._id,
          masterType: value,
          defaultFields: {
            ...existingEntry.defaultFields,
            // Format dates properly for input fields
            billingDate: formatDateForInput(existingEntry.defaultFields.billingDate),
            dueDate: formatDateForInput(existingEntry.defaultFields.dueDate)
          },
          customFields: existingEntry.customFields.map(cf => ({
            ...cf,
            id: cf.id || Date.now() + Math.random(),
            // Format date values for date type fields
            value: cf.type === 'date' ? formatDateForInput(cf.value) : cf.value
          })) || []
        });
        setEditMode(true);
      } else if (masterTypeStructure) {
        setMasterData({
          id: null,
          masterType: value,
          defaultFields: {
            companyName: '',
            address: '',
            billingDate: '',
            dueDate: '',
            reminder: 'monthly'
          },
          customFields: masterTypeStructure.fields.map(field => ({
            id: Date.now() + Math.random(),
            name: field.name,
            value: field.type === 'date' ? '' : '',
            type: field.type,
            required: field.required
          })) || []
        });
        setEditMode(false);
      }
      setShowInlineForm(true);
    } else {
      setShowInlineForm(false);
    }
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

  const clearInlineForm = () => {
    setSelectedMasterType('');
    setShowInlineForm(false);
    resetForm();
  };

  // Add custom field to existing master type (for editing)
  const addCustomFieldToExisting = () => {
    const newField = {
      id: Date.now(),
      name: '',
      value: '',
      type: 'text',
      required: false
    };
    
    setMasterData(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }));
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

  const handleInlineSubmit = async () => {
    try {
      // If in edit mode and adding new custom fields, update the master type structure first
      if (editMode) {
        const masterTypeStructure = masterTypes.find(mt => mt.name === selectedMasterType);
        const existingFieldNames = masterTypeStructure.fields.map(f => f.name);
        const newFields = masterData.customFields.filter(cf => !existingFieldNames.includes(cf.name) && cf.name.trim() !== '');
        
        if (newFields.length > 0) {
          const updatedFields = [
            ...masterTypeStructure.fields,
            ...newFields.map(cf => ({
              name: cf.name,
              type: cf.type,
              required: cf.required
            }))
          ];
          
          await fetch(`${process.env.REACT_APP_API_STRING}/master-types/${masterTypeStructure._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...masterTypeStructure, fields: updatedFields })
          });
          
          // Refresh master types
          await fetchMasterTypes();
        }
      }

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
        fetchMasterEntries();
        const updatedEntry = await response.json();
        setMasterData(prev => ({
          ...prev,
          id: updatedEntry._id || prev.id
        }));
        setEditMode(true);
      }
    } catch (error) {
      console.error('Error saving master:', error);
    }
  };

  const handleCreateNewMasterType = async () => {
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
        await fetchMasterTypes();
        await fetchMasterEntries();
        
        const newEntry = masterEntries.find(entry => entry.masterTypeName === masterData.masterType);
        if (newEntry) {
          setMasterData({
            id: newEntry._id,
            masterType: masterData.masterType,
            defaultFields: {
              ...newEntry.defaultFields,
              billingDate: formatDateForInput(newEntry.defaultFields.billingDate),
              dueDate: formatDateForInput(newEntry.defaultFields.dueDate)
            },
            customFields: newEntry.customFields.map(cf => ({
              ...cf,
              id: cf.id || Date.now() + Math.random(),
              value: cf.type === 'date' ? formatDateForInput(cf.value) : cf.value
            })) || []
          });
          setEditMode(true);
          setShowInlineForm(true);
        }
      }
    } catch (error) {
      console.error('Error creating master type:', error);
    }
  };

  const getMasterTypeOptions = () => {
    const customTypes = masterTypes.map(mt => mt.name);
    return [...new Set([...customTypes])];
  };

  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
    setViewDialog(true);
  };

  const getEntryStatus = (masterTypeName) => {
    const entry = masterEntries.find(e => e.masterTypeName === masterTypeName);
    return entry ? 'Configured' : 'Not Configured';
  };

  return (
    <Box sx={{ 
      p: 2, 
      maxWidth: 1400, 
      mx: 'auto',
      bgcolor: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            color: '#1e293b',
            mb: 1
          }}
        >
          Master Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your business master data - one entry per master type
        </Typography>
      </Box>

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
          <Grid item xs={12} md={6}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>{type}</span>
                      <Chip 
                        size="small" 
                        label={getEntryStatus(type)}
                        color={getEntryStatus(type) === 'Configured' ? 'success' : 'default'}
                        sx={{ ml: 2 }}
                      />
                    </Box>
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
          <Grid item xs={12} md={6}>
            {selectedMasterType && selectedMasterType !== 'CREATE_NEW' && (
              <Alert 
                severity="info" 
                sx={{ fontSize: '0.875rem' }}
              >
                {editMode ? 'Editing existing entry' : 'Creating new entry'} for {selectedMasterType}
              </Alert>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Inline Form */}
        {showInlineForm && selectedMasterType !== 'CREATE_NEW' && (
          <Grid item xs={12} lg={6}>
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
                      {editMode ? `Edit ${selectedMasterType}` : `Configure ${selectedMasterType}`}
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
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Field Name"
                        size="small"
                        value={field.name}
                        onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Default Value"
                        size="small"
                        value={field.value}
                        type={field.type}
                        onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                        {...(field.type === 'date' && { InputLabelProps: { shrink: true } })}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          label="Type"
                          onChange={(e) => updateCustomField(field.id, 'type', e.target.value)}
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="date">Date</MenuItem>
                          <MenuItem value="email">Email</MenuItem>
                          <MenuItem value="phone">Phone</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.required}
                            onChange={(e) => updateCustomField(field.id, 'required', e.target.checked)}
                            size="small"
                          />
                        }
                        label="Required"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
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
                      {editMode ? 'Update Entry' : 'Save Entry'}
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

        {/* Master Types Overview */}
        {selectedMasterType && selectedMasterType !== 'CREATE_NEW' && (
          <Grid item xs={12} lg={showInlineForm ? 6 : 12}>
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
                  {selectedMasterType} Configuration
                </Typography>
              </Box>

              <Box sx={{ p: 3 }}>
                {masterData.defaultFields.companyName ? (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Company Name
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 500 }}>
                        {masterData.defaultFields.companyName}
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Address
                        </Typography>
                        <Typography variant="body1">
                          {masterData.defaultFields.address || 'Not provided'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Billing Date
                        </Typography>
                        <Typography variant="body1">
                          {formatDateForDisplay(masterData.defaultFields.billingDate)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Due Date
                        </Typography>
                        <Typography variant="body1">
                          {formatDateForDisplay(masterData.defaultFields.dueDate)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Reminder
                        </Typography>
                        <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                          {masterData.defaultFields.reminder}
                        </Typography>
                      </Grid>
                    </Grid>

                    {masterData.customFields.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 1 }}>
                          Additional Information
                        </Typography>
                        <Grid container spacing={2}>
                          {masterData.customFields.map((field, index) => (
                            <Grid item xs={6} key={index}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {field.name}
                              </Typography>
                              <Typography variant="body1">
                                {field.type === 'date' ? formatDateForDisplay(field.value) : (field.value || 'Not provided')}
                              </Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Business sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      No data configured for {selectedMasterType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use the form on the left to configure this master type
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Welcome State */}
        {!selectedMasterType && (
          <Grid item xs={12}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 8, 
                textAlign: 'center',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)'
              }}
            >
              <Business sx={{ fontSize: 64, color: '#3b82f6', mb: 3, opacity: 0.7 }} />
              <Typography variant="h5" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
                Welcome to Master Management
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: '1.1rem', maxWidth: 600, mx: 'auto', mb: 2 }}>
                Select a master type from the dropdown above to configure its data, 
                or create a new master type to get started.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Each master type can have only one configuration entry.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

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
                Company Information
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
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Field Name"
                        size="small"
                        value={field.name}
                        onChange={(e) => updateCustomField(field.id, 'name', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Default Value"
                        size="small"
                        value={field.value}
                        type={field.type}
                        onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                        {...(field.type === 'date' && { InputLabelProps: { shrink: true } })}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={field.type}
                          label="Type"
                          onChange={(e) => updateCustomField(field.id, 'type', e.target.value)}
                        >
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="date">Date</MenuItem>
                          <MenuItem value="email">Email</MenuItem>
                          <MenuItem value="phone">Phone</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={field.required}
                            onChange={(e) => updateCustomField(field.id, 'required', e.target.checked)}
                            size="small"
                          />
                        }
                        label="Required"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
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
            onClick={handleCreateNewMasterType}
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
                  {formatDateForDisplay(selectedEntry.defaultFields.billingDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Due Date
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {formatDateForDisplay(selectedEntry.defaultFields.dueDate)}
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
                        {field.type === 'date' ? formatDateForDisplay(field.value) : (field.value || 'Not provided')}
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
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MasterTypeManager;

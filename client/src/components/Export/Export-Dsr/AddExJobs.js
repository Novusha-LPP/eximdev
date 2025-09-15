import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  LocalShipping as ShippingIcon,
  Description as DescriptionIcon,
  AccountBalance as BankIcon,
  Assignment as AssignmentIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const AddExJobs = () => {
  // Form state
  const [formData, setFormData] = useState({
    // Required fields
    exporter_name: '',
    consignee_name: '',
    ie_code: '',
    
    // Optional fields with defaults
    job_no: '',
    movement_type: 'FCL',
    country_of_final_destination: '',
    commodity_description: '',
    commercial_invoice_value: '',
    invoice_currency: 'USD',
    port_of_loading: '',
    port_of_discharge: '',
    total_packages: '',
    gross_weight_kg: '',
    net_weight_kg: '',
    status: 'pending',
    year: '',
    job_date: new Date()
  });

  // Organization directory state
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search state for organization dropdown
  const [orgSearchTerm, setOrgSearchTerm] = useState('');

  // Movement type options
  const movementTypes = ['FCL', 'LCL', 'Break Bulk', 'Air Freight'];
  
  // Currency options
  const currencies = ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'CNY'];
  
  // Status options
  const statusOptions = ['pending', 'in-progress', 'completed', 'cancelled'];

  // Fetch organizations from directory API
  useEffect(() => {
    fetchOrganizations();
  }, [orgSearchTerm]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/directory`, {
        // params: {
        //   search: orgSearchTerm,
        //   limit: 50,
        //   approvalStatus: 'Approved' // Only show approved organizations
        // }
      });
      
      if (response.data.success) {
        setOrganizations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  // Handle organization selection and auto-fill related fields
  const handleOrganizationSelect = (event, selectedOrg) => {
    setSelectedOrganization(selectedOrg);
    
    if (selectedOrg) {
      // Auto-fill related fields from selected organization
      setFormData(prev => ({
        ...prev,
        exporter_name: selectedOrg.organization || selectedOrg.alias || '',
        ie_code: selectedOrg.registrationDetails?.ieCode || '',
        // Auto-fill additional fields if available
        ...(selectedOrg.address?.addressLine && {
          // Could be used for port of loading if it's a local address
        })
      }));
    } else {
      // Clear auto-filled fields when organization is cleared
      setFormData(prev => ({
        ...prev,
        exporter_name: '',
        ie_code: ''
      }));
    }
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // Clear error when user types
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.exporter_name || !formData.consignee_name || !formData.ie_code) {
      setError('Please fill in all required fields: Exporter Name, Consignee Name, and IE Code');
      return;
    }

    // Validate IE Code format
    if (!/^\d{10}$/.test(formData.ie_code)) {
      setError('IE Code must be exactly 10 digits');
      return;
    }

    try {
      setSubmitLoading(true);
      setError('');

      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/jobs/add-job-exp-man`, {
        ...formData,
        job_date: formData.job_date.toISOString().split('T')[0] // Format date
      });

      if (response.data.success) {
        setSuccess(`Job created successfully! Job No: ${response.data.data.job_no}`);
        // Reset form
        setFormData({
          exporter_name: '',
          consignee_name: '',
          ie_code: '',
          job_no: '',
          movement_type: 'FCL',
          country_of_final_destination: '',
          commodity_description: '',
          commercial_invoice_value: '',
          invoice_currency: 'USD',
          port_of_loading: '',
          port_of_discharge: '',
          total_packages: '',
          gross_weight_kg: '',
          net_weight_kg: '',
          status: 'pending',
          year: '',
          job_date: new Date()
        });
        setSelectedOrganization(null);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create job');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Clear form
  const handleClear = () => {
    setFormData({
      exporter_name: '',
      consignee_name: '',
      ie_code: '',
      job_no: '',
      movement_type: 'FCL',
      country_of_final_destination: '',
      commodity_description: '',
      commercial_invoice_value: '',
      invoice_currency: 'USD',
      port_of_loading: '',
      port_of_discharge: '',
      total_packages: '',
      gross_weight_kg: '',
      net_weight_kg: '',
      status: 'pending',
      year: '',
      job_date: new Date()
    });
    setSelectedOrganization(null);
    setError('');
    setSuccess('');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssignmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Create Export Job
          </Typography>
        </Box>

        {/* Success/Error Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Organization Selection Card */}
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderLeft: 4, borderLeftColor: 'primary.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <BusinessIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Organization Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {/* Organization Dropdown */}
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        options={organizations}
                        getOptionLabel={(option) => option.organization || option.alias || ''}
                        value={selectedOrganization}
                        onChange={handleOrganizationSelect}
                        onInputChange={(event, newValue) => {
                          setOrgSearchTerm(newValue);
                        }}
                        loading={loading}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Organization *"
                            placeholder="Search organizations..."
                            variant="outlined"
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {option.organization || option.alias}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              IE Code: {option.registrationDetails?.ieCode} | Type: {option.generalInfo?.entityType}
                            </Typography>
                          </Box>
                        )}
                        noOptionsText="No organizations found"
                        sx={{ mb: 2 }}
                      />
                    </Grid>

                    {/* Display selected organization details */}
                    {selectedOrganization && (
                      <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1 }}>
                            Selected Organization Details:
                          </Typography>
                          <Typography variant="body2">
                            <strong>Name:</strong> {selectedOrganization.organization}
                          </Typography>
                          <Typography variant="body2">
                            <strong>IE Code:</strong> {selectedOrganization.registrationDetails?.ieCode}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Type:</strong> {selectedOrganization.generalInfo?.entityType}
                          </Typography>
                          <Typography variant="body2">
                            <strong>PAN:</strong> {selectedOrganization.registrationDetails?.panNo}
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Basic Job Information */}
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderLeft: 4, borderLeftColor: 'success.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DescriptionIcon color="success" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Job Information
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Job Number"
                        placeholder="Auto-generated if empty"
                        value={formData.job_no}
                        onChange={(e) => handleInputChange('job_no', e.target.value)}
                        variant="outlined"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <DatePicker
                        label="Job Date"
                        value={formData.job_date}
                        onChange={(newValue) => handleInputChange('job_date', newValue)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Year"
                        placeholder="e.g., 24-25"
                        value={formData.year}
                        onChange={(e) => handleInputChange('year', e.target.value)}
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Party Details */}
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderLeft: 4, borderLeftColor: 'info.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <BusinessIcon color="info" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Party Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Exporter Name *"
                        value={formData.exporter_name}
                        onChange={(e) => handleInputChange('exporter_name', e.target.value)}
                        variant="outlined"
                        required
                        error={!formData.exporter_name}
                        helperText={!formData.exporter_name ? 'Required field' : ''}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Consignee Name *"
                        value={formData.consignee_name}
                        onChange={(e) => handleInputChange('consignee_name', e.target.value)}
                        variant="outlined"
                        required
                        error={!formData.consignee_name}
                        helperText={!formData.consignee_name ? 'Required field' : ''}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="IE Code *"
                        value={formData.ie_code}
                        onChange={(e) => handleInputChange('ie_code', e.target.value)}
                        variant="outlined"
                        required
                        error={!formData.ie_code || (formData.ie_code && !/^\d{10}$/.test(formData.ie_code))}
                        helperText={
                          !formData.ie_code 
                            ? 'Required field' 
                            : (formData.ie_code && !/^\d{10}$/.test(formData.ie_code)) 
                              ? 'Must be 10 digits' 
                              : ''
                        }
                        inputProps={{ maxLength: 10 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Shipment Details */}
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderLeft: 4, borderLeftColor: 'warning.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ShippingIcon color="warning" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Shipment Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Movement Type</InputLabel>
                        <Select
                          value={formData.movement_type}
                          onChange={(e) => handleInputChange('movement_type', e.target.value)}
                          label="Movement Type"
                        >
                          {movementTypes.map((type) => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Country of Final Destination"
                        value={formData.country_of_final_destination}
                        onChange={(e) => handleInputChange('country_of_final_destination', e.target.value)}
                        variant="outlined"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Port of Loading"
                        value={formData.port_of_loading}
                        onChange={(e) => handleInputChange('port_of_loading', e.target.value)}
                        variant="outlined"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Port of Discharge"
                        value={formData.port_of_discharge}
                        onChange={(e) => handleInputChange('port_of_discharge', e.target.value)}
                        variant="outlined"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Commodity Description"
                        value={formData.commodity_description}
                        onChange={(e) => handleInputChange('commodity_description', e.target.value)}
                        variant="outlined"
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Commercial & Weight Details */}
            <Grid item xs={12}>
              <Card elevation={2} sx={{ borderLeft: 4, borderLeftColor: 'secondary.main' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <BankIcon color="secondary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Commercial & Weight Details
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Commercial Invoice Value"
                        value={formData.commercial_invoice_value}
                        onChange={(e) => handleInputChange('commercial_invoice_value', e.target.value)}
                        variant="outlined"
                        type="number"
                        inputProps={{ step: "0.01" }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Invoice Currency</InputLabel>
                        <Select
                          value={formData.invoice_currency}
                          onChange={(e) => handleInputChange('invoice_currency', e.target.value)}
                          label="Invoice Currency"
                        >
                          {currencies.map((currency) => (
                            <MenuItem key={currency} value={currency}>{currency}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Total Packages"
                        value={formData.total_packages}
                        onChange={(e) => handleInputChange('total_packages', e.target.value)}
                        variant="outlined"
                        type="number"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Gross Weight (KG)"
                        value={formData.gross_weight_kg}
                        onChange={(e) => handleInputChange('gross_weight_kg', e.target.value)}
                        variant="outlined"
                        type="number"
                        inputProps={{ step: "0.001" }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="Net Weight (KG)"
                        value={formData.net_weight_kg}
                        onChange={(e) => handleInputChange('net_weight_kg', e.target.value)}
                        variant="outlined"
                        type="number"
                        inputProps={{ step: "0.001" }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Status */}
            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardContent>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label="Status"
                    >
                      {statusOptions.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  startIcon={<ClearIcon />}
                  sx={{ minWidth: 120 }}
                >
                  Clear
                </Button>
                
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={submitLoading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                  disabled={submitLoading}
                  sx={{ minWidth: 150 }}
                >
                  {submitLoading ? 'Creating...' : 'Create Job'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>
    </LocalizationProvider>
  );
};

export default AddExJobs;

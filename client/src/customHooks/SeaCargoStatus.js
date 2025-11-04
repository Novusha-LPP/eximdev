import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Paper,
  Chip,
  LinearProgress,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Info as InfoIcon,
  DirectionsBoat as DirectionsBoatIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Anchor as AnchorIcon
} from '@mui/icons-material';
import axios from 'axios';


const SeaCargoStatus = ({ isOpen, onClose, location, masterBlNo, jobId, onUpdateSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));


  const [cargoDetails, setCargoDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ type: '', message: '' });
  const [activeTab, setActiveTab] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });


  const tabLabels = [
    { label: 'Shipment Summary', icon: <InfoIcon fontSize="small" /> },
    { label: 'Cargo Information', icon: <InventoryIcon fontSize="small" /> },
    { label: 'Vessel Details', icon: <DirectionsBoatIcon fontSize="small" /> },
    { label: 'Container Details', icon: <LocalShippingIcon fontSize="small" /> }
  ];


  useEffect(() => {
    if (isOpen && location && masterBlNo) {
      fetchCargoDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location, masterBlNo]);


  // Show snackbar message
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };


  // Close snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };


  const fetchCargoDetails = async () => {
    setLoading(true);
    setError({ type: '', message: '' });
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/sea-cargo-tracking`,
        { location, masterBlNo },
        { timeout: 35000, headers: { 'Content-Type': 'application/json' } }
      );
      if (res.data?.success) {
        setCargoDetails(res.data.data || null);
      } else {
        setError({ 
          type: 'api', 
          message: res.data?.error || 'Failed to fetch sea cargo details' 
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // 404 - Record not found
        setError({ 
          type: 'notfound', 
          message: 'No records found for the provided Master BL number.' 
        });
      } else if (err.code === 'ERR_NETWORK') {
        setError({ 
          type: 'network', 
          message: 'Cannot connect to backend server. Please check your connection.' 
        });
      } else if (err.code === 'ECONNABORTED') {
        setError({ 
          type: 'timeout', 
          message: 'Request timeout. The service is taking too long to respond.' 
        });
      } else if (err.response) {
        setError({ 
          type: 'server', 
          message: `Server error: ${err.response.status} - ${err.response.data?.error || 'Unknown error'}` 
        });
      } else {
        setError({ 
          type: 'unknown', 
          message: `Error: ${err.message}` 
        });
      }
    } finally {
      setLoading(false);
    }
  };


  // Format date to match database format: "2025-10-22T12:07"
  const formatDateForDatabase = (dateString) => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);
      
      // Check if date is invalid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date detected:', dateString);
        return null;
      }
      
      // If already in correct format, return as-is
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
        return dateString;
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (err) {
      console.error('Date formatting error:', err);
      return null;
    }
  };


  // Handle Update to Database
  const handleUpdateDatabase = async () => {
    if (!jobId || !cargoDetails) {
      showSnackbar('Missing job ID or cargo details', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const summary = cargoDetails.summary?.[0] || {};

      // Helper function to check if value is valid (not N/A, null, undefined, or empty)
      const isValidValue = (value) => {
        return value !== null && 
               value !== undefined && 
               value !== '' && 
               value !== 'N.A.' && 
               value !== 'N/A';
      };

      // Start with empty updateData - only add valid fields
      const updateData = {};

      // Only add line_no if valid
      if (isValidValue(summary.lineNo)) {
        updateData.line_no = summary.lineNo;
      }

      // Only add no_of_pkgs if valid
      if (summary.totalPackage && summary.packageCode) {
        updateData.no_of_pkgs = `${summary.totalPackage} ${summary.packageCode}`;
      } else if (isValidValue(summary.totalPackage)) {
        updateData.no_of_pkgs = summary.totalPackage;
      }

      // Only add gateway_igm if valid
      if (isValidValue(summary.igmNo)) {
        updateData.gateway_igm = summary.igmNo;
      }

      // Only add gateway_igm_date if the formatted date is valid
      const formattedIgmDate = formatDateForDatabase(summary.igmDate);
      if (isValidValue(formattedIgmDate)) {
        updateData.gateway_igm_date = formattedIgmDate;
      }

      // Check if we have any valid data to update
      if (Object.keys(updateData).length === 0) {
        showSnackbar('No valid data available to update', 'warning');
        setIsUpdating(false);
        return;
      }

      console.log('Final updateData being sent:', updateData);

      const headers = {
        'Content-Type': 'application/json'
      };

      const response = await axios.patch(
        `${process.env.REACT_APP_API_STRING}/jobs/${jobId}`,
        updateData,
        { headers, timeout: 30000 }
      );

      if (response.data?.success) {
        const successMsg = 'Job updated successfully with sea cargo data';
        
        showSnackbar(successMsg, 'success');
        
        if (onUpdateSuccess) {
          onUpdateSuccess(response.data);
        }

        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        showSnackbar(response.data?.message || 'Failed to update job', 'error');
      }
    } catch (err) {
      console.error('Update error:', err);
      
      let errorMessage = 'Failed to update job';
      
      if (err.response) {
        errorMessage = err.response.data?.message || `Error: ${err.response.status}`;
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      } else {
        errorMessage = err.message || 'Network error';
      }

      showSnackbar(errorMessage, 'error');
    } finally {
      setIsUpdating(false);
    }
  };


  const renderValue = (v) =>
   v === NaN || v === undefined || v === null || v === '' || v === 'N.A.' ? 'N/A' : String(v);


  const handleTabChange = (_e, val) => setActiveTab(val);


  const KeyValuePanel = ({ title, fields }) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      {title && (
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
          {title}
        </Typography>
      )}
      {fields.map((field, idx) => (
        <Box
          key={idx}
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.5,
            py: 1,
            borderTop: idx === 0 ? '1px solid transparent' : '1px solid',
            borderColor: idx === 0 ? 'transparent' : 'divider'
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              minWidth: { xs: 'auto', sm: 200 },
              pr: { xs: 0, sm: 2 },
              textAlign: { xs: 'left', sm: 'right' },
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              whiteSpace: 'nowrap'
            }}
          >
            {field.icon}
            {field.label}:
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: 'text.primary', wordBreak: 'break-word' }}
            >
              {renderValue(field.value)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );


  const renderTabContent = () => {
    if (!cargoDetails) return <Typography variant="body2">No data available.</Typography>;

    const summary = cargoDetails.summary?.[0] || {};
    const vesselDetails = cargoDetails.vessel_details?.[0] || {};
    const containerDetails = cargoDetails.container_details || [];

    if (activeTab === 0) {
      const fields = [
        { 
          label: 'Master BL Number', 
          value: summary.blNo, 
          icon: <DescriptionIcon fontSize="small" sx={{ fontSize: '0.9rem' }} /> 
        },
        { label: 'BL Date', value: summary.blDate },
        { label: 'House BL Number', value: summary.houseBlNo },
        { label: 'House BL Date', value: summary.houseBlDate },
        { label: 'IGM Number', value: summary.igmNo },
        { label: 'IGM Date', value: summary.igmDate },
        { label: 'Line Number', value: summary.lineNo },
        { label: 'Sub Line Number', value: summary.subLineNo },
        { label: 'Cargo Movement', value: summary.cargoMovement },
        { label: 'Port of Destination', value: summary.portDest }
      ];
      return <KeyValuePanel title="Sea Cargo Shipment Summary" fields={fields} />;
    }

    if (activeTab === 1) {
      const fields = [
        { 
          label: 'Description of Goods', 
          value: summary.descOfGoods,
          icon: <InventoryIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
        },
        { label: 'Total Packages', value: summary.totalPackage },
        { label: 'Package Code', value: summary.packageCode },
        { 
          label: 'Gross Weight', 
          value: summary.grossWeight ? `${summary.grossWeight} ${summary.unitOfWeight || 'KGS'}` : summary.grossWeight 
        },
        { label: 'Unit of Weight', value: summary.unitOfWeight }
      ];
      return <KeyValuePanel title="Cargo Details" fields={fields} />;
    }

    if (activeTab === 2) {
      const fields = [
        { 
          label: 'Vessel Code', 
          value: vesselDetails.vesselCode,
          icon: <DirectionsBoatIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
        },
        { label: 'IMO Number', value: vesselDetails.imoNo },
        { label: 'Voyage Number', value: vesselDetails.voyageNo },
        { label: 'Gateway Port', value: vesselDetails.gatewayPort },
        { label: 'Inward Date', value: vesselDetails.inwardDate },
        { label: 'File Name', value: vesselDetails.fileName },
        { label: 'IGM Number', value: vesselDetails.igmNo },
        { label: 'IGM Date', value: vesselDetails.igmDate }
      ];
      return <KeyValuePanel title="Vessel Information" fields={fields} />;
    }

    if (activeTab === 3) {
      if (containerDetails.length === 0) {
        return (
          <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              No Container Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Container information is not currently available for this shipment.
            </Typography>
          </Paper>
        );
      }

      return (
        <Paper elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Container Information
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {containerDetails.length} container{containerDetails.length !== 1 ? 's' : ''} found
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Container Number</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Line No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sub Line No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IGM Number</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {containerDetails.map((container, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Chip 
                        label={renderValue(container.contDetails)} 
                        size="small" 
                        variant="outlined" 
                        sx={{ fontWeight: 600 }} 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={renderValue(container.contStatus)} 
                        size="small" 
                        color={container.contStatus === 'FCL' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{renderValue(container.lineNo)}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{renderValue(container.subLineNo)}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{renderValue(container.igmNo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      );
    }

    return null;
  };


  if (!isOpen) return null;


  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            height: isMobile ? '100vh' : '88vh',
            borderRadius: isMobile ? 0 : 1.5,
            overflow: 'hidden'
          }
        }}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      >
        {/* Header */}
        <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Sea Cargo Tracking
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<AnchorIcon fontSize="small" />}
                    label={`Master BL: ${renderValue(masterBlNo)}`}
                    size="small" 
                    variant="outlined" 
                    sx={{ fontWeight: 600 }} 
                  />
                  {cargoDetails?.summary?.[0] && (
                    <>
                      <Chip
                        icon={<LocationOnIcon fontSize="small" />}
                        label={renderValue(location?.toUpperCase())}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<InfoIcon fontSize="small" />}
                        label={renderValue(cargoDetails.summary[0].cargoMovement)}
                        size="small"
                        variant="outlined"
                      />
                    </>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton onClick={() => window.print()} title="Print">
                  <PrintIcon />
                </IconButton>
                <IconButton onClick={onClose} title="Close">
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Box>


        {/* Tabs */}
        <Paper elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', borderRadius: 0 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': { minHeight: 48, textTransform: 'none' }
            }}
          >
            {tabLabels.map((tab, index) => (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {tab.icon}
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {tab.label}
                    </Typography>
                  </Box>
                }
                sx={{ minWidth: 120, maxWidth: 220 }}
              />
            ))}
          </Tabs>
        </Paper>


        {/* Content */}
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 320,
              p: 3
            }}
          >
            <CircularProgress size={48} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
              Loading Sea Cargo Details
            </Typography>
            <LinearProgress sx={{ width: 200, height: 4, borderRadius: 2, mt: 1.5 }} />
          </Box>
        ) : error.message ? (
          <Box sx={{ p: 3 }}>
            {error.type === 'notfound' ? (
              // 404 - No Record Found (user-friendly)
              <Paper elevation={0} sx={{ 
                p: 3, 
                borderRadius: 1, 
                border: '1px solid', 
                borderColor: 'info.light',
                bgcolor: 'info.50' 
              }}>
                <Typography variant="subtitle1" sx={{ color: 'info.main', fontWeight: 700, mb: 1 }}>
                  No Record Found
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {error.message}
                </Typography>
                <Button variant="outlined" color="info" onClick={onClose}>
                  Close
                </Button>
              </Paper>
            ) : (
              // All other errors (network, server, timeout, etc.)
              <Paper elevation={0} sx={{ 
                p: 3, 
                borderRadius: 1, 
                border: '1px solid', 
                borderColor: 'error.light' 
              }}>
                <Typography variant="subtitle1" sx={{ color: 'error.main', fontWeight: 700, mb: 1 }}>
                  {error.type === 'network' ? 'Connection Error' : 
                   error.type === 'timeout' ? 'Request Timeout' : 
                   error.type === 'server' ? 'Server Error' : 
                   'Request Failed'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'error.dark', mb: 2 }}>
                  {error.message}
                </Typography>
                <Button variant="contained" color="error" onClick={fetchCargoDetails}>
                  Retry
                </Button>
              </Paper>
            )}
          </Box>
        ) : (
          <DialogContent
            sx={{
              p: { xs: 2, sm: 3 },
              overflow: 'auto',
              bgcolor: 'background.default'
            }}
          >
            <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
              {renderTabContent()}
              
              {/* Update Button */}
              {cargoDetails && jobId && (
                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    onClick={onClose}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleUpdateDatabase}
                    disabled={isUpdating}
                    sx={{ position: 'relative' }}
                  >
                    {isUpdating ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Updating...
                      </>
                    ) : (
                      'Update Job'
                    )}
                  </Button>
                </Box>
              )}
            </Box>
          </DialogContent>
        )}


        {/* Print cleanup */}
        <style jsx>{`
          @media print {
            .MuiDialog-paper {
              box-shadow: none !important;
              border: none !important;
              max-height: none !important;
              height: auto !important;
            }
          }
        `}</style>
      </Dialog>


      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};


export default SeaCargoStatus;

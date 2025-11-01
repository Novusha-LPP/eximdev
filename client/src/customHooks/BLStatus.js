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
  FlightTakeoff as FlightTakeoffIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import axios from 'axios';

const BLStatus = ({ isOpen, onClose, mawbNumber, jobId, onUpdateSuccess, customHouse, container_nos }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [cargoDetails, setCargoDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const tabLabels = [
    { label: 'Shipment Details', icon: <InfoIcon fontSize="small" /> },
    { label: 'Cargo Information', icon: <InventoryIcon fontSize="small" /> },
    { label: 'Movement Details', icon: <FlightTakeoffIcon fontSize="small" /> },
    { label: 'Container Details', icon: <LocalShippingIcon fontSize="small" /> }
  ];

  useEffect(() => {
    if (isOpen && mawbNumber) {
      fetchCargoDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mawbNumber]);

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
    setError('');
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/bl-tracking`,
        { mawbNumber },
        { timeout: 35000, headers: { 'Content-Type': 'application/json' } }
      );
      if (res.data?.success) {
        setCargoDetails(res.data.data || null);
      } else {
        setError(res.data?.error || 'Failed to fetch BL Status details');
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to backend server. Ensure the proxy server is running.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. The upstream service may be slow.');
      } else if (err.response) {
        setError(`Server error: ${err.response.status} - ${err.response.data?.error || 'Unknown error'}`);
      } else {
        setError(`Network error: ${err.message}`);
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

  // Check if custom house is ICD KODIYAR
  const isIcdKodiyar = customHouse && 
                       customHouse.toUpperCase().includes('ICD KHODIYAR');

  // Handle Update to Database
// Handle Update to Database
// Handle Update to Database
const handleUpdateDatabase = async () => {
  if (!jobId || !cargoDetails) {
    showSnackbar('Missing job ID or cargo details', 'error');
    return;
  }

  setIsUpdating(true);
  try {
    const statusData = cargoDetails.status_data?.[0] || {};
    const containerDetails = cargoDetails.container_details || [];

    // Base update data (always included)
    const updateData = {
      line_no: statusData.lineNo || null,
      no_of_pkgs: statusData.totalPackage && statusData.packageCode 
        ? `${statusData.totalPackage} ${statusData.packageCode}` 
        : statusData.totalPackage || null,
      igm_no: statusData.igmRTN || null,
      igm_date: formatDateForDatabase(statusData.igmDT) || null,
      discharge_date: formatDateForDatabase(statusData.inwDT) || null
    };

    // Only add container arrival_date updates if custom house is ICD KODIYAR
    if (isIcdKodiyar && container_nos && container_nos.length > 0) {
      // Create a map of container numbers from ICEGATE response with arrival dates
      const containerArrivalMap = {};
      
      containerDetails.forEach(container => {
        if (container.contNo && container.arrDT) {
          const formattedDate = formatDateForDatabase(container.arrDT);
          containerArrivalMap[container.contNo] = formattedDate;
          
          console.log(`Mapping container: ${container.contNo} -> Arrival: ${formattedDate}`);
        }
      });

      console.log('Container Arrival Map:', containerArrivalMap);
      console.log('Existing containers from job:', container_nos);

      // Update arrival_date for matching containers
      const updatedContainers = container_nos.map(containerObj => {
        const containerNum = containerObj.container_number;
        const arrivalDate = containerArrivalMap[containerNum];
        
        console.log(`Processing container: ${containerNum}, Has Arrival Date: ${!!arrivalDate}, Date: ${arrivalDate}`);

        return {
          ...containerObj,
          arrival_date: arrivalDate || containerObj.arrival_date || null
        };
      });

      console.log('Updated Containers:', JSON.stringify(updatedContainers, null, 2));

      updateData.container_nos = updatedContainers;
      
      showSnackbar(
        `Updating job with container arrival dates for ICD KODIYAR`,
        'info'
      );
    } else if (!isIcdKodiyar) {
      showSnackbar(
        `Note: Container arrival dates will NOT be updated (Custom House: ${customHouse})`,
        'warning'
      );
    }

    console.log('Final Update Payload:', JSON.stringify(updateData, null, 2));

    const headers = {
      'Content-Type': 'application/json'
    };

    const response = await axios.patch(
      `${process.env.REACT_APP_API_STRING}/jobs/${jobId}`,
      updateData,
      { headers, timeout: 30000 }
    );

    if (response.data?.success) {
      const successMsg = isIcdKodiyar 
        ? 'Job updated successfully with container arrival dates'
        : 'Job updated successfully';
      
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
    v === undefined || v === null || v === '' || v === 'N.A.' ? 'N.A.' : String(v);

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

    const statusData = cargoDetails.status_data?.[0] || {};
    const containerDetails = cargoDetails.container_details || [];

    if (activeTab === 0) {
      const fields = [
        { 
          label: 'MAWB Number', 
          value: statusData.mawbNo, 
          icon: <DescriptionIcon fontSize="small" sx={{ fontSize: '0.9rem' }} /> 
        },
        { label: 'MAWB Date', value: statusData.mawbDT },
        { label: 'HAWB Number', value: statusData.hawbNo },
        { label: 'HAWB Date', value: statusData.hawbDT },
        { label: 'IGM Number', value: statusData.igmRTN },
        { label: 'IGM Date', value: statusData.igmDT },
        { label: 'Line Number', value: statusData.lineNo },
        { label: 'Sub Line Number', value: statusData.subLineNo },
        { label: 'SMTP Number', value: statusData.smtpNo },
        { label: 'SMTP Date', value: statusData.smtpDT },
        { label: 'INW Date', value: statusData.inwDT }
      ];
      return <KeyValuePanel title="BL Status Shipment Information" fields={fields} />;
    }

    if (activeTab === 1) {
      const fields = [
        { 
          label: 'Importer Name', 
          value: statusData.impNm,
          icon: <BusinessIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
        },
        { label: 'Description of Goods', value: statusData.descOfGoods },
        { label: 'Total Packages', value: statusData.totalPackage },
        { label: 'Package Code', value: statusData.packageCode },
        { label: 'Gross Weight', value: statusData.grossWeight ? `${statusData.grossWeight} ${statusData.uqc || 'KGS'}` : statusData.grossWeight },
        { label: 'UQC', value: statusData.uqc },
        { label: 'BE Location', value: statusData.beLoc }
      ];
      return <KeyValuePanel title="Cargo Details" fields={fields} />;
    }

    if (activeTab === 2) {
      const fields = [
        { 
          label: 'Cargo Movement', 
          value: statusData.cargoMovement,
          icon: <FlightTakeoffIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
        },
        { label: 'Port of Destination', value: statusData.portDest },
        { label: 'Port REP', value: statusData.portREP },
        { label: 'Customer Site', value: statusData.customer_Site },
        { label: 'File Name', value: statusData.fileName },
        { label: 'Vessel Code', value: statusData.vesselCode },
        { label: 'Voyage Number', value: statusData.voyageNo }
      ];
      return <KeyValuePanel title="Movement Information" fields={fields} />;
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
                  <TableCell sx={{ fontWeight: 700 }}>IGM RTN</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Arrival Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Arrival Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Error Code</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {containerDetails.map((container, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Chip 
                        label={renderValue(container.contNo)} 
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
                    <TableCell sx={{ fontWeight: 500 }}>{renderValue(container.igmRTN)}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{renderValue(container.arrDT)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {renderValue(container.arrStatus)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={renderValue(container.errCode)} 
                        size="small" 
                        color={container.errCode === '00' ? 'success' : 'warning'}
                      />
                    </TableCell>
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
                  BL Status Tracking
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    icon={<FlightTakeoffIcon fontSize="small" />}
                    label={`MAWB: ${renderValue(mawbNumber)}`}
                    size="small" 
                    variant="outlined" 
                    sx={{ fontWeight: 600 }} 
                  />
                  {cargoDetails?.status_data?.[0] && (
                    <>
                      <Chip
                        icon={<LocationOnIcon fontSize="small" />}
                        label={renderValue(cargoDetails.status_data[0].portDest)}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<InfoIcon fontSize="small" />}
                        label={renderValue(cargoDetails.status_data[0].cargoMovement)}
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
              Loading BL Status Details
            </Typography>
            <LinearProgress sx={{ width: 200, height: 4, borderRadius: 2, mt: 1.5 }} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 1, border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="subtitle1" sx={{ color: 'error.main', fontWeight: 700, mb: 1 }}>
                Request Failed
              </Typography>
              <Typography variant="body2" sx={{ color: 'error.dark', mb: 2 }}>
                {error}
              </Typography>
              <Button variant="contained" color="error" onClick={fetchCargoDetails}>
                Retry
              </Button>
            </Paper>
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

export default BLStatus;

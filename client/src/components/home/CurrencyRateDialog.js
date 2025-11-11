import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Fade,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';

const CurrencyRateDialog = ({ open, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currencyData, setCurrencyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDateChange = async (date) => {
    if (!date || isNaN(date.getTime())) return;

    setSelectedDate(date);
    setError('');
    setLoading(true);

    try {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/currency-rates/by-date/${formattedDate}`
      );

      if (response.data.success) {
        setCurrencyData(response.data.data);
      } else {
        setError(response.data.message || 'No data found');
        setCurrencyData(null);
      }
    } catch (err) {
      console.error('Error fetching currency rates:', err);
      setError(err.response?.data?.message || 'Failed to fetch currency rates');
      setCurrencyData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [day, month, year] = dateString.split('-');
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '92vh'
        }
      }}
    >
      {/* Compact Header */}
      <Box
        sx={{
          background: 'linear-gradient(90deg, #1a237e 0%, #283593 100%)',
          color: 'white',
          px: 3,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Currency Exchange Rates
          </Typography>
          <Chip 
            label="ICEGATE" 
            size="small"
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22
            }} 
          />
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white', p: 0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: '#fafafa' }}>
        {/* Compact Date Picker + Info */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 2.5,
          alignItems: 'center',
          bgcolor: 'white',
          p: 2,
          borderRadius: 1,
          border: '1px solid #e0e0e0'
        }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={handleDateChange}
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { width: 200 }
                }
              }}
            />
          </LocalizationProvider>
          
          {currencyData && (
            <Stack direction="row" spacing={2} sx={{ ml: 'auto' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  NOTIFICATION
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a237e' }}>
                  {currencyData.notification_number}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  EFFECTIVE DATE
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a237e' }}>
                  {formatDate(currencyData.effective_date)}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  CURRENCIES
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a237e' }}>
                  {currencyData.exchange_rates?.length || 0}
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Compact Professional Table */}
        {currencyData && !loading && (
          <Fade in={true}>
            <TableContainer 
              component={Paper} 
              sx={{ 
                boxShadow: 'none',
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                maxHeight: 'calc(92vh - 200px)'
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        bgcolor: '#1a237e',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        py: 1.2,
                        letterSpacing: 0.5
                      }}
                    >
                      CODE
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        bgcolor: '#1a237e',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        py: 1.2,
                        letterSpacing: 0.5
                      }}
                    >
                      CURRENCY NAME
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ 
                        bgcolor: '#1a237e',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        py: 1.2,
                        letterSpacing: 0.5,
                        width: 80
                      }}
                    >
                      UNIT
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        bgcolor: '#1a237e',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        py: 1.2,
                        letterSpacing: 0.5,
                        width: 150
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 14 }} />
                        IMPORT
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        bgcolor: '#1a237e',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        py: 1.2,
                        letterSpacing: 0.5,
                        width: 150
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <TrendingDownIcon sx={{ fontSize: 14 }} />
                        EXPORT
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currencyData.exchange_rates?.map((rate, index) => (
                    <TableRow
                      key={rate._id || index}
                      sx={{
                        '&:nth-of-type(even)': { bgcolor: '#f5f5f5' },
                        '&:hover': { bgcolor: '#e3f2fd' },
                        height: 44
                      }}
                    >
                      <TableCell sx={{ py: 1 }}>
                        <Chip
                          label={rate.currency_code}
                          size="small"
                          sx={{
                            bgcolor: '#1a237e',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 24,
                            letterSpacing: 0.5
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem', py: 1 }}>
                        {rate.currency_name}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.85rem', py: 1 }}>
                        {rate.unit}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Chip
                          label={`₹ ${rate.import_rate.toFixed(2)}`}
                          size="small"
                          sx={{
                            bgcolor: '#2e7d32',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            height: 26,
                            minWidth: 90
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1 }}>
                        <Chip
                          label={`₹ ${rate.export_rate.toFixed(2)}`}
                          size="small"
                          sx={{
                            bgcolor: '#d32f2f',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            height: 26,
                            minWidth: 90
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Fade>
        )}

        {/* Empty State - Compact */}
        {!currencyData && !loading && !error && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <CalendarIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.3 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Select a date to view exchange rates
            </Typography>
          </Box>
        )}

        {/* Footer Metadata - Compact */}
        {currencyData?.meta && (
          <Box sx={{ 
            mt: 2, 
            p: 1.5, 
            bgcolor: 'white',
            borderRadius: 1,
            border: '1px solid #e0e0e0',
            display: 'flex',
            gap: 3,
            fontSize: '0.75rem'
          }}>
            <Typography variant="caption" color="text.secondary">
              PDF: <strong>{currencyData.pdf_filename}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Scraped: <strong>{new Date(currencyData.scraped_at).toLocaleString('en-IN', { 
                dateStyle: 'short', 
                timeStyle: 'short' 
              })}</strong>
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Compact Footer */}
      <Box sx={{ 
        px: 3, 
        py: 1.5, 
        bgcolor: '#fafafa',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          size="small"
          sx={{
            bgcolor: '#1a237e',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              bgcolor: '#0d1642'
            }
          }}
        >
          Close
        </Button>
      </Box>
    </Dialog>
  );
};

export default CurrencyRateDialog;
 
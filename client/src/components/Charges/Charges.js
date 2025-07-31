import React, { useEffect, useState, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  CircularProgress, 
  Grid, 
  Card,
  CardContent,
  Chip,
  Stack,
  Alert,
  Link
} from '@mui/material';
import {
  Description as DocumentIcon,
  AttachFile as FileIcon,
  DateRange as DateIcon,
  Payment as PaymentIcon,
  Security as SecurityIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

// Enhanced section wrapper with better styling
const Section = ({ title, children, icon }) => (
  <Card sx={{ 
    mb: 3, 
    borderRadius: 3, 
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #e3f2fd'
  }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1565c0' }}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 3, borderColor: '#e3f2fd' }} />
      {children}
    </CardContent>
  </Card>
);

// Compact table-style document display
const DocumentTable = ({ docs, fields }) => {
  if (!docs || docs.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <Typography>No documents available for this section.</Typography>
      </Alert>
    );
  }

  const formatValue = (value, key) => {
    if (!value && value !== false) return 'N/A';

    // Format booleans
    if (typeof value === 'boolean') {
      return (
        <Chip 
          label={value ? 'Yes' : 'No'} 
          size="small" 
          color={value ? 'success' : 'default'}
          variant="outlined"
        />
      );
    }

    // Format URLs
    if (key === 'url' && value) {
      return (
        <Link 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ 
            color: '#1976d2', 
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          View Document
        </Link>
      );
    }

    // Format arrays
    if (Array.isArray(value)) {
      // If array of URLs, show as links
      if (key === 'url' || key === 'payment_recipt') {
        return value.length > 0 ? value.map((url, i) => (
          <span key={i}>
            <Link 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              sx={{ color: '#1976d2', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              View {key === 'payment_recipt' ? `Receipt ${i+1}` : `File ${i+1}`}
            </Link>{i < value.length - 1 ? ', ' : ''}
          </span>
        )) : 'N/A';
      }
      return value.join(', ');
    }

    // Format ISO date strings
    if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(value)) {
      const date = parseISO(value);
      if (isValid(date)) {
        return format(date, 'dd-MMM-yyyy, hh:mm a');
      }
    }

    // Also format date fields (ending with _date or containing date)
    if (typeof value === 'string' && (key.endsWith('date') || key.includes('date'))) {
      const date = new Date(value);
      if (isValid(date)) {
        return format(date, 'dd-MMM-yyyy, hh:mm a');
      }
    }

    return String(value);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {docs.map((doc, docIndex) => (
        <Paper key={docIndex} sx={{ 
          mb: 3, 
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          borderRadius: 2
        }}>
          {/* Document Header */}
          {doc.document_name && (
            <Box sx={{ 
              p: 2, 
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#1e293b',
                fontSize: '1rem'
              }}>
                {doc.document_name}
              </Typography>
            </Box>
          )}
          
          {/* Fields in a compact grid */}
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {fields.map(field => {
                if (field.key === 'document_name') return null;
                if (doc[field.key] === undefined || doc[field.key] === null) return null;
                
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={field.key}>
                    <Box sx={{ 
                      p: 1.5,
                      backgroundColor: '#f9fafb',
                      borderRadius: 1,
                      border: '1px solid #f1f5f9'
                    }}>
                      <Typography variant="caption" sx={{ 
                        fontWeight: 600, 
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        fontSize: '0.7rem',
                        letterSpacing: '0.5px',
                        display: 'block',
                        mb: 0.5
                      }}>
                        {field.label}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#374151',
                        fontWeight: 500,
                        wordBreak: 'break-word'
                      }}>
                        {formatValue(doc[field.key], field.key)}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

// Use the compact table instead of cards
const DocumentList = DocumentTable;

// Subsection component for DO charges
const SubSection = ({ title, docs, fields }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" sx={{ 
      fontWeight: 600, 
      color: '#1e293b', 
      mb: 2,
      fontSize: '1.1rem',
      borderLeft: '4px solid #3b82f6',
      pl: 2
    }}>
      {title}
    </Typography>
    <DocumentList docs={docs} fields={fields} />
  </Box>
);

const Charges = ({ job_no, year }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Convert props to strings to ensure stable comparison
  const stableJobNo = String(job_no || '');
  const stableYear = String(year || '');

  // Memoize the fetch function to prevent unnecessary recreations
  const fetchCharges = useCallback(async () => {
    if (!stableJobNo || !stableYear) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/charges-section/job-details`, {
        params: { job_no: stableJobNo, year: stableYear }
      });
      
      if (res.data && res.data.success) {
        setData(res.data.data);
      } else {
        setError('No data found for the specified job.');
      }
    } catch (err) {
      setError('Unable to fetch charges details. Please try again.');
      console.error('Error fetching charges:', err);
    } finally {
      setLoading(false);
    }
  }, [stableJobNo, stableYear]);

  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  if (!job_no || !year) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2, m: 2 }}>
        <Typography>Job Number and Year are required to fetch charges details.</Typography>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: 400,
        gap: 2
      }}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Loading charges details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2, m: 2 }}>
        <Typography>{error}</Typography>
      </Alert>
    );
  }

  if (!data) return null;

  // Field definitions (keeping your original structure)
  const esanchitFields = [
    { key: 'document_name', label: 'Document Name' },
    { key: 'url', label: 'Files' },
    { key: 'document_charge_refrence_no', label: 'Charge Reference No' },
    { key: 'document_charge_recipt_copy', label: 'Charge Receipt Copy' },
    { key: 'document_check_date', label: 'Check Date' },
    { key: 'document_amount_details', label: 'Amount Details' },
  ];

  const dsrFields = [
    { key: 'document_name', label: 'Document Name' },
    { key: 'url', label: 'Files' },
    { key: 'document_check_date', label: 'Check Date' },
    { key: 'document_amount_details', label: 'Amount Details' },
  ];

  const doFields = [
    { key: 'document_name', label: 'Document Name' },
    { key: 'url', label: 'Files' },
    { key: 'is_draft', label: 'Is Draft' },
    { key: 'is_final', label: 'Is Final' },
    { key: 'document_check_date', label: 'Check Date' },
    { key: 'document_check_status', label: 'Check Status' },
    { key: 'payment_mode', label: 'Payment Mode' },
    { key: 'wire_transfer_method', label: 'Wire Transfer Method' },
    { key: 'document_amount_details', label: 'Amount Details' },
    { key: 'payment_request_date', label: 'Payment Request Date' },
    { key: 'payment_made_date', label: 'Payment Made Date' },
    { key: 'is_tds', label: 'Is TDS' },
    { key: 'is_payment_made', label: 'Is Payment Made' },
    { key: 'is_payment_requested', label: 'Is Payment Requested' },
    { key: 'is_non_tds', label: 'Is Non-TDS' },
    { key: 'payment_recipt', label: 'Payment Receipt' },
    { key: 'payment_recipt_date', label: 'Payment Receipt Date' },
  ];

  const insuranceFields = [
    { key: 'document_name', label: 'Document Name' },
    { key: 'url', label: 'Files' },
    { key: 'document_check_date', label: 'Check Date' },
    { key: 'document_amount_details', label: 'Amount Details' },
  ];

  const otherDoFields = [
    { key: 'document_name', label: 'Document Name' },
    { key: 'url', label: 'Files' },
    { key: 'document_check_date', label: 'Check Date' },
    { key: 'document_amount_details', label: 'Amount Details' },
  ];

  const securityDepositFields = [
    { key: 'document_name', label: 'Document Name' },
    { key: 'url', label: 'Files' },
    { key: 'document_check_date', label: 'Check Date' },
    { key: 'document_amount_details', label: 'Amount Details' },
    { key: 'utr', label: 'UTR' },
    { key: 'Validity_upto', label: 'Validity Upto' },
  ];

  return (
    <Box sx={{ p: 2, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          color: '#1e293b',
          mb: 1,
          fontSize: '1.8rem'
        }}>
          Charges Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Job No: {job_no} | Year: {year}
        </Typography>
      </Box>

      {/* Sections */}
      <Section 
        title="E-Sanchit Charges" 
        icon={<DocumentIcon sx={{ color: '#3b82f6' }} />}
      >
        <DocumentList docs={data.esanchitCharges} fields={esanchitFields} />
      </Section>

      <Section 
        title="DSR Charges" 
        icon={<ReceiptIcon sx={{ color: '#10b981' }} />}
      >
        <DocumentList docs={data.chargesDetails} fields={dsrFields} />
      </Section>

      <Section 
        title="DO Charges" 
        icon={<PaymentIcon sx={{ color: '#f59e0b' }} />}
      >
        <SubSection 
          title="Shipping Line Invoice" 
          docs={data.do_shipping_line_invoice} 
          fields={doFields} 
        />
        
        <SubSection 
          title="Insurance Copy" 
          docs={data.insurance_copy} 
          fields={insuranceFields} 
        />
        
        <SubSection 
          title="Other DO Documents" 
          docs={data.other_do_documents} 
          fields={otherDoFields} 
        />
        
        <SubSection 
          title="Security Deposit" 
          docs={data.security_deposit} 
          fields={securityDepositFields} 
        />
      </Section>
    </Box>
  );
};

export default Charges;
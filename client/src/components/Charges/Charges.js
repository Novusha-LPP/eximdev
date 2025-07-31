import React, { useEffect, useState, useCallback } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import axios from 'axios';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  CircularProgress, 
  Chip,
  Alert,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Description as DocumentIcon,
  Payment as PaymentIcon,
  Security as SecurityIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

// Enhanced section wrapper with better styling
const Section = ({ title, children, icon }) => (
  <Paper sx={{ 
    mb: 3, 
    borderRadius: 2, 
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e3f2fd',
    overflow: 'hidden'
  }}>
    <Box sx={{ 
      p: 2, 
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #e0e0e0'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1565c0' }}>
          {title}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ p: 0 }}>
      {children}
    </Box>
  </Paper>
);

// Excel-like table component
const DocumentTable = ({ docs, fields }) => {
  if (!docs || docs.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          <Typography>No documents available for this section.</Typography>
        </Alert>
      </Box>
    );
  }

  const formatValue = (value, key) => {
        // If the key is 'url' and value is empty/null, show 'Document not found'
    if ((key === 'url' || key === 'document_charge_recipt_copy' || key === 'payment_recipt') && (!value || (Array.isArray(value) && value.length === 0))) {
      return <span style={{ color: '#b91c1c', fontWeight: 500 }}>Document not found</span>;
    }

    if (!value && value !== false) return 'N/A';
    
    if (typeof value === 'boolean') {
      return (
        <Chip 
          label={value ? 'Yes' : 'No'} 
          size="small" 
          color={value ? 'success' : 'default'}
          variant="outlined"
          sx={{ minWidth: 50 }}
        />
      );
    }
    
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
          View File
        </Link>
      );
    }
    
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

  // Apply business rules to filter fields based on data conditions
  const applyBusinessRules = (fields, docs) => {
    return fields.filter(field => {
      // Check if field has data in any document
      const hasData = docs.some(doc => doc[field.key] !== undefined && doc[field.key] !== null);
      if (!hasData) return false;

      // Business Rule 1: If payment_mode is not "Wire Transfer", don't show wire_transfer_method
      if (field.key === 'wire_transfer_method') {
        return docs.some(doc => 
          doc.payment_mode && 
          doc.payment_mode.toLowerCase().includes('wire transfer')
        );
      }

      // Business Rule 2: Don't show is_payment_made if payment_made_date is available
      if (field.key === 'is_payment_made') {
        return !docs.some(doc => doc.payment_made_date);
      }

      // Business Rule 3: Don't show is_payment_requested if payment_request_date is available
      if (field.key === 'is_payment_requested') {
        return !docs.some(doc => doc.payment_request_date);
      }

      // Business Rule 4: If is_tds is true, don't show is_non_tds
      if (field.key === 'is_non_tds') {
        return !docs.some(doc => doc.is_tds === true);
      }

      // Business Rule 5: If is_non_tds is true, don't show is_tds
      if (field.key === 'is_tds') {
        return !docs.some(doc => doc.is_non_tds === true);
      }

      return true;
    });
  };

  // Filter out fields based on business rules and data availability
  const relevantFields = applyBusinessRules(fields, docs);

  return (
    <TableContainer>
      <Table sx={{ minWidth: 650 }} size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#fafafa' }}>
            {relevantFields.map((field) => (
              <TableCell 
                key={field.key}
                sx={{ 
                  fontWeight: 600,
                  color: '#424242',
                  borderBottom: '2px solid #e0e0e0',
                  whiteSpace: 'nowrap',
                  fontSize: '0.875rem'
                }}
              >
                {field.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {docs.map((doc, index) => (
            <TableRow 
              key={index}
              sx={{ 
                '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                '&:hover': { backgroundColor: '#f0f0f0' },
                '& td': { borderBottom: '1px solid #e0e0e0' }
              }}
            >
              {relevantFields.map((field) => (
                <TableCell 
                  key={field.key}
                  sx={{ 
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: field.key === 'document_name' ? 'normal' : 'nowrap',
                    fontSize: '0.8rem',
                    py: 1.5
                  }}
                >
                  {formatValue(doc[field.key], field.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Use the compact table instead of cards
const DocumentList = DocumentTable;

// Subsection component for DO charges with table format
const SubSection = ({ title, docs, fields }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" sx={{ 
      fontWeight: 600, 
      color: '#1e293b', 
      mb: 2,
      fontSize: '1rem',
      borderLeft: '4px solid #3b82f6',
      pl: 2,
      backgroundColor: '#f8fafc',
      py: 1
    }}>
      {title}
    </Typography>
    <DocumentTable docs={docs} fields={fields} />
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
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'white', borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          color: '#1e293b',
          mb: 1,
          fontSize: '1.8rem'
        }}>
          Charges Details
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Job No: <strong>{job_no}</strong> | Year: <strong>{year}</strong>
        </Typography>
      </Box>

      {/* Sections */}
      <Section 
        title="E-Sanchit Charges" 
        icon={<DocumentIcon sx={{ color: '#3b82f6' }} />}
      >
        <DocumentTable docs={data.esanchitCharges} fields={esanchitFields} />
      </Section>

      <Section 
        title="DSR Charges" 
        icon={<ReceiptIcon sx={{ color: '#10b981' }} />}
      >
        <DocumentTable docs={data.chargesDetails} fields={dsrFields} />
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
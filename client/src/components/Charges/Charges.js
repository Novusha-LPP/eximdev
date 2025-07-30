import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Box, Typography, Paper, Divider, CircularProgress, Grid } from '@mui/material';

// Reusable section wrapper
const Section = ({ title, children }) => (
  <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 1 }}>
    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1a237e' }}>{title}</Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
);

// Helper to render a list of documents
const DocumentList = ({ docs, fields }) => {
  if (!docs || docs.length === 0) return <Typography color="text.secondary">No data available.</Typography>;
  return (
    <Grid container spacing={2}>
      {docs.map((doc, idx) => (
        <Grid item xs={12} md={6} lg={4} key={idx}>
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2, background: '#f8fafc' }}>
            {fields.map(field => (
              doc[field.key] !== undefined && doc[field.key] !== null ? (
                <Box key={field.key} sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{field.label}:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {Array.isArray(doc[field.key]) ? doc[field.key].join(', ') : String(doc[field.key])}
                  </Typography>
                </Box>
              ) : null
            ))}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

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
        setError('No data found.');
      }
    } catch (err) {
      setError('Error fetching charges details.');
    } finally {
      setLoading(false);
    }
  }, [stableJobNo, stableYear]);

  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  if (!job_no || !year) {
    return <Typography color="error">Job No and Year are required.</Typography>;
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!data) return null;

  // Fields for each section
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
    <Box>
      <Section title="Esanchit Charges Details">
        <DocumentList docs={data.esanchitCharges} fields={esanchitFields} />
      </Section>
      <Section title="DSR Charges Details">
        <DocumentList docs={data.chargesDetails} fields={dsrFields} />
      </Section>
      <Section title="DO Charges Details">
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a237e', mb: 1 }}>Shipping Line Invoice</Typography>
        <DocumentList docs={data.do_shipping_line_invoice} fields={doFields} />
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a237e', mb: 1 }}>Insurance Copy</Typography>
        <DocumentList docs={data.insurance_copy} fields={insuranceFields} />
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a237e', mb: 1 }}>Other DO Documents</Typography>
        <DocumentList docs={data.other_do_documents} fields={otherDoFields} />
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a237e', mb: 1 }}>Security Deposit</Typography>
        <DocumentList docs={data.security_deposit} fields={securityDepositFields} />
      </Section>
    </Box>
  );
};

export default Charges;
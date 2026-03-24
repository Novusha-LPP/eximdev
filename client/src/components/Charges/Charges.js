import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Description as DocumentIcon,
  AttachFile as AttachFileIcon,
  Link as LinkIcon
} from '@mui/icons-material';

// Helper to format dates consistently
const formatDate = (dateString) => {
  if (!dateString) return null;
  // Handle ISO strings
  if (typeof dateString === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString)) {
    const date = parseISO(dateString);
    if (isValid(date)) return format(date, 'dd-MMM-yyyy');
  }
  // Handle other date strings
  const date = new Date(dateString);
  if (isValid(date)) return format(date, 'dd-MMM-yyyy');
  return dateString;
};

// Helper to check if a value is meaningful
const hasValue = (val) => val !== null && val !== undefined && val !== '' && (Array.isArray(val) ? val.length > 0 : true);

const Charges = ({ job_no, year, branch_code, trade_type }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Convert props to strings to ensure stable comparison
  const stableJobNo = String(job_no || '');
  const stableYear = String(year || '');
  const stableBranchCode = String(branch_code || '');
  const stableTradeType = String(trade_type || '');

  // Fetch Logic
  const fetchCharges = useCallback(async () => {
    if (!stableJobNo || !stableYear) return;

    setLoading(true);
    setError('');

    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/charges-section/job-details`, {
        params: { 
          job_no: stableJobNo, 
          year: stableYear, 
          branch_code: stableBranchCode, 
          trade_type: stableTradeType 
        }
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

  // Unified Data Processing
  const rows = useMemo(() => {
    if (!data) return [];
    const list = [];
    const push = (item) => list.push(item);

    // 1. DSR Charges
    data.DsrCharges?.forEach((item, idx) => push({
      id: `dsr-${idx}`,
      type: 'DSR',
      name: item.document_name,
      amount: item.document_amount_details,
      date: item.document_check_date,
      dateLabel: 'Check Date',
      docs: [item.url].flat().filter(Boolean)
    }));

    // 2. E-Sanchit - Handled separately now

    // 3. DO - Shipping Line Invoice
    data.do_shipping_line_invoice?.forEach((item, idx) => push({
      id: `do-inv-${idx}`,
      type: 'DO Invoice',
      name: item.document_name,
      amount: item.document_amount_details,
      // Priority: Payment Made > Request > Check
      date: item.payment_made_date || item.payment_request_date || item.document_check_date,
      dateLabel: item.payment_made_date ? 'Paid Date' : (item.payment_request_date ? 'Req. Date' : 'Check Date'),
      paymentMode: item.payment_mode,
      paymentStatus: item.is_payment_made ? 'Paid' : (item.is_payment_requested ? 'Requested' : item.document_check_status),
      docs: [item.url, item.payment_recipt].flat().filter(Boolean)
    }));

    // 4. Insurance
    data.insurance_copy?.forEach((item, idx) => push({
      id: `ins-${idx}`,
      type: 'Insurance',
      name: item.document_name,
      amount: item.document_amount_details,
      date: item.document_check_date,
      dateLabel: 'Check Date',
      docs: [item.url].flat().filter(Boolean)
    }));

    // 5. Other DO
    data.other_do_documents?.forEach((item, idx) => push({
      id: `other-${idx}`,
      type: 'Other DO',
      name: item.document_name,
      amount: item.document_amount_details,
      date: item.document_check_date,
      dateLabel: 'Check Date',
      docs: [item.url].flat().filter(Boolean)
    }));

    // 6. Security Deposit
    data.security_deposit?.forEach((item, idx) => push({
      id: `sec-${idx}`,
      type: 'Security Deposit',
      name: item.document_name,
      amount: item.document_amount_details,
      reference: item.utr,
      // Validity is crucial here
      date: item.Validity_upto || item.document_check_date,
      dateLabel: item.Validity_upto ? 'Valid Upto' : 'Check Date',
      docs: [item.url].flat().filter(Boolean)
    }));

    // 7. Shipping Line Bond
    if (data.shipping_line_bond_charges || data.shipping_line_bond_valid_upto || (data.shipping_line_bond_docs && data.shipping_line_bond_docs.length > 0)) {
      push({
        id: 'bond-1',
        type: 'Shipping Line Bond',
        name: data.shipping_line_airline ? `${data.shipping_line_airline} Bond` : 'Bond Charges',
        amount: data.shipping_line_bond_charges,
        date: data.shipping_line_bond_valid_upto,
        dateLabel: 'Valid Upto',
        docs: [data.shipping_line_bond_docs].flat().filter(Boolean)
      });
    }

    return { generalRows: list, esanchitRows: data.esanchitCharges || [] };
  }, [data]);

  if (!job_no || !year) {
    return <Alert severity="warning" sx={{ m: 2 }}>Job Number and Year are required.</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  if (!data || (rows.generalRows.length === 0 && rows.esanchitRows.length === 0)) {
    return <Alert severity="info" sx={{ m: 2 }}>No charges data available.</Alert>;
  }

  // Styles for Excel-like look
  const headerStyle = {
    fontWeight: 700,
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    padding: '8px 12px',
    fontSize: '0.85rem'
  };

  const cellStyle = {
    border: '1px solid #e2e8f0',
    padding: '8px 12px',
    fontSize: '0.85rem',
    color: '#334155'
  };

  return (
    <Box sx={{ p: 2, backgroundColor: '#fff' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Charges Summary
        </Typography>
        <Chip label={`Job: ${job_no} | ${year}`} color="primary" variant="outlined" />
      </Box>

      {/* E-Sanchit Charges Table */}
      {rows.esanchitRows && rows.esanchitRows.length > 0 && (
        <React.Fragment>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 1, mt: 2 }}>
            NIMS/SIMS/PIMS Charges
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', mb: 3 }}>
            <Table size="small" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerStyle}>Document Name</TableCell>
                  <TableCell sx={headerStyle}>Ref No</TableCell>
                  <TableCell sx={headerStyle}>Amount</TableCell>
                  <TableCell sx={headerStyle}>Registration Details</TableCell>
                  <TableCell sx={{ ...headerStyle, textAlign: 'center' }}>Docs</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.esanchitRows.map((row, index) => {
                  const showRegDetails = row.is_registration_charges;
                  return (
                    <TableRow key={`esanchit-${index}`} hover sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}>
                      <TableCell sx={cellStyle}>{row.document_name || '-'}</TableCell>
                      <TableCell sx={cellStyle}>
                        {row.document_charge_refrence_no ? (
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {row.document_charge_refrence_no}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, fontWeight: 600, color: '#0f172a' }}>
                        {row.document_charge_recipt_copy || '-'}
                      </TableCell>
                      <TableCell sx={cellStyle}>
                        {showRegDetails ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              Rcpt: <span style={{ fontWeight: 500, color: '#0f172a' }}>{row.registration_receipt_no || '-'}</span>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              Amt: <span style={{ fontWeight: 500, color: '#0f172a' }}>{row.registration_amount || '-'}</span>
                            </Typography>
                          </Box>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </TableCell>
                      <TableCell sx={{ ...cellStyle, textAlign: 'center' }}>
                        {row.url && row.url.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {row.url.map((url, i) => (
                              <Tooltip key={i} title="View Document">
                                <IconButton
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="small"
                                  sx={{
                                    color: '#3b82f6',
                                    '&:hover': { backgroundColor: '#eff6ff' },
                                    padding: 0.5
                                  }}
                                >
                                  {i === 0 ? <AttachFileIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            ))}
                          </Box>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </React.Fragment>
      )}

      {/* General Charges Table */}
      {rows.generalRows.length > 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>

                <TableCell sx={headerStyle}>Description / Document</TableCell>
                <TableCell sx={headerStyle}>Ref / UTR</TableCell>
                <TableCell sx={headerStyle}>Payment Details</TableCell>
                <TableCell sx={headerStyle}>Date / Validity</TableCell>
                <TableCell sx={headerStyle}>Amount</TableCell>
                <TableCell sx={{ ...headerStyle, textAlign: 'center' }}>Docs</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.generalRows.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}>


                  {/* Description */}
                  <TableCell sx={cellStyle}>
                    {row.name || '-'}
                  </TableCell>

                  {/* Ref / UTR */}
                  <TableCell sx={cellStyle}>
                    {hasValue(row.reference) ? (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {row.reference}
                      </Typography>
                    ) : '-'}
                  </TableCell>

                  {/* Payment Details */}
                  <TableCell sx={cellStyle}>
                    {row.paymentMode && (
                      <Chip
                        label={row.paymentMode}
                        size="small"
                        color="default"
                        sx={{ borderRadius: 1, height: 20, fontSize: '0.7rem', mr: 1 }}
                      />
                    )}
                    {row.paymentStatus && row.paymentStatus !== row.paymentMode && (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.paymentStatus}</span>
                    )}
                    {!row.paymentMode && !row.paymentStatus && '-'}
                  </TableCell>

                  {/* Date / Validity */}
                  <TableCell sx={cellStyle}>
                    {hasValue(row.date) ? (
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500 }}>{formatDate(row.date)}</span>
                        {row.dateLabel && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{row.dateLabel}</span>
                        )}
                      </Box>
                    ) : '-'}
                  </TableCell>

                  {/* Amount */}
                  <TableCell sx={{ ...cellStyle, fontWeight: 600, color: '#0f172a' }}>
                    {row.amount || '-'}
                  </TableCell>

                  {/* Attachment */}
                  <TableCell sx={{ ...cellStyle, textAlign: 'center' }}>
                    {row.docs && row.docs.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {row.docs.map((url, i) => (
                          <Tooltip key={i} title="View Document">
                            <IconButton
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              sx={{
                                color: '#3b82f6',
                                '&:hover': { backgroundColor: '#eff6ff' },
                                padding: 0.5
                              }}
                            >
                              {i === 0 ? <AttachFileIcon fontSize="small" /> : <LinkIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        ))}
                      </Box>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Charges;
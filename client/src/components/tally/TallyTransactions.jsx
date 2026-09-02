import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Grid, Paper, Select, MenuItem,
  FormControl, InputLabel, Button, Tabs, Tab, CircularProgress, Chip,
  Card, CardContent, IconButton, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import { MaterialReactTable } from 'material-react-table';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import SyncProblemIcon from '@mui/icons-material/SyncProblem';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// ─── Status chip ────────────────────────────────────────────────
const StatusChip = ({ value }) => {
  const isPending = value === '' || value === 'Pending';
  const isSuccess = value === 'Paid' || value === 'Success';
  if (isSuccess) {
    return (
      <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
        label="Imported" color="success" variant="outlined"
        sx={{ fontWeight: 600, minWidth: 100 }} />
    );
  }
  if (isPending) {
    return (
      <Chip size="small" icon={<HourglassEmptyIcon sx={{ fontSize: 14 }} />}
        label="Pending" color="warning" variant="outlined"
        sx={{ fontWeight: 600, minWidth: 100 }} />
    );
  }
  return (
    <Chip size="small" icon={<SyncProblemIcon sx={{ fontSize: 14 }} />}
      label="Not Imported" color="error" variant="outlined"
      sx={{ fontWeight: 600, minWidth: 100 }} />
  );
};

const fmtAmt = (v) => {
  const n = Number(v);
  if (isNaN(n)) return '—';
  return `₹ ${n.toLocaleString('en-IN')}`;
};

const API_KEY_HEADER = { 'x-api-key': 'INTERNAL_TEAM_TALLY_KEY' };

// ─── Main ───────────────────────────────────────────────────────
const TallyTransactions = () => {
  const [tabValue, setTabValue] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [status, setStatus] = useState('All');
  const [loading, setLoading] = useState(false);

  // Stats from backend aggregation (accurate)
  const [stats, setStats] = useState({
    purchaseBookEntries: { total: 0, imported: 0, notImported: 0 },
    paymentRequests: { total: 0, imported: 0, notImported: 0 },
    failedSyncs: { total: 0 }
  });

  // Table data
  const [data, setData] = useState({
    purchaseBookEntries: { totalMatches: 0, data: [] },
    paymentRequests: { totalMatches: 0, data: [] },
    failedSyncs: { totalMatches: 0, data: [] }
  });

  // ── Fetch stats from backend aggregation ───────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/tally/stats?${params.toString()}`,
        { headers: API_KEY_HEADER }
      );
      setStats(res.data);
    } catch (err) {
      console.error('Stats fetch error', err);
    }
  }, [startDate, endDate]);

  // ── Fetch table data ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (status && status !== 'All' && tabValue !== 2) params.append('status', status);
      
      let type = 'purchase';
      if (tabValue === 1) type = 'payment';
      if (tabValue === 2) type = 'failedSync';
      
      params.append('type', type);
      params.append('limit', 2000);

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/tally/transactions?${params.toString()}`,
        { headers: API_KEY_HEADER }
      );
      
      let key = 'purchaseBookEntries';
      if (type === 'payment') key = 'paymentRequests';
      if (type === 'failedSync') key = 'failedSyncs';

      setData((prev) => ({ ...prev, [key]: res.data[key] }));
    } catch (err) {
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [tabValue, startDate, endDate, status]);

  // Fetch both on mount and when filters change
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchData(); }, [fetchData]);

  let currentStats = stats.purchaseBookEntries;
  if (tabValue === 1) currentStats = stats.paymentRequests;
  if (tabValue === 2) currentStats = stats.failedSyncs;

  let currentData = data.purchaseBookEntries;
  if (tabValue === 1) currentData = data.paymentRequests;
  if (tabValue === 2) currentData = data.failedSyncs;
  
  const listData = currentData?.data || [];

  // ── Columns — Purchase ─────────────────────────────────────────
  const purchaseColumns = useMemo(() => [
    { accessorKey: 'entryNo', header: 'Entry No', size: 130, enableSorting: false },
    { accessorKey: 'entryDate', header: 'Entry Date', size: 120 },
    { accessorKey: 'jobNo', header: 'Job No', size: 140, enableSorting: false },
    { accessorKey: 'supplierName', header: 'Supplier', size: 220, enableSorting: false },
    { accessorKey: 'total', header: 'Total Amt', size: 120, Cell: ({ cell }) => fmtAmt(cell.getValue()) },
    { accessorKey: 'status', header: 'Tally Status', size: 140, Cell: ({ cell }) => <StatusChip value={cell.getValue()} /> },
  ], []);

  // ── Columns — Payment ──────────────────────────────────────────
  const paymentColumns = useMemo(() => [
    { accessorKey: 'requestNo', header: 'Request No', size: 130, enableSorting: false },
    { accessorKey: 'requestDate', header: 'Req. Date', size: 120 },
    { accessorKey: 'jobNo', header: 'Job No', size: 140, enableSorting: false },
    { accessorKey: 'paymentTo', header: 'Payment To', size: 220, enableSorting: false },
    { accessorKey: 'amount', header: 'Amount', size: 120, Cell: ({ cell }) => fmtAmt(cell.getValue()) },
    { accessorKey: 'status', header: 'Tally Status', size: 140, Cell: ({ cell }) => <StatusChip value={cell.getValue()} /> },
  ], []);

  // ── Columns — Failed Syncs ─────────────────────────────────────
  const failedSyncColumns = useMemo(() => [
    { 
      accessorKey: 'createdAt', 
      header: 'Failed At', 
      size: 150,
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },
    { 
      accessorKey: 'requestType', 
      header: 'Type', 
      size: 120,
      Cell: ({ cell }) => (
        <Chip size="small" label={cell.getValue().toUpperCase()} 
          color={cell.getValue() === 'purchase' ? 'primary' : 'secondary'} 
          variant="outlined" sx={{ fontWeight: 600 }} />
      )
    },
    { accessorKey: 'jobNo', header: 'Job No', size: 140, enableSorting: false },
    { accessorKey: 'entryOrRequestNo', header: 'Entry / Req No', size: 140, enableSorting: false },
    { 
      accessorKey: 'errorMessage', 
      header: 'Error Message', 
      size: 300, 
      enableSorting: false,
      Cell: ({ cell }) => (
        <Typography variant="body2" color="error.main" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
          {cell.getValue()}
        </Typography>
      )
    },
  ], []);

  // ── Table config ───────────────────────────────────────────────
  const tableConfig = useMemo(() => {
    let columns = purchaseColumns;
    if (tabValue === 1) columns = paymentColumns;
    if (tabValue === 2) columns = failedSyncColumns;

    return {
      columns,
      data: listData,
      enablePagination: true,
      enableBottomToolbar: true,
      enableGlobalFilter: true,
      enableColumnFilters: false,
      enableColumnActions: false,
      enableStickyHeader: true,
      enableDensityToggle: false,
      enableFullScreenToggle: false,
      enableHiding: false,
      initialState: {
        density: 'compact',
        pagination: { pageSize: 100, pageIndex: 0 },
      },
      muiTableContainerProps: {
        sx: {
          maxHeight: 'calc(100vh - 380px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        },
      },
      muiTablePaperProps: { elevation: 0, sx: { borderRadius: 0 } },
      muiTableHeadCellProps: {
        sx: {
          bgcolor: '#f1f5f9', color: '#334155', fontWeight: 700,
          fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px',
          position: 'sticky', top: 0, zIndex: 1,
        },
      },
      muiTableBodyCellProps: { sx: { fontSize: '0.875rem', py: 1 } },
      muiTableBodyRowProps: ({ row }) => {
        if (tabValue === 2) {
          return {
            sx: {
              bgcolor: '#fef2f2',
              '&:hover': { bgcolor: '#fee2e2' },
            }
          };
        }
        
        const s = row.original.status;
        const isSuccess = s === 'Paid' || s === 'Success';
        return {
          sx: {
            bgcolor: isSuccess ? '#f0fdf4' : (s === '' ? 'inherit' : '#fef2f2'),
            '&:hover': { bgcolor: isSuccess ? '#dcfce7' : (s === '' ? '#f0f9ff' : '#fee2e2') },
          },
        };
      },
      renderDetailPanel: ({ row }) => (
        <Box sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
          <Typography variant="subtitle2" fontWeight="700" color="#334155" gutterBottom>
            {tabValue === 2 ? 'Failed Payload & Error Details' : 'Full Transaction Data'}
          </Typography>
          
          {(row.original.rejectionReason || row.original.errorMessage) && (
            <Box sx={{ bgcolor: '#fef2f2', p: 2, mb: 2, borderRadius: 1, border: '1px solid #fecaca' }}>
              <Typography variant="body2" color="error" fontWeight="700">
                {tabValue === 2 ? 'Error Message' : 'Rejection Reason'}
              </Typography>
              <Typography variant="body2" color="#991b1b" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                {row.original.rejectionReason || row.original.errorMessage}
              </Typography>
            </Box>
          )}

          {tabValue === 2 ? (
            <Box sx={{ bgcolor: '#1e293b', p: 2, borderRadius: 1, overflowX: 'auto' }}>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, display: 'block', mb: 1 }}>
                Raw Request Payload:
              </Typography>
              <pre style={{ margin: 0, color: '#e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                {JSON.stringify(row.original.requestPayload, null, 2)}
              </pre>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {Object.entries(row.original)
                .filter(([key, val]) => !['_id', '__v', 'rejectionReason', 'attachments'].includes(key) && val != null && val !== '')
                .map(([key, val]) => {
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                  let display = val;
                  if (typeof val === 'boolean') display = val ? 'Yes' : 'No';
                  else if (typeof val === 'object') display = JSON.stringify(val);
                  else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) display = d.toLocaleString('en-IN');
                  }
                  return (
                    <Grid item xs={6} sm={4} md={3} key={key}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, display: 'block' }}>
                        {label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 500, wordBreak: 'break-word' }}>
                        {String(display)}
                      </Typography>
                    </Grid>
                  );
                })}
            </Grid>
          )}
        </Box>
      ),
    };
  }, [tabValue, purchaseColumns, paymentColumns, failedSyncColumns, listData]);

  const clearFilters = () => { setStartDate(null); setEndDate(null); setStatus('All'); };
  const handleRefresh = () => { fetchStats(); fetchData(); };

  // ── Stat card ──────────────────────────────────────────────────
  const StatCard = ({ label, count, bg, border, color, icon }) => (
    <Card sx={{ boxShadow: 'none', border: `1px solid ${border}`, borderRadius: 2, bgcolor: bg, height: '100%' }}>
      <CardContent sx={{ p: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ p: 1, borderRadius: '50%', bgcolor: color, color: '#fff', display: 'flex' }}>{icon}</Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2, display: 'block' }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight="800" color="#1e293b">{count}</Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReceiptLongIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Tally Transactions
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Successfully imported to Tally vs Not imported & Failed API syncs
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label={tabValue === 2 ? "Total Failed" : "Total Entries"} 
            count={currentStats?.total || 0}
            bg="#f0f9ff" border="#bae6fd" color="#0ea5e9"
            icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} />
        </Grid>
        {tabValue !== 2 && (
          <>
            <Grid item xs={6} sm={3}>
              <StatCard label="Successfully Imported" count={currentStats?.imported || 0}
                bg="#f0fdf4" border="#bbf7d0" color="#22c55e"
                icon={<SyncIcon sx={{ fontSize: 20 }} />} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard label="Not Imported" count={currentStats?.notImported || 0}
                bg="#fffbeb" border="#fde68a" color="#f59e0b"
                icon={<HourglassEmptyIcon sx={{ fontSize: 20 }} />} />
            </Grid>
          </>
        )}
        <Grid item xs={6} sm={3}>
          <StatCard label="Failed API Syncs" count={stats.failedSyncs?.total || 0}
            bg="#fef2f2" border="#fecaca" color="#ef4444"
            icon={<ErrorOutlineIcon sx={{ fontSize: 20 }} />} />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={3}>
            <DatePicker label="Start Date" value={startDate} onChange={setStartDate}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <DatePicker label="End Date" value={endDate} onChange={setEndDate}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <FormControl fullWidth size="small" disabled={tabValue === 2}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="Paid">Imported (Paid/Success)</MenuItem>
                <MenuItem value="Pending">Not Imported (Pending)</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Button variant="outlined" startIcon={<FilterAltOffIcon />} onClick={clearFilters}
              fullWidth sx={{ borderColor: '#cbd5e1', color: '#64748b', textTransform: 'none' }}>
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs + Table */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: '#e2e8f0' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
            sx={{
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', py: 2 },
              '& .Mui-selected': { color: '#2563eb' },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}>
            <Tab label={`Purchase Book (${stats.purchaseBookEntries?.total || 0})`} />
            <Tab label={`Payment Requests (${stats.paymentRequests?.total || 0})`} />
            <Tab label={`Failed API Syncs (${stats.failedSyncs?.total || 0})`} sx={{ color: '#ef4444', '&.Mui-selected': { color: '#dc2626' } }} />
          </Tabs>
        </Box>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={36} thickness={4} sx={{ color: '#3b82f6' }} />
          </Box>
        ) : (
          <MaterialReactTable {...tableConfig} />
        )}
      </Paper>
    </Box>
  );
};

export default React.memo(TallyTransactions);

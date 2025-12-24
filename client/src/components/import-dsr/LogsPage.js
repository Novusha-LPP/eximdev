import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Fade
} from '@mui/material';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import DateRangeIcon from '@mui/icons-material/DateRange';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AutoModeIcon from '@mui/icons-material/AutoMode';

const LogsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [jobNo, setJobNo] = useState(searchParams.get('job') || '');
  const [logsData, setLogsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, updates: 0, errors: 0 });

  // Update URL when state changes
  const updateUrl = (newDate, newJob) => {
    const params = {};
    if (newDate) params.date = newDate;
    if (newJob) params.job = newJob;
    setSearchParams(params);
  };

  const handleSearch = () => {
    updateUrl(date, jobNo);
    fetchLogs();
  };

  const fetchLogs = () => {
    setLoading(true);
    let url = `https://eximbot.alvision.in/logs/by_date?date=${date}&debug=false`;

    if (jobNo) {
      url = `https://eximbot.alvision.in/logs/by_job/${jobNo}?debug=false`;
    }

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const logs = data.logs || [];
        setLogsData(logs);

        // Calculate Stats
        const errorCount = logs.filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail')).length;
        const updateCount = logs.filter(l => l.includes('was set to')).length;
        setStats({
          total: logs.length,
          updates: updateCount,
          errors: errorCount
        });
      })
      .catch((error) => {
        console.error("Error fetching logs:", error);
      })
      .finally(() => setLoading(false));
  };

  // Sync State with URL on Load/Change
  useEffect(() => {
    const urlDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const urlJob = searchParams.get('job') || '';

    setDate(urlDate);
    setJobNo(urlJob);

    // Fetch logs with the new values
    setLoading(true);
    let url = `https://eximbot.alvision.in/logs/by_date?date=${urlDate}&debug=false`;
    if (urlJob) {
      url = `https://eximbot.alvision.in/logs/by_job/${urlJob}?debug=false`;
    }

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const logs = data.logs || [];
        setLogsData(logs);
        const errorCount = logs.filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail')).length;
        const updateCount = logs.filter(l => l.includes('was set to')).length;
        setStats({ total: logs.length, updates: updateCount, errors: errorCount });
      })
      .catch((error) => console.error("Error fetching logs:", error))
      .finally(() => setLoading(false));

  }, [searchParams]);

  // 🧩 Utility: Enhanced Log Parser
  const parseLog = (log) => {
    const time = log.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)?.[0] || log.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)?.[0] || '—';
    const job = log.match(/job\s+(\d+)/i)?.[1] || '—';

    // Extract Field Name
    let field = '—';
    const fieldMatch = log.match(/container_nos\.([a-zA-Z_]+)/);
    if (fieldMatch) {
      field = fieldMatch[1].replace(/_/g, ' ');
    } else if (log.includes('was set to')) {
      // Fallback for some formats
      field = 'Update';
    }

    const value = log.match(/was set to\s+([^\s]+)/)?.[1] || '—';

    // Extract Source
    let source = 'System';
    const sourceMatch = log.match(/fetch_([a-z_]+)_date/);
    if (sourceMatch) {
      source = sourceMatch[1].replace(/_/g, ' ');
    } else if (log.toLowerCase().includes('manual')) {
      source = 'Manual';
    }

    // Determine Type/category
    let type = 'Info';
    if (log.toLowerCase().includes('error') || log.toLowerCase().includes('fail')) type = 'Error';
    else if (log.includes('was set to')) type = 'Update';

    return { time, job, field, value, source, type, fullLog: log };
  };

  // 📋 Table Columns
  const columns = useMemo(
    () => [
      {
        accessorKey: 'time',
        header: 'Timestamp',
        size: 140,
        Cell: ({ cell }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.7 }} />
            <Typography variant="body2">{cell.getValue()}</Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'job',
        header: 'Job No.',
        size: 100,
        Cell: ({ cell }) => (
          <Chip
            label={cell.getValue() !== '—' ? `#${cell.getValue()}` : '—'}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 'bold', borderRadius: 1 }}
          />
        ),
      },
      {
        accessorKey: 'field',
        header: 'Field Updated',
        size: 180,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
            {cell.getValue()}
          </Typography>
        ),
      },
      {
        accessorKey: 'value',
        header: 'New Value',
        size: 150,
        Cell: ({ cell }) => (
          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
            {cell.getValue()}
          </Typography>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source / Automation',
        size: 160,
        Cell: ({ cell }) => {
          const val = cell.getValue();
          let icon = <AutoModeIcon fontSize="small" />;
          let color = "default";

          if (val.includes('port out')) { icon = <LocalShippingIcon fontSize="small" />; color = "info"; }
          else if (val.includes('ack')) { icon = <DescriptionIcon fontSize="small" />; color = "secondary"; }
          else if (val.includes('System')) { icon = <AutoModeIcon fontSize="small" />; color = "default"; }

          return (
            <Chip
              icon={icon}
              label={val}
              color={color}
              size="small"
              variant="filled"
              sx={{ textTransform: 'capitalize', borderRadius: 1.5 }}
            />
          );
        },
      },
      {
        accessorKey: 'type',
        header: 'Status',
        size: 100,
        Cell: ({ cell }) => {
          const val = cell.getValue();
          return (
            <Chip
              label={val}
              size="small"
              color={val === 'Error' ? 'error' : (val === 'Update' ? 'success' : 'default')}
              variant={val === 'Update' ? 'filled' : 'outlined'}
              icon={val === 'Update' ? <CheckCircleOutlineIcon /> : (val === 'Error' ? <ErrorOutlineIcon /> : undefined)}
            />
          )
        }
      },
    ],
    [],
  );

  // Process data for table
  const parsedData = useMemo(() => {
    return logsData.map(log => parseLog(log));
  }, [logsData]);

  // Table Instance
  const table = useMaterialReactTable({
    columns,
    data: parsedData,
    enableColumnFiltering: true,
    enableGlobalFilter: true,
    enablePagination: true,
    enableShortcuts: false,
    initialState: {
      showGlobalFilter: true,
      density: 'compact',
      pagination: { pageSize: 20, pageIndex: 0 }
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: { borderRadius: 0, border: '1px solid #e0e0e0' }
    },
    muiTableHeadCellProps: {
      sx: { backgroundColor: '#f5f5f5', fontWeight: 'bold' }
    },
    state: { isLoading: loading },
  });

  return (
    <Box sx={{ p: 3, maxWidth: '100%', margin: '0 auto', backgroundColor: '#f9fafb', minHeight: '100vh' }}>

      {/* Header Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
            <DescriptionIcon fontSize="large" sx={{ opacity: 0.9 }} />
            <Typography variant="h4" fontWeight="bold">Logs & Audit Report</Typography>
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.8 }}>
            Detailed tracking of all automated system actions and data updates.
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Stack direction="row" spacing={2}>
          {[
            { label: 'Total Logs', val: stats.total, color: 'rgba(255,255,255,0.2)' },
            { label: 'Updates', val: stats.updates, color: 'rgba(76, 175, 80, 0.3)' },
            { label: 'Errors', val: stats.errors, color: 'rgba(244, 67, 54, 0.3)' }
          ].map((stat, i) => (
            <Box key={i} sx={{
              p: 1.5, px: 2.5,
              borderRadius: 2,
              bgcolor: stat.color,
              backdropFilter: 'blur(5px)',
              textAlign: 'center'
            }}>
              <Typography variant="h5" fontWeight="bold">{stat.val}</Typography>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', opacity: 0.8 }}>{stat.label}</Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center' }} elevation={0} variant="outlined">
        <TextField
          label="Filter Date"
          type="date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 180 }}
          InputProps={{ startAdornment: <DateRangeIcon color="action" sx={{ mr: 1 }} /> }}
        />
        <TextField
          label="Job Number"
          size="small"
          placeholder="Optional..."
          value={jobNo}
          onChange={(e) => setJobNo(e.target.value)}
          sx={{ width: 180 }}
          InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          startIcon={<SearchIcon />}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)' }}
        >
          Search Logs
        </Button>
        <Button
          variant="outlined"
          onClick={fetchLogs}
          startIcon={<RefreshIcon />}
          disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none' }}
        >
          Refresh
        </Button>
      </Paper>

      {/* Main Table */}
      <Card elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <MaterialReactTable table={table} />
      </Card>

    </Box>
  );
};

export default LogsPage;

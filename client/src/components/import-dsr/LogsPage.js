// src/pages/LogsPage.js
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';

const LogsPage = () => {
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [logsData, setLogsData] = useState({ date: date, logs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`https://eximbot.alvision.in/logs/by_date/?date=${date}&debug=false`)
      .then((response) => response.json())
      .then((data) => {
        setLogsData({ date, logs: data.logs || [] });
      })
      .catch((error) => {
        console.error("Error fetching logs:", error);
      })
      .finally(() => setLoading(false));
  }, [date]);

  // 🧩 Utility: extract info from each log string
  const parseLog = (log) => {
    const time = log.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)?.[0] || '—';
    const job = log.match(/job\s+(\d+)/i)?.[1] || '—';
    const field = log.match(/container_nos\.([a-zA-Z_]+)/)?.[1]?.replace(/_/g, ' ') || '—';
    const value = log.match(/was set to\s+([^\s]+)/)?.[1] || '—';
    const source = log.match(/fetch_([a-z_]+)_date/)?.[1]?.replace(/_/g, ' ') || 'System';
    return { time, job, field, value, source };
  };

  const getLogColor = (log) => {
    if (log.includes('delivery_date')) return 'success';
    if (log.includes('was set to')) return 'info';
    return 'default';
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#1976d2', mb: 3 }}>
          System Activity Logs
        </Typography>

        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6">
            Date: <strong>{logsData.date}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing all system activities and updates for this date
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : logsData.logs.length > 0 ? (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f0f0f0' }}>
                <TableRow>
                  <TableCell><strong>Time</strong></TableCell>
                  <TableCell><strong>Job</strong></TableCell>
                  <TableCell><strong>Field</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                  <TableCell><strong>Source</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logsData.logs.map((log, index) => {
                  const { time, job, field, value, source } = parseLog(log);
                  return (
                    <TableRow key={index}>
                      <TableCell>{time}</TableCell>
                      <TableCell>Job #{job}</TableCell>
                      <TableCell>{field}</TableCell>
                      <TableCell>{value}</TableCell>
                      <TableCell>
                        <Chip
                          label={source}
                          color={getLogColor(log)}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No logs found for this date
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try selecting a different date or check if there was any system activity.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default LogsPage;

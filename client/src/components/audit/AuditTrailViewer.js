import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Pagination
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { format } from 'date-fns';

const AuditTrailViewer = ({ job_no, year }) => {
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    action: '',
    username: '',
    field: '',
    fromDate: '',
    toDate: ''
  });
  const [stats, setStats] = useState(null);

  // Fetch audit trail data
  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      let url = `${process.env.REACT_APP_API_STRING}/audit-trail`;
      
      if (job_no && year) {
        url = `${process.env.REACT_APP_API_STRING}/audit-trail/job/${job_no}/${year}`;
      }

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${url}?${params}`);
      setAuditData(response.data.auditTrail || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/audit-trail/stats?${params}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchAuditTrail();
    if (!job_no) fetchStats();
  }, [filters, job_no, year]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  const handlePageChange = (event, page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'primary';
      case 'DELETE': return 'error';
      default: return 'default';
    }
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'ADDED': return 'success';
      case 'MODIFIED': return 'warning';
      case 'REMOVED': return 'error';
      default: return 'default';
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return String(value);
  };

  const renderChanges = (changes) => {
    return (
      <Box>
        {changes.map((change, index) => (
          <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Chip 
                label={change.changeType} 
                color={getChangeTypeColor(change.changeType)} 
                size="small" 
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" fontWeight="bold">
                {change.fieldPath || change.field}
              </Typography>
            </Box>
            
            {change.changeType !== 'ADDED' && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">Old Value:</Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    backgroundColor: '#ffebee', 
                    p: 1, 
                    borderRadius: 1, 
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}
                >
                  {formatValue(change.oldValue)}
                </Typography>
              </Box>
            )}
            
            {change.changeType !== 'REMOVED' && (
              <Box>
                <Typography variant="caption" color="text.secondary">New Value:</Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    backgroundColor: '#e8f5e8', 
                    p: 1, 
                    borderRadius: 1, 
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}
                >
                  {formatValue(change.newValue)}
                </Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Audit Trail {job_no && year && `- Job ${job_no}/${year}`}
      </Typography>

      {/* Statistics Cards */}
      {stats && !job_no && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">{stats.summary.totalActions}</Typography>
                <Typography variant="body2" color="text.secondary">Total Actions</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">{stats.summary.totalUsers}</Typography>
                <Typography variant="body2" color="text.secondary">Active Users</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">{stats.summary.totalDocuments}</Typography>
                <Typography variant="body2" color="text.secondary">Documents Modified</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {stats.topUsers.length > 0 ? stats.topUsers[0]._id : 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">Most Active User</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filters</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                label="Action"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="CREATE">Create</MenuItem>
                <MenuItem value="UPDATE">Update</MenuItem>
                <MenuItem value="DELETE">Delete</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Username"
              value={filters.username}
              onChange={(e) => handleFilterChange('username', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Field"
              value={filters.field}
              onChange={(e) => handleFilterChange('field', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From Date"
              InputLabelProps={{ shrink: true }}
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To Date"
              InputLabelProps={{ shrink: true }}
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setFilters({
                page: 1,
                limit: 20,
                action: '',
                username: '',
                field: '',
                fromDate: '',
                toDate: ''
              })}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Audit Trail Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Job No/Year</TableCell>
              <TableCell>Changes</TableCell>
              <TableCell>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : auditData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No audit trail data found</TableCell>
              </TableRow>
            ) : (
              auditData.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Chip 
                      label={entry.action} 
                      color={getActionColor(entry.action)} 
                      size="small" 
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">{entry.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.userRole}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {entry.job_no}/{entry.year}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2">
                          {entry.changes.length} change(s)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderChanges(entry.changes)}
                      </AccordionDetails>
                    </Accordion>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">{entry.ipAddress}</Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default AuditTrailViewer;

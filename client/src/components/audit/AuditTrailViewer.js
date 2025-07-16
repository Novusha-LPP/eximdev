import React, { useState, useEffect,useContext } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Pagination,
  Divider,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  Autocomplete
} from '@mui/material';
import { UserContext } from "../../contexts/UserContext";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import {
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Event as CalendarIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const AuditTrailViewer = ({ job_no, year, currentUser = { username: '', role: '' } }) => {
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(UserContext);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    action: '',
    username: currentUser.role === 'Admin' ? '' : user.username,
    field: '',
    fromDate: '',
    toDate: '',
    groupBy: 'day', // default grouping
    search: ''
  });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [userList, setUserList] = useState([]);
  const [selectedUserForFilter, setSelectedUserForFilter] = useState(null);

  // Date filter UI state
  // These are controlled by filters.fromDate and filters.toDate

  // Handler for date change (single date or range)
  const handleDateChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  // When groupBy changes, set date range accordingly
  useEffect(() => {
    const today = new Date();
    let fromDate = filters.fromDate;
    let toDate = filters.toDate;
    if (filters.groupBy === 'day' || filters.groupBy === 'hour') {
      // Set both to today
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      fromDate = `${yyyy}-${mm}-${dd}`;
      toDate = `${yyyy}-${mm}-${dd}`;
    } else if (filters.groupBy === 'week') {
      // Set to current week (Monday to Sunday)
      const dayOfWeek = today.getDay() || 7; // Sunday=0, so set to 7
      const monday = new Date(today);
      monday.setDate(today.getDate() - dayOfWeek + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const yyyy1 = monday.getFullYear();
      const mm1 = String(monday.getMonth() + 1).padStart(2, '0');
      const dd1 = String(monday.getDate()).padStart(2, '0');
      const yyyy2 = sunday.getFullYear();
      const mm2 = String(sunday.getMonth() + 1).padStart(2, '0');
      const dd2 = String(sunday.getDate()).padStart(2, '0');
      fromDate = `${yyyy1}-${mm1}-${dd1}`;
      toDate = `${yyyy2}-${mm2}-${dd2}`;
    } else if (filters.groupBy === 'month') {
      // Set to current month
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      fromDate = `${yyyy}-${mm}-01`;
      // Last day of month
      const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
      toDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
    }
    // Only update if changed
    if (filters.fromDate !== fromDate || filters.toDate !== toDate) {
      setFilters(prev => ({ ...prev, fromDate, toDate }));
    }
  }, [filters.groupBy]);

  // Ocean color palette
  const oceanColors = {
    primary: '#006994',
    secondary: '#0891B2',
    accent: '#22D3EE',
    light: '#E0F2FE',
    darkBlue: '#0C4A6E',
    teal: '#0D9488',
    lightTeal: '#5EEAD4',
    gradient: 'linear-gradient(135deg, #0891B2 0%, #22D3EE 100%)',
    cardGradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)'
  };

  const actionColors = {
    CREATE: '#10B981',
    UPDATE: '#3B82F6',
    DELETE: '#EF4444',
    READ: '#8B5CF6'
  };

  // Fetch all users (Admin only)
  const fetchAllUsers = async () => {
    if (user.role !== 'Admin') return;
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`);
      // Transform user data for autocomplete
      const transformedUsers = response.data.map(user => ({
        label: user.username,
        value: user.username,
        id: user._id
      }));
      setUserList(transformedUsers);
      
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

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

      // For non-Admin users, always filter by current user
      if (user.role !== 'Admin') {
        params.set('username', user.username);
      }

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
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.groupBy) params.append('groupBy', filters.groupBy);

      // For non-Admin users, always filter by current user
      if (user.role !== 'Admin') {
        params.append('username', user.username);
      }

      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/audit-trail/stats?${params}`);

      // Group dailyActivity by hour using timestamp
      const raw = response.data.dailyActivity || [];
      // If already grouped by hour, use as is; else, group here
      let hourlyMap = {};
      raw.forEach(item => {
        // item.timestamp is expected
        const d = new Date(item.timestamp || item.date);
        if (!isNaN(d)) {
          const label = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:00`;
          if (!hourlyMap[label]) hourlyMap[label] = 0;
          hourlyMap[label] += item.count || 1;
        }
      });
      const transformedDailyActivity = Object.entries(hourlyMap).map(([date, actions]) => ({ date, actions }));

      console.log(transformedDailyActivity)
      // Transform actionTypes data for PieChart
      const transformedActionTypes = response.data.actionTypes?.map(item => ({
        name: item._id,
        value: item.count,
        color: actionColors[item._id] || oceanColors.primary
      })) || [];

      setStats({
        ...response.data,
        dailyActivity: transformedDailyActivity,
        actionTypes: transformedActionTypes
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditTrail();
    if (!job_no) fetchStats();
    if (user.role === 'Admin') {
      fetchAllUsers();
    }
  }, [filters, job_no, year]);

  // Initialize selected user for filter based on current filters
  useEffect(() => {
    if (user.role === 'Admin' && filters.username && userList.length > 0) {
      const user = userList.find(u => u.value === filters.username);
      setSelectedUserForFilter(user || null);
    }
  }, [userList, filters.username, user.role]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  const handleUserFilterChange = (event, newValue) => {
    setSelectedUserForFilter(newValue);
    handleFilterChange('username', newValue ? newValue.value : '');
  };

  const handlePageChange = (event, page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      action: '',
      username: user.role === 'Admin' ? '' : user.username,
      field: '',
      fromDate: '',
      toDate: '',
      groupBy: 'day',
      search: ''
    });
    setSelectedUserForFilter(null);
  };

  const toggleRowExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const formatChangeDescription = (change, timestamp) => {
    const time = format(timestamp, 'HH:mm');
    const fieldName = change.field || change.fieldPath;
    
    switch (change.changeType) {
      case 'ADDED':
        return `${fieldName} was set to "${change.newValue}" at ${time}`;
      case 'MODIFIED':
        return `${fieldName} was updated from "${change.oldValue}" to "${change.newValue}" at ${time}`;
      case 'REMOVED':
        return `${fieldName} was removed (previous value: "${change.oldValue}") at ${time}`;
      case 'VIEWED':
        return `${fieldName} was viewed at ${time}`;
      default:
        return `${fieldName} was changed at ${time}`;
    }
  };

  const renderChanges = (changes, timestamp) => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 2, borderLeft: `2px solid ${oceanColors.accent}` }}>
        {changes.map((change, index) => (
          <Typography 
            key={index} 
            variant="body2" 
            sx={{ 
              color: oceanColors.darkBlue,
              fontStyle: 'italic',
              padding: '4px 8px',
              backgroundColor: '#F8FAFC',
              borderRadius: '4px'
            }}
          >
            {formatChangeDescription(change, timestamp)}
          </Typography>
        ))}
      </Box>
    );
  };

  const renderUserAvatar = (username) => {
    if (!username) return <Avatar sx={{ bgcolor: oceanColors.secondary, width: 32, height: 32, fontSize: '0.75rem' }}>?</Avatar>;
    const initials = username.split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return (
      <Avatar sx={{ 
        bgcolor: oceanColors.secondary, 
        width: 32, 
        height: 32,
        fontSize: '0.75rem'
      }}>
        {initials}
      </Avatar>
    );
  };

  const renderSummaryCards = () => (
    statsLoading ? (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: oceanColors.primary }}>
          Loading statistics...
        </Typography>
      </Box>
    ) : (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: oceanColors.cardGradient,
            border: `1px solid ${oceanColors.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DocumentIcon sx={{ color: oceanColors.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: oceanColors.darkBlue }}>
                  Total Actions
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: oceanColors.primary, fontWeight: 'bold' }}>
                {stats?.summary?.totalActions || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: oceanColors.darkBlue, mt: 1 }}>
                Across all projects
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: oceanColors.cardGradient,
            border: `1px solid ${oceanColors.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ color: oceanColors.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: oceanColors.darkBlue }}>
                  Active Users
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: oceanColors.primary, fontWeight: 'bold' }}>
                {stats?.summary?.totalUsers || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: oceanColors.darkBlue, mt: 1 }}>
                In the last 30 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: oceanColors.cardGradient,
            border: `1px solid ${oceanColors.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <DocumentIcon sx={{ color: oceanColors.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: oceanColors.darkBlue }}>
                  Documents
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: oceanColors.primary, fontWeight: 'bold' }}>
                {stats?.summary?.totalDocuments || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: oceanColors.darkBlue, mt: 1 }}>
                Modified this year
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: oceanColors.cardGradient,
            border: `1px solid ${oceanColors.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ViewIcon sx={{ color: oceanColors.primary, mr: 1 }} />
                <Typography variant="h6" sx={{ color: oceanColors.darkBlue }}>
                  Most Active
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ color: oceanColors.primary, fontWeight: 'bold' }}>
                {stats?.topUsers?.length > 0 ? stats.topUsers[0]._id : 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ color: oceanColors.darkBlue, mt: 1 }}>
                {stats?.topUsers?.length > 0 ? `${stats.topUsers[0].count} actions` : ''}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )
  );

  const renderCharts = () => (
    statsLoading ? (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: oceanColors.primary }}>
          Loading statistics...
        </Typography>
      </Box>
    ) : (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            background: oceanColors.cardGradient,
            border: `1px solid ${oceanColors.accent}`,
            borderRadius: 2,
            p: 2,
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
          }}>
            <Typography variant="h6" sx={{ color: oceanColors.primary, mb: 2, display: 'flex', alignItems: 'center' }}>
              <CalendarIcon sx={{ mr: 1 }} /> Daily Activity Trend
            </Typography>
            {(!stats?.dailyActivity || stats.dailyActivity.length === 0) ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: oceanColors.primary }}>
                  No activity data available for the selected period.
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.dailyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={oceanColors.accent} opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke={oceanColors.primary} 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-30}
                    height={60}
                  />
                  <YAxis 
                    stroke={oceanColors.primary} 
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip 
                    formatter={(value) => [`${value} actions`, 'Actions']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ 
                      backgroundColor: oceanColors.light,
                      border: `1px solid ${oceanColors.accent}`,
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actions" 
                    stroke={oceanColors.primary} 
                    strokeWidth={3}
                    dot={{ fill: oceanColors.accent, strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8, fill: oceanColors.secondary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: oceanColors.cardGradient,
            border: `1px solid ${oceanColors.accent}`,
            borderRadius: 2,
            p: 2,
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)',
            height: '100%'
          }}>
            <Typography variant="h6" sx={{ color: oceanColors.primary, mb: 2, display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1 }} /> Action Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.actionTypes || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {(stats?.actionTypes || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card sx={{ 
            background: oceanColors.cardGradient,
            border: `1px solid ${oceanColors.accent}`,
            borderRadius: 2,
            p: 2,
            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
          }}>
            <Typography variant="h6" sx={{ color: oceanColors.primary, mb: 2, display: 'flex', alignItems: 'center' }}>
              <PersonIcon sx={{ mr: 1 }} /> Top Users
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.topUsers || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={oceanColors.accent} opacity={0.5} />
                <XAxis dataKey="_id" stroke={oceanColors.primary} />
                <YAxis stroke={oceanColors.primary} />
                <ChartTooltip 
                  contentStyle={{ 
                    backgroundColor: oceanColors.light,
                    border: `1px solid ${oceanColors.accent}`,
                    borderRadius: '8px'
                  }} 
                />
                <Bar 
                  dataKey="count" 
                  fill={oceanColors.primary} 
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                >
                  {(stats?.topUsers || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={oceanColors.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>
    )
  );

  // Date filter UI (above tabs, applies to all tabs)
  const renderDateFilter = () => (
    <Card sx={{
      p: 2,
      mb: 2,
      background: oceanColors.cardGradient,
      border: `1px solid ${oceanColors.accent}`,
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(8, 145, 178, 0.08)'
    }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="From Date"
            InputLabelProps={{ shrink: true }}
            value={filters.fromDate}
            onChange={e => handleDateChange('fromDate', e.target.value)}
            sx={{ backgroundColor: 'white' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="To Date"
            InputLabelProps={{ shrink: true }}
            value={filters.toDate}
            onChange={e => handleDateChange('toDate', e.target.value)}
            sx={{ backgroundColor: 'white' }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small" sx={{ backgroundColor: 'white' }}>
            <InputLabel id="group-by-label">Group By</InputLabel>
            <Select
              labelId="group-by-label"
              id="group-by-select"
              value={filters.groupBy}
              label="Group By"
              onChange={e => handleDateChange('groupBy', e.target.value)}
            >
              <MenuItem value="hour">Hourly</MenuItem>
              <MenuItem value="day">Daily</MenuItem>
              <MenuItem value="week">Weekly</MenuItem>
              <MenuItem value="month">Monthly</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Card>
  );

  const renderAuditTable = () => (
    <Card sx={{ 
      borderRadius: 2,
      background: 'white',
      border: `1px solid ${oceanColors.accent}`,
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
    }}>
      <Box sx={{ 
        p: 2, 
        background: oceanColors.gradient,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">Audit Trail Records</Typography>
        <Box>
          <Tooltip title="Refresh data">
            <IconButton 
              sx={{ color: 'white' }} 
              onClick={() => {
                fetchAuditTrail();
                if (!job_no) fetchStats();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ p: 3 }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body1" align="center" sx={{ color: oceanColors.primary }}>
            Loading audit trail data...
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: oceanColors.light }}>
                <TableCell sx={{ color: oceanColors.primary, fontWeight: 'bold', width: '15%' }}>
                  Timestamp
                </TableCell>
                <TableCell sx={{ color: oceanColors.primary, fontWeight: 'bold', width: '15%' }}>
                  Action
                </TableCell>
                <TableCell sx={{ color: oceanColors.primary, fontWeight: 'bold', width: '20%' }}>
                  User
                </TableCell>
                <TableCell sx={{ color: oceanColors.primary, fontWeight: 'bold', width: '15%' }}>
                  Job No/Year
                </TableCell>
                <TableCell sx={{ color: oceanColors.primary, fontWeight: 'bold', width: '35%' }}>
                  Changes
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" sx={{ color: oceanColors.primary }}>
                      No audit trail data found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                auditData.map((entry) => (
                  <React.Fragment key={entry._id}>
                    <TableRow 
                      hover
                      sx={{ 
                        '&:hover': { backgroundColor: '#F0F9FF' },
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleRowExpand(entry._id)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ color: oceanColors.darkBlue }}>
                          {format(new Date(entry.timestamp), 'dd MMM yyyy')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: oceanColors.secondary }}>
                          {format(new Date(entry.timestamp), 'HH:mm:ss')}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={entry.action} 
                          size="small" 
                          sx={{ 
                            backgroundColor: actionColors[entry.action] || oceanColors.secondary,
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {renderUserAvatar(entry.username)}
                          <Box sx={{ ml: 1.5 }}>
                            <Typography variant="body2" sx={{ color: oceanColors.darkBlue, fontWeight: 'bold' }}>
                              {entry.username}
                            </Typography>
                            <Typography variant="caption" sx={{ color: oceanColors.primary }}>
                              {entry.userRole}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" sx={{ color: oceanColors.darkBlue }}>
                          {entry.job_no}/{entry.year}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" sx={{ color: oceanColors.darkBlue }}>
                          {entry.changes[0]?.changeType} on {entry.changes[0]?.field}
                        </Typography>
                        <Typography variant="caption" sx={{ color: oceanColors.secondary }}>
                          {entry.changes.length} change{entry.changes.length > 1 ? 's' : ''}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    
                    {expandedRow === entry._id && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ backgroundColor: '#F8FAFC', py: 2, px: 4 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ExpandIcon sx={{ color: oceanColors.primary, mr: 1 }} />
                            <Typography variant="subtitle2" sx={{ color: oceanColors.primary }}>
                              Change Details
                            </Typography>
                          </Box>
                          {renderChanges(entry.changes, entry.timestamp)}
                          {entry.ipAddress && (
                            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: oceanColors.secondary }}>
                              IP Address: {entry.ipAddress}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );

  const renderFilterDialog = () => (
    <Dialog
      open={openFilterDialog}
      onClose={() => setOpenFilterDialog(false)}
      TransitionComponent={Transition}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ 
        background: oceanColors.gradient,
        color: 'white',
        display: 'flex',
        alignItems: 'center'
      }}>
        <FilterIcon sx={{ mr: 1 }} />
        Advanced Filters
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          {/* User filter in dialog (Admin only) */}
          {user.role === 'Admin' && (
            <Grid item xs={12}>
              <Autocomplete
                value={selectedUserForFilter}
                onChange={handleUserFilterChange}
                options={userList}
                getOptionLabel={(option) => option.label || ''}
                size="small"
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select User" 
                    fullWidth
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {renderUserAvatar(option.label)}
                      <Typography sx={{ ml: 1 }}>{option.label}</Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Field Name"
              value={filters.field}
              onChange={(e) => handleFilterChange('field', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
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
          
          <Grid item xs={12} sm={6}>
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
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleResetFilters}
          color="secondary"
        >
          Clear All
        </Button>
        <Button 
          onClick={() => {
            setOpenFilterDialog(false);
            fetchAuditTrail();
            if (!job_no) fetchStats();
          }}
          variant="contained"
          sx={{ background: oceanColors.gradient }}
        >
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ 
      p: 3, 
      background: `linear-gradient(135deg, ${oceanColors.light} 0%, #F8FAFC 100%)`,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        background: oceanColors.gradient,
        borderRadius: 2,
        color: 'white',
        boxShadow: '0 4px 12px rgba(8, 145, 178, 0.3)'
      }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          🌊 Audit Trail Dashboard {job_no && year && `- Job ${job_no}/${year}`}
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          {currentUser.role === 'Admin' 
            ? 'Administrator View - All Audit Data' 
            : `User View - ${currentUser.username}'s Activity`}
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: oceanColors.primary,
              height: 3
            }
          }}
        >
          <Tab label="Overview" />
          <Tab label="Audit Log" />
          <Tab label="Statistics" />
        </Tabs>
        <Divider />
      </Box>

      {/* Content based on active tab */}
      {/* Date filter above tabs, applies to all tabs */}
      {renderDateFilter()}

      {activeTab === 0 && (
        <>
          {stats && renderSummaryCards()}
          {stats && renderCharts()}
        </>
      )}

      {activeTab === 1 && (
        <>
          {/* Keep advanced filters for user/action, but remove date fields from there */}
          {renderAuditTable()}
        </>
      )}

      {activeTab === 2 && stats && (
        <Card sx={{ 
          p: 3, 
          background: oceanColors.cardGradient,
          border: `1px solid ${oceanColors.accent}`,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(8, 145, 178, 0.1)'
        }}>
          <Typography variant="h6" sx={{ color: oceanColors.primary, mb: 3 }}>
            Audit Statistics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2, backgroundColor: 'white', boxShadow: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: oceanColors.darkBlue }}>
                  Recent Activity
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {(stats.recentActivity || []).map((activity) => (
                    <Box 
                      key={activity._id} 
                      sx={{ 
                        mb: 2, 
                        p: 2, 
                        borderLeft: `3px solid ${actionColors[activity.action] || oceanColors.primary}`,
                        backgroundColor: '#F8FAFC'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: oceanColors.darkBlue }}>
                        {activity.username} - {activity.action}
                      </Typography>
                      <Typography variant="caption" sx={{ color: oceanColors.secondary }}>
                        {format(new Date(activity.timestamp), 'dd MMM yyyy HH:mm')}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: oceanColors.darkBlue }}>
                        {activity.changes[0]?.field}: {activity.changes[0]?.changeType}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2, backgroundColor: 'white', boxShadow: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, color: oceanColors.darkBlue }}>
                  Action Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.actionTypes || []}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {(stats.actionTypes || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && activeTab === 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: oceanColors.darkBlue }}>
            Showing {auditData.length} of {pagination.totalItems} records
          </Typography>
          <Pagination
            count={pagination.totalPages}
            page={pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
            sx={{
              '& .MuiPaginationItem-root': {
                color: oceanColors.primary,
                '&.Mui-selected': {
                  backgroundColor: oceanColors.primary,
                  color: 'white'
                }
              }
            }}
          />
        </Box>
      )}

      {renderFilterDialog()}
    </Box>
  );
};

export default AuditTrailViewer;
import React, { useState, useEffect, useContext } from 'react';
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
  Autocomplete,
  Fade,
  Zoom
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
  Legend,
  BarChart,
  Bar
} from 'recharts';
import {
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Event as CalendarIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

// Transition component for Dialog
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
    groupBy: 'day',
    search: ''
  });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [userList, setUserList] = useState([]);

  const [selectedUserForFilter, setSelectedUserForFilter] = useState(null);


  // White and blue color palette
  const colorPalette = {
    primary: '#1976D2',
    secondary: '#90CAF9',
    accent: '#E3F2FD',
    light: '#F5F7FA',
    darkBlue: '#0D47A1',
    textPrimary: '#212121',
    textSecondary: '#757575',
    gradient: 'linear-gradient(135deg, #1976D2 0%, #90CAF9 100%)',
    cardGradient: 'linear-gradient(135deg, #FFFFFF 0%, #E3F2FD 100%)'
  };

  const actionColors = {
    CREATE: '#4CAF50',
    UPDATE: '#2196F3',
    DELETE: '#F44336',
    READ: '#9C27B0'
  };

  const handleDateChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1
    }));
  };

  useEffect(() => {
    const today = new Date();
    let fromDate = filters.fromDate;
    let toDate = filters.toDate;
    if (filters.groupBy === 'day' || filters.groupBy === 'hour') {
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      fromDate = `${yyyy}-${mm}-${dd}`;
      toDate = `${yyyy}-${mm}-${dd}`;
    } else if (filters.groupBy === 'week') {
      const dayOfWeek = today.getDay() || 7;
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
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      fromDate = `${yyyy}-${mm}-01`;
      const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
      toDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
    }
    if (filters.fromDate !== fromDate || filters.toDate !== toDate) {
      setFilters(prev => ({ ...prev, fromDate, toDate }));
    }
  }, [filters.groupBy]);

  const fetchAllUsers = async () => {
    if (user.role !== 'Admin') return;

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`);
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

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.groupBy) params.append('groupBy', filters.groupBy);
      if (user.role !== 'Admin') {
        params.append('username', user.username);
      }
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/audit-trail/stats?${params}`);
      const raw = response.data.dailyActivity || [];
      let hourlyMap = {};
      raw.forEach(item => {
        const d = new Date(item.timestamp || item.date);
        if (!isNaN(d)) {
          const label = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}`;
          if (!hourlyMap[label]) hourlyMap[label] = 0;
          hourlyMap[label] += item.count || 1;
        }
      });
      const transformedDailyActivity = Object.entries(hourlyMap).map(([date, actions]) => ({ date, actions }));
      const transformedActionTypes = response.data.actionTypes?.map(item => ({
        name: item._id,
        value: item.count,
        color: actionColors[item._id] || colorPalette.primary
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
    const time = format(new Date(timestamp), 'HH:mm');
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

  const renderChanges = (changes, timestamp) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 2, borderLeft: `2px solid ${colorPalette.accent}` }}>
      {changes.map((change, index) => (
        <Typography
          key={index}
          variant="body2"
          sx={{
            color: colorPalette.textSecondary,
            fontStyle: 'italic',
            padding: '4px 8px',
            backgroundColor: colorPalette.accent,
            borderRadius: '4px'
          }}
        >
          {formatChangeDescription(change, timestamp)}
        </Typography>
      ))}
    </Box>
  );

  const renderUserAvatar = (username) => {
    if (!username) return <Avatar sx={{ bgcolor: colorPalette.primary, width: 32, height: 32, fontSize: '0.75rem' }}>?</Avatar>;
    const initials = username.split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('');
    return (
      <Avatar sx={{
        bgcolor: colorPalette.primary,
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
        <Typography variant="body2" sx={{ mt: 2, color: colorPalette.primary }}>
          Loading statistics...
        </Typography>
      </Box>
    ) : (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true}>
            <Card sx={{
              background: colorPalette.cardGradient,
              border: `1px solid ${colorPalette.accent}`,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DocumentIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                  <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                    Total Actions
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                  {stats?.summary?.totalActions || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                  Across all projects
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true} style={{ transitionDelay: '100ms' }}>
            <Card sx={{
              background: colorPalette.cardGradient,
              border: `1px solid ${colorPalette.accent}`,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                  <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                    Active Users
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                  {stats?.summary?.totalUsers || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                  In the last 30 days
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true} style={{ transitionDelay: '200ms' }}>
            <Card sx={{
              background: colorPalette.cardGradient,
              border: `1px solid ${colorPalette.accent}`,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DocumentIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                  <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                    Documents
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                  {stats?.summary?.totalDocuments || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                  Modified this year
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Zoom in={true} style={{ transitionDelay: '300ms' }}>
            <Card sx={{
              background: colorPalette.cardGradient,
              border: `1px solid ${colorPalette.accent}`,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ViewIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                  <Typography variant="h6" sx={{ color: colorPalette.darkBlue }}>
                    Most Active
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ color: colorPalette.primary, fontWeight: 'bold' }}>
                  {stats?.topUsers?.length > 0 ? stats.topUsers[0]._id : 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: colorPalette.darkBlue, mt: 1 }}>
                  {stats?.topUsers?.length > 0 ? `${stats.topUsers[0].count} actions` : ''}
                </Typography>
              </CardContent>
            </Card>
          </Zoom>
        </Grid>
      </Grid>
    )
  );

  const renderCharts = () => (
    statsLoading ? (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: colorPalette.primary }}>
          Loading statistics...
        </Typography>
      </Box>
    ) : (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Fade in={true}>
            <Card sx={{
              background: colorPalette.cardGradient,
              border: `1px solid ${colorPalette.accent}`,
              borderRadius: 2,
              p: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
            }}>
              <Typography variant="h6" sx={{ color: colorPalette.primary, mb: 2, display: 'flex', alignItems: 'center' }}>
                <CalendarIcon sx={{ mr: 1 }} /> Daily Activity Trend
              </Typography>
              {(!stats?.dailyActivity || stats.dailyActivity.length === 0) ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: colorPalette.primary }}>
                    No activity data available for the selected period.
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats?.dailyActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colorPalette.accent} opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      stroke={colorPalette.primary}
                      tick={{ fontSize: 12 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke={colorPalette.primary}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip
                      formatter={(value) => [`${value} actions`, 'Actions']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        backgroundColor: colorPalette.light,
                        border: `1px solid ${colorPalette.accent}`,
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actions"
                      stroke={colorPalette.primary}
                      strokeWidth={3}
                      dot={{ fill: colorPalette.accent, strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 8, fill: colorPalette.secondary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Fade>
        </Grid>

        <Grid item xs={12} md={4}>
          <Fade in={true} style={{ transitionDelay: '100ms' }}>
            <Card sx={{
              background: colorPalette.cardGradient,
              border: `1px solid ${colorPalette.accent}`,
              borderRadius: 2,
              p: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)',
              height: '100%'
            }}>
              <Typography variant="h6" sx={{ color: colorPalette.primary, mb: 2, display: 'flex', alignItems: 'center' }}>
                <FilterIcon sx={{ mr: 1 }} /> Action Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.actionTypes || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats?.actionTypes?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Fade>
        </Grid>

        <Grid item xs={12}>
          <Fade in={true} style={{ transitionDelay: '200ms' }}>
            <Card sx={{
              background: colorPalette.cardGradient,
              border: `1px solid ${colorPalette.accent}`,
              borderRadius: 2,
              p: 2,
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
            }}>
              <Typography variant="h6" sx={{ color: colorPalette.primary, mb: 2, display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} /> Top Users
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats?.topUsers || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colorPalette.accent} opacity={0.5} />
                  <XAxis dataKey="_id" stroke={colorPalette.primary} />
                  <YAxis stroke={colorPalette.primary} />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: colorPalette.light,
                      border: `1px solid ${colorPalette.accent}`,
                      borderRadius: '8px'
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={colorPalette.primary}
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Fade>
        </Grid>
      </Grid>
    )
  );

  const renderDateFilter = () => (
    <Fade in={true}>
      <Card sx={{
        p: 2,
        mb: 2,
        background: colorPalette.cardGradient,
        border: `1px solid ${colorPalette.accent}`,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)'
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
              sx={{ backgroundColor: 'white', borderRadius: 1 }}
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
              sx={{ backgroundColor: 'white', borderRadius: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" sx={{ backgroundColor: 'white', borderRadius: 1 }}>
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
    </Fade>
  );

  const renderAuditTable = () => (
    <Fade in={true}>
      <Card sx={{
        borderRadius: 2,
        background: 'white',
        border: `1px solid ${colorPalette.accent}`,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
      }}>
        <Box sx={{
          p: 2,
          background: colorPalette.gradient,
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
            <Typography variant="body1" align="center" sx={{ color: colorPalette.primary }}>
              Loading audit trail data...
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: colorPalette.accent }}>
                  <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '15%' }}>
                    Timestamp
                  </TableCell>
                  <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '15%' }}>
                    Action
                  </TableCell>
                  <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '20%' }}>
                    User
                  </TableCell>
                  <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '15%' }}>
                    Job No/Year
                  </TableCell>
                  <TableCell sx={{ color: colorPalette.primary, fontWeight: 'bold', width: '35%' }}>
                    Changes
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" sx={{ color: colorPalette.primary }}>
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
                          '&:hover': { backgroundColor: colorPalette.accent },
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleRowExpand(entry._id)}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ color: colorPalette.textPrimary }}>
                            {format(new Date(entry.timestamp), 'dd MMM yyyy')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colorPalette.textSecondary }}>
                            {format(new Date(entry.timestamp), 'HH:mm:ss')}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={entry.action}
                            size="small"
                            sx={{
                              backgroundColor: actionColors[entry.action] || colorPalette.primary,
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {renderUserAvatar(entry.username)}
                            <Box sx={{ ml: 1.5 }}>
                              <Typography variant="body2" sx={{ color: colorPalette.textPrimary, fontWeight: 'bold' }}>
                                {entry.username}
                              </Typography>
                              <Typography variant="caption" sx={{ color: colorPalette.primary }}>
                                {entry.userRole}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ color: colorPalette.textPrimary }}>
                            {entry.job_no}/{entry.year}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ color: colorPalette.textPrimary }}>
                            {entry.changes[0]?.changeType} on {entry.changes[0]?.field}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colorPalette.textSecondary }}>
                            {entry.changes.length} change{entry.changes.length > 1 ? 's' : ''}
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {expandedRow === entry._id && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ backgroundColor: colorPalette.accent, py: 2, px: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <ExpandIcon sx={{ color: colorPalette.primary, mr: 1 }} />
                              <Typography variant="subtitle2" sx={{ color: colorPalette.primary }}>
                                Change Details
                              </Typography>
                            </Box>
                            {renderChanges(entry.changes, entry.timestamp)}
                            {entry.ipAddress && (
                              <Typography variant="caption" sx={{ mt: 2, display: 'block', color: colorPalette.textSecondary }}>
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
    </Fade>
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
        background: colorPalette.gradient,
        color: 'white',
        display: 'flex',
        alignItems: 'center'
      }}>
        <FilterIcon sx={{ mr: 1 }} />
        Advanced Filters
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
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
          sx={{ background: colorPalette.gradient }}
        >
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{
      p: 3,
      background: `linear-gradient(135deg, ${colorPalette.light} 0%, #F8FAFC 100%)`,
      minHeight: '100vh'
    }}>
      <Box sx={{
        mb: 4,
        p: 3,
        background: colorPalette.gradient,
        borderRadius: 2,
        color: 'white',
        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
      }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
          Audit Trail Dashboard {job_no && year && `- Job ${job_no}/${year}`}
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          {currentUser.role === 'Admin'
            ? 'Administrator View - All Audit Data'
            : `User View - ${currentUser.username}'s Activity`}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: colorPalette.primary,
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

      {renderDateFilter()}
      {activeTab === 0 && (
        <>
          {stats && renderSummaryCards()}
          {stats && renderCharts()}
        </>
      )}
      {activeTab === 1 && (
        <>
          {renderAuditTable()}
        </>
      )}
      {activeTab === 2 && stats && (
        <Fade in={true}>
          <Card sx={{
            p: 3,
            background: colorPalette.cardGradient,
            border: `1px solid ${colorPalette.accent}`,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
          }}>
            <Typography variant="h6" sx={{ color: colorPalette.primary, mb: 3 }}>
              Audit Statistics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, backgroundColor: 'white', boxShadow: 1 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: colorPalette.darkBlue }}>
                    Recent Activity
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {(stats.recentActivity || []).map((activity) => (
                      <Box
                        key={activity._id}
                        sx={{
                          mb: 2,
                          p: 2,
                          borderLeft: `3px solid ${actionColors[activity.action] || colorPalette.primary}`,
                          backgroundColor: colorPalette.accent
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: colorPalette.darkBlue }}>
                          {activity.username} - {activity.action}
                        </Typography>
                        <Typography variant="caption" sx={{ color: colorPalette.textSecondary }}>
                          {format(new Date(activity.timestamp), 'dd MMM yyyy HH:mm')}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: colorPalette.darkBlue }}>
                          {activity.changes[0]?.field}: {activity.changes[0]?.changeType}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, backgroundColor: 'white', boxShadow: 1 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, color: colorPalette.darkBlue }}>
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
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats?.actionTypes?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Card>
        </Fade>
      )}


      {pagination.totalPages > 1 && activeTab === 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Typography variant="body2" sx={{ color: colorPalette.darkBlue }}>
            Showing {auditData.length} of {pagination.totalItems} records
          </Typography>
          <Pagination
            count={pagination.totalPages}
            page={filters.page}
            onChange={handlePageChange}
            color="primary"
            sx={{
              '& .MuiPaginationItem-root': {
                color: colorPalette.primary,
                '&.Mui-selected': {
                  backgroundColor: colorPalette.primary,
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

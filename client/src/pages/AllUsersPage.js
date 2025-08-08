import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Skeleton,
  Pagination,
  Grow,
  Avatar,
  Divider,
  Button,
  InputAdornment,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Activity as ActivityIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Color palette (you can adjust these to match your app's theme)
const colorPalette = {
  primary: '#2563eb',
  secondary: '#7c3aed',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  info: '#0891b2',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  background: '#f8fafc',
  surface: '#ffffff'
};

// Glass morphism card style
const glassMorphismCard = {
  background: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 2,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
};

// Animated counter component
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof value === 'number') {
      let start = 0;
      const end = value;
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [value, duration]);

  return typeof value === 'number' ? count : value;
};

// Status indicator component
const StatusIndicator = ({ status, label }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      backgroundColor: status === 'active' ? `${colorPalette.success}22` : `${colorPalette.error}22`,
      color: status === 'active' ? colorPalette.success : colorPalette.error,
      fontWeight: 600,
      fontSize: '0.65rem',
      height: 18
    }}
  />
);

// User card component
const UserCard = ({ user, index, showAllUsers = false }) => {
  const hasActivity = user.count > 0;
  const displayName = user._id;
  const userDetails = user.userDetails || {};
  
  return (
    <Grid item xs={12} sm={6} md={4} lg={3} key={user._id}>
      <Grow in={true} timeout={300 + index * 50}>
        <Card sx={{
          ...glassMorphismCard,
          p: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'all 0.3s ease',
          opacity: !hasActivity && showAllUsers ? 0.7 : 1,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: hasActivity 
              ? `linear-gradient(90deg, ${colorPalette.primary} 0%, ${colorPalette.secondary} 100%)`
              : `linear-gradient(90deg, ${colorPalette.textSecondary} 0%, ${colorPalette.textSecondary}99 100%)`
          }
        }}>
          {/* Header with Avatar and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ 
              bgcolor: hasActivity ? colorPalette.primary : colorPalette.textSecondary, 
              mr: 1.5,
              width: 48,
              height: 48,
              fontSize: '1.2rem',
              fontWeight: 700
            }}>
              {displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700,
                  color: colorPalette.textPrimary,
                  fontSize: '1.1rem',
                  mb: 0.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {displayName}
              </Typography>
              {showAllUsers && (userDetails.first_name || userDetails.last_name) && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: colorPalette.textSecondary,
                    fontSize: '0.7rem',
                    display: 'block',
                    mb: 0.5
                  }}
                >
                  {`${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim()}
                </Typography>
              )}
              <StatusIndicator 
                status={hasActivity ? "active" : "inactive"} 
                label={hasActivity ? "Active" : "No Activity"} 
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Stats Grid */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 800,
                    color: hasActivity ? colorPalette.primary : colorPalette.textSecondary,
                    fontSize: '1.8rem',
                    lineHeight: 1
                  }}
                >
                  <AnimatedCounter value={user.count || 0} />
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: colorPalette.textSecondary,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  Total Actions
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 800,
                    color: hasActivity ? colorPalette.success : colorPalette.textSecondary,
                    fontSize: '1.8rem',
                    lineHeight: 1
                  }}
                >
                  <AnimatedCounter value={user.actions?.length || 0} />
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: colorPalette.textSecondary,
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  Action Types
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Activity Timeline or User Details */}
          <Box sx={{ mt: 'auto' }}>
            {hasActivity ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ScheduleIcon sx={{ color: colorPalette.textSecondary, fontSize: 16, mr: 0.5 }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: colorPalette.textSecondary,
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    Activity Timeline
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: colorPalette.textSecondary,
                      fontSize: '0.65rem'
                    }}
                  >
                    First: {user.firstActivity ? new Date(user.firstActivity).toLocaleDateString() : 'N/A'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: colorPalette.textSecondary,
                      fontSize: '0.65rem'
                    }}
                  >
                    Latest: {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>

                {/* Activity Trend Indicator */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUpIcon sx={{ color: colorPalette.success, fontSize: 14, mr: 0.5 }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: colorPalette.success,
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}
                  >
                    {user.count > 10 ? 'High Activity' : user.count > 5 ? 'Medium Activity' : 'Low Activity'}
                  </Typography>
                </Box>

                {/* Action Types Tags */}
                {user.actions && user.actions.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {user.actions.slice(0, 3).map((action, idx) => (
                      <Chip
                        key={idx}
                        label={action}
                        size="small"
                        sx={{
                          backgroundColor: `${colorPalette.info}22`,
                          color: colorPalette.info,
                          fontSize: '0.6rem',
                          height: 20,
                          '& .MuiChip-label': {
                            padding: '0 6px'
                          }
                        }}
                      />
                    ))}
                    {user.actions.length > 3 && (
                      <Chip
                        label={`+${user.actions.length - 3}`}
                        size="small"
                        sx={{
                          backgroundColor: `${colorPalette.textSecondary}22`,
                          color: colorPalette.textSecondary,
                          fontSize: '0.6rem',
                          height: 20
                        }}
                      />
                    )}
                  </Box>
                )}
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon sx={{ color: colorPalette.textSecondary, fontSize: 16, mr: 0.5 }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: colorPalette.textSecondary,
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    User Details
                  </Typography>
                </Box>
                
                {showAllUsers && (
                  <>
                    {userDetails.role && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: colorPalette.textSecondary,
                          fontSize: '0.65rem',
                          display: 'block'
                        }}
                      >
                        Role: {userDetails.role}
                      </Typography>
                    )}
                    {userDetails.company && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: colorPalette.textSecondary,
                          fontSize: '0.65rem',
                          display: 'block'
                        }}
                      >
                        Company: {userDetails.company}
                      </Typography>
                    )}
                  </>
                )}
                
                <Chip
                  label="No audit activity"
                  size="small"
                  sx={{
                    backgroundColor: `${colorPalette.textSecondary}22`,
                    color: colorPalette.textSecondary,
                    fontSize: '0.6rem',
                    height: 20,
                    mt: 1
                  }}
                />
              </>
            )}
          </Box>
        </Card>
      </Grow>
    </Grid>
  );
};

const AllUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    username: '',
    sortBy: 'count',
    sortOrder: 'desc',
    fromDate: '',
    toDate: '',
    showAllUsers: false // Toggle between active users only vs all system users
  });

  // Fetch users data
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'showAllUsers') queryParams.append(key, value);
      });

      // Choose endpoint based on toggle
      const endpoint = filters.showAllUsers 
        ? 'audit-trail/all-system-users' 
        : 'audit-trail/all-active-users';

      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/${endpoint}?${queryParams}`
      );
      const data = await response.json();
      
      // Debug logging
      console.log('API Response:', data);
      console.log('Endpoint used:', endpoint);
      console.log('Total users:', data.pagination?.totalItems);
      console.log('Debug info:', data.debug);
      console.log('Current filters:', filters);
      
      setUsers(data.users || []);
      setPagination(data.pagination || {});
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    handleFilterChange('page', newPage);
  };

  // Export functionality (placeholder)
  const handleExport = () => {
    console.log('Export users data');
    // Implement export functionality
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={() => navigate(-1)} 
              sx={{ mr: 1, color: colorPalette.textSecondary }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 800, color: colorPalette.textPrimary }}>
              All Users Activity
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchUsers}
              sx={{ color: colorPalette.primary, borderColor: colorPalette.primary }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              sx={{ bgcolor: colorPalette.primary }}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ ...glassMorphismCard, p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search users..."
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: colorPalette.textSecondary }} />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="count">Activity Count</MenuItem>
                  <MenuItem value="lastActivity">Last Activity</MenuItem>
                  <MenuItem value="firstActivity">First Activity</MenuItem>
                  {filters.showAllUsers && <MenuItem value="username">Username</MenuItem>}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Order</InputLabel>
                <Select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  label="Order"
                >
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={filters.showAllUsers}
              />
            </Grid>

            <Grid item xs={12} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={filters.showAllUsers}
              />
            </Grid>

            <Grid item xs={12} md={1}>
              <FormControl fullWidth size="small">
                <InputLabel>Per Page</InputLabel>
                <Select
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', e.target.value)}
                  label="Per Page"
                >
                  <MenuItem value={12}>12</MenuItem>
                  <MenuItem value={24}>24</MenuItem>
                  <MenuItem value={48}>48</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={1.5}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.showAllUsers}
                    onChange={(e) => handleFilterChange('showAllUsers', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    All System Users
                  </Typography>
                }
                sx={{ 
                  flexDirection: 'column',
                  alignItems: 'center',
                  margin: 0,
                  '& .MuiFormControlLabel-label': {
                    marginTop: 0.5
                  }
                }}
              />
            </Grid>
          </Grid>
        </Card>
      </Box>

      {/* Stats Summary */}
      <Card sx={{ ...glassMorphismCard, p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: colorPalette.primary }}>
                <AnimatedCounter value={pagination.totalItems || 0} />
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
                Total Active Users
              </Typography>
              <Typography variant="caption" sx={{ color: colorPalette.textSecondary, fontSize: '0.7rem' }}>
                (Users with audit trail activity)
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: colorPalette.success }}>
                <AnimatedCounter value={users.length} />
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
                Showing Users
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: colorPalette.warning }}>
                <AnimatedCounter value={pagination.currentPage || 1} />
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
                Current Page
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: colorPalette.info }}>
                <AnimatedCounter value={pagination.totalPages || 1} />
              </Typography>
              <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
                Total Pages
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {/* Debug Info */}
        
      </Card>

      {/* Users Grid */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(12)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card sx={{ ...glassMorphismCard, p: 2.5, height: 280 }}>
                <Skeleton variant="circular" width={48} height={48} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="80%" height={16} />
                <Skeleton variant="text" width="60%" height={16} />
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : users.length > 0 ? (
        <>
          <Grid container spacing={2}>
            {users.map((user, index) => (
              <UserCard 
                key={user._id} 
                user={user} 
                index={index} 
                showAllUsers={filters.showAllUsers}
              />
            ))}
          </Grid>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      ) : (
        <Card sx={{ ...glassMorphismCard, p: 4, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 64, color: colorPalette.textSecondary, mb: 2 }} />
          <Typography variant="h6" sx={{ color: colorPalette.textSecondary, mb: 1 }}>
            No users found
          </Typography>
          <Typography variant="body2" sx={{ color: colorPalette.textSecondary }}>
            Try adjusting your filters or date range
          </Typography>
        </Card>
      )}
    </Container>
  );
};

export default AllUsersPage;

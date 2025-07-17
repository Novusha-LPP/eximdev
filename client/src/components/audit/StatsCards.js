import React, { useEffect, useState } from 'react';
import { Grid, Card, Box, Typography, Chip, Grow } from '@mui/material';
import { 
  Timeline as TimelineIcon, 
  Person as PersonIcon, 
  Security as SecurityIcon, 
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  Description as DocumentIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon
} from '@mui/icons-material';

const StatsCards = ({ stats, colorPalette, glassMorphismCard, AnimatedCounter, StatusIndicator }) => {
  // Helper function to get the most common action
  const getMostCommonAction = () => {
    if (!stats?.actionBreakdown || stats.actionBreakdown.length === 0) return 'N/A';
    const sortedActions = [...stats.actionBreakdown].sort((a, b) => b.count - a.count);
    return sortedActions[0]._id;
  };

  // Helper function to calculate success rate (assuming all actions are successful for now)
  const calculateSuccessRate = () => {
    if (!stats?.summary?.totalActions) return 0;
    // You can modify this logic based on your actual success/failure tracking
    return Math.round((stats.summary.totalActions / (stats.summary.totalActions + 0)) * 100);
  };

  // Helper function to get trend indicator (mock data for now)
  const getTrendIndicator = (type) => {
    // This would ideally come from comparing with previous period data
    const trends = {
      actions: '+12%',
      users: stats?.summary?.totalUsers > 1 ? '+5%' : '0%',
      documents: stats?.summary?.totalDocuments > 5 ? '+8%' : '+2%',
      rate: '+3%'
    };
    return trends[type] || '0%';
  };

  // Dynamic stats configuration
  const statsConfig = [
    {
      title: 'Total Actions',
      value: stats?.summary?.totalActions || 0,
      icon: TimelineIcon,
      color: colorPalette.primary,
      trend: getTrendIndicator('actions'),
      description: 'All recorded activities'
    },
    {
      title: 'Active Users',
      value: stats?.summary?.totalUsers || 0,
      icon: PersonIcon,
      color: colorPalette.success,
      trend: getTrendIndicator('users'),
      description: 'Users with activity'
    },
    {
      title: 'Documents Modified',
      value: stats?.summary?.totalDocuments || 0,
      icon: DocumentIcon,
      color: colorPalette.secondary,
      trend: getTrendIndicator('documents'),
      description: 'Unique documents changed'
    },
    {
      title: 'Most Common Action',
      value: getMostCommonAction(),
      displayValue: getMostCommonAction(),
      icon: AnalyticsIcon,
      color: colorPalette.warning,
      trend: getTrendIndicator('rate'),
      description: 'Primary activity type',
      isText: true
    }
  ];

  // Additional stats for expanded view
  const expandedStats = [
    {
      title: 'Daily Activity',
      value: stats?.dailyActivity?.length || 0,
      icon: EventIcon,
      color: colorPalette.primary,
      trend: '+2%',
      description: 'Days with activity'
    },
    {
      title: 'Action Types',
      value: stats?.actionTypes?.length || 0,
      icon: TrendingUpIcon,
      color: colorPalette.success,
      trend: '+1%',
      description: 'Different action types'
    }
  ];

  // Combine stats based on available data
  const displayStats = stats?.summary ? statsConfig : statsConfig.slice(0, 2);

  // Top users state for API
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_STRING}/audit-trail/top-users`)
      .then(res => res.json())
      .then(data => setTopUsers(data.topUsers || []));
  }, []);

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {displayStats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={displayStats.length <= 4 ? 3 : 2} key={index}>
          <Grow in={true} timeout={300 + index * 100}>
            <Card sx={{
              ...glassMorphismCard,
              p: 3,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 140,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}99 100%)`
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: `${stat.color}22`, 
                  mr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <stat.icon sx={{ color: stat.color, fontSize: 24 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: colorPalette.textPrimary, 
                      mb: 0.5,
                      fontSize: stat.isText ? '1.5rem' : '2rem'
                    }}
                  >
                    {stat.isText ? (
                      stat.displayValue
                    ) : (
                      <AnimatedCounter value={stat.value} />
                    )}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: colorPalette.textSecondary, 
                      fontSize: '0.875rem',
                      fontWeight: 500
                    }}
                  >
                    {stat.title}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Chip 
                  label={stat.trend} 
                  size="small" 
                  sx={{ 
                    backgroundColor: `${stat.color}22`, 
                    color: stat.color, 
                    fontWeight: 600, 
                    fontSize: '0.75rem',
                    '& .MuiChip-label': {
                      padding: '0 8px'
                    }
                  }} 
                />
                <StatusIndicator status="active" label="Live" />
              </Box>
              
              <Typography 
                variant="caption" 
                sx={{ 
                  color: colorPalette.textSecondary, 
                  fontSize: '0.75rem',
                  display: 'block',
                  mt: 1,
                  opacity: 0.8
                }}
              >
                {stat.description}
              </Typography>
            </Card>
          </Grow>
        </Grid>
      ))}
      
      {/* Additional Action Breakdown Cards */}
      {/* {stats?.actionBreakdown && stats.actionBreakdown.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, color: colorPalette.textPrimary, fontWeight: 600 }}>
            Action Breakdown
          </Typography>
          <Grid container spacing={2}>
            {stats.actionBreakdown.map((action, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Grow in={true} timeout={500 + index * 100}>
                  <Card sx={{
                    ...glassMorphismCard,
                    p: 2,
                    textAlign: 'center',
                    minHeight: 100,
                    border: `1px solid ${colorPalette.primary}22`
                  }}>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 700, 
                        color: colorPalette.primary,
                        mb: 1
                      }}
                    >
                      <AnimatedCounter value={action.count} />
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: colorPalette.textSecondary,
                        textTransform: 'capitalize'
                      }}
                    >
                      {action._id.toLowerCase()} Actions
                    </Typography>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )} */}
      
      {/* Top Users Section (from API) */}
      {topUsers.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2, color: colorPalette.textPrimary, fontWeight: 600 }}>
            Top Active Users
          </Typography>
          <Grid container spacing={2}>
            {topUsers.map((user, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Grow in={true} timeout={600 + index * 100}>
                  <Card sx={{
                    ...glassMorphismCard,
                    p: 2,
                    textAlign: 'center',
                    minHeight: 100,
                    border: `1px solid ${colorPalette.success}22`
                  }}>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 700, 
                        color: colorPalette.success,
                        mb: 1
                      }}
                    >
                      <AnimatedCounter value={user.count} />
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: colorPalette.textSecondary,
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      {user._id}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: colorPalette.textSecondary,
                        fontSize: '0.75rem',
                        display: 'block',
                        mt: 0.5
                      }}
                    >
                      Last: {new Date(user.lastActivity).toLocaleDateString()}
                    </Typography>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};

export default StatsCards;
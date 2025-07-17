import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, InputAdornment } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

const AuditFilters = ({
  filters,
  setFilters,
  handleDateChange,
  user,
  userFilter,
  handleUserFilterChange,
  userList,
  refreshing,
  fetchAuditTrail,
  fetchStats,
  colorPalette,
  handleResetFilters
}) => (
  <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
    <Grid item xs={12} sm={3} md={2}>
      <TextField
        fullWidth
        label="Search"
        value={filters.search}
        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: colorPalette.textSecondary }} />
            </InputAdornment>
          )
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: colorPalette.primary + '04',
            '&:hover': {
              backgroundColor: colorPalette.primary + '08'
            }
          }
        }}
      />
    </Grid>
    <Grid item xs={12} sm={2} md={2}>
      <FormControl fullWidth>
        <InputLabel>Action Type</InputLabel>
        <Select
          value={filters.action}
          label="Action Type"
          onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
          sx={{
            borderRadius: 2,
            backgroundColor: colorPalette.primary + '04'
          }}
        >
          <MenuItem value="">All Actions</MenuItem>
          <MenuItem value="CREATE">Create</MenuItem>
          <MenuItem value="UPDATE">Update</MenuItem>
          <MenuItem value="DELETE">Delete</MenuItem>
          <MenuItem value="VIEW">View</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} sm={2} md={2}>
      <TextField
        fullWidth
        label="From Date"
        type="date"
        value={filters.fromDate}
        onChange={(e) => handleDateChange('fromDate', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: colorPalette.primary + '04'
          }
        }}
      />
    </Grid>
    <Grid item xs={12} sm={2} md={2}>
      <TextField
        fullWidth
        label="To Date"
        type="date"
        value={filters.toDate}
        onChange={(e) => handleDateChange('toDate', e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: colorPalette.primary + '04'
          }
        }}
      />
    </Grid>
    {user.role === 'Admin' && (
      <Grid item xs={12} sm={2} md={2}>
        <FormControl fullWidth>
          <InputLabel>User</InputLabel>
          <Select
            value={userFilter}
            label="User"
            onChange={handleUserFilterChange}
            sx={{
              borderRadius: 2,
              backgroundColor: colorPalette.primary + '04'
            }}
          >
            <MenuItem value="">All Users</MenuItem>
            {userList.map((user) => (
              <MenuItem key={user.value} value={user.value}>
                {user.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    )}
    <Grid item xs={12} sm={1} md={2}>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={() => {
          fetchAuditTrail();
          fetchStats();
        }}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          borderColor: colorPalette.primary,
          color: colorPalette.primary,
          '&:hover': {
            borderColor: colorPalette.primary,
            backgroundColor: colorPalette.primary + '04'
          }
        }}
      >
        {refreshing ? <CircularProgress size={20} /> : 'Refresh'}
      </Button>
    </Grid>
    <Grid item xs={12} sm={1} md={1}>
      <Button
        onClick={handleResetFilters}
        variant="outlined"
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          borderColor: colorPalette.primary,
          color: colorPalette.primary,
          '&:hover': {
            borderColor: colorPalette.primary,
            backgroundColor: colorPalette.primary + '04'
          }
        }}
      >
        Reset
      </Button>
    </Grid>
  </Grid>
);

export default AuditFilters;

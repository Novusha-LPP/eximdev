import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Grid,
  Avatar,
  Divider,
  IconButton,  InputAdornment,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  PendingActions,
  AttachMoney,
  Schedule,
  Search,
  FilterList,
  Download,
  Refresh,
} from "@mui/icons-material";
import axios from "axios";

function BillingPending() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("25-26");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchBillingPendingData();
  }, [debouncedSearchTerm, selectedYear]);const fetchBillingPendingData = async () => {
    try {
      setLoading(true);
      // Fetch jobs with billing pending status using the updated backend API
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/api/report/billing-pending`, {
        params: {
          year: selectedYear
        }
      });
      // The backend now returns { success, data, count }
      setData(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching billing pending data:", err);
      setError("Failed to fetch billing pending data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };  // Since we're searching on the server side, we don't need to filter here
  // but we can still do client-side filtering for immediate feedback
  const filteredData = data.filter(
    (item) =>
      !searchTerm || // If no search term, show all data from API
      item.job_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.importer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.awb_bl_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  



  const calculateDaysPending = (job) => {
    // Calculate days since completion or relevant date
    let referenceDate = null;
    
    if (job.out_of_charge) {
      referenceDate = new Date(job.out_of_charge);
    } else if (job.be_date) {
      referenceDate = new Date(job.be_date);
    } else if (job.awb_bl_date) {
      referenceDate = new Date(job.awb_bl_date);
    } else {
      return 0;
    }
    
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - referenceDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  const getBillingStatus = (job) => {
    const daysPending = calculateDaysPending(job);
    
    if (job.billing_completed_date) {
      return 'completed';
    } else if (daysPending > 30) {
      return 'overdue';
    } else if (daysPending > 15) {
      return 'urgent';
    } else {
      return 'pending';
    }
  };

  const calculateDueDate = (job) => {
    // Calculate due date (e.g., 15 days from out of charge or BE date)
    let referenceDate = null;
    
    if (job.out_of_charge) {
      referenceDate = new Date(job.out_of_charge);
    } else if (job.be_date) {
      referenceDate = new Date(job.be_date);
    } else if (job.awb_bl_date) {
      referenceDate = new Date(job.awb_bl_date);
    } else {
      return null;
    }
    
    const dueDate = new Date(referenceDate);
    dueDate.setDate(dueDate.getDate() + 15); // 15 days from reference date
    
    return dueDate;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'urgent':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const StatsCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', boxShadow: 2, borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 4 }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Loading billing pending data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: 'grey.50', p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Billing Pending Jobs
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor and track jobs with pending billing status
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={fetchBillingPendingData}
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
            >
              <Refresh />
            </IconButton>
            <IconButton sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}>
              <Download />
            </IconButton>
            <IconButton sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}>
              <FilterList />
            </IconButton>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Pending Jobs"
              value={filteredData.length}
              icon={<PendingActions />}
              color="#ff9800"
              subtitle="Jobs awaiting billing"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            
          </Grid>          
          
        </Grid>
      </Box>      {/* Search and Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 120, bgcolor: 'white' }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            label="Year"
            size="small"
          >
            <MenuItem value="24-25">2024-25</MenuItem>
            <MenuItem value="25-26">2025-26</MenuItem>
            <MenuItem value="23-24">2023-24</MenuItem>
          </Select>
        </FormControl>
        <TextField
          variant="outlined"
          placeholder="Search by Job No, Importer, or AWB/BL No..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ 
            flexGrow: 1, 
            bgcolor: 'white',
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table sx={{ minWidth: 650 }}>              <TableHead sx={{ bgcolor: 'grey.100' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Job No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Importer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>AWB/BL No</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => (
                    <TableRow 
                      key={index} 
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        '&:hover': { bgcolor: 'grey.50' }
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                          {row.job_no || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {row.importer || 'N/A'}
                        </Typography>
                      </TableCell>                      <TableCell>
                        <Typography variant="body2">
                          {row.awb_bl_no || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(row.due_date || calculateDueDate(row))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <PendingActions sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          No Billing Pending Jobs Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? 'Try adjusting your search criteria' : 'All jobs have been billed successfully'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}

export default BillingPending;

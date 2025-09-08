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
  IconButton,
  InputAdornment,
  TextField,
  Autocomplete,
  TablePagination,
} from "@mui/material";
import {
  TrendingUp,
  Warning,
  AccountBalance,
  Search,
  FilterList,
  Download,
  Refresh,
} from "@mui/icons-material";
import axios from "axios";

function Penalty() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importerNames, setImporterNames] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchPenaltyData();
  }, []);
  const fetchPenaltyData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/report/penalty`);
      setData(response.data.data || []);
      
      // Extract unique importer names for the dropdown
      const uniqueImporters = [...new Set((response.data.data || [])
        .map(job => job.importer)
        .filter(importer => importer && importer.trim() !== ""))]
        .sort()
        .map(importer => ({ label: importer }));
      
      setImporterNames(uniqueImporters);
      setError(null);
    } catch (err) {
      setError("Failed to fetch penalty data");
      console.error("Error fetching penalty data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return numAmount > 0 ? `₹${numAmount.toLocaleString()}` : "-";
  };

  // Calculate summary metrics
  const totalInterest = data.reduce((sum, job) => sum + (parseFloat(job.intrest_ammount) || 0), 0);
  const totalFines = data.reduce((sum, job) => sum + (parseFloat(job.fine_amount) || 0), 0);
  const totalPenalties = data.reduce((sum, job) => sum + (parseFloat(job.penalty_amount) || 0), 0);
  const totalAmount = totalInterest + totalFines + totalPenalties;
  // Filter data based on search term and selected importer
  const filteredData = data.filter(job => {
    const matchesSearch = job.job_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.importer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesImporter = !selectedImporter || job.importer === selectedImporter;
    return matchesSearch && matchesImporter;
  });

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get paginated data
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedImporter]);

  const MetricCard = ({ title, value, icon, color, subtitle }) => (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}20`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 25px ${color}25`,
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
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
          Loading penalty data...
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
              Penalty Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor and track penalty amounts across all jobs
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={fetchPenaltyData}
              sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
            >
              <Refresh />
            </IconButton>
            <IconButton sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}>
              <Download />
            </IconButton>
          </Box>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              borderRadius: 2,
              '& .MuiAlert-icon': { fontSize: 20 }
            }}
          >
            {error}
          </Alert>
        )}
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Jobs"
            value={data.length}
            icon={<AccountBalance />}
            color="#1976d2"
            subtitle="with penalties"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Interest"
            value={formatAmount(totalInterest)}
            icon={<TrendingUp />}
            color="#f57c00"
            subtitle="accumulated"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Fines"
            value={formatAmount(totalFines)}
            icon={<Warning />}
            color="#d32f2f"
            subtitle="imposed"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Penalties"
            value={formatAmount(totalPenalties)}
            icon={<Warning />}
            color="#7b1fa2"
            subtitle="outstanding"
          />
        </Grid>
      </Grid>

      {/* Main Content Card */}
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {/* Table Header */}
          <Box sx={{ p: 3, pb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Jobs with Penalties
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed view of all jobs with penalty amounts
                </Typography>
              </Box>              <Chip 
                label={filteredData.length > 0 
                  ? `Showing ${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredData.length)} of ${filteredData.length} Jobs`
                  : `${filteredData.length} of ${data.length} Jobs`
                } 
                color="primary" 
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Autocomplete
                sx={{ width: "300px", marginRight: "20px" }}
                freeSolo
                options={importerNames.map((option) => option.label)}
                value={selectedImporter || ""} // Controlled value
                onInputChange={(event, newValue) => setSelectedImporter(newValue)} // Handles input change
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    size="small"
                    fullWidth
                    label="Select Importer" // Placeholder text
                  />
                )}
              />
              <TextField
                placeholder="Search by job number..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flexGrow: 1, maxWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <IconButton 
                sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
                onClick={() => {
                  setSelectedImporter("");
                  setSearchTerm("");
                }}
                title="Clear filters"
              >
                <FilterList />
              </IconButton>
            </Box>
          </Box>
          
          <Divider />
          
          {filteredData.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Warning sx={{ fontSize: 48, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                {searchTerm ? 'No matching results' : 'No penalties found'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'No jobs found with penalty amounts greater than 0.'
                }
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', py: 2 }}>
                      Job Details
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', textAlign: "right", py: 2 }}>
                      Interest Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', textAlign: "right", py: 2 }}>
                      Fine Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', textAlign: "right", py: 2 }}>
                      Penalty Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.50', textAlign: "right", py: 2 }}>
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((job, index) => {
                    const jobTotal = (parseFloat(job.intrest_ammount) || 0) + 
                                   (parseFloat(job.fine_amount) || 0) + 
                                   (parseFloat(job.penalty_amount) || 0);
                    
                    return (
                      <TableRow 
                        key={job._id || index}
                        hover
                        sx={{ 
                          "&:hover": { bgcolor: 'grey.50' },
                          "&:last-child td": { border: 0 }
                        }}
                      >
                        <TableCell sx={{ py: 2 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {job.job_no || "-"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {job.importer || "-"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2 }}>
                          <Chip
                            label={formatAmount(job.intrest_ammount)}
                            size="small"
                            color={parseFloat(job.intrest_ammount) > 0 ? "warning" : "default"}
                            variant={parseFloat(job.intrest_ammount) > 0 ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2 }}>
                          <Chip
                            label={formatAmount(job.fine_amount)}
                            size="small"
                            color={parseFloat(job.fine_amount) > 0 ? "error" : "default"}
                            variant={parseFloat(job.fine_amount) > 0 ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2 }}>
                          <Chip
                            label={formatAmount(job.penalty_amount)}
                            size="small"
                            color={parseFloat(job.penalty_amount) > 0 ? "secondary" : "default"}
                            variant={parseFloat(job.penalty_amount) > 0 ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 2 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: jobTotal > 0 ? 'error.main' : 'text.secondary'
                            }}
                          >
                            {formatAmount(jobTotal)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>            </TableContainer>
          )}
          
          {/* Pagination - only show when there's data */}
          {filteredData.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ 
                borderTop: '1px solid #e0e0e0',
                bgcolor: 'grey.50',
                '& .MuiTablePagination-toolbar': {
                  px: 3,
                  py: 2
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Penalty;
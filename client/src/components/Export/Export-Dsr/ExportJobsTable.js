import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TablePagination, TextField, Box, Typography, Chip, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent, Button
} from '@mui/material';
import { Edit, Delete, Visibility, Refresh, Download } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import axios from 'axios';

const ExportJobsTable = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    search: '', exporter: '', country: '', movement_type: ''
  });

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/exports`, {
        params: { page: page + 1, limit: rowsPerPage, ...filters }
      });
      if (response.data.success) {
        setJobs(response.data.data.jobs);
        setTotalCount(response.data.data.pagination.totalCount);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, rowsPerPage, filters]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd-MM-yyyy');
    } catch {
      return dateString;
    }
  };

  const columns = [
    { id: 'job_no', label: 'Job Number', minWidth: 120 },
    { id: 'exporter_name', label: 'Exporter', minWidth: 200 },
    { id: 'consignee_name', label: 'Consignee Name', minWidth: 200 },
    { id: 'port_of_origin', label: 'Port of Origin', minWidth: 150 },
    { id: 'port_of_discharge', label: 'Port of Destination', minWidth: 150 },
    { id: 'country_of_final_destination', label: 'Country', minWidth: 120 },
    { id: 'movement_type', label: 'LCL/FCL/AIR', minWidth: 100 },
    { id: 'cntr_size', label: 'CNTR 20/40', minWidth: 100 },
    { id: 'commercial_invoice_number', label: 'Invoice No', minWidth: 120 },
    { id: 'commercial_invoice_date', label: 'Invoice Date', minWidth: 120 },
    { id: 'commercial_invoice_value', label: 'Invoice Value', minWidth: 120 },
    { id: 'shipping_bill_number', label: 'SB Number', minWidth: 120 },
    { id: 'shipping_bill_date', label: 'SB Date', minWidth: 120 },
    { id: 'total_packages', label: 'No of Packages', minWidth: 120 },
    { id: 'net_weight_kg', label: 'Net Weight Kgs', minWidth: 130 },
    { id: 'gross_weight_kg', label: 'Gross Weight Kgs', minWidth: 140 },
    { id: 'container_placement_date_factory', label: 'Container Placement', minWidth: 160 },
    { id: 'original_docs_received_date', label: 'Original Docs Received', minWidth: 180 },
    { id: 'gate_in_thar_khodiyar_date', label: 'Gate In Thar/Khodiyar', minWidth: 180 },
    { id: 'hand_over_date', label: 'Hand Over Date', minWidth: 140 },
    { id: 'rail_out_date_plan', label: 'Rail Out Plan', minWidth: 140 },
    { id: 'rail_out_date_actual', label: 'Rail Out Actual', minWidth: 150 },
    { id: 'port_gate_in_date', label: 'Port Gate In', minWidth: 140 },
    { id: 'tracking_remarks', label: 'Remarks', minWidth: 250 }
  ];

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Export Jobs Management</Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={fetchJobs}>
          Refresh
        </Button>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filters</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Search" 
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Movement Type</InputLabel>
                <Select
                  value={filters.movement_type}
                  onChange={(e) => setFilters({...filters, movement_type: e.target.value})}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="FCL">FCL</MenuItem>
                  <MenuItem value="LCL">LCL</MenuItem>
                  <MenuItem value="AIR">AIR</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.id} style={{ minWidth: column.minWidth, fontWeight: 'bold' }}>
                    {column.label}
                  </TableCell>
                ))}
                <TableCell style={{ minWidth: 120, fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow hover key={job._id}>
                  {columns.map((column) => {
                    let value = job[column.id];
                    if (column.id.includes('date') && value) {
                      value = formatDate(value);
                    } else if (column.id === 'movement_type') {
                      value = <Chip label={value || 'N/A'} size="small" color="primary" />;
                    } else if (!value) {
                      value = '-';
                    }
                    return <TableCell key={column.id}>{value}</TableCell>;
                  })}
                  <TableCell>
                    <Tooltip title="View">
                      <IconButton size="small" color="info">
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {setRowsPerPage(parseInt(e.target.value)); setPage(0);}}
        />
      </Paper>
    </Box>
  );
};

export default ExportJobsTable;

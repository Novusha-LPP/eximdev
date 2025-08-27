import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Search,
  Visibility,
  Edit
} from '@mui/icons-material';

const MasterEntriesView = () => {
  const [masterTypes, setMasterTypes] = useState([]);
  const [masterEntries, setMasterEntries] = useState([]);
  const [selectedMasterType, setSelectedMasterType] = useState('');
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMasterTypes();
    fetchMasterEntries();
  }, []);

  useEffect(() => {
    if (selectedMasterType && masterEntries.length > 0) {
      const filtered = masterEntries.filter(entry => 
        entry.masterTypeName === selectedMasterType
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries([]);
    }
  }, [selectedMasterType, masterEntries]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = filteredEntries.filter(entry => 
        entry.defaultFields.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.defaultFields.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEntries(filtered);
    } else if (selectedMasterType) {
      const filtered = masterEntries.filter(entry => 
        entry.masterTypeName === selectedMasterType
      );
      setFilteredEntries(filtered);
    }
  }, [searchTerm]);

  const fetchMasterTypes = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_STRING}/master-types`);
      const data = await response.json();
      setMasterTypes(data);
    } catch (error) {
      console.error('Error fetching master types:', error);
    }
  };

  const fetchMasterEntries = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_STRING}/masters`);
      const data = await response.json();
      setMasterEntries(data);
    } catch (error) {
      console.error('Error fetching master entries:', error);
    }
  };

  const handleMasterTypeChange = (event) => {
    setSelectedMasterType(event.target.value);
    setSearchTerm('');
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (daysUntilDue) => {
    if (daysUntilDue === null) return 'default';
    if (daysUntilDue < 0) return 'error';
    if (daysUntilDue <= 7) return 'warning';
    return 'success';
  };

  const handleViewEntry = (entry) => {
    // Implement view functionality
    console.log('View entry:', entry);
  };

  const handleEditEntry = (entry) => {
    // Implement edit functionality
    console.log('Edit entry:', entry);
  };

  return (
    <Box sx={{ 
      p: 3, 
      maxWidth: 1400, 
      mx: 'auto',
      bgcolor: '#f8fafc',
      minHeight: '100vh'
    }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
        Master Entries View
      </Typography>

      {/* Filters Section */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 3, 
          mb: 3,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          background: 'white'
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Select Master Type</InputLabel>
            <Select
              value={selectedMasterType}
              label="Select Master Type"
              onChange={handleMasterTypeChange}
            >
              {masterTypes.map((type) => (
                <MenuItem key={type.name} value={type.name}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            placeholder="Search entries..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
            disabled={!selectedMasterType}
          />
        </Box>
      </Paper>

      {/* Results Section */}
      {selectedMasterType && (
        <Paper 
          elevation={1} 
          sx={{ 
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            background: 'white'
          }}
        >
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f8fafc', 
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              {selectedMasterType} Entries ({filteredEntries.length})
            </Typography>
          </Box>

          {filteredEntries.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                {searchTerm ? 'No entries match your search' : 'No entries found for this master type'}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                      Company
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                      Address
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                      Billing Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                      Due Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#f8fafc', color: '#475569', width: 120 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    const daysUntilDue = getDaysUntilDue(entry.defaultFields.dueDate);
                    const statusColor = getStatusColor(daysUntilDue);
                    
                    return (
                      <TableRow key={entry._id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entry.defaultFields.companyName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {entry.defaultFields.address || 'Not provided'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(entry.defaultFields.billingDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(entry.defaultFields.dueDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {daysUntilDue !== null && (
                            <Chip
                              size="small"
                              label={
                                daysUntilDue < 0 
                                  ? `Overdue ${Math.abs(daysUntilDue)}d`
                                  : `${daysUntilDue}d left`
                              }
                              color={statusColor}
                              sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              size="small"
                              onClick={() => handleViewEntry(entry)}
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: '#e0f2fe',
                                  color: '#0277bd'
                                }
                              }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditEntry(entry)}
                              sx={{ 
                                '&:hover': { 
                                  bgcolor: '#fff3e0',
                                  color: '#ef6c00'
                                }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* No Selection State */}
      {!selectedMasterType && (
        <Paper 
          elevation={2} 
          sx={{ 
            p: 8, 
            textAlign: 'center',
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            background: 'white'
          }}
        >
          <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
            Select a Master Type
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1.1rem', maxWidth: 600, mx: 'auto' }}>
            Choose a master type from the dropdown above to view its entries in an Excel-like format.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MasterEntriesView;
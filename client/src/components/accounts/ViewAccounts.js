import React, { useState, useEffect } from "react";
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
  InputAdornment,
  Card,
  CardContent,
  Avatar,
  Badge,
  Tooltip,
  Stack,
  Checkbox,
  Grid,
} from "@mui/material";
import {
  Search,
  Visibility,
  Edit,
  AccountCircle,
  Business,
  CalendarToday,
  Warning,
  CheckCircle,
  Error,
} from "@mui/icons-material";

const MasterEntriesView = () => {
  const [masterEntries, setMasterEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [selectedMasterType, setSelectedMasterType] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [companyList, setCompanyList] = useState([]);

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    masterEntries,
    selectedMasterType,
    selectedCompany,
    paymentStatusFilter,
    searchQuery,
  ]);

  const loadEntries = () => {
    const entries = JSON.parse(localStorage.getItem("masterEntries")) || [];
    setMasterEntries(entries);
    
    // Extract unique companies
    const companies = [...new Set(entries.map((e) => e.companyName))];
    setCompanyList(companies);
  };

  const applyFilters = () => {
    let filtered = [...masterEntries];

    // Filter by master type
    if (selectedMasterType) {
      filtered = filtered.filter(
        (entry) => entry.masterType === selectedMasterType
      );
    }

    // Filter by company
    if (selectedCompany) {
      filtered = filtered.filter(
        (entry) => entry.companyName === selectedCompany
      );
    }

    // Filter by payment status
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((entry) => {
        const status = getPaymentStatus(entry);
        return status === paymentStatusFilter;
      });
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (entry) =>
          entry.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.masterType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by due date (newest first)
    filtered.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    setFilteredEntries(filtered);
  };

  const getPaymentStatus = (entry) => {
    if (entry.isPaid) return "paid";

    const today = new Date();
    const dueDate = new Date(entry.dueDate);

    if (dueDate < today) return "overdue";
    return "unpaid";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "success";
      case "overdue":
        return "error";
      case "unpaid":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle />;
      case "overdue":
        return <Error />;
      case "unpaid":
        return <Warning />;
      default:
        return null;
    }
  };

  const handlePaymentToggle = (entry) => {
    if (entry.isPaid) {
      alert("Payment already recorded!");
      return;
    }

    const updatedEntry = {
      ...entry,
      isPaid: true,
      paymentStatus: "paid",
      paymentDate: new Date().toISOString(),
    };

    // Generate next month's entry
    const nextMonthEntry = generateNextMonthEntry(updatedEntry);

    // Update entries
    const updatedEntries = masterEntries.map((e) =>
      e.id === entry.id ? updatedEntry : e
    );
    updatedEntries.push(nextMonthEntry);

    localStorage.setItem("masterEntries", JSON.stringify(updatedEntries));
    loadEntries();
  };

  const calculateNextDueDate = (currentDueDate) => {
    const date = new Date(currentDueDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split("T")[0];
  };

  const generateNextMonthEntry = (currentEntryData) => {
    const nextDueDate = calculateNextDueDate(currentEntryData.dueDate);
    return {
      ...currentEntryData,
      id: Date.now() + Math.random(),
      dueDate: nextDueDate,
      paymentStatus: "unpaid",
      paymentDate: null,
      isPaid: false,
      createdAt: new Date().toISOString(),
    };
  };

  const getStatistics = () => {
    const paid = filteredEntries.filter((e) => e.isPaid).length;
    const overdue = filteredEntries.filter(
      (e) => getPaymentStatus(e) === "overdue"
    ).length;
    const unpaid = filteredEntries.filter(
      (e) => getPaymentStatus(e) === "unpaid"
    ).length;

    return { paid, overdue, unpaid, total: filteredEntries.length };
  };

  const stats = getStatistics();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Statistics */}
      <Typography variant="h4" gutterBottom>
        Payment Entries Overview
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Entries
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: "success.main" }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.paid}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paid
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: "warning.main" }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.unpaid}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unpaid
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: "error.main" }}>
                  <Error />
                </Avatar>
                <Box>
                  <Typography variant="h4">{stats.overdue}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Master Type</InputLabel>
              <Select
                value={selectedMasterType}
                onChange={(e) => setSelectedMasterType(e.target.value)}
                label="Master Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="Rent">Rent</MenuItem>
                <MenuItem value="Subscription">Subscription</MenuItem>
                <MenuItem value="Utilities">Utilities</MenuItem>
                <MenuItem value="Insurance">Insurance</MenuItem>
                <MenuItem value="Maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Company</InputLabel>
              <Select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                label="Company"
              >
                <MenuItem value="">All Companies</MenuItem>
                {companyList.map((company, index) => (
                  <MenuItem key={index} value={company}>
                    {company}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                label="Payment Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="unpaid">Unpaid</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Entries Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Payment Done</TableCell>
              <TableCell>Payment Date</TableCell>
              <TableCell>Contact</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 3 }}>
                    No entries found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const status = getPaymentStatus(entry);
                return (
                  <TableRow
                    key={entry.id}
                    sx={{
                      backgroundColor: entry.isPaid ? "#f5f5f5" : "inherit",
                      opacity: entry.isPaid ? 0.8 : 1,
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Business fontSize="small" color="primary" />
                        <Typography variant="body2">
                          {entry.companyName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={entry.masterType} size="small" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday fontSize="small" />
                        <Typography variant="body2">
                          {new Date(entry.dueDate).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ₹{entry.amount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(status)}
                        label={status.toUpperCase()}
                        color={getStatusColor(status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          entry.isPaid
                            ? "Payment completed"
                            : "Click to mark as paid"
                        }
                      >
                        <Checkbox
                          checked={entry.isPaid}
                          onChange={() => handlePaymentToggle(entry)}
                          disabled={entry.isPaid}
                          color="success"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {entry.paymentDate ? (
                        <Typography variant="body2">
                          {new Date(entry.paymentDate).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        {entry.email && (
                          <Typography variant="caption">
                            📧 {entry.email}
                          </Typography>
                        )}
                        {entry.phoneNumber && (
                          <Typography variant="caption">
                            📱 {entry.phoneNumber}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MasterEntriesView;

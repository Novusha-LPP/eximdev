import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert,
  Select, MenuItem, FormControl, InputLabel, Grid, IconButton, Tooltip,
  TextField, InputAdornment
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EventIcon from "@mui/icons-material/Event";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";

// Dynamically compute status based on days until expiry
function computeStatus(dateStr) {
  if (!dateStr) return "Unknown";
  const expiry = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  return "Upcoming";
}

function getStatusChip(status) {
  switch (status) {
    case "Expired":
      return <Chip icon={<ErrorIcon />} label={status} size="small" color="error" />;
    case "Expiring Soon":
      return <Chip icon={<WarningIcon />} label={status} size="small" color="warning" />;
    case "Upcoming":
      return <Chip icon={<CheckCircleIcon />} label={status} size="small" color="success" />;
    default:
      return <Chip label={status} size="small" />;
  }
}

export default function ITNotifications() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [filterStatus, setFilterStatus] = useState(""); // empty = show all
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assetsRes, contractsRes, licensesRes] = await Promise.all([
          itHelpdeskAPI.assets.getAll(),
          itHelpdeskAPI.contracts.getAll(),
          itHelpdeskAPI.licenses.getAll()
        ]);

        const warrantyAlerts = (assetsRes.data || [])
          .filter(a => a.warranty_expiry)
          .map(a => ({
            type: "Warranty Expiry",
            item: a.asset_tag || a.asset_name,
            date: a.warranty_expiry,
            status: computeStatus(a.warranty_expiry)
          }));

        const contractAlerts = (contractsRes.data || [])
          .filter(c => c.end_date)
          .map(c => ({
            type: "Contract Renewal",
            item: c.contract_number || c.contract_name,
            date: c.end_date,
            status: computeStatus(c.end_date)
          }));

        const licenseAlerts = (licensesRes.data || [])
          .filter(l => l.expiry_date)
          .map(l => ({
            type: "License Expiry",
            item: l.software_name || l.license_name,
            date: l.expiry_date,
            status: computeStatus(l.expiry_date)
          }));

        setAlerts([...warrantyAlerts, ...contractAlerts, ...licenseAlerts]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter alerts by search term and status
  const filteredAlerts = alerts.filter(a => {
    const matchesStatus = !filterStatus || a.status === filterStatus;
    const matchesSearch = !searchTerm || 
      a.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Tooltip title="Back">
          <IconButton
            onClick={() => navigate("/it-helpdesk")}
            sx={{ 
              mr: 1, 
              bgcolor: "white", 
              border: "1px solid", 
              borderColor: "primary.main", 
              color: "primary.main",
              "&:hover": { bgcolor: "primary.light", color: "primary.dark" } 
            }}
          >
            <ArrowBackIcon sx={{ color: "primary.main" }} />
          </IconButton>
        </Tooltip>
        <NotificationsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Notifications & Alerts</Typography>
      </Box>

      {/* Filters and Search Bar */}
      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Search Alerts"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Upcoming">Upcoming</MenuItem>
              <MenuItem value="Expiring Soon">Expiring Soon</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : filteredAlerts.length === 0 ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          No alerts found{filterStatus ? ` with status "${filterStatus}"` : ""}
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Alert Type</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAlerts.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Chip icon={<EventIcon />} label={a.type} size="small" color="warning" />
                      </TableCell>
                      <TableCell>{a.item}</TableCell>
                      <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusChip(a.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
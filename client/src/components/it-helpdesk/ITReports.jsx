import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Tabs, Tab, IconButton, InputAdornment, Tooltip
} from "@mui/material";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import DownloadIcon from "@mui/icons-material/Download";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import * as XLSX from "xlsx";

import TicketAnalytics from "./TicketAnalytics";

const REPORT_TYPES = [
  { value: "assets", label: "Asset Report" },
  { value: "tickets", label: "Ticket Report" },
  { value: "vendors", label: "Vendor Report" },
  { value: "licenses", label: "License Report" },
  { value: "inventory", label: "Inventory Report" },
];

export default function ITReports() {
  const navigate = useNavigate();
  const handleBack = () => navigate("/it-helpdesk");

  const [tabIndex, setTabIndex] = useState(0);
  const [reportType, setReportType] = useState("assets");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    setSearchTerm("");
    try {
      const res = await itHelpdeskAPI[reportType].getAll();
      setData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabIndex === 0) fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, tabIndex]);

  const getColumns = () => {
    switch (reportType) {
      case "assets": return ["Asset Tag", "Type", "Status", "Location"];
      case "tickets": return ["Ticket ID", "Title", "Status", "Priority"];
      case "vendors": return ["Vendor Name", "Type", "Contact", "Email"];
      case "licenses": return ["Software", "Total Seats", "Used", "Status"];
      case "inventory": return ["Item Name", "Category", "Qty", "Location"];
      default: return [];
    }
  };

  // Client-side search across all visible field values
  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(item)
      .map(v => String(v || "").toLowerCase())
      .some(v => v.includes(term));
  });

  const renderRow = (item) => {
    switch (reportType) {
      case "assets":
        return (<>
          <TableCell>{item.asset_tag}</TableCell>
          <TableCell>{item.asset_type}</TableCell>
          <TableCell><Chip label={item.status} size="small" /></TableCell>
          <TableCell>{item.location || "—"}</TableCell>
        </>);
      case "tickets":
        return (<>
          <TableCell>{item.ticket_id}</TableCell>
          <TableCell>{item.title}</TableCell>
          <TableCell><Chip label={item.status} size="small" /></TableCell>
          <TableCell>{item.priority}</TableCell>
        </>);
      case "vendors":
        return (<>
          <TableCell>{item.name}</TableCell>
          <TableCell>{item.vendor_type}</TableCell>
          <TableCell>{item.contact_person || "—"}</TableCell>
          <TableCell>{item.email || "—"}</TableCell>
        </>);
      case "licenses":
        return (<>
          <TableCell>{item.software_name}</TableCell>
          <TableCell>{item.total_seats}</TableCell>
          <TableCell>{item.used_seats}</TableCell>
          <TableCell><Chip label={item.status || "—"} size="small" /></TableCell>
        </>);
      case "inventory":
        return (<>
          <TableCell>{item.item_name}</TableCell>
          <TableCell>{item.category}</TableCell>
          <TableCell>{item.quantity}</TableCell>
          <TableCell>{item.location || "—"}</TableCell>
        </>);
      default:
        return null;
    }
  };

  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) return;
    const wb = XLSX.utils.book_new();
    const headers = getColumns();
    const wsData = [headers];
    filteredData.forEach(item => {
      const row = [];
      switch (reportType) {
        case "assets": row.push(item.asset_tag, item.asset_type, item.status, item.location || "—"); break;
        case "tickets": row.push(item.ticket_id, item.title, item.status, item.priority); break;
        case "vendors": row.push(item.name, item.vendor_type, item.contact_person || "—", item.email || "—"); break;
        case "licenses": row.push(item.software_name, item.total_seats, item.used_seats, item.status); break;
        case "inventory": row.push(item.item_name, item.category, item.quantity, item.location || "—"); break;
        default: return;
      }
      wsData.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${REPORT_TYPES.find(r => r.value === reportType)?.label || "Report"}.xlsx`);
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Back">
            <IconButton
              onClick={handleBack}
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
          <Typography variant="h5" fontWeight={700}>Reports &amp; Analytics</Typography>
        </Box>
        {tabIndex === 0 && (
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToExcel}>
            Export {filteredData.length > 0 ? `(${filteredData.length})` : ""}
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
          <Tab label="Data Exports" />
          {/* <Tab label="Ticket Analytics" /> */}
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <>
          {/* Filters: Report Type + Search */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    label="Report Type"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    size="small"
                    fullWidth
                  >
                    {REPORT_TYPES.map((r) => (
                      <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={5}>
                  <TextField
                    label="Search Records"
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

                <Grid item xs={12} sm={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Showing <strong>{filteredData.length}</strong> of <strong>{data.length}</strong> records
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Data Table */}
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {getColumns().map((col) => (
                      <TableCell key={col}><strong>{col}</strong></TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={getColumns().length} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm ? `No results matching "${searchTerm}"` : "No data found"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item) => (
                      <TableRow
                        key={item._id || item.ticket_id || item.asset_tag || item.name}
                        hover
                      >
                        {renderRow(item)}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {tabIndex === 1 && <TicketAnalytics />}
    </Box>
  );
}
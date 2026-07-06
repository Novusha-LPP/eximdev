import React, { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Grid, TextField, MenuItem, Button, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab
} from "@mui/material";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import DownloadIcon from "@mui/icons-material/Download";
import DescriptionIcon from "@mui/icons-material/Description";
import * as XLSX from "xlsx";

import TicketAnalytics from "./TicketAnalytics";

const REPORT_TYPES = [
  { value: "assets", label: "Asset Report" },
  { value: "tickets", label: "Ticket Report" },
  { value: "vendors", label: "Vendor Report" },
  { value: "licenses", label: "License Report" },
  { value: "inventory", label: "Inventory Report" }
];

export default function ITReports() {
  const [tabIndex, setTabIndex] = useState(0);
  const [reportType, setReportType] = useState("assets");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
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
  }, [reportType, tabIndex]);

  const getColumns = () => {
    switch (reportType) {
      case "assets":
        return ["Asset Tag", "Type", "Status", "Location"];
      case "tickets":
        return ["Ticket ID", "Title", "Status", "Priority"];
      case "vendors":
        return ["Vendor Name", "Type", "Contact", "Email"];
      case "licenses":
        return ["Software", "Total Seats", "Used", "Status"];
      case "inventory":
        return ["Item Name", "Category", "Qty", "Location"];
      default:
        return [];
    }
  };

  const renderRow = (item) => {
    switch (reportType) {
      case "assets":
        return (
          <>
            <TableCell>{item.asset_tag}</TableCell>
            <TableCell>{item.asset_type}</TableCell>
            <TableCell><Chip label={item.status} size="small" /></TableCell>
            <TableCell>{item.location || "—"}</TableCell>
          </>
        );
      case "tickets":
        return (
          <>
            <TableCell>{item.ticket_id}</TableCell>
            <TableCell>{item.title}</TableCell>
            <TableCell><Chip label={item.status} size="small" /></TableCell>
            <TableCell>{item.priority}</TableCell>
          </>
        );
      case "vendors":
        return (
          <>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.vendor_type}</TableCell>
            <TableCell>{item.contact_person || "—"}</TableCell>
            <TableCell>{item.email || "—"}</TableCell>
          </>
        );
      case "licenses":
        return (
          <>
            <TableCell>{item.software_name}</TableCell>
            <TableCell>{item.total_seats}</TableCell>
            <TableCell>{item.used_seats}</TableCell>
            <TableCell><Chip label={item.status} size="small" /></TableCell>
          </>
        );
      case "inventory":
        return (
          <>
            <TableCell>{item.item_name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{item.location || "—"}</TableCell>
          </>
        );
      default:
        return null;
    }
  };

  const exportToExcel = () => {
    if (!data || data.length === 0) return;
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Get headers
    const headers = getColumns();
    
    // Prepare data for worksheet
    const wsData = [headers];
    
    // Add data rows
    data.forEach(item => {
      const row = [];
      
      switch (reportType) {
        case "assets":
          row.push(item.asset_tag, item.asset_type, item.status, item.location || "—");
          break;
        case "tickets":
          row.push(item.ticket_id, item.title, item.status, item.priority);
          break;
        case "vendors":
          row.push(item.name, item.vendor_type, item.contact_person || "—", item.email || "—");
          break;
        case "licenses":
          row.push(item.software_name, item.total_seats, item.used_seats, item.status);
          break;
        case "inventory":
          row.push(item.item_name, item.category, item.quantity, item.location || "—");
          break;
        default:
          return;
      }
      
      wsData.push(row);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    // Generate Excel file and download
    XLSX.writeFile(wb, `${REPORT_TYPES.find(r => r.value === reportType)?.label || "Report"}.xlsx`);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Reports & Analytics</Typography>
        {tabIndex === 0 && <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToExcel}>Export</Button>}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
          <Tab label="Data Exports" />
          <Tab label="Ticket Analytics" />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <>
          <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            {REPORT_TYPES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

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
                  <TableCell key={col}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={getColumns().length} align="center">No data found</TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item._id || item.ticket_id || item.asset_tag || item.name}>
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
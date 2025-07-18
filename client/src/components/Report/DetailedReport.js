import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Skeleton,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Fade,
  Zoom,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const columns = [
  { label: "Srl No.", key: "srlNo", minWidth: 50 },
  { label: "JOB No", key: "job_no", minWidth: 100 },
  { label: "LOCATION", key: "location", minWidth: 80 },
  { label: "IMPORTERS NAME", key: "importer", minWidth: 150 },
  { label: "COMMODITY", key: "commodity", minWidth: 300 },
  { label: "B/E. NO.", key: "be_no", minWidth: 100 },
  { label: "DATE", key: "be_date", minWidth: 80 },
  { label: "CONTAINER NO.", key: "containerNumbers", minWidth: 120 },
  { label: "NO. OF CNTR", key: "totalContainers", minWidth: 70 },
  { label: "No. of Contr & Size", key: "noOfContrSize", minWidth: 100 },
  { label: "Teus", key: "teus", minWidth: 60 },
  { label: "CLRG DATE", key: "out_of_charge", minWidth: 80 },
  { label: "REMARKS", key: "remarks", minWidth: 100 },
];

const DetailedReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState("25-26");
  const [month, setMonth] = useState("6");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const years = [
    { value: "25-26", label: "25-26" },
    { value: "24-25", label: "24-25" },
  ];

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.REACT_APP_API_STRING || "";
      const res = await fetch(`${apiBase}/report/import-clearance/${year}/${month}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError("Failed to fetch import clearance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const handlePreviousMonth = () => {
    const prev = parseInt(month) - 1;
    setMonth(prev < 1 ? "12" : String(prev));
  };

  const handleNextMonth = () => {
    const next = parseInt(month) + 1;
    setMonth(next > 12 ? "1" : String(next));
  };

  // Export menu handlers
  const handleExportClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setAnchorEl(null);
  };

  // Generate summary data
  const generateSummaryData = () => {
    const locationGroups = {};
    
    data.forEach(row => {
      const location = row.location || 'Unknown';
      if (!locationGroups[location]) {
        locationGroups[location] = {
          scrap: { count20: 0, count40: 0, teus: 0, containers: 0 },
          others: { count20: 0, count40: 0, teus: 0, containers: 0 },
          total: { count20: 0, count40: 0, teus: 0, containers: 0 }
        };
      }
      
      const teus = parseInt(row.teus) || 0;
      const containers = parseInt(row.totalContainers) || 0;
      const commodity = (row.commodity || '').toLowerCase();
      
      // Determine container sizes from noOfContrSize
      const sizeInfo = row.noOfContrSize || '';
      const count20 = (sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1];
      const count40 = (sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1];
      
      const category = commodity.includes('scrap') ? 'scrap' : 'others';
      
      locationGroups[location][category].count20 += parseInt(count20) || 0;
      locationGroups[location][category].count40 += parseInt(count40) || 0;
      locationGroups[location][category].teus += teus;
      locationGroups[location][category].containers += containers;
      
      locationGroups[location].total.count20 += parseInt(count20) || 0;
      locationGroups[location].total.count40 += parseInt(count40) || 0;
      locationGroups[location].total.teus += teus;
      locationGroups[location].total.containers += containers;
    });
    
    return locationGroups;
  };

  // Export functionality
  const handleExportReport = async (format) => {
    setExportLoading(true);
    setExportType(format);
    setAnchorEl(null);
    
    try {
      if (format === 'excel') {
        await exportToExcel();
      } else if (format === 'pdf') {
        await exportToPDF();
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError(`Failed to export report as ${format.toUpperCase()}`);
    } finally {
      setExportLoading(false);
      setExportType('');
    }
  };

  const exportToExcel = async () => {
    const workbook = XLSX.utils.book_new();
    
    // Prepare main data
    const excelData = data.map((row, index) => {
      const excelRow = {};
      columns.forEach(col => {
        switch (col.key) {
          case 'srlNo':
            excelRow[col.label] = String(index + 1).padStart(3, "0");
            break;
          case 'containerNumbers':
            excelRow[col.label] = row.containerNumbers ? row.containerNumbers.join('; ') : '';
            break;
          default:
            excelRow[col.label] = row[col.key] || '';
        }
      });
      return excelRow;
    });

    // Create main worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-fit columns
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const colWidths = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 0;
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellValue = String(cell.v);
          maxWidth = Math.max(maxWidth, cellValue.length);
        }
      }
      colWidths.push({ wch: Math.min(Math.max(maxWidth + 2, 10), 50) });
    }
    worksheet['!cols'] = colWidths;

    // Add main worksheet
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Clearance Report');

    // Create summary worksheet
    const summaryData = generateSummaryData();
    const monthName = months.find(m => m.value === month)?.label || 'Unknown';
    const summarySheet = [];
    
    // Add header
    summarySheet.push([`Summary -- ${monthName} --${year}`]);
    summarySheet.push(['PARTICULARS', 'Details', '20', '40', 'TEUS', 'CONT.']);
    
    // Add data for each location
    Object.entries(summaryData).forEach(([location, data]) => {
      summarySheet.push([location, 'Scrap', data.scrap.count20, data.scrap.count40, data.scrap.teus, data.scrap.containers]);
      summarySheet.push([location, 'Others', data.others.count20, data.others.count40, data.others.teus, data.others.containers]);
      summarySheet.push([location, 'Total', data.total.count20, data.total.count40, data.total.teus, data.total.containers]);
    });
    
    // Add totals
    const totalTeus = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.teus, 0);
    const totalContainers = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.containers, 0);
    const total20 = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.count20, 0);
    const total40 = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.count40, 0);
    
    summarySheet.push(['EX-BOND', '', 0, 0, 0, 0]);
    summarySheet.push(['LCL', '', 0, 0, 0, 0]);
    summarySheet.push(['TOTAL', '', total20, total40, totalTeus, totalContainers]);

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summarySheet);
    
    // Auto-fit summary columns
    const summaryColWidths = [
      { wch: 20 }, // PARTICULARS
      { wch: 12 }, // Details
      { wch: 8 },  // 20
      { wch: 8 },  // 40
      { wch: 10 }, // TEUS
      { wch: 10 }  // CONT.
    ];
    summaryWorksheet['!cols'] = summaryColWidths;

    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Generate filename and save
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `clearance_report_${monthName}_${year}_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const exportToPDF = async () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Add title
    const monthName = months.find(m => m.value === month)?.label || 'Unknown';
    doc.setFontSize(14);
    doc.text(`Import Clearance Report - ${monthName} ${year}`, 15, 15);
    
    // Add summary
    doc.setFontSize(9);
    doc.text(`Total Records: ${data.length}`, 15, 25);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 80, 25);

    // Main table data
    const tableHeaders = columns.map(col => col.label);
    const tableData = data.map((row, index) => {
      return columns.map(col => {
        switch (col.key) {
          case 'srlNo':
            return String(index + 1).padStart(3, "0");
          case 'containerNumbers':
            return row.containerNumbers ? row.containerNumbers.join('; ') : '';
          default:
            return String(row[col.key] || '');
        }
      });
    });

    // Add main table
    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 35,
      styles: {
        fontSize: 7,
        cellPadding: 1,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 12 },  // Srl No.
        1: { cellWidth: 18 },  // Job No
        2: { cellWidth: 18 },  // Location
        3: { cellWidth: 32 },  // Importer
        4: { cellWidth: 38 },  // Commodity
        5: { cellWidth: 18 },  // B/E No
        6: { cellWidth: 18 },  // Date
        7: { cellWidth: 22 },  // Container No
        8: { cellWidth: 12 },  // No. of Cntr
        9: { cellWidth: 18 },  // Size
        10: { cellWidth: 12 }, // TEUs
        11: { cellWidth: 18 }, // Clrg Date
        12: { cellWidth: 22 }, // Remarks
      },
      margin: { top: 35, right: 8, bottom: 20, left: 8 },
      theme: 'striped'
    });

    // Add summary table
    const summaryData = generateSummaryData();
    const finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.text(`Summary -- ${monthName} --${year}`, 15, finalY);
    
    // Prepare summary table data
    const summaryHeaders = ['PARTICULARS', 'Details', '20', '40', 'TEUS', 'CONT.'];
    const summaryTableData = [];
    
    Object.entries(summaryData).forEach(([location, data]) => {
      summaryTableData.push([location, 'Scrap', data.scrap.count20, data.scrap.count40, data.scrap.teus, data.scrap.containers]);
      summaryTableData.push([location, 'Others', data.others.count20, data.others.count40, data.others.teus, data.others.containers]);
      summaryTableData.push([location, 'Total', data.total.count20, data.total.count40, data.total.teus, data.total.containers]);
    });
    
    // Add totals
    const totalTeus = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.teus, 0);
    const totalContainers = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.containers, 0);
    const total20 = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.count20, 0);
    const total40 = Object.values(summaryData).reduce((sum, loc) => sum + loc.total.count40, 0);
    
    summaryTableData.push(['EX-BOND', '', 0, 0, 0, 0]);
    summaryTableData.push(['LCL', '', 0, 0, 0, 0]);
    summaryTableData.push(['TOTAL', '', total20, total40, totalTeus, totalContainers]);

    // Add summary table
    doc.autoTable({
      head: [summaryHeaders],
      body: summaryTableData,
      startY: finalY + 8,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [255, 165, 0],
        textColor: 0,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: [255, 248, 220],
      },
      alternateRowStyles: {
        fillColor: [255, 235, 205],
      },
      columnStyles: {
        0: { cellWidth: 50 }, // PARTICULARS
        1: { cellWidth: 30 }, // Details
        2: { cellWidth: 20 }, // 20
        3: { cellWidth: 20 }, // 40
        4: { cellWidth: 25 }, // TEUS
        5: { cellWidth: 25 }, // CONT.
      },
      margin: { left: 15, right: 15 },
      theme: 'grid'
    });

    // Generate filename and save
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `clearance_report_${monthName}_${year}_${timestamp}.pdf`;
    doc.save(filename);
  };

  return (
    <Container maxWidth="xl" sx={{ padding: 1, background: 'linear-gradient(135deg, #fdf6f0 0%, #f7faff 100%)', minHeight: '100vh' }}>
      {/* Compact Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
          padding: 1,
          background: 'linear-gradient(90deg, #1976d2 0%, #e3f2fd 100%)',
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ flex: 1 }}>
          {/* Export Button with Dark Blue Gradient */}
          <Button
            variant="contained"
            startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            endIcon={!exportLoading && <ArrowDropDownIcon />}
            onClick={handleExportClick}
            disabled={loading || data.length === 0 || exportLoading}
            size="small"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)',
              boxShadow: '0 4px 8px rgba(26, 35, 126, 0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%)',
                boxShadow: '0 6px 12px rgba(26, 35, 126, 0.4)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)',
                color: 'rgba(255,255,255,0.7)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {exportLoading ? `Exporting ${exportType}...` : 'Export Report'}
          </Button>

          {/* Export Options Menu */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleExportClose}
            PaperProps={{
              elevation: 8,
              sx: {
                mt: 1,
                minWidth: 200,
                borderRadius: 2,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  }
                }
              }
            }}
          >
            <MenuItem onClick={() => handleExportReport('excel')}>
              <ListItemIcon>
                <TableViewIcon fontSize="small" sx={{ color: '#1976d2' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Export as Excel" 
                secondary="With summary sheet"
                sx={{ 
                  '& .MuiListItemText-secondary': { 
                    fontSize: '0.75rem', 
                    color: '#666' 
                  }
                }}
              />
            </MenuItem>
            <Divider sx={{ mx: 1 }} />
            <MenuItem onClick={() => handleExportReport('pdf')}>
              <ListItemIcon>
                <PictureAsPdfIcon fontSize="small" sx={{ color: '#d32f2f' }} />
              </ListItemIcon>
              <ListItemText 
                primary="Export as PDF" 
                secondary="With summary table"
                sx={{ 
                  '& .MuiListItemText-secondary': { 
                    fontSize: '0.75rem', 
                    color: '#666' 
                  }
                }}
              />
            </MenuItem>
          </Menu>
        </Box>
        
        <Typography 
          variant="h6" 
          align="center" 
          sx={{ 
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 1px 4px rgba(25, 118, 210, 0.15)',
            fontSize: '1rem'
          }}
        >
          Import Clearance Report
        </Typography>
        
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              label="Year"
            >
              {years.map((y) => (
                <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={handlePreviousMonth}
              sx={{ 
                bgcolor: '#f5f5f5',
                '&:hover': { bgcolor: '#e0e0e0' }
              }}
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                label="Month"
              >
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <IconButton 
              size="small" 
              onClick={handleNextMonth}
              sx={{ 
                bgcolor: '#f5f5f5',
                '&:hover': { bgcolor: '#e0e0e0' }
              }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Summary Card */}
      {data.length > 0 && (
        <Card elevation={1} sx={{ marginBottom: 2, padding: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Report Summary: {data.length} records found for {months.find(m => m.value === month)?.label} {year}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Total TEUs: {data.reduce((sum, row) => sum + (parseInt(row.teus) || 0), 0)}
            </Typography>
          </Box>
        </Card>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <Card elevation={1} sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell 
                      key={col.key} 
                      align="center" 
                      sx={{ 
                        fontWeight: "bold", 
                        fontSize: "0.75rem",
                        padding: "8px 6px",
                        backgroundColor: '#f5f5f5',
                        color: '#333',
                        minWidth: col.minWidth,
                        whiteSpace: 'nowrap',
                        borderBottom: '2px solid #e0e0e0'
                      }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, idx) => (
                      <TableRow key={idx}>
                        {columns.map((col) => (
                          <TableCell 
                            key={col.key} 
                            align="center" 
                            sx={{ 
                              fontSize: "0.75rem", 
                              padding: "6px 8px",
                              borderBottom: '1px solid #e0e0e0'
                            }}
                          >
                            <Skeleton variant="text" height={20} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data.map((row, idx) => (
                      <TableRow 
                        key={idx}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: '#f9f9f9'
                          },
                          '&:nth-of-type(even)': {
                            backgroundColor: '#fafafa'
                          }
                        }}
                      >
                        <TableCell 
                          align="center" 
                          sx={{ 
                            fontSize: "0.75rem", 
                            padding: "6px 8px",
                            fontWeight: 'bold',
                            color: '#666'
                          }}
                        >
                          {String(idx + 1).padStart(3, "0")}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ 
                            fontSize: "0.75rem", 
                            padding: "6px 8px",
                            fontWeight: '500'
                          }}
                        >
                          {row.job_no}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px" }}
                        >
                          {row.location}
                        </TableCell>
                        <TableCell 
                          align="left" 
                          sx={{ 
                            fontSize: "0.75rem", 
                            padding: "6px 8px",
                            maxWidth: 150,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <Tooltip title={row.importer}>
                            <span>{row.importer}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell 
                          align="left" 
                          sx={{ 
                            fontSize: "0.75rem", 
                            padding: "6px 8px",
                            maxWidth: 120,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <Tooltip title={row.commodity}>
                            <span>{row.commodity}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px" }}
                        >
                          {row.be_no}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px" }}
                        >
                          {row.be_date}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px" }}
                        >
                          <Box sx={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            alignItems: "center",
                            gap: 0.5
                          }}>
                            {row.containerNumbers && row.containerNumbers.map((num, i) => (
                              <Typography key={i} variant="caption" sx={{ fontSize: '0.7rem' }}>
                                {num}
                              </Typography>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold' }}
                        >
                          {row.totalContainers}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px" }}
                        >
                          {row.noOfContrSize}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold' }}
                        >
                          {row.teus}
                        </TableCell>
                        <TableCell 
                          align="center" 
                          sx={{ fontSize: "0.75rem", padding: "6px 8px" }}
                        >
                          {row.out_of_charge}
                        </TableCell>
                        <TableCell 
                          align="left" 
                          sx={{ 
                            fontSize: "0.75rem", 
                            padding: "6px 8px",
                            maxWidth: 100,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <Tooltip title={row.remarks}>
                            <span>{row.remarks}</span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* No Data Message */}
      {!loading && data.length === 0 && (
        <Card elevation={1} sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No data available for the selected period
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try selecting a different month or year
          </Typography>
        </Card>
      )}
    </Container>
  );
};

export default DetailedReport;

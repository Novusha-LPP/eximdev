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
  useMediaQuery
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';


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
  // { label: "SIZE", key: "sizeLabel", minWidth: 80 },
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
        <Box sx={{ flex: 1 }} />
        
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
    </Container>
  );
};

export default DetailedReport;

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
import RefreshIcon from '@mui/icons-material/Refresh';
import BusinessIcon from '@mui/icons-material/Business';
import InventoryIcon from '@mui/icons-material/Inventory';
import DescriptionIcon from '@mui/icons-material/Description';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const columns = [
  { label: "Srl No.", key: "srlNo", minWidth: 50 },
  { label: "JOB No", key: "job_no", minWidth: 100 },
  { label: "LOCATION", key: "location", minWidth: 80 },
  { label: "IMPORTERS NAME", key: "importer", minWidth: 150 },
  { label: "COMMODITY", key: "description", minWidth: 120 },
  { label: "B/E. NO.", key: "be_no", minWidth: 100 },
  { label: "DATE", key: "be_date", minWidth: 80 },
  { label: "CONTAINER NO.", key: "containerNumbers", minWidth: 120 },
  { label: "NO. OF CNTR", key: "totalContainers", minWidth: 70 },
  { label: "SIZE", key: "sizeLabel", minWidth: 50 },
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    await fetchData();
  };

  // Calculate statistics
  const totalJobs = data.length;
  const totalContainers = data.reduce((sum, row) => sum + (Number(row.totalContainers) || 0), 0);
  const totalTEUs = data.reduce((sum, row) => sum + (Number(row.teus) || 0), 0);
  const uniqueImporters = new Set(data.map(row => row.importer)).size;

  const StatCard = ({ title, value, icon, color }) => (
    <Zoom in timeout={800}>
      <Card 
        elevation={2} 
        sx={{ 
          height: '100%',
          background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
          border: `1px solid ${color}20`,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 6px 20px ${color}15`
          }
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
          <Box sx={{ color: color, fontSize: '1.5rem' }}>{icon}</Box>
          <Box>
            <Typography variant="h5" fontWeight="bold" color={color}>
              {value.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );

  return (
    <Container maxWidth="xl" sx={{ padding: 2 }}>
      <Fade in timeout={600}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
            color: "white",
            padding: 2.5,
            borderRadius: 2,
            marginBottom: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DescriptionIcon sx={{ fontSize: 35 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Import Clearance Report
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {months.find(m => m.value === month)?.label} {year}
              </Typography>
            </Box>
          </Box>
          <LocalShippingIcon sx={{ fontSize: 50, opacity: 0.3 }} />
        </Box>
      </Fade>

      <Fade in timeout={800}>
        <Card elevation={2} sx={{ marginBottom: 3, borderRadius: 2 }}>
          <CardContent>
            <Box 
              component="form" 
              onSubmit={handleSubmit} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                flexWrap: 'wrap'
              }}
            >
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel id="year-label">Year</InputLabel>
                <Select
                  labelId="year-label"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  label="Year"
                  sx={{ borderRadius: 1 }}
                >
                  {years.map((y) => (
                    <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Previous Month">
                  <IconButton 
                    size="small" 
                    onClick={handlePreviousMonth}
                    sx={{ 
                      bgcolor: '#ff6b35',
                      color: 'white',
                      '&:hover': { bgcolor: '#e55a2b' }
                    }}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="month-label">Month</InputLabel>
                  <Select
                    labelId="month-label"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    label="Month"
                    sx={{ borderRadius: 1 }}
                  >
                    {months.map((m) => (
                      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Tooltip title="Next Month">
                  <IconButton 
                    size="small" 
                    onClick={handleNextMonth}
                    sx={{ 
                      bgcolor: '#ff6b35',
                      color: 'white',
                      '&:hover': { bgcolor: '#e55a2b' }
                    }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                disabled={loading} 
                size="small"
                startIcon={loading ? <RefreshIcon sx={{ animation: 'spin 1s linear infinite' }} /> : <RefreshIcon />}
                sx={{ 
                  borderRadius: 1,
                  px: 2,
                  background: 'linear-gradient(45deg, #ff6b35 30%, #f7931e 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #e55a2b 30%, #e8841a 90%)',
                  }
                }}
              >
                {loading ? "Loading..." : "Get Report"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Fade>

      {error && (
        <Fade in timeout={400}>
          <Alert severity="error" sx={{ marginBottom: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {data.length > 0 && (
        <>
          {/* <Grid container spacing={2} sx={{ marginBottom: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Total Jobs" 
                value={totalJobs} 
                icon={<BusinessIcon />}
                color="#ff6b35"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Total Containers" 
                value={totalContainers} 
                icon={<InventoryIcon />}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Total TEUs" 
                value={totalTEUs} 
                icon={<LocalShippingIcon />}
                color="#1976d2"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard 
                title="Unique Importers" 
                value={uniqueImporters} 
                icon={<DateRangeIcon />}
                color="#9c27b0"
              />
            </Grid>
          </Grid> */}

          <Fade in timeout={1000}>
            <Card elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
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
                            padding: "6px 4px",
                            backgroundColor: '#ff6b35',
                            color: 'white',
                            minWidth: col.minWidth,
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2
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
                                  padding: "4px 6px",
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
                                backgroundColor: '#fff3e0'
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
                                padding: "4px 6px",
                                fontWeight: 'bold',
                                color: '#ff6b35'
                              }}
                            >
                              {String(idx + 1).padStart(3, "0")}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontSize: "0.75rem", 
                                padding: "4px 6px",
                                fontWeight: '500'
                              }}
                            >
                              {row.job_no}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              <Chip 
                                label={row.location} 
                                size="small" 
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: 20,
                                  bgcolor: '#e3f2fd',
                                  color: '#1976d2'
                                }}
                              />
                            </TableCell>
                            <TableCell 
                              align="left" 
                              sx={{ 
                                fontSize: "0.75rem", 
                                padding: "4px 6px",
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
                                padding: "4px 6px",
                                maxWidth: 120,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              <Tooltip title={row.description}>
                                <span>{row.description}</span>
                              </Tooltip>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              {row.be_no}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              {row.be_date}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              <Box sx={{ 
                                display: "flex", 
                                flexDirection: "column", 
                                alignItems: "center",
                                gap: 0.5
                              }}>
                                {row.containerNumbers && row.containerNumbers.map((num, i) => (
                                  <Chip 
                                    key={i} 
                                    label={num} 
                                    size="small"
                                    sx={{ 
                                      fontSize: '0.65rem',
                                      height: 16,
                                      bgcolor: '#e8f5e8',
                                      color: '#2e7d32'
                                    }}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              <Box
                                sx={{
                                  backgroundColor: '#2e7d32',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem',
                                  display: 'inline-block'
                                }}
                              >
                                {row.totalContainers}
                              </Box>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              <Chip 
                                label={row.sizeLabel} 
                                size="small"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: 20,
                                  bgcolor: '#fff3e0',
                                  color: '#ed6c02'
                                }}
                              />
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              {row.noOfContrSize}
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              <Box
                                sx={{
                                  backgroundColor: '#1976d2',
                                  color: 'white',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem',
                                  display: 'inline-block'
                                }}
                              >
                                {row.teus}
                              </Box>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ fontSize: "0.75rem", padding: "4px 6px" }}
                            >
                              {row.out_of_charge}
                            </TableCell>
                            <TableCell 
                              align="left" 
                              sx={{ 
                                fontSize: "0.75rem", 
                                padding: "4px 6px",
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
          </Fade>
        </>
      )}
    </Container>
  );
};

export default DetailedReport;

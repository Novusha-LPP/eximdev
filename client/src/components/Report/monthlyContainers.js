import React, { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Box,
  TableSortLabel,
  Chip,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Alert,
  Fade,
  Zoom,
  Tooltip,
  useTheme,
  ClickAwayListener,
  Popper,
  Avatar
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import BusinessIcon from '@mui/icons-material/Business';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend, ResponsiveContainer, defs, linearGradient, stop } from 'recharts';
import { useFetchYears } from "../../utils/useFetchYears";
import { BranchContext } from "../../contexts/BranchContext";
import useDynamicICDs from "../../customHooks/useDynamicICDs";
// Custom dot component with growth/decline indicators
const CustomDot = ({ cx, cy, payload, dataKey, index, allData }) => {
  if (index === 0) return null; // No comparison for first month

  const prevValue = allData[index - 1][dataKey];
  const currValue = payload[dataKey];
  const isGrowth = currValue > prevValue;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={isGrowth ? '#4caf50' : '#f44336'}
        stroke="white"
        strokeWidth={2}
      />
      {isGrowth ? (
        <polygon
          points={`${cx - 4},${cy - 8} ${cx + 4},${cy - 8} ${cx},${cy - 12}`}
          fill="#4caf50"
        />
      ) : (
        <polygon
          points={`${cx - 4},${cy + 8} ${cx + 4},${cy + 8} ${cx},${cy + 12}`}
          fill="#f44336"
        />
      )}
    </g>
  );
};

// Chart tooltip component
const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{
        backgroundColor: 'white',
        padding: 2,
        borderRadius: 1,
        boxShadow: 3,
        border: '1px solid #e0e0e0'
      }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Box key={`item-${index}`} sx={{
            color: entry.stroke,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.875rem'
          }}>
            <Box sx={{
              width: 10,
              height: 10,
              backgroundColor: entry.stroke,
              borderRadius: '50%'
            }} />
            {entry.name}: {entry.value}
          </Box>
        ))}
      </Box>
    );
  }
  return null;
};

// Trend chart component
const TrendChart = ({ trendData, importerName }) => {
  // Calculate net containers and TEU for each month
  const dataWithStats = trendData.map(item => ({
    ...item,
    net20: Math.max(0, (Number(item.container20Ft) || 0) - (Number(item.lcl20Ft) || 0)),
    net40: Math.max(0, (Number(item.container40Ft) || 0) - (Number(item.lcl40Ft) || 0)),
    teu: Math.max(0,
      ((Number(item.container20Ft) || 0) - (Number(item.lcl20Ft) || 0)) +
      2 * ((Number(item.container40Ft) || 0) - (Number(item.lcl40Ft) || 0))
    ),
  }));

  return (
    <Box sx={{ width: 450, p: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)' }}>
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a237e', mb: 0.5 }}>
          6-Month Trend Analysis
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {importerName}
        </Typography>
      </Box>
      <Box sx={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataWithStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1976d2" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorTEU" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d32f2f" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#d32f2f" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fontWeight: 500 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 11, fontWeight: 500 }} 
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip content={<ChartTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '10px' }}
            />
            <Area
              type="monotone"
              dataKey="beDateCount"
              stroke="#1976d2"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorBE)"
              name="BEs Filed"
              animationDuration={1500}
            />
            <Area
              type="monotone"
              dataKey="teu"
              stroke="#d32f2f"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTEU)"
              name="Total TEU"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

const MonthlyContainers = () => {
  const theme = useTheme();
  const { years, selectedYear: year, setSelectedYear: setYear } = useFetchYears();
  const currentMonth = String(new Date().getMonth() + 1);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortColumn, setSortColumn] = useState('teu');
  const [sortDirection, setSortDirection] = useState('desc');
  const [popperOpen, setPopperOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [selectedICD, setSelectedICD] = useState("");
  const dynamicICDs = useDynamicICDs();
  const { selectedBranch, selectedCategory, loading: branchLoading } = useContext(BranchContext);
  const navigate = useNavigate();

  // The years array is now fetched dynamically through the useFetchYears hook.

  const months = [
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
  ];

  // Mock trend data generator (replace with actual API call)
  const generateMockTrendData = (row) => {
    const currentValues = {
      beDateCount: Number(row.beDateCount) || 0,
      container20Ft: Number(row.container20Ft) || 0,
      container40Ft: Number(row.container40Ft) || 0,
      lcl20Ft: Number(row.lcl20Ft) || 0,
      lcl40Ft: Number(row.lcl40Ft) || 0,
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dynamicMonths = [];
    
    // Use the selected month/year instead of the current date
    const selectedMonthIdx = parseInt(month) - 1; 
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (selectedMonthIdx - i + 12) % 12;
      dynamicMonths.push(monthNames[monthIndex]);
    }
    return dynamicMonths.map((m, index) => {
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      return {
        month: m,
        beDateCount: Math.max(1, Math.round(currentValues.beDateCount * (1 + variation * (index + 1) / 6))),
        container20Ft: Math.max(0, Math.round(currentValues.container20Ft * (1 + variation * (index + 1) / 6))),
        container40Ft: Math.max(0, Math.round(currentValues.container40Ft * (1 + variation * (index + 1) / 6))),
        lcl20Ft: Math.max(0, Math.round(currentValues.lcl20Ft * (1 + variation * (index + 1) / 6))),
        lcl40Ft: Math.max(0, Math.round(currentValues.lcl40Ft * (1 + variation * (index + 1) / 6))),
      };
    });
  };

  const fetchData = useCallback(async (signal) => {
    if (!year || branchLoading) return; // Prevent 404 with empty year or incorrect data before branch context
    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.REACT_APP_API_STRING || "";
      const params = new URLSearchParams();
      if (selectedICD) params.append("custom_house", selectedICD);
      if (selectedBranch && selectedBranch !== "all") params.append("branchId", selectedBranch);
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
      // Construct query string manually to avoid double encoding or missing ?
      const queryString = params.toString();
      const url = `${apiBase}/report/monthly-containers/${year}/${month}${queryString ? `?${queryString}` : ""}`;
      const res = await axios.get(url, { signal });
      setData(res.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedICD, selectedBranch, selectedCategory, branchLoading]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSort = (column) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(column);
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue, bValue;

    switch (sortColumn) {
      case 'importer':
        aValue = a.importer;
        bValue = b.importer;
        break;
      case 'beDateCount':
        aValue = a.beDateCount;
        bValue = b.beDateCount;
        break;
      case 'oocCount': // NEW
        aValue = a.oocCount; bValue = b.oocCount; break;
      case 'container20Ft':
        aValue = Math.max(0, (Number(a.container20Ft) || 0) - (Number(a.lcl20Ft) || 0));
        bValue = Math.max(0, (Number(b.container20Ft) || 0) - (Number(b.lcl20Ft) || 0));
        break;
      case 'container40Ft':
        aValue = Math.max(0, (Number(a.container40Ft) || 0) - (Number(a.lcl40Ft) || 0));
        bValue = Math.max(0, (Number(b.container40Ft) || 0) - (Number(b.lcl40Ft) || 0));
        break;
      case 'lcl20Ft':
        aValue = Number(a.lcl20Ft) || 0;
        bValue = Number(b.lcl20Ft) || 0;
        break;
      case 'lcl40Ft':
        aValue = Number(a.lcl40Ft) || 0;
        bValue = Number(b.lcl40Ft) || 0;
        break;
      case 'teu':
      default:
        const aNet20 = Math.max(0, (Number(a.container20Ft) || 0) - (Number(a.lcl20Ft) || 0));
        const aNet40 = Math.max(0, (Number(a.container40Ft) || 0) - (Number(a.lcl40Ft) || 0));
        const bNet20 = Math.max(0, (Number(b.container20Ft) || 0) - (Number(b.lcl20Ft) || 0));
        const bNet40 = Math.max(0, (Number(b.container40Ft) || 0) - (Number(b.lcl40Ft) || 0));
        aValue = aNet20 + (2 * aNet40);
        bValue = bNet20 + (2 * bNet40);
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    await fetchData();
  };

  const handlePreviousMonth = () => {
    const prev = parseInt(month) - 1;
    setMonth(prev < 1 ? "12" : String(prev));
  };

  const handleNextMonth = () => {
    const next = parseInt(month) + 1;
    setMonth(next > 12 ? "1" : String(next));
  };

  const handleChartHover = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowData(generateMockTrendData(row));
    setSelectedImporter(row.importer);
    setPopperOpen(true);
  };

  const handlePopperClose = () => {
    setPopperOpen(false);
    setAnchorEl(null);
    setSelectedRowData(null);
    setSelectedImporter("");
  };

  // Calculate statistics with LCL subtraction
  const totalBEs = data.reduce((sum, row) => sum + (Number(row.beDateCount) || 0), 0);
  const totalOutOfCharge = data.reduce((sum, row) => sum + (Number(row.oocCount) || 0), 0);
  const totalNet20Ft = data.reduce((sum, row) => sum + Math.max(0, (Number(row.container20Ft) || 0) - (Number(row.lcl20Ft) || 0)), 0);
  const totalNet40Ft = data.reduce((sum, row) => sum + Math.max(0, (Number(row.container40Ft) || 0) - (Number(row.lcl40Ft) || 0)), 0);
  const totalLCL = data.reduce((sum, row) => sum + (Number(row.lcl20Ft) || 0) + (Number(row.lcl40Ft) || 0), 0);
  const totalTEU = data.reduce((sum, row) => {
    const net20Ft = Math.max(0, (Number(row.container20Ft) || 0) - (Number(row.lcl20Ft) || 0));
    const net40Ft = Math.max(0, (Number(row.container40Ft) || 0) - (Number(row.lcl40Ft) || 0));
    return sum + net20Ft + (2 * net40Ft);
  }, 0);

  const StatCard = ({ title, value, icon, color }) => (
    <Zoom in timeout={800}>
      <Card
        elevation={3}
        sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 25px ${color}20`
          }
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
          <Avatar sx={{ 
            bgcolor: `${color}20`, 
            color: color, 
            width: 50, 
            height: 50,
            boxShadow: `0 4px 10px ${color}30`
          }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="800" color={color}>
              {value.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {title}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Zoom>
  );

  return (
    <Container maxWidth="xl" sx={{ padding: 3 }}>
      <Fade in timeout={600}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: "white",
            padding: 3,
            borderRadius: 3,
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Monthly Container Report
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {months.find(m => m.value === month)?.label} {year}
              </Typography>
            </Box>
          </Box>
          <AssessmentIcon sx={{ fontSize: 60, opacity: 0.3 }} />
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
                  sx={{ borderRadius: 2 }}
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
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
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
                    sx={{ borderRadius: 2 }}
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
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="icd-label">ICD Code</InputLabel>
                <Select
                  labelId="icd-label"
                  value={selectedICD}
                  onChange={(e) => setSelectedICD(e.target.value)}
                  label="ICD Code"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All ICDs</MenuItem>
                  {dynamicICDs.map((icd, index) => (
                    <MenuItem key={index} value={icd}>{icd}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<span role="img" aria-label="View Detailed Report">🗂</span>}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
                  }
                }}
                onClick={() => navigate('/report/detailed')}
              >
                Detailed Report
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
          <Grid container spacing={2} sx={{ marginBottom: 3 }}>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Total Importers"
                value={data.length}
                icon={<BusinessIcon sx={{ fontSize: 40 }} />}
                color={theme.palette.primary.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Total BEs"
                value={totalBEs}
                icon={<AssessmentIcon sx={{ fontSize: 40 }} />}
                color={theme.palette.success.main}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Total Out Of Charge"
                value={totalOutOfCharge}
                icon={<AssessmentIcon sx={{ fontSize: 40 }} />}
                color={theme.palette.success.main}
              />
            </Grid>


            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Net Containers"
                value={totalNet20Ft + totalNet40Ft}
                icon={<InventoryIcon sx={{ fontSize: 40 }} />}
                color={theme.palette.warning.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Total LCL"
                value={totalLCL}
                icon={<InventoryIcon sx={{ fontSize: 40 }} />}
                color={theme.palette.info.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <StatCard
                title="Total TEU"
                value={totalTEU}
                icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
                color={theme.palette.error.main}
              />
            </Grid>
          </Grid>

          <Fade in timeout={1000}>
            <Card elevation={4} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'importer'}
                          direction={sortColumn === 'importer' ? sortDirection : 'asc'}
                          onClick={() => handleSort('importer')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Importer Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'beDateCount'}
                          direction={sortColumn === 'beDateCount' ? sortDirection : 'asc'}
                          onClick={() => handleSort('beDateCount')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          BEs Filed
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'oocCount'}
                          direction={sortColumn === 'oocCount' ? sortDirection : 'asc'}
                          onClick={() => handleSort('oocCount')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Out of Charge
                        </TableSortLabel>
                      </TableCell>

                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'container20Ft'}
                          direction={sortColumn === 'container20Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('container20Ft')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Net 20ft Containers
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'container40Ft'}
                          direction={sortColumn === 'container40Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('container40Ft')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          Net 40ft Containers
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'lcl20Ft'}
                          direction={sortColumn === 'lcl20Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('lcl20Ft')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          LCL 20ft
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'lcl40Ft'}
                          direction={sortColumn === 'lcl40Ft' ? sortDirection : 'asc'}
                          onClick={() => handleSort('lcl40Ft')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          LCL 40ft
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem' }}>
                        <TableSortLabel
                          active={sortColumn === 'teu'}
                          direction={sortColumn === 'teu' ? sortDirection : 'asc'}
                          onClick={() => handleSort('teu')}
                          sx={{ 
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': { color: 'white !important' }
                          }}
                        >
                          TEU
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ bgcolor: '#1a237e', color: 'white', fontWeight: "bold", fontSize: '0.9rem', textAlign: 'center' }}>
                        Trend
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx}>
                          {Array.from({ length: 8 }).map((_, cellIdx) => (
                            <TableCell key={cellIdx}>
                              <Skeleton variant="text" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      sortedData.map((row, idx) => {
                        const net20Ft = Math.max(0, (Number(row.container20Ft) || 0) - (Number(row.lcl20Ft) || 0));
                        const net40Ft = Math.max(0, (Number(row.container40Ft) || 0) - (Number(row.lcl40Ft) || 0));
                        const teu = net20Ft + (2 * net40Ft);

                        return (
                          <TableRow
                            key={idx}
                            sx={{
                              '&:hover': {
                                bgcolor: 'action.hover',
                                transform: 'scale(1.001)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <TableCell sx={{ fontWeight: 500 }}>{row.importer}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#1976d2',
                                  color: 'white',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  textAlign: 'center',
                                  minWidth: '50px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.beDateCount}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#6a1b9a',
                                  color: 'white',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  textAlign: 'center',
                                  minWidth: '50px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.oocCount ?? 0}
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#2e7d32',
                                  color: 'white',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  textAlign: 'center',
                                  minWidth: '50px',
                                  display: 'inline-block'
                                }}
                              >
                                {net20Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#ed6c02',
                                  color: 'white',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  textAlign: 'center',
                                  minWidth: '50px',
                                  display: 'inline-block'
                                }}
                              >
                                {net40Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#00bcd4',
                                  color: 'white',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  textAlign: 'center',
                                  minWidth: '50px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.lcl20Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  backgroundColor: '#00bcd4',
                                  color: 'white',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  textAlign: 'center',
                                  minWidth: '50px',
                                  display: 'inline-block'
                                }}
                              >
                                {row.lcl40Ft}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={teu}
                                size="small"
                                color="error"
                                variant="filled"
                                sx={{ fontWeight: 'bold' }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Tooltip title="View 6-month trend">
                                <IconButton
                                  size="small"
                                  onMouseEnter={(e) => handleChartHover(e, row)}
                                  onMouseLeave={handlePopperClose}
                                  sx={{
                                    color: 'primary.main',
                                    '&:hover': {
                                      backgroundColor: 'primary.main',
                                      color: 'white',
                                      transform: 'scale(1.1)'
                                    },
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <ShowChartIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Fade>

          <Popper
            open={popperOpen}
            anchorEl={anchorEl}
            placement="top"
            modifiers={[
              {
                name: 'offset',
                options: {
                  offset: [0, 15],
                },
              },
            ]}
            sx={{ zIndex: 1300 }}
          >
            <Fade in={popperOpen} timeout={300}>
              <Box>
                <ClickAwayListener onClickAway={handlePopperClose}>
                  <Card 
                    elevation={12} 
                    sx={{ 
                      borderRadius: 3, 
                      overflow: 'hidden',
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
                    }}
                  >
                    {selectedRowData && (
                      <TrendChart 
                        trendData={selectedRowData} 
                        importerName={selectedImporter} 
                      />
                    )}
                  </Card>
                </ClickAwayListener>
              </Box>
            </Fade>
          </Popper>
        </>
      )}
    </Container>
  );
};

export default MonthlyContainers;

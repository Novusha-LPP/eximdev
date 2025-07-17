import React, { useState, useEffect } from "react";
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
  TableSortLabel
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const MonthlyContainers = () => {
  const [year, setYear] = useState("25-26");
  const currentMonth = String(new Date().getMonth() + 1);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortColumn, setSortColumn] = useState('teu');
  const [sortDirection, setSortDirection] = useState('desc');

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
      const res = await axios.get(`${apiBase}/report/monthly-containers/${year}/${month}`);
      setData(res.data);
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month]);

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
      case 'container20Ft':
        aValue = a.container20Ft;
        bValue = b.container20Ft;
        break;
      case 'container40Ft':
        aValue = a.container40Ft;
        bValue = b.container40Ft;
        break;
      case 'teu':
      default:
        aValue = (Number(a.container20Ft) || 0) + 2 * (Number(a.container40Ft) || 0);
        bValue = (Number(b.container20Ft) || 0) + 2 * (Number(b.container40Ft) || 0);
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    await fetchData(); // Optional manual reload
  };

  const handlePreviousMonth = () => {
    const prev = parseInt(month) - 1;
    setMonth(prev < 1 ? "12" : String(prev));
  };

  const handleNextMonth = () => {
    const next = parseInt(month) + 1;
    setMonth(next > 12 ? "1" : String(next));
  };

  return (
  <Container maxWidth="lg" sx={{ padding: 3 }}>
    <Box
      sx={{
        backgroundColor: "#1976d2",
        color: "white",
        padding: 2,
        borderRadius: 2,
        marginBottom: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <Typography variant="h5" fontWeight="bold">
        📦 Monthly Container Report
      </Typography>
    </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="year-label">Year</InputLabel>
          <Select
            labelId="year-label"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            label="Year"
          >
            {years.map((y) => (
              <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={handlePreviousMonth}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="month-label">Month</InputLabel>
            <Select
              labelId="month-label"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              label="Month"
            >
              {months.map((m) => (
                <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton size="small" onClick={handleNextMonth}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
        <Button type="submit" variant="contained" color="primary" disabled={loading} size="small">
          {loading ? "Loading..." : "Get Report"}
        </Button>
      </Box>
      {error && <Typography color="error">{error}</Typography>}
      {data.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
  <TableRow>
    <TableCell sx={{ fontWeight: "bold" }}>
      <TableSortLabel
        active={sortColumn === 'importer'}
        direction={sortColumn === 'importer' ? sortDirection : 'asc'}
        onClick={() => handleSort('importer')}
      >
        Importer Name
      </TableSortLabel>
    </TableCell>
    <TableCell sx={{ fontWeight: "bold" }}>
      <TableSortLabel
        active={sortColumn === 'beDateCount'}
        direction={sortColumn === 'beDateCount' ? sortDirection : 'asc'}
        onClick={() => handleSort('beDateCount')}
      >
        Number of BE Filled
      </TableSortLabel>
    </TableCell>
    <TableCell sx={{ fontWeight: "bold" }}>
      <TableSortLabel
        active={sortColumn === 'container20Ft'}
        direction={sortColumn === 'container20Ft' ? sortDirection : 'asc'}
        onClick={() => handleSort('container20Ft')}
      >
        20ft Containers
      </TableSortLabel>
    </TableCell>
    <TableCell sx={{ fontWeight: "bold" }}>
      <TableSortLabel
        active={sortColumn === 'container40Ft'}
        direction={sortColumn === 'container40Ft' ? sortDirection : 'asc'}
        onClick={() => handleSort('container40Ft')}
      >
        40ft Containers
      </TableSortLabel>
    </TableCell>
    <TableCell sx={{ fontWeight: "bold" }}>
      <TableSortLabel
        active={sortColumn === 'teu'}
        direction={sortColumn === 'teu' ? sortDirection : 'asc'}
        onClick={() => handleSort('teu')}
      >
        Number of TEU
      </TableSortLabel>
    </TableCell>
  </TableRow>
</TableHead>

            <TableBody>
              {sortedData.map((row, idx) => {
                const teu = (Number(row.container20Ft) || 0) + 2 * (Number(row.container40Ft) || 0);
                return (
                  <TableRow key={idx}>
                    <TableCell>{row.importer}</TableCell>
                    <TableCell>{row.beDateCount}</TableCell>
                    <TableCell>{row.container20Ft}</TableCell>
                    <TableCell>{row.container40Ft}</TableCell>
                    <TableCell>{teu}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default MonthlyContainers;

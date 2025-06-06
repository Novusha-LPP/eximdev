import React, { useContext, useState, useEffect, useMemo, useCallback } from "react";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import useFetchJobList from "../../customHooks/useFetchJobList";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  Autocomplete,
  InputAdornment,
  Box,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./SelectImporterModal";
import { useImportersContext } from "../../contexts/importersContext";
import { YearContext } from "../../contexts/yearContext.js";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

// Memoized search input to prevent unnecessary re-renders
const SearchInput = React.memo(({ searchQuery, setSearchQuery, fetchJobs, isMobile }) => {
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const handleSearchClick = useCallback(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  return (
    <TextField
      placeholder={isMobile ? "Search..." : "Search by Job No, Importer, or AWB/BL Number"}
      size="small"
      variant="outlined"
      value={searchQuery}
      onChange={handleSearchChange}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={handleSearchClick}>
              <SearchIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ 
        width: isMobile ? "100%" : "300px", 
        marginRight: isMobile ? "0" : "20px",
        marginBottom: isMobile ? "16px" : "0"
      }}
    />
  );
});

SearchInput.displayName = 'SearchInput';

// Responsive filter controls component
const FilterControls = React.memo(({ 
  selectedICD, setSelectedICD,
  importerNames, selectedImporter, setSelectedImporter,
  years, selectedYearState, setSelectedYearState,
  detailedStatus, setDetailedStatus,
  detailedStatusOptions,
  searchQuery, setSearchQuery, fetchJobs,
  handleOpen,
  isMobile, isTablet,
  status, total
}) => {
  if (isMobile) {
    return (
      <Stack spacing={2} sx={{ width: '100%' }}>        {/* Row 1: Title and Download */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {status} Jobs: {total}
          </Typography>
          <IconButton onClick={handleOpen} size="small">
            <DownloadIcon />
          </IconButton>
        </Box>
        
        {/* Row 2: Search */}
        <SearchInput 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          fetchJobs={fetchJobs}
          isMobile={isMobile}
        />
        
        {/* Row 3: ICD and Year */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            select
            size="small"
            variant="outlined"
            label="ICD Code"
            value={selectedICD}
            onChange={(e) => setSelectedICD(e.target.value)}
            sx={{ flex: 1 }}
          >
            <MenuItem value="all">All ICDs</MenuItem>
            <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
            <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
            <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
          </TextField>
          
          {years.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedYearState}
              onChange={(e) => setSelectedYearState(e.target.value)}
              sx={{ flex: 1 }}
              label="Year"
            >
              {years.map((year, index) => (
                <MenuItem key={`year-${year}-${index}`} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
        
        {/* Row 4: Importer */}
        <Autocomplete
          sx={{ width: "100%" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""}
          onInputChange={(event, newValue) => setSelectedImporter(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer"
            />
          )}
        />
        
        {/* Row 5: Status */}
        <TextField
          select
          size="small"
          value={detailedStatus}
          onChange={(e) => setDetailedStatus(e.target.value)}
          sx={{ width: "100%" }}
          label="Status"
        >
          {detailedStatusOptions.map((option, index) => (
            <MenuItem
              key={`status-${option.id || option.value || index}`}
              value={option.value}
            >
              {option.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    );
  }

  if (isTablet) {
    return (
      <Stack spacing={2} sx={{ width: '100%' }}>        {/* Row 1: Title and Download */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: "bold", fontSize: "1.5rem" }}>
            {status} Jobs: {total}
          </Typography>
          <IconButton onClick={handleOpen}>
            <DownloadIcon />
          </IconButton>
        </Box>
        
        {/* Row 2: Controls */}
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            select
            size="small"
            variant="outlined"
            label="ICD Code"
            value={selectedICD}
            onChange={(e) => setSelectedICD(e.target.value)}
            sx={{ minWidth: "150px" }}
          >
            <MenuItem value="all">All ICDs</MenuItem>
            <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
            <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
            <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
          </TextField>

          <Autocomplete
            sx={{ minWidth: "200px", flex: 1 }}
            freeSolo
            options={importerNames.map((option) => option.label)}
            value={selectedImporter || ""}
            onInputChange={(event, newValue) => setSelectedImporter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                fullWidth
                label="Select Importer"
              />
            )}
          />

          {years.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedYearState}
              onChange={(e) => setSelectedYearState(e.target.value)}
              sx={{ minWidth: "80px" }}
              label="Year"
            >
              {years.map((year, index) => (
                <MenuItem key={`year-${year}-${index}`} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
        
        {/* Row 3: Status and Search */}
        <Stack direction="row" spacing={2}>
          <TextField
            select
            size="small"
            value={detailedStatus}
            onChange={(e) => setDetailedStatus(e.target.value)}
            sx={{ minWidth: "200px" }}
            label="Status"
          >
            {detailedStatusOptions.map((option, index) => (
              <MenuItem
                key={`status-${option.id || option.value || index}`}
                value={option.value}
              >
                {option.name}
              </MenuItem>
            ))}
          </TextField>
          
          <SearchInput 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            fetchJobs={fetchJobs}
            isMobile={false}
          />
        </Stack>
      </Stack>
    );
  }

  // Desktop layout (original)
  return (
    <Box sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    }}>
      <Typography
        variant="body1"
        sx={{ fontWeight: "bold", fontSize: "1.5rem" }}
      >
        Jobs: {/* total will be passed from parent */}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <TextField
          select
          size="small"
          variant="outlined"
          label="ICD Code"
          value={selectedICD}
          onChange={(e) => setSelectedICD(e.target.value)}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="all">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>

        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""}
          onInputChange={(event, newValue) => setSelectedImporter(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer"
            />
          )}
        />

        {years.length > 0 && (
          <TextField
            select
            size="small"
            value={selectedYearState}
            onChange={(e) => setSelectedYearState(e.target.value)}
            sx={{ width: "100px", marginRight: "20px" }}
          >
            {years.map((year, index) => (
              <MenuItem key={`year-${year}-${index}`} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          size="small"
          value={detailedStatus}
          onChange={(e) => setDetailedStatus(e.target.value)}
          sx={{ width: "250px", marginRight: "20px" }}
        >
          {detailedStatusOptions.map((option, index) => (
            <MenuItem
              key={`status-${option.id || option.value || index}`}
              value={option.value}
            >
              {option.name}
            </MenuItem>
          ))}
        </TextField>

        <SearchInput 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          fetchJobs={fetchJobs}
          isMobile={false}
        />
        
        <IconButton onClick={handleOpen}>
          <DownloadIcon />
        </IconButton>
      </Box>
    </Box>
  );
});

FilterControls.displayName = 'FilterControls';


function JobList(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { 
    searchQuery, setSearchQuery,
    detailedStatus, setDetailedStatus,
    selectedICD, setSelectedICD,
    selectedImporter, setSelectedImporter  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [importers, setImporters] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger state

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Clear search state unless coming back from job details
  React.useEffect(() => {
    if (!(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setDetailedStatus("all");
      setSelectedICD("all");
      setSelectedImporter("");
    }
    // Optionally clear the state from history so it doesn't persist
    if (location.state && location.state.fromJobDetails) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
        );
        setImporters(res.data);
      }
    }
    getImporterList();
  }, [selectedYearState]);
  const getUniqueImporterNames = (importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const uniqueImporters = new Set();
    return importerData
      .filter((importer) => {
        if (uniqueImporters.has(importer.importer)) return false;
        uniqueImporters.add(importer.importer);
        return true;
      })
      .map((importer, index) => ({
        label: importer.importer,
        key: `${importer.importer}-${index}`,
      }));
  };

  const importerNames = [...getUniqueImporterNames(importers)];
  // useEffect(() => {
  //   if (!selectedImporter) {
  //     setSelectedImporter("Select Importer");
  //   }
  // }, [importerNames]);

  const { rows, total, totalPages, currentPage, handlePageChange, fetchJobs, setRows } =
    useFetchJobList(
      detailedStatus,
      selectedYearState,
      props.status,
      selectedICD,
      debouncedSearchQuery,
      selectedImporter
    );

  // Callback to update row data when status changes in EditableDateCell
  const handleRowDataUpdate = useCallback((jobId, newStatus) => {
    setRows(prevRows => 
      prevRows.map(row => 
        row._id === jobId 
          ? { ...row, detailed_status: newStatus }
          : row
      )
    );
    // Also increment refreshTrigger to force getRowProps to recalculate
    setRefreshTrigger(prev => prev + 1);
  }, [setRows]);

  const columns = useJobColumns(handleRowDataUpdate);

  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
        const currentTwoDigits = String(currentYear).slice(-2);
        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

        let defaultYearPair =
          currentMonth >= 4
            ? `${currentTwoDigits}-${nextTwoDigits}`
            : `${prevTwoDigits}-${currentTwoDigits}`;

        if (!selectedYearState && filteredYears.length > 0) {
          setSelectedYearState(
            filteredYears.includes(defaultYearPair)
              ? defaultYearPair
              : filteredYears[0]
          );
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // Reduced from 500ms to 300ms for more responsive search
    return () => clearTimeout(handler);
  }, [searchQuery]);
  // Memoize the data transformation to prevent expensive re-calculations on every render
  const tableData = useMemo(() => {
    return rows.map((row, index) => ({ ...row, id: row._id || `row-${index}` }));
  }, [rows]);  // Memoize the row props function to prevent re-creation on every render
  const getRowProps = useMemo(
    () => ({ row }) => ({
      className: getTableRowsClassname(row),
      sx: { textAlign: "center" },
    }),
    [rows, refreshTrigger] // Add refreshTrigger as dependency to force re-calculation
  );  const table = useMaterialReactTable({
    columns,
    data: tableData,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableRowVirtualization: !isMobile, // Disable virtualization on mobile for better scrolling
    rowVirtualizerOptions: { overscan: isMobile ? 4 : 8 }, // Fewer overscan on mobile
    initialState: {
      density: isMobile ? "comfortable" : "compact",
      columnPinning: { left: isMobile ? [] : ["job_no"] }, // No pinning on mobile
      columnVisibility: isMobile ? {
        // Hide some columns on mobile to improve readability
        detailed_status: false,
        // Add other columns to hide on mobile as needed
      } : {},
    },
    enableGlobalFilter: false,
    enableGrouping: !isMobile, // Disable grouping on mobile
    enableColumnFilters: false,
    enableColumnActions: !isMobile, // Disable column actions on mobile
    enableStickyHeader: true,
    enablePinning: !isMobile, // Disable pinning on mobile
    muiTableContainerProps: {
      sx: { 
        maxHeight: isMobile ? "400px" : "590px", 
        overflowY: "auto",
        overflowX: "auto", // Allow horizontal scroll on mobile
      },
    },
    muiTableBodyRowProps: getRowProps,
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        fontSize: isMobile ? "0.75rem" : "0.875rem",
        padding: isMobile ? "8px 4px" : "16px",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: isMobile ? "0.75rem" : "0.875rem",
        padding: isMobile ? "8px 4px" : "16px",
      },
    },
    muiTableProps: {
      sx: {
        minWidth: isMobile ? "100%" : "auto",
      }
    },
    renderTopToolbarCustomActions: () => (
      <FilterControls
        selectedICD={selectedICD}
        setSelectedICD={setSelectedICD}
        importerNames={importerNames}
        selectedImporter={selectedImporter}
        setSelectedImporter={setSelectedImporter}
        years={years}
        selectedYearState={selectedYearState}
        setSelectedYearState={setSelectedYearState}
        detailedStatus={detailedStatus}
        setDetailedStatus={setDetailedStatus}
        detailedStatusOptions={detailedStatusOptions}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        fetchJobs={fetchJobs}
        handleOpen={handleOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
    ),
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />

      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(event, page) => handlePageChange(page)}
        color="primary"
        sx={{ mt: 2, display: "flex", justifyContent: "center" }}
      />

 <SelectImporterModal
        open={open}
        handleClose={handleClose}
        status={props.status}
        detailedStatus={detailedStatus}
      />
    </div>
  );
}

export default React.memo(JobList);

import React, { useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname";
import useFetchJobList from "../../customHooks/useFetchJobList";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import { UserContext } from "../../contexts/UserContext";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  Autocomplete,
  InputAdornment,
  Box,
  Button,
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
// import { useNavigate, useLocation } from "react-router-dom";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

// Memoized search input to prevent unnecessary re-renders
const SearchInput = React.memo(({ searchQuery, setSearchQuery, fetchJobs }) => {
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const handleSearchClick = useCallback(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  return (
    <TextField
      placeholder="Search by Job No, Importer, or AWB/BL Number"
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
      sx={{ width: "300px", marginRight: "20px" }}
    />
  );
});

SearchInput.displayName = 'SearchInput';


function JobList(props) {
  const showUnresolvedOnly = props.showUnresolvedOnly;

  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);
  
  const { 
    searchQuery, setSearchQuery,
    detailedStatus, setDetailedStatus,
    selectedICD, setSelectedICD,
    selectedImporter, setSelectedImporter  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);  const [importers, setImporters] = useState("");
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
      selectedImporter,
      showUnresolvedOnly // Use prop from JobTabs
    );  // Callback to update row data when data changes in EditableDateCell
  const handleRowDataUpdate = useCallback((jobId, updatedData) => {
    setRows(prevRows => 
      prevRows.map(row => 
        row._id === jobId 
          ? { ...row, ...updatedData }
          : row
      )
    );
    // Also increment refreshTrigger to force getRowProps to recalculate
    setRefreshTrigger(prev => prev + 1);
  }, [setRows]);

  // Determine current tab index based on status
  const getCurrentTabIndex = () => {
    switch (props.status) {
      case "Pending": return 0;
      case "Completed": return 1;
      case "Cancelled": return 2;
      default: return 0;
    }
  };

  // Custom navigation handler for DSR job details
  const handleJobNavigation = (job_no, year) => {
    navigate(`/import-dsr/job/${job_no}/${year}`, {
      state: {
        fromJobList: true,
        currentTab: getCurrentTabIndex(),
        searchQuery,
        detailedStatus,
        selectedICD,
        selectedImporter,
      },
    });
  };

  const columns = useJobColumns(handleRowDataUpdate, handleJobNavigation);

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
  );  // Add unresolved queries filter state
  // Helper to check if a job has any unresolved queries
const hasUnresolvedQuery = (job) => {
  const queryKeys = [
    "do_queries",
    "documentationQueries",
    "eSachitQueries", 
    "submissionQueries",
  ];
  
  return queryKeys.some((key) => {
    const queries = job[key];
    
    if (!Array.isArray(queries) || queries.length === 0) {
      return false;
    }
    
    return queries.some((query) => {
      // A query is considered unresolved if:
      // 1. resolved is not explicitly true, OR
      // 2. resolved is true but there's no meaningful reply (if reply is required)
      
      // If you want to require both resolved=true AND a non-empty reply:
      // return !(query.resolved === true && query.reply && query.reply.trim() !== "");
      
      // If resolved=true is sufficient regardless of reply:
      return query.resolved !== true;
    });
  });
};


  // Filtered table data based on unresolved toggle
  const filteredRows = useMemo(() => {
    if (!showUnresolvedOnly) return rows;
    return rows.filter(hasUnresolvedQuery);
  }, [rows, showUnresolvedOnly]);  const table = useMaterialReactTable({
    columns,
    data: tableData,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableRowVirtualization: true, // Enable row virtualization for better performance
    rowVirtualizerOptions: { overscan: 8 }, // Render a few extra rows for smoother scrolling
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGlobalFilter: false,
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    muiTableContainerProps: {
      sx: { maxHeight: "590px", overflowY: "auto" },
    },
    muiTableBodyRowProps: getRowProps,
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontSize: "1.5rem" }}
        >
          {props.status} Jobs: {total}
        </Typography>

         <TextField
                  select
                  size="small"
                  variant="outlined"
                  label="ICD Code"
                  value={selectedICD}
                  onChange={(e) => {
                    setSelectedICD(e.target.value); // Update the selected ICD code
                  }}
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
          value={selectedImporter || ""} // Controlled value
          onInputChange={(event, newValue) => setSelectedImporter(newValue)} // Handles input change
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer" // Placeholder text
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
          sx={{ width: "250px" }}
        >
          {detailedStatusOptions.map((option, index) => (
            <MenuItem
              key={`status-${option.id || option.value || index}`}
              value={option.value}
            >
              {option.name}
            </MenuItem>
          ))}        </TextField>

        <SearchInput 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          fetchJobs={fetchJobs}
        />
        <IconButton onClick={handleOpen}>
          <DownloadIcon />
        </IconButton>
      </div>
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

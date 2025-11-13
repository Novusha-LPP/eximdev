import React, { useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import { getTableRowsClassname, getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
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
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
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
// Now with auto-trigger: typing automatically searches after debounce
const SearchInput = React.memo(({ searchQuery, setSearchQuery, loading }) => {
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  // Clear search button
  const handleClear = useCallback(() => {
    setSearchQuery("");
  }, [setSearchQuery]);

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
            {loading ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : searchQuery ? (
              <IconButton size="small" onClick={handleClear}>
                <ClearIcon fontSize="small" />
              </IconButton>
            ) : null}
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
  const { onUnresolvedCountChange } = props; // Add prop for callback

  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);
  
  const { 
    searchQuery, setSearchQuery,
    detailedStatus, setDetailedStatus,
    selectedICD, setSelectedICD,
    selectedImporter, setSelectedImporter  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [importers, setImporters] = useState("");
  // Typeahead suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger state
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

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

  const { rows, total, totalPages, currentPage, handlePageChange, fetchJobs, setRows, unresolvedCount, loading, invalidateCache } =
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
    // Invalidate client-side cache to ensure fresh data on next fetch
    if (selectedYearState) {
      invalidateCache(selectedYearState);
    }
    
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row._id === jobId) {
          // Create a new object with updated data
          // Ensure nested arrays/objects get new references for React to detect changes
          const updatedRow = { ...row, ...updatedData };
          // If container_nos is in updatedData, ensure it's a new array reference
          if (updatedData.container_nos) {
            updatedRow.container_nos = Array.isArray(updatedData.container_nos) 
              ? [...updatedData.container_nos] 
              : updatedData.container_nos;
          }
          return updatedRow;
        }
        return row;
      });

      // Check if the job still matches current filter after status change
      const updatedJob = updatedRows.find(j => j._id === jobId);
      if (updatedJob && updatedData.detailed_status) {
        // If current filter is set and the job's status no longer matches
        if (detailedStatus !== "all" && updatedJob.detailed_status !== detailedStatus) {
          // Remove the job from the list
          const filteredRows = updatedRows.filter(j => j._id !== jobId);
          
          // Show notification
          setSnackbar({
            open: true,
            message: `Job moved to '${updatedJob.detailed_status}'. Filter: '${detailedStatus}'`,
          });

          return filteredRows;
        }
      }

      return updatedRows;
    });
    
    // Increment refresh trigger to force getRowProps to recalculate
    setRefreshTrigger(prev => prev + 1);
    
    // Refetch current page with cache bypass to get fresh data from server
    // Use setTimeout to ensure server-side cache invalidation has completed
    // and to avoid race conditions with the update
    setTimeout(() => {
      fetchJobs(currentPage, showUnresolvedOnly, true);
    }, 300);
  }, [detailedStatus, setRows, selectedYearState, invalidateCache, fetchJobs, currentPage, showUnresolvedOnly]);

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
  }, [selectedYearState, setSelectedYearState]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // Reduced from 500ms to 300ms for more responsive search
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch typeahead suggestions as the user types (debounced)
  useEffect(() => {
    let cancelled = false;
    let controller = null;

    const doFetch = async () => {
      if (!selectedYearState) {
        setSuggestions([]);
        return;
      }
      const safeSearch = String(searchQuery || "").trim();
      if (safeSearch.length === 0) {
        setSuggestions([]);
        return;
      }

      setSuggestionsLoading(true);
      try {
        controller = new AbortController();
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING || ""}/${selectedYearState}/jobs/typeahead`,
          {
            params: {
              search: safeSearch,
              limit: 7,
              selectedICD: selectedICD || "all",
              importer: selectedImporter || "all",
            },
            signal: controller.signal,
          }
        );

        if (cancelled) return;

        const rows = (res.data && res.data.data) || [];
        const normalized = rows.map((r) => ({
          label:
            (r.job_no || "") +
            (r.importer ? ` — ${r.importer}` : "") +
            (r.awb_bl_no ? ` — ${r.awb_bl_no}` : "") +
            (r.be_no ? ` — ${r.be_no}` : ""),
          value: r.job_no || r.awb_bl_no || r.be_no || r.importer || "",
        }));
        setSuggestions(normalized);
      } catch (err) {
        // ignore abort errors
        setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    const t = setTimeout(doFetch, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (controller) controller.abort();
    };
  }, [searchQuery, selectedYearState, selectedICD, selectedImporter]);
  // Memoize the data transformation to prevent expensive re-calculations on every render
  const tableData = useMemo(() => {
    return rows.map((row, index) => ({ ...row, id: row._id || `row-${index}` }));
  }, [rows]);  
  // Memoize the row props function to prevent re-creation on every render
  const getRowProps = useMemo(
    () => ({ row }) => ({
      className: getTableRowsClassname(row),
      style: getTableRowInlineStyle(row),
      sx: { textAlign: "center" },
    }),
    [rows, refreshTrigger] // Add refreshTrigger as dependency to force re-calculation
  );

  // Add unresolved queries filter state
  // Helper to check if a job has any unresolved queries

  // Update parent component with unresolved count when it changes
  useEffect(() => {
    if (props.status === "Pending" && onUnresolvedCountChange) {
      onUnresolvedCountChange(unresolvedCount);
    }
  }, [unresolvedCount, onUnresolvedCountChange, props.status]);  const table = useMaterialReactTable({
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
      sx: { maxHeight: "690px", overflowY: "auto" },
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

        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={suggestions}
          getOptionLabel={(option) => (typeof option === 'string' ? option : option.label || '')}
          inputValue={searchQuery}
          onInputChange={(event, newInputValue, reason) => {
            // update controlled search input; 'clear' also handled
            if (reason === 'input' || reason === 'clear' || reason === 'reset') {
              setSearchQuery(newInputValue);
            }
          }}
          onChange={(event, newValue, reason) => {
            // when user selects an option, set search and update debounced value
            if (newValue && typeof newValue === 'object' && newValue.value) {
              setSearchQuery(newValue.value);
              // update debouncedSearchQuery immediately so the hook receives the new value
              setDebouncedSearchQuery(newValue.value);
            }
          }}
          loading={suggestionsLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search by Job No, Importer, or AWB/BL Number"
              size="small"
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <InputAdornment position="end">
                    {suggestionsLoading ? (
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                    ) : searchQuery ? (
                      <IconButton size="small" onClick={() => setSearchQuery("") }>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </InputAdornment>
                ),
              }}
            />
          )}
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

      {/* Snackbar for Filter Mismatch Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ open: false, message: "" })}
          severity="info"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default React.memo(JobList);

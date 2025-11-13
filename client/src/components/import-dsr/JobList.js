import React, { useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import { getTableRowsClassname, getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
import useFetchJobList from "../../customHooks/useFetchJobList";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { UserContext } from "../../contexts/UserContext";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  Autocomplete,
  InputAdornment,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./SelectImporterModal";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

// Extracts leading job number from a label like "03795 — D.K ENTERPRISE — WLHC25080001 — 4419173"
const extractJobNo = (input) => {
  if (!input) return "";
  const s = typeof input === "string" ? input : String(input.label || input.value || "");
  // Trim at first "—" or "-"
  const first = s.split("—")[0].split("-")[0].trim();
  // Keep only digits (your job nos look numeric with leading zeros)
  const digits = first.replace(/[^\d]/g, "");
  return digits || first;
};

function JobList(props) {
  const showUnresolvedOnly = props.showUnresolvedOnly;
  const { onUnresolvedCountChange } = props;

  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);

  const {
    searchQuery, setSearchQuery,
    detailedStatus, setDetailedStatus,
    selectedICD, setSelectedICD,
    selectedImporter, setSelectedImporter
  } = useSearchQuery();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [importers, setImporters] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Normalize debounce: keep only job number if input starts with digits
  useEffect(() => {
    const handler = setTimeout(() => {
      const s = String(searchQuery || "").trim();
      const looksLikeJob = /^\d{2,}/.test(s);
      setDebouncedSearchQuery(looksLikeJob ? extractJobNo(s) : s);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Clear search state unless coming back from job details
  useEffect(() => {
    if (!(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setDetailedStatus("all");
      setSelectedICD("all");
      setSelectedImporter("");
    }
    if (location.state && location.state.fromJobDetails) {
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line

  // Importer list for importer dropdown (unchanged)
  useEffect(() => {
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
    const unique = new Set();
    return importerData
      .filter((i) => {
        if (unique.has(i.importer)) return false;
        unique.add(i.importer);
        return true;
      })
      .map((i, idx) => ({ label: i.importer, key: `${i.importer}-${idx}` }));
  };
  const importerNames = useMemo(() => getUniqueImporterNames(importers), [importers]);

  // Fetch jobs
  const { rows, total, totalPages, currentPage, handlePageChange, fetchJobs, setRows, unresolvedCount, loading, invalidateCache } =
    useFetchJobList(
      detailedStatus,
      selectedYearState,
      props.status,
      selectedICD,
      debouncedSearchQuery,
      selectedImporter,
      showUnresolvedOnly
    );

  // Typeahead suggestions
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

        const dataRows = (res.data && res.data.data) || [];
        // IMPORTANT: value is strictly job_no
        const normalized = dataRows.map((r) => ({
          label:
            (r.job_no || "") +
            (r.importer ? ` — ${r.importer}` : "") +
            (r.awb_bl_no ? ` — ${r.awb_bl_no}` : "") +
            (r.be_no ? ` — ${r.be_no}` : ""),
          value: String(r.job_no || "").trim(),
        }));
        setSuggestions(normalized);
      } catch {
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

  // Update handler from child edits
  const handleRowDataUpdate = useCallback((jobId, updatedData) => {
    if (selectedYearState) {
      invalidateCache(selectedYearState);
    }

    setRows(prev => {
      const updated = prev.map(row => {
        if (row._id === jobId) {
          const next = { ...row, ...updatedData };
          if (updatedData.container_nos) {
            next.container_nos = Array.isArray(updatedData.container_nos)
              ? [...updatedData.container_nos]
              : updatedData.container_nos;
          }
          return next;
        }
        return row;
      });

      const updatedJob = updated.find(j => j._id === jobId);
      if (updatedJob && updatedData.detailed_status) {
        if (detailedStatus !== "all" && updatedJob.detailed_status !== detailedStatus) {
          const filtered = updated.filter(j => j._id !== jobId);
          setSnackbar({
            open: true,
            message: `Job moved to '${updatedJob.detailed_status}'. Filter: '${detailedStatus}'`,
          });
          return filtered;
        }
      }
      return updated;
    });

    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => {
      fetchJobs(currentPage, showUnresolvedOnly, true);
    }, 300);
  }, [detailedStatus, setRows, selectedYearState, invalidateCache, fetchJobs, currentPage, showUnresolvedOnly]);

  // Years fetch & default selection
  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-years`);
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const prevTwo = String((currentYear - 1) % 100).padStart(2, "0");
        const currTwo = String(currentYear).slice(-2);
        const nextTwo = String((currentYear + 1) % 100).padStart(2, "0");
        const defaultYearPair = currentMonth >= 4 ? `${currTwo}-${nextTwo}` : `${prevTwo}-${currTwo}`;

        if (!selectedYearState && filteredYears.length > 0) {
          setSelectedYearState(
            filteredYears.includes(defaultYearPair) ? defaultYearPair : filteredYears[0]
          );
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);

  // Table data and row props
  const tableData = useMemo(
    () => rows.map((row, index) => ({ ...row, id: row._id || `row-${index}` })),
    [rows]
  );

  const getRowProps = useMemo(
    () => ({ row }) => ({
      className: getTableRowsClassname(row),
      style: getTableRowInlineStyle(row),
      sx: { textAlign: "center" },
    }),
    [rows, refreshTrigger]
  );

  // Unresolved count bubble
  useEffect(() => {
    if (props.status === "Pending" && onUnresolvedCountChange) {
      onUnresolvedCountChange(unresolvedCount);
    }
  }, [unresolvedCount, onUnresolvedCountChange, props.status]);

  const table = useMaterialReactTable({
    columns: useJobColumns(handleRowDataUpdate, (job_no, year) =>
      navigate(`/import-dsr/job/${job_no}/${year}`, {
        state: {
          fromJobList: true,
          currentTab: (() => {
            switch (props.status) {
              case "Pending": return 0;
              case "Completed": return 1;
              case "Cancelled": return 2;
              default: return 0;
            }
          })(),
          searchQuery,
          detailedStatus,
          selectedICD,
          selectedImporter,
        },
      })
    ),
    data: tableData,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableRowVirtualization: true,
    rowVirtualizerOptions: { overscan: 8 },
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
    muiTableContainerProps: { sx: { maxHeight: "690px", overflowY: "auto" } },
    muiTableBodyRowProps: getRowProps,
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 1 } },
    renderTopToolbarCustomActions: () => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <Typography variant="body1" sx={{ fontWeight: "bold", fontSize: "1.5rem" }}>
          {props.status} Jobs: {total}
        </Typography>

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
          options={importerNames.map((o) => o.label)}
          value={selectedImporter || ""}
          onInputChange={(event, newValue) => setSelectedImporter(newValue)}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" size="small" fullWidth label="Select Importer" />
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
            <MenuItem key={`status-${option.id || option.value || index}`} value={option.value}>
              {option.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Single unified Autocomplete for global search */}
        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={suggestions}
          getOptionLabel={(option) =>
            typeof option === "string" ? option : option.label || ""
          }
          inputValue={searchQuery}
          onInputChange={(event, newInputValue, reason) => {
            if (reason === "input" || reason === "clear" || reason === "reset") {
              setSearchQuery(newInputValue);
            }
          }}
          onChange={(event, newValue) => {
            if (!newValue) return;
            if (typeof newValue === "object") {
              // value strictly job_no from suggestions
              const jobNo = extractJobNo(newValue.value || newValue.label || "");
              setSearchQuery(jobNo);
              setDebouncedSearchQuery(jobNo);
            } else if (typeof newValue === "string") {
              const jobNo = extractJobNo(newValue);
              setSearchQuery(jobNo);
              setDebouncedSearchQuery(jobNo);
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
                      <IconButton size="small" onClick={() => setSearchQuery("")}>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar({ open: false, message: "" })} severity="info" sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default React.memo(JobList);

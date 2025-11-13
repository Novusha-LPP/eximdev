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
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./SelectImporterModal";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

// Strictly extract job number (e.g., "03795 — ..." -> "03795")
const extractJobNo = (input) => {
  if (!input) return "";
  const s = typeof input === "string" ? input : String(input.label || input.value || "");
  const first = s.split("—")[0].split("-")[0].trim();
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
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Local input for instant typing
  const [localInput, setLocalInput] = useState(searchQuery);

  // Clear state unless returning from details
  useEffect(() => {
    if (!(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setDetailedStatus("all");
      setSelectedICD("all");
      setSelectedImporter("");
      setLocalInput("");
    }
    if (location.state && location.state.fromJobDetails) {
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line
  }, []);

  // Importer list
  useEffect(() => {
    async function getImporterList() {
      if (!selectedYearState) return;
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`);
      setImporters(res.data);
    }
    getImporterList();
  }, [selectedYearState]);

  const getUniqueImporterNames = useCallback((importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const seen = new Set();
    return importerData
      .filter((x) => {
        if (seen.has(x.importer)) return false;
        seen.add(x.importer);
        return true;
      })
      .map((x, i) => ({ label: x.importer, key: `${x.importer}-${i}` }));
  }, []);

  const importerNames = useMemo(() => [...getUniqueImporterNames(importers)], [importers, getUniqueImporterNames]);

  // Main jobs hook
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

  // Sync local input -> searchQuery (fast debounce to keep UI snappy)
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(localInput);
    }, 150);
    return () => clearTimeout(t);
  }, [localInput, setSearchQuery]);

  // Normalize to pure job no into debouncedSearchQuery
  useEffect(() => {
    const t = setTimeout(() => {
      const s = String(searchQuery || "").trim();
      const looksLikeJob = /^\d{2,}/.test(s);
      setDebouncedSearchQuery(looksLikeJob ? extractJobNo(s) : s);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Typeahead suggestions (min 2 chars) based on localInput
  useEffect(() => {
    let cancelled = false;
    let controller = null;

    const doFetch = async () => {
      if (!selectedYearState) {
        setSuggestions([]);
        return;
      }
      const q = String(localInput || "").trim();
      if (q.length < 2) {
        setSuggestions([]);
        setSuggestionsLoading(false);
        return;
      }

      setSuggestionsLoading(true);
      try {
        controller = new AbortController();
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING || ""}/${selectedYearState}/jobs/typeahead`,
          {
            params: {
              search: q,
              limit: 7,
              selectedICD: selectedICD || "all",
              importer: selectedImporter || "all",
            },
            signal: controller.signal,
          }
        );
        if (cancelled) return;
        const data = (res.data && res.data.data) || [];
        const normalized = data.map((r) => ({
          label:
            (r.job_no || "") +
            (r.importer ? ` — ${r.importer}` : "") +
            (r.awb_bl_no ? ` — ${r.awb_bl_no}` : "") +
            (r.be_no ? ` — ${r.be_no}` : ""),
          value: String(r.job_no || "").trim(), // strictly job_no
        }));
        setSuggestions(normalized);
      } catch {
        if (!cancelled) setSuggestions([]);
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
  }, [localInput, selectedYearState, selectedICD, selectedImporter]);

  const tableData = useMemo(() => rows.map((row, idx) => ({ ...row, id: row._id || `row-${idx}` })), [rows]);

  const getRowProps = useMemo(
    () => ({ row }) => ({
      className: getTableRowsClassname(row),
      style: getTableRowInlineStyle(row),
      sx: { textAlign: "center" },
    }),
    [rows, refreshTrigger]
  );

  useEffect(() => {
    if (props.status === "Pending" && onUnresolvedCountChange) {
      onUnresolvedCountChange(unresolvedCount);
    }
  }, [unresolvedCount, onUnresolvedCountChange, props.status]);

  // Row update from child editor
  const handleRowDataUpdate = useCallback((jobId, updatedData) => {
    if (selectedYearState) invalidateCache(selectedYearState);
    setRows(prev => {
      const updated = prev.map(r => {
        if (r._id !== jobId) return r;
        const next = { ...r, ...updatedData };
        if (updatedData.container_nos) {
          next.container_nos = Array.isArray(updatedData.container_nos)
            ? [...updatedData.container_nos]
            : updatedData.container_nos;
        }
        return next;
      });
      const updatedJob = updated.find(j => j._id === jobId);
      if (updatedJob && updatedData.detailed_status) {
        if (detailedStatus !== "all" && updatedJob.detailed_status !== detailedStatus) {
          const filtered = updated.filter(j => j._id !== jobId);
          setSnackbar({ open: true, message: `Job moved to '${updatedJob.detailed_status}'. Filter: '${detailedStatus}'` });
          return filtered;
        }
      }
      return updated;
    });
    setRefreshTrigger(x => x + 1);
    setTimeout(() => fetchJobs(currentPage, showUnresolvedOnly, true), 300);
  }, [selectedYearState, invalidateCache, setRows, detailedStatus, fetchJobs, currentPage, showUnresolvedOnly]);

  // Years initialization
  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-years`);
        const filtered = res.data.filter((y) => y !== null);
        setYears(filtered);

        const now = new Date();
        const year = now.getFullYear();
        const mon = now.getMonth() + 1;
        const prevTwo = String((year - 1) % 100).padStart(2, "0");
        const currTwo = String(year).slice(-2);
        const nextTwo = String((year + 1) % 100).padStart(2, "0");
        const defaultPair = mon >= 4 ? `${currTwo}-${nextTwo}` : `${prevTwo}-${currTwo}`;

        if (!selectedYearState && filtered.length > 0) {
          setSelectedYearState(filtered.includes(defaultPair) ? defaultPair : filtered[0]);
        }
      } catch (e) {
        console.error("Error fetching years:", e);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);

  // Handlers
  const handleICDChange = useCallback((e) => setSelectedICD(e.target.value), [setSelectedICD]);
  const handleImporterChange = useCallback((e, v) => setSelectedImporter(v), [setSelectedImporter]);
  const handleYearChange = useCallback((e) => setSelectedYearState(e.target.value), [setSelectedYearState]);
  const handleDetailedStatusChange = useCallback((e) => setDetailedStatus(e.target.value), [setDetailedStatus]);

  const handleLocalInputChange = useCallback((event, newInputValue, reason) => {
    if (reason === "input" || reason === "clear" || reason === "reset") {
      setLocalInput(newInputValue);
    }
  }, []);

  const handleSearchChange = useCallback((event, newValue) => {
    if (!newValue) return;
    if (typeof newValue === "object") {
      const jobNo = extractJobNo(newValue.value || newValue.label || "");
      setLocalInput(jobNo);
      setSearchQuery(jobNo);
      setDebouncedSearchQuery(jobNo);
      return;
    }
    if (typeof newValue === "string") {
      const jobNo = extractJobNo(newValue);
      setLocalInput(jobNo);
      setSearchQuery(jobNo);
      setDebouncedSearchQuery(jobNo);
    }
  }, [setSearchQuery]);

  const handleClearSearch = useCallback(() => {
    setLocalInput("");
    setSearchQuery("");
  }, [setSearchQuery]);

  const renderTopToolbarCustomActions = useCallback(() => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <Typography variant="body1" sx={{ fontWeight: "bold", fontSize: "1.5rem" }}>
        {props.status} Jobs: {total}
      </Typography>

      <TextField
        select size="small" variant="outlined" label="ICD Code"
        value={selectedICD} onChange={handleICDChange}
        sx={{ width: "200px", marginRight: "20px" }}
      >
        <MenuItem value="all">All ICDs</MenuItem>
        <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
        <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
        <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
      </TextField>

      <Autocomplete
        sx={{ width: "300px", marginRight: "20px" }}
        freeSolo options={importerNames.map(o => o.label)}
        value={selectedImporter || ""} onInputChange={handleImporterChange}
        renderInput={(params) => (
          <TextField {...params} variant="outlined" size="small" fullWidth label="Select Importer" />
        )}
      />

      {years.length > 0 && (
        <TextField
          select size="small" value={selectedYearState} onChange={handleYearChange}
          sx={{ width: "100px", marginRight: "20px" }}
        >
          {years.map((y, i) => (
            <MenuItem key={`year-${y}-${i}`} value={y}>{y}</MenuItem>
          ))}
        </TextField>
      )}

      <TextField
        select size="small" value={detailedStatus} onChange={handleDetailedStatusChange}
        sx={{ width: "250px" }}
      >
        {detailedStatusOptions.map((o, i) => (
          <MenuItem key={`status-${o.id || o.value || i}`} value={o.value}>
            {o.name}
          </MenuItem>
        ))}
      </TextField>

      {/* Unified job search with instant typing and strict job_no selection */}
      <Autocomplete
        sx={{ width: "300px", marginRight: "20px" }}
        freeSolo
        options={suggestions}
        getOptionLabel={(option) => (typeof option === "string" ? option : option.label || "")}
        inputValue={localInput}
        onInputChange={handleLocalInputChange}
        onChange={handleSearchChange}
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
                  ) : localInput ? (
                    <IconButton size="small" onClick={handleClearSearch}>
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
  ), [
    props.status, total,
    selectedICD, handleICDChange,
    importerNames, selectedImporter, handleImporterChange,
    years, selectedYearState, handleYearChange,
    detailedStatus, handleDetailedStatusChange,
    suggestions, localInput, handleLocalInputChange, handleSearchChange,
    suggestionsLoading, handleClearSearch, handleOpen
  ]);

  const columns = useJobColumns(
    (jobId, updatedData) => handleRowDataUpdate(jobId, updatedData),
    (job_no, year) =>
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
          searchQuery, detailedStatus, selectedICD, selectedImporter,
        },
      })
  );

  const table = useMaterialReactTable({
    columns,
    data: tableData,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableRowVirtualization: true,
    rowVirtualizerOptions: { overscan: 8 },
    initialState: { density: "compact", columnPinning: { left: ["job_no"] } },
    enableGlobalFilter: false,
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    muiTableContainerProps: { sx: { maxHeight: "690px", overflowY: "auto" } },
    muiTableBodyRowProps: getRowProps,
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 1 } },
    renderTopToolbarCustomActions: renderTopToolbarCustomActions,
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />

      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(e, page) => handlePageChange(page)}
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

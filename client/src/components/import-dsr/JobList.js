import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import {
  getTableRowsClassname,
  getTableRowInlineStyle,
} from "../../utils/getTableRowsClassname";
import useFetchJobList from "../../customHooks/useFetchJobList";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { UserContext } from "../../contexts/UserContext";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  Snackbar,
  Alert,
  Autocomplete,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./SelectImporterModal";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

const extractJobNo = (input) => {
  if (!input) return "";
  const s =
    typeof input === "string"
      ? input
      : String(input.label || input.value || "");
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
    searchQuery,
    setSearchQuery,
    detailedStatus,
    setDetailedStatus,
    selectedICD,
    setSelectedICD,
    selectedImporter,
    setSelectedImporter,
    selectedBeType,
    setSelectedBeType,
  } = useSearchQuery();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [importers, setImporters] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [localInput, setLocalInput] = useState(searchQuery);

  // Clear state unless returning from details
  useEffect(() => {
    if (!(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setDetailedStatus("all");
      setSelectedICD("all");
      setSelectedICD("all");
      setSelectedImporter("");
      setSelectedBeType("all");
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
      const params = new URLSearchParams();
      if (detailedStatus && detailedStatus !== "all") {
        params.append("detailedStatus", detailedStatus);
      }
      const queryString = params.toString();
      const url = `${process.env.REACT_APP_API_STRING
        }/get-importer-list/${selectedYearState}${queryString ? "?" + queryString : ""
        }`;
      const res = await axios.get(url);

      let fetchedImporters = res.data;

      // Filter based on assigned importers if not Admin
      if (user && user.role !== 'Admin') {
        const assignedImporters = user.assigned_importer_name || [];
        fetchedImporters = fetchedImporters.filter(item =>
          assignedImporters.includes(item.importer)
        );
      }

      setImporters(fetchedImporters);
    }
    getImporterList();
  }, [selectedYearState, detailedStatus, user]);

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

  const importerNames = useMemo(
    () => [...getUniqueImporterNames(importers)],
    [importers, getUniqueImporterNames]
  );

  // Main jobs hook
  const {
    rows,
    total,
    totalPages,
    currentPage,
    handlePageChange,
    fetchJobs,
    setRows,
    unresolvedCount,
    loading,
    invalidateCache,
  } = useFetchJobList(
    detailedStatus,
    selectedYearState,
    props.status,
    selectedICD,
    debouncedSearchQuery,
    selectedImporter,
    selectedBeType,
    showUnresolvedOnly
  );

  // When unresolved toggle changes, re-fetch page 1
  useEffect(() => {
    if (selectedYearState && user) {
      fetchJobs(1, showUnresolvedOnly, true);
    }
  }, [showUnresolvedOnly, selectedYearState, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local input -> searchQuery
  useEffect(() => {
    setSearchQuery(localInput);
  }, [localInput, setSearchQuery]);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => {
      const s = String(searchQuery || "").trim();
      const looksLikeJob = /^\d{2,}/.test(s);
      setDebouncedSearchQuery(looksLikeJob ? extractJobNo(s) : s);
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const tableData = useMemo(
    () => rows.map((row, idx) => ({ ...row, id: row._id || `row-${idx}` })),
    [rows]
  );

  const getRowProps = useMemo(
    () =>
      ({ row }) => ({
        className: getTableRowsClassname(row),
        style: getTableRowInlineStyle(row),
        sx: { textAlign: "center" },
      }),
    [rows, refreshTrigger]
  );

  // unresolved count from server
  useEffect(() => {
    if (props.status === "Pending" && onUnresolvedCountChange) {
      onUnresolvedCountChange(unresolvedCount);
    }
  }, [unresolvedCount, onUnresolvedCountChange, props.status]);

  // Row update from child editor (snackbar for moves)
  const handleRowDataUpdate = useCallback(
    (jobId, updatedData) => {
      if (selectedYearState) invalidateCache(selectedYearState);
      setRows((prev) => {
        const updated = prev.map((r) => {
          if (r._id !== jobId) return r;

          // Start with a shallow copy of the existing row
          const next = { ...r };

          // If updatedData is an object, merge keys into `next`.
          // Support dotted paths like 'container_nos.0.arrival_date'.
          if (updatedData && typeof updatedData === "object") {
            Object.entries(updatedData).forEach(([k, v]) => {
              if (k === "__op") return; // ignore op marker

              if (k.includes(".")) {
                const parts = k.split(".");

                // Ensure top-level array/object exists (common case: container_nos)
                if (parts[0] === "container_nos") {
                  if (!Array.isArray(next.container_nos)) {
                    next.container_nos = Array.isArray(r.container_nos)
                      ? [...r.container_nos]
                      : [];
                  }
                }

                let cur = next;
                for (let i = 0; i < parts.length; i++) {
                  const p = parts[i];
                  const isLast = i === parts.length - 1;
                  const nextPart = parts[i + 1];

                  if (isLast) {
                    // assign final value
                    if (Array.isArray(cur) && /^\d+$/.test(p)) {
                      cur[parseInt(p, 10)] = v;
                    } else {
                      cur[p] = v;
                    }
                  } else {
                    // prepare next container
                    if (/^\d+$/.test(nextPart)) {
                      // next should be an array
                      if (!cur[p]) cur[p] = [];
                      if (!Array.isArray(cur[p])) cur[p] = [];
                      cur = cur[p];
                    } else {
                      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
                      cur = cur[p];
                    }
                  }
                }
              } else {
                // simple top-level key
                if (k === "container_nos" && Array.isArray(v)) {
                  next.container_nos = [...v];
                } else {
                  next[k] = v;
                }
              }
            });
          }

          return next;
        });
        const updatedJob = updated.find((j) => j._id === jobId);
        if (updatedJob && updatedData.detailed_status) {
          if (
            detailedStatus !== "all" &&
            updatedJob.detailed_status !== detailedStatus
          ) {
            const filtered = updated.filter((j) => j._id !== jobId);
            setSnackbar({
              open: true,
              message: `Job moved to '${updatedJob.detailed_status}'. Filter: '${detailedStatus}'`,
            });
            return filtered;
          }
        }
        return updated;
      });
      setRefreshTrigger((x) => x + 1);

      // Debug info: log update details to help trace disappearing rows
      try {
        console.log(
          "handleRowDataUpdate:",
          { jobId, updatedData },
          "currentFilter:",
          detailedStatus,
          "page:",
          currentPage,
          new Date().toISOString()
        );
      } catch (e) {
        /* ignore */
      }

      // Only refetch page if the job's detailed_status changed (moved between filters).
      // This avoids immediate refetch that may remove the row if server-side logic briefly
      // changes data while we're editing simple fields like ETA.
      const shouldRefetch = (() => {
        try {
          // updatedData may be a full server job or a partial payload
          const newStatus =
            (updatedData && updatedData.detailed_status) || null;
          // find previous status from current rows (rows state may be stale here; use fetchJobs as fallback)
          const prev = rows.find((r) => r._id === jobId);
          const prevStatus = prev ? prev.detailed_status : null;
          return newStatus && prevStatus && newStatus !== prevStatus;
        } catch (e) {
          return false;
        }
      })();

      if (shouldRefetch) {
        setTimeout(() => fetchJobs(currentPage, showUnresolvedOnly, true), 300);
      }
    },
    [
      selectedYearState,
      invalidateCache,
      setRows,
      detailedStatus,
      fetchJobs,
      currentPage,
      showUnresolvedOnly,
    ]
  );

  const handleSearchClick = () => {
    // optional: force immediate debounce update or page reset
    setSearchQuery(localInput);
    // if you want to always go to page 1:
    // fetchJobs(1, showUnresolvedOnly, true);
  };

  // Years initialization
  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filtered = res.data.filter((y) => y !== null);
        setYears(filtered);

        const now = new Date();
        const year = now.getFullYear();
        const mon = now.getMonth() + 1;
        const prevTwo = String((year - 1) % 100).padStart(2, "0");
        const currTwo = String(year).slice(-2);
        const nextTwo = String((year + 1) % 100).padStart(2, "0");
        const defaultPair =
          mon >= 4 ? `${currTwo}-${nextTwo}` : `${prevTwo}-${currTwo}`;

        if (!selectedYearState && filtered.length > 0) {
          setSelectedYearState(
            filtered.includes(defaultPair) ? defaultPair : filtered[0]
          );
        }
      } catch (e) {
        console.error("Error fetching years:", e);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);

  // Handlers
  const handleICDChange = useCallback(
    (e) => setSelectedICD(e.target.value),
    [setSelectedICD]
  );
  const handleImporterChange = useCallback(
    (e, v) => setSelectedImporter(v),
    [setSelectedImporter]
  );
  const handleYearChange = useCallback(
    (e) => setSelectedYearState(e.target.value),
    [setSelectedYearState]
  );
  const handleDetailedStatusChange = useCallback(
    (e) => setDetailedStatus(e.target.value),
    [setDetailedStatus]
  );

  const handleBeTypeChange = useCallback(
    (e) => setSelectedBeType(e.target.value),
    [setSelectedBeType]
  );

  const handleLocalInputChange = useCallback((e) => {
    setLocalInput(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalInput("");
    setSearchQuery("");
  }, [setSearchQuery]);

  const renderTopToolbarCustomActions = useCallback(
    () => (
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
          onChange={handleICDChange}
          sx={{ width: "135px", marginRight: "10px" }}
        >
          <MenuItem value="all">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          variant="outlined"
          label="Type of BE"
          value={selectedBeType}
          onChange={handleBeTypeChange}
          sx={{ width: "135px", marginRight: "10px" }}
        >
          <MenuItem value="all">All BE Types</MenuItem>
          <MenuItem value="Home">Home</MenuItem>
          <MenuItem value="In-Bond">In-Bond</MenuItem>
          <MenuItem value="Ex-Bond">Ex-Bond</MenuItem>
        </TextField>

        <Autocomplete
          sx={{ width: "220px", marginRight: "10px" }}
          freeSolo
          options={importerNames.map((o) => o.label)}
          value={selectedImporter || ""}
          onInputChange={handleImporterChange}
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
            onChange={handleYearChange}
            sx={{ width: "90px", marginRight: "10px" }}
          >
            {years.map((y, i) => (
              <MenuItem key={`year-${y}-${i}`} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          size="small"
          value={detailedStatus}
          onChange={handleDetailedStatusChange}
          sx={{ width: "220px", marginRight: "10px" }}
        >
          {detailedStatusOptions.map((o, i) => (
            <MenuItem key={`status-${o.id || o.value || i}`} value={o.value}>
              {o.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Simple search input (no typeahead/suggestions) */}
        <TextField
          value={localInput}
          onChange={handleLocalInputChange}
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          sx={{ width: "250px", marginRight: "10px" }}
          InputProps={{
            endAdornment: (
              <IconButton size="small" onClick={handleSearchClick}>
                <SearchIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />

        <IconButton onClick={handleOpen}>
          <DownloadIcon />
        </IconButton>
      </div>
    ),
    [
      props.status,
      total,
      selectedICD,
      handleICDChange,
      importerNames,
      selectedImporter,
      setSelectedImporter,
      years,
      selectedYearState,
      handleYearChange,
      detailedStatus,
      handleDetailedStatusChange,
      localInput,
      handleLocalInputChange,
      handleClearSearch,
      handleOpen,
      selectedBeType, // dependency
      handleBeTypeChange // dependency
    ]
  );

  const columns = useJobColumns(
    (jobId, updatedData) => handleRowDataUpdate(jobId, updatedData),
    (job_no, year) =>
      navigate(`/import-dsr/job/${job_no}/${year}`, {
        state: {
          fromJobList: true,
          currentTab: (() => {
            switch (props.status) {
              case "Pending":
                return 0;
              case "Completed":
                return 1;
              case "Cancelled":
                return 2;
              default:
                return 0;
            }
          })(),
          searchQuery,
          detailedStatus,
          selectedICD,
          selectedImporter,
          selectedBeType, // persist
        },
      }),
    setRows, // <-- pass here
    invalidateCache,
    selectedYearState
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
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 999 } },
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

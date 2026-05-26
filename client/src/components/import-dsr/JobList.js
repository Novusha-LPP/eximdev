import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
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
import axios from "axios";
import SelectImporterModal from "./SelectImporterModal";
import MyDocRequests from "../document-collection/MyDocRequests";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { BranchContext } from "../../contexts/BranchContext.js";
import useDynamicICDs from "../../customHooks/useDynamicICDs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faDownload, faFileLines } from "@fortawesome/free-solid-svg-icons";

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

  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const dynamicICDs = useDynamicICDs();
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
    selectedMode,
    setSelectedMode,
  } = useSearchQuery();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [importers, setImporters] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const [open, setOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [localInput, setLocalInput] = useState(searchQuery);
  const [importerDropdownOpen, setImporterDropdownOpen] = useState(false);
  const [importerFilter, setImporterFilter] = useState("");
  const importerDropdownRef = useRef(null);

  // Column resize state
  const [columnWidths, setColumnWidths] = useState({});
  const resizingRef = useRef(null);

  // Column sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Clear state unless returning from details
  useEffect(() => {
    if (!(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setDetailedStatus("all");
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
      if (selectedBranch) {
        params.append("branchId", selectedBranch);
      }
      if (selectedCategory) {
        params.append("category", selectedCategory);
      }
      const queryString = params.toString();
      const url = `${process.env.REACT_APP_API_STRING
        }/get-importer-list/${selectedYearState}${queryString ? "?" + queryString : ""
        }`;
      const res = await axios.get(url);

      let fetchedImporters = res.data;

      if (user && user.role !== 'Admin') {
        const assignedImporters = user.assigned_importer_name || [];
        fetchedImporters = fetchedImporters.filter(item =>
          assignedImporters.includes(item.importer)
        );
      }

      setImporters(fetchedImporters);
    }
    getImporterList();
  }, [selectedYearState, detailedStatus, user, selectedBranch, selectedCategory]);

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

  const filteredImporterNames = useMemo(() => {
    const list = importerNames.map((o) => o.label);
    if (!importerFilter) return list;
    return list.filter((name) =>
      name.toLowerCase().includes(importerFilter.toLowerCase())
    );
  }, [importerNames, importerFilter]);

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
    showUnresolvedOnly,
    selectedBranch,
    selectedMode,
    selectedCategory
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
      const looksLikeFormattedJob = /^\d+.*[-—]/.test(s);
      setDebouncedSearchQuery(looksLikeFormattedJob ? extractJobNo(s) : s);
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const tableData = useMemo(
    () => rows.map((row, idx) => ({ ...row, id: row._id || `row-${idx}` })),
    [rows]
  );

  // Client-side sort on current page rows
  const sortedTableData = useMemo(() => {
    if (!sortConfig.key) return tableData;
    return [...tableData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const getRowProps = useMemo(
    () =>
      ({ row }) => ({
        className: getTableRowsClassname(row),
        style: getTableRowInlineStyle(row),
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
          const next = { ...r };

          if (updatedData && typeof updatedData === "object") {
            Object.entries(updatedData).forEach(([k, v]) => {
              if (k === "__op") return;

              if (k.includes(".")) {
                const parts = k.split(".");
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
                    if (Array.isArray(cur) && /^\d+$/.test(p)) {
                      cur[parseInt(p, 10)] = v;
                    } else {
                      cur[p] = v;
                    }
                  } else {
                    if (/^\d+$/.test(nextPart)) {
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

      const shouldRefetch = (() => {
        try {
          const newStatus =
            (updatedData && updatedData.detailed_status) || null;
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
    setSearchQuery(localInput);
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

  // Close importer dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        importerDropdownRef.current &&
        !importerDropdownRef.current.contains(e.target)
      ) {
        setImporterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Column resize handlers
  const handleResizeStart = useCallback((e, accessorKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[accessorKey] || 150;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [accessorKey]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      resizingRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    resizingRef.current = accessorKey;
  }, [columnWidths]);

  // Column sort handler
  const handleSort = useCallback((accessorKey) => {
    setSortConfig((prev) => {
      if (prev.key === accessorKey) {
        if (prev.direction === "asc") return { key: accessorKey, direction: "desc" };
        return { key: null, direction: "asc" };
      }
      return { key: accessorKey, direction: "asc" };
    });
  }, []);

  // Handlers
  const handleICDChange = useCallback(
    (e) => setSelectedICD(e.target.value),
    [setSelectedICD]
  );
  const handleImporterChange = useCallback(
    (val) => setSelectedImporter(val),
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
          selectedBeType,
          selectedBranch,
          selectedMode
        },
      }),
    setRows,
    invalidateCache,
    selectedYearState
  );

  const renderCell = (col, row, isExpanded) => {
    const content = (() => {
      if (!col.Cell) {
        return row[col.accessorKey] ?? "";
      }
      const cell = {
        getValue: () => row[col.accessorKey],
        row: { original: row },
      };
      return col.Cell({ cell, row: { original: row } });
    })();
    return (
      <div className={`cell-content ${isExpanded ? "expanded" : "collapsed"}`}>
        {content}
      </div>
    );
  };

  const toggleRowExpand = (rowId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  return (
    <div className="job-list-container">
      {/* Toolbar */}
      <div className="job-list-toolbar">
        <div className="toolbar-left">
          <h2 className="status-heading">
            {props.status} Jobs: {total}
          </h2>
        </div>

        <div className="toolbar-filters">
          <div className="filter-group">
            <label>ICD Code</label>
            <select value={selectedICD} onChange={handleICDChange}>
              <option value="all">All ICDs</option>
              {dynamicICDs.map((icd, index) => (
                <option key={index} value={icd}>{icd}</option>
              ))}
              {selectedICD !== "all" && !dynamicICDs.includes(selectedICD) && (
                <option value={selectedICD}>{selectedICD}</option>
              )}
            </select>
          </div>

          <div className="filter-group">
            <label>Type of BE</label>
            <select value={selectedBeType} onChange={handleBeTypeChange}>
              <option value="all">All BE Types</option>
              <option value="Home">Home</option>
              <option value="In-Bond">In-Bond</option>
              <option value="Ex-Bond">Ex-Bond</option>
            </select>
          </div>

          <div className="filter-group autocomplete-wrapper" ref={importerDropdownRef}>
            <label>Importer</label>
            <input
              type="text"
              value={selectedImporter || ""}
              onChange={(e) => {
                setImporterFilter(e.target.value);
                handleImporterChange(e.target.value);
                setImporterDropdownOpen(true);
              }}
              onFocus={() => setImporterDropdownOpen(true)}
              placeholder="Select Importer"
            />
            {importerDropdownOpen && filteredImporterNames.length > 0 && (
              <ul className="autocomplete-dropdown">
                {filteredImporterNames.map((name, i) => (
                  <li
                    key={i}
                    onClick={() => {
                      handleImporterChange(name);
                      setImporterFilter("");
                      setImporterDropdownOpen(false);
                    }}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {years.length > 0 && (
            <div className="filter-group">
              <label>Year</label>
              <select value={selectedYearState} onChange={handleYearChange}>
                {years.map((y, i) => (
                  <option key={`year-${y}-${i}`} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Status</label>
            <select value={detailedStatus} onChange={handleDetailedStatusChange}>
              {detailedStatusOptions.map((o, i) => (
                <option key={`status-${o.id || o.value || i}`} value={o.value}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search</label>
            <div className="search-input-wrapper">
              <input
                type="text"
                value={localInput}
                onChange={handleLocalInputChange}
                placeholder="Job No, Importer, or AWB/BL Number"
              />
              <button className="icon-btn" onClick={handleSearchClick} title="Search">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
              {localInput && (
                <button className="icon-btn clear-btn" onClick={handleClearSearch} title="Clear">
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="filter-group action-group">
            <button className="toolbar-btn" onClick={handleOpen} title="Download Excel">
              <FontAwesomeIcon icon={faDownload} />
            </button>
            <button
              className="toolbar-btn"
              onClick={() => setMyRequestsOpen(true)}
              title="My Document Requests"
            >
              <FontAwesomeIcon icon={faFileLines} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading && <div className="loading-overlay">Loading...</div>}
        <table className="job-table">
          <thead>
            <tr>
              {columns.map((col) => {
                const width = columnWidths[col.accessorKey] || col.size || 150;
                const isSorted = sortConfig.key === col.accessorKey;
                return (
                  <th
                    key={col.accessorKey}
                    style={{ width: `${width}px`, minWidth: `${width}px` }}
                    onClick={() => handleSort(col.accessorKey)}
                  >
                    <div className="th-content">
                      <span className="th-label">{col.header}</span>
                      <span className="sort-indicator">
                        {isSorted ? (
                          sortConfig.direction === "asc" ? "↑" : "↓"
                        ) : (
                          "⇅"
                        )}
                      </span>
                      <span
                        className="resize-handle"
                        onMouseDown={(e) => handleResizeStart(e, col.accessorKey)}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedTableData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="no-data">
                  No jobs found
                </td>
              </tr>
            ) : (
              sortedTableData.map((row) => {
                const { className, style } = getRowProps({ row });
                const isExpanded = expandedRows.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`${className || ""} ${isExpanded ? "row-expanded" : ""}`}
                    style={style}
                    onClick={(e) => {
                      if (e.target.closest("a") || e.target.closest("button")) return;
                      toggleRowExpand(row.id);
                    }}
                  >
                    {columns.map((col) => (
                      <td key={col.accessorKey}>
                        {renderCell(col, row, isExpanded)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination-bar">
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(1)}
        >
          «
        </button>
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          ‹
        </button>
        <span className="page-info">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          ›
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          »
        </button>
      </div>

      <SelectImporterModal
        open={open}
        handleClose={handleClose}
        status={props.status}
        detailedStatus={detailedStatus}
      />

      {/* MyDocRequests Modal */}
      {myRequestsOpen && (
        <div className="modal-overlay" onClick={() => setMyRequestsOpen(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>My Document Requests</h3>
              <button className="modal-close" onClick={() => setMyRequestsOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <MyDocRequests />
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar.open && (
        <div className="snackbar">
          <span>{snackbar.message}</span>
          <button onClick={() => setSnackbar({ open: false, message: "" })}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(JobList);

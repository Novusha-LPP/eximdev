import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";

import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Button,
  Box,
  Badge,
  Typography,
  MenuItem,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { BranchContext } from "../../contexts/BranchContext";
import useDynamicICDs from "../../customHooks/useDynamicICDs";
import {
  getTableRowsClassname,
  getTableRowInlineStyle,
} from "../../utils/getTableRowsClassname";
import InvoiceDisplay from "./InvoiceDisplay";

function BillingSheet() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);
  const { selectedBranch } = useContext(BranchContext);
  const dynamicICDs = useDynamicICDs();

  // View Mode: 'full' vs 'shrink'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("exim_import_do_view_mode") || "full";
    } catch (e) {
      return "full";
    }
  });

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("exim_import_do_view_mode", mode);
    } catch (e) {}
  }, []);

  const [expandedRowIds, setExpandedRowIds] = useState({});

  const toggleRowExpanded = useCallback((rowId) => {
    if (!rowId) return;
    setExpandedRowIds((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  const [selectedICD, setSelectedICD] = useState("");
  const [blValue, setBlValue] = useState("");
  const [years, setYears] = useState([]);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  // Use context for search functionality and pagination for BillingSheet tab
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
    currentPageDoTab3: currentPage,
    setCurrentPageDoTab3: setCurrentPage,
  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [totalJobs, setTotalJobs] = React.useState(0);
  const limit = 100;
  const location = useLocation();
  const listRef = useRef(null);
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );

  // Restore pagination/search state when returning from job details
  React.useEffect(() => {
    if (location.state?.fromJobDetails) {
      // Restore search state when returning from job details
      if (location.state?.searchQuery !== undefined) {
        setSearchQuery(location.state.searchQuery);
      }
      if (location.state?.selectedImporter !== undefined) {
        setSelectedImporter(location.state.selectedImporter);
      }
      if (location.state?.selectedJobId !== undefined) {
        setSelectedJobId(location.state.selectedJobId);
      }
      if (location.state?.currentPage !== undefined) {
        setCurrentPage(location.state.currentPage);
      }
    } else {
      // Clear search state when this tab becomes active fresh (not from job details)
      setSearchQuery("");
      setSelectedImporter("");
      setSelectedJobId(null);
    }
  }, [setSearchQuery, setSelectedImporter, setCurrentPage, location.state]);

  const formatDate = useCallback((dateStr) => {
    if (dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    } else {
      return dateStr;
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);
  useEffect(() => {
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
    }
  }, [location.state?.searchQuery]);

  // Restore scroll position on component mount
  useEffect(() => {
    if (location.state?.scrollPosition && listRef.current) {
      listRef.current.scrollTo(0, location.state.scrollPosition);
    }
  }, [location.state?.scrollPosition]);

  // Save scroll position before component unmounts
  useEffect(() => {
    return () => {
      if (listRef.current) {
        const scrollPosition = listRef.current.scrollTop;
        window.history.replaceState(
          {
            ...window.history.state,
            scrollPosition,
          },
          ""
        );
      }
    };
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
  // Function to build the search query (not needed on client-side, handled by server)
  // Keeping it in case you want to extend client-side filtering

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

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page when user types
  };

  // Debounce search query to reduce excessive API calls and reset page on new search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce delay
    return () => clearTimeout(handler); // Cleanup on unmount
  }, [searchQuery]);

  // Fetch jobs based on search query and pagination
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      OBLvalue,
      selectedImporter,
      unresolvedOnly = false,
      selectedBranch = "all"
    ) => {
      setLoading(true);
      setError(null);
      try {
        const apiString =
          process.env.REACT_APP_API_STRING
        const res = await axios.get(`${apiString}/get-do-billing`, {
          params: {
            page: currentPage,
            limit,
            search: currentSearchQuery,
            year: currentYear,
            selectedICD: currentICD,
            obl_telex_bl: OBLvalue.trim(),
            importer: selectedImporter?.trim() || "", // ✅ Ensure parameter name matches backend
            username: user?.username || "", // ✅ Send username for ICD filtering
            unresolvedOnly: unresolvedOnly.toString(), // ✅ Add unresolvedOnly parameter
            branchId: selectedBranch || "all", // ✅ Add branchId parameter
          },
        });

        const {
          totalJobs,
          totalPages,
          currentPage: returnedPage,
          jobs,
          unresolvedCount, // ✅ Get unresolved count from response
        } = res.data;

        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0); // ✅ Update unresolved count
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Error fetching jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [limit, user?.username] // Dependencies - add username
  );

  // Fetch jobs when dependencies change
  useEffect(() => {
    if (selectedYearState && user?.username) {
      // Ensure year and username are available before calling API
      fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        blValue,
        selectedImporter,
        showUnresolvedOnly,
        selectedBranch
      );
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    blValue,
    selectedImporter,
    user?.username,
    showUnresolvedOnly,
    fetchJobs,
    selectedBranch,
  ]);

  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).catch((err) => console.error("Clipboard copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
      enableSorting: false,
      size: 250,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row.original._id];
        const {
          job_no,
          year,
          _id,
          type_of_b_e,
          consignment_type,
          custom_house,
          detailed_status,
          container_nos,
          colorPriority,
          mode,
          branch_code,
          trade_type,
        } = row.original;

        // Color-coding logic
        let bgColor = "";
        let textColor = "blue";

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const calculateDaysDifference = (targetDate) => {
          if (!targetDate) return null;
          const date = new Date(targetDate);
          date.setHours(0, 0, 0, 0);
          const timeDifference = date.getTime() - currentDate.getTime();
          return Math.floor(timeDifference / (1000 * 3600 * 24));
        };

        if (colorPriority) {
          if (colorPriority === 1) {
            bgColor = "red";
            textColor = "white";
          } else if (colorPriority === 2) {
            bgColor = "orange";
            textColor = "black";
          } else if (colorPriority === 3) {
            bgColor = "white";
            textColor = "blue";
          }
        } else if (detailed_status === "Billing Pending" && container_nos) {
          let mostCriticalDays = null;
          container_nos.forEach((container) => {
            const targetDate =
              consignment_type === "LCL"
                ? container.delivery_date
                : container.emptyContainerOffLoadDate;

            if (targetDate) {
              const daysDifference = calculateDaysDifference(targetDate);
              if (
                mostCriticalDays === null ||
                daysDifference < mostCriticalDays
              ) {
                mostCriticalDays = daysDifference;
              }
            }
          });

          if (mostCriticalDays !== null && mostCriticalDays < 0) {
            if (mostCriticalDays <= -10) {
              bgColor = "red";
              textColor = "white";
            } else if (mostCriticalDays <= -6) {
              bgColor = "orange";
              textColor = "black";
            } else if (mostCriticalDays <= -1) {
              bgColor = "white";
              textColor = "blue";
            }
          }
        }

        const queryParams = new URLSearchParams({
          selectedJobId: _id,
        }).toString();

        if (isShrunk) {
          return (
            <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowExpanded(row.original._id);
                }}
                sx={{ p: 0.2 }}
                title="Click to expand row"
              >
                <KeyboardArrowRightIcon sx={{ fontSize: 18, color: "#64748b" }} />
              </IconButton>
              <Link
                to={`/edit-billing-sheet/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?${queryParams}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                  color: textColor,
                  backgroundColor: bgColor || "transparent",
                  padding: "3px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  textDecoration: "none",
                  fontSize: "13px",
                  border: bgColor ? "1px solid #ccc" : "none",
                }}
              >
                {row.original.job_number || job_no}
              </Link>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(e, row.original.job_number || job_no);
                }}
                sx={{ p: 0.2 }}
                title="Copy Job Number"
              >
                <ContentCopyIcon sx={{ fontSize: "14px", color: "#64748b" }} />
              </IconButton>
              {type_of_b_e && (
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  ({type_of_b_e})
                </span>
              )}
            </div>
          );
        }

        return (
          <div style={{ textAlign: "center" }}>
            {viewMode === "shrink" && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "4px" }}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpanded(row.original._id);
                  }}
                  sx={{ p: 0.2 }}
                  title="Click to collapse row"
                >
                  <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#2563eb" }} />
                </IconButton>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <Link
                to={`/edit-billing-sheet/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?${queryParams}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                  color: textColor,
                  backgroundColor: bgColor || "transparent",
                  padding: "10px",
                  borderRadius: "5px",
                  textAlign: "center",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  border: bgColor ? "1px solid #ccc" : "none",
                }}
              >
                {row.original.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
                {custom_house}
              </Link>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(e, row.original.job_number || job_no);
                }}
                sx={{ p: 0.2 }}
                title="Copy Job Number"
              >
                <ContentCopyIcon sx={{ fontSize: "14px", color: "#64748b" }} />
              </IconButton>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Party",
      enableSorting: false,
      size: 150,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const importer = cell?.getValue()?.toString() || "";
        return <span style={{ fontWeight: isShrunk ? 600 : 400 }}>{importer}</span>;
      }
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      enableSorting: false,
      size: 180,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const blParts = [];
        if (Array.isArray(row?.original?.mbl_details) && row.original.mbl_details.length > 0) {
          const mbls = row.original.mbl_details.map((m) => (typeof m === 'object' ? m?.mbl_no : m)).filter(Boolean).join(", ");
          if (mbls) blParts.push(mbls);
        } else if (cell?.getValue()) {
          blParts.push(cell.getValue().toString());
        }
        if (Array.isArray(row?.original?.hbl_details) && row.original.hbl_details.length > 0) {
          const hbls = row.original.hbl_details.map((h) => (typeof h === 'object' ? h?.hbl_no : h)).filter(Boolean).join(", ");
          if (hbls) blParts.push(`H: ${hbls}`);
        } else if (row?.original?.hawb_hbl_no) {
          blParts.push(`H: ${row.original.hawb_hbl_no}`);
        }
        const bl = blParts.join(" | ") || "-";
        return <span style={{ fontWeight: isShrunk ? 600 : 400 }}>{bl}</span>;
      }
    },
    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const val = cell?.getValue()?.toString() || "-";
        return <span style={{ fontSize: isShrunk ? "12px" : "inherit" }}>{val}</span>;
      }
    },
    {
      accessorKey: "obl_telex_bl",
      header: "BL",
      enableSorting: false,
      size: 180,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const val = cell?.getValue()?.toString() || "-";
        return <span style={{ fontSize: isShrunk ? "12px" : "inherit" }}>{val}</span>;
      }
    },

    {
      accessorKey: "Doc",
      header: "Do Completed & Validity Date",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[cell.row.original?._id];
        const { do_completed, do_validity, do_copies, cth_documents } =
          cell.row.original;

        const doCopies = do_copies;
        const doCompleted = formatDate(do_completed);
        const doValidity = formatDate(do_validity);

        if (isShrunk) {
          return (
            <div style={{ fontSize: "12px" }}>
              {doCompleted && <div><strong>Completed:</strong> {doCompleted}</div>}
              {doValidity && <div style={{ color: "#64748b" }}><strong>Val:</strong> {doValidity}</div>}
              {!doCompleted && !doValidity && <span style={{ color: "gray" }}>-</span>}
            </div>
          );
        }

        return (
          <div style={{ textAlign: "left" }}>
            {cth_documents &&
              cth_documents.some(
                (doc) =>
                  doc.url &&
                  doc.url.length > 0 &&
                  doc.document_name === "Bill of Lading"
              ) ? (
              cth_documents
                .filter(
                  (doc) =>
                    doc.url &&
                    doc.url.length > 0 &&
                    doc.document_name === "Bill of Lading"
                )
                .map((doc) => (
                  <div key={doc._id} style={{ marginBottom: "5px" }}>
                    <a
                      href={doc.url[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "blue",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      {doc.document_name}
                    </a>
                  </div>
                ))
            ) : (
              <span style={{ color: "gray" }}>No Bill of Lading </span>
            )}

            <div>
              {doCompleted ? (
                <strong>DO Completed Date: {doCompleted}</strong>
              ) : (
                <span style={{ color: "gray" }}>No DO Completed Date</span>
              )}
            </div>
            <div>
              {doValidity ? (
                <strong>DO Validity: {doValidity}</strong>
              ) : (
                <span style={{ color: "gray" }}>No DO Validity</span>
              )}
            </div>

            {Array.isArray(doCopies) && doCopies.length > 0 ? (
              <div style={{ marginTop: "4px" }}>
                {doCopies.map((url, index) => (
                  <div key={index}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#007bff", textDecoration: "underline" }}
                    >
                      DO Copy {index + 1}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}> No DO copies </span>
              </div>
            )}

            <InvoiceDisplay row={cell.row.original} />
          </div>
        );
      },
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enablePagination: false,
    muiTableContainerProps: { sx: { maxHeight: "650px", overflowY: "auto" } },
    muiTableBodyRowProps: ({ row }) => {
      const baseProps = {
        className: getTableRowsClassname(row),
        style: getTableRowInlineStyle(row),
      };

      if (viewMode === "shrink") {
        return {
          ...baseProps,
          style: {
            ...(baseProps.style || {}),
            cursor: "pointer",
          },
          onClick: (event) => {
            const targetTagName = event.target?.tagName?.toLowerCase() || "";
            if (["a", "button", "input", "textarea", "select"].includes(targetTagName)) {
              return;
            }
            if (
              event.target?.closest?.(
                "a, button, input, textarea, select, .MuiIconButton-root, .MuiChip-root"
              )
            ) {
              return;
            }
            toggleRowExpanded(row.original._id);
          },
        };
      }

      return baseProps;
    },
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 1 } },
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          padding: "8px 0",
        }}
      >
        {/* Row 1 - Counts and Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", fontSize: "1.5rem" }}
          >
            Job Count: {totalJobs}
          </Typography>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* View Mode Toggle Switch */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: "#f1f5f9",
                p: "2px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            >
              <Tooltip title="Full Table View" arrow>
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === "full" ? "active" : ""}`}
                  onClick={() => handleViewModeChange("full")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 9px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: viewMode === "full" ? "#ffffff" : "transparent",
                    color: viewMode === "full" ? "#2563eb" : "#64748b",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: viewMode === "full" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  <TableRowsIcon sx={{ fontSize: 16 }} />
                  Full
                </button>
              </Tooltip>
              <Tooltip title="Shrink List View" arrow>
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === "shrink" ? "active" : ""}`}
                  onClick={() => handleViewModeChange("shrink")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 9px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: viewMode === "shrink" ? "#ffffff" : "transparent",
                    color: viewMode === "shrink" ? "#2563eb" : "#64748b",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: viewMode === "shrink" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  <ViewHeadlineIcon sx={{ fontSize: 16 }} />
                  Shrink
                </button>
              </Tooltip>
            </Box>

            <Box sx={{ position: "relative" }}>
              <Button
                variant={showUnresolvedOnly ? "contained" : "outlined"}
                color="primary"
                size="small"
                onClick={() => setShowUnresolvedOnly((prev) => !prev)}
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  padding: "8px 20px",
                }}
              >
                {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
              </Button>
              <Badge
                badgeContent={unresolvedCount}
                color="error"
                overlap="circular"
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  "& .MuiBadge-badge": {
                    fontSize: "0.75rem",
                    minWidth: "18px",
                    height: "18px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  },
                }}
              />
            </Box>
          </div>
        </div>

        {/* Row 2 - Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            alignItems: "end",
          }}
        >
          <Autocomplete
            size="small"
            options={importerNames.map((option) => option.label)}
            value={selectedImporter || ""}
            onInputChange={(event, newValue) => setSelectedImporter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Select Importer"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                  },
                }}
              />
            )}
          />
          <TextField
            select
            size="small"
            value={selectedYearState}
            onChange={(e) => setSelectedYearState(e.target.value)}
            label="Financial Year"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            {years.map((year, index) => (
              <MenuItem key={`year-${year}-${index}`} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            variant="outlined"
            label="OBL"
            value={blValue}
            onChange={(e) => setBlValue(e.target.value)}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            <MenuItem value="">Select OBL</MenuItem>
            <MenuItem value="Original Documents">Original Documents</MenuItem>
            <MenuItem value="Telex">Telex</MenuItem>
            <MenuItem value="Surrender BL">Surrender BL</MenuItem>
            <MenuItem value="Waybill">Waybill</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            variant="outlined"
            label="ICD Code"
            value={selectedICD}
            onChange={(e) => {
              setSelectedICD(e.target.value);
              setCurrentPage(1);
            }}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            <MenuItem value="">All ICDs</MenuItem>
            {dynamicICDs.map((icd, index) => (
              <MenuItem key={index} value={icd}>{icd}</MenuItem>
            ))}
          </TextField>

          <div style={{ minWidth: "220px" }}>
            <TextField
              placeholder="Search by Job No, Importer, or AWB/BL Number"
              size="small"
              variant="outlined"
              fullWidth
              value={searchQuery}
              onChange={handleSearchInputChange}
              label="Search"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        setDebouncedSearchQuery(searchQuery);
                        setCurrentPage(1);
                      }}
                      size="small"
                    >
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "white",
                },
              }}
            />
          </div>
        </div>
      </div>
    ),
  });
  const handlePageChange = (event, newPage) => setCurrentPage(newPage);

  return (
    <div ref={listRef} style={{ height: "80%", overflow: "auto" }}>
      {error ? (
        <div>{error}</div>
      ) : (
        <>
          <MaterialReactTable table={table} />
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            sx={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "center",
            }}
          />
        </>
      )}
    </div>
  );
}

export default React.memo(BillingSheet);

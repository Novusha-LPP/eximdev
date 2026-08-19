// FreeDaysConf.jsx
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link } from "react-router-dom";
import { getTableRowsClassname, getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  MenuItem,
  Autocomplete,
  Tooltip,
  Box,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import BLTrackingCell from "../../customHooks/BLTrackingCell";

import ContainerTrackButton from '../ContainerTrackButton';
import { BranchContext } from "../../contexts/BranchContext.js";
import useDynamicICDs from "../../customHooks/useDynamicICDs";
import InvoiceDisplay from "./InvoiceDisplay.js";
import ContainerCellContent from "../ContainerCellContent";

const FreeDaysConf = () => {
  const { user } = useContext(UserContext);
  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const dynamicICDs = useDynamicICDs();
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);

  const [selectedICD, setSelectedICD] = useState("");
  const [years, setYears] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total pages
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // Debounced query
  const limit = 100; // Items per page

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

  const [editingRowId, setEditingRowId] = useState(null); // Track the row being edited
  const [freeTimeValue, setFreeTimeValue] = useState(""); // Track the value being edited
  const [currentPageBeforeEdit, setCurrentPageBeforeEdit] = useState(1);

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

  // Fetch jobs with pagination
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      selectedImporter,
      selectedBranch = "all",
      selectedCategory = "all"
    ) => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-free-days`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: currentYear,
              selectedICD: currentICD,
              importer: selectedImporter?.trim() || "", // ✅ Ensure parameter name matches backend
              username: user?.username || "", // ✅ Send username for ICD filtering
              branchId: selectedBranch || "all", // ✅ Add branchId parameter
              category: selectedCategory || "all", // ✅ Add category parameter
            },
          }
        );

        const {
          totalJobs,
          totalPages,
          currentPage: returnedPage,
          jobs,
        } = res.data;

        setRows(jobs);
        setTotalPages(totalPages);
        setPage(returnedPage);
        setTotalJobs(totalJobs);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
      }
    },
    [limit, user?.username]
  );

  // Fetch jobs with pagination
  useEffect(() => {
    if (selectedYearState && user?.username) {
      // Ensure year and username are available before calling API
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedYearState, // ✅ Now using the persistent state
        selectedICD,
        selectedImporter,
        selectedBranch,
        selectedCategory
      );
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    user?.username,
    selectedBranch,
    selectedCategory,
    fetchJobs,
  ]);

  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce delay
    return () => clearTimeout(handler); // Cleanup on unmount
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return; // Prevent copying empty values
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Copied:", text))
        .catch((err) => console.error("Copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Copied (fallback):", text);
      } catch (err) {
        console.error("Fallback failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const handleEditClick = (row) => {
    setCurrentPageBeforeEdit(page); // Save the current page before editing
    setEditingRowId(row._id); // Compare using _id
    setFreeTimeValue(row.free_time || ""); // Set initial value for input
  };

  const handleSave = async (id) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-free-time/${id}`,
        {
          free_time: freeTimeValue,
        }
      );

      // Re-fetch jobs with the updated free time and retain the page
      fetchJobs(
        currentPageBeforeEdit, 
        debouncedSearchQuery, 
        selectedYearState, 
        selectedICD, 
        selectedImporter,
        selectedBranch,
        selectedCategory
      );
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setEditingRowId(null); // Exit edit mode
    }
  };

  const handleCancel = () => {
    setEditingRowId(null); // Cancel edit mode
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No ",
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
      size: 150,
      Cell: ({ cell }) => {
        const row = cell.row.original;
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row._id];
        const { job_no, year, custom_house, type_of_b_e, consignment_type, _id, mode, branch_code, trade_type } =
          row;

        if (isShrunk) {
          return (
            <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowExpanded(row._id);
                }}
                sx={{ p: 0.2 }}
                title="Click to expand row"
              >
                <KeyboardArrowRightIcon sx={{ fontSize: 18, color: "#64748b" }} />
              </IconButton>
              <Link
                to={`/edit-free-days-conf/${branch_code}/${trade_type}/${mode}/${job_no}/${year || 'unknown'}?jobId=${_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  cursor: "pointer",
                  color: "blue",
                  padding: "3px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  display: "inline-block",
                  textDecoration: "none",
                  fontSize: "13px",
                }}
              >
                {row.job_number || job_no}
              </Link>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(e, row.job_number || job_no);
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
                    toggleRowExpanded(row._id);
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
                to={`/edit-free-days-conf/${branch_code}/${trade_type}/${mode}/${job_no}/${year || 'unknown'}?jobId=${_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textAlign: "center",
                  cursor: "pointer",
                  color: "blue",
                  display: "inline-block",
                  padding: "5px",
                  textDecoration: "none",
                }}
              >
                {row.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
                {custom_house}
              </Link>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(e, row.job_number || job_no);
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
      header: "Importer",
      size: 200,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const importer = cell?.getValue()?.toString() || "";
        if (isShrunk) {
          return <span style={{ fontWeight: 600 }}>{importer}</span>;
        }
        return <span>{importer}</span>;
      },
    },

    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      size: 200,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const shippingLine = cell?.getValue()?.toString() || "-";
        if (isShrunk) {
          return <span style={{ fontSize: "12px", fontWeight: 500 }}>{shippingLine}</span>;
        }
        return <span>{shippingLine}</span>;
      },
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 200,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const line_no = row.original.line_no || "N/A";

        if (isShrunk) {
          return (
            <div>
              <span style={{ fontWeight: 600 }}>{row.original.awb_bl_no || "-"}</span>
              {line_no && line_no !== "N/A" && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Line: {line_no}
                </div>
              )}
            </div>
          );
        }

        return (
          <>
            <BLTrackingCell
              blNumber={row.original.awb_bl_no}
              hblNumber={row.original?.hawb_hbl_no?.toString() || ""}
              shippingLine={row.original.shipping_line_airline}
              customHouse={row.original?.custom_house || ""}
              container_nos={row.original.container_nos}
              jobId={row.original._id}
              portOfReporting={row.original.port_of_reporting}
              containerNos={row.original.container_nos}
              onCopy={handleCopy}
            />

            <div>
              {`Line No: ${line_no}`}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, line_no)}
              >
                <abbr title="Copy Line No Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </>
        );
      },
    },
    {
      accessorKey: "free_time",
      header: "Free Time",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) =>
        editingRowId === row.original._id ? ( // Compare using _id
          <div style={{ display: "flex", alignItems: "center" }}>
            <TextField
              value={freeTimeValue}
              onChange={(e) => setFreeTimeValue(e.target.value)}
              size="small"
              variant="outlined"
              style={{ marginRight: "8px", width: "60px" }}
              type="number"
            />
            <IconButton onClick={() => handleSave(row.original._id)} size="small">
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleCancel} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>{row.original.free_time || "-"}</span>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(row.original);
              }}
              style={{ marginLeft: "6px" }}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </div>
        ),
    },
    {
      accessorKey: "container_numbers",
      header: "Container Numbers and Size",
      size: 200,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const containerNos = cell.row.original.container_nos;

        if (isShrunk) {
          const count = containerNos?.length || 0;
          return (
            <div>
              <strong>
                {count > 0 ? `${count} Container(s)` : `${row?.original?.no_of_pkgs || 0} Pkg(s)`}
              </strong>
              {containerNos?.[0]?.container_number && (
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                  ({containerNos[0].container_number})
                </span>
              )}
            </div>
          );
        }

        return (
          <React.Fragment>
            {containerNos?.map((container, id) => (
              <div key={id} style={{ marginBottom: "4px" }}>
                <a
                  href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {container.container_number}
                </a>
                <ContainerTrackButton
                  customHouse={cell?.row?.original?.custom_house}
                  containerNo={container.container_number}
                />
                | "{container.size}"
                <IconButton
                  size="small"
                  onClick={(event) =>
                    handleCopy(event, container.container_number)
                  }
                >
                  <abbr title="Copy Container Number">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "vessel_and_voyage",
      header: "Vessel & Voyage No",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
        const voyageNo = row.original.voyage_no?.toString() || "N/A";

        if (isShrunk) {
          return (
            <div style={{ fontSize: "12px" }}>
              <span>{vesselFlight}</span>
              {voyageNo && voyageNo !== "N/A" && (
                <span style={{ color: "#64748b", marginLeft: "4px" }}>({voyageNo})</span>
              )}
            </div>
          );
        }

        return (
          <React.Fragment>
            <div>
              {vesselFlight}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, vesselFlight)}
              >
                <abbr title="Copy Vessel">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div>
              {voyageNo}
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, voyageNo)}
              >
                <abbr title="Copy Voyage Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 300,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const { processed_be_attachment, cth_documents, checklist } =
          cell.row.original;

        const getFirstLink = (input) => {
          if (Array.isArray(input)) {
            return input.length > 0 ? input[0] : null;
          }
          return input || null;
        };

        const checklistLink = getFirstLink(checklist);
        const processed_be_attachmentLink = getFirstLink(processed_be_attachment);

        if (isShrunk) {
          const docCount = (checklistLink ? 1 : 0) + (processed_be_attachmentLink ? 1 : 0) + ((cth_documents || []).length);
          return (
            <span style={{ fontSize: "12px", color: docCount > 0 ? "#007bff" : "gray" }}>
              {docCount > 0 ? `${docCount} Document(s)` : "No Documents"}
            </span>
          );
        }

        return (
          <div style={{ textAlign: "left" }}>
            {/* Render the "Checklist" link or fallback text */}
            {checklistLink ? (
              <div style={{ marginBottom: "5px" }}>
                <a
                  href={checklistLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Checklist
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>No Checklist </span>
              </div>
            )}
            {processed_be_attachmentLink ? (
              <div style={{ marginBottom: "5px" }}>
                <a
                  href={processed_be_attachmentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Processed Copy of BE no.
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>
                  {" "}
                  Processed Copy of BE no.{" "}
                </span>
              </div>
            )}

            {/* Standardized CTH and Invoice Display */}
            <InvoiceDisplay row={cell.row.original} />
          </div>
        );
      },
    },
  ];

  const tableConfig = {
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
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
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
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
            label="ICD Code"
            value={selectedICD}
            onChange={(e) => {
              setSelectedICD(e.target.value);
              setPage(1);
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
              onChange={(e) => setSearchQuery(e.target.value)}
              label="Search"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => fetchJobs(1)} size="small">
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
  };

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable {...tableConfig} />
      <Pagination
        count={totalPages > 0 ? totalPages : 1}
        page={page}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
};

export default FreeDaysConf;

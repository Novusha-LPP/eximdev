import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Button,
  Box,
  Badge,
  Typography,
  MenuItem,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { BranchContext } from "../../contexts/BranchContext.js";

import ContainerTrackButton from '../ContainerTrackButton';
import BLTrackingCell from "../../customHooks/BLTrackingCell";
import ContainerCellContent from "../ContainerCellContent";

function ESanchitCompleted() {
  const { currentTab } = useContext(TabContext); // Access context
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);
  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const [years, setYears] = useState([]);

  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [loading, setLoading] = useState(false); // Loading state  // Use context for searchQuery, selectedImporter, and currentPage for tab 1
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter, currentPageTab1: currentPage, setCurrentPageTab1: setCurrentPage } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced search query
  const limit = 100; // Number of items per page
  const [totalJobs, setTotalJobs] = useState(0); // Total job count
  const navigate = useNavigate();
  const location = useLocation();
  const [importers, setImporters] = useState("");

  // View Mode: 'full' vs 'shrink'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("exim_esanchit_view_mode") || "full";
    } catch (e) {
      return "full";
    }
  });

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("exim_esanchit_view_mode", mode);
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

  // Get importer list for MUI autocomplete
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

  // Fetch jobs with pagination and search
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedImporter,
      selectedYearState,
      unresolvedOnly = false,
      selectedBranch = "all",
      selectedCategory = "all"
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-esanchit-completed-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "", // ✅ Ensure year is sent
              username: user?.username || "", // ✅ Send username for ICD filtering
              unresolvedOnly: unresolvedOnly.toString(), // ✅ Add unresolvedOnly parameter
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
          unresolvedCount, // ✅ Get unresolved count from response
        } = res.data;

        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0); // ✅ Update unresolved count
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
        setUnresolvedCount(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, user?.username] // ✅ Add username as a dependency
  );

  useEffect(() => {
    if (selectedYearState && user?.username) {
      // Ensure year and username are available before calling API
      fetchJobs(currentPage, debouncedSearchQuery, selectedImporter, selectedYearState, showUnresolvedOnly, selectedBranch, selectedCategory);
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    user?.username,
    showUnresolvedOnly, // ✅ Include showUnresolvedOnly in dependencies
    selectedBranch,
    selectedCategory,
    fetchJobs,
  ]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // setPage(1); // Reset to first page on new search
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };
  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  // Handle copy functionality (can be abstracted if used multiple times)
  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  // Define table columns
  const columns = React.useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No",
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
        enableSorting: false,
        size: 250,
        Cell: ({ cell }) => {
          const row = cell.row.original;
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row._id];
          const {
            job_no,
            year,
            type_of_b_e,
            consignment_type,
            custom_house,
            branch_code,
            trade_type,
            mode,
            priorityJob,
          } = row;

          const bgColor =
            priorityJob === "High Priority"
              ? "orange"
              : priorityJob === "Priority"
              ? "yellow"
              : "transparent";

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
                <a
                  href={`/esanchit-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    cursor: "pointer",
                    color: "blue",
                    backgroundColor: bgColor,
                    padding: "3px 6px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    display: "inline-block",
                    textDecoration: "none",
                    fontSize: "13px",
                  }}
                >
                  {row.job_number || job_no}
                </a>
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
                <a
                  href={`/esanchit-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    cursor: "pointer",
                    color: "blue",
                    backgroundColor: bgColor,
                    padding: "10px",
                    borderRadius: "5px",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    display: "inline-block",
                  }}
                >
                  {row.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br /> {custom_house}
                </a>
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
        enableSorting: false,
        size: 150,
        Cell: ({ cell, row }) => {
          const importer = cell?.getValue()?.toString() || "";
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
          if (isShrunk) {
            return <span style={{ fontWeight: 600 }}>{importer}</span>;
          }
          return <span>{importer}</span>;
        },
      },

      {
        accessorKey: "awb_bl_no",
        header: "BL Num & Date",
        enableSorting: false,
        size: 150,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
          const { awb_bl_no, shipping_line_airline } = row.original;

          if (isShrunk) {
            return (
              <div>
                <span style={{ fontWeight: 600 }}>{awb_bl_no || "-"}</span>
                {shipping_line_airline && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {shipping_line_airline}
                  </div>
                )}
              </div>
            );
          }

          return (
            <BLTrackingCell
              blNumber={awb_bl_no}
              shippingLine={row.original.shipping_line_airline}
              customHouse={row.original.custom_house}
              container_nos={row.original.container_nos}
              jobId={row.original._id}
              branch_code={row.original.branch_code}
              mode={row.original.mode}
              portOfReporting={row.original.port_of_reporting}
              containerNos={row.original.container_nos}
              onCopy={handleCopy}
              onUpdateSuccess={() => fetchJobs(currentPage, debouncedSearchQuery, selectedImporter, selectedYearState, showUnresolvedOnly, selectedBranch, selectedCategory)}
              selectedYear={selectedYearState}
            />
          );
        },
      },
      {
        accessorKey: "container_numbers",
        header: "Container Numbers and Size",
        size: 200,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
          if (isShrunk) {
            const count = row?.original?.container_nos?.length || 0;
            return (
              <div>
                <strong>
                  {count > 0 ? `${count} Container(s)` : `${row?.original?.no_of_pkgs || 0} Pkg(s)`}
                </strong>
                {row?.original?.container_nos?.[0]?.container_number && (
                  <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                    ({row.original.container_nos[0].container_number})
                  </span>
                )}
              </div>
            );
          }
          return <ContainerCellContent cell={cell} handleCopy={handleCopy} />;
        },
      },
      {
        accessorKey: "Doc",
        header: "Doc - IRN Details",
        enableSorting: false,
        size: 300,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
          const { cth_documents, all_documents } = row.original;
          const validCthDocs = (cth_documents || []).filter((doc) => doc.url && doc.url.length > 0);
          const totalDocsCount = (validCthDocs.length || 0) + (all_documents?.length || 0);

          if (isShrunk) {
            return (
              <span style={{ fontSize: "12px", color: totalDocsCount > 0 ? "#007bff" : "gray" }}>
                {totalDocsCount > 0 ? `${totalDocsCount} Document(s)` : "No Documents"}
              </span>
            );
          }

          let serialNumber = 1;

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                gap: "5px",
                width: "100%",
              }}
            >
              {/* Loop through CTH Documents and display document name with serial number */}
              {validCthDocs.map((doc) => (
                <a
                  key={doc._id}
                  href={doc.url[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                    marginBottom: "5px",
                  }}
                >
                  {serialNumber++}. {doc.document_name} -{doc.irn}
                </a>
              ))}

              {/* Loop through All Documents with serial number */}
              {all_documents?.map((docUrl) => (
                <a
                  key={docUrl}
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "green",
                    textDecoration: "underline",
                    cursor: "pointer",
                    marginBottom: "5px",
                  }}
                >
                  {serialNumber++}. Document
                </a>
              ))}
            </div>
          );
        },
      },
    ],
    [navigate, handleCopy, viewMode, expandedRowIds, toggleRowExpanded, fetchJobs, currentPage, debouncedSearchQuery, selectedImporter, selectedYearState, showUnresolvedOnly, selectedBranch, selectedCategory]
  );

  // Table configuration
  const tableConfig = {
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false, // Handled manually via MUI Pagination
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
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        textAlign: "left", // Ensure header content aligns left
      },
    },
    muiTableBodyCellProps: {
      sx: {
        textAlign: "left", // Align all body cell content to the left
      },
    },
    muiTableBodyRowProps: ({ row }) => {
      if (viewMode === "shrink") {
        return {
          style: { cursor: "pointer" },
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
      return {};
    },

    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Job Count Display */}
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontSize: "1.5rem", marginRight: "auto" }}
        >
          Job Count: {totalJobs}
        </Typography>

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

        <TextField
          select
          size="small"
          value={selectedYearState}
          onChange={(e) => setSelectedYearState(e.target.value)}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          {years.map((year, index) => (
            <MenuItem key={`year-${year}-${index}`} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

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
            marginRight: "20px",
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

        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchInputChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => {
                  setDebouncedSearchQuery(searchQuery);
                  setCurrentPage(1);
                }}
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px", marginRight: "20px", marginLeft: "10px" }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowUnresolvedOnly((prev) => !prev)}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                  boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0px)',
                },
              }}
            >
              {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
            </Button>
            <Badge
              badgeContent={unresolvedCount}
              color="error"
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  minWidth: '18px',
                  height: '18px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }
              }}
            />
          </Box>
        </Box>

      </div>
    ),
  };

  return (
    <div style={{ height: "80%" }}>
      <>
        <MaterialReactTable {...tableConfig} />
        <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      </>
    </div>
  );
}

export default React.memo(ESanchitCompleted);

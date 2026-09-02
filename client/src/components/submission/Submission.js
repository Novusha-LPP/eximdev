import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useNavigate, useLocation } from "react-router-dom";
import {
  TextField,
  Pagination,
  Typography,
  InputAdornment,
  Button,
  Box,
  Badge,
  IconButton,
  MenuItem,
  Autocomplete,
  Tooltip,
  Chip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { getTableRowsClassname, getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { UserContext } from "../../contexts/UserContext";
import { BranchContext } from "../../contexts/BranchContext.js";

import ContainerTrackButton from '../ContainerTrackButton';
import BLTrackingCell from "../../customHooks/BLTrackingCell";
import ContainerCellContent from "../ContainerCellContent";

function Submission() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [years, setYears] = useState([]);
  const { user } = useContext(UserContext);
  const { branches, selectedBranch, selectedCategory } = useContext(BranchContext);
  const activeBranchConfig = branches.find(b => b._id === selectedBranch)?.configuration || { railout_enabled: true, gateway_igm_enabled: true, gateway_igm_date_enabled: true };
  const [importers, setImporters] = useState("");
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [rows, setRows] = React.useState([]);
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  // View Mode: 'full' vs 'shrink'
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("exim_submission_view_mode") || "full";
    } catch (e) {
      return "full";
    }
  });

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("exim_submission_view_mode", mode);
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

  // Use context for search functionality and pagination
  const {
    searchQuery, setSearchQuery,
    selectedImporter, setSelectedImporter,
    currentPageSubmission: page,
    setCurrentPageSubmission: setPage
  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] =
    React.useState(searchQuery);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedJobId, setSelectedJobId] = useState(
    location.state?.selectedJobId || ""
  );

  const limit = 10; // Number of items per page

  React.useEffect(() => {
    if (location.state?.fromJobDetails) {
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
        setPage(location.state.currentPage);
      }
    } else {
      setSearchQuery("");
      setSelectedImporter("");
      setSelectedJobId("");
      setPage(1);
    }
  }, [setSearchQuery, setSelectedImporter, setPage, location.state]);

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

  const handleCopy = (event, text) => {
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
  };

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
    setPage(1); // Reset to first page when user types
  };

  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page on new search
    }, 500); // 500ms debounce delay
    return () => clearTimeout(handler); // Cleanup on unmount
  }, [searchQuery, setPage]);

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
          `${process.env.REACT_APP_API_STRING}/get-submission-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              year: selectedYearState || "", // ✅ Ensure year is sent
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "", // ✅ Ensure parameter name matches backend
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
          unresolvedCount
        } = res.data;

        setRows(jobs);
        setTotalPages(totalPages);
        setPage(returnedPage);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0); // ✅ Update unresolved count
      } catch (error) {
        setUnresolvedCount(0);
        console.error("Error fetching data:", error);
        setRows([]); // Reset rows if an error occurs
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit, selectedImporter, selectedYearState, user?.username, setPage]
  );

  // Fetch jobs when page or debounced search query changes
  useEffect(() => {
    if (selectedYearState && user?.username) {
      // Ensure year and username are available before calling API
      fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYearState, showUnresolvedOnly, selectedBranch, selectedCategory);
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    showUnresolvedOnly,
    selectedBranch,
    selectedCategory,
    user?.username,
    fetchJobs,
  ]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const columns = [
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
          job_number,
          year,
          type_of_b_e,
          consignment_type,
          custom_house,
          branch_code,
          trade_type,
          mode,
          priorityJob,
        } = row;
        const textColor = "blue";
        const bgColor = priorityJob === "High Priority"
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
                href={`/submission-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  cursor: "pointer",
                  color: textColor,
                  backgroundColor: bgColor,
                  padding: "3px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  display: "inline-block",
                  textDecoration: "none",
                  fontSize: "13px",
                }}
              >
                {job_number || job_no}
              </a>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(e, job_number || job_no);
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
                href={`/submission-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  cursor: "pointer",
                  color: textColor,
                  backgroundColor: bgColor,
                  padding: "10px",
                  borderRadius: "5px",
                  textAlign: "center",
                  display: "inline-block",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
                {custom_house}
              </a>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(e, job_number || job_no);
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
      size: 150,
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
      accessorKey: "awb_bl_no",
      header: "BL Num & Date",
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
            onUpdateSuccess={() => fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYearState, showUnresolvedOnly, selectedBranch, selectedCategory)}
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
      accessorKey: "igm_details",
      header: "IGM Details",
      enableSorting: false,
      size: 250,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const {
          gateway_igm_date,
          gateway_igm,
          igm_date,
          igm_no,
          job_net_weight,
          gross_weight,
          line_no,
          no_of_pkgs,
        } = row.original;

        if (isShrunk) {
          return (
            <div style={{ fontSize: "12px" }}>
              {igm_no ? (
                <div>
                  <strong>IGM: </strong>{igm_no}
                  {igm_date && (
                    <span style={{ color: "#64748b", marginLeft: "4px" }}>
                      ({new Date(igm_date).toLocaleDateString()})
                    </span>
                  )}
                </div>
              ) : gateway_igm ? (
                <div>
                  <strong>G-IGM: </strong>{gateway_igm}
                </div>
              ) : (
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>N/A</span>
              )}
              {no_of_pkgs && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Pkgs: {no_of_pkgs}
                </div>
              )}
            </div>
          );
        }

        return (
          <div>
            {activeBranchConfig.gateway_igm_enabled && (
              <>
                <strong>Gateway IGM:</strong> {gateway_igm || "N/A"}{" "}
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, gateway_igm)}
                >
                  <abbr title="Copy Gateway IGM">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
                <br />
              </>
            )}
            {activeBranchConfig.gateway_igm_date_enabled && (
              <>
                <strong>Gateway Date:</strong> {gateway_igm_date || "N/A"}{" "}
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, gateway_igm_date)}
                >
                  <abbr title="Copy Gateway Date">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
                <br />
              </>
            )}
            <strong>IGM No:</strong> {igm_no || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, igm_no)}
            >
              <abbr title="Copy IGM No">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>IGM Date:</strong> {igm_date || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, igm_date)}
            >
              <abbr title="Copy IGM Date">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>Net Weight:</strong> {job_net_weight || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, job_net_weight)}
            >
              <abbr title="Copy Net Weight">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>Gross Weight:</strong> {gross_weight || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, gross_weight)}
            >
              <abbr title="Copy Gross Weight">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>Line No:</strong> {line_no || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, line_no)}
            >
              <abbr title="Copy Line No">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
            <strong>No of Pkgs:</strong> {no_of_pkgs || "N/A"}{" "}
            <IconButton
              size="small"
              onClick={(event) => handleCopy(event, no_of_pkgs)}
            >
              <abbr title="Copy No of Pkgs">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
          </div>
        );
      },
    },
    {
      accessorKey: "invoice_number",
      header: "Invoice NO. & Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const { invoice_date = "N/A", invoice_number = "N/A" } = row.original;
        if (isShrunk) {
          return (
            <div>
              <span style={{ fontWeight: 600 }}>{invoice_number}</span>
              {invoice_date && invoice_date !== "N/A" && (
                <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                  ({invoice_date})
                </span>
              )}
            </div>
          );
        }
        return (
          <div>
            <div>{`${invoice_number}`}</div>
            <div>{`${invoice_date}`}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "be_filing_info",
      header: "BE Filing Type",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const {
          be_filing_type,
          be_date,
          is_checklist_aprroved,
          is_checklist_aprroved_date,
        } = row.original;

        if (isShrunk) {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {is_checklist_aprroved ? (
                <Chip
                  size="small"
                  label="Approved"
                  icon={<CheckCircleIcon style={{ fontSize: 14 }} />}
                  sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: "11px", height: "20px" }}
                />
              ) : (
                <Chip
                  size="small"
                  label="Not Approved"
                  icon={<CancelIcon style={{ fontSize: 14 }} />}
                  sx={{ bgcolor: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: "11px", height: "20px" }}
                />
              )}
              {be_filing_type && (
                <span style={{ fontSize: "11px", color: "#475569" }}>
                  ({be_filing_type})
                </span>
              )}
            </div>
          );
        }

        return (
          <div style={{ textAlign: "left" }}>
            {/* Checklist Approval Status */}
            <div
              style={{
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {is_checklist_aprroved ? (
                <>
                  <CheckCircleIcon
                    style={{ color: "#4caf50", fontSize: "16px" }}
                  />
                  <span
                    style={{
                      color: "#4caf50",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  >
                    Checklist Approved
                  </span>
                </>
              ) : (
                <>
                  <CancelIcon style={{ color: "#f44336", fontSize: "16px" }} />
                  <span
                    style={{
                      color: "#f44336",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  >
                    Not Approved
                  </span>
                </>
              )}
            </div>
            {/* Checklist Approval Date */}
            {is_checklist_aprroved_date && (
              <div
                style={{ fontSize: "11px", color: "#666", marginBottom: "5px" }}
              >
                Approved:{" "}
                {new Date(is_checklist_aprroved_date).toLocaleString("en-US", {
                  timeZone: "Asia/Kolkata",
                  hour12: true,
                })}
              </div>
            )}

            {/* Filing Type */}
            {be_filing_type && (
              <div
                style={{
                  marginBottom: "5px",
                  fontWeight: "bold",
                  fontSize: "12px",
                }}
              >
                Type: {be_filing_type}
              </div>
            )}

            {/* BE Date */}
            {be_date && (
              <div style={{ fontSize: "11px", color: "#555" }}>
                BE Date: {new Date(be_date).toLocaleDateString()}
              </div>
            )}

            {/* Fallback message */}
            {!be_filing_type &&
              !be_date &&
              !is_checklist_aprroved &&
              !is_checklist_aprroved_date && (
                <div
                  style={{
                    color: "#999",
                    fontStyle: "italic",
                    fontSize: "12px",
                  }}
                >
                  No Filing Info
                </div>
              )}
          </div>
        );
      },
    },

    {
      accessorKey: "cth_documents",
      header: "E-sanchit Doc",
      enableSorting: false,
      size: 300,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const { cth_documents = [] } = row.original;

        if (isShrunk) {
          return (
            <span style={{ fontSize: "12px", color: cth_documents.length > 0 ? "#007bff" : "gray" }}>
              {cth_documents.length > 0 ? `${cth_documents.length} Document(s)` : "No Documents"}
            </span>
          );
        }

        return (
          <div style={{ textAlign: "left" }}>
            {cth_documents.length > 0 ? (
              cth_documents.map((doc, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "5px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <a
                    href={doc.url?.[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "#007bff",
                      display: "block",
                    }}
                  >
                    {`${doc.document_code || ""} - ${doc.document_name || ""}${doc.irn ? ` - ${doc.irn}` : ""}`}
                  </a>
                </div>
              ))
            ) : (
              <div>No Documents Available</div>
            )}
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
    muiTableBodyCellProps: {
      sx: {
        textAlign: "left", // Ensures all cells in the table body align to the left
      },
    },
    muiTableBodyRowProps: ({ row }) => {
      const { be_filing_type, container_nos } = row.original;

      let backgroundColor = '';
      let hoverColor = '';

      if (be_filing_type === 'Discharge') {
        backgroundColor = '#ffebee'; // Light red background
        hoverColor = '#ffcdd2'; // Darker red on hover
      } else if (be_filing_type === 'Railout') {
        // Check if any container has container_rail_out_date
        const hasRailOutDate = container_nos?.some(container =>
          container.container_rail_out_date && container.container_rail_out_date.trim() !== ''
        );

        if (hasRailOutDate) {
          backgroundColor = '#ffebee'; // Light red background (same as discharge)
          hoverColor = '#ffcdd2'; // Darker red on hover
        } else {
          backgroundColor = '#fff8e1'; // Light yellow background
          hoverColor = '#fff3c4'; // Darker yellow on hover
        }
      }

      const baseProps = {
        className: getTableRowsClassname(row),
        style: getTableRowInlineStyle(row),
        sx: {
          backgroundColor: backgroundColor,
          '&:hover': {
            backgroundColor: hoverColor || undefined
          }
        }
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
        textAlign: "left",
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
                <IconButton
                  onClick={() => {
                    setDebouncedSearchQuery(searchQuery);
                    setPage(1);
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
      <MaterialReactTable {...tableConfig} />
      <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
    </div>
  );
}

export default React.memo(Submission);

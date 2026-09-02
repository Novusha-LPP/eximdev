import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import InvoiceDisplay from "./InvoiceDisplay";
import { useNavigate, useLocation, Link } from "react-router-dom";
import BLTrackingCell from "../../customHooks/BLTrackingCell";

import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  Button,
  Box,
  Badge,
  MenuItem,
  Autocomplete,
  Tooltip,
  colors,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
import { BranchContext } from "../../contexts/BranchContext.js";
import useDynamicICDs from "../../customHooks/useDynamicICDs";

import ContainerTrackButton from '../ContainerTrackButton';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

function DoCompleted() {
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
  const [selectedYear, setSelectedYear] = useState("");
  const [years, setYears] = useState([]);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1); // Total pages from API
  const [loading, setLoading] = useState(false); // Loading state
  // Use context for searchQuery, selectedImporter, and currentPage for DO Completed tab
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
    currentPageDoTab2: currentPage,
    setCurrentPageDoTab2: setCurrentPage,
  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced query
  const navigate = useNavigate();
  const location = useLocation();
  const [totalJobs, setTotalJobs] = React.useState(0);
  const limit = 100; // Number of items per page
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);
  const { branches, selectedBranch, selectedCategory } = useContext(BranchContext);
  const activeBranchConfig = branches.find(b => b._id === selectedBranch)?.configuration || { railout_enabled: true, gateway_igm_enabled: true, gateway_igm_date_enabled: true };
  const dynamicICDs = useDynamicICDs();

  // Restore pagination/search state when returning from job details
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
        setCurrentPage(location.state.currentPage);
      }
    } else {
      // Clear state on fresh tab navigation (handled by parent tab component)
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
          const newYear = filteredYears.includes(defaultYearPair)
            ? defaultYearPair
            : filteredYears[0];

          setSelectedYearState(newYear); // ✅ Persist the selected year
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYear]);

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

  // Fetch jobs with pagination and search
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      selectedImporter,
      unresolvedOnly = false,
      selectedBranch = "all",
      selectedCategory = "all"
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-do-complete-module-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: currentYear,
              selectedICD: currentICD,
              importer: selectedImporter?.trim() || "",
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
          unresolvedCount,
        } = res.data;
        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0); // ✅ Update unresolved count
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
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
        selectedImporter,
        showUnresolvedOnly,
        selectedBranch,
        selectedCategory
      );
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    user?.username,
    showUnresolvedOnly,
    selectedBranch,
    selectedCategory,
    fetchJobs,
  ]);

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page when user types
  };

  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
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
          year,
          type_of_b_e,
          consignment_type,
          _id,
          custom_house,
          priorityColor,
          mode,
          branch_code,
          trade_type,
        } = row;
        const textColor = "blue";
        const bgColor =
          row.priorityJob === "High Priority"
            ? "orange"
            : row.priorityJob === "Priority"
              ? "yellow"
              : "transparent";
        const isSelected = selectedJobId === _id;

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
                to={`/edit-do-completed/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?jobId=${_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedJobId(_id);
                }}
                style={{
                  backgroundColor: isSelected ? "#ffffcc" : bgColor,
                  cursor: "pointer",
                  color: textColor,
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
                to={`/edit-do-completed/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?jobId=${_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSelectedJobId(_id)}
                style={{
                  backgroundColor: isSelected ? "#ffffcc" : bgColor,
                  textAlign: "center",
                  cursor: "pointer",
                  color: textColor,
                  display: "inline-block",
                  padding: "5px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {row.job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />
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
      enableSorting: false,
      size: 250,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const importerName = cell?.getValue()?.toString();
        const _id = row.original._id;

        const doShippingLineInvoice = row.original.do_shipping_line_invoice;
        let paymentReciptDate = "";
        let paymentRequestDate = "";
        if (
          Array.isArray(doShippingLineInvoice) &&
          doShippingLineInvoice.length > 0
        ) {
          paymentReciptDate = doShippingLineInvoice[0].payment_recipt_date;
          paymentRequestDate = doShippingLineInvoice[0].payment_request_date;
        }

        if (isShrunk) {
          return (
            <div>
              <span style={{ fontWeight: 600 }}>{importerName}</span>
              {paymentRequestDate && (
                <div style={{ fontSize: "11px", color: "#d32f2f", marginTop: "2px" }}>
                  Payment Req Sent
                </div>
              )}
            </div>
          );
        }

        return (
          <React.Fragment>
            {importerName}
            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, importerName);
              }}
            >
              <abbr title="Copy Party Name">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            {paymentRequestDate && (
              <>
                <div
                  style={{
                    color: "#d32f2f",
                    fontWeight: 500,
                    fontSize: "12px",
                    marginTop: 4,
                  }}
                >
                  Payment request sent to billing team
                </div>
                <div
                  style={{
                    color: "#0288d1",
                    fontWeight: 500,
                    fontSize: "12px",
                    marginBottom: 2,
                  }}
                >
                  Payment Request Date:{" "}
                  {new Date(paymentRequestDate).toLocaleString("en-IN", {
                    hour12: true,
                  })}
                </div>
              </>
            )}
            {Array.isArray(doShippingLineInvoice) &&
              doShippingLineInvoice.length > 0 &&
              doShippingLineInvoice.map((invoice, idx) =>
                invoice.payment_recipt && invoice.payment_recipt.length > 0 ? (
                  <div
                    key={idx}
                    style={{
                      color: "#388e3c",
                      fontWeight: 500,
                      fontSize: "12px",
                      marginTop: 2,
                    }}
                  >
                    <a
                      href={invoice.payment_recipt[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#388e3c",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      Payment Receipt Uploaded
                    </a>
                  </div>
                ) : null
              )}
            {paymentReciptDate && (
              <div
                style={{
                  color: "#388e3c",
                  fontWeight: 500,
                  fontSize: "12px",
                  marginBottom: 2,
                }}
              >
                Payment Receipt Date:{" "}
                {new Date(paymentReciptDate).toLocaleString("en-IN", {
                  hour12: true,
                })}
              </div>
            )}
          </React.Fragment>
        );
      },
    },

    {
      accessorKey: "be_no_igm_details",
      header: "Bill Of Entry & IGM Details",
      enableSorting: false,
      size: 300,
      Cell: ({ cell }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[cell.row.original?._id];
        const {
          be_no,
          igm_date,
          igm_no,
          be_date,
          gateway_igm_date,
          gateway_igm,
        } = cell.row.original;

        if (isShrunk) {
          return (
            <div style={{ fontSize: "12px" }}>
              <div>
                <strong>BE: </strong>{be_no || "N/A"}
                {be_date && <span style={{ color: "#64748b", marginLeft: "4px" }}>({be_date})</span>}
              </div>
              {igm_no && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  IGM: {igm_no}
                </div>
              )}
            </div>
          );
        }

        return (
          <div>
            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>BE No:</strong> {be_no || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, be_no)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy BE No">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>BE Date:</strong> {be_date || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, be_date)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy BE Date">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            {activeBranchConfig.gateway_igm_enabled && (
              <div
                style={{
                  marginBottom: "2px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <strong>GIGM:</strong> {gateway_igm || "N/A"}{" "}
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, gateway_igm)}
                  sx={{ padding: "2px", marginLeft: "4px" }}
                >
                  <abbr title="Copy GIGM">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            )}

            {activeBranchConfig.gateway_igm_date_enabled && (
              <div
                style={{
                  marginBottom: "2px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <strong>GIGM Date:</strong> {gateway_igm_date || "N/A"}{" "}
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, gateway_igm_date)}
                  sx={{ padding: "2px", marginLeft: "4px" }}
                >
                  <abbr title="Copy GIGM Date">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            )}

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>IGM No:</strong> {igm_no || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, igm_no)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy IGM No">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>IGM Date:</strong> {igm_date || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, igm_date)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy IGM Date">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 200,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
        const voyageNo = row.original.voyage_no?.toString() || "N/A";
        const line_no = row.original.line_no || "N/A";

        if (isShrunk) {
          const blParts = [];
          if (Array.isArray(row.original.mbl_details) && row.original.mbl_details.length > 0) {
            const mbls = row.original.mbl_details.map((m) => (typeof m === 'object' ? m?.mbl_no : m)).filter(Boolean).join(", ");
            if (mbls) blParts.push(mbls);
          } else if (row.original.awb_bl_no) {
            blParts.push(row.original.awb_bl_no);
          }
          if (Array.isArray(row.original.hbl_details) && row.original.hbl_details.length > 0) {
            const hbls = row.original.hbl_details.map((h) => (typeof h === 'object' ? h?.hbl_no : h)).filter(Boolean).join(", ");
            if (hbls) blParts.push(`H: ${hbls}`);
          } else if (row.original.hawb_hbl_no) {
            blParts.push(`H: ${row.original.hawb_hbl_no}`);
          }
          const blDisplay = blParts.join(" | ") || "-";

          return (
            <div>
              <span style={{ fontWeight: 600 }}>{blDisplay}</span>
              {row.original.shipping_line_airline && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {row.original.shipping_line_airline}
                </div>
              )}
            </div>
          );
        }

        return (
          <React.Fragment>
            <BLTrackingCell
              blNumber={row.original.awb_bl_no}
              hblNumber={row.original?.hawb_hbl_no?.toString() || ""}
              blDate={row.original.awb_bl_date}
              hblDate={row.original.hawb_hbl_date}
              mbl_details={row.original.mbl_details}
              hbl_details={row.original.hbl_details}
              shippingLine={row.original.shipping_line_airline}
              customHouse={row.original?.custom_house || ""}
              container_nos={row.original.container_nos}
              jobId={row.original._id}
              branch_code={row.original.branch_code || ""}
              mode={row.original.mode || ""}
              portOfReporting={row.original.port_of_reporting}
              containerNos={row.original.container_nos}
              onCopy={handleCopy}
            />

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
              {`Vessel Voyage: ${voyageNo}`}
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
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "free_time",
      header: "Free Time",
      size: 100,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const val = cell?.getValue()?.toString() || "-";
        return <span style={{ fontWeight: isShrunk ? 600 : 400 }}>{val}</span>;
      }
    },
    {
      accessorKey: "container_numbers",
      header: "Container Numbers and Size",
      size: 200,
      Cell: ({ cell }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[cell.row.original?._id];
        const containerNos = cell.row.original.container_nos;

        if (isShrunk) {
          const count = containerNos?.length || 0;
          return (
            <div>
              <strong>
                {count > 0 ? `${count} Container(s)` : `${cell.row.original?.no_of_pkgs || 0} Pkg(s)`}
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
      accessorKey: "displayDate", // Use the backend-calculated `displayDate` field
      header: "Required Do Validity Upto",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const displayDate = cell.getValue();
        const dayDifference = row.original.dayDifference;
        const typeOfDo = row.original.type_of_Do;
        const do_list = row.original.do_list;

        if (isShrunk) {
          return (
            <div style={{ fontSize: "12px" }}>
              <span style={{ fontWeight: 600 }}>{displayDate || "-"}</span>
              {typeOfDo && <div style={{ fontSize: "11px", color: "#64748b" }}>{typeOfDo}</div>}
            </div>
          );
        }

        return (
          <div
            style={{
              backgroundColor: dayDifference > 0 ? "#FFCCCC" : "#CCFFCC", // Red if dayDifference is positive
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            {displayDate}{" "}
            {dayDifference > 0 && <div>(+{dayDifference} days)</div>}
            <div>Type Of Do: {typeOfDo}</div>
            <strong> EmptyOff LOC:</strong> {do_list}
          </div>
        );
      },
    },
    {
      accessorKey: "do_revalidation_upto",
      header: "DO Revalidation Upto",
      size: 180,
      Cell: ({ cell }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[cell.row.original?._id];
        const containers = cell.row.original.container_nos || [];

        if (isShrunk) {
          const revalCount = containers.reduce((acc, c) => acc + (c.do_revalidation?.length || 0), 0);
          return (
            <span style={{ fontSize: "12px", color: revalCount > 0 ? "#2563eb" : "#64748b" }}>
              {revalCount > 0 ? `${revalCount} Reval(s)` : "-"}
            </span>
          );
        }

        return (
          <React.Fragment>
            {containers.map((container, containerIndex) => {
              // Check if the container has `do_revalidation` data
              const revalidationData = container.do_revalidation || [];

              return (
                <div
                  key={container.container_number}
                  style={{ marginBottom: "8px" }}
                >
                  {revalidationData.length === 0 ? (
                    <div></div>
                  ) : (
                    revalidationData.map((item, index) => (
                      <div key={item._id} style={{ marginBottom: "4px" }}>
                        {/* Display rank number and revalidation date */}
                        {containerIndex + 1}.{index + 1}.{" "}
                        {item.do_revalidation_upto || "N/A"}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "Doc",
      header: "Do Completed  & Validity Date",
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
            {/* Render the "Checklist" link or fallback text */}
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
    enableDensityToggle: false, // Disable density toggle
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableGlobalFilter: false,
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enablePagination: false,
    enableStickyHeader: true,
    enablePinning: true,
    enableBottomToolbar: false,
    // enableExpandAll: false,
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
    // renderDetailPanel: ({ row }) => {
    //   return (
    //     <div style={{ padding: "0 !important" }}>
    //       <DoPlanningContainerTable
    //         job_no={row.original.job_no}
    //         year={row.original.year}
    //       />
    //     </div>
    //   );
    // },
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
            onInputChange={(event, newValue) => {
              setSelectedImporter(newValue);
              setCurrentPage(1);
            }}
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

  const getTableRowsClassname = (params) => {
    const status = params.original.payment_made;
    if (status !== "No" && status !== undefined) {
      return "payment_made";
    } else {
      return "";
    }
  };

  return (
    <div style={{ height: "80%" }}>
      {/* Search Input */}

      {/* Table */}
      <MaterialReactTable table={table} />

      {/* Pagination */}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
}

export default React.memo(DoCompleted);

import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate, useLocation } from "react-router-dom";
import BLTrackingCell from "../../customHooks/BLTrackingCell";
import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Typography,
  MenuItem,
  Autocomplete,
  Button,
  Box,
  Badge,
  Checkbox,
  Tooltip,
} from "@mui/material";
import { useParams } from "react-router-dom";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  getTableRowsClassname,
  getTableRowInlineStyle,
} from "../../utils/getTableRowsClassname";
import SearchIcon from "@mui/icons-material/Search";
import { useContext } from "react";

import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { BranchContext } from "../../contexts/BranchContext.js";
import useDynamicICDs from "../../customHooks/useDynamicICDs";

import ContainerTrackButton from '../ContainerTrackButton';
import InvoiceDisplay from "./InvoiceDisplay.js";
import ContainerCellContent from "../ContainerCellContent";

function List() {
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const limit = 100;
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);
  const { branches, selectedBranch, selectedCategory } = useContext(BranchContext);
  const activeBranchConfig = branches.find(b => b._id === selectedBranch)?.configuration || { railout_enabled: true, gateway_igm_enabled: true, gateway_igm_date_enabled: true };
  const dynamicICDs = useDynamicICDs();

  // Use context for searchQuery, selectedImporter, and currentPage for List DO tab
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
    currentPageDoTab0: currentPage,
    setCurrentPageDoTab0: setCurrentPage,
  } = useSearchQuery();
  const [importers, setImporters] = useState("");
  const [selectedICD, setSelectedICD] = useState("");
  const [beNoFilter, setBeNoFilter] = useState(""); 
  const [freeTimeFilter, setFreeTimeFilter] = useState(""); 

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

  const [editingRowId, setEditingRowId] = useState(null); 
  const [freeTimeValue, setFreeTimeValue] = useState(""); 

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return; 
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
          const newYear = filteredYears.includes(defaultYearPair)
            ? defaultYearPair
            : filteredYears[0];

          setSelectedYearState(newYear); 
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }

    getYears();
  }, [selectedYearState, setSelectedYearState]);

  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      selectedImporter,
      unresolvedOnly = false,
      emergencyOnly = false,
      freeTimeFilter = "",
      selectedBranch = "all",
      selectedCategory = "all",
      beNoFilter = ""
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/do-team-list-of-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: currentYear,
              selectedICD: currentICD,
              importer: selectedImporter?.trim() || "", 
              username: user?.username || "", 
              unresolvedOnly: unresolvedOnly.toString(), 
              emergency: emergencyOnly.toString(), 
              freeTimeFilter, 
              branchId: selectedBranch || "all", 
              category: selectedCategory || "all", 
              beNoFilter, 
            },
          }
        );

        const {
          totalJobs,
          totalPages,
          jobs,
          unresolvedCount, 
          emergencyCount, 
        } = res.data;
        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0); 
        setEmergencyCount(emergencyCount || 0); 
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
        setUnresolvedCount(0);
        setEmergencyCount(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, user?.username]
  );

  useEffect(() => {
    if (selectedYearState && user?.username) {
      fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter,
        showUnresolvedOnly,
        showEmergencyOnly,
        freeTimeFilter,
        selectedBranch,
        selectedCategory,
        beNoFilter
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
    showEmergencyOnly,
    freeTimeFilter,
    selectedBranch,
    selectedCategory,
    beNoFilter,
    fetchJobs,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); 

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); 
  };

  const handleAdvancedPaymentUpdate = async (id, currentStatus) => {
    try {
      const updatedStatus = !currentStatus; 
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-advanced-payment/${id}`,
        {
          advanced_payment_done: updatedStatus,
          username: user?.username
        },
        {
          headers: {
            "user-role": user?.role || "unknown",
            username: user?.username || "unknown",
            "user-id": user?._id || "unknown",
          },
        }
      );

      setRows((prevRows) =>
        prevRows.map((row) =>
          row._id === id ? { ...row, advanced_payment_done: updatedStatus } : row
        )
      );
    } catch (error) {
      console.error("Error updating advanced payment status:", error);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/do-team-list-of-jobs`,
        {
          params: {
            page: 1,
            limit: 100000,
            search: debouncedSearchQuery,
            year: selectedYearState,
            selectedICD: selectedICD,
            importer: selectedImporter?.trim() || "",
            username: user?.username || "",
            unresolvedOnly: showUnresolvedOnly.toString(),
            emergency: showEmergencyOnly.toString(),
            freeTimeFilter,
            branchId: selectedBranch || "all",
            category: selectedCategory || "all",
            beNoFilter,
          },
        }
      );

      const allJobs = res.data.jobs || [];
      if (allJobs.length === 0) {
        alert("No jobs found to download.");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Jobs");

      worksheet.columns = [
        { header: "IMPORTER", key: "importer", width: 40 },
        { header: "BOE NO", key: "be_no", width: 25 },
        { header: "IGM NO", key: "igm_no", width: 25 },
        { header: "SHIPPING LINE", key: "shipping_line", width: 30 },
        { header: "BL NO", key: "awb_bl_no", width: 30 },
        { header: "CONTAINER NO", key: "container_no", width: 40 },
        { header: "JOB NO", key: "job_no", width: 25 },
      ];

      allJobs.forEach((job) => {
        const containers = job.container_nos && job.container_nos.length > 0
          ? job.container_nos.map(c => c.container_number).filter(Boolean).join(", ")
          : "";

        worksheet.addRow({
          importer: job.importer || "",
          be_no: job.be_no || "",
          igm_no: job.igm_no || "",
          shipping_line: job.shipping_line_airline || "",
          awb_bl_no: job.awb_bl_no || "",
          container_no: containers,
          job_no: job.job_number || job.job_no || "",
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Jobs_Export_${selectedYearState || "All"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export jobs to Excel.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (row) => {
    if (row.consignment_type !== "LCL") {
      setEditingRowId(row._id);
      setFreeTimeValue(row.free_time || "");
    } else {
      alert("Free Time cannot be edited for LCL consignment type.");
    }
  };

  const handleSave = async (id) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-free-time/${id}`,
        {
          free_time: freeTimeValue,
        }
      );
      await fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter,
        showUnresolvedOnly,
        showEmergencyOnly,
        freeTimeFilter,
        selectedBranch,
        selectedCategory,
        beNoFilter
      );
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setEditingRowId(null);
    }
  };

  const handleCancel = () => {
    setEditingRowId(null);
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No ",
      muiTableHeadCellProps: { align: "center" },
      muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
      size: 250,
      Cell: ({ cell }) => {
        const row = cell.row.original;
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row._id];
        const {
          job_no,
          job_number,
          custom_house,
          _id,
          type_of_b_e,
          year,
          consignment_type,
          mode,
          branch_code,
          trade_type,
        } = row;
        const textColor = "blue";
        const bgColor = selectedJobId === _id ? "#ffffcc" : "transparent";

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
                href={`/edit-do-list/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?jobId=${_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: bgColor,
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
                href={`/edit-do-list/${branch_code}/${trade_type}/${mode}/${job_no}/${year}?jobId=${_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: bgColor,
                  textAlign: "center",
                  cursor: "pointer",
                  color: textColor,
                  padding: "10px",
                  borderRadius: "5px",
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
      enableSorting: false,
      size: 270,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const importer = cell?.getValue()?.toString() || "";
        const shipping_line_airline =
          cell.row.original.shipping_line_airline || "";

        if (isShrunk) {
          return (
            <div>
              <span style={{ fontWeight: 600 }}>{importer}</span>
              {shipping_line_airline && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {shipping_line_airline}
                </div>
              )}
            </div>
          );
        }

        return (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{importer}</span>
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, importer)}
              >
                <abbr title="Copy Party Name">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            {shipping_line_airline && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 2,
                }}
              >
                <span>{shipping_line_airline}</span>
                <IconButton
                  size="small"
                  onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                  onClick={(event) => handleCopy(event, shipping_line_airline)}
                >
                  <abbr title="Copy Shipping Line/Airline">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            )}
          </>
        );
      },
    },
    {
      accessorKey: "be_no_igm_details",
      header: "Bill Of Entry & IGM Details",
      enableSorting: false,
      size: 300,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
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
          return (
            <div>
              <span style={{ fontWeight: 600 }}>{row.original.awb_bl_no || "-"}</span>
              {vesselFlight && vesselFlight !== "N/A" && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {vesselFlight} {voyageNo !== "N/A" ? `(${voyageNo})` : ""}
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
              shippingLine={row.original.shipping_line_airline}
              customHouse={row.original?.custom_house || ""}
              container_nos={row.original.container_nos}
              jobId={row.original._id}
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
              <span>{`Line No: ${line_no}`}</span>
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => handleCopy(event, line_no)}
              >
                <abbr title="Copy Line Number">
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
      size: 150,
      Cell: ({ row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        if (editingRowId === row.original._id) {
          return (
            <div style={{ display: "flex", alignItems: "center" }}>
              <TextField
                value={freeTimeValue}
                onChange={(e) => setFreeTimeValue(e.target.value)}
                size="small"
                variant="outlined"
                style={{ width: "60px", marginRight: "8px" }}
                type="number"
              />
              <IconButton onClick={() => handleSave(row.original._id)} size="small">
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton onClick={handleCancel} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>
          );
        }
        return (
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontWeight: isShrunk ? 600 : 400 }}>{row.original.free_time || "-"}</span>
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
        );
      },
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
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 300,
      Cell: ({ cell, row }) => {
        const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
        const {
          processed_be_attachment,
          cth_documents = [],
          checklist,
        } = cell.row.original;

        const getFirstLink = (input) => {
          if (Array.isArray(input)) {
            return input.length > 0 ? input[0] : null;
          }
          return input || null;
        };

        const checklistLink = getFirstLink(checklist);
        const processed_be_attachmentLink = getFirstLink(
          processed_be_attachment
        );

        if (isShrunk) {
          const docCount = (checklistLink ? 1 : 0) + (processed_be_attachmentLink ? 1 : 0) + (cth_documents?.length || 0);
          return (
            <span style={{ fontSize: "12px", color: docCount > 0 ? "#007bff" : "gray" }}>
              {docCount > 0 ? `${docCount} Document(s)` : "No Documents"}
            </span>
          );
        }

        return (
          <div style={{ textAlign: "left" }}>
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
            <InvoiceDisplay row={cell.row.original} />
          </div>
        );
      },
    },
    ...(showEmergencyOnly
      ? [
        {
          accessorKey: "advanced_payment_done",
          header: "Adv. Payment",
          size: 200,
          Cell: ({ row }) => {
            const { advanced_payment_done, _id } = row.original;
            return (
              <div style={{ textAlign: "center" }}>
                <Checkbox
                  checked={!!advanced_payment_done}
                  onChange={() =>
                    handleAdvancedPaymentUpdate(_id, advanced_payment_done)
                  }
                  color="primary"
                />
              </div>
            );
          },
        },
      ]
      : []),
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
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enablePagination: false,
    enableStickyHeader: true,
    enableBottomToolbar: false,
    enablePinning: true,
    enableExpandAll: false,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
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

            <Box sx={{ position: "relative" }}>
              <Button
                variant={showEmergencyOnly ? "contained" : "outlined"}
                color="error"
                size="small"
                onClick={() => setShowEmergencyOnly((prev) => !prev)}
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  padding: "8px 20px",
                }}
              >
                {showEmergencyOnly ? "Show All Jobs" : "Emergency"}
              </Button>
              <Badge
                badgeContent={emergencyCount}
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

            <Button
              variant="contained"
              size="small"
              onClick={handleDownloadExcel}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.875rem",
                padding: "8px 20px",
                background: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 4px 12px rgba(46, 125, 50, 0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
                  boxShadow: "0 6px 16px rgba(46, 125, 50, 0.4)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                },
              }}
            >
              Download Excel
            </Button>
          </div>
        </div>

        {/* Row 2 - Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
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
            label="Free Time Filter"
            value={freeTimeFilter}
            onChange={(e) => {
              setFreeTimeFilter(e.target.value);
              setCurrentPage(1);
            }}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="zero">Free Time = 0</MenuItem>
            <MenuItem value="moreThanZero">Free Time &gt; 0</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            variant="outlined"
            label="BE No Filter"
            value={beNoFilter}
            onChange={(e) => {
              setBeNoFilter(e.target.value);
              setCurrentPage(1);
            }}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="withBeNo">With BE No</MenuItem>
            <MenuItem value="withoutBeNo">Without BE No</MenuItem>
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

  return (
    <>
      <div style={{ height: "80%" }}>
        <MaterialReactTable table={table} /> 
        <Pagination
          count={totalPages > 0 ? totalPages : 1}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
        />
      </div>
    </>
  );
}

export default React.memo(List);

import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
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
} from "@mui/material";
import { useParams } from "react-router-dom";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {
  getTableRowsClassname,
} from "../../utils/getTableRowsClassname";
import SearchIcon from "@mui/icons-material/Search";
import { useContext } from "react";

import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

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
  }, [selectedYearState, setSelectedYearState]);

  // Fetch jobs with pagination
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      selectedImporter,
      unresolvedOnly = false,
      emergencyOnly = false
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
              importer: selectedImporter?.trim() || "", // ✅ Ensure parameter name matches backend
              username: user?.username || "", // ✅ Send username for ICD filtering
              unresolvedOnly: unresolvedOnly.toString(), // ✅ Add unresolvedOnly parameter
              emergency: emergencyOnly.toString(), // ✅ Add emergency parameter
            },
          }
        );

        const {
          totalJobs,
          totalPages,
          currentPage: returnedPage,
          jobs,
          unresolvedCount, // ✅ Get unresolved count from response
          emergencyCount, // ✅ Get emergency count from response
        } = res.data;
        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0); // ✅ Update unresolved count
        setEmergencyCount(emergencyCount || 0); // ✅ Update emergency count
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
    [limit, user?.username] // Dependencies - add username
  );

  // Fetch jobs with pagination
  useEffect(() => {
    if (selectedYearState && user?.username) {
      // Ensure year and username are available before calling API
      fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState, // ✅ Now using the persistent state
        selectedICD,
        selectedImporter,
        showUnresolvedOnly,
        showEmergencyOnly
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
    fetchJobs,
  ]);

  // Remove the automatic clearing - we'll handle this from the tab component instead
  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page when user types
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };
  // const getCustomHouseLocation = useMemo(
  //   () => (customHouse) => {
  //     const houseMap = {
  //       "ICD SACHANA": "SACHANA ICD (INJKA6)",
  //       "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
  //       "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
  //     };
  //     return houseMap[customHouse] || customHouse;
  //   },
  //   []
  // );
  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No ",
      size: 120,
      Cell: ({ cell }) => {
        const {
          job_no,
          custom_house,
          _id,
          type_of_b_e,
          year,
          consignment_type,
        } = cell.row.original;
        const textColor = "blue";
        const bgColor = selectedJobId === _id ? "#ffffcc" : "transparent";
        return (
          <a
            href={`/edit-do-list/${job_no}/${year}?jobId=${_id}`}
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
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
            {custom_house}
          </a>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 270,
      Cell: ({ cell }) => {
        const importer = cell?.getValue()?.toString() || "";
        const shipping_line_airline =
          cell.row.original.shipping_line_airline || "";

        return (
          <>
            {/* Importer row */}
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

            {/* Shipping line / airline row */}
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
    }
    ,

    {
      accessorKey: "be_no_igm_details",
      header: "Bill Of Entry & IGM Details",
      enableSorting: false,
      size: 300,
      Cell: ({ cell }) => {
        const {
          be_no,
          igm_date,
          igm_no,
          be_date,
          gateway_igm_date,
          gateway_igm,
        } = cell.row.original;

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
        const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
        const voyageNo = row.original.voyage_no?.toString() || "N/A";
        const line_no = row.original.line_no || "N/A";

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

            {/* REST OF YOUR CUSTOM CONTENT */}
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
      accessorKey: "container_numbers",
      header: "Container Numbers and Size",
      size: 200,
      Cell: ({ cell }) => {
        const containerNos = cell.row.original.container_nos;
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
      size: 250,
      Cell: ({ cell }) => {
        const {
          processed_be_attachment,
          cth_documents = [],
          checklist,
        } = cell.row.original;

        // Helper function to safely get the first link if it's an array or a string
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

            {/* Render CTH Documents (showing actual URL) */}
            {cth_documents &&
              cth_documents.some(
                (doc) =>
                  doc.url &&
                  doc.url.length > 0 &&
                  (doc.document_name === "Pre-Shipment Inspection Certificate" ||
                    doc.document_name === "Bill of Lading")
              ) ? (
              cth_documents
                .filter(
                  (doc) =>
                    doc.url &&
                    doc.url.length > 0 &&
                    (doc.document_name ===
                      "Pre-Shipment Inspection Certificate" ||
                      doc.document_name === "Bill of Lading")
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
              <span style={{ color: "gray" }}>
                {" "}
                No Pre-Shipment Inspection Certificate <br />
                No Bill of Lading{" "}
              </span>
            )}
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
    enableGlobalFilter: false,
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
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
        {/* Importer Filter */}
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
        {/* Year Filter */}
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
        {/* ICD Code Filter */}
        <TextField
          select
          size="small"
          variant="outlined"
          label="ICD Code"
          value={selectedICD}
          onChange={(e) => {
            setSelectedICD(e.target.value); // Update the selected ICD code
            setCurrentPage(1); // Reset to the first page when the filter changes
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>{" "}
        {/* Search Field */}
        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchInputChange}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {" "}
                <IconButton
                  onClick={() => {
                    setDebouncedSearchQuery(searchQuery);
                    setCurrentPage(1);
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: "300px", marginRight: "20px", marginLeft: "20px" }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: "relative" }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowUnresolvedOnly((prev) => !prev)}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.875rem",
                padding: "8px 20px",
                background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                color: "#ffffff",
                border: "none",
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                  boxShadow: "0 6px 16px rgba(25, 118, 210, 0.4)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                },
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
              variant="contained"
              size="small"
              onClick={() => setShowEmergencyOnly((prev) => !prev)}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.875rem",
                padding: "8px 20px",
                background: "linear-gradient(135deg, #d32f2f 0%, #ff5252 100%)", // Red gradient
                color: "#ffffff",
                border: "none",
                boxShadow: "0 4px 12px rgba(211, 47, 47, 0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #c62828 0%, #d32f2f 100%)",
                  boxShadow: "0 6px 16px rgba(211, 47, 47, 0.4)",
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                },
              }}
            >
              {showEmergencyOnly ? "Show All Jobs" : "Emergency"}
            </Button>
            <Badge
              badgeContent={emergencyCount}
              color="error" // Or primary/warning to contrast with button? White might be better on red? 
              // Wait, badge is outside button. 
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
                  backgroundColor: "#warning.main", // Maybe yellow/white? Default error is red.
                  color: "white"
                },
              }}
            />
          </Box>
        </Box>
      </div>
    ),
  });

  return (
    <>
      <div style={{ height: "80%" }}>
        <MaterialReactTable table={table} /> {/* Pagination */}
        <Pagination
          count={totalPages}
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

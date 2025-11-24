import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";

import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
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
} from "@mui/material";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { getTableRowsClassname, getTableRowInlineStyle } from "../../utils/getTableRowsClassname";

function BillingSheet() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);

  const [selectedICD, setSelectedICD] = useState("");
  const [blValue, setBlValue] = useState("");
  const [years, setYears] = useState([]);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const navigate = useNavigate();
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
      unresolvedOnly = false
    ) => {
      setLoading(true);
      try {
        const apiString =
          process.env.REACT_APP_API_STRING || "http://localhost:9000"; // Fallback for dev
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
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]); // Reset data on failure
        setTotalPages(1);
        setUnresolvedCount(0);
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
        showUnresolvedOnly
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
  ]);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 150,
Cell: ({ cell }) => {
  const {
    job_no,
    year,
    _id,
    type_of_b_e,
    consignment_type,
    custom_house,
    detailed_status,
    vessel_berthing,
    container_nos,
    colorPriority,      // ✅ USE THIS FROM BACKEND
    daysDifference,     // ✅ USE THIS FROM BACKEND
  } = cell.row.original;

  // Color-coding logic - NOW USES BACKEND DATA
  let bgColor = "";
  let textColor = "blue";

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // ✅ MUST normalize time

  // Function to calculate the days difference (MUST MATCH BACKEND)
  const calculateDaysDifference = (targetDate) => {
    if (!targetDate) return null;
    
    const date = new Date(targetDate);
    date.setHours(0, 0, 0, 0); // ✅ CRITICAL: Normalize time
    
    const timeDifference = date.getTime() - currentDate.getTime();
    return Math.floor(timeDifference / (1000 * 3600 * 24));
  };

  // ✅ OPTION 1: Use backend colorPriority (RECOMMENDED)
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
  } 
  // ✅ OPTION 2: Fallback to frontend calculation (with fixed logic)
  else if (detailed_status === "Billing Pending" && container_nos) {
    let mostCriticalDays = null;

    container_nos.forEach((container) => {
      const targetDate = consignment_type === "LCL"
        ? container.delivery_date
        : container.emptyContainerOffLoadDate;

      if (targetDate) {
        const daysDifference = calculateDaysDifference(targetDate);
        
        if (mostCriticalDays === null || daysDifference < mostCriticalDays) {
          mostCriticalDays = daysDifference;
        }
      }
    });

    // Apply colors based on the most critical container
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

  return (
    <Link
      to={`/edit-billing-sheet/${job_no}/${year}?${queryParams}`}
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
        border: bgColor ? "1px solid #ccc" : "none",
      }}
    >
      {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
      {custom_house}
    </Link>
  );
}
    },
    {
      accessorKey: "importer",
      header: "Party",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      enableSorting: false,
      size: 180,
    },
    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "obl_telex_bl",
      header: "BL",
      enableSorting: false,
      size: 180,
    },

    {
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const {
          shipping_line_invoice_imgs = [],
          concor_invoice_and_receipt_copy = [],
          ooc_copies = [],
          cth_documents = [],
        } = cell.row.original;

        // Helper function to safely extract links from arrays
        const getLinks = (input) => {
          return Array.isArray(input) && input.length > 0 ? input : [];
        };

        return (
          <div style={{ textAlign: "left" }}>
            {/* Shipping Line Invoice Received */}
            {shipping_line_invoice_imgs.length > 0 ? (
              shipping_line_invoice_imgs.map((doc, index) => (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "blue",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Shipping Line Invoice {index + 1}
                  </a>
                </div>
              ))
            ) : (
              <div style={{ marginBottom: "5px", color: "gray" }}>
                No Shipping Line Invoice
              </div>
            )}

            {/* Concor Invoice and Receipt Copy */}
            {concor_invoice_and_receipt_copy.length > 0 ? (
              concor_invoice_and_receipt_copy.map((doc, index) => (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "blue",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Concor Invoice {index + 1}
                  </a>
                </div>
              ))
            ) : (
              <div style={{ marginBottom: "5px", color: "gray" }}>
                No Concor Invoice
              </div>
            )}

            {/* OOC Copies */}
            {ooc_copies.length > 0 ? (
              ooc_copies.map((doc, index) => (
                <div key={index} style={{ marginBottom: "5px" }}>
                  <a
                    href={doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "blue",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    OOC Copy {index + 1}
                  </a>
                </div>
              ))
            ) : (
              <div style={{ marginBottom: "5px", color: "gray" }}>
                No OOC Copies
              </div>
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
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      style: getTableRowInlineStyle(row),
    }),
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 1 } },
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
        <TextField
          select
          size="small"
          variant="outlined"
          label="OBL"
          value={blValue}
          onChange={(e) => setBlValue(e.target.value)}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          {" "}
          <MenuItem value="">Select OBL</MenuItem>
          <MenuItem value="Original Documents">Original Documents</MenuItem>
          <MenuItem value="Telex">Telex</MenuItem>
          <MenuItem value="Surrender BL">Surrender BL</MenuItem>
          <MenuItem value="Waybill">Waybill</MenuItem>
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
        </Box>
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

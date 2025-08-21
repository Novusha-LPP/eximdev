import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useContext,
  useRef,
} from "react";
import "../../styles/import-dsr.scss";
import {
  IconButton,
  MenuItem,
  TextField,
  Pagination,
  Button,
  Box,
  Badge,
  Typography,
  Autocomplete,
} from "@mui/material";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { TabContext } from "./ImportOperations.js";

function CompletedOperations() {
  const { currentTab } = useContext(TabContext);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [years, setYears] = useState([]);
        const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
        const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [importers, setImporters] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedICD, setSelectedICD] = useState("");
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
 
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
    // Use context for searchQuery, selectedImporter, and currentPage for tab 2 (Completed Operations)
  const { 
    searchQuery, 
    setSearchQuery, 
    selectedImporter, 
    setSelectedImporter, 
    currentPageOpTab2: currentPage, 
    setCurrentPageOpTab2: setCurrentPage 
  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [isInitialized, setIsInitialized] = useState(false);
  const [page, setPage] = useState(currentPage);
  const location = useLocation();
  const [selectedJobId, setSelectedJobId] = useState(
    location.state?.selectedJobId || null
  );

  // Use refs to track current request and prevent race conditions
  const abortControllerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const isFromJobDetailsRef = useRef(false);

  const limit = 100;
  
  // Initialize component and handle navigation state
  useEffect(() => {
    const fromJobDetails = location.state?.fromJobDetails;
    isFromJobDetailsRef.current = fromJobDetails;
    
    // Changed to check for currentTab === 2 (Completed Operations tab)
    if (currentTab === 2) {
      if (fromJobDetails) {
        // Restore state from job details navigation        
        if (location.state?.searchQuery !== undefined) {
          setSearchQuery(location.state.searchQuery);
          setDebouncedSearchQuery(location.state.searchQuery);
        }
        if (location.state?.selectedImporter !== undefined) {
          setSelectedImporter(location.state.selectedImporter);
        }
        if (location.state?.selectedJobId !== undefined) {
          setSelectedJobId(location.state.selectedJobId);
        }
        if (location.state?.selectedICD !== undefined) {
          setSelectedICD(location.state.selectedICD);
        }
      } else {
        // Clear search state when coming from other tabs (not job details)
        setSearchQuery("");
        setSelectedImporter("");
        setDebouncedSearchQuery("");
        setSelectedICD("");
        // Note: We don't reset currentPage here - pagination should persist
      }
    }

    setIsInitialized(true);
  }, [currentTab, location.state, setSearchQuery, setSelectedImporter]);
  
  // Cleanup function to cancel ongoing requests
  const cancelPreviousRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Optimized fetch function with proper cancellation
  const fetchRows = useCallback(async (
    page,
    searchQuery,
    year,
    selectedICD,
    selectedImporter,
        unresolvedOnly = false
  ) => {
    // Don't make API calls if component isn't initialized, user not available, or no username
    if (!isInitialized || !year || !user?.username) {
      return;
    }
    cancelPreviousRequest();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {      
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-completed-operations/${user.username}`,
        {
          params: {
            page,
            limit,
            search: searchQuery,
            year,
            selectedICD,
            importer: selectedImporter?.trim() || "",
                        unresolvedOnly: unresolvedOnly.toString(), // ✅ Add unresolvedOnly parameter

          },
          signal: controller.signal,
        }
      );

      // Only update state if this is still the current request
      if (abortControllerRef.current === controller) {
        const {
          totalJobs,
          totalPages,
          currentPage: returnedPage,
          jobs,
                  unresolvedCount, // ✅ Get unresolved count from response

        } = res.data;
        
        setRows(Array.isArray(jobs) ? jobs : []);
        setTotalPages(totalPages || 1);
        setTotalJobs(totalJobs || 0);
        abortControllerRef.current = null;
              setUnresolvedCount(unresolvedCount || 0); // ✅ Update unresolved count

      }
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return;
      }
      console.error("Error fetching rows:", error);
      
      // Only update state if this is still the current request
      if (abortControllerRef.current === controller) {
        setRows([]);
        setTotalPages(1);
        setTotalJobs(0);
              setUnresolvedCount(0);
        abortControllerRef.current = null;
      }
    }
  }, [isInitialized, user?.username, limit, cancelPreviousRequest]);
  
  // Handle search debouncing
  useEffect(() => {
    if (!isInitialized) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // Only reset to first page if there's an actual search query (not when clearing)
      if (searchQuery && searchQuery.trim() !== "") {
        setCurrentPage(1); // Reset to first page on new search
        setPage(1);
      }
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, isInitialized, setCurrentPage]);

  // Fetch importers when year changes
  useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
          );
          setImporters(res.data);
        } catch (error) {
          console.error("Error fetching importers:", error);
        }
      }
    }
    getImporterList();
  }, [selectedYearState]);

  // Fetch available years
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
  
  // Main effect to fetch data - consolidated and optimized
  useEffect(() => {
    // Special handling for restoration from job details
    if (isFromJobDetailsRef.current && isInitialized) {
      
      // Use a small delay to ensure all state is properly restored
      const timeoutId = setTimeout(() => {
        const restoredPage = location.state?.currentPage || currentPage;
        fetchRows(
          restoredPage,
          location.state?.searchQuery || "",
          selectedYearState,
          location.state?.selectedICD || "",
          location.state?.selectedImporter || ""
        );
        isFromJobDetailsRef.current = false; // Reset flag
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // Regular data fetching
    if (isInitialized && !isFromJobDetailsRef.current) {
      fetchRows(
        page,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter,
                showUnresolvedOnly
      );
    }
  }, [
    fetchRows,
    page,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    isInitialized,
    location.state,
    currentPage,
    user?.username,
        showUnresolvedOnly,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPreviousRequest();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [cancelPreviousRequest]);
  
  // Handle pagination change
  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
    setCurrentPage(newPage); // Update context as well
  }, [page, setCurrentPage]);

  // Handle copy functionality
  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
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
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  // Function to get Custom House Location
  const getCustomHouseLocation = useMemo(
    () => (customHouse) => {
      const houseMap = {
        "ICD SACHANA": "SACHANA ICD (INJKA6)",
        "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
        "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
      };
      return houseMap[customHouse] || customHouse;
    },
    []
  );

  // Function to format dates
  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  // Memoized importer names to prevent unnecessary recalculations
  const getUniqueImporterNames = useCallback((importerData) => {
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
  }, []);

  const importerNames = useMemo(() => [
    ...getUniqueImporterNames(importers),
  ], [importers, getUniqueImporterNames]);

  const columns = useMemo(() => [
    {
      accessorKey: "job_no",
      header: "Job No & ICD Code",
      enableSorting: false,
      size: 150,
      Cell: ({ cell, row }) => {
        const jobNo = cell.getValue();
        const icdCode = row.original.custom_house;
        const year = row.original.year;
        // Build query string for context passing
      

        return (
          <Link
            to={`/import-operations/view-job/${jobNo}/${year}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              backgroundColor: selectedJobId === jobNo ? "#ffffcc" : "transparent",
              textAlign: "center",
              cursor: "pointer",
              color: "blue",
              padding: "10px",
              borderRadius: "5px",
              textDecoration: "none",
            }}
            onClick={() => setSelectedJobId(jobNo)}
          >
            {jobNo}
            <br />
            <small>{icdCode}</small>
          </Link>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer Name",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "be_no",
      header: "BE Number & BE Date",
      size: 150,
      Cell: ({ cell }) => {
        const beNumber = cell?.getValue()?.toString();
        const rawBeDate = cell.row.original.be_date;
        const customHouse = cell.row.original.custom_house;

        const beDate = formatDate(rawBeDate);
        const location = getCustomHouseLocation(customHouse);

        return (
          <>
            {beNumber && (
              <>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <a
                    href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}&beTrack_location=${location}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {beNumber}
                  </a>

                  <IconButton
                    size="small"
                    onClick={(event) => handleCopy(event, beNumber)}
                  >
                    <abbr title="Copy BE Number">
                      <ContentCopyIcon fontSize="inherit" />
                    </abbr>
                  </IconButton>
                </div>
                <small>{beDate}</small>
              </>
            )}
          </>
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
  accessorKey: "container_nos",
  header: "Arrival Date",
  enableSorting: false,
  size: 150,
  Cell: ({ cell }) =>
    cell.getValue()?.map((container, id) => (
      <React.Fragment key={id}>
        {formatDate(container.arrival_date)}
        <br />
      </React.Fragment>
    )),
},
{
  accessorKey: "examination_planning_date",
  header: "Examination Planning Date",
  enableSorting: false,
  size: 240,
  Cell: ({ cell }) => (
    <div style={{ textAlign: "center" }}>{formatDate(cell.getValue())}</div>
  ),
},
{
  accessorKey: "pcv_date",
  header: "PCV Date",
  enableSorting: false,
  size: 120,
  Cell: ({ cell }) => (
    <div style={{ textAlign: "center" }}>{formatDate(cell.getValue())}</div>
  ),
},
{
  accessorKey: "out_of_charge",
  header: "Out Of Charge Date",
  enableSorting: false,
  size: 150,
  Cell: ({ cell }) => (
    <div style={{ textAlign: "center" }}>{formatDate(cell.getValue())}</div>
  ),
},
  ], [selectedJobId, searchQuery, selectedImporter, selectedICD, selectedYearState, handleCopy, formatDate, getCustomHouseLocation, navigate, page]);

  const tableConfig = useMemo(() => ({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
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
    muiTableBodyRowProps: ({ row }) => ({
      className: row.original.row_color || "",
    }),
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
          value={selectedImporter || ""}
          onInputChange={(event, newValue) => {
            setSelectedImporter(newValue);
            const newPage = 1;
            setPage(newPage);
            setCurrentPage(newPage);
          }}
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

        <TextField
          select
          size="small"
          value={selectedYearState}
          onChange={(e) => {
            setSelectedYearState(e.target.value);
            const newPage = 1;
            setPage(newPage);
            setCurrentPage(newPage);
          }}
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
          label="ICD Code"
          value={selectedICD}
          onChange={(e) => {
            setSelectedICD(e.target.value);
            const newPage = 1;
            setPage(newPage);
            setCurrentPage(newPage);
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>

        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px", marginRight: "20px", marginLeft: "20px" }}
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
  }), [columns, rows, totalJobs, importerNames, selectedImporter, selectedYearState, years, selectedICD, searchQuery, setSelectedImporter, setSelectedYearState, setSearchQuery, setCurrentPage]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable {...tableConfig} />

      <Pagination
        count={totalPages}
        page={page}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
}

export default React.memo(CompletedOperations);
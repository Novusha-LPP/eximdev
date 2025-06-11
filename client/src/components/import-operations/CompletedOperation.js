import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useContext,
} from "react";
import "../../styles/import-dsr.scss";
import {
  IconButton,
  MenuItem,
  TextField,
  Pagination,
  Typography,
  Autocomplete,
} from "@mui/material";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate, useLocation } from "react-router-dom";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { TabContext } from "./ImportOperations.js";

function CompletedOperations() {
  const { currentTab } = useContext(TabContext); // Access context for tab state
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [years, setYears] = useState([]);
  const [importers, setImporters] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedICD, setSelectedICD] = useState("");
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [page, setPage] = useState(1); // Current page
  const [totalPages, setTotalPages] = useState(1); // Total pages
  const [totalJobs, setTotalJobs] = useState(0); // Total job count  // Use context for searchQuery and selectedImporter like E-Sanchit
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // Debounced search query
  const [isRestoringState, setIsRestoringState] = useState(false); // Flag to track state restoration
  const [abortController, setAbortController] = useState(null); // To cancel previous requests
  const limit = 100; // Rows per page
  const location = useLocation();
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );

  // Add state persistence logic similar to E-Sanchit
  React.useEffect(() => {
    // Clear search state when this tab becomes active, unless coming from job details
    if (currentTab === 2 && !(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setSelectedImporter("");
    }
  }, [currentTab, setSearchQuery, setSelectedImporter, location.state]);

  // Fetch rows data
  const fetchRows = useCallback(async (
    page,
    searchQuery,
    year,
    selectedICD,
    selectedImporter
  ) => {
    // Cancel previous request if it exists
    if (abortController) {
      abortController.abort();
    }

    // Create new abort controller for this request
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

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
          },
          signal: newAbortController.signal,
        }
      );

      setRows(res.data.jobs);
      setTotalPages(res.data.totalPages);
      setTotalJobs(res.data.totalJobs);    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return; // Don't log errors for cancelled requests
      }
      console.error("Error fetching rows:", error);
      setRows([]);
      setTotalPages(1);
    } finally {
      // Clear the abort controller
      setAbortController(null);
    }
  }, [abortController, user.username, limit]);
  // Handle search state restoration when returning from job details
  React.useEffect(() => {
    if (location.state?.fromJobDetails) {
      console.log('🔄 Restoring search state from job details navigation');
      setIsRestoringState(true);
      
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
      
      // Reset the flag and make explicit API call
      setTimeout(() => {
        console.log('🎯 Making explicit API call with restored search parameters');
        fetchRows(
          1, // Reset to first page
          location.state?.searchQuery || "",
          selectedYearState,
          location.state?.selectedICD || "",
          location.state?.selectedImporter || ""
        ).then(() => {
          // Only reset the flag after the API call completes
          setIsRestoringState(false);
        });
      }, 150);
    }
  }, [location.state?.fromJobDetails, setSearchQuery, setSelectedImporter, selectedYearState, fetchRows]);

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

  const importerNames = [
    ...getUniqueImporterNames(importers),
  ];

  // Fetch available years for filtering
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
    getYears();  }, [selectedYearState, setSelectedYearState]);  // Fetch rows when dependencies change
  useEffect(() => {
    // Skip regular fetch if we're in the middle of restoring state
    if (!isRestoringState) {
      fetchRows(
        page,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter
      );
    }
  }, [
    fetchRows,
    page,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
  ]);// Handle search input with debounce
  useEffect(() => {
    // Only trigger debounce if we're not in the middle of restoring state
    if (!isRestoringState) {
      const handler = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
        setPage(1); // Reset to first page on new search
      }, 500); // 500ms debounce delay
      return () => clearTimeout(handler);
    }
  }, [searchQuery, isRestoringState]);

  // Handle pagination change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

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

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No & ICD Code",
      enableSorting: false,
      size: 150,
      Cell: ({ cell, row }) => {
        const jobNo = cell.getValue();
        const icdCode = row.original.custom_house;
        const year = row.original.year;

        return (
          <div
            style={{
              // If the row matches the selected ID, give it a highlight
              backgroundColor:
                selectedJobId === jobNo ? "#ffffcc" : "transparent",
              textAlign: "center",
              cursor: "pointer",
              color: "blue",
            }}            onClick={() => {
              // 1) Set the selected job in state so we can highlight it
              setSelectedJobId(jobNo);              // 2) Navigate to the detail page, and pass comprehensive search state
              navigate(`/import-operations/view-job/${jobNo}/${year}`, {
                state: {
                  selectedJobId: jobNo,
                  searchQuery,
                  selectedImporter,
                  selectedICD,
                  selectedYearState,
                  currentTab: 2, // Completed Operation tab index
                  fromJobList: true,
                },
              });
            }}
          >
            {jobNo}
            <br />
            <small>{icdCode}</small>
          </div>
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
      accessorKey: "container_nos", // Access the nested container_nos array
      header: "Arrival Date",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) =>
        cell.getValue()?.map((container, id) => (
          <React.Fragment key={id}>
            {container.arrival_date}
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
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "pcv_date",
      header: "PCV Date",
      enableSorting: false,
      size: 120,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "out_of_charge",
      header: "Out Of Charge Date",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
  ];

  const tableConfig = {
    columns,
    data: rows, // Use rows directly as backend handles sorting
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
      className: row.original.row_color || "", // Apply row color
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
        {/* Job Count Display */}
        <Typography
          variant="body1"
          sx={{ fontWeight: "bold", fontSize: "1.5rem", marginRight: "auto" }}
        >
          Job Count: {totalJobs}
        </Typography>        <Autocomplete
          sx={{ width: "300px", marginRight: "20px" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""} // Controlled value
          onInputChange={(event, newValue) => {
            setSelectedImporter(newValue);
            setPage(1); // Reset to first page when importer changes
          }} // Handles input change
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer" // Placeholder text
            />
          )}
        />        <TextField
          select
          size="small"
          value={selectedYearState}
          onChange={(e) => {
            setSelectedYearState(e.target.value);
            setPage(1); // Reset to first page when year changes
          }}
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
            setPage(1); // Reset to the first page when the filter changes
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>
        {/* Search Bar */}
        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px", marginRight: "20px", marginLeft: "20px" }}
        />
      </div>
    ),
  };

  return (
    <div style={{ height: "80%" }}>
      {/* Table */}
      <MaterialReactTable {...tableConfig} />

      {/* Pagination */}
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

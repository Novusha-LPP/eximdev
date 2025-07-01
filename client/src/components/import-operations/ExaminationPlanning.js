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
  Typography,
  Autocomplete
} from "@mui/material";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import Tooltip from "@mui/material/Tooltip";
import JobStickerPDF from "../import-dsr/JobStickerPDF";
import { YearContext } from "../../contexts/yearContext.js";
import ConcorInvoiceCell from "../gallery/ConcorInvoiceCell.js";
import { TabContext } from "./ImportOperations.js";

function ImportOperations() {
  const { currentTab } = useContext(TabContext);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [years, setYears] = useState([]);
  const [importers, setImporters] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedICD, setSelectedICD] = useState("");
  const [detailedStatusExPlan, setDetailedStatusExPlan] = useState("");
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  // Remove local page state and use persistent pagination from context
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter, currentPageOpTab1: currentPage, setCurrentPageOpTab1: setCurrentPage } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  
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
    isFromJobDetailsRef.current = fromJobDetails;    if (currentTab === 1) {
      console.log('🔧 ExaminationPlanning: Initializing tab with currentPage:', currentPage);
      if (fromJobDetails) {
        // Restore state from job details navigation
        console.log('🔄 Restoring search state from job details navigation');
        
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
        if (location.state?.detailedStatusExPlan !== undefined) {
          setDetailedStatusExPlan(location.state.detailedStatusExPlan);
        }      } else {
        // Clear search state when coming from other tabs (not job details)
        console.log('🧹 Clearing search state - new tab access');
        setSearchQuery("");
        setSelectedImporter("");
        setDebouncedSearchQuery("");
        setSelectedICD("");
        setDetailedStatusExPlan("");
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
  const fetchJobs = useCallback(async (
    currentPage,
    currentSearchQuery,
    yearState,
    currentStatus,
    currentICD,
    currentImporter
  ) => {
    // Don't make API calls if component isn't initialized
    if (!isInitialized || !yearState) {
      return;
    }

    cancelPreviousRequest();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      console.log('📡 Making API call:', { 
        currentPage, 
        currentSearchQuery, 
        yearState, 
        currentStatus, 
        currentICD, 
        currentImporter 
      });
      
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/${user.username}`,
        {
          params: {
            page: currentPage,
            limit,
            search: currentSearchQuery,
            year: yearState,
            detailedStatusExPlan: currentStatus,
            selectedICD: currentICD,
            importer: currentImporter?.trim() || "",
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
        } = res.data;        setRows(Array.isArray(jobs) ? jobs : []);
        setTotalPages(totalPages || 1);
        setTotalJobs(totalJobs || 0);
        abortControllerRef.current = null;
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.log('🚫 Request cancelled');
        return;
      }
      console.error("Error fetching data:", error);
      
      // Only update state if this is still the current request
      if (abortControllerRef.current === controller) {
        setRows([]);
        setTotalPages(1);
        setTotalJobs(0);
        abortControllerRef.current = null;
      }
    }
  }, [isInitialized, user.username, limit, cancelPreviousRequest]);
  // Handle search debouncing
  useEffect(() => {
    if (!isInitialized) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }    debounceTimeoutRef.current = setTimeout(() => {
      console.log('🔍 ExaminationPlanning: Search debounce triggered with query:', searchQuery);
      setDebouncedSearchQuery(searchQuery);
      // Only reset to first page if there's an actual search query (not when clearing)
      if (searchQuery && searchQuery.trim() !== "") {
        console.log('🔍 ExaminationPlanning: Resetting to page 1 due to search');
        setCurrentPage(1); // Reset to first page on new search
      }
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, isInitialized]);


  // Fetch importer list when year changes
  useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
          );
          setImporters(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
          console.error("Error fetching importer list:", error);
          setImporters([]);
        }
      }
    }
    getImporterList();
  }, [selectedYearState]);

  // Fetch available years for filtering
  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        // Only set default year if selectedYearState is not already set
        if (!selectedYearState && filteredYears.length > 0) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;
          const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
          const currentTwoDigits = String(currentYear).slice(-2);
          const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

          let defaultYearPair =
            currentMonth >= 4
              ? `${currentTwoDigits}-${nextTwoDigits}`
              : `${prevTwoDigits}-${currentTwoDigits}`;

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

 useEffect(() => {
    // Special handling for restoration from job details
    if (isFromJobDetailsRef.current && isInitialized) {
      console.log('🎯 Making API call with restored search parameters');
        // Use a small delay to ensure all state is properly restored
      const timeoutId = setTimeout(() => {
        fetchJobs(
          location.state?.currentPage || currentPage, // Use the restored page or current page
          location.state?.searchQuery || "",
          selectedYearState,
          location.state?.detailedStatusExPlan || "",
          location.state?.selectedICD || "",
          location.state?.selectedImporter || ""
        );
        isFromJobDetailsRef.current = false; // Reset flag
      }, 100);

      return () => clearTimeout(timeoutId);
    }    // Regular data fetching
    if (isInitialized && !isFromJobDetailsRef.current) {
      fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState,
        detailedStatusExPlan,
        selectedICD,
        selectedImporter
      );
    }
  }, [
    fetchJobs,
    currentPage,
    debouncedSearchQuery,
    selectedYearState,
    detailedStatusExPlan,
    selectedICD,
    selectedImporter,
    isInitialized,
    location.state
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
    console.log('Examination Planning: Page changing from', currentPage, 'to', newPage);
    setCurrentPage(newPage);
  }, [currentPage, setCurrentPage]);

  // Handle search input change
  const handleSearchInputChange = (event) => {
    console.log('Examination Planning: Search input changed, resetting to page 1');
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page when user types
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

  // Memoized functions to prevent unnecessary recalculations
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
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

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

        return (
          <div
            style={{
              backgroundColor:
                selectedJobId === jobNo ? "#ffffcc" : "transparent",
              textAlign: "center",
              cursor: "pointer",
              color: "blue",
            }}
            onClick={() => {
              setSelectedJobId(jobNo);
              navigate(`/import-operations/view-job/${jobNo}/${year}`, {
                state: {
                  selectedJobId: jobNo,
                  searchQuery,
                  selectedImporter,
                  selectedICD,
                  selectedYearState,
                  detailedStatusExPlan,
                  currentTab: 1,
                  currentPage,
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
      Cell: ({ row }) => {
        const containerNos = row.original.container_nos;
        if (!Array.isArray(containerNos)) return null;
        
        return (
          <React.Fragment>
            {containerNos.map((container, id) => (
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
      accessorKey: "all_dates",
      header: "Dates",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const containerNos = row.original?.container_nos ?? [];
        const pcvDate = formatDate(row.original?.pcv_date);
        const outOfCharge = formatDate(row.original?.out_of_charge);
        const examinationPlanningDate = formatDate(
          row.original?.examination_planning_date
        );
        const firstCheck = formatDate(row.original?.firstCheck);

        return (
          <div style={{ lineHeight: "1.5" }}>
            <Tooltip title="Arrival Date" arrow>
              <strong>Arrival: </strong>
            </Tooltip>
            {containerNos.length > 0
              ? containerNos.map((container, id) => (
                  <React.Fragment key={id}>
                    {formatDate(container.arrival_date)}
                    <br />
                  </React.Fragment>
                ))
              : "N/A"}

            <Tooltip title="First Check Date" arrow>
              <strong>FC: </strong>
            </Tooltip>
            {firstCheck}
            <br />

            <Tooltip title="Examination Planning Date" arrow>
              <strong>Ex.Plan: </strong>
            </Tooltip>
            {examinationPlanningDate}
            <br />

            <Tooltip title="PCV Date" arrow>
              <strong>PCV: </strong>
            </Tooltip>
            {pcvDate}
            <br />

            <Tooltip title="Out of Charge Date" arrow>
              <strong>OOC: </strong>
            </Tooltip>
            {outOfCharge}
            <br />
          </div>
        );
      },
    },
    {
      accessorKey: "concor_invoice_copy",
      header: "Concor Invoice Copy",
      enableSorting: false,
      size: 150,
      Cell: ConcorInvoiceCell,
    },
    {
      accessorKey: "do_validity",
      header: "DO Completed & Validity",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const doValidity = row.original.do_validity;
        const doCompleted = row.original.do_completed;
        const doCopies = row.original.do_copies;

        return (
          <div style={{ textAlign: "center" }}>
            <div>
              <strong>Completed:</strong>{" "}
              {doCompleted
                ? new Date(doCompleted).toLocaleString("en-US", {
                    timeZone: "Asia/Kolkata",
                    hour12: true,
                  })
                : "Not Completed"}
            </div>
            <div>
              <strong>Validity:</strong> {doValidity || "N/A"}
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
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const {
          cth_documents,
          all_documents,
          checklist,
        } = row.original;

        const getFirstLink = (input) => {
          if (Array.isArray(input)) {
            return input.length > 0 ? input[0] : null;
          }
          return input || null;
        };

        const checklistLink = getFirstLink(checklist);

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
                <span style={{ color: "gray" }}>No Checklist</span>
              </div>
            )}

            {Array.isArray(cth_documents) &&
              cth_documents
                .filter((doc) => doc.url && doc.url.length > 0)
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
                ))}

            {Array.isArray(all_documents) &&
              all_documents.map((docUrl, index) => (
                <div key={`doc-${index}`} style={{ marginBottom: "5px" }}>
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "green",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Doc{index + 1}
                  </a>
                </div>
              ))}
          </div>
        );
      },
    },
    {
      id: "jS",
      header: "Job Sticker",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const pdfRef = React.useRef(null);

        const handleGenerate = () => {
          pdfRef.current?.generatePdf();
        };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <JobStickerPDF ref={pdfRef} data={row.original} />
            <button
              onClick={handleGenerate}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                borderRadius: "6px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                cursor: "pointer",
              }}
            >
              Generate Job Sticker
            </button>
          </div>
        );
      },
    },
  ], [selectedJobId, searchQuery, selectedImporter, selectedICD, selectedYearState, detailedStatusExPlan, navigate, handleCopy, formatDate, getCustomHouseLocation]);

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
          sx={{ width: "200px", marginRight: "20px" }}
          freeSolo
          options={importerNames.map((option) => option.label)}
          value={selectedImporter || ""}          onInputChange={(event, newValue) => {
            setSelectedImporter(newValue);
            setCurrentPage(1);
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
          value={selectedYearState || ""}          onChange={(e) => {
            setSelectedYearState(e.target.value);
            setCurrentPage(1);
          }}
          sx={{ width: "100px", marginRight: "20px" }}
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
          value={selectedICD}          onChange={(e) => {
            setSelectedICD(e.target.value);
            setCurrentPage(1);
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          variant="outlined"
          label="Select Status Ex-Planning"
          value={detailedStatusExPlan}          onChange={(e) => {
            setDetailedStatusExPlan(e.target.value);
            setCurrentPage(1);
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="">Select Status Ex-Planning</MenuItem>
          <MenuItem value="Arrival">Arrival</MenuItem>
          <MenuItem value="FC">FC</MenuItem>
          <MenuItem value="Ex. Planning">Ex. Planning</MenuItem>
          <MenuItem value="OOC">OOC</MenuItem>
          <MenuItem value="Do Completed">Do Completed</MenuItem>
        </TextField>        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearchInputChange}
          sx={{ width: "250px", marginRight: "20px", marginLeft: "20px" }}
        />
      </div>
    ),
  }), [columns, rows, totalJobs, importerNames, selectedImporter, selectedYearState, years, selectedICD, detailedStatusExPlan, searchQuery, setSelectedImporter, setSelectedYearState, setSearchQuery]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ height: "80%" }}>
      <MaterialReactTable {...tableConfig} />      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
}

export default React.memo(ImportOperations);
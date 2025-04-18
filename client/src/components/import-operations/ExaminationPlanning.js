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
  Autocomplete
} from "@mui/material";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate, useLocation } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import JobStickerPDF from "../import-dsr/JobStickerPDF";
import { YearContext } from "../../contexts/yearContext.js";
import ConcorInvoiceCell from "../gallery/ConcorInvoiceCell.js";

function ImportOperations() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [years, setYears] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedICD, setSelectedICD] = useState("");
  const [detailedStatusExPlan, setDetailedStatusExPlan] = useState("");
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [page, setPage] = useState(1); // Current page
  const [totalPages, setTotalPages] = useState(1); // Total pages
  const [totalJobs, setTotalJobs] = useState(0); // Total job count

  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // Debounced search query
  const limit = 100; // Rows per page
  const location = useLocation();
  const [selectedJobId, setSelectedJobId] = useState(
    // If you previously stored a job ID in location.state, retrieve it
    location.state?.selectedJobId || null
  );

  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
        );
        setImporters(res.data);
        // setSelectedImporter("Select Importer");
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
          selectedYearState(
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

  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedYearState,
      currentStatus,
      currentICD,
      selectedImporter
    ) => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/${user.username}`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              year: selectedYearState,
              detailedStatusExPlan: currentStatus, // Ensure parameter name matches backend
              selectedICD: currentICD,
              importer: selectedImporter?.trim() || "", // ✅ Ensure parameter name matches backend
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
        setPage(returnedPage); // Ensure the page state stays in sync
        setTotalJobs(totalJobs);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]); // Reset data on failure
        setTotalPages(1);
      }
    },
    [limit] // Dependencies (limit is included if it changes)
  );

  // Fetch jobs when dependencies change
  useEffect(() => {
    fetchJobs(
      page,
      debouncedSearchQuery,
      selectedYearState,
      detailedStatusExPlan,
      selectedICD,
      selectedImporter
    );
  }, [
    page,
    debouncedSearchQuery,
    selectedYearState,
    detailedStatusExPlan,
    selectedICD,
    selectedImporter,
    fetchJobs,
  ]);

  // Handle search input with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce delay
    return () => clearTimeout(handler);
  }, [searchQuery]);
  useEffect(() => {
    if (location.state?.searchQuery) {
      setSearchQuery(location.state.searchQuery);
    }
  }, [location.state?.searchQuery]);

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
            }}
            onClick={() => {
              // 1) Set the selected job in state so we can highlight it
              setSelectedJobId(jobNo);

              // 2) Navigate to the detail page, and pass selectedJobId
              navigate(`/import-operations/view-job/${jobNo}/${year}`, {
                state: {
                  selectedJobId: jobNo,
                  tab_number: 1,
                  searchQuery,
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
      accessorKey: "all_dates",
      header: "Dates",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        // Helper function to handle empty or missing values
        const formatDate = (date) => {
          return date && date.split("T")[0].trim() !== ""
            ? date.split("T")[0]
            : "N/A";
        };

        const containerNos = row.original?.container_nos ?? [];
        const pcvDate = formatDate(row.original?.pcv_date);
        const outOfCharge = formatDate(row.original?.out_of_charge);
        const examinationPlanningDate = formatDate(
          row.original?.examination_planning_date
        );
        const fristCheck = formatDate(row.original?.fristCheck);

        return (
          <div style={{ lineHeight: "1.5" }}>
            {/* Arrival dates */}
            <Tooltip title="Arrival Date" arrow>
              <strong>Arrival: </strong>
            </Tooltip>
            {containerNos.length > 0
              ? containerNos.map((container, id) => (
                  <React.Fragment key={id}>
                    {container.arrival_date?.split("T")[0] ?? "N/A"}
                    <br />
                  </React.Fragment>
                ))
              : "N/A"}

            {/* First Check Date */}
            <Tooltip title="First Check Date" arrow>
              <strong>FC: </strong>
            </Tooltip>
            {fristCheck}
            <br />

            {/* Examination Planning Date */}
            <Tooltip title="Examination Planning Date" arrow>
              <strong>Ex.Plan: </strong>
            </Tooltip>
            {examinationPlanningDate}
            <br />

            {/* PCV Date */}
            <Tooltip title="PCV Date" arrow>
              <strong>PCV: </strong>
            </Tooltip>
            {pcvDate}
            <br />

            {/* OOC Date */}
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
      Cell: ({ cell }) => {
        const {
          cth_documents,
          all_documents,
          job_sticker_upload,
          verified_checklist_upload,
          checklist,
        } = cell.row.original;

        // Helper function to safely get the first link if it's an array or a string
        const getFirstLink = (input) => {
          if (Array.isArray(input)) {
            return input.length > 0 ? input[0] : null;
          }
          return input || null;
        };

        const stickerLink = getFirstLink(job_sticker_upload);
        const checklistLink = getFirstLink(checklist);

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

            {/* Render CTH Documents (showing actual URL) */}
            {cth_documents
              ?.filter((doc) => doc.url && doc.url.length > 0)
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

            {/* Render All Documents (showing actual URL) */}
            {all_documents?.map((docUrl, index) => (
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
        // 1) Create a ref for the JobStickerPDF child
        const pdfRef = React.useRef(null);

        // 2) Handler calls the child method
        const handleGenerate = () => {
          pdfRef.current?.generatePdf();
        };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* 3) The invisible child that has .generatePdf() */}
            <JobStickerPDF ref={pdfRef} data={row.original} />

            {/* 4) A button that triggers PDF generation */}
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
        </Typography>

        <Autocomplete
          sx={{ width: "200px", marginRight: "20px" }}
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
          sx={{ width: "100px", marginRight: "20px" }}
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

        <TextField
          select
          size="small"
          variant="outlined"
          label="Select Status Ex-Planning"
          value={detailedStatusExPlan}
          onChange={(e) => {
            setDetailedStatusExPlan(e.target.value); // Update the selected ICD code
            setPage(1); // Reset to the first page when the filter changes
          }}
          sx={{ width: "200px", marginRight: "20px" }}
        >
          <MenuItem value="All"> Select Status Ex-Planning</MenuItem>
          <MenuItem value="Arrival">Arrival</MenuItem>
          <MenuItem value="FC">FC </MenuItem>
          <MenuItem value="Ex. Planning">Ex. Planning</MenuItem>
          <MenuItem value="OOC">OOC</MenuItem>
          <MenuItem value="Do Completed">Do Completed</MenuItem>
        </TextField>
        {/* Search Bar */}
        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "250px", marginRight: "20px", marginLeft: "20px" }}
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

export default React.memo(ImportOperations);

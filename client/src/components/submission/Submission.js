import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useNavigate, useLocation } from "react-router-dom";
import {
  TextField,
  Box,
  Pagination,
  Typography,
  InputAdornment,
  IconButton,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname"; // Ensure this utility is correctly imported
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";

function Submission() {
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const [years, setYears] = useState([]);
  const [importers, setImporters] = useState("");

  const [rows, setRows] = React.useState([]);
  const [totalJobs, setTotalJobs] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
// Use context for search functionality and pagination like E-Sanchit
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

  // useEffect(() => {
  //   if (!selectedImporter) {
  //     setSelectedImporter("Select Importer");
  //   }
  // }, [importerNames]);

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
  }, [searchQuery]);

  // Fetch jobs with pagination and search
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedImporter,
      selectedYearState
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
        setPage(returnedPage);
        setTotalJobs(totalJobs);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]); // Reset rows if an error occurs
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit, selectedImporter, selectedYearState] // Dependency array remains the same
  );

  // Fetch jobs when page or debounced search query changes
  useEffect(() => {
    fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYearState);
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    fetchJobs,
  ]);
  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to the first page on new search
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);
const handlePageChange = (event, newPage) => {
  setPage(newPage);
};

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
          type_of_b_e,
          consignment_type,
          custom_house,
          priorityColor, // Add priorityColor from API response
        } = cell.row.original;
        const textColor = "blue";
        const bgColor = cell.row.original.priorityJob === "High Priority"
          ? "orange"
          : cell.row.original.priorityJob === "Priority"
          ? "yellow"
          : "transparent";
        return (
          <a
            href={`/submission-job/${job_no}/${year}`}
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
      size: 150,
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Num & Date",
      size: 150,
      Cell: ({ cell }) => {
        const { awb_bl_no, awb_bl_date } = cell.row.original;
        return (
          <div>
            {awb_bl_no} <br /> {awb_bl_date}
          </div>
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
                {container.container_number}| "{container.size}"
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "igm_details",
      header: "IGM Details",
      enableSorting: false,
      size: 250,
      Cell: ({ cell }) => {
        const {
          gateway_igm_date,
          gateway_igm,
          igm_date,
          igm_no,
          job_net_weight,
          gross_weight,
          line_no,
          no_of_pkgs,
        } = cell.row.original;

        return (
          <div>
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
        const { invoice_date = "N/A", invoice_number = "N/A" } = row.original;
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
      header: "BE Filling Type",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const {
          be_filing_type,
          be_date,
          is_checklist_aprroved,
          is_checklist_aprroved_date,
        } = row.original;

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
            </div>            {/* Checklist Approval Date */}
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
        const { cth_documents = [] } = row.original;

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
                    href={doc.url[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "#007bff",
                      display: "block",
                    }}
                  >
                    {`${doc.document_code} - ${doc.document_name}${
                      doc.irn ? ` - ${doc.irn}` : ""
                    }`}
                  </a>
                  {/* Uncomment the following if you want to display the date */}
                  {/* <div style={{ fontSize: "12px", color: "#555" }}>
                    Checked Date:{" "}
                    {new Date(doc.document_check_date).toLocaleDateString()}
                  </div> */}
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
    },    muiTableBodyRowProps: ({ row }) => {
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
      
      return {
        className: getTableRowsClassname(row),
        sx: {
          backgroundColor: backgroundColor,
          '&:hover': {
            backgroundColor: hoverColor || undefined
          }
        }
      };
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
          sx={{ width: "300px", marginRight: "20px", marginLeft: "20px" }}
        />
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

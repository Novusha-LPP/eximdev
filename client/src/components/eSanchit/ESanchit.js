// ESanchit.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Box,
  Typography,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { getTableRowsClassname } from "../../utils/getTableRowsClassname"; // Ensure this utility is correctly imported

function ESanchit() {
  const [selectedYear, setSelectedYear] = useState("");
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const [loading, setLoading] = useState(false); // Loading state
  const [searchQuery, setSearchQuery] = useState(""); // User input for search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // Debounced search query
  const limit = 100; // Number of items per page
  const [totalJobs, setTotalJobs] = useState(0); // Total job count
  const navigate = useNavigate();
  const [selectedImporter, setSelectedImporter] = useState("");
  const [importers, setImporters] = useState("");

  // Get importer list for MUI autocomplete
  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`
        );
        setImporters(res.data);
      }
    }
    getImporterList();
  }, [selectedYear]);
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

        if (!selectedYear && filteredYears.length > 0) {
          setSelectedYear(
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
  }, [selectedYear, setSelectedYear]);

  // Fetch jobs with pagination and search
  const fetchJobs = useCallback(
    async (currentPage, currentSearchQuery, selectedImporter, selectedYear) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-esanchit-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYear || "", // ✅ Ensure year is sent
            },
          }
        );
  
        const { totalJobs, totalPages, currentPage: returnedPage, jobs } = res.data;
  
        setRows(jobs);
        setTotalPages(totalPages);
        setPage(returnedPage);
        setTotalJobs(totalJobs);
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit, selectedImporter, selectedYear] // ✅ Add selectedYear as a dependency
  );
  
  // ✅ Fetch jobs when `selectedYear` changes
  useEffect(() => {
    fetchJobs(page, debouncedSearchQuery, selectedImporter, selectedYear);
  }, [page, debouncedSearchQuery, selectedImporter, selectedYear, fetchJobs]); 
  
  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page on new search
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Handle copy functionality (can be abstracted if used multiple times)
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

  // Define table columns
  const columns = React.useMemo(
    () => [
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

          return (
            <div
              onClick={() => navigate(`/esanchit-job/${job_no}/${year}`)}
              style={{
                cursor: "pointer",
                color: "blue",
                backgroundColor:
                  cell.row.original.priorityJob === "High Priority"
                    ? "orange"
                    : cell.row.original.priorityJob === "Priority"
                    ? "yellow"
                    : "transparent", // Dynamically set the background color
                padding: "10px", // Add padding for better visibility
                borderRadius: "5px", // Optional: Add some styling for aesthetics
              }}
            >
              {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
              {custom_house}
              <br />
            </div>
          );
        },
      },
      {
        accessorKey: "importer",
        header: "Importer",
        enableSorting: false,
        size: 150,
      },

      {
        accessorKey: "awb_bl_no",
        header: "BL Num & Date",
        enableSorting: false,
        size: 150,
        Cell: ({ cell }) => {
          const { awb_bl_no, awb_bl_date } = cell.row.original; // Destructure properties here
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
                  {container.container_number} | "{container.size}"
                  <IconButton
                    size="small"
                    onClick={(event) =>
                      handleCopy(event, container.container_number)
                    }
                  >
                    <ContentCopyIcon fontSize="inherit" />
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
        Cell: ({ cell }) => {
          const { cth_documents, all_documents } = cell.row.original;

          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px" }}
            >
              {/* Loop through CTH Documents and display IRN beside the respective document */}
              {cth_documents
                ?.filter((doc) => doc.url && doc.url.length > 0)
                .map((doc) => (
                  <div
                    key={doc._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {/* Document Link */}
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

                    {/* IRN beside its respective document */}
                    {doc.irn && (
                      <span>
                        { - doc.irn}
                      </span>
                    )}
                  </div>
                ))}

              {/* Loop through All Documents */}
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
    ],
    [navigate, handleCopy]
  );

  // Table configuration
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
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
        textAlign: "left", // Ensure header content aligns left
      },
    },
    muiTableBodyCellProps: {
      sx: {
        textAlign: "left", // Align all body cell content to the left
      },
    },
    // muiTableBodyRowProps: ({ row }) => ({
    //   className: getTableRowsClassname(row),
    // }),
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-start",
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
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
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
      <>
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
      </>
    </div>
  );
}

export default React.memo(ESanchit);

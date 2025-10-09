import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Button,
  Box,
  Badge,
  Typography,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext";
import DocsCell from "../gallery/DocsCell.js";
import { TabContext } from "../import-do/ImportDO.js";

function ImportBilling() {
  const { currentTab } = useContext(TabContext); // Access context
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter } =
    useSearchQuery();
  const [years, setYears] = useState([]);
  const { user } = useContext(UserContext);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const [loading, setLoading] = useState(false); // Loading state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced search query
  const limit = 100; // Number of items per page
  const [totalJobs, setTotalJobs] = useState(0); // Total job count
  const navigate = useNavigate();
  const location = useLocation();
  const [importers, setImporters] = useState("");

  console.log(currentTab, "tab");

  // Get importer list for MUI autocomplete
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

  // Fetch jobs with pagination and search
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      selectedImporter,
      selectedYearState,
      unresolvedOnly = false
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-billing-import-job`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "", // ✅ Ensure year is sent
              username: user?.username || "", // ✅ Send username for ICD filtering
              unresolvedOnly: unresolvedOnly.toString(), // ✅ Add unresolvedOnly parameter
            },
          }
        );

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
        setRows([]);
        setTotalPages(1);
        setUnresolvedCount(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, selectedImporter, selectedYearState] // ✅ Add selectedYear as a dependency
  );

  // ✅ Fetch jobs when `selectedYear` changes
  useEffect(() => {
    if (selectedYearState) {
      // Ensure year is available before calling API
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        showUnresolvedOnly
      );
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    fetchJobs,
    showUnresolvedOnly, // ✅ Include showUnresolvedOnly in dependencies
  ]);

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
            _id,
            type_of_b_e,
            consignment_type,
            custom_house,
            detailed_status,
            vessel_berthing,
            container_nos,
          } = cell.row.original;

          // Color-coding logic based on job status and dates
          let bgColor = "";
          let textColor = "blue"; // Default text color

          const currentDate = new Date();

          // Function to calculate the days difference
          const calculateDaysDifference = (targetDate) => {
            const date = new Date(targetDate);
            const timeDifference = date.getTime() - currentDate.getTime();
            return Math.ceil(timeDifference / (1000 * 3600 * 24));
          };

          // Check if the detailed status is "Estimated Time of Arrival"
          if (detailed_status === "Estimated Time of Arrival") {
            const daysDifference = calculateDaysDifference(vessel_berthing);

            // Only apply the background color if the berthing date is today or in the future
            if (daysDifference >= 0) {
              if (daysDifference === 0) {
                bgColor = "#ff1111";
                textColor = "white";
              } else if (daysDifference <= 2) {
                bgColor = "#f85a5a";
                textColor = "black";
              } else if (daysDifference <= 5) {
                bgColor = "#fd8e8e";
                textColor = "black";
              }
            }
          }

          // Check if the detailed status is "Billing Pending"
          if (detailed_status === "Billing Pending" && container_nos) {
            container_nos.forEach((container) => {
              // Choose the appropriate date based on consignment type
              const targetDate =
                consignment_type === "LCL"
                  ? container.delivery_date
                  : container.emptyContainerOffLoadDate;

              if (targetDate) {
                const daysDifference = calculateDaysDifference(targetDate);

                // Apply colors based on past and current dates only
                if (daysDifference <= 0 && daysDifference >= -5) {
                  // delivery_date up to the next 5 days - White background for current and past dates
                  bgColor = "white";
                  textColor = "blue";
                } else if (daysDifference <= -6 && daysDifference >= -10) {
                  // 5 days following the white period - Orange background for past dates
                  bgColor = "orange";
                  textColor = "black";
                } else if (daysDifference < -10) {
                  // Any date beyond the orange period - Red background for past dates
                  bgColor = "red";
                  textColor = "white";
                }
              }
            });
          }

          // Apply logic for multiple containers' "detention_from" for "Custom Clearance Completed"
          if (
            (detailed_status === "Custom Clearance Completed" &&
              container_nos) ||
            detailed_status === "BE Noted, Clearance Pending" ||
            detailed_status === "PCV Done, Duty Payment Pending"
          ) {
            container_nos.forEach((container) => {
              const daysDifference = calculateDaysDifference(
                container.detention_from
              );

              // Apply background color based on the days difference before the current date
              if (daysDifference <= 0) {
                // Dark Red Background for current date or older detention dates
                bgColor = "darkred";
                textColor = "white"; // White text on dark red background
              } else if (daysDifference === 1) {
                // Red Background for 1 day before current date
                bgColor = "red";
                textColor = "white"; // White text on red background
              } else if (daysDifference === 2) {
                // Orange Background for 2 days before current date
                bgColor = "orange";
                textColor = "black"; // Black text on orange background
              } else if (daysDifference === 3) {
                // Yellow Background for 3 days before current date
                bgColor = "yellow";
                textColor = "black"; // Black text on yellow background
              }
            });
          }

          return currentTab === 0 ? (
            <a
              href={`/view-billing-job/${job_no}/${year}`}
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
              }}
            >
              {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
              {custom_house}
            </a>
          ) : (
            <div
              style={{
                display: "inline-block",
                cursor: "default",
                color: textColor,
                backgroundColor: bgColor || "transparent",
                padding: "10px",
                borderRadius: "5px",
                textAlign: "center",
              }}
            >
              {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
              {custom_house}
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
        accessorKey: "bill_document_sent_to_accounts",
        header: "Bill Doc Sent To Accounts",
        enableSorting: false,
        size: 300,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (!value) return "-";
          const date = new Date(value);
          return isNaN(date)
            ? value
            : date.toLocaleString("en-IN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              });
        },
      },

      {
        accessorKey: "Doc",
        header: "Documents",
        enableSorting: false,
        size: 200,
        Cell: DocsCell,
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

export default ImportBilling;

import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { Link, useNavigate } from "react-router-dom";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import {
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Box,
  Typography,
  MenuItem,
  Autocomplete,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { UserContext } from "../../contexts/UserContext.js";
import DocsCell from "../gallery/DocsCell.js";

function ClearanceCompleted() {
  const { currentTab } = useContext(TabContext); // Access context
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { searchQuery, setSearchQuery, selectedImporter, setSelectedImporter } =
    useSearchQuery();
  const { user } = useContext(UserContext);
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // Current page number
  const [totalPages, setTotalPages] = useState(1); // Total number of pages
  const [loading, setLoading] = useState(false); // Loading state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery); // Debounced search query
  const limit = 100; // Number of items per page
  const [totalJobs, setTotalJobs] = useState(0); // Total job count
  const navigate = useNavigate();
  const [importers, setImporters] = useState("");

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
      username
    ) => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-billing-ready-jobs`,
          {
            params: {
              page: currentPage,
              limit,
              search: currentSearchQuery,
              importer: selectedImporter?.trim() || "",
              year: selectedYearState || "",
              username: username || "",
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
        console.error("Error fetching billing ready jobs:", error);
        setRows([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // Fetch jobs when dependencies change
  useEffect(() => {
    if (selectedYearState && user?.username) {
      fetchJobs(
        page,
        debouncedSearchQuery,
        selectedImporter,
        selectedYearState,
        user.username
      );
    }
  }, [
    page,
    debouncedSearchQuery,
    selectedImporter,
    selectedYearState,
    user?.username,
    fetchJobs,
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

          return (
            <div
              style={{
                cursor: "pointer",
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
        accessorKey: "out_of_charge",
        header: "Out of Charge",
        enableSorting: false,
        size: 200,
        Cell: ({ cell }) => {
          const { out_of_charge } = cell.row.original;
          if (!out_of_charge) return "-";
          
          // Format the date-time if it's a valid date
          try {
            const date = new Date(out_of_charge);
            if (isNaN(date.getTime())) return out_of_charge; // Return as-is if not a valid date
            
            return date.toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          } catch (error) {
            return out_of_charge ; // Return as-is if formatting fails
          }
        },
      },
      {
        accessorKey: "be_no",
        header: "BE Number & Date",
        enableSorting: false,
        size: 150,
        Cell: ({ cell }) => {
          const { be_no, be_date } = cell.row.original;
          return (
            <div>
              {be_no || "-"} <br /> 
              {be_date ? new Date(be_date).toLocaleDateString('en-GB') : "-"}
            </div>
          );
        },
      },
{
  accessorKey: "expenses",
  header: "Expenses",
  enableSorting: false,
  size: 300,
  Cell: ({ cell }) => {
    const { DsrCharges } = cell.row.original;

    // If no charges at all, show "No expenses"
    if (!DsrCharges || DsrCharges.length === 0) {
      return (
        <span style={{ color: "#666", fontSize: "12px" }}>No expenses</span>
      );
    }

    // Static number to start from 1
    let serialNumber = 1;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
          width: "100%",
        }}
      >
        {/* Loop through all charges */}
        {DsrCharges.map((charge, chargeIndex) => {
          // If charge has URLs, show as links
          if (charge.url && charge.url.length > 0) {
            return charge.url.map((url, urlIndex) => (
              <a
                key={`${charge.document_name}-${urlIndex}-${serialNumber}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: charge.document_amount_details ? "blue" : "#ff6b6b",
                  textDecoration: "underline",
                  cursor: "pointer",
                  marginBottom: "5px",
                }}
              >
                {serialNumber++}. {charge.document_name} {charge.url.length > 1 ? `${urlIndex + 1}` : ''} - {charge.document_amount_details ? `₹${parseFloat(charge.document_amount_details).toFixed(2)}` : "No Amount Details"}
              </a>
            ));
          } 
          // If no URL but charge details exist, show as plain text
          else {
            return (
              <div
                key={`charge-${chargeIndex}-${serialNumber}`}
                style={{
                  color: charge.document_amount_details ? "#333" : "#666",
                  marginBottom: "5px",
                  fontSize: "14px",
                }}
              >
                {serialNumber++}. {charge.document_name || "Unnamed Charge"} - {charge.document_amount_details ? `₹${parseFloat(charge.document_amount_details).toFixed(2)}` : "No Amount Details"}
              </div>
            );
          }
        })}
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
          Billing Ready Jobs: {totalJobs}
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

export default ClearanceCompleted;

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
} from "@mui/material";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { examinationPlaningStatus } from "./../../assets/data/examinationPlaningStatus";
import Tooltip from "@mui/material/Tooltip";

function ImportOperations() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedICD, setSelectedICD] = useState("");
  const [detailedStatusExPlan, setDetailedStatusExPlan] = useState("all");
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [page, setPage] = useState(1); // Current page
  const [totalPages, setTotalPages] = useState(1); // Total pages
  const [totalJobs, setTotalJobs] = useState(0); // Total job count

  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // Debounced search query
  const limit = 100; // Rows per page

  // Fetch available years for filtering
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        setYears(res.data.filter((year) => year !== null)); // Filter valid years
        setSelectedYear(res.data[0]); // Default to the first year
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    };
    fetchYears();
  }, []);

  // In ImportOperations.jsx (or similar)
  const fetchRows = async (
    page,
    searchQuery,
    year,
    selectedICD,
    detailedStatusExPlan
  ) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/${user.username}`,
        {
          params: {
            page,
            limit,
            search: searchQuery,
            year,
            selectedICD, // Matches backend expectation
            detailedStatusExPlan, // Pass the additional filter value
          },
        }
      );
      setRows(res.data.jobs);
      setTotalPages(res.data.totalPages);
      setTotalJobs(res.data.totalJobs);
    } catch (error) {
      console.error("Error fetching rows:", error);
    }
  };

  // Fetch rows when dependencies change
  useEffect(() => {
    fetchRows(
      page,
      debouncedSearchQuery,
      selectedYear,
      selectedICD,
      detailedStatusExPlan
    );
  }, [
    page,
    debouncedSearchQuery,
    selectedYear,
    selectedICD,
    detailedStatusExPlan,
  ]);

  // Handle search input with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce delay
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
            style={{ textAlign: "center", cursor: "pointer", color: "blue" }}
            onClick={() =>
              navigate(`/import-operations/view-job/${jobNo}/${year}`)
            }
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

            {/* First Check Date */}
            <Tooltip title="First Check Date" arrow>
              <strong>FC: </strong>
            </Tooltip>
            {fristCheck}
            <br />
          </div>
        );
      },
    },

    {
      accessorKey: "do_copies",
      header: "Do Copies",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const doCopies = row.original.do_copies;

        // Check if doCopies is an array and has at least one element
        if (Array.isArray(doCopies) && doCopies.length > 0) {
          return (
            <div style={{ textAlign: "center" }}>
              {doCopies.map((url, index) => (
                <div key={index}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    do_copies{index + 1}
                  </a>
                </div>
              ))}
            </div>
          );
        } else {
          // Optionally, render nothing or an alternative message
          return null;
          // Or: return <span>No Copies Available</span>;
        }
      },
    },

    {
      accessorKey: "do_validity",
      header: "DO Completed & Validity",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const doValidity = row.original.do_validity;
        const doCompleted = row.original.do_completed;

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
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
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

        <div
          style={{
            display: "flex",
            justifyContent: "end",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* examinationPlaningStatus  */}
          <TextField
            select
            size="small"
            value={detailedStatusExPlan}
            onChange={(e) => setDetailedStatusExPlan(e.target.value)}
            sx={{ width: "300px", marginRight: "20px" }}
          >
            {examinationPlaningStatus.map((option) => (
              <MenuItem key={option.id} value={option.value}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>
          {/* Job Count Display */}
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", fontSize: "1.5rem", marginRight: "auto" }}
          >
            Job Count: {totalJobs}
          </Typography>

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
      </div>
    ),
  };

  return (
    <div style={{ height: "80%" }}>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}
      >
        {/* Year Filter */}
        <TextField
          select
          label="Select Year"
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value);
            setPage(1); // Reset to first page on year change
          }}
          sx={{ marginRight: "20px", width: "200px" }}
        >
          {years.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>
      </div>

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

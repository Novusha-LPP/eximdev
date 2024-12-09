import React, { useState, useCallback, useMemo, useEffect } from "react";
import "../../styles/import-dsr.scss";
import { IconButton, MenuItem, TextField, Pagination } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { blue } from "@mui/material/colors";

function ImportOperations() {
  const [years, setYears] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [filteredRows, setFilteredRows] = React.useState([]); // Holds filtered data based on ICD Code
  const [selectedICD, setSelectedICD] = React.useState(""); // Holds the selected ICD code
  const { user } = React.useContext(UserContext);
  const navigate = useNavigate();

  const [page, setPage] = useState(1); // Current page
  const [totalPages, setTotalPages] = useState(1); // Total pages

  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // Debounced search query
  const limit = 100; // Rows per page

  // Fetch available years for filtering
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

  // Fetch rows data
  const fetchRows = async (page, searchQuery, year, icd) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/${user.username}`, // Replace `username` dynamically
        {
          params: {
            page,
            limit,
            search: searchQuery,
            year,
            icd,
          },
        }
      );
      setRows(res.data.jobs); // Set rows data
      setTotalPages(res.data.totalPages); // Set total pages
    } catch (error) {
      console.error("Error fetching rows:", error);
    }
  };

  // Function to sort rows based on background color conditions
  const sortRowsByConditions = (rows) => {
    const greenJobs = [];
    const orangeJobs = [];
    const yellowJobs = [];
    const otherJobs = [];

    rows.forEach((row) => {
      const { out_of_charge, examination_planning_date, be_no, container_nos } =
        row;

      const anyContainerArrivalDate = container_nos?.some(
        (container) => container.arrival_date
      );

      // Group into different arrays based on the conditions
      if (out_of_charge !== "" && out_of_charge !== undefined) {
        greenJobs.push(row); // Group all green background jobs first
      } else if (
        examination_planning_date !== "" &&
        examination_planning_date !== undefined
      ) {
        orangeJobs.push(row); // Group all orange background jobs second
      } else if (be_no && anyContainerArrivalDate) {
        yellowJobs.push(row); // Group all yellow background jobs third
      } else {
        otherJobs.push(row); // Other jobs that do not meet the conditions
      }
    });

    // Sort each group by detention_from in ascending order
    const sortByDetentionFrom = (a, b) => {
      const dateA = a.container_nos?.[0]?.detention_from || "";
      const dateB = b.container_nos?.[0]?.detention_from || "";

      return new Date(dateA) - new Date(dateB);
    };

    greenJobs.sort(sortByDetentionFrom);
    orangeJobs.sort(sortByDetentionFrom);
    yellowJobs.sort(sortByDetentionFrom);
    otherJobs.sort(sortByDetentionFrom);

    // Concatenate the arrays in the desired order
    return [...greenJobs, ...orangeJobs, ...yellowJobs, ...otherJobs];
  };
  // Fetch rows on initial load and when filters change
  useEffect(() => {
    fetchRows(page, debouncedSearchQuery, selectedYear, selectedICD);
  }, [page, debouncedSearchQuery, selectedYear, selectedICD]);

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

  // Filter rows based on the selected ICD Code
  React.useEffect(() => {
    if (selectedICD) {
      const filtered = rows.filter((row) => row.custom_house === selectedICD);
      setFilteredRows(filtered); // Set filtered rows
    } else {
      setFilteredRows(rows); // If no ICD Code selected, show all rows
    }
  }, [selectedICD, rows]);

  const handleCopy = (event, text) => {
    // Optimized handleCopy function using useCallback to avoid re-creation on each render

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
  };
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
        const icdCode = cell.row.original.custom_house;
        const year = cell.row.original.year;
        const navigate = useNavigate(); // Assuming useNavigate is available in the scope

        return (
          <div
            style={{ textAlign: "center", cursor: "pointer", color: "blue" }} // Style for pointer
            onClick={() =>
              navigate(`/import-operations/view-job/${jobNo}/${year}`)
            } // Navigate to the view-job route
          >
            {jobNo}
            <br />
            <small>{icdCode}</small> {/* ICD Code */}
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

        const beDate = formatDate(rawBeDate); // Function to format BE Date
        const location = getCustomHouseLocation(customHouse); // Function to get custom house location

        return (
          <React.Fragment>
            {beNumber && (
              <React.Fragment>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  {/* BE Number as a link */}
                  <a
                    href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}&beTrack_location=${location}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {beNumber}
                  </a>

                  {/* Copy icon beside BE Number */}
                  <IconButton
                    size="small"
                    onClick={(event) => handleCopy(event, beNumber)}
                  >
                    <abbr title="Copy BE Number">
                      <ContentCopyIcon fontSize="inherit" />
                    </abbr>
                  </IconButton>
                </div>

                {/* BE Date below BE Number and copy icon */}
                <small>{beDate}</small>
              </React.Fragment>
            )}
          </React.Fragment>
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
      accessorKey: "arrival_date",
      header: "Arrival Date",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) =>
        cell.row.original.container_nos?.map((container, id) => (
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
          justifyContent: "end",
          alignItems: "center",
          width: "100%",
        }}
      >
        <TextField
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px", marginRight: "20px" }}
        />
      </div>
    ),
  };

  // const getTableRowsClassname = (params) => {
  //   const {
  //     pcv_date,
  //     be_no,
  //     container_nos,
  //     examination_planning_date,
  //     out_of_charge,
  //   } = params.original;

  //   // Check if any container has an arrival_date
  //   const anyContainerArrivalDate = container_nos?.some(
  //     (container) => container.arrival_date
  //   );

  //   // 1. Condition for out_of_charge - give green background and exit
  //   if (out_of_charge !== "" && out_of_charge !== undefined) {
  //     return "bg-green"; // Green background for out_of_charge
  //   }

  //   // 2. Condition for examination_planning_date - give orange background
  //   if (
  //     examination_planning_date !== "" &&
  //     examination_planning_date !== undefined
  //   ) {
  //     return "bg-orange"; // Orange background for examination_planning_date
  //   }

  //   // 3. Condition for be_no and anyContainerArrivalDate - give yellow background
  //   if (be_no && anyContainerArrivalDate) {
  //     return "bg-yellow"; // Yellow background for be_no and container's arrival_date
  //   }

  //   // 4. Condition for pcv_date - give custom clearance completed background
  //   if (pcv_date !== "" && pcv_date !== undefined) {
  //     return "custom-clearance-completed"; // Background for pcv_date
  //   }

  //   // Default return if no conditions met
  //   return "";
  // };
  const getTableRowsClassname = (row) => row.original.row_color || "";

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
          onChange={(e) => setSelectedYear(e.target.value)}
          sx={{ marginRight: "20px", width: "200px" }}
        >
          {years.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

        {/* ICD Filter */}
        {/* <TextField
          select
          label="ICD Code"
          value={selectedICD}
          onChange={(e) => setSelectedICD(e.target.value)}
          sx={{ marginRight: "20px", width: "200px" }}
        >
          <MenuItem value="">All ICDs</MenuItem>
          <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
          <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
          <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
        </TextField> */}

        {/* Search Bar
        <TextField
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px" }}
        /> */}
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

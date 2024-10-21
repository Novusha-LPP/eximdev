import React, { useEffect, useState, useCallback, useMemo } from "react";
import { IconButton, MenuItem, TextField } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";

function CompletedOperations() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]); // Holds filtered data based on ICD Code
  const [selectedICD, setSelectedICD] = useState(""); // Holds the selected ICD code
  const { user } = React.useContext(UserContext);
  const navigate = useNavigate();

  // Fetch available years for filtering
  useEffect(() => {
    async function getYears() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-years`
      );
      const filteredYears = res.data.filter((year) => year !== null);
      setYears(filteredYears);
      setSelectedYear(filteredYears[0]);
    }
    getYears();
  }, []);

  // Fetch completed operations
  useEffect(() => {
    async function getRows() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-completed-operations/${user.username}`
        );
        // Set the rows in descending order by completed_operation_date
        setRows(res.data);
        setFilteredRows(res.data); // Initially set filtered rows to all fetched rows
      } catch (error) {
        console.error("Error fetching rows:", error);
      }
    }
    getRows();
  }, [user]);

  // Filter rows based on the selected ICD Code
  useEffect(() => {
    if (selectedICD) {
      const filtered = rows.filter((row) => row.custom_house === selectedICD);
      setFilteredRows(filtered); // Set filtered rows based on ICD
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
      Cell: ({ cell }) => {
        const jobNo = cell.getValue();
        const icdCode = cell.row.original.custom_house;
        const year = cell.row.original.year;

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
      size: 200,
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
      size: 120,
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
      size: 150,
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
    {
      accessorKey: "completed_operation_date",
      header: "Operation Date",
      size: 200,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    // Add other columns as needed...
  ];

  const table = useMaterialReactTable({
    columns,
    data: filteredRows, // Pass filtered rows to the table
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    initialState: {
      density: "compact", // Set initial table density to compact
      showColumnFilters: true, // Ensure that the search/filter is shown by default
      showGlobalFilter: true,
    },
    enableGrouping: true,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    enablePagination: false,
    enableBottomToolbar: false,
    muiTableContainerProps: {
      sx: { maxHeight: "580px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderTopToolbarCustomActions: () => (
      <TextField
        select
        size="small"
        margin="normal"
        variant="outlined"
        label="ICD Code"
        value={selectedICD}
        onChange={(e) => setSelectedICD(e.target.value)} // Update selected ICD Code
        sx={{ width: "200px" }}
      >
        <MenuItem value="">All ICDs</MenuItem> {/* Option for no filtering */}
        <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
        <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
        <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
      </TextField>
    ),
  });

  return (
    <>
      {/* Select Year Dropdown */}
      <TextField
        select
        size="small"
        margin="normal"
        variant="outlined"
        label="Select Year"
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        sx={{ width: "200px" }}
      >
        {years?.map((year) => (
          <MenuItem key={year} value={year}>
            {year}
          </MenuItem>
        ))}
      </TextField>

      {/* MaterialReactTable */}
      <MaterialReactTable table={table} />
    </>
  );
}

export default React.memo(CompletedOperations);

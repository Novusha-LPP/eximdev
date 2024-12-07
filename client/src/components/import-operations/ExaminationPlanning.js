import React, { useState, useCallback, useMemo } from "react";
import "../../styles/import-dsr.scss";
import { IconButton, MenuItem, TextField, InputAdornment } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { blue } from "@mui/material/colors";
import SearchIcon from "@mui/icons-material/Search";

function ImportOperations() {
  const [page, setPage] = useState(1); // Current page number
  const [loading, setLoading] = useState(false); // Loading state
  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [selectedICD, setSelectedICD] = useState("");
  const { user } = React.useContext(UserContext);
  const navigate = useNavigate();

  // Fetch available years for filtering
  React.useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);
        setSelectedYear(filteredYears[0] || ""); // Select the first year or set to empty
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, []);

  // Fetch rows for the user based on the selected year and search query
  React.useEffect(() => {
    async function getRows() {
      setLoading(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-operations-planning-jobs/${user.username}`,
          {
            params: {
              year: selectedYear,
              search: searchQuery,
            },
          }
        );

        // Apply sorting logic for the fetched rows
        const sortedRows = sortRowsByConditions(res.data);
        setRows(sortedRows);
      } catch (error) {
        console.error("Error fetching rows:", error);
      } finally {
        setLoading(false);
      }
    }
    getRows();
  }, [selectedYear, searchQuery, user]);

  // Sort rows based on conditions for background colors
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

      if (out_of_charge) {
        greenJobs.push(row);
      } else if (examination_planning_date) {
        orangeJobs.push(row);
      } else if (be_no && anyContainerArrivalDate) {
        yellowJobs.push(row);
      } else {
        otherJobs.push(row);
      }
    });

    const sortByDetentionFrom = (a, b) => {
      const dateA = new Date(a.container_nos?.[0]?.detention_from || "");
      const dateB = new Date(b.container_nos?.[0]?.detention_from || "");
      return dateA - dateB;
    };

    greenJobs.sort(sortByDetentionFrom);
    orangeJobs.sort(sortByDetentionFrom);
    yellowJobs.sort(sortByDetentionFrom);
    otherJobs.sort(sortByDetentionFrom);

    return [...greenJobs, ...orangeJobs, ...yellowJobs, ...otherJobs];
  };

  // Filter rows based on selected ICD
  React.useEffect(() => {
    if (selectedICD) {
      setFilteredRows(rows.filter((row) => row.custom_house === selectedICD));
    } else {
      setFilteredRows(rows);
    }
  }, [selectedICD, rows]);

  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();
    navigator.clipboard
      .writeText(text)
      .then(() => console.log("Text copied:", text))
      .catch((err) => console.error("Failed to copy text:", err));
  }, []);

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
      header: "Job No",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const { job_no, year, type_of_b_e, consignment_type, custom_house } =
          row.original;

        return (
          <div
            onClick={() =>
              navigate(`/import-operations/view-job/{job_no}/${year}`)
            }
            style={{
              cursor: "pointer",
              color: "blue",
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />
            {custom_house}
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

  const table = useMaterialReactTable({
    columns,
    data: filteredRows,
    enableColumnResizing: true,
    initialState: {
      density: "compact",
    },
    enableColumnActions: false,
    enableGlobalFilter: false,
    enableColumnFilters: false,
    muiTableContainerProps: {
      sx: { maxHeight: "580px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      // onClick: () =>
      //   navigate(
      //     `/import-operations/view-job/${row.original.job_no}/${row.original.year}`
      //   ),
      // style: { cursor: "pointer" }, // Apply inline styles dynamically
    }),
    muiTableHeadCellProps: {
      sx: { position: "sticky", top: 0, zIndex: 1 },
    },
    renderTopToolbarCustomActions: () => (
      <>
        <TextField
          select
          size="small"
          variant="outlined"
          label="ICD Code"
          value={selectedICD}
          onChange={(e) => setSelectedICD(e.target.value)}
          sx={{ width: "200px" }}
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
          <TextField
            placeholder="Search by Job No, Importer, or AWB/BL Number"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ width: "300px", marginRight: "20px" }}
          />
        </div>
      </>
    ),
  });
  const getTableRowsClassname = (params) => {
    const {
      pcv_date,
      be_no,
      container_nos,
      examination_planning_date,
      out_of_charge,
    } = params.original;

    // Check if any container has an arrival_date
    const anyContainerArrivalDate = container_nos?.some(
      (container) => container.arrival_date
    );

    // 1. Condition for out_of_charge - give green background and exit
    if (out_of_charge !== "" && out_of_charge !== undefined) {
      return "bg-green"; // Green background for out_of_charge
    }

    // 2. Condition for examination_planning_date - give orange background
    if (
      examination_planning_date !== "" &&
      examination_planning_date !== undefined
    ) {
      return "bg-orange"; // Orange background for examination_planning_date
    }

    // 3. Condition for be_no and anyContainerArrivalDate - give yellow background
    if (be_no && anyContainerArrivalDate) {
      return "bg-yellow"; // Yellow background for be_no and container's arrival_date
    }

    // 4. Condition for pcv_date - give custom clearance completed background
    if (pcv_date !== "" && pcv_date !== undefined) {
      return "custom-clearance-completed"; // Background for pcv_date
    }

    // Default return if no conditions met
    return "";
  };

  return (
    <>
      <TextField
        select
        size="small"
        variant="outlined"
        label="Select Year"
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        sx={{ width: "200px" }}
      >
        {years.map((year) => (
          <MenuItem key={year} value={year}>
            {year}
          </MenuItem>
        ))}
      </TextField>
      <MaterialReactTable table={table} />
    </>
  );
}

export default React.memo(ImportOperations);
